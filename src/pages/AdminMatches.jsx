import { useEffect, useMemo, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { API_URL } from "../config";
import "./AdminDashboard.css";
import "./AdminMatches.css";

function AdminMatches() {
  const token = localStorage.getItem("sgt_admin_token");
  const [matches, setMatches] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [actionInProgress, setActionInProgress] = useState(false);

  // Modals state
  const [nullifyModal, setNullifyModal] = useState(null);
  const [unpairModal, setUnpairModal] = useState(null);
  const [blockUserModal, setBlockUserModal] = useState(null);
  const [blockReason, setBlockReason] = useState("Violation of campus code of conduct.");
  const [directBlockEmail, setDirectBlockEmail] = useState("");
  const [showDirectBlockModal, setShowDirectBlockModal] = useState(false);

  useEffect(() => {
    if (!token) {
      window.location.assign("/admin/login");
      return;
    }
    loadMatches();
  }, [token]);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("sgt_admin_token");
        window.location.assign("/admin/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      } else {
        throw new Error("Failed to load match records.");
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Failed to reach server." });
    } finally {
      setIsLoading(false);
    }
  };

  // Actions
  const handleNullifyMatch = async () => {
    if (!nullifyModal) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/matches/${nullifyModal._id}/nullify`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to nullify match.");

      setAlert({ type: "success", message: data.message });
      setNullifyModal(null);
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnpairMatch = async () => {
    if (!unpairModal) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/matches/${unpairModal._id}/unpair`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to unpair match.");

      setAlert({ type: "success", message: data.message });
      setUnpairModal(null);
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBlockUser = async () => {
    if (!blockUserModal) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${blockUserModal.userId}/block`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: blockReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to block user.");

      setAlert({ type: "success", message: data.message });
      setBlockUserModal(null);
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnblockUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to unblock ${userEmail}?`)) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/unblock`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to unblock user.");

      setAlert({ type: "success", message: data.message });
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDirectUnblockEmail = async () => {
    if (!directBlockEmail.trim()) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/unblock-by-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: directBlockEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to unblock email.");

      setAlert({ type: "success", message: data.message });
      setShowDirectBlockModal(false);
      setDirectBlockEmail("");
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDirectBlockEmail = async (e) => {
    e.preventDefault();
    if (!directBlockEmail.trim()) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/block-by-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: directBlockEmail.trim(),
          reason: blockReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to block email.");

      setAlert({ type: "success", message: data.message });
      setShowDirectBlockModal(false);
      setDirectBlockEmail("");
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (statusFilter === "MUTUAL_PAIRED" && !m.isRevealed) return false;
      if (statusFilter === "ACTIVE" && (m.isRevealed || m.status !== "ACTIVE")) return false;
      if (statusFilter === "CANCELLED" && m.status !== "CANCELLED_BY_ADMIN" && m.status !== "DECLINED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const u1Email = (m.user1?.email || "").toLowerCase();
        const u2Email = (m.user2?.email || "").toLowerCase();
        const u1Name = (m.user1?.fullName || "").toLowerCase();
        const u2Name = (m.user2?.fullName || "").toLowerCase();
        const u1Alias = (m.user1?.anonymousAlias || "").toLowerCase();
        const u2Alias = (m.user2?.anonymousAlias || "").toLowerCase();
        const u1Id = (m.user1?.studentId || "").toLowerCase();
        const u2Id = (m.user2?.studentId || "").toLowerCase();
        const college = (m.institution?.name || "").toLowerCase();

        return (
          u1Email.includes(q) ||
          u2Email.includes(q) ||
          u1Name.includes(q) ||
          u2Name.includes(q) ||
          u1Alias.includes(q) ||
          u2Alias.includes(q) ||
          u1Id.includes(q) ||
          u2Id.includes(q) ||
          college.includes(q)
        );
      }

      return true;
    });
  }, [matches, statusFilter, searchQuery]);

  const mutualPairsCount = useMemo(
    () => matches.filter((m) => m.isRevealed && m.status !== "CANCELLED_BY_ADMIN").length,
    [matches],
  );

  const activeAnonCount = useMemo(
    () => matches.filter((m) => m.status === "ACTIVE" && !m.isRevealed).length,
    [matches],
  );

  const cancelledCount = useMemo(
    () => matches.filter((m) => m.status === "CANCELLED_BY_ADMIN" || m.status === "DECLINED").length,
    [matches],
  );

  const blockedUsersCount = useMemo(() => {
    const userSet = new Set();
    matches.forEach((m) => {
      if (m.user1?.isBlocked && m.user1?._id) userSet.add(String(m.user1._id));
      if (m.user2?.isBlocked && m.user2?._id) userSet.add(String(m.user2._id));
    });
    return userSet.size;
  }, [matches]);

  const handleLogout = () => {
    localStorage.removeItem("sgt_admin_token");
    window.location.assign("/admin/login");
  };

  return (
    <main className="admin-page">
      <Background />
      <div className="admin-shell">
        {/* Top bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1>
              SGT <em>Match & Dandiya Pair Registry.</em>
            </h1>
            <p>Monitor paired campus profiles, audit chat connections, and manage student security.</p>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-block-btn"
              onClick={() => setShowDirectBlockModal(true)}
            >
              🚫 Block User by Email
            </button>
            <button
              type="button"
              className="admin-logout-btn"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="admin-tabs" aria-label="Admin Navigation Tabs">
          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/dashboard?tab=verifications")}
          >
            🪪 ID Verifications
          </button>
          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/dashboard?tab=payments")}
          >
            💳 QR Payments
          </button>
          <button
            type="button"
            className="admin-tab-btn is-active"
          >
            💃 Dandiya Matches & Pairs
            <span className="admin-tab-count">{mutualPairsCount} Paired</span>
          </button>
        </nav>

        {/* Global Alert Notification */}
        {alert.message && (
          <div
            className={`admin-alert ${alert.type}`}
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "12px",
              background:
                alert.type === "success"
                  ? "rgba(74, 222, 128, 0.15)"
                  : "rgba(248, 113, 113, 0.15)",
              border:
                alert.type === "success"
                  ? "1px solid rgba(74, 222, 128, 0.4)"
                  : "1px solid rgba(248, 113, 113, 0.4)",
              color: alert.type === "success" ? "#4ade80" : "#f87171",
              fontSize: "0.95rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{alert.message}</span>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onClick={() => setAlert({ type: "", message: "" })}
            >
              ✕
            </button>
          </div>
        )}

        {/* 4 Stats Cards */}
        <div className="admin-match-stats-grid">
          <div className="admin-stat-card gold">
            <span className="admin-stat-label">💃 Mutually Paired Dandiya Profiles</span>
            <strong className="admin-stat-val">{mutualPairsCount}</strong>
            <span className="admin-stat-sub">Identity fully unlocked by mutual consent</span>
          </div>

          <div className="admin-stat-card purple">
            <span className="admin-stat-label">⚡ Active Anonymous Chats</span>
            <strong className="admin-stat-val">{activeAnonCount}</strong>
            <span className="admin-stat-sub">Connecting via festival aliases</span>
          </div>

          <div className="admin-stat-card gray">
            <span className="admin-stat-label">✕ Nullified / Declined Matches</span>
            <strong className="admin-stat-val">{cancelledCount}</strong>
            <span className="admin-stat-sub">Cancelled by admin or student</span>
          </div>

          <div className="admin-stat-card red">
            <span className="admin-stat-label">🛡️ Suspended Accounts</span>
            <strong className="admin-stat-val">{blockedUsersCount}</strong>
            <span className="admin-stat-sub">Restricted from matching & login</span>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-filter-group">
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "ALL" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All Match Records ({matches.length})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "MUTUAL_PAIRED" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("MUTUAL_PAIRED")}
            >
              💃 Mutually Paired ({mutualPairsCount})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "ACTIVE" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              ⚡ Active Anonymous ({activeAnonCount})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "CANCELLED" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("CANCELLED")}
            >
              ✕ Nullified / Declined ({cancelledCount})
            </button>
          </div>

          <div className="admin-search-wrap">
            <input
              type="text"
              placeholder="Search by student email, name, alias, roll ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Match Records List */}
        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: "4rem" }}>
            <Loader label="Loading match & pairing registry..." />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div
            style={{
              padding: "4rem",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "20px",
              color: "rgba(255, 248, 242, 0.5)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
            }}
          >
            No matches found matching your filters.
          </div>
        ) : (
          <div className="admin-match-pairs-list">
            {filteredMatches.map((m) => {
              const isMutualPair = m.isRevealed;
              const isCancelled = m.status === "CANCELLED_BY_ADMIN" || m.status === "DECLINED";

              return (
                <article
                  key={m._id}
                  className={`admin-pair-card ${isMutualPair ? "is-mutual-pair" : ""} ${
                    isCancelled ? "is-cancelled" : ""
                  }`}
                >
                  {/* Card Header Status */}
                  <div className="admin-pair-header">
                    <div className="admin-pair-status-badge">
                      {isMutualPair ? (
                        <span className="badge-mutual">💃 DANDIYA PAIRED & MUTUALLY REVEALED</span>
                      ) : isCancelled ? (
                        <span className="badge-cancelled">✕ MATCH NULLIFIED / DECLINED</span>
                      ) : (
                        <span className="badge-active">⚡ ACTIVE ANONYMOUS CONNECTION</span>
                      )}
                      <span className="admin-pair-compat-badge">
                        ✨ {m.compatibilityScore}% Compatible
                      </span>
                    </div>

                    <div className="admin-pair-meta">
                      <span>🏛️ {m.institution?.name || "Campus Pool"}</span>
                      <span>💬 {m.messageCount} Message{m.messageCount === 1 ? "" : "s"}</span>
                      <span>
                        🕒 Matched:{" "}
                        {new Date(m.matchedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Visual Pair Comparison Split */}
                  <div className="admin-pair-body">
                    {/* Student 1 Profile */}
                    <div className="admin-student-box">
                      <div className="admin-student-avatar-wrap">
                        {m.user1.profilePhoto ? (
                          <img
                            src={m.user1.profilePhoto}
                            alt={m.user1.fullName}
                            className="admin-student-avatar"
                          />
                        ) : (
                          <div className="admin-student-avatar-empty">
                            {m.user1.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {m.user1.isBlocked && (
                          <span className="admin-student-blocked-flag" title="Account Blocked">
                            🚫
                          </span>
                        )}
                      </div>

                      <div className="admin-student-details">
                        <div className="admin-student-name">
                          <strong>{m.user1.fullName}</strong>
                          <span className="admin-student-alias">🎭 {m.user1.anonymousAlias}</span>
                        </div>

                        <div className="admin-student-email-row">
                          <span className="admin-user-email-chip">✉️ {m.user1.email}</span>
                          {m.user1.isBlocked ? (
                            <span className="admin-tag-blocked">🚫 SUSPENDED</span>
                          ) : (
                            <span className="admin-tag-active">● Active</span>
                          )}
                        </div>

                        <p className="admin-student-sub">
                          🎓 {m.user1.course} {m.user1.academicYear ? `· Year ${m.user1.academicYear}` : ""} · ID: <strong>{m.user1.studentId}</strong>
                        </p>

                        <div className="admin-student-quick-actions">
                          {m.user1.isBlocked ? (
                            <button
                              type="button"
                              className="admin-btn-unblock"
                              onClick={() => handleUnblockUser(m.user1._id, m.user1.email)}
                              disabled={actionInProgress}
                            >
                              ✓ Unblock User
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn-block-sm"
                              onClick={() =>
                                setBlockUserModal({
                                  userId: m.user1._id,
                                  email: m.user1.email,
                                  name: m.user1.fullName,
                                })
                              }
                              disabled={actionInProgress}
                            >
                              🚫 Block Student
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Connection Bridge Graphic */}
                    <div className="admin-pair-bridge">
                      <div className="admin-bridge-line" />
                      <div className="admin-bridge-icon">
                        {isMutualPair ? "❤️" : "⚡"}
                      </div>
                      <div className="admin-bridge-score">
                        {m.compatibilityScore}%
                      </div>
                    </div>

                    {/* Student 2 Profile */}
                    <div className="admin-student-box">
                      <div className="admin-student-avatar-wrap">
                        {m.user2.profilePhoto ? (
                          <img
                            src={m.user2.profilePhoto}
                            alt={m.user2.fullName}
                            className="admin-student-avatar"
                          />
                        ) : (
                          <div className="admin-student-avatar-empty">
                            {m.user2.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {m.user2.isBlocked && (
                          <span className="admin-student-blocked-flag" title="Account Blocked">
                            🚫
                          </span>
                        )}
                      </div>

                      <div className="admin-student-details">
                        <div className="admin-student-name">
                          <strong>{m.user2.fullName}</strong>
                          <span className="admin-student-alias">🎭 {m.user2.anonymousAlias}</span>
                        </div>

                        <div className="admin-student-email-row">
                          <span className="admin-user-email-chip">✉️ {m.user2.email}</span>
                          {m.user2.isBlocked ? (
                            <span className="admin-tag-blocked">🚫 SUSPENDED</span>
                          ) : (
                            <span className="admin-tag-active">● Active</span>
                          )}
                        </div>

                        <p className="admin-student-sub">
                          🎓 {m.user2.course} {m.user2.academicYear ? `· Year ${m.user2.academicYear}` : ""} · ID: <strong>{m.user2.studentId}</strong>
                        </p>

                        <div className="admin-student-quick-actions">
                          {m.user2.isBlocked ? (
                            <button
                              type="button"
                              className="admin-btn-unblock"
                              onClick={() => handleUnblockUser(m.user2._id, m.user2.email)}
                              disabled={actionInProgress}
                            >
                              ✓ Unblock User
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn-block-sm"
                              onClick={() =>
                                setBlockUserModal({
                                  userId: m.user2._id,
                                  email: m.user2.email,
                                  name: m.user2.fullName,
                                })
                              }
                              disabled={actionInProgress}
                            >
                              🚫 Block Student
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Synthesis & Narrative */}
                  {m.synthesis?.matchHeadline && (
                    <div className="admin-pair-synthesis">
                      <strong>AI Match Synthesis:</strong> &quot;{m.synthesis.matchHeadline}&quot; ·{" "}
                      <em>{m.synthesis.sharedVibe}</em>
                    </div>
                  )}

                  {/* Match Level Admin Actions */}
                  <div className="admin-pair-actions">
                    {isMutualPair && (
                      <button
                        type="button"
                        className="admin-btn-unpair"
                        onClick={() => setUnpairModal(m)}
                        disabled={actionInProgress}
                        title="Reset mutual reveal back to anonymous state"
                      >
                        🔓 Reset Mutual Reveal
                      </button>
                    )}

                    {!isCancelled && (
                      <button
                        type="button"
                        className="admin-btn-nullify"
                        onClick={() => setNullifyModal(m)}
                        disabled={actionInProgress}
                        title="Nullify match and clear pair linkages"
                      >
                        ✕ Nullify & Terminate Match
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================================
          MODAL 1: NULLIFY MATCH CONFIRMATION
          ========================================================== */}
      {nullifyModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setNullifyModal(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nullify & Terminate Match</h3>
            <p>
              Are you sure you want to nullify the match between{" "}
              <strong>{nullifyModal.user1?.fullName}</strong> ({nullifyModal.user1?.email}) and{" "}
              <strong>{nullifyModal.user2?.fullName}</strong> ({nullifyModal.user2?.email})?
            </p>
            <p style={{ color: "#ff9d8b", fontSize: "0.85rem" }}>
              ⚠️ This will cancel the match, clear their reveal lock, and return both students to the pool.
            </p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setNullifyModal(null)}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-reject"
                onClick={handleNullifyMatch}
                disabled={actionInProgress}
              >
                {actionInProgress ? "Nullifying..." : "Confirm & Nullify Match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 2: UNPAIR MUTUAL REVEAL CONFIRMATION
          ========================================================== */}
      {unpairModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setUnpairModal(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Mutual Reveal</h3>
            <p>
              Are you sure you want to reset the mutual reveal for this pair? Their identities will be reverted to anonymous campus aliases, and their reveal lock will be cleared.
            </p>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setUnpairModal(null)}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-approve"
                onClick={handleUnpairMatch}
                disabled={actionInProgress}
              >
                {actionInProgress ? "Resetting..." : "Confirm Unpair"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 3: BLOCK USER CONFIRMATION
          ========================================================== */}
      {blockUserModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setBlockUserModal(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Suspend Student Account</h3>
            <p>
              You are about to block <strong>{blockUserModal.name}</strong> (
              <em>{blockUserModal.email}</em>). This user will be immediately logged out, prevented from matching, and all their active matches will be nullified.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.8rem", color: "rgba(255, 248, 242, 0.6)" }}>
                Suspension Reason Note:
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Reason for suspension..."
              />
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setBlockUserModal(null)}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-reject"
                onClick={handleBlockUser}
                disabled={actionInProgress || !blockReason.trim()}
              >
                {actionInProgress ? "Suspending..." : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 4: DIRECT BLOCK BY EMAIL
          ========================================================== */}
      {showDirectBlockModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setShowDirectBlockModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🛡️ Manage Student Access (Block / Unblock by Email)</h3>
            <p>
              Enter the student&apos;s registered email to suspend or restore their account access.
            </p>

            <form onSubmit={handleDirectBlockEmail} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.8rem", color: "rgba(255, 248, 242, 0.7)" }}>
                  Student Email Address:
                </label>
                <input
                  type="email"
                  required
                  placeholder="student@campus.edu"
                  value={directBlockEmail}
                  onChange={(e) => setDirectBlockEmail(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    padding: "0.85rem",
                    color: "#fff8f2",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.8rem", color: "rgba(255, 248, 242, 0.7)" }}>
                  Suspension Reason (Only needed when blocking):
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Reason for suspension..."
                />
              </div>

              <div className="admin-modal-actions" style={{ flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="admin-modal-btn-cancel"
                  onClick={() => setShowDirectBlockModal(false)}
                  disabled={actionInProgress}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn-approve"
                  onClick={handleDirectUnblockEmail}
                  disabled={actionInProgress || !directBlockEmail.trim()}
                  style={{ padding: "0.6rem 1.2rem" }}
                >
                  {actionInProgress ? "Restoring..." : "✓ Unblock Account"}
                </button>
                <button
                  type="submit"
                  className="admin-btn-reject"
                  disabled={actionInProgress || !directBlockEmail.trim()}
                  style={{ padding: "0.6rem 1.2rem" }}
                >
                  {actionInProgress ? "Suspending..." : "🚫 Block Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminMatches;
