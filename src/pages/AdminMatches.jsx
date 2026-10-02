import { useEffect, useMemo, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { API_URL } from "../config";
import "./AdminDashboard.css";
import "./AdminMatches.css";

function calculateLiveCompatScore(st1, st2) {
  if (!st1 || !st2) return { score: 50, sharedTags: [] };
  let score = 55; // baseline festival affinity

  // Course / branch synergy
  if (st1.course && st2.course && st1.course.toLowerCase() === st2.course.toLowerCase()) {
    score += 10;
  }

  // Academic year proximity
  if (st1.academicYear && st2.academicYear) {
    const y1 = parseInt(st1.academicYear.replace(/\D/g, ""), 10) || 0;
    const y2 = parseInt(st2.academicYear.replace(/\D/g, ""), 10) || 0;
    if (y1 && y2) {
      const diff = Math.abs(y1 - y2);
      if (diff === 0) score += 10;
      else if (diff === 1) score += 5;
    }
  }

  // Shared tags from questionnaire
  const tags1 = new Set((st1.tags || []).map((t) => t.toLowerCase()));
  const tags2 = (st2.tags || []).map((t) => t.toLowerCase());
  const shared = (st2.tags || []).filter((t) => tags1.has(t.toLowerCase()));
  score += Math.min(25, shared.length * 8);

  // College match
  if (st1.collegeName && st2.collegeName && st1.collegeName.toLowerCase() === st2.collegeName.toLowerCase()) {
    score += 10;
  }

  return {
    score: Math.min(99, Math.max(50, score)),
    sharedTags: shared,
  };
}

function AdminMatches() {
  const token = localStorage.getItem("sgt_admin_token");
  const [viewMode, setViewMode] = useState("STUDIO"); // "STUDIO" or "REGISTRY"
  const [matches, setMatches] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [actionInProgress, setActionInProgress] = useState(false);

  // Dual Pool (Side-by-Side Studio) state
  const [dualPool, setDualPool] = useState({ females: [], males: [], counts: {} });
  const [isLoadingDualPool, setIsLoadingDualPool] = useState(true);
  const [femaleSearch, setFemaleSearch] = useState("");
  const [maleSearch, setMaleSearch] = useState("");
  const [poolAvailabilityFilter, setPoolAvailabilityFilter] = useState("ALL"); // "ALL", "UNMATCHED_ONLY", "PAIRED_ONLY"
  const [selectedFemale, setSelectedFemale] = useState(null);
  const [selectedMale, setSelectedMale] = useState(null);
  const [studioInstantReveal, setStudioInstantReveal] = useState(false);
  const [studioCustomHeadline, setStudioCustomHeadline] = useState("");
  const [expandedProfileId, setExpandedProfileId] = useState(null);

  // Modals state
  const [nullifyModal, setNullifyModal] = useState(null);
  const [unpairModal, setUnpairModal] = useState(null);
  const [blockUserModal, setBlockUserModal] = useState(null);
  const [blockReason, setBlockReason] = useState("Violation of campus code of conduct.");
  const [directBlockEmail, setDirectBlockEmail] = useState("");
  const [showDirectBlockModal, setShowDirectBlockModal] = useState(false);

  // Manual Pair Creator modal state (legacy quick wizard)
  const [showManualPairModal, setShowManualPairModal] = useState(false);
  const [student1Search, setStudent1Search] = useState("");
  const [studentsList, setStudentsList] = useState([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [selectedStudent1, setSelectedStudent1] = useState(null);
  const [candidatePartners, setCandidatePartners] = useState([]);
  const [targetGender, setTargetGender] = useState(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateFilterQuery, setCandidateFilterQuery] = useState("");
  const [instantRevealPair, setInstantRevealPair] = useState(false);
  const [customPairHeadline, setCustomPairHeadline] = useState("");

  useEffect(() => {
    if (!token) {
      window.location.assign("/admin/login");
      return;
    }
    loadMatches();
    loadDualPool();
  }, [token]);

  const loadDualPool = async () => {
    setIsLoadingDualPool(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/matches/dual-pool`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDualPool({
          females: data.females || [],
          males: data.males || [],
          counts: data.counts || {},
        });
      }
    } catch (err) {
      console.error("Failed to load dual pool:", err);
    } finally {
      setIsLoadingDualPool(false);
    }
  };

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

  const handleOpenManualPairModal = () => {
    setShowManualPairModal(true);
    setSelectedStudent1(null);
    setSelectedCandidate(null);
    setCandidatePartners([]);
    setStudent1Search("");
    setCandidateFilterQuery("");
    setInstantRevealPair(false);
    setCustomPairHeadline("");
    searchStudents("");
  };

  const searchStudents = async (query = "") => {
    setIsSearchingStudents(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/matches/students?search=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const handleSelectStudent1 = async (student) => {
    setSelectedStudent1(student);
    setSelectedCandidate(null);
    setIsLoadingCandidates(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/matches/candidates/${student.userId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setCandidatePartners(data.candidates || []);
        setTargetGender(data.targetGender);
      }
    } catch (err) {
      setAlert({ type: "error", message: "Failed to load candidate partners." });
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleExecuteManualPair = async () => {
    if (!selectedStudent1 || !selectedCandidate) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/matches/manual-pair`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user1Id: selectedStudent1.userId,
          user2Id: selectedCandidate.userId,
          instantReveal: instantRevealPair,
          customHeadline: customPairHeadline.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create pair.");

      setAlert({ type: "success", message: data.message });
      setShowManualPairModal(false);
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleExecuteStudioPair = async () => {
    if (!selectedFemale || !selectedMale) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/matches/manual-pair`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user1Id: selectedFemale.userId,
          user2Id: selectedMale.userId,
          instantReveal: studioInstantReveal,
          customHeadline: studioCustomHeadline.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create pair.");

      setAlert({ type: "success", message: data.message });
      setSelectedFemale(null);
      setSelectedMale(null);
      setStudioCustomHeadline("");
      loadDualPool();
      loadMatches();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const filteredFemales = useMemo(() => {
    return (dualPool.females || []).filter((st) => {
      if (poolAvailabilityFilter === "UNMATCHED_ONLY" && st.hasActiveMatch) return false;
      if (poolAvailabilityFilter === "PAIRED_ONLY" && !st.hasActiveMatch) return false;

      if (femaleSearch.trim()) {
        const q = femaleSearch.toLowerCase();
        return (
          st.fullName.toLowerCase().includes(q) ||
          st.email.toLowerCase().includes(q) ||
          st.studentId.toLowerCase().includes(q) ||
          st.course.toLowerCase().includes(q) ||
          st.anonymousAlias.toLowerCase().includes(q) ||
          (st.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dualPool.females, poolAvailabilityFilter, femaleSearch]);

  const filteredMales = useMemo(() => {
    return (dualPool.males || []).filter((st) => {
      if (poolAvailabilityFilter === "UNMATCHED_ONLY" && st.hasActiveMatch) return false;
      if (poolAvailabilityFilter === "PAIRED_ONLY" && !st.hasActiveMatch) return false;

      if (maleSearch.trim()) {
        const q = maleSearch.toLowerCase();
        return (
          st.fullName.toLowerCase().includes(q) ||
          st.email.toLowerCase().includes(q) ||
          st.studentId.toLowerCase().includes(q) ||
          st.course.toLowerCase().includes(q) ||
          st.anonymousAlias.toLowerCase().includes(q) ||
          (st.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dualPool.males, poolAvailabilityFilter, maleSearch]);

  const liveMatchMetrics = useMemo(() => {
    if (!selectedFemale || !selectedMale) return null;
    return calculateLiveCompatScore(selectedFemale, selectedMale);
  }, [selectedFemale, selectedMale]);

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
              className="admin-manual-pair-btn"
              onClick={handleOpenManualPairModal}
            >
              ⚡ Create Manual Dandiya Pair
            </button>
            <button
              type="button"
              className="admin-block-btn"
              onClick={() => setShowDirectBlockModal(true)}
            >
              🛡️ Manage Access
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
            ✨ Dandiya Matchmaker
            <span className="admin-tab-count">{mutualPairsCount} Paired</span>
          </button>
          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/offers")}
          >
            🎟️ Offer Codes
          </button>
          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/influencers")}
          >
            🌟 Influencer Promos
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

        {/* View Mode Switcher */}
        <div className="admin-viewmode-switcher">
          <button
            type="button"
            className={`admin-viewmode-btn ${viewMode === "STUDIO" ? "is-active" : ""}`}
            onClick={() => setViewMode("STUDIO")}
          >
            ⚡ Split Matchmaking Studio (Girls 🌸 ↔ Boys ⚡)
            <span className="admin-badge-count">
              {dualPool.counts?.unmatchedFemales || 0}F / {dualPool.counts?.unmatchedMales || 0}M Available
            </span>
          </button>
          <button
            type="button"
            className={`admin-viewmode-btn ${viewMode === "REGISTRY" ? "is-active" : ""}`}
            onClick={() => setViewMode("REGISTRY")}
          >
            📋 Match Registry & Audit List ({matches.length})
          </button>
        </div>

        {/* ==========================================================
            MODE 1: SPLIT MATCHMAKER STUDIO (FEMALE 🌸 ↔ MALE ⚡)
            ========================================================== */}
        {viewMode === "STUDIO" && (
          <section className="admin-studio-wrapper">
            {/* Studio Filter Bar */}
            <div className="admin-studio-topbar">
              <div className="admin-studio-filter-pills">
                <button
                  type="button"
                  className={`admin-studio-pill ${poolAvailabilityFilter === "ALL" ? "is-active" : ""}`}
                  onClick={() => setPoolAvailabilityFilter("ALL")}
                >
                  All Profiles ({dualPool.counts?.females || 0}F / {dualPool.counts?.males || 0}M)
                </button>
                <button
                  type="button"
                  className={`admin-studio-pill ${poolAvailabilityFilter === "UNMATCHED_ONLY" ? "is-active" : ""}`}
                  onClick={() => setPoolAvailabilityFilter("UNMATCHED_ONLY")}
                >
                  🟢 Available Only ({dualPool.counts?.unmatchedFemales || 0}F / {dualPool.counts?.unmatchedMales || 0}M)
                </button>
                <button
                  type="button"
                  className={`admin-studio-pill ${poolAvailabilityFilter === "PAIRED_ONLY" ? "is-active" : ""}`}
                  onClick={() => setPoolAvailabilityFilter("PAIRED_ONLY")}
                >
                  ✨ Already Paired ({(dualPool.counts?.females || 0) - (dualPool.counts?.unmatchedFemales || 0)}F)
                </button>
              </div>

              <div className="admin-studio-top-actions">
                <button
                  type="button"
                  className="admin-studio-refresh-btn"
                  onClick={() => {
                    loadDualPool();
                    loadMatches();
                  }}
                  disabled={isLoadingDualPool}
                >
                  {isLoadingDualPool ? "🔄 Refreshing..." : "🔄 Reload Campus Pool"}
                </button>
              </div>
            </div>

            {/* Side-by-Side 2 Column Arena */}
            <div className="admin-studio-arena">
              {/* LEFT COLUMN: FEMALES */}
              <div className="admin-studio-col female-col">
                <div className="admin-studio-col-header female-header">
                  <div className="admin-col-title-row">
                    <span className="admin-gender-icon-large">🌸</span>
                    <div>
                      <h3>Female Students</h3>
                      <span className="admin-col-counter">
                        {filteredFemales.length} students {femaleSearch && "(filtered)"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-studio-search-wrap">
                    <input
                      type="text"
                      placeholder="Search girls by name, email, roll, branch, vibe tags..."
                      value={femaleSearch}
                      onChange={(e) => setFemaleSearch(e.target.value)}
                      className="admin-studio-search-input"
                    />
                    {femaleSearch && (
                      <button
                        type="button"
                        className="admin-search-clear"
                        onClick={() => setFemaleSearch("")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-studio-cards-container">
                  {isLoadingDualPool ? (
                    <div className="admin-studio-loading">
                      <Loader />
                      <p>Loading female campus pool...</p>
                    </div>
                  ) : filteredFemales.length === 0 ? (
                    <div className="admin-studio-empty">
                      <p>No female students found matching your search/filters.</p>
                    </div>
                  ) : (
                    filteredFemales.map((st) => {
                      const isSelected = selectedFemale?.userId === st.userId;
                      const isExpanded = expandedProfileId === st.userId;

                      return (
                        <div
                          key={st.userId}
                          className={`admin-studio-card female-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            if (isSelected) setSelectedFemale(null);
                            else setSelectedFemale(st);
                          }}
                        >
                          <div className="admin-card-head">
                            <div className="admin-card-avatar-wrap">
                              {st.profilePhoto ? (
                                <img src={st.profilePhoto} alt="" className="admin-card-avatar" />
                              ) : (
                                <div className="admin-card-avatar-empty female-empty">
                                  {st.fullName?.[0] || "F"}
                                </div>
                              )}
                              <span className="admin-avatar-gender-dot female" />
                            </div>

                            <div className="admin-card-header-info">
                              <div className="admin-card-name-row">
                                <strong className="admin-card-name">{st.fullName}</strong>
                                {st.verificationStatus === "VERIFIED" && (
                                  <span className="admin-verified-badge" title="ID Verified">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                              <div className="admin-card-alias-row">
                                <span className="admin-alias-pill">🎭 {st.anonymousAlias}</span>
                                {st.hasActiveMatch ? (
                                  <span className="admin-status-pill paired">✨ Paired</span>
                                ) : (
                                  <span className="admin-status-pill available">🟢 Available</span>
                                )}
                              </div>
                            </div>

                            <div className="admin-card-select-radio">
                              <span className={`admin-radio-circle ${isSelected ? "is-checked" : ""}`}>
                                {isSelected ? "✓" : ""}
                              </span>
                            </div>
                          </div>

                          <div className="admin-card-body">
                            <div className="admin-card-meta-line">
                              <span>✉️ {st.email}</span>
                              {st.studentId && <span>• ID: <strong>{st.studentId}</strong></span>}
                            </div>
                            <div className="admin-card-meta-line">
                              <span>🏛️ {st.collegeName}</span>
                            </div>
                            <div className="admin-card-meta-line">
                              <span>🎓 {st.course} {st.academicYear ? `· ${st.academicYear}` : ""}</span>
                              <span className={`admin-pay-pill ${st.paymentStatus.toLowerCase()}`}>
                                {st.paymentStatus === "PAID" ? "💳 Paid" : "Free Plan"}
                              </span>
                            </div>

                            {/* Tags list */}
                            {st.tags && st.tags.length > 0 && (
                              <div className="admin-card-tags">
                                {st.tags.map((tag, idx) => (
                                  <span key={idx} className="admin-tag-chip">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Expandable Accordion for full profile & traits */}
                            <div
                              className="admin-card-expand-toggle"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedProfileId(isExpanded ? null : st.userId);
                              }}
                            >
                              <span>{isExpanded ? "▲ Hide Full Profile & Traits" : "▼ View Full Profile & Traits"}</span>
                            </div>

                            {isExpanded && (
                              <div className="admin-card-expanded-details" onClick={(e) => e.stopPropagation()}>
                                {st.personalityFeatures && Object.keys(st.personalityFeatures).length > 0 ? (
                                  <div className="admin-traits-grid">
                                    {Object.entries(st.personalityFeatures).map(([k, v]) => (
                                      <div key={k} className="admin-trait-item">
                                        <span className="admin-trait-key">{k}:</span>
                                        <span className="admin-trait-val">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="admin-no-traits">Personality questionnaire features loaded.</p>
                                )}
                                <div className="admin-profile-date">
                                  Joined: {new Date(st.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: MALES */}
              <div className="admin-studio-col male-col">
                <div className="admin-studio-col-header male-header">
                  <div className="admin-col-title-row">
                    <span className="admin-gender-icon-large">⚡</span>
                    <div>
                      <h3>Male Students</h3>
                      <span className="admin-col-counter">
                        {filteredMales.length} students {maleSearch && "(filtered)"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-studio-search-wrap">
                    <input
                      type="text"
                      placeholder="Search boys by name, email, roll, branch, vibe tags..."
                      value={maleSearch}
                      onChange={(e) => setMaleSearch(e.target.value)}
                      className="admin-studio-search-input"
                    />
                    {maleSearch && (
                      <button
                        type="button"
                        className="admin-search-clear"
                        onClick={() => setMaleSearch("")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-studio-cards-container">
                  {isLoadingDualPool ? (
                    <div className="admin-studio-loading">
                      <Loader />
                      <p>Loading male campus pool...</p>
                    </div>
                  ) : filteredMales.length === 0 ? (
                    <div className="admin-studio-empty">
                      <p>No male students found matching your search/filters.</p>
                    </div>
                  ) : (
                    filteredMales.map((st) => {
                      const isSelected = selectedMale?.userId === st.userId;
                      const isExpanded = expandedProfileId === st.userId;

                      // Live Dynamic Compatibility Calculation against Selected Female
                      let liveCompat = null;
                      if (selectedFemale) {
                        liveCompat = calculateLiveCompatScore(selectedFemale, st);
                      }

                      const scoreColor =
                        liveCompat?.score >= 80
                          ? "#4ade80"
                          : liveCompat?.score >= 65
                          ? "#fbbf24"
                          : "#f87171";

                      return (
                        <div
                          key={st.userId}
                          className={`admin-studio-card male-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            if (isSelected) setSelectedMale(null);
                            else setSelectedMale(st);
                          }}
                        >
                          <div className="admin-card-head">
                            <div className="admin-card-avatar-wrap">
                              {st.profilePhoto ? (
                                <img src={st.profilePhoto} alt="" className="admin-card-avatar" />
                              ) : (
                                <div className="admin-card-avatar-empty male-empty">
                                  {st.fullName?.[0] || "M"}
                                </div>
                              )}
                              <span className="admin-avatar-gender-dot male" />
                            </div>

                            <div className="admin-card-header-info">
                              <div className="admin-card-name-row">
                                <strong className="admin-card-name">{st.fullName}</strong>
                                {st.verificationStatus === "VERIFIED" && (
                                  <span className="admin-verified-badge" title="ID Verified">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                              <div className="admin-card-alias-row">
                                <span className="admin-alias-pill">🎭 {st.anonymousAlias}</span>
                                {st.hasActiveMatch ? (
                                  <span className="admin-status-pill paired">✨ Paired</span>
                                ) : (
                                  <span className="admin-status-pill available">🟢 Available</span>
                                )}
                              </div>
                            </div>

                            <div className="admin-card-right-action">
                              {liveCompat && (
                                <span
                                  className="admin-live-compat-chip"
                                  style={{ borderColor: scoreColor, color: scoreColor }}
                                >
                                  ⚡ {liveCompat.score}%
                                </span>
                              )}
                              <span className={`admin-radio-circle ${isSelected ? "is-checked" : ""}`}>
                                {isSelected ? "✓" : ""}
                              </span>
                            </div>
                          </div>

                          <div className="admin-card-body">
                            <div className="admin-card-meta-line">
                              <span>✉️ {st.email}</span>
                              {st.studentId && <span>• ID: <strong>{st.studentId}</strong></span>}
                            </div>
                            <div className="admin-card-meta-line">
                              <span>🏛️ {st.collegeName}</span>
                            </div>
                            <div className="admin-card-meta-line">
                              <span>🎓 {st.course} {st.academicYear ? `· ${st.academicYear}` : ""}</span>
                              <span className={`admin-pay-pill ${st.paymentStatus.toLowerCase()}`}>
                                {st.paymentStatus === "PAID" ? "💳 Paid" : "Free Plan"}
                              </span>
                            </div>

                            {/* Tags list */}
                            {st.tags && st.tags.length > 0 && (
                              <div className="admin-card-tags">
                                {st.tags.map((tag, idx) => (
                                  <span key={idx} className="admin-tag-chip">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Expandable Accordion for full profile & traits */}
                            <div
                              className="admin-card-expand-toggle"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedProfileId(isExpanded ? null : st.userId);
                              }}
                            >
                              <span>{isExpanded ? "▲ Hide Full Profile & Traits" : "▼ View Full Profile & Traits"}</span>
                            </div>

                            {isExpanded && (
                              <div className="admin-card-expanded-details" onClick={(e) => e.stopPropagation()}>
                                {st.personalityFeatures && Object.keys(st.personalityFeatures).length > 0 ? (
                                  <div className="admin-traits-grid">
                                    {Object.entries(st.personalityFeatures).map(([k, v]) => (
                                      <div key={k} className="admin-trait-item">
                                        <span className="admin-trait-key">{k}:</span>
                                        <span className="admin-trait-val">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="admin-no-traits">Personality questionnaire features loaded.</p>
                                )}
                                <div className="admin-profile-date">
                                  Joined: {new Date(st.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* STICKY INTERACTIVE MATCH BRIDGE (BOTTOM DOCK) */}
            {(selectedFemale || selectedMale) && (
              <div className="admin-studio-bridge-dock">
                <div className="admin-bridge-dock-inner">
                  {/* Female Slot */}
                  <div className="admin-bridge-slot">
                    {selectedFemale ? (
                      <div className="admin-bridge-user-selected female-border">
                        <div className="admin-bridge-avatar-wrap">
                          {selectedFemale.profilePhoto ? (
                            <img src={selectedFemale.profilePhoto} alt="" className="admin-bridge-avatar" />
                          ) : (
                            <div className="admin-bridge-avatar-empty female">
                              {selectedFemale.fullName?.[0] || "F"}
                            </div>
                          )}
                        </div>
                        <div className="admin-bridge-user-info">
                          <span className="admin-bridge-role-label">🌸 Selected Female</span>
                          <strong>{selectedFemale.fullName}</strong>
                          <span>{selectedFemale.course || "Campus"}</span>
                        </div>
                        <button
                          type="button"
                          className="admin-bridge-slot-remove"
                          onClick={() => setSelectedFemale(null)}
                          title="Remove selection"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="admin-bridge-slot-placeholder female-prompt">
                        <span>🌸 Select a Female from Left Column</span>
                      </div>
                    )}
                  </div>

                  {/* Center Match Connector & Controls */}
                  <div className="admin-bridge-center">
                    {selectedFemale && selectedMale ? (
                      <div className="admin-bridge-active-panel">
                        <div className="admin-bridge-score-ring">
                          <span className="admin-bridge-score-number">
                            {liveMatchMetrics?.score || 85}%
                          </span>
                          <span className="admin-bridge-score-sub">Compatibility</span>
                        </div>

                        {liveMatchMetrics?.sharedTags?.length > 0 && (
                          <div className="admin-bridge-shared-tags">
                            ✨ Shared: {liveMatchMetrics.sharedTags.join(", ")}
                          </div>
                        )}

                        <div className="admin-bridge-options">
                          <label className="admin-bridge-checkbox-label">
                            <input
                              type="checkbox"
                              checked={studioInstantReveal}
                              onChange={(e) => setStudioInstantReveal(e.target.checked)}
                            />
                            <span>Instant Reveal (Real names unlocked)</span>
                          </label>

                          <input
                            type="text"
                            placeholder="Optional pair note / festival headline..."
                            value={studioCustomHeadline}
                            onChange={(e) => setStudioCustomHeadline(e.target.value)}
                            className="admin-bridge-headline-input"
                          />
                        </div>

                        <button
                          type="button"
                          className="admin-btn-studio-pair-submit"
                          disabled={actionInProgress}
                          onClick={handleExecuteStudioPair}
                        >
                          {actionInProgress ? (
                            "Pairing in Database..."
                          ) : (
                            `⚡ Match ${selectedFemale.fullName.split(" ")[0]} 🌸 & ${selectedMale.fullName.split(" ")[0]} ⚡ for Dandiya`
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="admin-bridge-instruction">
                        <span className="admin-bridge-zap-icon">⚡</span>
                        <p>
                          {selectedFemale
                            ? "👉 Now select a Male partner on the right to review compatibility and activate 1-on-1 chat."
                            : "👈 Select a Female partner on the left to review compatibility and activate 1-on-1 chat."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Male Slot */}
                  <div className="admin-bridge-slot">
                    {selectedMale ? (
                      <div className="admin-bridge-user-selected male-border">
                        <div className="admin-bridge-avatar-wrap">
                          {selectedMale.profilePhoto ? (
                            <img src={selectedMale.profilePhoto} alt="" className="admin-bridge-avatar" />
                          ) : (
                            <div className="admin-bridge-avatar-empty male">
                              {selectedMale.fullName?.[0] || "M"}
                            </div>
                          )}
                        </div>
                        <div className="admin-bridge-user-info">
                          <span className="admin-bridge-role-label">⚡ Selected Male</span>
                          <strong>{selectedMale.fullName}</strong>
                          <span>{selectedMale.course || "Campus"}</span>
                        </div>
                        <button
                          type="button"
                          className="admin-bridge-slot-remove"
                          onClick={() => setSelectedMale(null)}
                          title="Remove selection"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="admin-bridge-slot-placeholder male-prompt">
                        <span>⚡ Select a Male from Right Column</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ==========================================================
            MODE 2: MATCH REGISTRY & AUDIT LIST
            ========================================================== */}
        {viewMode === "REGISTRY" && (
          <>
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
          </>
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

      {/* ==========================================================
          MODAL 5: MANUAL DANDIYA PAIR CREATOR WIZARD
          ========================================================== */}
      {showManualPairModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setShowManualPairModal(false)}
        >
          <div
            className="admin-modal admin-manual-pair-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "920px", width: "95%" }}
          >
            <div className="admin-manual-modal-header">
              <div>
                <h3>⚡ Dandiya Matchmaker: Manual Pairing Studio</h3>
                <p>
                  Manually pair any two students. Gender complementarity (Girl ↔ Boy) and compatibility scores are automatically enforced.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-icon"
                onClick={() => !actionInProgress && setShowManualPairModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="admin-manual-pair-grid">
              {/* LEFT COLUMN: SELECT STUDENT 1 */}
              <div className="admin-manual-col">
                <div className="admin-manual-col-title">
                  <span className="admin-step-badge">1</span>
                  <h4>Select First Student</h4>
                </div>

                <div className="admin-manual-search-box">
                  <input
                    type="text"
                    placeholder="Search by name, email, or roll..."
                    value={student1Search}
                    onChange={(e) => {
                      setStudent1Search(e.target.value);
                      searchStudents(e.target.value);
                    }}
                  />
                </div>

                <div className="admin-manual-student-list">
                  {isSearchingStudents ? (
                    <div className="admin-manual-empty">Searching students...</div>
                  ) : studentsList.length === 0 ? (
                    <div className="admin-manual-empty">No verified students found.</div>
                  ) : (
                    studentsList.map((st) => {
                      const isSelected = selectedStudent1?.userId === st.userId;
                      return (
                        <div
                          key={st.userId}
                          className={`admin-student-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => handleSelectStudent1(st)}
                        >
                          <div className="admin-student-avatar-wrap">
                            {st.avatarUrl ? (
                              <img src={st.avatarUrl} alt="" className="admin-student-avatar" />
                            ) : (
                              <div className="admin-student-avatar-placeholder">
                                {st.fullName?.[0] || "?"}
                              </div>
                            )}
                          </div>
                          <div className="admin-student-info">
                            <div className="admin-student-name-row">
                              <strong>{st.fullName}</strong>
                              <span className={`admin-gender-chip ${st.gender}`}>
                                {st.gender === "female" ? "🌸 Girl" : st.gender === "male" ? "⚡ Boy" : "✨ Other"}
                              </span>
                            </div>
                            <div className="admin-student-sub">
                              <span>{st.email}</span>
                              {st.studentId && <span>• ID: {st.studentId}</span>}
                            </div>
                            <div className="admin-student-branch">
                              {st.branch || "Campus"} {st.year ? `• Year ${st.year}` : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: SELECT CANDIDATE PARTNER */}
              <div className="admin-manual-col">
                <div className="admin-manual-col-title">
                  <span className="admin-step-badge">2</span>
                  <h4>Select Dandiya Partner</h4>
                  {targetGender && (
                    <span className="admin-rule-pill">
                      Rule: {targetGender === "male" ? "Must be Boy ⚡" : "Must be Girl 🌸"}
                    </span>
                  )}
                </div>

                {!selectedStudent1 ? (
                  <div className="admin-manual-placeholder-notice">
                    👈 Please select a student on the left to discover eligible Dandiya partners.
                  </div>
                ) : isLoadingCandidates ? (
                  <div className="admin-manual-empty">Calculating SGT compatibility scores...</div>
                ) : candidatePartners.length === 0 ? (
                  <div className="admin-manual-empty">
                    No eligible {targetGender === "male" ? "male" : "female"} candidate found for this student.
                  </div>
                ) : (
                  <>
                    <div className="admin-manual-search-box">
                      <input
                        type="text"
                        placeholder={`Filter ${candidatePartners.length} eligible candidates...`}
                        value={candidateFilterQuery}
                        onChange={(e) => setCandidateFilterQuery(e.target.value)}
                      />
                    </div>

                    <div className="admin-manual-candidate-list">
                      {candidatePartners
                        .filter((c) => {
                          if (!candidateFilterQuery.trim()) return true;
                          const q = candidateFilterQuery.toLowerCase();
                          return (
                            (c.fullName || "").toLowerCase().includes(q) ||
                            (c.email || "").toLowerCase().includes(q) ||
                            (c.branch || "").toLowerCase().includes(q)
                          );
                        })
                        .map((cand) => {
                          const isSelected = selectedCandidate?.userId === cand.userId;
                          const scoreColor =
                            cand.compatibilityScore >= 80
                              ? "#4ade80"
                              : cand.compatibilityScore >= 60
                              ? "#fbbf24"
                              : "#f87171";

                          return (
                            <div
                              key={cand.userId}
                              className={`admin-candidate-card ${isSelected ? "is-selected" : ""}`}
                              onClick={() => setSelectedCandidate(cand)}
                            >
                              <div className="admin-candidate-top">
                                <div className="admin-candidate-user">
                                  <div className="admin-student-avatar-wrap">
                                    {cand.avatarUrl ? (
                                      <img src={cand.avatarUrl} alt="" className="admin-student-avatar" />
                                    ) : (
                                      <div className="admin-student-avatar-placeholder">
                                        {cand.fullName?.[0] || "?"}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="admin-student-name-row">
                                      <strong>{cand.fullName}</strong>
                                      <span className={`admin-gender-chip ${cand.gender}`}>
                                        {cand.gender === "female" ? "🌸 Girl" : "⚡ Boy"}
                                      </span>
                                    </div>
                                    <div className="admin-student-sub">{cand.email}</div>
                                  </div>
                                </div>

                                <div
                                  className="admin-compat-badge"
                                  style={{ borderColor: scoreColor, color: scoreColor }}
                                >
                                  {cand.compatibilityScore}% Match
                                </div>
                              </div>

                              <div className="admin-candidate-details">
                                <div className="admin-candidate-meta">
                                  <span>{cand.branch || "Campus"} {cand.year ? `• Year ${cand.year}` : ""}</span>
                                  {cand.instagramHandle && <span>• @{cand.instagramHandle}</span>}
                                </div>
                                {cand.vibes && cand.vibes.length > 0 && (
                                  <div className="admin-candidate-vibes">
                                    {cand.vibes.slice(0, 3).map((v, vi) => (
                                      <span key={vi} className="admin-vibe-tag">
                                        #{v}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* STEP 3 & ACTIONS */}
            <div className="admin-manual-footer-controls">
              <div className="admin-manual-options">
                <label className="admin-toggle-label">
                  <input
                    type="checkbox"
                    checked={instantRevealPair}
                    onChange={(e) => setInstantRevealPair(e.target.checked)}
                  />
                  <span>
                    <strong>Instant Mutual Reveal:</strong> Unlock full real names, avatars & Instagram handles immediately (bypasses anonymous chat reveal).
                  </span>
                </label>

                <div className="admin-manual-custom-headline">
                  <input
                    type="text"
                    placeholder="Optional pairing note/headline (e.g., 'Curated Dandiya Duo ⭐')..."
                    value={customPairHeadline}
                    onChange={(e) => setCustomPairHeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-modal-btn-cancel"
                  onClick={() => setShowManualPairModal(false)}
                  disabled={actionInProgress}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn-manual-pair-submit"
                  disabled={!selectedStudent1 || !selectedCandidate || actionInProgress}
                  onClick={handleExecuteManualPair}
                >
                  {actionInProgress ? (
                    "Pairing..."
                  ) : (
                    `⚡ Confirm & Pair ${selectedStudent1?.fullName ? selectedStudent1.fullName.split(" ")[0] : "Student 1"} + ${selectedCandidate?.fullName ? selectedCandidate.fullName.split(" ")[0] : "Student 2"}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminMatches;
