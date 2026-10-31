import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { getUser, clearAuth } from "../utils/auth";
import Logo from "./Logo";
import "./Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("storage", sync);
    window.addEventListener("authChange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("authChange", sync);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setDropdownOpen(false);
    setMenuOpen(false);
    window.dispatchEvent(new Event("authChange"));
    navigate("/");
  };

  const navLinkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <header className="navbar-root">
      <div className="navbar-container">
        {/* Left: Brand Logo */}
        <Logo to="/" size={38} />

        {/* Right: Navigation Links & User Menu grouped together */}
        <nav className="navbar-links">
          <NavLink to="/" className={navLinkClass} end>
            Explore Notes
          </NavLink>

          {user ? (
            <>
              <NavLink to="/upload" className={navLinkClass}>
                Upload Note
              </NavLink>

              {/* User Avatar + Dropdown */}
              <div className="nav-user-dropdown-wrapper" ref={dropdownRef}>
                <button
                  className="nav-user-trigger"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="User menu"
                  aria-expanded={dropdownOpen}
                >
                  <div className="nav-avatar-ring">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="nav-user-avatar-img"
                      />
                    ) : (
                      <div className="nav-user-avatar">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="nav-user-name">{user.name}</span>
                  <svg
                    className={`nav-dropdown-chevron ${dropdownOpen ? "rotated" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="nav-dropdown-menu">
                    {/* User info inside menu */}
                    <div className="nav-dropdown-user-info">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="nav-dropdown-avatar-img"
                        />
                      ) : (
                        <div className="nav-dropdown-avatar">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="nav-dropdown-user-details">
                        <span className="nav-dropdown-name">{user.name}</span>
                        <span className="nav-dropdown-email">{user.email}</span>
                      </div>
                    </div>

                    <div className="nav-dropdown-divider" />

                    {/* Menu links */}
                    <Link
                      to="/profile"
                      className="nav-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg
                        className="nav-dropdown-item-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      className="nav-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg
                        className="nav-dropdown-item-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>Settings</span>
                    </Link>

                    <div className="nav-dropdown-divider" />

                    <button
                      onClick={handleLogout}
                      className="nav-dropdown-item nav-dropdown-logout"
                    >
                      <svg
                        className="nav-dropdown-item-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
              <Link to="/register" className="nav-cta-btn">
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="nav-mobile-toggle"
          aria-label="Toggle navigation"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="mobile-menu-dropdown">
          <NavLink
            to="/"
            end
            className={navLinkClass}
            onClick={() => setMenuOpen(false)}
          >
            Explore Notes
          </NavLink>

          {user ? (
            <>
              <NavLink
                to="/upload"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Upload Note
              </NavLink>
              <NavLink
                to="/profile"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                My Profile
              </NavLink>
              <NavLink
                to="/settings"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </NavLink>
              <button onClick={handleLogout} className="nav-logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
