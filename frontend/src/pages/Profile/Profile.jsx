import { API_URL, API_BASE_URL } from "../../config";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, isLoggedIn, updateUser } from "../../utils/auth";
import { getBadgeColor, formatDate } from "../../utils/helpers";
import { FolderIcon } from "../../components/Icons";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ResourceCard.css";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) {
      toast.error("Please login to view your profile");
      navigate("/login");
      return;
    }

    const fetchProfileAndUploads = async () => {
      try {
        const token = getToken();

        const userRes = await axios({
          url: `${API_URL}/users/me`,
          method: "get",
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = userRes.data.result;
        setUser(userData);
        updateUser(userData);

        // Fetch Uploads and Quiz History in parallel to avoid waterfalls
        const [uploadsRes, quizRes] = await Promise.all([
          axios.get(`${API_URL}/resources/user/${userData._id}`),
          axios
            .get(`${API_URL}/quiz/my-results`, { headers: { Authorization: `Bearer ${token}` } })
            .catch((quizErr) => {
              console.error("Failed to fetch quiz history:", quizErr);
              return { data: { success: false, result: [] } };
            }),
        ]);

        setUploads(uploadsRes.data?.result || []);
        if (quizRes.data?.success) {
          setQuizResults(quizRes.data.result || []);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          toast.error("Session expired, please login again", { toastId: "session-expired" });
          navigate("/login");
        } else {
          toast.error("Failed to load profile", { toastId: "profile-load-error" });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndUploads();
  }, [navigate]);

  const confirmDelete = async () => {
    if (!resourceToDelete) return;
    setDeleting(true);

    try {
      const response = await axios({
        url: `${API_URL}/resources/${resourceToDelete._id}`,
        method: "delete",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.success) {
        toast.success("Resource deleted successfully");
        setUploads(uploads.filter((item) => item._id !== resourceToDelete._id));
        setResourceToDelete(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <p className="feed-status-text">Loading profile...</p>
      </div>
    );
  }

  // Calculate Quiz Statistics
  const totalQuizzes = quizResults.length;
  const avgPercentage = totalQuizzes > 0
    ? Math.round(quizResults.reduce((acc, q) => acc + (q.percentage || 0), 0) / totalQuizzes)
    : 0;
  const masteredCount = quizResults.filter((q) => q.performanceBadge === "Mastered").length;

  return (
    <div className="profile-container">
      {/* Profile Overview Card */}
      <div className="profile-card">
        <div className="profile-top-row">
          <div className="profile-info-left">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="profile-big-avatar-img"
              />
            ) : (
              <div className="profile-big-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="profile-name">{user?.name}</h1>
              <p className="profile-email">
                {user?.email}
                {user?.age ? ` • Age ${user.age}` : ""}
              </p>
              {user?.bio && (
                <p className="profile-bio">{user.bio}</p>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <Link to="/upload" className="btn-profile-primary">
              + Upload Note
            </Link>
            <Link to="/settings" className="btn-profile-secondary">
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <span className="stat-box-label">Notes Shared</span>
            <span className="stat-box-value">{uploads.length}</span>
          </div>
          <div className="profile-stat-box">
            <span className="stat-box-label">Quizzes Taken</span>
            <span className="stat-box-value">{totalQuizzes}</span>
          </div>
          <div className="profile-stat-box">
            <span className="stat-box-label">Avg. Quiz Accuracy</span>
            <span className={`stat-box-value ${avgPercentage >= 70 ? "stat-box-value-green" : ""}`}>
              {totalQuizzes > 0 ? `${avgPercentage}%` : "—"}
            </span>
          </div>
          <div className="profile-stat-box">
            <span className="stat-box-label">Mastered Quizzes</span>
            <span className="stat-box-value stat-box-value-purple">
              {masteredCount}
            </span>
          </div>
        </div>
      </div>

      {/* Quiz Performance & Learning History Section */}
      <div className="profile-quiz-section">
        <div className="my-uploads-header">
          <div className="quiz-section-title-wrap">
            <h2 className="my-uploads-title">
              Quiz History &amp; Performance ({totalQuizzes})
            </h2>
          </div>
          <p className="my-uploads-subtitle">
            Track your practice MCQ attempts, mastery scores, and review question explanations across all notes
          </p>
        </div>

        {quizResults.length === 0 ? (
          <div className="empty-card quiz-empty-card">
            <div className="quiz-empty-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="empty-title">No Quizzes Completed Yet</h3>
            <p className="empty-desc">
              Reinforce what you learn! Open any study note, choose how many questions you want (5, 10, 15, or 20),
              and test your knowledge.
            </p>
            <Link to="/" className="btn-profile-primary">
              Browse Notes &amp; Start a Quiz
            </Link>
          </div>
        ) : (
          <div className="profile-quiz-grid">
            {quizResults.map((result) => {
              const badgeClass = result.performanceBadge?.toLowerCase().replace(/\s+/g, "-") || "good-attempt";
              return (
                <div key={result._id} className="profile-quiz-card">
                  <div className="profile-quiz-card-top">
                    <span className={`card-subject-badge ${getBadgeColor(result.subject)}`}>
                      {result.subject}
                    </span>
                    <span className={`quiz-history-badge badge-${badgeClass}`}>
                      {result.performanceBadge}
                    </span>
                  </div>

                  <h3 className="profile-quiz-note-title">
                    <Link to={`/resources/${result.resource?._id || result.resource}`}>
                      {result.noteTitle}
                    </Link>
                  </h3>

                  <div className="profile-quiz-score-row">
                    <div className="profile-quiz-score-pill">
                      <span className="quiz-score-num">{result.score}</span>
                      <span className="quiz-score-denom">/ {result.totalQuestions}</span>
                    </div>
                    <div className="profile-quiz-pct">
                      {result.percentage}% Accuracy
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="profile-quiz-bar-bg">
                    <div
                      className={`profile-quiz-bar-fill fill-${badgeClass}`}
                      style={{ width: `${result.percentage}%` }}
                    />
                  </div>

                  <div className="profile-quiz-card-footer">
                    <span className="profile-quiz-date">
                      {formatDate(result.createdAt)}
                    </span>
                    <Link
                      to={`/resources/${result.resource?._id || result.resource}?quiz=true`}
                      className="btn-retake-quiz-link"
                    >
                      Retake Quiz →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Uploads Section */}
      <div>
        <div className="my-uploads-header">
          <h2 className="my-uploads-title">
            My Uploaded Materials ({uploads.length})
          </h2>
          <p className="my-uploads-subtitle">
            Manage, edit, or delete study materials you have contributed to the community
          </p>
        </div>

        {uploads.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">
              <FolderIcon size={44} />
            </div>
            <h3 className="empty-title">You haven't uploaded any notes yet</h3>
            <p className="empty-desc">
              Help your peers succeed by uploading lecture notes, summaries, or past papers.
            </p>
            <Link to="/upload" className="btn-profile-primary">
              Upload Your First Note
            </Link>
          </div>
        ) : (
          <div className="my-uploads-grid">
            {uploads.map((item) => (
              <div key={item._id} className="resource-card">
                <div>
                  <div className="card-top-meta">
                    <span className={`card-subject-badge ${getBadgeColor(item.subject)}`}>
                      {item.subject}
                    </span>
                    <span className="card-date">{formatDate(item.createdAt)}</span>
                  </div>

                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-description">{item.description}</p>
                </div>

                <div className="card-footer">
                  <Link to={`/resources/${item._id}`} className="card-action-btn">
                    View Details
                  </Link>

                  <div className="profile-actions">
                    <Link to={`/resources/${item._id}/edit`} className="btn-edit-small">
                      Edit
                    </Link>
                    <button
                      onClick={() => setResourceToDelete(item)}
                      className="btn-delete-small"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!resourceToDelete}
        title="Delete Study Note?"
        message={`Are you sure you want to delete "${resourceToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Note"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setResourceToDelete(null)}
      />
    </div>
  );
}

export default Profile;
