import { Link } from "react-router-dom";
import Logo from "./Logo";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer-root">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-brand-col">
            <Logo to="/" size={36} />
            <p className="footer-brand-desc">
              The next-generation AI study platform for college students to transform lecture notes into interactive audio lectures, animated videos, and adaptive practice exams.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="footer-col-title">Explore</h4>
            <div className="footer-link-list">
              <Link to="/" className="footer-link">
                All Study Notes
              </Link>
              <Link to="/upload" className="footer-link">
                Share Your Notes
              </Link>
              <Link to="/register" className="footer-link">
                Create Student Account
              </Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h4 className="footer-col-title">Student Community</h4>
            <p className="footer-brand-desc">
              Built for university and college courses. Always 100% free for students.
            </p>
            <div className="footer-community-badge">
              <span className="community-badge-dot" />
              <span>Community Verified</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <p>© {new Date().getFullYear()} EduHub. Built for student collaboration.</p>
          <div>
            <span>Academic Integrity • Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
