const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Resource = require("../schema/resourceSchema");
const { extractPdfText } = require("../utils/pdfExtractor");
const { generateVideoScript } = require("../utils/videoScriptGenerator");
const { synthesizeAudio } = require("../utils/ttsService");
const { renderVideoAndUploadToCloudinary, getAudioDuration } = require("../utils/videoRenderer");

// In-memory manifests cache
const videoManifests = new Map();
const renderedVideoUrls = new Map();

/**
 * POST /api/video/generate
 * Generates an animated video lecture script & audio segments for all scenes.
 * Body: { resourceId, language = "en" | "ne", depth = "detailed" | "recap" }
 */
router.post("/generate", async (req, res) => {
  try {
    const { resourceId, language = "en", depth = "detailed" } = req.body;

    if (!resourceId) {
      return res.status(400).json({ success: false, message: "Resource ID is required" });
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    // 1. Extract note content from PDF
    let noteContent = "";
    if (resource.fileUrl || resource.filePath) {
      try {
        noteContent = await extractPdfText(resource);
      } catch (err) {
        console.warn("[Video] PDF text extraction error:", err.message);
      }
    }

    if (!noteContent || noteContent.trim().length < 50) {
      noteContent = `Title: ${resource.title}\nSubject: ${resource.subject}\nDescription: ${resource.description || "Comprehensive lecture notes"}`;
    }

    // 2. Generate video scenes via Groq AI
    const scriptResult = await generateVideoScript({
      title: resource.title,
      subject: resource.subject,
      noteContent,
      language,
      depth,
    });

    // 3. Synthesize audio for each scene & upload to Cloudinary
    let currentStartTime = 0;
    const enrichedScenes = [];

    for (let i = 0; i < scriptResult.scenes.length; i++) {
      const scene = scriptResult.scenes[i];
      let audioResult = null;
      let duration = 12.0;

      try {
        audioResult = await synthesizeAudio({
          text: scene.audioScript,
          language: scriptResult.language,
        });

        if (audioResult && audioResult.filePath) {
          duration = await getAudioDuration(audioResult.filePath);
        }
      } catch (err) {
        console.error(`[Video] Failed synthesizing audio for scene ${i + 1}:`, err.message);
      }

      enrichedScenes.push({
        ...scene,
        startTime: Math.round(currentStartTime * 10) / 10,
        duration: Math.round(duration * 10) / 10,
        audioUrl: audioResult ? audioResult.url : null,
        audioPath: audioResult ? audioResult.filePath : null,
      });

      currentStartTime += duration;
    }

    const totalDuration = Math.round(currentStartTime * 10) / 10;
    const videoId = crypto
      .createHash("md5")
      .update(`${resourceId}:${language}:${depth}:${enrichedScenes.length}`)
      .digest("hex");

    const videoManifest = {
      videoId,
      resourceId,
      title: scriptResult.title,
      subject: scriptResult.subject,
      language: scriptResult.language,
      depth: scriptResult.depth,
      totalDuration,
      scenes: enrichedScenes,
      createdAt: new Date().toISOString(),
    };

    videoManifests.set(videoId, videoManifest);

    res.status(200).json({
      success: true,
      message: "Video lecture generated successfully",
      result: videoManifest,
    });
  } catch (error) {
    console.error("[Video API] Generate error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate video lecture",
      result: null,
    });
  }
});

/**
 * POST /api/video/render-mp4
 * Compiles scenes and audio into a downloadable 1080p MP4 directly in Node.js via FFmpeg
 * and uploads to Cloudinary. Zero persistent local storage.
 * Body: { videoId }
 */
router.post("/render-mp4", async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ success: false, message: "Video ID is required" });
    }

    // Return cached Cloudinary URL if already rendered
    if (renderedVideoUrls.has(videoId)) {
      return res.status(200).json({
        success: true,
        message: "Video already rendered",
        result: {
          downloadUrl: renderedVideoUrls.get(videoId),
          cached: true,
        },
      });
    }

    const manifest = videoManifests.get(videoId);
    if (!manifest) {
      return res.status(404).json({ success: false, message: "Video session not found or expired" });
    }

    // Pure Node.js FFmpeg compile & Cloudinary upload
    const uploadResult = await renderVideoAndUploadToCloudinary(manifest);

    renderedVideoUrls.set(videoId, uploadResult.secure_url);

    res.status(200).json({
      success: true,
      message: "Video rendered and uploaded to Cloudinary successfully",
      result: {
        downloadUrl: uploadResult.secure_url,
        cached: false,
      },
    });
  } catch (error) {
    console.error("[Video API] Render error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
