const Groq = require("groq-sdk");

/**
 * Quiz Generator Utility
 * Exclusively uses Groq AI powered by OpenAI GPT-OSS (120B / 20B) or Qwen models.
 * Accepts pre-extracted PDF text so it can generate questions from REAL note content.
 */
async function generateQuizQuestions({ title, subject, noteContent, count = 5 }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_groq")) {
    throw new Error(
      "Groq API key is not configured. Please add your GROQ_API_KEY in backend/.env"
    );
  }

  const targetCount = [5, 10, 15, 20].includes(Number(count)) ? Number(count) : 5;
  const groq = new Groq({ apiKey: apiKey.trim() });

  const prompt = `
You are an expert university professor creating an undergraduate/bachelor degree academic multiple-choice examination.
Generate a high-quality practice quiz based STRICTLY on the following study note content:

${noteContent}

CRITICAL RULES:
1. Generate EXACTLY ${targetCount} unique, rigorous multiple-choice questions based DIRECTLY on the content above.
2. Every question must have EXACTLY 4 distinct, plausible options.
3. "correctAnswer" MUST be an exact string match of one of the 4 options (NOT just a single letter like 'A' or 'B').
4. "explanation" MUST clearly explain why this answer is correct and why it matters, referencing the content.
5. Return strictly valid JSON containing a "questions" array matching this exact format:

{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Full Option A text", "Full Option B text", "Full Option C text", "Full Option D text"],
      "correctAnswer": "Full Option A text",
      "explanation": "Clear explanation of the concept."
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
          {
            role: "system",
            content:
              "You are an expert university professor. You create rigorous, undergraduate-level multiple choice questions strictly based on provided content. Always output strictly valid JSON with a 'questions' array.",
          },
          { role: "user", content: prompt },
        ],
        model,
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      const questionsList = parsed.questions || parsed;

      if (Array.isArray(questionsList) && questionsList.length > 0) {
        return sanitizeQuestions(questionsList, targetCount);
      }
    } catch (err) {
      console.warn(`Groq model ${model} attempt failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(
    lastError?.message || "Failed to generate quiz with Groq AI. Please try again."
  );
}

function sanitizeQuestions(rawList, targetCount) {
  const letterMap = { A: 0, B: 1, C: 2, D: 3 };

  return rawList.slice(0, targetCount).map((q, idx) => {
    const options =
      Array.isArray(q.options) && q.options.length >= 4
        ? q.options.slice(0, 4).map((opt) => String(opt).trim())
        : ["Option A", "Option B", "Option C", "Option D"];

    let rawAnswer = String(q.correctAnswer || "").trim();
    let correctAnswer = options[0];

    const upper = rawAnswer.toUpperCase();
    if (upper in letterMap && options[letterMap[upper]]) {
      correctAnswer = options[letterMap[upper]];
    } else if (options.includes(rawAnswer)) {
      correctAnswer = rawAnswer;
    } else {
      const match = options.find(
        (opt) =>
          opt.toLowerCase().includes(rawAnswer.toLowerCase()) ||
          rawAnswer.toLowerCase().includes(opt.toLowerCase())
      );
      correctAnswer = match || options[0];
    }

    return {
      id: idx + 1,
      question: q.question || `Question ${idx + 1}`,
      options,
      correctAnswer,
      explanation:
        q.explanation || "Review the note content for deeper conceptual understanding.",
    };
  });
}

module.exports = { generateQuizQuestions };
