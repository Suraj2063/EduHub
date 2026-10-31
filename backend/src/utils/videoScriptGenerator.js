const Groq = require("groq-sdk");

/**
 * Video Script Generator
 * Uses Groq AI to convert study note content (real PDF text) into structured
 * animated visual scenes with synchronized voiceover narration in English or Nepali.
 */
async function generateVideoScript({ title, subject, noteContent, language = "en", depth = "detailed" }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_groq")) {
    throw new Error(
      "Groq API key is not configured. Please add your GROQ_API_KEY in backend/.env"
    );
  }

  const groq = new Groq({ apiKey: apiKey.trim() });
  const isNepali = language === "ne";
  const isRecap = depth === "recap";
  const numScenes = isRecap ? "3 to 4" : "5 to 7";

  const systemPrompt = isNepali
    ? "तपाईं एक विशेषज्ञ विश्वविद्यालय प्राध्यापक र भिडियो निर्देशक हुनुहुन्छ। तपाईं विद्यार्थीहरूको लागि स्पष्ट, आकर्षक एनिमेटेड भिडियो लेक्चर दृश्यहरू (scenes) र प्रत्येक दृश्यका लागि शुद्ध नेपाली आवाज (voiceover) तयार गर्नुहुन्छ। सधैं मान्य JSON ढाँचामा 'scenes' एरे फिर्ता गर्नुहोस्।"
    : "You are an expert university professor and educational video director. You convert academic notes into structured, highly visual animated lecture scenes with rich, conversational voiceover scripts. Always return strictly valid JSON with a 'scenes' array.";

  const prompt = isNepali
    ? `
तपाईं एक विश्वविद्यालयका प्राध्यापक हुनुहुन्छ। तल दिइएको अध्ययन सामग्री (PDF Study Note) को आधारमा ${numScenes} वटा एनिमेटेड भिडियो दृश्यहरू (Scenes) भएको विस्तृत भिडियो लेक्चर स्क्रिप्ट तयार गर्नुहोस्।

${noteContent}

नियमहरू:
1. प्रत्येक दृश्य (Scene) मा दृश्य जानकारी (शीर्षक, ३ वटा मुख्य बुँदा, सूत्र वा कोड बाकस) र त्यस दृश्यको लागि बोलिने विस्तृत नेपाली आवाज (audioScript) हुनुपर्छ।
2. audioScript मा पूर्ण, स्वाभाविक, मिठासपूर्ण नेपाली वाक्यहरू हुनुपर्छ। कुनै तारा चिन्ह वा मार्कडाउन हुनु हुँदैन किनकि यो अडियोमा बोलिनेछ।
3. ${isRecap ? "छोटो सारांश (Recap) मोड: ३ देखि ४ वटा प्रमुख दृश्यहरू बनाउनुहोस्।" : "विस्तृत (Full Lecture) मोड: ५ देखि ७ वटा गहन दृश्यहरू बनाउनुहोस्।"}
4. यस ढाँचामा ठ्याक्कै JSON फिर्ता गर्नुहोस्:

{
  "title": "${title ? "भिडियो व्याख्या: " + title : "एनिमेटेड भिडियो लेक्चर"}",
  "subject": "${subject || "सामान्य"}",
  "language": "ne",
  "scenes": [
    {
      "sceneNumber": 1,
      "chapter": "परिचय तथा मार्गचित्र",
      "title": "आधारभूत अवधारणा",
      "visualType": "concept",
      "keyPoints": [
        "पहिलो मुख्य अवधारणा र यसको महत्त्व",
        "अध्ययनको मुख्य लक्ष्य र आधारभूत सिद्धान्त",
        "परीक्षाको दृष्टिकोणले ध्यान दिनुपर्ने विषय"
      ],
      "highlightBox": {
        "badge": "प्रमुख परिभाषा",
        "content": "महत्त्वपूर्ण सूत्र, नियम वा परिभाषा यहाँ राख्नुहोस्"
      },
      "audioScript": "नमस्कार विद्यार्थी मित्रहरू! यस भिडियो लेक्चरमा तपाईंहरूलाई स्वागत छ। आज हामी यस महत्त्वपूर्ण विषयको बारेमा गहिरिएर छलफल गर्नेछौं..."
    }
  ]
}
`
    : `
You are a world-class university professor and educational video director. Convert the following study notes into ${numScenes} richly detailed animated video lecture scenes with deep, academic voiceover narration.

STUDY NOTES:
${noteContent}

CRITICAL INSTRUCTIONS:
1. If the notes are sparse, USE YOUR OWN EXPERT ACADEMIC KNOWLEDGE of "${subject}" to produce genuinely deep, educational scenes. Never make shallow or generic slides.
2. Create exactly ${numScenes} logically progressing scenes:
   - Scene 1: Introduction — why this topic matters, the core problem it solves, mental model
   - Middle Scenes: Go deep into mechanisms, algorithms, step-by-step architecture, invariants, formulas, trade-offs
   - Final Scene: Real-world applications, exam high-yield summary, common mistakes to avoid
3. For EACH scene produce:
   - "chapter": Short category label (e.g., "Foundations", "Relational Algebra", "ER Modeling", "Exam Invariants")
   - "title": Specific, punchy scene title (not generic like "Introduction")
   - "visualType": One of "concept", "code", "diagram", "comparison", "summary"
   - "keyPoints": Array of exactly 3 crisp, informative, substantive bullet points for the slide — each should be a complete thought, not just a word
   - "highlightBox": Object with "badge" (e.g., "Core Formula", "SQL Syntax", "Key Theorem", "Algorithm") and "content" (actual formula, code, schema, or rule — be specific and real)
   - "audioScript": A DEEPLY DETAILED spoken explanation of 6 to 10 full conversational sentences. Explain the WHY and HOW, not just list facts. Sound like a brilliant professor walking through the concept. NO asterisks, markdown, bullet symbols — it will be read aloud.
4. Return ONLY strictly valid JSON:

{
  "title": "${title || "Animated Video Lecture"}",
  "subject": "${subject || "Computer Science"}",
  "language": "en",
  "scenes": [
    {
      "sceneNumber": 1,
      "chapter": "Foundations & Overview",
      "title": "The Relational Model: Structure & Invariants",
      "visualType": "concept",
      "keyPoints": [
        "A relation is a named set of tuples sharing identical attribute schema",
        "Primary keys enforce uniqueness and prevent NULL identity conflicts",
        "Foreign keys create referential integrity links between relations"
      ],
      "highlightBox": {
        "badge": "Entity Integrity Rule",
        "content": "No primary key attribute may contain a NULL value — every tuple must be uniquely identifiable."
      },
      "audioScript": "Welcome to this video lecture on Database Management Systems. In this first scene, we are going to establish the foundational mental model you need to understand everything that follows. The relational model, introduced by Edgar F. Codd in 1970, fundamentally changed how we think about data storage and retrieval..."
    }
  ]
}
`;

  const candidateModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        model,
        response_format: { type: "json_object" },
        temperature: 0.55,
        max_tokens: 8000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        return {
          title: parsed.title || title,
          subject: parsed.subject || subject,
          language: isNepali ? "ne" : "en",
          depth: isRecap ? "recap" : "detailed",
          scenes: parsed.scenes.map((scene, idx) => ({
            sceneNumber: idx + 1,
            chapter: scene.chapter || `Chapter ${idx + 1}`,
            title: scene.title || `Topic ${idx + 1}`,
            visualType: scene.visualType || "concept",
            keyPoints: Array.isArray(scene.keyPoints) && scene.keyPoints.length > 0
              ? scene.keyPoints.slice(0, 4)
              : ["Key conceptual takeaway", "Important architectural principle"],
            highlightBox: scene.highlightBox && scene.highlightBox.content
              ? {
                  badge: scene.highlightBox.badge || "Key Focus",
                  content: String(scene.highlightBox.content).trim(),
                }
              : null,
            audioScript: String(scene.audioScript || "").trim(),
          })),
        };
      }
    } catch (err) {
      console.warn(`Groq model ${model} video script attempt failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(
    lastError?.message || "Failed to generate video lecture script with Groq AI. Please try again."
  );
}

module.exports = { generateVideoScript };
