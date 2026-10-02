import { useEffect, useMemo, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { API_URL } from "../config";
import "./AdminDashboard.css";
import "./AdminInfluencers.css";

function AdminInfluencers() {
  const token = localStorage.getItem("sgt_admin_token");

  // Data states
  const [influencers, setInfluencers] = useState([]);
  const [summary, setSummary] = useState({
    totalInfluencers: 0,
    totalConversions: 0,
    totalRevenue: 0,
    totalDiscountGiven: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [actionInProgress, setActionInProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL", "ACTIVE", "INACTIVE"
  const [copiedCode, setCopiedCode] = useState("");

  // Modal 1: Add Influencer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInfluencerName, setNewInfluencerName] = useState("");
  const [newInfluencerEmail, setNewInfluencerEmail] = useState("");
  const [newCustomCode, setNewCustomCode] = useState("");
  const [newDiscount499, setNewDiscount499] = useState(150);
  const [newDiscount999, setNewDiscount999] = useState(250);
  const [newNotes, setNewNotes] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Modal 2: Customer Conversions Modal
  const [conversionsModalData, setConversionsModalData] = useState(null);
  const [isLoadingConversions, setIsLoadingConversions] = useState(false);

  // Modal 3: View Payment Screenshot
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState(null);

  useEffect(() => {
    if (!token) {
      window.location.assign("/admin/login");
      return;
    }
    loadInfluencers();
  }, [token]);

  const loadInfluencers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/influencers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("sgt_admin_token");
        window.location.assign("/admin/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setInfluencers(data.influencers || []);
        setSummary(
          data.summary || {
            totalInfluencers: 0,
            totalConversions: 0,
            totalRevenue: 0,
            totalDiscountGiven: 0,
          },
        );
      } else {
        throw new Error("Failed to load influencer records.");
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message || "Failed to reach server." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const handleAutoGenerateCode = async () => {
    if (!newInfluencerName.trim()) {
      setAlert({ type: "error", message: "Please enter the influencer's name first." });
      return;
    }
    setIsGeneratingCode(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/influencers/generate-code?name=${encodeURIComponent(
          newInfluencerName.trim(),
        )}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setNewCustomCode(data.code);
      }
    } catch (err) {
      console.error("Code generation error:", err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleAddInfluencer = async (e) => {
    e.preventDefault();
    if (!newInfluencerName.trim() || !newInfluencerEmail.trim()) {
      setAlert({ type: "error", message: "Influencer name and email are required." });
      return;
    }

    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/influencers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          influencerName: newInfluencerName.trim(),
          influencerEmail: newInfluencerEmail.trim(),
          customCode: newCustomCode.trim(),
          discount499: Number(newDiscount499) || 150,
          discount999: Number(newDiscount999) || 250,
          notes: newNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create influencer promo code.");
      }

      setAlert({ type: "success", message: data.message });
      setShowAddModal(false);
      setNewInfluencerName("");
      setNewInfluencerEmail("");
      setNewCustomCode("");
      setNewNotes("");
      loadInfluencers();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleToggleStatus = async (influencerId) => {
    setActionInProgress(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/influencers/${influencerId}/toggle-status`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to toggle status.");

      setAlert({ type: "success", message: data.message });
      loadInfluencers();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleViewConversions = async (influencerId) => {
    setIsLoadingConversions(true);
    setConversionsModalData(null);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/influencers/${influencerId}/conversions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setConversionsModalData(data);
      } else {
        throw new Error("Failed to load conversions.");
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setIsLoadingConversions(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sgt_admin_token");
    window.location.assign("/admin/login");
  };

  // Filtered list
  const filteredInfluencers = useMemo(() => {
    return influencers.filter((inf) => {
      if (statusFilter === "ACTIVE" && !inf.isActive) return false;
      if (statusFilter === "INACTIVE" && inf.isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (inf.influencerName || "").toLowerCase();
        const email = (inf.influencerEmail || "").toLowerCase();
        const code = (inf.code || "").toLowerCase();
        const notes = (inf.notes || "").toLowerCase();
        return name.includes(q) || email.includes(q) || code.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [influencers, statusFilter, searchQuery]);

  return (
    <main className="admin-page">
      <Background />
      <div className="admin-shell">
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1>
              SGT <em>Influencer Promo Code Hub.</em>
            </h1>
            <p>
              Generate unique promo codes for campus influencers, track customer conversions, and audit student discounts.
            </p>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-btn-add-influencer"
              onClick={() => setShowAddModal(true)}
            >
              ➕ Add New Influencer
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

        {/* Global Navigation Tabs */}
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
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/matches")}
          >
            ✨ Dandiya Matchmaker
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
            className="admin-tab-btn is-active"
          >
            🌟 Influencer Promos
            <span className="admin-tab-count">{summary.totalConversions} Paid</span>
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

        {/* 4 Metrics Stats Cards */}
        <div className="admin-match-stats-grid">
          <div className="admin-stat-card gold">
            <span className="admin-stat-label">🌟 Registered Campus Influencers</span>
            <strong className="admin-stat-val">{summary.totalInfluencers}</strong>
            <span className="admin-stat-sub">Active marketing partners</span>
          </div>

          <div className="admin-stat-card purple">
            <span className="admin-stat-label">🎟️ Paid Customers Converted</span>
            <strong className="admin-stat-val">{summary.totalConversions}</strong>
            <span className="admin-stat-sub">Approved student payments with code</span>
          </div>

          <div className="admin-stat-card green-accent">
            <span className="admin-stat-label">💰 Revenue Generated</span>
            <strong className="admin-stat-val">₹{summary.totalRevenue.toLocaleString()}</strong>
            <span className="admin-stat-sub">Total gross revenue from promo passes</span>
          </div>

          <div className="admin-stat-card red">
            <span className="admin-stat-label">🏷️ Student Discounts Given</span>
            <strong className="admin-stat-val">₹{summary.totalDiscountGiven.toLocaleString()}</strong>
            <span className="admin-stat-sub">₹150 / ₹250 savings per student</span>
          </div>
        </div>

        {/* Toolbar: Filters & Search */}
        <div className="admin-toolbar">
          <div className="admin-filter-group">
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "ALL" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All Influencer Codes ({influencers.length})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "ACTIVE" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              🟢 Active ({influencers.filter((i) => i.isActive).length})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "INACTIVE" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("INACTIVE")}
            >
              🔴 Inactive ({influencers.filter((i) => !i.isActive).length})
            </button>
          </div>

          <div className="admin-search-wrap">
            <input
              type="text"
              placeholder="Search by influencer name, email, promo code, notes..."
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

        {/* Influencers Cards List */}
        {isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: "4rem" }}>
            <Loader label="Loading influencer promo registry..." />
          </div>
        ) : filteredInfluencers.length === 0 ? (
          <div className="admin-influencer-empty">
            <h3>No Influencer Promo Codes Found</h3>
            <p>
              {searchQuery || statusFilter !== "ALL"
                ? "Try resetting your search filters."
                : "No influencers have been added yet. Click 'Add New Influencer' above to generate your first promo code!"}
            </p>
          </div>
        ) : (
          <div className="admin-influencer-grid">
            {filteredInfluencers.map((inf) => {
              return (
                <div
                  key={inf._id}
                  className={`admin-influencer-card ${!inf.isActive ? "is-inactive" : ""}`}
                >
                  <div className="admin-inf-card-header">
                    <div>
                      <h3 className="admin-inf-name">{inf.influencerName}</h3>
                      <span className="admin-inf-email">{inf.influencerEmail}</span>
                    </div>

                    <span className={`admin-inf-status-badge ${inf.isActive ? "active" : "inactive"}`}>
                      {inf.isActive ? "🟢 ACTIVE" : "🔴 INACTIVE"}
                    </span>
                  </div>

                  {/* Promo Code Box */}
                  <div className="admin-inf-code-container">
                    <div className="admin-inf-code-label">PROMO CODE</div>
                    <div className="admin-inf-code-row">
                      <span className="admin-inf-code-text">{inf.code}</span>
                      <button
                        type="button"
                        className="admin-inf-copy-btn"
                        onClick={() => handleCopyCode(inf.code)}
                        title="Copy code to clipboard"
                      >
                        {copiedCode === inf.code ? "Copied! ✓" : "📋 Copy"}
                      </button>
                    </div>
                    <div className="admin-inf-discount-rates">
                      <span>₹499 Plan ➔ ₹150 OFF (Pay ₹349)</span>
                      <span>₹999 Plan ➔ ₹250 OFF (Pay ₹749)</span>
                    </div>
                  </div>

                  {/* Analytics Stats */}
                  <div className="admin-inf-metrics-grid">
                    <div className="admin-inf-metric-item">
                      <span className="admin-inf-metric-label">Paid Customers</span>
                      <strong className="admin-inf-metric-val">{inf.conversions || 0}</strong>
                    </div>

                    <div className="admin-inf-metric-item">
                      <span className="admin-inf-metric-label">Revenue</span>
                      <strong className="admin-inf-metric-val">
                        ₹{(inf.totalRevenue || 0).toLocaleString()}
                      </strong>
                    </div>

                    <div className="admin-inf-metric-item">
                      <span className="admin-inf-metric-label">Discount Given</span>
                      <strong className="admin-inf-metric-val">
                        ₹{(inf.totalDiscountGiven || 0).toLocaleString()}
                      </strong>
                    </div>

                    <div className="admin-inf-metric-item">
                      <span className="admin-inf-metric-label">Pending Verification</span>
                      <strong className="admin-inf-metric-val" style={{ color: inf.pendingVerifications ? "#fbbf24" : "inherit" }}>
                        {inf.pendingVerifications || 0}
                      </strong>
                    </div>
                  </div>

                  {inf.notes && (
                    <div className="admin-inf-notes">
                      <strong>Notes:</strong> {inf.notes}
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="admin-inf-actions">
                    <button
                      type="button"
                      className="admin-btn-view-conversions"
                      onClick={() => handleViewConversions(inf._id)}
                    >
                      👥 View Paid Customers ({inf.conversions || 0})
                    </button>

                    <button
                      type="button"
                      className={`admin-btn-toggle-inf ${inf.isActive ? "btn-deactivate" : "btn-activate"}`}
                      onClick={() => handleToggleStatus(inf._id)}
                      disabled={actionInProgress}
                    >
                      {inf.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================================
          MODAL 1: ADD NEW INFLUENCER & GENERATE PROMO CODE
          ========================================================== */}
      {showAddModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setShowAddModal(false)}
        >
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px" }}
          >
            <h3>🌟 Register New Campus Influencer</h3>
            <p>
              Enter the influencer&apos;s details to generate a unique uppercase promo code with automated ₹150 / ₹250 pricing discounts.
            </p>

            <form onSubmit={handleAddInfluencer} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", color: "rgba(255, 248, 242, 0.8)", fontWeight: "600" }}>
                  Influencer Full Name: <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newInfluencerName}
                  onChange={(e) => {
                    setNewInfluencerName(e.target.value);
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.9rem",
                    color: "#fff8f2",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", color: "rgba(255, 248, 242, 0.8)", fontWeight: "600" }}>
                  Influencer Email Address: <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. priyasharma@gmail.com"
                  value={newInfluencerEmail}
                  onChange={(e) => setNewInfluencerEmail(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.9rem",
                    color: "#fff8f2",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.82rem", color: "rgba(255, 248, 242, 0.8)", fontWeight: "600" }}>
                    Promo Code (Uppercase, Guaranteed Unique):
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    disabled={isGeneratingCode || !newInfluencerName.trim()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f4c66c",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {isGeneratingCode ? "Generating..." : "⚡ Auto-Generate from Name"}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate (e.g. PRIYA150)"
                  value={newCustomCode}
                  onChange={(e) => setNewCustomCode(e.target.value.toUpperCase())}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.9rem",
                    color: "#f4c66c",
                    fontSize: "1rem",
                    fontWeight: "800",
                    letterSpacing: "0.05em",
                    outline: "none",
                    textTransform: "uppercase",
                  }}
                />
                <span style={{ fontSize: "0.72rem", color: "rgba(255, 248, 242, 0.5)" }}>
                  If blank, the system automatically creates an uppercase code combining their <strong>First Name + Numbers</strong> (e.g. PRIYA150, PRIYA50, PRIYA2024) with guaranteed zero DB duplicates.
                </span>
              </div>

              {/* Discount Rules Preview */}
              <div
                style={{
                  background: "rgba(244, 198, 108, 0.08)",
                  border: "1px solid rgba(244, 198, 108, 0.25)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  fontSize: "0.8rem",
                  color: "#f4c66c",
                }}
              >
                <strong>💰 Automated Pricing Discount Rules:</strong>
                <span>• ₹499 Vibe Plan ➔ ₹150 OFF (Student pays <strong>₹349</strong>)</span>
                <span>• ₹999 Premium Plan ➔ ₹250 OFF (Student pays <strong>₹749</strong>)</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", color: "rgba(255, 248, 242, 0.8)", fontWeight: "600" }}>
                  Notes / Social Handle (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Instagram @priya_vibes • 45k followers"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    padding: "0.65rem 0.9rem",
                    color: "#fff8f2",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-modal-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionInProgress}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-approve"
                  disabled={actionInProgress || !newInfluencerName.trim() || !newInfluencerEmail.trim()}
                  style={{ padding: "0.75rem 1.5rem" }}
                >
                  {actionInProgress ? "Saving..." : "🌟 Save & Activate Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 2: CUSTOMER CONVERSIONS BREAKDOWN
          ========================================================== */}
      {conversionsModalData && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setConversionsModalData(null)}
        >
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "880px", width: "95%", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem" }}>
                  👥 Converted Paid Customers for {conversionsModalData.influencer.influencerName}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255, 248, 242, 0.7)" }}>
                  Promo Code: <strong>{conversionsModalData.influencer.code}</strong> · {conversionsModalData.influencer.influencerEmail}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-icon"
                onClick={() => setConversionsModalData(null)}
              >
                ✕
              </button>
            </div>

            {/* Summary badges */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", margin: "1rem 0" }}>
              <div className="admin-conversions-summary-pill">
                <span>Approved Conversions:</span>
                <strong>{conversionsModalData.influencer.totalApprovedCustomers}</strong>
              </div>
              <div className="admin-conversions-summary-pill gold">
                <span>Total Revenue:</span>
                <strong>₹{conversionsModalData.influencer.totalRevenue.toLocaleString()}</strong>
              </div>
              <div className="admin-conversions-summary-pill">
                <span>Total Discounts Given:</span>
                <strong>₹{conversionsModalData.influencer.totalDiscount.toLocaleString()}</strong>
              </div>
            </div>

            {/* Customers list */}
            {conversionsModalData.customers.length === 0 ? (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "rgba(255, 248, 242, 0.5)" }}>
                No customer payments submitted with this promo code yet.
              </div>
            ) : (
              <div className="admin-conversions-table-wrap">
                <table className="admin-conversions-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Paid Amount</th>
                      <th>Discount</th>
                      <th>UTR / Transaction</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversionsModalData.customers.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div className="admin-conversions-avatar">
                              {c.studentName?.[0] || "?"}
                            </div>
                            <div>
                              <strong>{c.studentName}</strong>
                              <div style={{ fontSize: "0.75rem", color: "rgba(255, 248, 242, 0.6)" }}>
                                {c.userEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="admin-conversions-plan">{c.planName}</span>
                        </td>
                        <td>
                          <strong>₹{c.amount}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: "700" }}>-₹{c.discountAmount}</span>
                        </td>
                        <td>
                          <span className="admin-conversions-utr">{c.utr || "N/A"}</span>
                        </td>
                        <td>
                          <span className={`admin-conversions-status ${c.status.toLowerCase()}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.78rem", color: "rgba(255, 248, 242, 0.6)" }}>
                          {new Date(c.submittedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-modal-actions" style={{ marginTop: "1.25rem" }}>
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setConversionsModalData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminInfluencers;
