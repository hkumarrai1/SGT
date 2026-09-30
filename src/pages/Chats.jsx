import { useEffect, useState } from "react";
import { useAuth } from "../store";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { API_URL } from "../config";
import "./Chats.css";
import "./Dashboard.css";

function Chats() {
  const { token, isAuthenticated, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=login");
      return;
    }

    async function loadChats() {
      try {
        const res = await fetch(`${API_URL}/api/matches/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load chats.");
        setConversations(data.conversations || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadChats();
    const interval = setInterval(loadChats, 3500);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  if (!isAuthenticated) return null;

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = (c.isRevealed ? c.partner?.fullName : c.partner?.alias || c.partner?.firstName || "")
      .toLowerCase();
    const college = (c.partner?.college || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || college.includes(q);
  });

  return (
    <main className="chats-page">
      <Background />

      {/* Navigation */}
      <header className="dashboard-nav">
        <a className="dashboard-brand" href="/" aria-label="SGT Home">
          <img src="/images/logo.png" alt="SGT - Souls Gather Together" />
        </a>

        <nav className="dashboard-nav-links" aria-label="Chats navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="/match">Match Engine</a>
          <a href="/chats" style={{ color: "#f4c66c", fontWeight: 700 }}>
            💬 Chats
          </a>
          <a href="/payment">Dandiya Plan</a>
        </nav>

        <div className="dashboard-nav-user">
          <a
            href="/dashboard"
            className="dashboard-back-btn"
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

      <div className="chats-shell">
        <div className="chats-header">
          <div className="chats-header-left">
            <div className="dashboard-kicker">
              <span>PRIVATE DANDIYA INBOX</span>
              <i aria-hidden="true" />
            </div>
            <h1>
              Your <em>Conversations.</em>
            </h1>
            <p className="chats-header-subtitle">
              Private, anonymous 1-on-1 chats with compatible campus partners.
            </p>
          </div>

          <a href="/match" className="chats-find-partner-btn">
            <span>✨ Find New Partner</span>
            <span>→</span>
          </a>
        </div>

        {/* Search Bar */}
        {conversations.length > 0 && (
          <div className="chats-search-bar">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search by alias, college, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", minHeight: "16rem" }}>
            <Loader label="Opening your conversations..." />
          </div>
        ) : error ? (
          <p className="auth-status auth-status--error">{error}</p>
        ) : filteredConversations.length === 0 ? (
          <div className="chats-empty">
            <div className="chats-empty-icon">💬</div>
            <h3>No Active Chats Yet</h3>
            <p>
              You haven&apos;t matched with a Dandiya connection yet. Step into the Matchmaking Engine to discover compatible students on your campus!
            </p>
            <a href="/match" className="chats-find-partner-btn" style={{ display: "inline-flex" }}>
              Launch Match Engine →
            </a>
          </div>
        ) : (
          <div className="chats-list">
            {filteredConversations.map((conv) => {
              const p = conv.partner || {};
              const displayName = conv.isRevealed
                ? p.fullName
                : p.alias || `${p.firstName} (Anonymous)`;
              const initials = p.initials || "SGT";
              const lastMsgText = conv.lastMessage
                ? `${conv.lastMessage.isMine ? "You: " : ""}${conv.lastMessage.text}`
                : "No messages yet. Send an icebreaker!";
              const timeStr = conv.lastMessage
                ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <a
                  key={conv.matchId}
                  href={`/chat/${conv.matchId}`}
                  className={`chats-card ${conv.isActive ? "is-active-match" : ""}`}
                >
                  <div className="chats-card-left">
                    <div className="chats-avatar-wrap">
                      {conv.isRevealed && p.profilePhoto ? (
                        <img
                          src={p.profilePhoto}
                          alt={displayName}
                          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                      {conv.isActive && <span className="chats-avatar-online" />}
                    </div>

                    <div className="chats-card-body">
                      <div className="chats-card-top-row">
                        <span className="chats-partner-name">{displayName}</span>
                        <span className="chats-score-pill">
                          {conv.compatibilityScore}% Match
                        </span>
                        {conv.isActive && (
                          <span className="chats-active-tag">Active</span>
                        )}
                        {conv.isRevealed && (
                          <span
                            style={{
                              background: "rgba(74, 222, 128, 0.15)",
                              color: "#4ade80",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "999px",
                            }}
                          >
                            Revealed ✓
                          </span>
                        )}
                      </div>

                      <div className="chats-card-meta">
                        <span>🏛️ {p.college}</span>
                        {p.course && <span>🎓 {p.course}</span>}
                      </div>

                      <p
                        className={`chats-card-last-msg ${
                          !conv.lastMessage ? "is-empty" : ""
                        }`}
                      >
                        {lastMsgText}
                      </p>
                    </div>
                  </div>

                  <div className="chats-card-right">
                    {timeStr && <span className="chats-time">{timeStr}</span>}
                    {conv.unreadCount > 0 && (
                      <span className="chats-unread-badge">
                        {conv.unreadCount} new
                      </span>
                    )}
                    <span className="chats-arrow">→</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default Chats;
