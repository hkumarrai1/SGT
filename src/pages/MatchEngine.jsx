import { useEffect, useState } from "react";
import { useAuth } from "../store";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { API_URL } from "../config";
import "./MatchEngine.css";
import "./Dashboard.css";

const SCAN_MESSAGES = [
  "Harmonizing campus energy vectors...",
  "Evaluating Dandiya dance rhythm alignment...",
  "Synthesizing shared interests & music taste...",
  "Forming your private anonymous connection...",
];

function MatchEngine() {
  const { token, isAuthenticated, logout } = useAuth();
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchSession, setMatchSession] = useState({ status: "IDLE", attempt: 1 });
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isMatching, setIsMatching] = useState(false);
  const [scannerStep, setScannerStep] = useState(0);
  const [matchAlert, setMatchAlert] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=login");
      return;
    }

    async function loadMatchData() {
      try {
        const [matchRes, sessionRes] = await Promise.all([
          fetch(`${API_URL}/api/matches/current`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/matches/session`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (matchRes.ok) {
          const matchData = await matchRes.json();
          if (matchData.match) setActiveMatch(matchData.match);
        }

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.session) {
            setMatchSession(sessionData.session);
            if (sessionData.session.cooldownSeconds > 0) {
              setCooldownSeconds(sessionData.session.cooldownSeconds);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load match engine:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMatchData();
  }, [isAuthenticated, token]);

  // Live 60-second Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setMatchSession((s) => ({ ...s, status: "IDLE" }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Radar scanner cycling
  useEffect(() => {
    if (!isMatching) return;
    const stepInterval = setInterval(() => {
      setScannerStep((prev) => (prev + 1) % SCAN_MESSAGES.length);
    }, 900);
    return () => clearInterval(stepInterval);
  }, [isMatching]);

  const handleStartMatchmaking = async () => {
    if (cooldownSeconds > 0 || isMatching) return;
    setIsMatching(true);
    setScannerStep(0);
    setMatchAlert({ type: "", message: "" });

    try {
      const response = await fetch(`${API_URL}/api/matches/find`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      setTimeout(() => {
        setIsMatching(false);
        if (!response.ok) {
          setMatchAlert({
            type: "error",
            message: data.message || "Matchmaking unavailable at the moment.",
          });
          return;
        }

        if (data.status === "MATCHED" && data.match) {
          setActiveMatch(data.match);
          setMatchSession({ status: "MATCHED", attempt: 1 });
          setMatchAlert({
            type: "success",
            message: "A compatible Dandiya connection has been discovered!",
          });
        } else if (data.status === "WAITING_RETRY") {
          setCooldownSeconds(data.cooldownSeconds || 60);
          setMatchSession({
            status: "WAITING_RETRY",
            attempt: data.attempt || 1,
          });
          setMatchAlert({
            type: "info",
            message:
              data.message ||
              "Campus pool is synchronizing. New profiles are being analyzed.",
          });
        }
      }, 2500);
    } catch (err) {
      setIsMatching(false);
      setMatchAlert({ type: "error", message: err.message || "Connection failed." });
    }
  };

  const handleDeclineMatch = async (matchId) => {
    if (!matchId) return;
    try {
      const res = await fetch(`${API_URL}/api/matches/${matchId}/decline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to decline match.");

      setActiveMatch(null);
      setMatchSession({ status: "IDLE", attempt: 1 });
      setMatchAlert({
        type: "info",
        message: "Match released. You can now discover another campus connection.",
      });
    } catch (err) {
      setMatchAlert({ type: "error", message: err.message });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <main className="match-engine-page">
      <Background />

      {/* Navigation */}
      <header className="dashboard-nav">
        <a className="dashboard-brand" href="/" aria-label="SGT Home">
          <img src="/images/logo.png" alt="SGT - Souls Gather Together" />
        </a>

        <nav className="dashboard-nav-links" aria-label="Match navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="/match" style={{ color: "#f4c66c", fontWeight: 700 }}>
            Match Engine
          </a>
          <a href="/chats">💬 Chats</a>
          <a href="/payment">Dandiya Plan</a>
        </nav>

        <div className="dashboard-nav-user">
          <a
            href="/dashboard"
            style={{
              color: "#f4c66c",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 700,
              padding: "0.4rem 0.8rem",
              border: "1px solid rgba(244, 198, 108, 0.3)",
              borderRadius: "999px",
            }}
          >
            ← Dashboard
          </a>
          <button className="dashboard-logout-btn" type="button" onClick={logout}>
            Log Out
          </button>
        </div>
      </header>

      <div className="match-engine-shell">
        <div className="match-engine-header">
          <div className="dashboard-kicker">
            <span>CAMPUS HARMONY ENGINE</span>
            <i aria-hidden="true" />
          </div>
          <h1>
            Discover Your <em>Connection.</em>
          </h1>
          <p>
            Private, trait-analyzed matchmaking pairing you with compatible campus students for Dandiya Night.
          </p>
        </div>

        {/* Status Alerts */}
        {matchAlert.message && (
          <div
            className={`dashboard-match-alert dashboard-match-alert--${matchAlert.type}`}
            role="alert"
            style={{ marginBottom: "1.5rem" }}
          >
            <span>
              {matchAlert.type === "success"
                ? "✨"
                : matchAlert.type === "error"
                  ? "⚠️"
                  : "⏳"}
            </span>
            <p>{matchAlert.message}</p>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", minHeight: "18rem" }}>
            <Loader label="Synchronizing Campus Match Engine..." />
          </div>
        ) : activeMatch ? (
          /* ACTIVE MATCH CARD */
          <div className="dashboard-matched-box">
            <div className="dashboard-matched-badge-row">
              <div>
                <div className="dashboard-kicker">
                  <span>ACTIVE CAMPUS CONNECTION</span>
                  <i aria-hidden="true" />
                </div>
                <h3
                  style={{
                    margin: "0.4rem 0 0",
                    fontFamily: "Playfair Display, Georgia, serif",
                    fontSize: "1.8rem",
                  }}
                >
                  {activeMatch.synthesis?.matchHeadline || "Your Dandiya Connection"}
                </h3>
              </div>

              <div className="dashboard-match-score-badge">
                <span>✨</span>
                <strong>{activeMatch.compatibilityScore}% Compatibility</strong>
              </div>
            </div>

            {/* Partner Anonymous Profile */}
            <div className="dashboard-match-partner-row">
              <div className="dashboard-match-avatar">
                {activeMatch.partner?.initials || "SGT"}
              </div>
              <div className="dashboard-match-partner-info">
                <h4>
                  {activeMatch.isRevealed
                    ? activeMatch.partner?.fullName
                    : activeMatch.partner?.alias || `${activeMatch.partner?.firstName} (Anonymous)`}
                </h4>
                <div className="dashboard-match-partner-meta">
                  <span>🏛️ {activeMatch.partner?.college}</span>
                  <span>·</span>
                  <span>
                    🎓 {activeMatch.partner?.course}{" "}
                    {activeMatch.partner?.academicYear
                      ? `(Yr ${activeMatch.partner.academicYear})`
                      : ""}
                  </span>
                </div>
                {activeMatch.partner?.tags?.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      flexWrap: "wrap",
                      marginTop: "0.5rem",
                    }}
                  >
                    {activeMatch.partner.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          background: "rgba(244, 198, 108, 0.12)",
                          border: "1px solid rgba(244, 198, 108, 0.3)",
                          color: "#f4c66c",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.65rem",
                          borderRadius: "999px",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Synthesis Details */}
            <div className="dashboard-synthesis-grid">
              <div className="dashboard-synthesis-card">
                <span className="dashboard-synthesis-label">
                  💫 WHY YOU CONNECT
                </span>
                <p className="dashboard-synthesis-text">
                  {activeMatch.synthesis?.connectionNarrative ||
                    "Complementary connection style and mutual first interaction preferences."}
                </p>
              </div>

              <div className="dashboard-synthesis-card">
                <span className="dashboard-synthesis-label">
                  🪩 DANDIYA VIBE HARMONY
                </span>
                <p className="dashboard-synthesis-text">
                  {activeMatch.synthesis?.sharedVibe ||
                    "Shared event rhythm and campus energy."}
                </p>
              </div>

              <div
                className="dashboard-synthesis-card"
                style={{ gridColumn: "1 / -1" }}
              >
                <span className="dashboard-synthesis-label">
                  💬 SUGGESTED FIRST ICEBREAKER
                </span>
                <p
                  className="dashboard-synthesis-text"
                  style={{ fontStyle: "italic", color: "#f4c66c" }}
                >
                  &ldquo;
                  {activeMatch.synthesis?.icebreakerPrompt ||
                    "Say hi and ask what their favorite Dandiya song is!"}
                  &rdquo;
                </p>
              </div>
            </div>

            {/* Match Actions */}
            <div className="dashboard-match-actions">
              <button
                type="button"
                className="dashboard-chat-btn"
                onClick={() => window.location.assign(`/chat/${activeMatch.matchId}`)}
              >
                <span>💬</span>{" "}
                {activeMatch.isRevealed
                  ? "Open Chat (Profile Revealed ✓)"
                  : "Start Anonymous Chat →"}
              </button>

              <button
                type="button"
                className="dashboard-decline-btn"
                onClick={() => handleDeclineMatch(activeMatch.matchId)}
              >
                Decline &amp; Find New Partner ✕
              </button>
            </div>
          </div>
        ) : isMatching ? (
          /* SCANNING RADAR STATE */
          <div className="dashboard-scanner-box">
            <div className="dashboard-scanner-radar">
              <span className="dashboard-scanner-core">⚡</span>
            </div>

            <div className="dashboard-kicker">
              <span>CAMPUS RHYTHM SCANNER</span>
              <i aria-hidden="true" />
            </div>

            <h3
              style={{
                margin: 0,
                fontFamily: "Playfair Display, Georgia, serif",
                fontSize: "1.8rem",
              }}
            >
              Scanning <em>Campus Energy...</em>
            </h3>
            <p className="dashboard-scanner-sub">
              {SCAN_MESSAGES[scannerStep]}
            </p>
          </div>
        ) : (
          /* IDLE / READY TO SCAN */
          <div className="dashboard-idle-box">
            <div className="dashboard-idle-icon">🪩</div>

            <div className="dashboard-kicker">
              <span>CAMPUS HARMONY ENGINE</span>
              <i aria-hidden="true" />
            </div>

            <h3 className="dashboard-idle-title">
              Ready to find your <em>Dandiya connection?</em>
            </h3>

            <p className="dashboard-idle-sub">
              Pair with someone based on your questionnaire responses, music taste, and energy preferences.
            </p>

            <button
              type="button"
              className="dashboard-find-btn"
              disabled={isMatching || cooldownSeconds > 0}
              onClick={handleStartMatchmaking}
            >
              <span>
                {cooldownSeconds > 0
                  ? `Next Discovery Available in ${cooldownSeconds}s`
                  : "✨ Find My Dandiya Partner"}
              </span>
              {cooldownSeconds <= 0 && <span aria-hidden="true">→</span>}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default MatchEngine;
