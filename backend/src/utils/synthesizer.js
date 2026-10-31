const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

function getPiperBin() {
  if (process.env.PIPER_BIN && fs.existsSync(process.env.PIPER_BIN)) return process.env.PIPER_BIN;
  if (fs.existsSync("/usr/local/bin/piper")) return "/usr/local/bin/piper";
  if (fs.existsSync("/usr/bin/piper")) return "/usr/bin/piper";
  if (fs.existsSync("/home/suraj/.local/bin/piper")) return "/home/suraj/.local/bin/piper";
  return "piper";
}

const PIPER_MODEL =
  process.env.PIPER_MODEL ||
  path.resolve(__dirname, "../../piper_models/en_US-lessac-medium.onnx");

/**
 * Pure Node.js English Neural Speech Synthesizer
 * Uses local Piper binary with ONNX neural model. Zero Python runtime dependency.
 */
function synthesizePiper(text, outputFile) {
  return new Promise((resolve, reject) => {
    const piperBin = getPiperBin();
    if (!fs.existsSync(PIPER_MODEL)) {
      return reject(new Error(`Piper model not found at ${PIPER_MODEL}`));
    }

    const proc = spawn(piperBin, [
      "-m", PIPER_MODEL,
      "-f", outputFile,
    ]);

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`Piper process spawn error: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Piper failed with exit code ${code}: ${stderr}`));
      }
      resolve(outputFile);
    });

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

/**
 * Pure Node.js Nepali Neural Speech Synthesizer
 * Uses official Edge Speech engine in Node.js via msedge-tts. Zero Python runtime dependency.
 */
async function synthesizeNepali(text, outputFile) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("ne-NP-SagarNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "edge-tts-"));
  try {
    const res = await tts.toFile(tmpDir, text);
    if (res?.audioFilePath && fs.existsSync(res.audioFilePath)) {
      fs.copyFileSync(res.audioFilePath, outputFile);
      return outputFile;
    }
    throw new Error("Edge-TTS failed to produce audio file");
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

/**
 * Pure Node.js English Neural Speech Synthesizer
 * Uses official Edge Speech engine via msedge-tts. Zero external binaries required.
 */
async function synthesizeEnglish(text, outputFile) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("en-US-ChristopherNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "edge-tts-"));
  try {
    const res = await tts.toFile(tmpDir, text);
    if (res?.audioFilePath && fs.existsSync(res.audioFilePath)) {
      fs.copyFileSync(res.audioFilePath, outputFile);
      return outputFile;
    }
    throw new Error("Edge-TTS failed to produce English audio file");
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

/**
 * Pure Node.js Speech Synthesis Router
 * @param {Object} options
 * @param {string} options.text
 * @param {string} options.language - "en" or "ne"
 * @param {string} options.outputFile - Destination file path
 */
async function synthesizeSpeech({ text, language = "en", outputFile }) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Text is required for speech synthesis");
  }

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (language === "ne") {
    return await synthesizeNepali(cleanText, outputFile);
  } else {
    // Try Piper first if available, with automatic fallback to Edge Neural English
    const piperBin = getPiperBin();
    const piperAvailable = fs.existsSync(piperBin) || piperBin === "piper";
    if (piperAvailable && fs.existsSync(PIPER_MODEL)) {
      try {
        return await synthesizePiper(cleanText, outputFile);
      } catch (piperErr) {
        console.warn("[TTS] Piper failed, falling back to Edge TTS:", piperErr.message);
      }
    }
    return await synthesizeEnglish(cleanText, outputFile);
  }
}

module.exports = {
  synthesizeSpeech,
  synthesizeEnglish,
  synthesizePiper,
  synthesizeNepali,
};
