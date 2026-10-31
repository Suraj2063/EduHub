const mongoose = require("mongoose");

const quizResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: [true, "Resource is required"],
    },
    noteTitle: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: "General",
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    performanceBadge: {
      type: String,
      enum: ["Mastered", "Good Effort", "Needs Review"],
      default: "Good Effort",
    },
    answers: [
      {
        question: { type: String, required: true },
        selectedOption: { type: String, required: true },
        correctOption: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        explanation: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

const QuizResult = mongoose.model("QuizResult", quizResultSchema);

module.exports = QuizResult;
