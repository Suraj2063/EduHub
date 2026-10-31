const pdfParse = require("pdf-parse");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const { createWorker } = require("tesseract.js");
const Resource = require("../schema/resourceSchema");

/**
 * Extracts raw text from a PDF resource.
 * Supports both digital text PDFs (fast pdf-parse) and scanned/image PDFs (OCR via pdftoppm + Tesseract.js).
 * Caches extracted text into MongoDB so subsequent requests (audio, video, quiz) are instantaneous.
 *
 * @param {Object|string} resource - Mongoose resource document or fileUrl string
 * @param {number} [maxChars=18000] - Max characters to return for token budget
 * @returns {Promise<string>} Extracted text or fallback description
 */
async function extractPdfText(resource, maxChars = 18000) {
  try {
    // 1. Normalize input
    let resObj = resource;
    if (typeof resource === "string") {
      resObj = {
        fileUrl: resource,
        fileName: resource.split("/").pop(),
        fileType: "application/pdf",
        title: "Study Note",
        subject: "General",
        description: "",
      };
    }

    if (!resObj) {
      return buildFallbackText({ title: "Study Note", subject: "General" });
    }

    // 2. Check if text is already cached in MongoDB
    if (resObj._id) {
      if (resObj.extractedText && resObj.extractedText.trim().length >= 50) {
        console.log(`[PDF Extractor] Using cached extracted text (${resObj.extractedText.length} chars) for "${resObj.title}".`);
        return formatOutput(resObj, resObj.extractedText, maxChars);
      }

      // Query DB if extractedText wasn't projected in the current query
      try {
        const found = await Resource.findById(resObj._id).select("extractedText").lean();
        if (found && found.extractedText && found.extractedText.trim().length >= 50) {
          console.log(`[PDF Extractor] Found cached text in DB (${found.extractedText.length} chars) for "${resObj.title}".`);
          return formatOutput(resObj, found.extractedText, maxChars);
        }
      } catch (dbErr) {
        // Continue to extraction if DB query fails
      }
    }

    const isCloudinary = resObj.isCloudinary || !!resObj.cloudinaryPublicId;
    const isPdf =
      resObj.fileType?.includes("pdf") ||
      resObj.fileName?.toLowerCase().endsWith(".pdf") ||
      resObj.fileUrl?.toLowerCase().includes(".pdf");

    if (!isPdf && !resObj.fileUrl?.includes(".pdf")) {
      return buildFallbackText(resObj);
    }

    // 3. Obtain PDF buffer
    let buffer = null;
    if ((isCloudinary || resObj.fileUrl?.startsWith("http")) && resObj.fileUrl) {
      const response = await axios.get(resObj.fileUrl, {
        responseType: "arraybuffer",
        timeout: 25000,
      });
      buffer = Buffer.from(response.data);
    } else if (resObj.filePath) {
      const absolutePath = path.isAbsolute(resObj.filePath)
        ? resObj.filePath
        : path.join(
            __dirname,
            "../../..",
            resObj.filePath.startsWith("/") ? resObj.filePath.slice(1) : resObj.filePath
          );
      if (fs.existsSync(absolutePath)) {
        buffer = fs.readFileSync(absolutePath);
      }
    }

    if (!buffer) {
      console.warn(`[PDF Extractor] No buffer could be loaded for "${resObj.title}". Falling back to description.`);
      return buildFallbackText(resObj);
    }

    // 4. Primary pass: Fast digital PDF extraction via pdf-parse
    let rawText = "";
    let pageCount = 1;
    try {
      const parsed = await pdfParse(buffer);
      pageCount = parsed.numpages || 1;
      rawText = (parsed.text || "").replace(/\s+/g, " ").trim();
    } catch (parseErr) {
      console.warn("[PDF Extractor] pdf-parse error (might be scanned or malformed):", parseErr.message);
    }

    // 5. Secondary pass: If digital text is missing (< 100 chars), run OCR!
    if (!rawText || rawText.length < 100) {
      console.log(`[PDF Extractor] Minimal digital text (${rawText.length} chars) in "${resObj.title}". Running OCR for scanned pages...`);
      const ocrResult = await performOcrOnPdf(buffer, pageCount);
      if (ocrResult && ocrResult.trim().length >= 50) {
        rawText = ocrResult.trim();
        console.log(`[PDF Extractor] OCR successfully extracted ${rawText.length} characters from "${resObj.title}".`);
      }
    }

    // 6. If we still have virtually nothing, fall back to description
    if (!rawText || rawText.length < 50) {
      console.warn(`[PDF Extractor] No text extracted even after OCR for "${resObj.title}". Falling back to description.`);
      return buildFallbackText(resObj);
    }

    // 7. Save extracted text to MongoDB for permanent caching
    if (resObj._id) {
      try {
        await Resource.findByIdAndUpdate(resObj._id, { extractedText: rawText });
      } catch (dbErr) {
        console.warn("[PDF Extractor] Failed to cache extracted text to DB:", dbErr.message);
      }
    }

    console.log(`[PDF Extractor] Successfully resolved ${rawText.length} characters for "${resObj.title}".`);
    return formatOutput(resObj, rawText, maxChars, pageCount);
  } catch (err) {
    console.warn("[PDF Extractor] Unexpected error during extraction:", err.message);
    return buildFallbackText(resource || {});
  }
}

/**
 * Performs OCR on a PDF buffer using pdftoppm (poppler) + Tesseract.js.
 * Renders pages at 130 DPI to balance recognition accuracy and speed.
 */
async function performOcrOnPdf(buffer, totalPages = 1) {
  const tmpDir = path.join(os.tmpdir(), `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  let worker = null;
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    const pdfPath = path.join(tmpDir, "input.pdf");
    fs.writeFileSync(pdfPath, buffer);

    // Render up to 10 pages for notes (covers typical lecture notes while staying fast)
    const maxPagesToProcess = Math.min(totalPages || 10, 10);
    const prefix = path.join(tmpDir, "page");

    try {
      execSync(`pdftoppm -png -r 130 -f 1 -l ${maxPagesToProcess} "${pdfPath}" "${prefix}"`, {
        timeout: 20000,
        stdio: "ignore",
      });
    } catch (ppmErr) {
      // Fallback: try pdfimages if pdftoppm failed
      try {
        execSync(`pdfimages -png -f 1 -l ${maxPagesToProcess} "${pdfPath}" "${prefix}"`, {
          timeout: 20000,
          stdio: "ignore",
        });
      } catch (imgErr) {
        console.warn("[PDF Extractor OCR] Failed to render images from PDF:", imgErr.message);
        return "";
      }
    }

    const imageFiles = fs
      .readdirSync(tmpDir)
      .filter((f) => f.endsWith(".png") || f.endsWith(".jpg"))
      .sort();

    if (imageFiles.length === 0) {
      console.warn("[PDF Extractor OCR] No page images rendered from PDF.");
      return "";
    }

    worker = await createWorker("eng");
    let accumulatedText = "";

    for (let i = 0; i < imageFiles.length; i++) {
      const imgPath = path.join(tmpDir, imageFiles[i]);
      try {
        const ret = await worker.recognize(imgPath);
        const pageText = (ret.data.text || "").trim();
        if (pageText.length > 0) {
          accumulatedText += `\n\n--- PAGE ${i + 1} ---\n${pageText}`;
        }
      } catch (pageErr) {
        console.warn(`[PDF Extractor OCR] Error processing page ${i + 1}:`, pageErr.message);
      }
    }

    return accumulatedText.trim();
  } catch (err) {
    console.warn("[PDF Extractor OCR] OCR processing error:", err.message);
    return "";
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

function formatOutput(resource, text, maxChars, pageCount = 1) {
  const trimmed = text.slice(0, maxChars);
  return `NOTE TITLE: ${resource.title || "Study Note"}
SUBJECT: ${resource.subject || "General"}
PAGE COUNT: ${pageCount}

--- FULL NOTE CONTENT (FROM PDF / OCR) ---
${trimmed}${text.length > maxChars ? "\n[...content trimmed for token budget...]" : ""}`;
}

function buildFallbackText(resource) {
  return `NOTE TITLE: ${resource.title || "Study Note"}
SUBJECT: ${resource.subject || "General"}

DESCRIPTION / TOPICS:
${resource.description || "Core theoretical concepts and practical applications."}`;
}

module.exports = { extractPdfText };
