const Groq = require("groq-sdk");

/**
 * Audio Script Generator
 * Uses Groq AI to convert study note content (real PDF text) into a structured
 * conversational lecture script in English or Nepali.
 */
async function generateAudioScript({ title, subject, noteContent, language = "en" }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_groq")) {
    throw new Error(
      "Groq API key is not configured. Please add your GROQ_API_KEY in backend/.env"
    );
  }

  const groq = new Groq({ apiKey: apiKey.trim() });
  const isNepali = language === "ne";

  const systemPrompt = isNepali
    ? "तपाईं एक अनुभवी र मित्रवत विश्वविद्यालय प्राध्यापक हुनुहुन्छ। तपाईं विद्यार्थीहरूका लागि दिइएको अध्ययन सामग्रीको आधारमा शुद्ध, स्पष्ट र स्वाभाविक नेपाली भाषामा सुन्न योग्य अडियो लेक्चर स्क्रिप्ट तयार गर्नुहुन्छ। सधैं मान्य JSON ढाँचामा 'segments' एरे फिर्ता गर्नुहोस्।"
    : "You are an expert university professor. You create engaging, conversational spoken lecture scripts strictly based on provided content. Always output strictly valid JSON with a 'segments' array.";

  const prompt = isNepali
    ? `
तपाईं एक विश्वविद्यालयका अनुभवी प्राध्यापक हुनुहुन्छ। तल प्रस्तुत अध्ययन सामग्री (PDF Study Note) को आधारमा नेपाली भाषामा स्पष्ट, मित्रवत र विस्तृत रूपमा बोल्ने अडियो लेक्चर स्क्रिप्ट तयार गर्नुहोस्।

${noteContent}

नियमहरू:
1. पूर्ण रूपमा स्वाभाविक, मिठासपूर्ण र स्पष्ट नेपाली भाषामा बोल्नुहोस् — जस्तै एक प्राध्यापकले विद्यार्थीलाई व्यक्तिगत रूपमा बुझाउँदै हुनुहुन्छ।
2. कम्प्युटर साइन्स र प्राविधिक अवधारणाहरूलाई नेपालीमा सरल भाषामा प्रस्ट पार्नुहोस्। आवश्यक परे प्राविधिक शब्दावलीलाई देवनागरी वा कोष्ठकमा उल्लेख गर्नुहोस्।
3. स्क्रिप्टलाई ६ वटा मुख्य खण्डहरूमा विभाजन गर्नुहोस्:
   - "परिचय तथा अवधारणागत मार्गचित्र" (Introduction & Roadmap)
   - "आधारभूत सिद्धान्त र प्रमुख परिभाषाहरू" (Core Principles & Definitions)
   - "गहन विश्लेषण: आन्तरिक संरचना र कार्यप्रणाली" (Deep Dive: Architecture & Implementation)
   - "महत्वपूर्ण नियम, फाइदा र जटिलता विश्लेषण" (Invariants & Trade-offs)
   - "वास्तविक जीवनमा प्रयोग र व्यावहारिक उदाहरणहरू" (Real-World Applications)
   - "प्रमुख निष्कर्ष तथा परीक्षा सारांश" (Summary & Takeaways)
4. प्रत्येक खण्डमा ५ देखि ८ वटा पूर्ण, समृद्ध नेपाली वाक्यहरू हुनुपर्छ। बुलेट पोइन्टहरू वा तारा चिन्हहरू नराख्नुहोस् किनकि यो अडियोमा बोलिनेछ।
5. यस ढाँचामा ठ्याक्कै JSON फिर्ता गर्नुहोस्:

{
  "title": "${title ? "नेपाली व्याख्या: " + title : "विस्तृत अडियो लेक्चर"}",
  "subject": "${subject || "सामान्य"}",
  "totalDuration": "६–८ मिनेट",
  "language": "ne",
  "segments": [
    { "id": 1, "label": "परिचय तथा अवधारणागत मार्गचित्र", "text": "नेपालीमा बोल्ने विस्तृत अनुच्छेद..." },
    { "id": 2, "label": "आधारभूत सिद्धान्त र प्रमुख परिभाषाहरू", "text": "..." },
    { "id": 3, "label": "गहन विश्लेषण: आन्तरिक संरचना र कार्यप्रणाली", "text": "..." },
    { "id": 4, "label": "महत्वपूर्ण नियम र जटिलता विश्लेषण", "text": "..." },
    { "id": 5, "label": "वास्तविक जीवनमा प्रयोग र व्यावहारिक उदाहरणहरू", "text": "..." },
    { "id": 6, "label": "प्रमुख निष्कर्ष तथा परीक्षा सारांश", "text": "..." }
  ]
}
`
    : `
You are a world-class university professor renowned for your ability to explain complex concepts in extraordinary depth and clarity. A student needs a comprehensive, deeply educational audio lecture based on these study notes.

STUDY NOTES:
${noteContent}

CRITICAL INSTRUCTIONS:
1. If the notes are sparse, USE YOUR OWN EXPERT ACADEMIC KNOWLEDGE of "${subject}" to fill in deep technical detail. Never produce shallow or generic content.
2. Deliver a full professor-quality spoken lecture — imagine you are lecturing a university class. Be engaging, insightful, and thorough. Go deep into every concept.
3. Structure the lecture into exactly 6 segments:
   - "Introduction & Conceptual Roadmap" — why this topic matters, what problems it solves, historical context
   - "Foundational Principles & Key Definitions" — define every key term precisely with full context and examples
   - "Deep Dive: Core Mechanisms & Architecture" — full technical depth, step by step, with specific details
   - "Critical Rules, Invariants & Trade-offs" — constraints, edge cases, performance implications, common pitfalls
   - "Real-World Applications & Practical Examples" — concrete specific real-world scenarios and industry use
   - "Exam Essentials & Key Takeaways" — what will appear in exams, common mistakes, must-remember formulas
4. DEPTH IS MANDATORY: Each segment text MUST be 8 to 12 full, rich, flowing sentences. Explain not just WHAT, but WHY and HOW in detail. Include specific technical terminology, algorithms, formulas, or system design considerations.
5. Write as natural spoken speech — conversational, warm, engaging. NO bullet points, asterisks, markdown, or numbered lists in the text. This is spoken aloud.
6. Return ONLY strictly valid JSON:

{
  "title": "${title || "University Lecture"}",
  "subject": "${subject || "General"}",
  "totalDuration": "10–15 minutes",
  "language": "en",
  "segments": [
    { "id": 1, "label": "Introduction & Conceptual Roadmap", "text": "Full rich spoken paragraph of 8-12 sentences..." },
    { "id": 2, "label": "Foundational Principles & Key Definitions", "text": "..." },
    { "id": 3, "label": "Deep Dive: Core Mechanisms & Architecture", "text": "..." },
    { "id": 4, "label": "Critical Rules, Invariants & Trade-offs", "text": "..." },
    { "id": 5, "label": "Real-World Applications & Practical Examples", "text": "..." },
    { "id": 6, "label": "Exam Essentials & Key Takeaways", "text": "..." }
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
        temperature: 0.65,
        max_tokens: 8000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.segments) && parsed.segments.length > 0) {
        return {
          title: parsed.title || title,
          subject: parsed.subject || subject,
          totalDuration: parsed.totalDuration || (isNepali ? "६–८ मिनेट" : "6–8 minutes"),
          language: isNepali ? "ne" : "en",
          segments: parsed.segments.slice(0, 6).map((seg, idx) => ({
            id: idx + 1,
            label: seg.label || `Section ${idx + 1}`,
            text: String(seg.text || "").trim(),
          })),
        };
      }
    } catch (err) {
      console.warn(`Groq model ${model} audio script attempt failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(
    lastError?.message || "Failed to generate audio script with Groq AI. Please try again."
  );
}

module.exports = { generateAudioScript };
