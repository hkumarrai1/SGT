import { useEffect, useState, useRef } from "react";
import { useAuth } from "../store";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import "./Chat.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Chat() {
  const { token, isAuthenticated } = useAuth();
  const [matchId, setMatchId] = useState(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length >= 2 && parts[0] === "chat" ? parts[1] : null;
  });

  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusAlert, setStatusAlert] = useState({ type: "", message: "" });
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Initial Load: Fetch active match if matchId is not in URL
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=login");
      return;
    }

    async function resolveMatch() {
      try {
        if (!matchId) {
          const res = await fetch(`${API_URL}/api/matches/current`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok || !data.match) {
            window.location.assign("/dashboard");
            return;
          }
          setMatchId(data.match.matchId);
        }
      } catch (err) {
        console.error("Match resolution failed:", err);
        setStatusAlert({ type: "error", message: "Failed to connect to chat." });
      }
    }

    resolveMatch();
  }, [isAuthenticated, token, matchId]);

  // 2. Poll messages & conversation status
  useEffect(() => {
    if (!token || !matchId) return;

    let isSubscribed = true;

    async function fetchConversation(isInitial = false) {
      try {
        const res = await fetch(`${API_URL}/api/matches/${matchId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!isSubscribed) return;

        if (!res.ok) {
          if (res.status === 404) {
            window.location.assign("/dashboard");
            return;
          }
          throw new Error(data.message || "Failed to load chat.");
        }

        setChatData(data);
        setMessages(data.messages || []);

        // Trigger celebration modal once if newly revealed
        if (data.isRevealed && !hasCelebrated) {
          setShowCelebrationModal(true);
          setHasCelebrated(true);
        }

        if (isInitial) {
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        if (isInitial) {
          setStatusAlert({ type: "error", message: err.message });
        }
      } finally {
        if (isInitial) setIsLoading(false);
      }
    }

    fetchConversation(true);

    pollTimerRef.current = setInterval(() => {
      fetchConversation(false);
    }, 2500);

    return () => {
      isSubscribed = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [token, matchId, hasCelebrated]);

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending || !matchId) return;

    setIsSending(true);
    setInputText("");

    // Optimistic message append
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      isMine: true,
      text: cleanText,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch(`${API_URL}/api/matches/${matchId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send message.");

      // Replace optimistic message with actual
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m)),
      );
    } catch (err) {
      setStatusAlert({ type: "error", message: err.message });
      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(cleanText);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Request Profile Reveal
  const handleRequestReveal = async () => {
    try {
      const res = await fetch(`${API_URL}/api/matches/${matchId}/reveal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to request reveal.");

      setChatData(data);
      setShowRevealModal(false);

      if (data.isRevealed) {
        setShowCelebrationModal(true);
        setHasCelebrated(true);
      } else {
        setStatusAlert({
          type: "success",
          message: "Profile reveal requested! Waiting for your match to also accept.",
        });
      }
    } catch (err) {
      setStatusAlert({ type: "error", message: err.message });
    }
  };

  // Unmatch / End Match
  const handleUnmatch = async () => {
    try {
      const res = await fetch(`${API_URL}/api/matches/${matchId}/unmatch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to end match.");

      window.location.assign("/dashboard");
    } catch (err) {
      setStatusAlert({ type: "error", message: err.message });
    }
  };

  const handleUseIcebreaker = () => {
    if (chatData?.synthesis?.icebreakerPrompt) {
      setInputText(chatData.synthesis.icebreakerPrompt);
      inputRef.current?.focus();
    }
  };

  if (isLoading) {
    return (
      <main className="chat-page" style={{ display: "grid", placeItems: "center" }}>
        <Background />
        <Loader label="Opening secure anonymous chat room..." />
      </main>
    );
  }

  const partner = chatData?.partner || {};
  const isRevealed = Boolean(chatData?.isRevealed);
  const myRevealed = Boolean(chatData?.myRevealed);
  const partnerRevealed = Boolean(chatData?.partnerRevealed);

  return (
    <main className="chat-page">
      <Background />

      <div className="chat-container">
        {/* TOP HEADER */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              type="button"
              className="chat-back-btn"
              onClick={() => window.location.assign("/dashboard")}
              title="Return to Dashboard"
            >
              ← Dashboard
            </button>

            <div className="chat-avatar-wrap">
              {isRevealed && partner.profilePhoto ? (
                <img
                  src={partner.profilePhoto}
                  alt={partner.fullName || "Match"}
                  className="chat-avatar"
                />
              ) : (
                <div className="chat-avatar">
                  {partner.initials || "SGT"}
                </div>
              )}
              <span className="chat-online-dot" title="Active Match Session" />
            </div>

            <div className="chat-partner-info">
              <div className="chat-partner-title">
                <span>{isRevealed ? partner.fullName : "Anonymous Match"}</span>
                {chatData?.compatibilityScore && (
                  <span className="chat-match-badge">
                    {chatData.compatibilityScore}% Match
                  </span>
                )}
              </div>
              <div className="chat-partner-sub">
                {partner.college} · {partner.course || "Student"} {partner.academicYear ? `(Yr ${partner.academicYear})` : ""}
              </div>
            </div>
          </div>

          <div className="chat-header-actions">
            {isRevealed ? (
              <button
                type="button"
                className="chat-reveal-btn is-revealed"
                onClick={() => setShowCelebrationModal(true)}
              >
                Profile Revealed ✓
              </button>
            ) : myRevealed ? (
              <button
                type="button"
                className="chat-reveal-btn is-requested"
                title="Waiting for match to accept reveal"
              >
                Waiting for Reveal ⏳
              </button>
            ) : (
              <button
                type="button"
                className="chat-reveal-btn"
                onClick={() => setShowRevealModal(true)}
              >
                Reveal Profile 👁️
              </button>
            )}

            <button
              type="button"
              className="chat-more-btn"
              onClick={() => setShowUnmatchModal(true)}
              title="Safety & Match Controls"
            >
              ⋯
            </button>
          </div>
        </header>

        {/* ICEBREAKER BANNER */}
        {chatData?.synthesis?.icebreakerPrompt && (
          <div className="chat-icebreaker-banner">
            <div className="chat-icebreaker-content">
              <span className="chat-icebreaker-icon">✨</span>
              <span>AI Icebreaker: </span>
              <span className="chat-icebreaker-prompt">
                "{chatData.synthesis.icebreakerPrompt}"
              </span>
            </div>
            <button
              type="button"
              className="chat-use-icebreaker-btn"
              onClick={handleUseIcebreaker}
            >
              Use Icebreaker
            </button>
          </div>
        )}

        {/* MESSAGES STREAM */}
        <div className="chat-messages-area">
          {messages.length === 0 ? (
            <div className="chat-empty-hint">
              <div className="chat-empty-icon">💬</div>
              <h4>Say hello to your match!</h4>
              <p>
                Your conversation is 100% private and anonymous. Names and photos stay hidden until both of you choose to reveal.
              </p>
              {chatData?.synthesis?.icebreakerPrompt && (
                <button
                  type="button"
                  className="chat-use-icebreaker-btn"
                  style={{ marginTop: "1rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                  onClick={handleUseIcebreaker}
                >
                  Ask Icebreaker Question 🚀
                </button>
              )}
            </div>
          ) : (
            messages.map((msg) => {
              const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${msg.isMine ? "is-mine" : "is-partner"}`}
                >
                  {!msg.isMine && (
                    <div className="chat-msg-avatar">
                      {partner.initials || "?"}
                    </div>
                  )}
                  <div className="chat-bubble">
                    <div className="chat-bubble-text">{msg.text}</div>
                    <div className="chat-bubble-footer">
                      <span>{timeStr}</span>
                      {msg.isMine && (
                        <span>{msg.isRead ? "✓✓" : "✓"}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM */}
        <div className="chat-input-container">
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <textarea
              ref={inputRef}
              className="chat-textarea"
              placeholder="Send an anonymous message... (Press Enter to send)"
              value={inputText}
              rows={1}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              maxLength={1200}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!inputText.trim() || isSending}
              title="Send Message"
            >
              ↑
            </button>
          </form>
        </div>
      </div>

      {/* MODAL 1: REQUEST REVEAL CONFIRMATION */}
      {showRevealModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowRevealModal(false)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request Profile Reveal?</h3>
            <p>
              By requesting to reveal, your real name and verified profile photo will be unlocked for your match.
            </p>
            <div className="admin-confirm-box">
              <div>
                <span>Privacy Rule:</span>
                <strong>Both participants must opt in before profiles unlock.</strong>
              </div>
              {partnerRevealed && (
                <div style={{ color: "#4ade80", fontWeight: "600", marginTop: "0.5rem" }}>
                  🎉 Your match has already requested to reveal! Confirming now will unlock both profiles instantly.
                </div>
              )}
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowRevealModal(false)}
              >
                Keep Anonymous
              </button>
              <button
                type="button"
                className="admin-approve-btn"
                onClick={handleRequestReveal}
              >
                Confirm & Request Reveal 👁️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CELEBRATION REVEAL MODAL */}
      {showCelebrationModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCelebrationModal(false)}>
          <div className="admin-confirm-modal reveal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="reveal-aura">
              {partner.profilePhoto ? (
                <img
                  src={partner.profilePhoto}
                  alt={partner.fullName}
                  className="reveal-photo"
                />
              ) : (
                <div className="reveal-initials">{partner.initials}</div>
              )}
            </div>
            <h2>Mutual Vibe Confirmed! 🎉</h2>
            <p>
              Both of you agreed to connect! Say hello to <strong>{partner.fullName}</strong>.
            </p>

            <div className="reveal-details-box">
              <div>
                <span>College: </span>
                <strong>{partner.college}</strong>
              </div>
              <div>
                <span>Course & Year: </span>
                <strong>{partner.course} (Year {partner.academicYear || "1"})</strong>
              </div>
              {partner.tags?.length > 0 && (
                <div>
                  <span>Shared Vibes: </span>
                  <strong>{partner.tags.join(" · ")}</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              className="admin-approve-btn"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setShowCelebrationModal(false)}
            >
              Continue Chatting with {partner.firstName || "Match"} →
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: UNMATCH / END MATCH */}
      {showUnmatchModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowUnmatchModal(false)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>End this Match?</h3>
            <p>
              Are you sure you want to end this conversation? You will return to the matchmaking pool and can find a new connection.
            </p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowUnmatchModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reject-btn"
                onClick={handleUnmatch}
              >
                End Match ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Chat;
