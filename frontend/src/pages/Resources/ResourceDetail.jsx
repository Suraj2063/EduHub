import { API_URL, API_BASE_URL } from "../../config";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, getUser, isLoggedIn } from "../../utils/auth";
import { getBadgeColor, formatDate } from "../../utils/helpers";
import { EditIcon, TrashIcon, DocumentIcon, PdfIcon, EyeIcon, CloseIcon } from "../../components/Icons";
import QuizModal from "../../components/QuizModal";
import AudioLectureModal from "../../components/AudioLectureModal";
import VideoLectureModal from "../../components/VideoLectureModal";
import ConfirmModal from "../../components/ConfirmModal";
import "./UploadResource.css";
import "./ResourceDetail.css";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [bestScore, setBestScore] = useState(null);
  const [currentUser, setCurrentUser] = useState(getUser);

  useEffect(() => {
    if (searchParams.get("quiz") === "true") {
      setShowQuizModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getUser());
    window.addEventListener("authChange", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("authChange", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const handleRequireAuth = (actionCallback, featureName = "AI study tools") => {
    if (!isLoggedIn()) {
      toast.info(`Please log in or create a free account to access ${featureName}.`, {
        toastId: "auth-gate",
      });
      navigate("/login", { state: { from: `/resources/${id}` } });
      return;
    }
    actionCallback();
  };

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await axios({
          url: `${API_URL}/resources/${id}`,
          method: "get",
        });
        setResource(response.data.result);
      } catch (error) {
        toast.error("Resource not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchResource();
  }, [id, navigate]);

  // Fetch student's best quiz score for this note
  useEffect(() => {
    const fetchBestScore = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await axios({
          url: `${API_URL}/quiz/resource/${id}/best`,
          method: "get",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && res.data.result) {
          setBestScore(res.data.result);
        }
      } catch (err) {
        // silent fail if not found
      }
    };
    fetchBestScore();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await axios({
        url: `${API_URL}/resources/${id}`,
        method: "delete",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.data.success) {
        toast.success("Resource deleted successfully");
        setShowDeleteModal(false);
        navigate("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete resource");
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = currentUser && resource && resource.uploadedBy?._id === currentUser._id;

  if (loading) {
    return (
      <div className="detail-page-container">
        <p className="feed-status-text">Loading study note...</p>
      </div>
    );
  }

  if (!resource) return null;

  const badgeColor = getBadgeColor(resource.subject);
  const isCloudinaryFile = resource.isCloudinary || !!resource.cloudinaryPublicId;
  const isDirectFile = isCloudinaryFile || !!resource.filePath;
  const directFileUrl = isCloudinaryFile
    ? resource.fileUrl
    : (resource.filePath ? `${API_BASE_URL}/${resource.filePath}` : "");
  const isPdf =
    resource.fileType?.includes("pdf") ||
    (resource.fileName && resource.fileName.toLowerCase().endsWith(".pdf")) ||
    (resource.fileUrl && resource.fileUrl.toLowerCase().includes(".pdf"));

  return (
    <div className="detail-page-container">
      {/* Back button */}
      <Link to="/" className="back-nav-link">
        <svg className="back-arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Explore
      </Link>

      {/* 2-Column Grid */}
      <div className="detail-grid">

        {/* ── LEFT: Main Content Column ── */}
        <div className="detail-main-col">

          {/* Title card */}
          <div className="detail-title-card">
            <div className="detail-title-badge-row">
              <span className={`card-subject-badge ${badgeColor}`}>
                {resource.subject}
              </span>
            </div>
            <h1 className="detail-title">{resource.title}</h1>
          </div>

          {/* Attached Document card */}
          {/* Description / Overview card */}
          <div className="detail-card">
            <h2 className="detail-content-heading">Overview &amp; Content</h2>
            <p className="detail-desc-box">{resource.description}</p>
          </div>

          {/* Direct File Attachment card */}
          {isDirectFile && (
            <div className="detail-card">
              <h2 className="detail-content-heading">Attached Document</h2>
              <div className="direct-attachment-card">
                <div className="attachment-left">
                  <div className="attachment-icon-box">
                    {isPdf ? <PdfIcon size={22} /> : <DocumentIcon size={22} />}
                  </div>
                  <div className="attachment-info">
                    <span className="attachment-name" title={resource.fileName}>
                      {resource.fileName || "Study Note Document"}
                    </span>
                    <span className="attachment-meta">
                      {formatFileSize(resource.fileSize)} &bull; Uploaded to EduHub
                    </span>
                  </div>
                </div>

                <div className="attachment-actions-group">
                  {isPdf && (
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="cta-external-btn"
                    >
                      <EyeIcon size={16} /> {showPreview ? "Hide Preview" : "Preview PDF"}
                    </button>
                  )}
                  <a
                    href={directFileUrl}
                    download={resource.fileName || "study-note"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cta-download-btn"
                  >
                    <svg className="back-arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>
              </div>

              {/* In-browser PDF Previewer */}
              {isPdf && showPreview && (
                <div className="pdf-preview-box pdf-preview-box--inline">
                  <div className="pdf-preview-header">
                    <span className="pdf-preview-title">
                      <DocumentIcon size={15} /> {resource.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="selected-file-remove-btn"
                    >
                      <CloseIcon size={13} /> Close
                    </button>
                  </div>
                  <iframe
                    src={directFileUrl}
                    title={resource.title}
                    className="pdf-viewer-frame"
                  />
                </div>
              )}
            </div>
          )}

          {/* AI Audio Lecture Card */}
          <div className="detail-card">
            <h2 className="detail-content-heading">AI Audio Lecture</h2>
            <div className="direct-attachment-card audio-action-bar">
              <div className="attachment-left">
                <div className="quiz-icon-badge audio-icon-badge">
                  <svg className="quiz-action-icon" fill="none" stroke="#ffffff" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h1a2 2 0 002-2v-4a2 2 0 00-2-2H4m17 5a3 3 0 01-3 3h-1a2 2 0 01-2-2v-4a2 2 0 012-2h3" />
                  </svg>
                </div>
                <div>
                  <p className="attachment-filename">Audio Lecture</p>
                  <p className="attachment-meta-text">
                    AI-generated tutor explanation • Listen anywhere
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cta-download-btn btn-audio-cta"
                onClick={() =>
                  handleRequireAuth(() => setShowAudioModal(true), "AI Audio Lectures")
                }
              >
                {isLoggedIn() ? "Listen Now" : "🔒 Log in to Listen"}
              </button>
            </div>
          </div>

          {/* AI Video Lecture Card */}
          <div className="detail-card">
            <h2 className="detail-content-heading">AI Video Lecture</h2>
            <div className="direct-attachment-card video-action-bar">
              <div className="attachment-left">
                <div className="quiz-icon-badge video-icon-badge">
                  <svg className="quiz-action-icon" fill="none" stroke="#ffffff" strokeWidth={2} viewBox="0 0 24 24">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div>
                  <p className="attachment-filename">Animated Video Lecture</p>
                  <p className="attachment-meta-text">
                    1080p animated visual scenes • Synchronized voiceover • Interactive AI player
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cta-download-btn btn-video-cta"
                onClick={() =>
                  handleRequireAuth(() => setShowVideoModal(true), "AI Video Lectures")
                }
              >
                {isLoggedIn() ? "Watch Video Lecture" : "🔒 Log in to Watch"}
              </button>
            </div>
          </div>

          {/* Practice Quiz Card */}
          <div className="detail-card">
            <h2 className="detail-content-heading">Practice Quiz</h2>
            <div className="direct-attachment-card quiz-action-bar">
              <div className="attachment-left">
                <div className="quiz-icon-badge">
                  <svg className="quiz-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <div className="quiz-title-row">
                    <p className="attachment-filename">AI Practice Quiz</p>
                    {bestScore && (
                      <span className={`quiz-score-inline badge-${bestScore.performanceBadge?.toLowerCase().replace(/\s+/g, '-')}`}>
                        Best: {bestScore.score}/{bestScore.totalQuestions} ({bestScore.percentage}%)
                      </span>
                    )}
                  </div>
                  <p className="attachment-meta-text">
                    5, 10, 15, or 20 questions with step-by-step explanations
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cta-download-btn btn-quiz-cta"
                onClick={() =>
                  handleRequireAuth(
                    () => setShowQuizModal(true),
                    "AI Practice Quizzes"
                  )
                }
              >
                {isLoggedIn()
                  ? (bestScore ? "Retake Quiz" : "Start Quiz")
                  : "🔒 Log in for Quiz"}
              </button>
            </div>
          </div>

        </div>

        {/* ── RIGHT: Sidebar Column ── */}
        <div className="detail-sidebar-col">

          {/* Uploader info card */}
          <div className="uploader-meta-box">
            <p className="sidebar-card-label">Uploaded by</p>
            <div className="uploader-left">
              <div className="uploader-avatar">
                {resource.uploadedBy?.avatar ? (
                  <img
                    src={resource.uploadedBy.avatar}
                    alt={resource.uploadedBy.name || "Uploader"}
                    className="uploader-avatar-img"
                  />
                ) : (
                  resource.uploadedBy?.name?.charAt(0)?.toUpperCase() || "S"
                )}
              </div>
              <div>
                <p className="uploader-name">
                  {resource.uploadedBy?.name || "Student"}
                </p>
                <p className="uploader-email">
                  {resource.uploadedBy?.email || "Peer Contributor"}
                </p>
              </div>
            </div>
            <div className="uploader-divider" />
            <span className="uploader-date-label">Published</span>
            <span className="uploader-date-value">{formatDate(resource.createdAt)}</span>
          </div>

          {/* External reference link card — shown when user provided a separate external URL alongside the file */}
          {!isCloudinaryFile && resource.fileUrl && (
            <div className="cta-actions-wrapper">
              <p className="sidebar-card-label">External Reference</p>
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-external-btn"
              >
                <svg className="back-arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open External Link
              </a>
              <p className="file-url-preview">{resource.fileUrl}</p>
            </div>
          )}

          {/* Owner actions card */}
          {isOwner && (
            <div className="detail-owner-actions-card">
              <p className="sidebar-card-label">Manage Resource</p>
              <div className="detail-owner-actions">
                <Link to={`/resources/${id}/edit`} className="btn-action-edit">
                  <EditIcon size={15} /> Edit
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                  className="btn-action-delete"
                >
                  <TrashIcon size={15} /> {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Study Note?"
        message={`Are you sure you want to delete "${resource?.title}"? This action cannot be undone.`}
        confirmText="Delete Note"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Quiz Modal */}
      {showQuizModal && (
        <QuizModal
          resource={resource}
          onClose={() => setShowQuizModal(false)}
          onQuizCompleted={(savedResult) => {
            if (!bestScore || savedResult.percentage >= bestScore.percentage) {
              setBestScore(savedResult);
            }
          }}
        />
      )}

      {/* Audio Lecture Modal */}
      {showAudioModal && (
        <AudioLectureModal
          resource={resource}
          onClose={() => setShowAudioModal(false)}
        />
      )}

      {/* Video Lecture Modal */}
      {showVideoModal && (
        <VideoLectureModal
          resource={resource}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </div>
  );
}

export default ResourceDetail;
