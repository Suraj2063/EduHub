import { Link } from "react-router-dom";
import "./Logo.css";

/**
 * LogoIcon — Premium EduHub brand mark.
 * A clean graduation mortarboard icon on an indigo gradient square.
 * Pure SVG, no emoji, no external images, renders perfectly everywhere.
 */
export function LogoIcon({ size = 38, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`eduhub-logo-svg ${className}`}
      aria-label="EduHub"
      role="img"
    >
      <defs>
        <linearGradient id="logoGradMain" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="logoGradShine" x1="0" y1="0" x2="48" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background square with rounded corners */}
      <rect width="48" height="48" rx="13" fill="url(#logoGradMain)" />
      {/* Subtle shine overlay */}
      <rect width="48" height="24" rx="13" fill="url(#logoGradShine)" />

      {/* Graduation cap flat top (diamond/rhombus shape) */}
      <path
        d="M24 11L10 18.5L24 26L38 18.5L24 11Z"
        fill="#ffffff"
        fillOpacity="0.98"
      />

      {/* Cap body / scroll base */}
      <path
        d="M15.5 22V29C15.5 32.5 19.2 35 24 35C28.8 35 32.5 32.5 32.5 29V22L24 26.5L15.5 22Z"
        fill="#c7d2fe"
      />

      {/* Tassel rope / cord */}
      <line
        x1="36"
        y1="20"
        x2="36"
        y2="29"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Tassel bob */}
      <circle cx="36" cy="30.5" r="2" fill="#fbbf24" />
    </svg>
  );
}

export default function Logo({ size = 38, showText = true, className = "", to = "/" }) {
  const content = (
    <div className={`eduhub-logo-wrapper ${className}`}>
      <LogoIcon size={size} />
      {showText && (
        <span className="eduhub-brand-title">
          Edu<span className="eduhub-brand-accent">Hub</span>
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="eduhub-logo-link" aria-label="EduHub — Home">
        {content}
      </Link>
    );
  }

  return content;
}
