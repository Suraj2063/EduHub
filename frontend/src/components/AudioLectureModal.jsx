import { API_URL, API_BASE_URL } from "../config";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken } from "../utils/auth";
import "./AudioLectureModal.css";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const API_BASE = `${API_BASE_URL}`;

function AudioLectureModal({ resource, onClose }) {
  // Step: "select_lang" | "loading" | "ready" | "playing" | "paused" | "done"
  const [step, setStep] = useState("select_lang");
  const [selectedLang, setSelectedLang] = useState("en"); // "en" | "ne"
  const [script, setScript] = useState(null);
  const [currentSegIdx, setCurrentSegIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0); // 0-100
  const [currentTimeStr, setCurrentTimeStr] = useState("0:00");
  const [durationStr, setDurationStr] = useState("0:00");
  const [audioCache, setAudioCache] = useState({}); // { [segIdx]: audioUrl }
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // Q&A / Ask Tutor state
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorAnswer, setTutorAnswer] = useState(null);
  const [tutorAudioUrl, setTutorAudioUrl] = useState(null);
  const [isTutorAsking, setIsTutorAsking] = useState(false);
  const [isTutorAudioPlaying, setIsTutorAudioPlaying] = useState(false);

  const audioRef = useRef(null);
  const tutorAudioRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Cleanup on unmount — hard stop: clear src + load() aborts network fetch
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
      }
      if (tutorAudioRef.current) {
        tutorAudioRef.current.pause();
        tutorAudioRef.current.src = "";
        tutorAudioRef.current.load();
      }
    };
  }, []);

  // Check for existing session lecture on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`eduhub_audio_${resource?._id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.script?.segments?.length > 0) {
          setScript(parsed.script);
          setSelectedLang(parsed.lang || "en");
          setStep("ready");
          fetchSegmentAudio(0, parsed.script.segments[0].text, parsed.lang || "en");
        }
      }
    } catch (_) {}
  }, [resource?._id]);

  // Generate Lecture Script
  const handleStartGeneration = async (langToUse = selectedLang) => {
    setStep("loading");
    setSelectedLang(langToUse);
    try {
      const res = await axios.post(
        `${API_BASE}/api/audio/generate-script`,
        {
          resourceId: resource._id,
          language: langToUse,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success && res.data.result?.segments?.length > 0) {
        setScript(res.data.result);
        try {
          sessionStorage.setItem(
            `eduhub_audio_${resource?._id}`,
            JSON.stringify({ script: res.data.result, lang: langToUse })
          );
        } catch (_) {}
        setStep("ready");
        setCurrentSegIdx(0);
        setProgress(0);
        // Pre-fetch segment 1 audio
        fetchSegmentAudio(0, res.data.result.segments[0].text, langToUse);
      } else {
        toast.error("Failed to generate lecture script.");
        setStep("select_lang");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate audio lecture.");
      setStep("select_lang");
    }
  };

  // Synthesize segment audio (Piper TTS for EN, Neural for NE)
  const fetchSegmentAudio = async (idx, text, lang = selectedLang) => {
    if (audioCache[idx]) return audioCache[idx];
    try {
      const res = await axios.post(
        `${API_BASE}/api/audio/synthesize`,
        {
          text,
          language: lang,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (res.data.success && res.data.result?.url) {
        // url is a full Cloudinary https:// URL — do NOT prepend API_BASE
        const rawUrl = res.data.result.url;
        const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${API_BASE}${rawUrl}`;
        setAudioCache((prev) => ({ ...prev, [idx]: fullUrl }));
        return fullUrl;
      }
    } catch (err) {
      console.warn(`[TTS] Failed to synthesize segment ${idx}:`, err.message);
    }
    return null;
  };

  // Play a specific segment
  const playSegment = useCallback(
    async (idx, scriptData = script, speedVal = speed) => {
      if (!scriptData || idx >= scriptData.segments.length) {
        setStep("done");
        setProgress(100);
        return;
      }

      const seg = scriptData.segments[idx];
      setCurrentSegIdx(idx);
      setIsAudioLoading(true);

      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
      }

      let audioUrl = audioCache[idx];
      if (!audioUrl) {
        audioUrl = await fetchSegmentAudio(idx, seg.text, scriptData.language || selectedLang);
      }

      setIsAudioLoading(false);
      if (isCancelledRef.current || !audioUrl) return;

      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.src = audioUrl;
      audio.playbackRate = speedVal;

      audio.onloadedmetadata = () => {
        const dMin = Math.floor(audio.duration / 60);
        const dSec = Math.floor(audio.duration % 60);
        setDurationStr(`${dMin}:${dSec < 10 ? "0" : ""}${dSec}`);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          const pct = (audio.currentTime / audio.duration) * 100;
          setProgress(pct);
          const cMin = Math.floor(audio.currentTime / 60);
          const cSec = Math.floor(audio.currentTime % 60);
          setCurrentTimeStr(`${cMin}:${cSec < 10 ? "0" : ""}${cSec}`);
        }
      };

      audio.onended = () => {
        setProgress(100);
        const nextIdx = idx + 1;
        if (nextIdx < scriptData.segments.length) {
          setTimeout(() => playSegment(nextIdx, scriptData, speedVal), 400);
        } else {
          setStep("done");
        }
      };

      try {
        await audio.play();
        setStep("playing");
      } catch (err) {
        console.warn("Audio play prevented:", err.message);
      }

      // Pre-synthesize next segment in background
      if (idx + 1 < scriptData.segments.length) {
        fetchSegmentAudio(idx + 1, scriptData.segments[idx + 1].text, scriptData.language || selectedLang);
      }
    },
    [audioCache, script, speed, selectedLang]
  );

  const handlePlay = () => {
    isCancelledRef.current = false;
    playSegment(currentSegIdx, script, speed);
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setStep("paused");
  };

  const handleResume = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setStep("playing");
    } else {
      playSegment(currentSegIdx, script, speed);
    }
  };

  const handleSkipToSegment = (idx) => {
    isCancelledRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentSegIdx(idx);
    setProgress(0);
    playSegment(idx, script, speed);
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleRestart = () => {
    isCancelledRef.current = false;
    setCurrentSegIdx(0);
    setProgress(0);
    playSegment(0, script, speed);
  };

  const handleStop = () => {
    isCancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setStep("ready");
    setCurrentSegIdx(0);
    setProgress(0);
  };

  const handleClose = () => {
    isCancelledRef.current = true;
    // Hard stop both audio elements — clear src & load() aborts any ongoing stream
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }
    if (tutorAudioRef.current) {
      tutorAudioRef.current.pause();
      tutorAudioRef.current.src = "";
      tutorAudioRef.current.load();
    }
    onClose();
  };

  // Submit Question to AI Tutor for this Topic
  const handleAskTutor = async (customQ) => {
    const q = customQ || tutorQuestion;
    if (!q || !q.trim()) return;

    setIsTutorAsking(true);
    setTutorAnswer(null);
    setTutorAudioUrl(null);
    setIsTutorAudioPlaying(false);

    try {
      const activeSeg = script?.segments?.[currentSegIdx];
      const res = await axios.post(
        `${API_BASE}/api/audio/ask-tutor`,
        {
          resourceId: resource._id,
          segmentLabel: activeSeg?.label || "General Topic",
          segmentText: activeSeg?.text || "",
          question: q.trim(),
          language: script?.language || selectedLang,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success && res.data.result) {
        setTutorAnswer(res.data.result.answer);
        if (res.data.result.audioUrl) {
          const rawTutorUrl = res.data.result.audioUrl;
          setTutorAudioUrl(rawTutorUrl.startsWith("http") ? rawTutorUrl : `${API_BASE}${rawTutorUrl}`);
        }
      } else {
        toast.error("Tutor could not answer. Please try again.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to contact AI Tutor.");
    } finally {
      setIsTutorAsking(false);
    }
  };

  // Play tutor spoken explanation
  const handlePlayTutorAudio = () => {
    if (!tutorAudioUrl) return;

    if (isTutorAudioPlaying) {
      tutorAudioRef.current?.pause();
      setIsTutorAudioPlaying(false);
      return;
    }

    // Pause lecture audio while tutor speaks
    if (audioRef.current && step === "playing") {
      audioRef.current.pause();
      setStep("paused");
    }

    const tAudio = tutorAudioRef.current || new Audio();
    tutorAudioRef.current = tAudio;
    tAudio.src = tutorAudioUrl;
    tAudio.onended = () => setIsTutorAudioPlaying(false);
    tAudio.play();
    setIsTutorAudioPlaying(true);
  };

  const isPlaying = step === "playing";
  const isPaused = step === "paused";
  const isDone = step === "done";
  const isStarted = isPlaying || isPaused || isDone;

  return (
    <div className="audio-modal-backdrop" onClick={handleClose}>
      <div
        className="audio-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close */}
        <button onClick={handleClose} className="audio-modal-close-btn" aria-label="Close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── STEP 1: SELECT LANGUAGE ── */}
        {step === "select_lang" && (
          <div className="audio-lang-select-view">
            <div className="audio-lang-header">
              <div className="audio-lang-icon-badge">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width="28" height="28">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h1a2 2 0 002-2v-4a2 2 0 00-2-2H4m17 5a3 3 0 01-3 3h-1a2 2 0 01-2-2v-4a2 2 0 012-2h3" />
                </svg>
              </div>
              <h2 className="audio-lang-title">Choose Lecture Language</h2>
              <p className="audio-lang-subtitle">
                Select your preferred voice language for the AI tutor lecture breakdown.
              </p>
            </div>

            <div className="audio-lang-options-grid">
              {/* Option A: English */}
              <button
                type="button"
                className={`audio-lang-card ${selectedLang === "en" ? "selected" : ""}`}
                onClick={() => setSelectedLang("en")}
              >
                <div className="audio-lang-badge en-badge">EN</div>
                <div className="audio-lang-card-content">
                  <span className="audio-lang-name">English Lecture</span>
                  <span className="audio-lang-desc">Clear, conversational spoken explanation in English</span>
                </div>
                <div className="audio-lang-radio">
                  {selectedLang === "en" && <div className="audio-lang-radio-dot" />}
                </div>
              </button>

              {/* Option B: Nepali */}
              <button
                type="button"
                className={`audio-lang-card ${selectedLang === "ne" ? "selected" : ""}`}
                onClick={() => setSelectedLang("ne")}
              >
                <div className="audio-lang-badge ne-badge">ने</div>
                <div className="audio-lang-card-content">
                  <span className="audio-lang-name">नेपाली लेक्चर (Nepali)</span>
                  <span className="audio-lang-desc">शुद्ध नेपाली व्याख्या र स्पष्ट आवाज</span>
                </div>
                <div className="audio-lang-radio">
                  {selectedLang === "ne" && <div className="audio-lang-radio-dot" />}
                </div>
              </button>
            </div>

            <div className="audio-lang-footer">
              <button
                className="btn-start-audio-generation"
                onClick={() => handleStartGeneration(selectedLang)}
              >
                Generate {selectedLang === "ne" ? "नेपाली" : "English"} Lecture
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: LOADING STATE ── */}
        {step === "loading" && (
          <div className="audio-loading-state">
            <div className="audio-loading-spinner" />
            <p className="audio-loading-text">
              {selectedLang === "ne"
                ? "नेपाली अडियो लेक्चर तयार हुँदैछ..."
                : "Synthesizing your lecture breakdown..."}
            </p>
            <p className="audio-loading-sub">
              {selectedLang === "ne"
                ? "अध्ययन सामग्रीको पूर्ण विवरणबाट ६ खण्डको नेपाली लेक्चर तयार हुँदैछ।"
                : "Analyzing notes and building your full conversational lecture breakdown..."}
            </p>
          </div>
        )}

        {/* ── STEP 3: AUDIO PLAYER & TOPIC SECTIONS ── */}
        {step !== "loading" && step !== "select_lang" && script && (
          <>
            {/* Header */}
            <div className="audio-player-header">
              <div className="audio-player-icon-wrap">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h1a2 2 0 002-2v-4a2 2 0 00-2-2H4m17 5a3 3 0 01-3 3h-1a2 2 0 01-2-2v-4a2 2 0 012-2h3" />
                </svg>
              </div>
              <div className="audio-header-text">
                <h2 className="audio-player-title">{script.title}</h2>
                <div className="audio-header-tags">
                  <span className="audio-player-subject-pill">{script.subject}</span>
                  <span className="audio-lang-indicator-pill">
                    {script.language === "ne" ? "नेपाली (Nepali)" : "English"}
                  </span>
                </div>
              </div>
            </div>

            {/* Now Playing Banner */}
            <div className="audio-now-playing-card">
              <div className="audio-waveform">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`audio-waveform-bar ${isPlaying ? "animating" : ""}`}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="audio-now-playing-info">
                <span className="audio-now-playing-label">
                  {isDone
                    ? "Lecture Complete"
                    : isStarted
                    ? `Section ${currentSegIdx + 1} of ${script.segments.length}`
                    : "Ready to Play"}
                </span>
                <p className="audio-now-playing-segment">
                  {isDone
                    ? "You've finished the full lecture!"
                    : script.segments[currentSegIdx]?.label}
                </p>
              </div>
              <div className="audio-time-meta">
                <span className="audio-current-time-display">
                  {isStarted && !isDone ? `${currentTimeStr} / ${durationStr}` : script.totalDuration}
                </span>
              </div>
            </div>

            {/* Segment Progress Bar */}
            {isStarted && !isDone && (
              <div className="audio-seg-progress-track">
                <div className="audio-seg-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}

            {/* Main Controls Row */}
            <div className="audio-controls-row">
              <button
                className="audio-ctrl-btn"
                onClick={handleStop}
                disabled={!isStarted}
                title="Stop"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>

              {/* Prev section */}
              <button
                className="audio-ctrl-btn"
                onClick={() => handleSkipToSegment(Math.max(0, currentSegIdx - 1))}
                disabled={!isStarted || currentSegIdx === 0}
                title="Previous section"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Play / Pause / Loading / Resume */}
              {!isStarted && !isDone && (
                <button className="audio-play-btn" onClick={handlePlay} title="Play">
                  {isAudioLoading ? (
                    <div className="mini-audio-spinner" />
                  ) : (
                    <svg fill="currentColor" viewBox="0 0 24 24" width="26" height="26">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}
              {isPlaying && (
                <button className="audio-play-btn" onClick={handlePause} title="Pause">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="26" height="26">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </button>
              )}
              {isPaused && (
                <button className="audio-play-btn" onClick={handleResume} title="Resume">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="26" height="26">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}
              {isDone && (
                <button className="audio-play-btn btn-restart" onClick={handleRestart} title="Restart">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}

              {/* Next section */}
              <button
                className="audio-ctrl-btn"
                onClick={() => handleSkipToSegment(Math.min(script.segments.length - 1, currentSegIdx + 1))}
                disabled={!isStarted || currentSegIdx >= script.segments.length - 1}
                title="Next section"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Speed Selector */}
              <div className="audio-speed-selector">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    className={`audio-speed-btn ${speed === s ? "active" : ""}`}
                    onClick={() => handleSpeedChange(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* ── ASK TUTOR ON THIS TOPIC ACTION BAR ── */}
            <div className="audio-ask-tutor-banner">
              <div className="audio-ask-tutor-left">
                <span className="audio-ask-tutor-badge">Topic Deep-Dive</span>
                <span className="audio-ask-tutor-prompt">
                  Have questions about <strong>{script.segments[currentSegIdx]?.label}</strong>?
                </span>
              </div>
              <button
                type="button"
                className="btn-open-tutor"
                onClick={() => {
                  setShowTutorModal(true);
                  setTutorAnswer(null);
                  setTutorAudioUrl(null);
                }}
              >
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Ask Tutor
              </button>
            </div>

            {/* Segment Track List */}
            <div className="audio-segments-list">
              <p className="audio-segments-heading">Lecture Sections</p>
              {script.segments.map((seg, idx) => {
                const isActive = idx === currentSegIdx && isStarted;
                const isDoneSegment = isDone || idx < currentSegIdx;
                return (
                  <button
                    key={seg.id}
                    className={`audio-segment-row ${isActive ? "active" : ""} ${isDoneSegment ? "done" : ""}`}
                    onClick={() => handleSkipToSegment(idx)}
                  >
                    <div className="audio-seg-number">
                      {isDoneSegment ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="audio-seg-info">
                      <span className="audio-seg-label">{seg.label}</span>
                      <span className="audio-seg-preview">{seg.text.slice(0, 95)}…</span>
                    </div>
                    {isActive && isPlaying && (
                      <div className="audio-seg-playing-indicator">
                        <span /><span /><span />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── DEDICATED REGENERATE ACTION CARD ── */}
            <div className="audio-regenerate-card">
              <div className="audio-regenerate-text">
                <span className="audio-regenerate-title">Want a different explanation?</span>
                <span className="audio-regenerate-desc">Generate fresh lecture or switch language.</span>
              </div>
              <button
                type="button"
                className="btn-regenerate-lecture-cta"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setStep("select_lang");
                }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generate New Lecture
              </button>
            </div>
          </>
        )}

        {/* ── TUTOR Q&A DRAWER MODAL ── */}
        {showTutorModal && (
          <div className="tutor-drawer-overlay">
            <div className="tutor-drawer-card">
              <div className="tutor-drawer-header">
                <div>
                  <span className="tutor-drawer-topic-tag">
                    TOPIC: {script?.segments?.[currentSegIdx]?.label}
                  </span>
                  <h3 className="tutor-drawer-title">Ask AI Tutor for More Detail</h3>
                </div>
                <button
                  className="tutor-drawer-close"
                  onClick={() => {
                    // Hard stop tutor audio before closing the drawer
                    if (tutorAudioRef.current) {
                      tutorAudioRef.current.pause();
                      tutorAudioRef.current.src = "";
                      tutorAudioRef.current.load();
                    }
                    setIsTutorAudioPlaying(false);
                    setShowTutorModal(false);
                  }}
                  aria-label="Close tutor"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Quick suggestion chips */}
              <div className="tutor-chips-row">
                <button
                  type="button"
                  className="tutor-chip"
                  onClick={() => {
                    const q = "Can you explain this topic with a clear code / practical example?";
                    setTutorQuestion(q);
                    handleAskTutor(q);
                  }}
                >
                  Give a code example
                </button>
                <button
                  type="button"
                  className="tutor-chip"
                  onClick={() => {
                    const q = "Can you simplify this concept in plain beginner-friendly terms?";
                    setTutorQuestion(q);
                    handleAskTutor(q);
                  }}
                >
                  Explain in simpler terms
                </button>
                <button
                  type="button"
                  className="tutor-chip"
                  onClick={() => {
                    const q = "What are the common exam pitfalls or trick questions on this concept?";
                    setTutorQuestion(q);
                    handleAskTutor(q);
                  }}
                >
                  Common exam traps
                </button>
              </div>

              {/* Question input */}
              <div className="tutor-input-box">
                <textarea
                  className="tutor-textarea"
                  rows={3}
                  placeholder={`Ask anything about ${script?.segments?.[currentSegIdx]?.label || "this topic"}...`}
                  value={tutorQuestion}
                  onChange={(e) => setTutorQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAskTutor();
                    }
                  }}
                />
                <button
                  className="btn-tutor-send"
                  disabled={isTutorAsking || !tutorQuestion.trim()}
                  onClick={() => handleAskTutor()}
                >
                  {isTutorAsking ? "Analyzing..." : "Ask Question"}
                </button>
              </div>

              {/* Tutor response */}
              {isTutorAsking && (
                <div className="tutor-answering-loader">
                  <div className="mini-audio-spinner" />
                  <span>The professor is reviewing the notes and formulating a detailed breakdown...</span>
                </div>
              )}

              {tutorAnswer && (
                <div className="tutor-answer-box">
                  <div className="tutor-answer-header">
                    <span className="tutor-badge-prof">Professor's Explanation</span>
                    {tutorAudioUrl && (
                      <button
                        className="btn-tutor-audio"
                        onClick={handlePlayTutorAudio}
                      >
                        {isTutorAudioPlaying ? (
                          <>
                            <svg fill="currentColor" viewBox="0 0 24 24" width="14" height="14">
                              <rect x="6" y="6" width="12" height="12" rx="2" />
                            </svg>
                            <span>Pause Voice</span>
                          </>
                        ) : (
                          <>
                            <svg fill="currentColor" viewBox="0 0 24 24" width="14" height="14">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            <span>Listen to Answer</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="tutor-answer-text">{tutorAnswer}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudioLectureModal;
