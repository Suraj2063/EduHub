const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { cloudinary } = require("../config/cloudinary");
const { synthesizeSpeech } = require("./synthesizer");

// In-memory cache of text-hash -> Cloudinary audio URL
const audioUrlCache = new Map();

/**
 * Pure Node.js Speech Synthesis & Direct Cloudinary Upload
 * Zero Python runtime dependency. Zero persistent local disk storage.
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
  const ext = lang === "ne" ? "mp3" : "wav";
  const hash = crypto.createHash("md5").update(`${lang}:${cleanText}`).digest("hex");
  const fileName = `${hash}.${ext}`;

  // If already uploaded to Cloudinary, return the cached Cloudinary URL
  if (audioUrlCache.has(hash)) {
    const cached = audioUrlCache.get(hash);
    return {
      fileName,
      filePath: cached.filePath,
      url: cached.url,
      cached: true,
    };
  }

  // Temporary local path for generation
  const tempFilePath = path.join(os.tmpdir(), `tts_${fileName}`);

  try {
    // 100% Pure JavaScript / Node.js speech synthesis
    await synthesizeSpeech({
      text: cleanText,
      language: lang,
      outputFile: tempFilePath,
    });

    // Upload directly to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
      folder: "eduhub_audio",
      resource_type: "video",
      public_id: `${Date.now()}_${hash}`,
    });

    const resultData = {
      fileName,
      filePath: tempFilePath,
      url: uploadResult.secure_url,
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
