import { API_URL, API_BASE_URL } from "../config";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./VideoLectureModal.css";

const API_BASE = `${API_URL}`;

export default function VideoLectureModal({ resource, onClose }) {
  // Setup state
  const [step, setStep] = useState("config"); // "config" | "loading" | "player"
  const [language, setLanguage] = useState("en"); // "en" | "ne"
  const [depth, setDepth] = useState("detailed"); // "recap" | "detailed"
  const [loadingStatus, setLoadingStatus] = useState("Analyzing lecture notes...");

  // Video playback data
  const [videoData, setVideoData] = useState(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0); // Cumulative seconds
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Q&A state
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorAnswer, setTutorAnswer] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);

  // Audio ref (plays the current scene's audio)
  const audioRef = useRef(null);
  const playerContainerRef = useRef(null);

  const scenes = videoData?.scenes || [];
  const currentScene = scenes[currentSceneIndex] || null;
  const totalDuration = videoData?.totalDuration || 1;

  // Check for existing session video on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`eduhub_video_${resource?._id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.scenes?.length > 0) {
          setVideoData(parsed);
          setLanguage(parsed.language || "en");
          setDepth(parsed.depth || "detailed");
          setStep("player");
        }
      }
    } catch (_) {}
  }, [resource?._id]);

  // Handle generation
  const handleGenerate = async () => {
    try {
      setStep("loading");
      setLoadingStatus("Extracting core topics & formulas from PDF...");

      const statusTimer1 = setTimeout(() => {
        setLoadingStatus("Designing animated visual scenes & keyframes...");
      }, 3500);

      const statusTimer2 = setTimeout(() => {
        setLoadingStatus(
          language === "ne"
            ? "Generating Nepali neural voice narration..."
            : "Generating AI voiceover narration..."
        );
      }, 7000);

      const res = await axios.post(`${API_BASE}/video/generate`, {
        resourceId: resource._id,
        language,
        depth,
      });

      clearTimeout(statusTimer1);
      clearTimeout(statusTimer2);

      if (res.data?.success && res.data?.result) {
        setVideoData(res.data.result);
        try {
          sessionStorage.setItem(`eduhub_video_${resource?._id}`, JSON.stringify(res.data.result));
        } catch (_) {}
        setCurrentSceneIndex(0);
        setCurrentTime(0);
        setStep("player");
      } else {
        throw new Error(res.data?.message || "Failed to generate video");
      }
    } catch (err) {
      console.error("Video generation failed:", err);
      alert(err.response?.data?.message || err.message || "Video generation failed.");
      setStep("config");
    }
  };

  // Audio setup when scene changes
  useEffect(() => {
    if (step !== "player" || !currentScene?.audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = currentScene.audioUrl.startsWith("http")
      ? currentScene.audioUrl
      : `${API_BASE_URL}${currentScene.audioUrl}`;
    audio.playbackRate = playbackSpeed;

    const handleTimeUpdate = () => {
      const sceneStart = currentScene.startTime || 0;
      setCurrentTime(sceneStart + audio.currentTime);
    };

    const handleEnded = () => {
      // Advance to next scene or loop/finish
      if (currentSceneIndex < scenes.length - 1) {
        setCurrentSceneIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [currentSceneIndex, step, currentScene]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // Change playback speed
  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Skip scenes
  const goToScene = (index) => {
    if (index < 0 || index >= scenes.length) return;
    setCurrentSceneIndex(index);
    if (scenes[index]) {
      setCurrentTime(scenes[index].startTime || 0);
    }
  };

  // Scrubber click
  const handleScrubberClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * totalDuration;

    // Find corresponding scene
    for (let i = 0; i < scenes.length; i++) {
      const start = scenes[i].startTime;
      const end = start + scenes[i].duration;
      if (targetTime >= start && targetTime <= end) {
        setCurrentSceneIndex(i);
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, targetTime - start);
        }
        setCurrentTime(targetTime);
        break;
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };



  // Ask AI Tutor
  const handleAskTutor = async (question) => {
    const q = question || tutorQuestion;
    if (!q.trim()) return;

    setTutorLoading(true);
    setTutorAnswer("");

    try {
      const res = await axios.post(`${API_BASE}/audio/ask-tutor`, {
        resourceId: resource._id,
        currentSegment: currentScene?.title || resource.title,
        question: q,
        language,
      });

      if (res.data?.success) {
        setTutorAnswer(res.data.result.answer);
      } else {
        throw new Error(res.data?.message || "Failed to get tutor answer");
      }
    } catch (err) {
      setTutorAnswer("Could not reach tutor: " + (err.response?.data?.message || err.message));
    } finally {
      setTutorLoading(false);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="vlecture-overlay" onClick={onClose}>
      <div className="vlecture-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="vlecture-header">
          <div className="vlecture-header-left">
            <span className="vlecture-tag">AI Video Studio</span>
            <h2 className="vlecture-title">{resource.title}</h2>
          </div>
          <div className="vlecture-header-actions">
            {step === "player" && (
              <button
                type="button"
                className="vlecture-btn-regenerate"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsPlaying(false);
                  setStep("config");
                }}
                title="Regenerate with fresh scenes or change language/depth"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate Video
              </button>
            )}
            <button className="vlecture-close-btn" onClick={onClose} title="Close Video Studio">
              ✕
            </button>
          </div>
        </div>

        {/* STEP 1: CONFIGURATION */}
        {step === "config" && (
          <div className="vlecture-config-body">
            <div className="vlecture-config-hero">
              <div className="vlecture-icon-glow">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <h3>Generate Animated Video Lecture</h3>
              <p>
                Synthesizes your lecture notes into high-definition animated scenes, visual concept cards, and neural voiceover.
              </p>
            </div>

            <div className="vlecture-options-grid">
              {/* Language Selection */}
              <div className="vlecture-option-card">
                <label className="vlecture-option-label">Language &amp; Voice</label>
                <div className="vlecture-choice-group">
                  <button
                    type="button"
                    className={`vlecture-choice-btn ${language === "en" ? "active" : ""}`}
                    onClick={() => setLanguage("en")}
                  >
                    <span className="vchoice-badge">EN</span>
                    <div className="vchoice-meta">
                      <strong>English</strong>
                      <span>Studio Academic Voice</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`vlecture-choice-btn ${language === "ne" ? "active" : ""}`}
                    onClick={() => setLanguage("ne")}
                  >
                    <span className="vchoice-badge">ने</span>
                    <div className="vchoice-meta">
                      <strong>Nepali (नेपाली)</strong>
                      <span>Natural Sagar Voice</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Lecture Depth Selection */}
              <div className="vlecture-option-card">
                <label className="vlecture-option-label">Video Depth &amp; Length</label>
                <div className="vlecture-choice-group">
                  <button
                    type="button"
                    className={`vlecture-choice-btn ${depth === "recap" ? "active" : ""}`}
                    onClick={() => setDepth("recap")}
                  >
                    <span className="vchoice-badge badge-recap">⚡</span>
                    <div className="vchoice-meta">
                      <strong>Quick Recap</strong>
                      <span>3–4 scenes • ~2-3 mins</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`vlecture-choice-btn ${depth === "detailed" ? "active" : ""}`}
                    onClick={() => setDepth("detailed")}
                  >
                    <span className="vchoice-badge badge-full">📚</span>
                    <div className="vchoice-meta">
                      <strong>Full Lecture (PDF Scaled)</strong>
                      <span>5–8 scenes • ~5-10 mins</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="vlecture-config-footer">
              <button className="vlecture-generate-btn" onClick={handleGenerate}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Generate Video Lecture Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LOADING PROGRESS */}
        {step === "loading" && (
          <div className="vlecture-loading-body">
            <div className="vlecture-loading-spinner" />
            <h3 className="vlecture-loading-title">{loadingStatus}</h3>
            <p className="vlecture-loading-desc">
              Building 1080p motion graphic frames, key concepts, and neural speech sync...
            </p>
          </div>
        )}

        {/* STEP 3: INTERACTIVE VIDEO PLAYER */}
        {step === "player" && currentScene && (
          <div className="vlecture-player-body">
            
            {/* 16:9 Screen Container */}
            <div
              className={`vlecture-screen-container ${isFullscreen ? "fullscreen" : ""}`}
              ref={playerContainerRef}
            >
              <div className="vlecture-screen">
                
                {/* Scene Header */}
                <div className="vscene-header">
                  <div className="vscene-chapter-badge">
                    {currentScene.chapter || "CORE CONCEPT"}
                  </div>
                  <div className="vscene-counter">
                    SCENE {currentSceneIndex + 1} OF {scenes.length}
                  </div>
                </div>

                {/* Main Topic Heading */}
                <h2 className="vscene-title">{currentScene.title}</h2>

                {/* Main Slide Layout */}
                <div className="vscene-content-grid">
                  {/* Left Column: Bullet Points */}
                  <div className="vscene-bullets-col">
                    {currentScene.keyPoints?.map((pt, idx) => (
                      <div key={idx} className="vscene-bullet-item">
                        <span className="vscene-bullet-num">0{idx + 1}</span>
                        <p className="vscene-bullet-text">{pt}</p>
                      </div>
                    ))}
                  </div>

                  {/* Right Column: Highlight Card */}
                  {currentScene.highlightBox && (
                    <div className="vscene-highlight-card">
                      <div className="vscene-highlight-badge">
                        {currentScene.highlightBox.badge || "KEY TAKEAWAY"}
                      </div>
                      <div className="vscene-highlight-code">
                        {currentScene.highlightBox.content}
                      </div>
                    </div>
                  )}
                </div>

                {/* Animated Equalizer Waveform */}
                <div className="vscene-waveform-bar">
                  <div className="vequalizer-group">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      <span
                        key={i}
                        className={`veq-bar ${isPlaying ? "animating" : ""}`}
                        style={{ animationDelay: `${i * 0.08}s` }}
                      />
                    ))}
                  </div>
                  <span className="vscene-caption">
                    {isPlaying ? "Narration Playing..." : "Paused"}
                  </span>
                </div>

              </div>

              {/* Scrubber Timeline */}
              <div className="vlecture-scrubber-track" onClick={handleScrubberClick}>
                <div
                  className="vlecture-scrubber-progress"
                  style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                />
                {/* Scene Ticks */}
                {scenes.map((s, idx) => (
                  <div
                    key={idx}
                    className={`vscene-tick ${idx === currentSceneIndex ? "active" : ""}`}
                    style={{ left: `${(s.startTime / totalDuration) * 100}%` }}
                    title={`Scene ${idx + 1}: ${s.title}`}
                  />
                ))}
              </div>

              {/* Video Controls Bar */}
              <div className="vlecture-controls-bar">
                
                {/* Left Controls */}
                <div className="vcontrols-left">
                  {/* Prev Scene */}
                  <button
                    className="vctrl-btn"
                    onClick={() => goToScene(currentSceneIndex - 1)}
                    disabled={currentSceneIndex === 0}
                    title="Previous Scene"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="19 20 9 12 19 4 19 20" />
                      <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>

                  {/* Play / Pause */}
                  <button className="vctrl-play-btn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>

                  {/* Next Scene */}
                  <button
                    className="vctrl-btn"
                    onClick={() => goToScene(currentSceneIndex + 1)}
                    disabled={currentSceneIndex === scenes.length - 1}
                    title="Next Scene"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 4 15 12 5 20 5 4" />
                      <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>

                  {/* Time Display */}
                  <span className="vcontrols-time">
                    {formatSeconds(currentTime)} / {formatSeconds(totalDuration)}
                  </span>
                </div>

                {/* Right Controls */}
                <div className="vcontrols-right">
                  {/* Speed buttons */}
                  <div className="vspeed-selector">
                    {[1, 1.25, 1.5].map((spd) => (
                      <button
                        key={spd}
                        className={`vspeed-btn ${playbackSpeed === spd ? "active" : ""}`}
                        onClick={() => changeSpeed(spd)}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Fullscreen */}
                  <button className="vctrl-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                </div>

              </div>

            </div>

            {/* Ask AI Tutor about current scene */}
            <div className="vlecture-tutor-box">
              <div className="vtutor-header">
                <strong>Ask AI Tutor about this Scene</strong>
                <span>Scene {currentSceneIndex + 1}: {currentScene.title}</span>
              </div>

              {/* Quick Chips */}
              <div className="vtutor-chips">
                <button
                  type="button"
                  className="vtutor-chip"
                  onClick={() => handleAskTutor(`Explain ${currentScene.title} in simpler terms for a beginner.`)}
                >
                  Explain in simpler terms
                </button>
                <button
                  type="button"
                  className="vtutor-chip"
                  onClick={() => handleAskTutor(`Give a real-world software engineering example of ${currentScene.title}.`)}
                >
                  Give a real-world example
                </button>
                <button
                  type="button"
                  className="vtutor-chip"
                  onClick={() => handleAskTutor(`What is the most common exam question asked on ${currentScene.title}?`)}
                >
                  Common exam question
                </button>
              </div>

              <div className="vtutor-input-row">
                <input
                  type="text"
                  placeholder="Ask any question about this lecture scene..."
                  value={tutorQuestion}
                  onChange={(e) => setTutorQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskTutor()}
                  className="vtutor-input"
                />
                <button
                  type="button"
                  onClick={() => handleAskTutor()}
                  disabled={tutorLoading || !tutorQuestion.trim()}
                  className="vtutor-send-btn"
                >
                  {tutorLoading ? "Thinking..." : "Ask"}
                </button>
              </div>

              {tutorAnswer && (
                <div className="vtutor-answer-box">
                  <div className="vtutor-answer-badge">AI Tutor Explanation</div>
                  <p>{tutorAnswer}</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
