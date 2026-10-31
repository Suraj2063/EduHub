import { API_URL, API_BASE_URL } from "../../config";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ResourceCard from "../../components/ResourceCard";
import { BooksIcon, SearchIcon, ZapIcon, UsersIcon, HeadphonesIcon, BrainIcon, VideoIcon } from "../../components/Icons";
import "./Home.css";

const SUBJECTS = [
  "All",
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

function Home() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState("All");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (activeSubject !== "All") params.subject = activeSubject;

        const response = await axios({
          url: `${API_URL}/resources`,
          method: "get",
          params,
        });
        setResources(response.data.result || []);
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [debouncedSearch, activeSubject]);

  return (
    <div className="home-container">
      {/* Hero Header Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>Next-Gen AI College Study Platform</span>
          </div>

          <h1 className="hero-title">
            Learn Smarter. <span className="hero-title-accent">Together.</span>
          </h1>

          <p className="hero-subtitle">
            Turn any course note or PDF into spoken AI audio lectures, animated 1080p
            video presentations, and adaptive practice exams. Collaborate, search, and master
            your courses together.
          </p>

          <div className="stats-container">
            <div className="stat-item">
              <span className="stat-number">{resources.length}+</span>
              <span className="stat-label">Study Notes</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number stat-number-accent">4-in-1</span>
              <span className="stat-label">AI Study Suite</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">{SUBJECTS.length - 1}</span>
              <span className="stat-label">Disciplines</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number stat-number-green">100% Free</span>
              <span className="stat-label">Open Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Feed Section */}
      <section className="feed-section">
        {/* Search Bar Box */}
        <div className="search-card">
          <div className="search-input-group">
            <svg
              className="search-icon-svg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="search-input"
              type="text"
              placeholder="Search by note title, course, or keywords (e.g. Calculus, Data Structures)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-text-input"
            />
          </div>

          {(search || activeSubject !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setActiveSubject("All");
              }}
              className="search-reset-btn"
            >
              Reset Filters
            </button>
          )}

          <Link to="/upload" className="search-upload-btn">
            + Upload Note
          </Link>
        </div>

        {/* Filter Chips */}
        <div className="filters-scroll">
          {SUBJECTS.map((subj) => (
            <button
              key={subj}
              onClick={() => setActiveSubject(subj)}
              className={`filter-chip ${activeSubject === subj ? "active" : ""}`}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Status text */}
        <p className="feed-status-text">
          {loading ? (
            "Loading study resources..."
          ) : resources.length === 0 ? (
            "No resources match your search criteria"
          ) : (
            <>
              Showing <span className="feed-status-count">{resources.length}</span> note{resources.length !== 1 ? "s" : ""}
              {activeSubject !== "All" && <span> in <strong>{activeSubject}</strong></span>}
              {debouncedSearch && <span> matching "<strong>{debouncedSearch}</strong>"</span>}
            </>
          )}
        </p>

        {/* Notes Grid */}
        {loading ? (
          <div className="notes-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-badge" />
                <div className="skeleton-title" />
                <div className="skeleton-text" />
                <div className="skeleton-text-short" />
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">
              <BooksIcon size={44} />
            </div>
            <h3 className="empty-title">No notes found</h3>
            <p className="empty-desc">
              We couldn't find any resources matching your search. Be the first student to upload notes for this subject!
            </p>
            <Link to="/upload" className="search-upload-btn">
              Upload This Note
            </Link>
          </div>
        ) : (
          <div className="notes-grid">
            {resources.map((resource) => (
              <ResourceCard key={resource._id} resource={resource} />
            ))}
          </div>
        )}
      </section>

      {/* AI-Powered Study Experience Section */}
      <section className="features-section">
        <div className="features-header">
          <span className="features-badge">Next-Gen Study Workspace</span>
          <h2 className="features-title">How EduHub Helps You Master Any Subject</h2>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon-wrapper audio-icon-wrapper">
              <HeadphonesIcon size={24} />
            </div>
            <div className="feature-header-row">
              <h3 className="feature-box-title">AI Audio Lectures</h3>
              <span className="feature-pill-badge pill-live">English &amp; Nepali</span>
            </div>
            <p className="feature-box-desc">
              Transform dense notes into clear spoken lectures with studio-quality neural voices. Ask our interactive AI Tutor questions on any topic in real time.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrapper quiz-icon-wrapper">
              <BrainIcon size={24} />
            </div>
            <div className="feature-header-row">
              <h3 className="feature-box-title">AI Practice Quizzes</h3>
              <span className="feature-pill-badge pill-live">Adaptive</span>
            </div>
            <p className="feature-box-desc">
              Generate 5 to 20-question custom practice exams directly from lecture notes. Features instant grading, step-by-step reasoning, and score tracking.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrapper notes-icon-wrapper">
              <SearchIcon size={24} />
            </div>
            <div className="feature-header-row">
              <h3 className="feature-box-title">Instant PDF &amp; Note Hub</h3>
              <span className="feature-pill-badge pill-free">Zero Paywalls</span>
            </div>
            <p className="feature-box-desc">
              Filter peer-shared reviews by major and course code. Enjoy in-browser PDF previews, OCR extraction, and direct downloads with no subscription fees.
            </p>
          </div>

          <div className="feature-box feature-box-highlight">
            <div className="feature-icon-wrapper video-icon-wrapper">
              <VideoIcon size={24} />
            </div>
            <div className="feature-header-row">
              <h3 className="feature-box-title">AI Video Lectures</h3>
              <span className="feature-pill-badge pill-live">1080p Animated</span>
            </div>
            <p className="feature-box-desc">
              Synthesize lecture notes into 1080p animated visual slide presentations, synchronized neural voiceovers, key highlights, and interactive scene breakdowns.
            </p>
          </div>
        </div>
      </section>

      {/* Community Upload CTA Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-card">
          <div className="cta-banner-left">
            <span className="cta-banner-badge">Empower Your Classmates</span>
            <h2 className="cta-banner-title">Have notes from this semester?</h2>
            <p className="cta-banner-desc">
              Upload your lecture notes, slides, or study guides. Our AI will automatically extract, index, and generate audio &amp; video lectures for your classmates.
            </p>
          </div>
          <Link to="/upload" className="cta-banner-btn">
            Share Your Notes Now
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
