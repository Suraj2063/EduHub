const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { cloudinary } = require("../config/cloudinary");

/**
 * Escapes XML/SVG special characters
 */
function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Word wraps text into lines based on approximate character limit
 */
function wrapText(text, maxChars = 55) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxChars) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generates high-definition 1080p SVG slide
 */
function generateSlideSvg(scene, sceneIndex, totalScenes, subject) {
  const chapter = escapeXml(scene.chapter || "CORE CONCEPT");
  const title = escapeXml(scene.title || `Topic ${sceneIndex + 1}`);
  const safeSubject = escapeXml(subject || "ACADEMIC LECTURE");

  const titleLines = wrapText(title, 42);
  const titleSvg = titleLines
    .slice(0, 2)
    .map(
      (line, i) =>
        `<text x="90" y="${230 + i * 54}" font-family="DejaVu Sans, Arial, sans-serif" font-size="44" font-weight="bold" fill="#f8fafc">${line}</text>`
    )
    .join("\n");

  const keyPoints = Array.isArray(scene.keyPoints) ? scene.keyPoints.slice(0, 4) : [];
  let bulletY = 360;
  const bulletsSvg = keyPoints
    .map((point, idx) => {
      const wrapped = wrapText(point, 48);
      const linesSvg = wrapped
        .slice(0, 3)
        .map(
          (l, li) =>
            `<text x="160" y="${bulletY + 28 + li * 34}" font-family="DejaVu Sans, Arial, sans-serif" font-size="26" fill="#e2e8f0">${escapeXml(l)}</text>`
        )
        .join("\n");

      const badgeSvg = `
        <rect x="90" y="${bulletY}" width="48" height="40" rx="8" fill="#4f46e5" />
        <text x="104" y="${bulletY + 28}" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">0${idx + 1}</text>
      `;

      bulletY += Math.max(wrapped.length * 34 + 30, 75);
      return badgeSvg + linesSvg;
    })
    .join("\n");

  let highlightBoxSvg = "";
  if (scene.highlightBox && scene.highlightBox.content) {
    const badge = escapeXml(scene.highlightBox.badge || "KEY TAKEAWAY");
    const contentLines = wrapText(scene.highlightBox.content, 38).slice(0, 6);
    const boxContentSvg = contentLines
      .map(
        (l, i) =>
          `<text x="1190" y="${390 + i * 36}" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="#f1f5f9">${escapeXml(l)}</text>`
      )
      .join("\n");

    highlightBoxSvg = `
      <rect x="1150" y="270" width="680" height="420" rx="16" fill="#0f172a" stroke="#6366f1" stroke-width="2" />
      <rect x="1180" y="295" width="${badge.length * 15 + 40}" height="42" rx="8" fill="#312e81" />
      <text x="1198" y="324" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="bold" fill="#c7d2fe">${badge.toUpperCase()}</text>
      ${boxContentSvg}
    `;
  }

  return `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="60%" stop-color="#111827" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>

  <!-- Deep space background -->
  <rect width="1920" height="1080" fill="url(#bg)" />

  <!-- Top Navigation Header -->
  <rect x="0" y="0" width="1920" height="100" fill="#0f172a" />
  <line x1="0" y1="100" x2="1920" y2="100" stroke="#1e293b" stroke-width="2" />
  <text x="90" y="62" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">EduHub AI Lecture</text>
  <rect x="400" y="26" width="${safeSubject.length * 14 + 40}" height="48" rx="10" fill="#1e3a8a" />
  <text x="420" y="58" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="bold" fill="#93c5fd">${safeSubject.toUpperCase()}</text>
  <text x="1600" y="62" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="bold" fill="#94a3b8">SCENE ${sceneIndex + 1} OF ${totalScenes}</text>

  <!-- Chapter Tag -->
  <rect x="90" y="135" width="${chapter.length * 15 + 40}" height="42" rx="8" fill="#1e293b" />
  <text x="108" y="163" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="bold" fill="#818cf8">${chapter.toUpperCase()}</text>

  <!-- Scene Title -->
  ${titleSvg}

  <!-- Left: Bullet Points -->
  ${bulletsSvg}

  <!-- Right: Highlight Box -->
  ${highlightBoxSvg}

  <!-- Footer -->
  <line x1="0" y1="1000" x2="1920" y2="1000" stroke="#1e293b" stroke-width="1" />
  <text x="90" y="1045" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" fill="#64748b">AI Animated Video Lecture  •  EduHub Academic Workspace</text>
</svg>
`;
}

/**
 * Gets exact duration of an audio file via ffprobe
 */
function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    execFile(
      "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      (err, stdout) => {
        if (err || !stdout) return resolve(10.0);
        const parsed = parseFloat(stdout.trim());
        resolve(isNaN(parsed) ? 10.0 : parsed);
      }
    );
  });
}

/**
 * Pure Node.js Video Compiler & Cloudinary Uploader
 * Renders SVG frames, encodes 1080p MP4 via FFmpeg, and uploads directly to Cloudinary.
 * Cleans up all local temporary files immediately.
 */
async function renderVideoAndUploadToCloudinary(manifest) {
  const scenes = manifest.scenes || [];
  const subject = manifest.subject || "General";
  const totalScenes = scenes.length;

  if (totalScenes === 0) {
    throw new Error("No scenes provided for video rendering");
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eduhub-video-"));
  const sceneVideoFiles = [];
  const concatListFile = path.join(tmpDir, "concat_list.txt");
  const outputMp4Path = path.join(tmpDir, `lecture_${Date.now()}.mp4`);

  try {
    for (let i = 0; i < totalScenes; i++) {
      const scene = scenes[i];
      const audioPath = scene.audioPath;

      if (!audioPath || !fs.existsSync(audioPath)) {
        throw new Error(`Audio file missing for scene ${i + 1}`);
      }

      const duration = await getAudioDuration(audioPath);
      const svgContent = generateSlideSvg(scene, i, totalScenes, subject);
      const svgPath = path.join(tmpDir, `slide_${i}.svg`);
      fs.writeFileSync(svgPath, svgContent);

      const sceneMp4 = path.join(tmpDir, `scene_${i}.mp4`);

      // Compile slide SVG + audio into scene MP4 via FFmpeg
      await new Promise((resolve, reject) => {
        execFile(
          "ffmpeg",
          [
            "-y",
            "-loop", "1",
            "-t", String(duration + 0.4),
            "-i", svgPath,
            "-i", audioPath,
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            sceneMp4,
          ],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      sceneVideoFiles.push(sceneMp4);
    }

    // Write concat file
    fs.writeFileSync(
      concatListFile,
      sceneVideoFiles.map((f) => `file '${f}'`).join("\n")
    );

    // Merge into final MP4
    await new Promise((resolve, reject) => {
      execFile(
        "ffmpeg",
        ["-y", "-f", "concat", "-safe", "0", "-i", concatListFile, "-c", "copy", outputMp4Path],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Upload directly to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(outputMp4Path, {
      folder: "eduhub_videos",
      resource_type: "video",
      public_id: `${Date.now()}-${(manifest.title || "video").replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    });

    return {
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: uploadResult.duration,
      format: uploadResult.format,
    };
  } finally {
    // Delete all local temporary files immediately from disk
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

module.exports = {
  renderVideoAndUploadToCloudinary,
  getAudioDuration,
};
