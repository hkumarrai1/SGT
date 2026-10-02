import { useEffect, useMemo, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { API_URL } from "../config";
import "./AdminDashboard.css";
import "./AdminInfluencers.css";
import "./AdminOfferCodes.css";

function AdminOfferCodes() {
  const token = localStorage.getItem("sgt_admin_token");

  // Data states
  const [offerCodes, setOfferCodes] = useState([]);
  const [summary, setSummary] = useState({
    totalOfferCodes: 0,
    activeOfferCodes: 0,
    totalUses: 0,
    totalRevenue: 0,
    totalDiscountGiven: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [actionInProgress, setActionInProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE, EXHAUSTED
  const [copiedCode, setCopiedCode] = useState("");

  // Modal 1: Create Offer Code Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [codeName, setCodeName] = useState("");
  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE"); // "PERCENTAGE" or "FLAT"
  const [discountPercentage, setDiscountPercentage] = useState(50);
  const [discount499, setDiscount499] = useState(150);
  const [discount999, setDiscount999] = useState(250);
  const [maxUses, setMaxUses] = useState(10); // Usage limit / kitne times use honge
  const [isUnlimitedUses, setIsUnlimitedUses] = useState(false);
  const [applicablePlans, setApplicablePlans] = useState("all"); // "all", "vibe", "premium"
  const [notes, setNotes] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Modal 2: Customer Redemptions Modal
  const [conversionsModalData, setConversionsModalData] = useState(null);
  const [isLoadingConversions, setIsLoadingConversions] = useState(false);

  useEffect(() => {
    if (!token) {
      window.location.assign("/admin/login");
      return;
    }
    loadOfferCodes();
  }, [token]);

  const loadOfferCodes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/offer-codes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("sgt_admin_token");
        window.location.assign("/admin/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setOfferCodes(data.offerCodes || []);
        setSummary(
          data.summary || {
            totalOfferCodes: 0,
            activeOfferCodes: 0,
            totalUses: 0,
            totalRevenue: 0,
            totalDiscountGiven: 0,
          },
        );
      } else {
        throw new Error("Failed to load offer code records.");
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
    setIsGeneratingCode(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/offer-codes/generate-code?title=${encodeURIComponent(
          title.trim() || "SGT",
        )}&discountPercentage=${discountPercentage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok && data.code) {
        setCodeName(data.code);
      }
    } catch (err) {
      const cleanTitle = (title.trim() || "SGT").slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, "");
      setCodeName(`${cleanTitle || "SGT"}${discountPercentage || 50}`);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCreateOfferCode = async (e) => {
    e.preventDefault();
    setActionInProgress(true);
    setAlert({ type: "", message: "" });

    try {
      const res = await fetch(`${API_URL}/api/admin/offer-codes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codeName.trim(),
          title: title.trim() || `Offer ${codeName.trim()}`,
          discountType,
          discountPercentage: discountType === "PERCENTAGE" ? Number(discountPercentage) : 0,
          discount499: Number(discount499) || 0,
          discount999: Number(discount999) || 0,
          maxUses: isUnlimitedUses ? 0 : Number(maxUses) || 0,
          applicablePlans,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create offer code.");
      }

      setAlert({
        type: "success",
        message: `🎉 Offer Code "${data.offerCode?.code || codeName}" created successfully!`,
      });

      // Reset form & close modal
      setCodeName("");
      setTitle("");
      setDiscountPercentage(50);
      setMaxUses(10);
      setIsUnlimitedUses(false);
      setNotes("");
      setShowAddModal(false);

      // Reload list
      loadOfferCodes();
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/offer-codes/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to toggle status.");

      setOfferCodes((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isActive: !currentStatus } : item,
        ),
      );

      setAlert({
        type: "success",
        message: `Offer code status updated to ${!currentStatus ? "ACTIVE" : "INACTIVE"}.`,
      });
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteOfferCode = async (id, codeStr) => {
    if (!window.confirm(`Are you sure you want to delete Offer Code "${codeStr}"?`)) {
      return;
    }
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/offer-codes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete offer code.");

      setOfferCodes((prev) => prev.filter((item) => item.id !== id));
      setAlert({
        type: "success",
        message: `Offer code "${codeStr}" deleted.`,
      });
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleOpenConversionsModal = async (id) => {
    setIsLoadingConversions(true);
    setConversionsModalData({ promo: {}, conversions: [] });
    try {
      const res = await fetch(`${API_URL}/api/admin/offer-codes/${id}/conversions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setConversionsModalData(data);
      } else {
        throw new Error(data.message || "Failed to load redemption details.");
      }
    } catch (err) {
      setAlert({ type: "error", message: err.message });
      setConversionsModalData(null);
    } finally {
      setIsLoadingConversions(false);
    }
  };

  // Filtered offer codes
  const filteredOfferCodes = useMemo(() => {
    return offerCodes.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.code.toLowerCase().includes(q) ||
        (item.title && item.title.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === "ACTIVE") return item.isActive && !item.isExhausted;
      if (statusFilter === "INACTIVE") return !item.isActive;
      if (statusFilter === "EXHAUSTED") return item.isExhausted;

      return true;
    });
  }, [offerCodes, searchQuery, statusFilter]);

  // Live price calculations for preview in modal
  const vibePreviewPrice = useMemo(() => {
    if (discountType === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
      if (pct === 100) return 0;
      return Math.max(0, 499 - Math.round((499 * pct) / 100));
    }
    return Math.max(0, 499 - (Number(discount499) || 0));
  }, [discountType, discountPercentage, discount499]);

  const premiumPreviewPrice = useMemo(() => {
    if (discountType === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
      if (pct === 100) return 0;
      return Math.max(0, 999 - Math.round((999 * pct) / 100));
    }
    return Math.max(0, 999 - (Number(discount999) || 0));
  }, [discountType, discountPercentage, discount999]);

  return (
    <main className="admin-page">
      <Background />
      <div className="admin-shell">
        {/* Top Header */}
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            <h1>Offer Codes &amp; Discounts <em>Hub</em></h1>
            <p>
              Configure discount codes up to 100% OFF, set maximum usage limits, and monitor redemptions.
            </p>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={loadOfferCodes}
              disabled={isLoading || actionInProgress}
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              className="admin-logout-btn"
              onClick={() => {
                localStorage.removeItem("sgt_admin_token");
                window.location.assign("/admin/login");
              }}
            >
              Log out ✕
            </button>
          </div>
        </div>

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
              justifyContent: "space-between",
              alignItems: "center",
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
            className="admin-tab-btn is-active"
          >
            🎟️ Offer Codes
            <span className="admin-tab-count">{summary.totalUses} Claimed</span>
          </button>
          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/influencers")}
          >
            🌟 Influencer Promos
          </button>
        </nav>

        {/* 4 Metrics Stats Cards */}
        <div className="admin-match-stats-grid">
          <div className="admin-stat-card gold">
            <span className="admin-stat-label">🎟️ Total Offer Codes</span>
            <strong className="admin-stat-val">{summary.totalOfferCodes}</strong>
            <span className="admin-stat-sub">{summary.activeOfferCodes} active campaigns</span>
          </div>

          <div className="admin-stat-card purple">
            <span className="admin-stat-label">👥 Total Redemptions</span>
            <strong className="admin-stat-val">{summary.totalUses}</strong>
            <span className="admin-stat-sub">Student passes claimed</span>
          </div>

          <div className="admin-stat-card green-accent">
            <span className="admin-stat-label">💰 Revenue Generated</span>
            <strong className="admin-stat-val">₹{summary.totalRevenue.toLocaleString()}</strong>
            <span className="admin-stat-sub">Net revenue from offer passes</span>
          </div>

          <div className="admin-stat-card red">
            <span className="admin-stat-label">🏷️ Student Discounts Given</span>
            <strong className="admin-stat-val">₹{summary.totalDiscountGiven.toLocaleString()}</strong>
            <span className="admin-stat-sub">Total savings unlocked</span>
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
              All Offer Codes ({offerCodes.length})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "ACTIVE" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Active ({offerCodes.filter((o) => o.isActive && !o.isExhausted).length})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "EXHAUSTED" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("EXHAUSTED")}
            >
              Limit Reached ({offerCodes.filter((o) => o.isExhausted).length})
            </button>
            <button
              type="button"
              className={`admin-filter-chip ${statusFilter === "INACTIVE" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("INACTIVE")}
            >
              Inactive ({offerCodes.filter((o) => !o.isActive).length})
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="admin-btn-add-influencer"
              onClick={() => setShowAddModal(true)}
            >
              + Create Offer Code
            </button>
          </div>
        </div>

        {/* Offer Cards Grid */}
        {isLoading ? (
          <div style={{ padding: "4rem 0", display: "grid", placeItems: "center" }}>
            <Loader label="Loading offer codes..." />
          </div>
        ) : filteredOfferCodes.length === 0 ? (
          <div className="admin-empty-state">
            <span style={{ fontSize: "2.5rem" }}>🎟️</span>
            <h3>No Offer Codes Found</h3>
            <p>
              {searchQuery || statusFilter !== "ALL"
                ? "No offer codes match your active search or filters."
                : "Click '+ Create Offer Code' above to create custom discount codes with usage limits."}
            </p>
          </div>
        ) : (
          <div className="admin-offers-grid">
            {filteredOfferCodes.map((item) => {
              const usagePercent = item.maxUses > 0
                ? Math.min(100, Math.round((item.totalUses / item.maxUses) * 100))
                : 0;

              return (
                <div
                  key={item.id}
                  className={`admin-offer-card ${!item.isActive ? "is-inactive" : ""} ${
                    item.isExhausted ? "is-exhausted" : ""
                  }`}
                >
                  {/* Header */}
                  <div className="admin-offer-header">
                    <div>
                      <h3 className="admin-offer-title">{item.title}</h3>
                      {item.notes && <p className="admin-offer-notes">{item.notes}</p>}
                    </div>

                    <button
                      type="button"
                      className={`admin-inf-status-badge ${
                        item.isActive ? "active" : "inactive"
                      }`}
                      style={{ border: "none", cursor: "pointer" }}
                      onClick={() => handleToggleStatus(item.id, item.isActive)}
                      title="Click to toggle status"
                    >
                      {item.isActive ? "● Active" : "○ Inactive"}
                    </button>
                  </div>

                  {/* Promo Code Box */}
                  <div className="admin-offer-code-box">
                    <span className="admin-offer-code-pill">{item.code}</span>
                    <button
                      type="button"
                      className="admin-offer-copy-btn"
                      onClick={() => handleCopyCode(item.code)}
                    >
                      {copiedCode === item.code ? "Copied! ✓" : "Copy Code"}
                    </button>
                  </div>

                  {/* Badges: Discount & Scope */}
                  <div className="admin-offer-badges">
                    {item.discountType === "PERCENTAGE" ? (
                      item.discountPercentage === 100 ? (
                        <span className="offer-badge offer-badge--free">
                          🎉 100% FREE PASS
                        </span>
                      ) : (
                        <span className="offer-badge offer-badge--pct">
                          ⚡ {item.discountPercentage}% OFF
                        </span>
                      )
                    ) : (
                      <span className="offer-badge offer-badge--flat">
                        🏷️ ₹{item.discount499} / ₹{item.discount999} OFF
                      </span>
                    )}

                    <span className="offer-badge offer-badge--scope">
                      {item.applicablePlans === "all"
                        ? "All Plans"
                        : item.applicablePlans === "vibe"
                        ? "Vibe (₹499)"
                        : "Premium (₹999)"}
                    </span>
                  </div>

                  {/* Usage Progress */}
                  <div className="admin-offer-usage">
                    <div className="admin-offer-usage-header">
                      <span>
                        Redemptions: <strong>{item.totalUses}</strong>
                        {item.maxUses > 0 ? ` / ${item.maxUses}` : " (Unlimited)"}
                      </span>
                      {item.maxUses > 0 ? (
                        <span style={{ fontWeight: 700, color: item.isExhausted ? "#ff6b8b" : "#f4c66c" }}>
                          {item.isExhausted ? "EXHAUSTED" : `${usagePercent}%`}
                        </span>
                      ) : (
                        <span style={{ color: "#a8e2b6", fontWeight: 600 }}>Active</span>
                      )}
                    </div>

                    {item.maxUses > 0 && (
                      <div className="admin-offer-usage-track">
                        <div
                          className={`admin-offer-usage-fill ${item.isExhausted ? "is-full" : ""}`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    )}

                    <div className="admin-offer-meta-strip">
                      <div className="admin-offer-meta-col">
                        <span>Revenue</span>
                        <strong style={{ color: "#2ecc71" }}>₹{item.totalRevenue}</strong>
                      </div>
                      <div className="admin-offer-meta-col">
                        <span>Discounts Given</span>
                        <strong style={{ color: "#ed709d" }}>₹{item.totalDiscountGiven}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="admin-offer-actions">
                    <button
                      type="button"
                      className="admin-offer-btn-conversions"
                      onClick={() => handleOpenConversionsModal(item.id)}
                    >
                      Redemptions ({item.totalUses}) ➔
                    </button>

                    <button
                      type="button"
                      className={`admin-offer-btn-toggle ${item.isActive ? "is-active" : ""}`}
                      onClick={() => handleToggleStatus(item.id, item.isActive)}
                    >
                      {item.isActive ? "Disable" : "Enable"}
                    </button>

                    <button
                      type="button"
                      className="admin-offer-btn-delete"
                      onClick={() => handleDeleteOfferCode(item.id, item.code)}
                      title="Delete offer code"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal 1: Create New Offer Code */}
        {showAddModal && (
          <div className="admin-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div
              className="admin-modal-card"
              style={{ maxWidth: "600px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div>
                  <span className="admin-kicker">DISCOUNT &amp; USAGE SETUP</span>
                  <h2>Create New Offer Code</h2>
                </div>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => setShowAddModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateOfferCode} className="admin-modal-form">
                {/* Code Name & Auto Generator */}
                <div className="admin-form-group">
                  <div className="admin-form-label">
                    <span>Offer Code String *</span>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#f4c66c",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "0.78rem",
                        textDecoration: "underline",
                      }}
                      onClick={handleAutoGenerateCode}
                      disabled={isGeneratingCode}
                    >
                      {isGeneratingCode ? "Generating..." : "✨ Auto-generate"}
                    </button>
                  </div>
                  <input
                    id="codeName"
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. DANDIYA50, FREESTUDENT, SGT100"
                    value={codeName}
                    onChange={(e) =>
                      setCodeName(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                      )
                    }
                    required
                    autoFocus
                  />
                  <span className="admin-form-helper">
                    Unique code entered by students during checkout (e.g. FREEDANDIYA, SGT50).
                  </span>
                </div>

                {/* Campaign Title */}
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="title">Campaign / Offer Title</label>
                  <input
                    id="title"
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. Navratri 50% Flash Sale or VIP 100% Free Pass"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Discount Mode Selector */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Discount Mode</label>
                  <div className="offer-chips-wrap">
                    <button
                      type="button"
                      className={`offer-chip-btn ${discountType === "PERCENTAGE" ? "is-active" : ""}`}
                      onClick={() => setDiscountType("PERCENTAGE")}
                    >
                      Percentage (%) - Up to 100% OFF
                    </button>
                    <button
                      type="button"
                      className={`offer-chip-btn ${discountType === "FLAT" ? "is-active" : ""}`}
                      onClick={() => setDiscountType("FLAT")}
                    >
                      Flat Rupee Discount (₹)
                    </button>
                  </div>
                </div>

                {/* Percentage Discount Slider (Up to 100%) */}
                {discountType === "PERCENTAGE" && (
                  <div className="offer-slider-box">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff8f2" }}>
                        Discount Percentage
                      </span>
                      <span className="offer-slider-display">{discountPercentage}% OFF</span>
                    </div>

                    <div className="offer-slider-row">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                      />
                    </div>

                    <div className="offer-chips-wrap">
                      {[10, 20, 25, 30, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          className={`offer-chip-btn ${discountPercentage === pct ? "is-active" : ""}`}
                          onClick={() => setDiscountPercentage(pct)}
                        >
                          {pct === 100 ? "🎉 100% FREE" : `${pct}% OFF`}
                        </button>
                      ))}
                    </div>

                    <div className="offer-preview-grid">
                      <div className={`offer-preview-card ${vibePreviewPrice === 0 ? "is-free" : ""}`}>
                        <span>Vibe Pass (₹499) ➔</span>
                        <strong>{vibePreviewPrice === 0 ? "₹0 (FREE PASS)" : `₹${vibePreviewPrice}`}</strong>
                      </div>
                      <div className={`offer-preview-card ${premiumPreviewPrice === 0 ? "is-free" : ""}`}>
                        <span>Premium Pass (₹999) ➔</span>
                        <strong>{premiumPreviewPrice === 0 ? "₹0 (FREE PASS)" : `₹${premiumPreviewPrice}`}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flat Rupee Mode */}
                {discountType === "FLAT" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="discount499">₹499 Plan Discount (₹)</label>
                      <input
                        id="discount499"
                        type="number"
                        className="admin-form-input"
                        min="0"
                        max="499"
                        value={discount499}
                        onChange={(e) => setDiscount499(e.target.value)}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="discount999">₹999 Plan Discount (₹)</label>
                      <input
                        id="discount999"
                        type="number"
                        className="admin-form-input"
                        min="0"
                        max="999"
                        value={discount999}
                        onChange={(e) => setDiscount999(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Usage Limit ("Kitne times use honge wo") */}
                <div className="admin-form-group">
                  <div className="admin-form-label">
                    <span>Usage Limit (Kitne Times Use Honge)</span>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.78rem" }}>
                      <input
                        type="checkbox"
                        checked={isUnlimitedUses}
                        onChange={(e) => setIsUnlimitedUses(e.target.checked)}
                      />
                      <span>Unlimited Uses</span>
                    </label>
                  </div>

                  {!isUnlimitedUses ? (
                    <div>
                      <input
                        id="maxUses"
                        type="number"
                        className="admin-form-input"
                        min="1"
                        max="100000"
                        placeholder="e.g. 10 or 50 times"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        required={!isUnlimitedUses}
                      />
                      <div className="offer-chips-wrap">
                        {[1, 5, 10, 20, 50, 100, 500].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`offer-chip-btn ${maxUses === num && !isUnlimitedUses ? "is-active" : ""}`}
                            onClick={() => {
                              setMaxUses(num);
                              setIsUnlimitedUses(false);
                            }}
                          >
                            {num === 1 ? "1 Single Use" : `${num} Uses`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "0.7rem 0.9rem", background: "rgba(74, 222, 128, 0.1)", borderRadius: "10px", border: "1px solid rgba(74, 222, 128, 0.3)", color: "#4ade80", fontSize: "0.85rem" }}>
                      ✓ This code can be used unlimited times until manually disabled.
                    </div>
                  )}
                </div>

                {/* Plan Scope */}
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="applicablePlans">Applicable Plans</label>
                  <select
                    id="applicablePlans"
                    className="admin-form-select"
                    value={applicablePlans}
                    onChange={(e) => setApplicablePlans(e.target.value)}
                  >
                    <option value="all">All Plans (Both ₹499 &amp; ₹999)</option>
                    <option value="vibe">Vibe Plan Only (₹499)</option>
                    <option value="premium">Premium Dandiya Plan Only (₹999)</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="notes">Internal Notes (Optional)</label>
                  <input
                    id="notes"
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. VIP Pass for College Head or Fest Team"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="admin-btn-cancel"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-btn-confirm"
                    disabled={actionInProgress || !codeName.trim()}
                  >
                    {actionInProgress ? "Creating..." : "Save & Activate Offer Code →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Customer Redemptions Viewer */}
        {conversionsModalData && (
          <div
            className="admin-modal-overlay"
            onClick={() => setConversionsModalData(null)}
          >
            <div
              className="admin-modal-card"
              style={{ maxWidth: "800px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div>
                  <span className="admin-kicker">REDEMPTION RECORDS</span>
                  <h2>Redemptions for: {conversionsModalData.promo?.code}</h2>
                </div>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => setConversionsModalData(null)}
                >
                  ✕
                </button>
              </div>

              {isLoadingConversions ? (
                <div style={{ padding: "3rem", textAlign: "center" }}>
                  <Loader label="Loading customer redemptions..." />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  {/* Summary */}
                  <div className="admin-match-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div className="admin-stat-card purple">
                      <span className="admin-stat-label">Total Redemptions</span>
                      <strong className="admin-stat-val">{conversionsModalData.conversions?.length || 0}</strong>
                    </div>
                    <div className="admin-stat-card green-accent">
                      <span className="admin-stat-label">Net Revenue</span>
                      <strong className="admin-stat-val">
                        ₹{(conversionsModalData.promo?.totalRevenue || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="admin-stat-card red">
                      <span className="admin-stat-label">Total Discounts</span>
                      <strong className="admin-stat-val">
                        ₹{(conversionsModalData.promo?.totalDiscountGiven || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Table */}
                  {conversionsModalData.conversions?.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "rgba(255, 248, 242, 0.6)" }}>
                      <p>No students have redeemed this code yet.</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                      <table className="admin-table" style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                            <th style={{ padding: "0.6rem 0.8rem" }}>Student</th>
                            <th style={{ padding: "0.6rem 0.8rem" }}>College</th>
                            <th style={{ padding: "0.6rem 0.8rem" }}>Plan</th>
                            <th style={{ padding: "0.6rem 0.8rem" }}>Discount</th>
                            <th style={{ padding: "0.6rem 0.8rem" }}>Paid</th>
                            <th style={{ padding: "0.6rem 0.8rem" }}>UTR</th>
                            <th style={{ padding: "0.6rem 0.8rem" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversionsModalData.conversions.map((conv) => (
                            <tr key={conv.paymentId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <td style={{ padding: "0.6rem 0.8rem" }}>
                                <div>
                                  <strong>{conv.studentName}</strong>
                                  <small style={{ display: "block", color: "rgba(255,248,242,0.6)" }}>
                                    {conv.studentEmail}
                                  </small>
                                </div>
                              </td>
                              <td style={{ padding: "0.6rem 0.8rem" }}>{conv.collegeName}</td>
                              <td style={{ padding: "0.6rem 0.8rem" }}>
                                <span style={{ textTransform: "capitalize", color: "#f4c66c" }}>
                                  {conv.plan}
                                </span>
                              </td>
                              <td style={{ padding: "0.6rem 0.8rem", color: "#ed709d" }}>-₹{conv.discountAmount}</td>
                              <td style={{ padding: "0.6rem 0.8rem", fontWeight: "bold", color: "#2ecc71" }}>
                                ₹{conv.paidAmount}
                              </td>
                              <td style={{ padding: "0.6rem 0.8rem" }}>
                                <code style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.08)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                                  {conv.utr || "N/A"}
                                </code>
                              </td>
                              <td style={{ padding: "0.6rem 0.8rem" }}>
                                <span
                                  className={`admin-inf-status-badge ${
                                    conv.status === "APPROVED"
                                      ? "active"
                                      : "inactive"
                                  }`}
                                  style={{ cursor: "default" }}
                                >
                                  {conv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="admin-modal-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="admin-modal-cancel-btn"
                  onClick={() => setConversionsModalData(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminOfferCodes;
