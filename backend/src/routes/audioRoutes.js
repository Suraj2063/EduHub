const express = require("express");
const path = require("path");
const fs = require("fs");
const Groq = require("groq-sdk");
const Resource = require("../schema/resourceSchema");
const { generateAudioScript } = require("../utils/audioScriptGenerator");
const { extractPdfText } = require("../utils/pdfExtractor");
const { synthesizeAudio } = require("../utils/ttsService");

const router = express.Router();

const AUDIO_DIR = path.resolve(__dirname, "../../audio_cache");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * POST /api/audio/generate-script
 * Generates a conversational AI lecture script from the actual PDF content in English or Nepali.
 */
router.post("/generate-script", async (req, res) => {
  try {
    const { resourceId, language = "en" } = req.body;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: "Resource ID is required",
        result: null,
      });
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Study note not found",
        result: null,
      });
    }

    // Extract real PDF content (falls back to description if no PDF)
    const noteContent = await extractPdfText(resource);

    const script = await generateAudioScript({
      title: resource.title,
      subject: resource.subject,
      noteContent,
      language: language === "ne" ? "ne" : "en",
    });

    res.status(200).json({
      success: true,
      message: "Audio lecture script generated successfully",
      result: script,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      result: null,
    });
  }
});

/**
 * POST /api/audio/synthesize
 * Synthesizes text to Piper TTS (English) or Neural Voice (Nepali)
 */
router.post("/synthesize", async (req, res) => {
  try {
    const { text, language = "en" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required for audio synthesis",
        result: null,
      });
    }

    const audioInfo = await synthesizeAudio({
      text: text.trim(),
      language: language === "ne" ? "ne" : "en",
    });

    res.status(200).json({
      success: true,
      message: "Audio synthesized successfully",
      result: audioInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      result: null,
    });
  }
});

/**
 * GET /api/audio/stream/:fileName
 * Streams the generated audio file
 */
router.get("/stream/:fileName", (req, res) => {
  const fileName = path.basename(req.params.fileName);
  const filePath = path.join(AUDIO_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "Audio file not found",
      result: null,
    });
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const contentType = ext === ".mp3" ? "audio/mpeg" : ext === ".wav" ? "audio/wav" : "audio/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
  });

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

/**
 * POST /api/audio/ask-tutor
 * Allows students to ask questions or request deeper detail on a specific lecture topic/segment.
 */
router.post("/ask-tutor", async (req, res) => {
  try {
    const { resourceId, segmentLabel, segmentText, question, language = "en" } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
        result: null,
      });
    }

    let noteContext = "";
    if (resourceId) {
      const resource = await Resource.findById(resourceId);
      if (resource) {
        noteContext = await extractPdfText(resource, 10000);
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured in backend/.env");
    }

    const groq = new Groq({ apiKey: apiKey.trim() });
    const isNepali = language === "ne";

    const systemPrompt = isNepali
      ? "तपाईं एक अति सहयोगी, धैर्यवान् र स्पष्ट विश्वविद्यालय प्राध्यापक हुनुहुन्छ। विद्यार्थीले लेक्चरको कुनै निश्चित विषयमा सोधेको प्रश्नको उत्तर सरल, गहन र व्यावहारिक उदाहरणसहित नेपाली भाषामा दिनुहोस्। जवाफ स्पष्ट ५–७ वाक्यको हुनुपर्छ जसलाई अडियोमा सुन्न सकियोस्।"
      : "You are an expert, encouraging university professor tutor. The student is listening to an audio lecture and asks a question about a specific topic. Provide a clear, detailed, conversational explanation (5-7 spoken sentences) addressing their exact query directly, citing practical examples from the note.";

    const userPrompt = `
NOTE CONTEXT:
${noteContext.slice(0, 5000)}

ACTIVE TOPIC SECTION:
Label: ${segmentLabel || "Current Topic"}
Section Content: ${segmentText || ""}

STUDENT'S QUESTION:
"${question}"

Provide a friendly, thorough, spoken-style explanation answering the student's question in detail based on this topic.
Language: ${isNepali ? "Nepali (नेपाली)" : "English"}.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.5,
    });

    const answer = completion.choices[0]?.message?.content?.trim() || "Here is a deeper breakdown of this concept.";

    // Synthesize the tutor's answer audio too so student can listen
    let audioUrl = null;
    try {
      const audioRes = await synthesizeAudio({
        text: answer,
        language: isNepali ? "ne" : "en",
      });
      audioUrl = audioRes.url;
    } catch (ttsErr) {
      console.warn("[Ask Tutor] Audio synthesis failed, returning text:", ttsErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Tutor answered successfully",
      result: {
        answer,
        audioUrl,
        language: isNepali ? "ne" : "en",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      result: null,
    });
  }
});

module.exports = router;
