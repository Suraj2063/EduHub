const express = require("express");
const Resource = require("../schema/resourceSchema");
const QuizResult = require("../schema/quizResultSchema");
const { verifyToken } = require("../middleware/auth");
const { generateQuizQuestions } = require("../utils/quizGenerator");
const { extractPdfText } = require("../utils/pdfExtractor");

const router = express.Router();

/**
 * POST /api/quiz/generate
 * Generates N (5, 10, 15, 20) MCQs for a given study note
 */
router.post("/generate", verifyToken, async (req, res) => {
  try {
    const { resourceId, count = 5 } = req.body;

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
        message: "Study note resource not found",
        result: null,
      });
    }

    const validatedCount = [5, 10, 15, 20].includes(Number(count))
      ? Number(count)
      : 5;

    // Extract real PDF content (falls back to description if no PDF)
    const noteContent = await extractPdfText(resource);

    const questions = await generateQuizQuestions({
      title: resource.title,
      subject: resource.subject,
      noteContent,
      count: validatedCount,
    });

    res.status(200).json({
      success: true,
      message: `Generated ${questions.length} quiz questions`,
      result: {
        resourceId: resource._id,
        noteTitle: resource.title,
        subject: resource.subject,
        count: questions.length,
        questions,
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

/**
 * POST /api/quiz/save
 * Saves a completed quiz result to MongoDB
 */
router.post("/save", verifyToken, async (req, res) => {
  try {
    const {
      resourceId,
      noteTitle,
      subject,
      score,
      totalQuestions,
      answers,
    } = req.body;

    if (
      !resourceId ||
      score === undefined ||
      totalQuestions === undefined ||
      !answers
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required quiz result fields",
        result: null,
      });
    }

    const total = Number(totalQuestions) || 1;
    const numScore = Number(score) || 0;
    const percentage = Math.round((numScore / total) * 100);

    let performanceBadge = "Needs Review";
    if (percentage >= 80) {
      performanceBadge = "Mastered";
    } else if (percentage >= 60) {
      performanceBadge = "Good Effort";
    }

    const quizResult = await QuizResult.create({
      user: req.userId,
      resource: resourceId,
      noteTitle: noteTitle || "Study Note",
      subject: subject || "General",
      score: numScore,
      totalQuestions: total,
      percentage,
      performanceBadge,
      answers,
    });

    res.status(201).json({
      success: true,
      message: "Quiz results saved successfully!",
      result: quizResult,
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
 * GET /api/quiz/my-results
 * Returns all past quiz attempts for logged in user
 */
router.get("/my-results", verifyToken, async (req, res) => {
  try {
    const results = await QuizResult.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate("resource", "title subject");

    res.status(200).json({
      success: true,
      message: "Quiz history fetched successfully",
      result: results,
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
 * GET /api/quiz/resource/:resourceId/best
 * Returns user's highest scoring attempt on this specific note
 */
router.get("/resource/:resourceId/best", verifyToken, async (req, res) => {
  try {
    const bestAttempt = await QuizResult.findOne({
      user: req.userId,
      resource: req.params.resourceId,
    }).sort({ score: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Best attempt fetched",
      result: bestAttempt,
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
