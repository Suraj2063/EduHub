import { API_URL, API_BASE_URL } from "../../config";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, isLoggedIn } from "../../utils/auth";
import { UploadIcon, DocumentIcon, CloseIcon } from "../../components/Icons";
import "./UploadResource.css";

const SUBJECTS = [
  "Mathematics",
  "Computer Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "English",
  "History",
  "Engineering",
  "Other",
];

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

function UploadResource() {
  const [formData, setFormData] = useState({
    title: "",
    subject: "Computer Science",
    fileUrl: "",
    description: "",
  });
  const [customSubject, setCustomSubject] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) {
      toast.error("Please login to upload resources", { toastId: "login-required" });
      navigate("/login", { state: { from: "/upload" } });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (selected) {
      if (selected.size > 25 * 1024 * 1024) {
        toast.error("File is too large! Maximum limit is 25MB.");
        return;
      }
      setFile(selected);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.size > 25 * 1024 * 1024) {
        toast.error("File is too large! Maximum limit is 25MB.");
        return;
      }
      setFile(dropped);
    }
  };

  const handleRemoveFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFile(null);
    const fileInput = document.getElementById("resource-file-input");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalSubject = formData.subject === "Other"
      ? (customSubject.trim() || "Other")
      : formData.subject.trim();

    if (!formData.title.trim() || !finalSubject || !formData.description.trim()) {
      toast.error("Please fill in Title, Subject, and Description");
      return;
    }

    if (!file) {
      toast.error("Please upload your study note file (PDF, DOCX, TXT, etc.). File upload is compulsory.");
      return;
    }

    setLoading(true);
    try {
      const postData = new FormData();
      postData.append("title", formData.title.trim());
      postData.append("subject", finalSubject);
      postData.append("description", formData.description.trim());
      if (formData.fileUrl.trim()) {
        postData.append("fileUrl", formData.fileUrl.trim());
      }
      if (file) {
        postData.append("file", file);
      }

      const response = await axios({
        url: `${API_URL}/resources`,
        method: "post",
        data: postData,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.data.success) {
        toast.success("Study note published successfully!");
        navigate(`/resources/${response.data.result._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload resource");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page-container">
      <Link to="/" className="back-nav-link">
        <svg className="back-arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Explore
      </Link>

      <div className="form-card">
        <div className="form-header-badge">
          <UploadIcon size={16} /> Direct Document Upload
        </div>
        <h1 className="form-header-title">Upload Study Resource</h1>
        <p className="form-header-subtitle">
          Upload exam cheat sheets, course lecture notes, or textbooks directly to EduHub.
        </p>

        <form onSubmit={handleSubmit} className="resource-form">
          {/* Document Title */}
          <div className="form-field-group">
            <label className="field-label">Document Title *</label>
            <input
              id="upload-title"
              type="text"
              name="title"
              placeholder="e.g. Data Structures & Algorithms Midterm Notes"
              value={formData.title}
              onChange={handleChange}
              className="field-input"
            />
          </div>

          {/* Subject Category */}
          <div className="form-field-group">
            <label className="field-label">Subject Category *</label>
            <select
              id="upload-subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="field-select"
            >
              {SUBJECTS.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            {formData.subject === "Other" && (
              <div style={{ marginTop: "10px" }}>
                <input
                  id="upload-custom-subject"
                  type="text"
                  placeholder="Specify custom subject (e.g. Psychology, Law, Architecture)..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="field-input"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Direct File Upload Drop Zone */}
          <div className="form-field-group">
            <label className="field-label">
              Study Note Document *
              <span className="field-required-badge">Compulsory</span>
            </label>

            {!file ? (
              <label
                htmlFor="resource-file-input"
                className={`file-dropzone ${isDragging ? "is-dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="dropzone-icon-box">
                  <DocumentIcon size={28} />
                </div>
                <div className="dropzone-main-text">
                  Drag and drop your note file here, or{" "}
                  <span className="dropzone-highlight">browse files</span>
                </div>
                <div className="dropzone-sub-text">
                  Supports PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG (up to 25MB)
                </div>
                <input
                  id="resource-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.csv"
                  onChange={handleFileChange}
                  className="hidden-file-input"
                />
              </label>
            ) : (
              <div className="selected-file-card">
                <div className="selected-file-left">
                  <div className="selected-file-icon">
                    <DocumentIcon size={22} />
                  </div>
                  <div className="selected-file-details">
                    <span className="selected-file-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="selected-file-size">
                      {formatFileSize(file.size)} • Ready to upload
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="selected-file-remove-btn"
                >
                  <CloseIcon size={14} /> Remove
                </button>
              </div>
            )}
          </div>

          {/* Optional External Link */}
          <div className="form-field-group">
            <label className="field-label">
              External Reference Link
              <span className="field-optional-badge">Optional</span>
            </label>
            <input
              id="upload-fileUrl"
              type="url"
              name="fileUrl"
              placeholder="https://drive.google.com/... or leave blank"
              value={formData.fileUrl}
              onChange={handleChange}
              className="field-input"
            />
          </div>

          {/* Description */}
          <div className="form-field-group">
            <label className="field-label">Description & Topics Covered *</label>
            <textarea
              id="upload-description"
              name="description"
              rows={5}
              placeholder="Provide a detailed summary of chapters, key formulas, concepts, and topics included in this note..."
              value={formData.description}
              onChange={handleChange}
              className="field-textarea"
            />
          </div>

          {/* Submit Button */}
          <button
            id="upload-submit"
            type="submit"
            disabled={loading}
            className="form-submit-btn"
          >
            {loading ? (
              <>
                <div className="btn-spinner" />
                <span>Uploading study note...</span>
              </>
            ) : (
              "Publish Study Note"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UploadResource;
