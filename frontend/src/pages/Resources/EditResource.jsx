import { API_URL, API_BASE_URL } from "../../config";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, getUser } from "../../utils/auth";
import { EditIcon, DocumentIcon, FolderIcon, RefreshIcon, CloseIcon } from "../../components/Icons";
import "./UploadResource.css";
import "./EditResource.css";

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

function EditResource() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    subject: "Computer Science",
    fileUrl: "",
    description: "",
  });
  const [customSubject, setCustomSubject] = useState("");
  const [existingFile, setExistingFile] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await axios({
          url: `${API_URL}/resources/${id}`,
          method: "get",
        });

        const data = response.data.result;
        const currentUser = getUser();

        if (!currentUser || (data.uploadedBy && data.uploadedBy._id !== currentUser._id)) {
          toast.error("You are not authorized to edit this resource");
          navigate(`/resources/${id}`);
          return;
        }

        const isStandardSubject = SUBJECTS.slice(0, -1).includes(data.subject);
        setFormData({
          title: data.title,
          subject: isStandardSubject ? data.subject : "Other",
          fileUrl: data.fileUrl || "",
          description: data.description,
        });

        if (!isStandardSubject) {
          setCustomSubject(data.subject === "Other" ? "" : data.subject);
        }

        if (data.filePath) {
          setExistingFile({
            fileName: data.fileName,
            filePath: data.filePath,
            fileSize: data.fileSize,
          });
        }
      } catch (error) {
        toast.error("Resource not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [id, navigate]);

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
      setNewFile(selected);
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
      setNewFile(dropped);
    }
  };

  const handleRemoveNewFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setNewFile(null);
    const fileInput = document.getElementById("edit-file-input");
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

    // Study note file is compulsory (existing or new)
    const hasExistingFile = !!existingFile;
    const hasNewFile = !!newFile;

    if (!hasExistingFile && !hasNewFile) {
      toast.error("Please upload a study note document file. File upload is compulsory.");
      return;
    }

    setSaving(true);
    try {
      const patchData = new FormData();
      patchData.append("title", formData.title.trim());
      patchData.append("subject", finalSubject);
      patchData.append("description", formData.description.trim());
      patchData.append("fileUrl", formData.fileUrl ? formData.fileUrl.trim() : "");
      if (newFile) {
        patchData.append("file", newFile);
      }

      const response = await axios({
        url: `${API_URL}/resources/${id}`,
        method: "patch",
        data: patchData,
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.data.success) {
        toast.success("Study note updated successfully!");
        navigate(`/resources/${id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update resource");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="form-page-container">
        <p className="feed-status-text">Loading resource...</p>
      </div>
    );
  }

  return (
    <div className="form-page-container">
      <Link to={`/resources/${id}`} className="back-nav-link">
        <svg className="back-arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Details
      </Link>

      <div className="form-card">
        <div className="form-header-badge">
          <EditIcon size={16} /> Manage Resource
        </div>
        <h1 className="form-header-title">Edit Study Note</h1>
        <p className="form-header-subtitle">
          Update your document details, upload a revised file, or adjust links.
        </p>

        <form onSubmit={handleSubmit} className="resource-form">
          {/* Title */}
          <div className="form-field-group">
            <label className="field-label">Document Title *</label>
            <input
              id="edit-title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="field-input"
            />
          </div>

          {/* Subject */}
          <div className="form-field-group">
            <label className="field-label">Subject Category *</label>
            <select
              id="edit-subject"
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
                  id="edit-custom-subject"
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

          {/* Document File Management */}
          <div className="form-field-group">
            <label className="field-label">
              Study Note Document *
              <span className="field-required-badge">Compulsory</span>
            </label>

            {/* If replacing with new file */}
            {newFile ? (
              <div className="selected-file-card">
                <div className="selected-file-left">
                  <div className="selected-file-icon">
                    <DocumentIcon size={22} />
                  </div>
                  <div className="selected-file-details">
                    <span className="selected-file-name" title={newFile.name}>
                      {newFile.name}
                    </span>
                    <span className="selected-file-size">
                      {formatFileSize(newFile.size)} • New file ready to replace existing
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveNewFile}
                  className="selected-file-remove-btn"
                >
                  <CloseIcon size={14} /> Cancel Replace
                </button>
              </div>
            ) : existingFile ? (
              <div className="selected-file-card">
                <div className="selected-file-left">
                  <div className="selected-file-icon">
                    <FolderIcon size={22} />
                  </div>
                  <div className="selected-file-details">
                    <span className="selected-file-name" title={existingFile.fileName}>
                      {existingFile.fileName}
                    </span>
                    <span className="selected-file-size">
                      {formatFileSize(existingFile.fileSize)} • Currently saved on server
                    </span>
                  </div>
                </div>
                <label
                  htmlFor="edit-file-input"
                  className="selected-file-replace-btn"
                >
                  <RefreshIcon size={15} /> Replace File
                </label>
                <input
                  id="edit-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.csv"
                  onChange={handleFileChange}
                  className="hidden-file-input"
                />
              </div>
            ) : (
              <label
                htmlFor="edit-file-input"
                className={`file-dropzone ${isDragging ? "is-dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="dropzone-icon-box">
                  <DocumentIcon size={28} />
                </div>
                <div className="dropzone-main-text">
                  Upload a file to attach to this note, or{" "}
                  <span className="dropzone-highlight">browse</span>
                </div>
                <div className="dropzone-sub-text">
                  Supports PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG (up to 25MB)
                </div>
                <input
                  id="edit-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.csv"
                  onChange={handleFileChange}
                  className="hidden-file-input"
                />
              </label>
            )}
          </div>

          {/* Optional External Link */}
          <div className="form-field-group">
            <label className="field-label">
              External Link
              <span className="field-optional-badge">Optional</span>
            </label>
            <input
              id="edit-fileUrl"
              type="url"
              name="fileUrl"
              placeholder="https://drive.google.com/... or leave blank"
              value={formData.fileUrl}
              onChange={handleChange}
              className="field-input"
            />
            <p className="field-hint">
              Optional reference link (Google Drive, Dropbox, Notion, etc.).
            </p>
          </div>

          {/* Description */}
          <div className="form-field-group">
            <label className="field-label">Description & Topics Covered *</label>
            <textarea
              id="edit-description"
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleChange}
              className="field-textarea"
            />
          </div>

          <button
            id="edit-submit"
            type="submit"
            disabled={saving}
            className="form-submit-btn"
          >
            {saving ? (
              <>
                <div className="btn-spinner" />
                <span>Saving changes...</span>
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditResource;
