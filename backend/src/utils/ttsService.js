const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { cloudinary } = require("../config/cloudinary");
const { synthesizeSpeech } = require("./synthesizer");

const AUDIO_DIR = path.resolve(__dirname, "../../audio_cache");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// In-memory cache of text-hash -> Cloudinary or local audio URL
const audioUrlCache = new Map();

/**
 * Pure Node.js Speech Synthesis & Direct Cloudinary / Local Streaming
 * Zero Python runtime dependency. Zero Piper setup required in containers.
 *
 * @param {Object} options
 * @param {string} options.text
 * @param {string} [options.language="en"] - "en" or "ne"
 * @returns {Promise<{ fileName: string, filePath: string, url: string, cached: boolean }>}
 */
async function synthesizeAudio({ text, language = "en" }) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Text is required for TTS synthesis");
  }

  const lang = language === "ne" ? "ne" : "en";
  const ext = "mp3";
  const hash = crypto.createHash("md5").update(`${lang}:${cleanText}`).digest("hex");
  const fileName = `${hash}.${ext}`;

  // If already synthesized, return cached result
  if (audioUrlCache.has(hash)) {
    const cached = audioUrlCache.get(hash);
    return {
      fileName,
      filePath: cached.filePath,
      url: cached.url,
      cached: true,
    };
  }

  // Temporary local path for generation and persistent copy for local streaming
  const tempFilePath = path.join(os.tmpdir(), `tts_${fileName}`);
  const persistentFilePath = path.join(AUDIO_DIR, fileName);

  try {
    // 100% Pure JavaScript / Node.js speech synthesis
    await synthesizeSpeech({
      text: cleanText,
      language: lang,
      outputFile: tempFilePath,
    });

    // Save a copy in persistent audio_cache
    fs.copyFileSync(tempFilePath, persistentFilePath);

    let finalUrl = `/api/audio/stream/${fileName}`;

    // Upload to Cloudinary if credentials are configured
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
          folder: "eduhub_audio",
          resource_type: "video",
          public_id: `${Date.now()}_${hash}`,
        });
        if (uploadResult?.secure_url) {
          finalUrl = uploadResult.secure_url;
        }
      } catch (cloudErr) {
        console.warn("[TTS Service] Cloudinary upload failed, falling back to local stream:", cloudErr.message);
      }
    }

    const resultData = {
      fileName,
      filePath: persistentFilePath,
      url: finalUrl,
      cached: false,
    };

    audioUrlCache.set(hash, resultData);
    return resultData;
  } catch (err) {
    console.error("[TTS Service] Synthesis error:", err.message);
    throw new Error("Failed to synthesize audio: " + err.message);
  }
}

module.exports = { synthesizeAudio };
