import { API_URL, API_BASE_URL } from "../config";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, isLoggedIn } from "../utils/auth";
import "./QuizModal.css";

function QuizModal({ resource, onClose, onQuizCompleted }) {
  const [step, setStep] = useState("setup"); // "setup" | "quiz" | "results"
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [index]: optionString }
  const [quizResult, setQuizResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);

  // Disable background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Step 1: Start Quiz & Generate Questions
  const handleStartQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios({
        url: `${API_URL}/quiz/generate`,
        method: "post",
        headers: { Authorization: `Bearer ${getToken()}` },
        data: {
          resourceId: resource._id,
          count: questionCount,
        },
      });

      if (response.data.success && response.data.result.questions?.length > 0) {
        setQuestions(response.data.result.questions);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setStep("quiz");
      } else {
        toast.error("Failed to generate questions. Please try again.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load quiz questions");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (option) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: option,
    });
  };

  // Step 2: Submit Quiz Answers & Save to Database
  const handleSubmitQuiz = async () => {
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < questions.length) {
      setUnansweredCount(questions.length - answeredCount);
      setShowConfirm(true);
      return;
    }
    await doSubmitQuiz();
  };

  const doSubmitQuiz = async () => {
    setShowConfirm(false);

    // Grade quiz locally
    let score = 0;
    const gradedAnswers = questions.map((q, idx) => {
      const userChoice = selectedAnswers[idx] || "Unanswered";
      const isCorrect = userChoice === q.correctAnswer;
      if (isCorrect) score++;
      return {
        question: q.question,
        selectedOption: userChoice,
        correctOption: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || "",
      };
    });

    const total = questions.length;
    const percentage = Math.round((score / total) * 100);

    let performanceBadge = "Needs Review";
    if (percentage >= 80) performanceBadge = "Mastered";
    else if (percentage >= 60) performanceBadge = "Good Effort";

    const resultPayload = {
      score,
      totalQuestions: total,
      percentage,
      performanceBadge,
      answers: gradedAnswers,
    };

    setQuizResult(resultPayload);
    setStep("results");

    // Save to MongoDB if logged in
    if (isLoggedIn()) {
      setSaving(true);
      try {
        await axios({
          url: `${API_URL}/quiz/save`,
          method: "post",
          headers: { Authorization: `Bearer ${getToken()}` },
          data: {
            resourceId: resource._id,
            noteTitle: resource.title,
            subject: resource.subject,
            score,
            totalQuestions: total,
            percentage,
            answers: gradedAnswers,
          },
        });
        if (onQuizCompleted) onQuizCompleted(resultPayload);
      } catch (err) {
        console.error("Failed to save quiz result:", err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Called after user confirms they want to submit with unanswered questions
  const handleGradeAndSave = () => doSubmitQuiz();

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;

  return (
    <div className="quiz-modal-backdrop" onClick={onClose}>
      {/* ════════════ CUSTOM CONFIRM DIALOG ════════════ */}
      {showConfirm && (
        <div className="quiz-confirm-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="quiz-confirm-box">
            <div className="quiz-confirm-icon-wrap">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h4 className="quiz-confirm-title">Finish Quiz?</h4>
            <p className="quiz-confirm-body">
              You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount > 1 ? "s" : ""}.
              Unanswered questions will be marked as incorrect.
            </p>
            <div className="quiz-confirm-actions">
              <button className="quiz-confirm-cancel" onClick={() => setShowConfirm(false)}>
                Go Back
              </button>
              <button className="quiz-confirm-proceed" onClick={handleGradeAndSave}>
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="quiz-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="quiz-modal-close-btn"
          aria-label="Close Quiz"
        >
          <svg className="quiz-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ════════════ STEP 1: SETUP ════════════ */}
        {step === "setup" && (
          <div className="quiz-setup-content">
            <div className="quiz-setup-icon-box">
              <svg className="quiz-setup-sparkle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>

            <h2 className="quiz-setup-title">AI Practice Quiz</h2>
            <p className="quiz-setup-subject-pill">{resource.subject}</p>

            <div className="quiz-count-section">
              <label className="quiz-count-label">
                Choose Number of Questions:
              </label>

              <div className="quiz-count-grid">
                {[
                  { count: 5, label: "5 Questions", badge: "Quick Revision" },
                  { count: 10, label: "10 Questions", badge: "Standard Test" },
                  { count: 15, label: "15 Questions", badge: "In-Depth" },
                  { count: 20, label: "20 Questions", badge: "Full Mock Exam" },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setQuestionCount(item.count)}
                    className={`quiz-count-card ${
                      questionCount === item.count ? "selected" : ""
                    }`}
                  >
                    <span className="quiz-count-number">{item.count}</span>
                    <span className="quiz-count-name">{item.label}</span>
                    <span className="quiz-count-pill">{item.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="quiz-setup-actions">
              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={loading}
                className="quiz-start-btn"
              >
                {loading ? (
                  <span className="btn-with-spinner">
                    <span className="quiz-spinner" /> Generating {questionCount} Questions...
                  </span>
                ) : (
                  <span>Start Practice Quiz ({questionCount} Questions) &rarr;</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 2: ACTIVE QUIZ ════════════ */}
        {step === "quiz" && currentQ && (
          <div className="quiz-active-content">
            {/* Top Bar with Progress */}
            <div className="quiz-header-bar">
              <div className="quiz-progress-text-row">
                <span className="quiz-progress-counter">
                  Question <strong>{currentIndex + 1}</strong> of {questions.length}
                </span>
                <span className="quiz-subject-tag">{resource.subject}</span>
              </div>
              <div className="quiz-progress-track">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="quiz-question-card">
              <h3 className="quiz-question-title">{currentQ.question}</h3>

              {/* 4 Selectable Options */}
              <div className="quiz-options-list">
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === opt;
                  const letter = String.fromCharCode(65 + oIdx); // A, B, C, D
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`quiz-option-button ${isSelected ? "selected" : ""}`}
                    >
                      <span className="quiz-option-letter">{letter}</span>
                      <span className="quiz-option-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="quiz-bottom-nav">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="quiz-nav-back-btn"
              >
                &larr; Previous
              </button>

              <div className="quiz-nav-status">
                {selectedAnswers[currentIndex] ? (
                  <span className="quiz-answered-indicator">✓ Answer Selected</span>
                ) : (
                  <span className="quiz-unanswered-indicator">Select an option</span>
                )}
              </div>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="quiz-nav-next-btn"
                >
                  Next Question &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="quiz-nav-submit-btn"
                >
                  Submit & View Results
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════════════ STEP 3: RESULTS & BREAKDOWN ════════════ */}
        {step === "results" && quizResult && (
          <div className="quiz-results-content">
            {/* Header Score Card */}
            <div className="quiz-results-hero">
              <div
                className={`quiz-badge-pill ${
                  quizResult.percentage >= 80
                    ? "badge-mastered"
                    : quizResult.percentage >= 60
                    ? "badge-good"
                    : "badge-review"
                }`}
              >
                {quizResult.performanceBadge}
              </div>

              <h2 className="quiz-results-score">
                {quizResult.score} / {quizResult.totalQuestions}
              </h2>
              <p className="quiz-results-percentage">
                Score: <strong>{quizResult.percentage}%</strong>
              </p>

              <div className="quiz-results-action-row">
                <button
                  type="button"
                  onClick={() => {
                    setStep("setup");
                    setQuizResult(null);
                  }}
                  className="quiz-btn-secondary"
                >
                  Retake Quiz
                </button>
                <Link to="/profile" className="quiz-btn-primary" onClick={onClose}>
                  View on Profile
                </Link>
                <button type="button" onClick={onClose} className="quiz-btn-close">
                  Done
                </button>
              </div>
            </div>

            {/* Answer Breakdown */}
            <div className="quiz-breakdown-container">
              <h3 className="quiz-breakdown-heading">Answer Review & Explanations</h3>

              <div className="quiz-breakdown-list">
                {quizResult.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className={`quiz-review-item ${
                      ans.isCorrect ? "review-correct" : "review-incorrect"
                    }`}
                  >
                    <div className="quiz-review-header">
                      <span className="quiz-review-number">Q{idx + 1}</span>
                      <span className="quiz-review-question">{ans.question}</span>
                      <span
                        className={`quiz-review-status-tag ${
                          ans.isCorrect ? "tag-correct" : "tag-incorrect"
                        }`}
                      >
                        {ans.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                      </span>
                    </div>

                    <div className="quiz-review-answers-box">
                      <div className="quiz-review-answer-row">
                        <span className="answer-label">Your Answer:</span>
                        <span
                          className={`answer-value ${
                            ans.isCorrect ? "ans-correct" : "ans-wrong"
                          }`}
                        >
                          {ans.selectedOption}
                        </span>
                      </div>

                      {!ans.isCorrect && (
                        <div className="quiz-review-answer-row">
                          <span className="answer-label">Correct Answer:</span>
                          <span className="answer-value ans-correct">
                            {ans.correctOption}
                          </span>
                        </div>
                      )}
                    </div>

                    {ans.explanation && (
                      <div className="quiz-review-explanation">
                        <svg className="explanation-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p className="explanation-text">{ans.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizModal;
