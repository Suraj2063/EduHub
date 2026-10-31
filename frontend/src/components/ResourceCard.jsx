import { Link } from "react-router-dom";
import { getBadgeColor, formatDate } from "../utils/helpers";
import { CloudIcon, LinkIcon } from "./Icons";
import "./ResourceCard.css";

function ResourceCard({ resource }) {
  const badgeColor = getBadgeColor(resource.subject);
  const snippet =
    resource.description?.length > 130
      ? resource.description.slice(0, 130) + "..."
      : resource.description;

  return (
    <div className="resource-card">
      <div>
        {/* Top meta row */}
        <div className="card-top-meta">
          <span className={`card-subject-badge ${badgeColor}`}>
            {resource.subject}
          </span>
          <span className="card-date">
            {formatDate(resource.createdAt)}
          </span>
        </div>

        {/* Title */}
        <Link to={`/resources/${resource._id}`} className="card-title-link">
          <h3 className="card-title">
            {resource.title}
          </h3>
        </Link>

        {/* Description snippet */}
        <p className="card-description">
          {snippet}
        </p>

        {/* File attachment vs Link indicator */}
        <div className="card-type-row">
          {resource.isCloudinary || resource.cloudinaryPublicId || resource.filePath ? (
            <span className="card-type-badge file-badge">
              <CloudIcon size={14} /> {resource.fileName ? resource.fileName.split(".").pop().toUpperCase() : "Document"} Attached
            </span>
          ) : (
            <span className="card-type-badge link-badge">
              <LinkIcon size={14} /> External Link
            </span>
          )}
        </div>
      </div>

      {/* Author and Action footer */}
      <div className="card-footer">
        <div className="card-author-info">
          <div className="author-avatar">
            {resource.uploadedBy?.avatar ? (
              <img
                src={resource.uploadedBy.avatar}
                alt={resource.uploadedBy.name || "Author"}
                className="author-avatar-img"
              />
            ) : (
              resource.uploadedBy?.name?.charAt(0)?.toUpperCase() || "S"
            )}
          </div>
          <span className="author-name">
            {resource.uploadedBy?.name || "Student"}
          </span>
        </div>

        <Link to={`/resources/${resource._id}`} className="card-action-btn">
          View Note
          <svg className="card-arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default ResourceCard;
