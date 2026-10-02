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

  // Modal 3: View Screenshot
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState(null);

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
      // Fallback generator
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
        <header className="admin-header">
          <div className="admin-header-brand">
            <span className="admin-kicker">SGT CONTROL PANEL</span>
            <h1>Offer Code Hub</h1>
            <p className="admin-subtitle">
              Configure discount codes up to 100% OFF, set maximum usage limits, and monitor redemptions.
            </p>
          </div>

          <div className="admin-header-actions">
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
        </header>

        {/* Global Toast Alert */}
        {alert.message && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "12px",
              background:
                alert.type === "error"
                  ? "rgba(232, 93, 67, 0.2)"
                  : "rgba(46, 204, 113, 0.2)",
              border: `1px solid ${
                alert.type === "error" ? "rgba(232, 93, 67, 0.5)" : "rgba(46, 204, 113, 0.5)"
              }`,
              color: alert.type === "error" ? "#ff9d8b" : "#72e9a5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <span>{alert.message}</span>
            <button
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

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/dashboard")}
          >
            <span>💳 Payment Proofs</span>
          </button>

          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/dashboard")}
          >
            <span>🎓 Verifications</span>
          </button>

          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/matches")}
          >
            <span>✨ Dandiya Matchmaker</span>
          </button>

          <button
            type="button"
            className="admin-tab-btn is-active"
            onClick={() => {}}
          >
            <span>🎟️ Offer Codes</span>
          </button>

          <button
            type="button"
            className="admin-tab-btn"
            onClick={() => window.location.assign("/admin/influencers")}
          >
            <span>🌟 Influencer Promos</span>
          </button>
        </div>

        {/* Summary Metrics Cards */}
        <section className="admin-metrics-grid">
          <div className="admin-metric-card">
            <span className="admin-metric-label">Total Offer Codes</span>
            <strong className="admin-metric-val">{summary.totalOfferCodes || 0}</strong>
            <small className="admin-metric-sub">
              {summary.activeOfferCodes || 0} active codes
            </small>
          </div>

          <div className="admin-metric-card" style={{ borderColor: "rgba(244, 198, 108, 0.4)" }}>
            <span className="admin-metric-label">Total Redemptions</span>
            <strong className="admin-metric-val" style={{ color: "#f4c66c" }}>
              {summary.totalUses || 0}
            </strong>
            <small className="admin-metric-sub">Student passes claimed</small>
          </div>

          <div className="admin-metric-card" style={{ borderColor: "rgba(237, 112, 157, 0.4)" }}>
            <span className="admin-metric-label">Discounts Granted</span>
            <strong className="admin-metric-val" style={{ color: "#ed709d" }}>
              ₹{summary.totalDiscountGiven || 0}
            </strong>
            <small className="admin-metric-sub">Total savings provided</small>
          </div>

          <div className="admin-metric-card" style={{ borderColor: "rgba(46, 204, 113, 0.4)" }}>
            <span className="admin-metric-label">Revenue Driven</span>
            <strong className="admin-metric-val" style={{ color: "#2ecc71" }}>
              ₹{summary.totalRevenue || 0}
            </strong>
            <small className="admin-metric-sub">Net revenue from offer codes</small>
          </div>
        </section>

        {/* Action Bar */}
        <section className="inf-action-bar">
          <div className="inf-search-wrap">
            <input
              type="text"
              className="inf-search-input"
              placeholder="Search by code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="inf-clear-search"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="inf-filters">
            <div className="inf-filter-group">
              <button
                type="button"
                className={`inf-filter-btn ${statusFilter === "ALL" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("ALL")}
              >
                All ({offerCodes.length})
              </button>
              <button
                type="button"
                className={`inf-filter-btn ${statusFilter === "ACTIVE" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("ACTIVE")}
              >
                Active ({offerCodes.filter((o) => o.isActive && !o.isExhausted).length})
              </button>
              <button
                type="button"
                className={`inf-filter-btn ${statusFilter === "EXHAUSTED" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("EXHAUSTED")}
              >
                Exhausted ({offerCodes.filter((o) => o.isExhausted).length})
              </button>
              <button
                type="button"
                className={`inf-filter-btn ${statusFilter === "INACTIVE" ? "is-active" : ""}`}
                onClick={() => setStatusFilter("INACTIVE")}
              >
                Inactive ({offerCodes.filter((o) => !o.isActive).length})
              </button>
            </div>

            <button
              type="button"
              className="inf-add-btn"
              onClick={() => setShowAddModal(true)}
            >
              + Create Offer Code
            </button>
          </div>
        </section>

        {/* Offer Codes Table */}
        <section className="inf-table-wrap">
          {isLoading ? (
            <div className="inf-loading-wrap">
              <Loader label="Loading offer codes..." />
            </div>
          ) : filteredOfferCodes.length === 0 ? (
            <div className="inf-empty-state">
              <span className="inf-empty-icon">🎟️</span>
              <h3>No Offer Codes Found</h3>
              <p>
                {searchQuery || statusFilter !== "ALL"
                  ? "No offer codes match your active filters."
                  : "Click '+ Create Offer Code' above to create custom discount codes with usage limits."}
              </p>
            </div>
          ) : (
            <table className="inf-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title / Campaign</th>
                  <th>Discount</th>
                  <th>Usage / Redemptions</th>
                  <th>Applicable Plan</th>
                  <th>Status</th>
                  <th>Revenue Driven</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOfferCodes.map((item) => {
                  const usagePercent = item.maxUses > 0
                    ? Math.min(100, Math.round((item.totalUses / item.maxUses) * 100))
                    : 0;

                  return (
                    <tr key={item.id}>
                      {/* Code */}
                      <td>
                        <div className="inf-code-pill-wrap">
                          <span className="inf-code-pill">{item.code}</span>
                          <button
                            type="button"
                            className="inf-copy-btn"
                            title="Copy code"
                            onClick={() => handleCopyCode(item.code)}
                          >
                            {copiedCode === item.code ? "Copied! ✓" : "Copy"}
                          </button>
                        </div>
                      </td>

                      {/* Title */}
                      <td>
                        <div className="inf-name-cell">
                          <strong>{item.title}</strong>
                          {item.notes && <small className="inf-email">{item.notes}</small>}
                        </div>
                      </td>

                      {/* Discount Badge */}
                      <td>
                        {item.discountType === "PERCENTAGE" ? (
                          item.discountPercentage === 100 ? (
                            <span className="offer-type-badge offer-type-badge--free">
                              🎉 100% FREE PASS
                            </span>
                          ) : (
                            <span className="offer-type-badge offer-type-badge--pct">
                              ⚡ {item.discountPercentage}% OFF
                            </span>
                          )
                        ) : (
                          <span className="offer-type-badge offer-type-badge--flat">
                            ₹{item.discount499} / ₹{item.discount999} OFF
                          </span>
                        )}
                      </td>

                      {/* Usage / Progress Bar */}
                      <td>
                        <div className="offer-usage-cell">
                          <div className="offer-usage-text">
                            {item.maxUses > 0 ? (
                              <>
                                <span>
                                  <strong>{item.totalUses}</strong> / {item.maxUses} used
                                </span>
                                <span>{usagePercent}%</span>
                              </>
                            ) : (
                              <>
                                <span><strong>{item.totalUses}</strong> uses</span>
                                <span className="offer-tag-unlimited">∞ Unlimited</span>
                              </>
                            )}
                          </div>
                          {item.maxUses > 0 && (
                            <div className="offer-usage-track">
                              <div
                                className={`offer-usage-fill ${item.isExhausted ? "offer-usage-fill--full" : ""}`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          )}
                          {item.isExhausted && (
                            <span className="offer-tag-exhausted">🔴 Limit Reached</span>
                          )}
                        </div>
                      </td>

                      {/* Plan Scope */}
                      <td>
                        <span style={{ fontSize: "0.8rem", textTransform: "capitalize", color: "#f4c66c" }}>
                          {item.applicablePlans === "all"
                            ? "All Plans (499 & 999)"
                            : item.applicablePlans === "vibe"
                            ? "Vibe Pass (₹499)"
                            : "Premium Pass (₹999)"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          type="button"
                          className={`inf-status-badge ${
                            item.isActive ? "is-active" : "is-inactive"
                          }`}
                          onClick={() => handleToggleStatus(item.id, item.isActive)}
                          disabled={actionInProgress}
                          title="Click to toggle status"
                        >
                          {item.isActive ? "● Active" : "○ Inactive"}
                        </button>
                      </td>

                      {/* Revenue */}
                      <td>
                        <div className="inf-conversions-cell">
                          <span className="inf-conv-rev">₹{item.totalRevenue}</span>
                          <small className="inf-conv-disc">₹{item.totalDiscountGiven} saved</small>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <button
                            type="button"
                            className="inf-view-btn"
                            onClick={() => handleOpenConversionsModal(item.id)}
                            title="View student redemptions"
                          >
                            Redemptions ({item.totalUses})
                          </button>
                          <button
                            type="button"
                            style={{
                              background: "rgba(232, 93, 67, 0.15)",
                              border: "1px solid rgba(232, 93, 67, 0.3)",
                              color: "#ff8b9d",
                              padding: "0.35rem 0.6rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                            onClick={() => handleDeleteOfferCode(item.id, item.code)}
                            title="Delete offer code"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

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
                  <span className="admin-kicker">DISCOUNT &amp; USAGE CONFIGURATION</span>
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
                <div className="offer-form-grid">
                  {/* Code Name & Auto Generator */}
                  <div className="offer-form-full">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label htmlFor="codeName">Offer Code String *</label>
                      <button
                        type="button"
                        className="inf-generate-btn"
                        onClick={handleAutoGenerateCode}
                        disabled={isGeneratingCode}
                      >
                        {isGeneratingCode ? "Generating..." : "✨ Auto-generate"}
                      </button>
                    </div>
                    <input
                      id="codeName"
                      type="text"
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
                    <small style={{ color: "rgba(255, 248, 242, 0.5)", fontSize: "0.72rem" }}>
                      Unique code students will enter at checkout (e.g. FREEDANDIYA, SGT50).
                    </small>
                  </div>

                  {/* Campaign Title / Target */}
                  <div className="offer-form-full">
                    <label htmlFor="title">Campaign / Offer Title</label>
                    <input
                      id="title"
                      type="text"
                      placeholder="e.g. Navratri 50% Flash Sale or VIP 100% Free Pass"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Discount Type Selector */}
                  <div className="offer-form-full">
                    <label>Discount Mode</label>
                    <div className="offer-chips-wrap">
                      <button
                        type="button"
                        className={`offer-chip-btn ${discountType === "PERCENTAGE" ? "is-active" : ""}`}
                        onClick={() => setDiscountType("PERCENTAGE")}
                      >
                        Percentage Discount (%) - Upto 100%
                      </button>
                      <button
                        type="button"
                        className={`offer-chip-btn ${discountType === "FLAT" ? "is-active" : ""}`}
                        onClick={() => setDiscountType("FLAT")}
                      >
                        Flat Rupee Amount (₹)
                      </button>
                    </div>
                  </div>

                  {/* Percentage Discount Slider (Up to 100%) */}
                  {discountType === "PERCENTAGE" && (
                    <div className="offer-form-full">
                      <div className="offer-slider-wrap">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                            Discount Percentage (0% to 100%)
                          </span>
                          <span className="offer-slider-val">{discountPercentage}% OFF</span>
                        </div>
                        <div className="offer-slider-row">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={discountPercentage}
                            onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                            className="offer-slider-input"
                          />
                        </div>

                        {/* Quick Preset Chips for Discount */}
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

                        {/* Live Price Previews */}
                        <div className="offer-preview-box">
                          <div className={`offer-preview-card ${vibePreviewPrice === 0 ? "is-free" : ""}`}>
                            <span>Vibe Pass (₹499) becomes:</span>
                            <strong>
                              {vibePreviewPrice === 0 ? "₹0 (FREE PASS)" : `₹${vibePreviewPrice}`}
                            </strong>
                          </div>
                          <div className={`offer-preview-card ${premiumPreviewPrice === 0 ? "is-free" : ""}`}>
                            <span>Premium Pass (₹999) becomes:</span>
                            <strong>
                              {premiumPreviewPrice === 0 ? "₹0 (FREE PASS)" : `₹${premiumPreviewPrice}`}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flat Discount Mode */}
                  {discountType === "FLAT" && (
                    <>
                      <div>
                        <label htmlFor="discount499">₹499 Plan Discount (₹)</label>
                        <input
                          id="discount499"
                          type="number"
                          min="0"
                          max="499"
                          value={discount499}
                          onChange={(e) => setDiscount499(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="discount999">₹999 Plan Discount (₹)</label>
                        <input
                          id="discount999"
                          type="number"
                          min="0"
                          max="999"
                          value={discount999}
                          onChange={(e) => setDiscount999(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Usage Limit ("Kitne times use honge wo") */}
                  <div className="offer-form-full">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label htmlFor="maxUses">Usage Limit (Kitne Times Use Honge)</label>
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
                      <div style={{ padding: "0.6rem 0.8rem", background: "rgba(46, 204, 113, 0.1)", borderRadius: "8px", border: "1px solid rgba(46, 204, 113, 0.3)", color: "#72e9a5", fontSize: "0.82rem" }}>
                        ✓ This code can be used unlimited times until manually deactivated.
                      </div>
                    )}
                  </div>

                  {/* Plan Restriction */}
                  <div className="offer-form-full">
                    <label htmlFor="applicablePlans">Applicable Plans</label>
                    <select
                      id="applicablePlans"
                      value={applicablePlans}
                      onChange={(e) => setApplicablePlans(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.8rem",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "#fff",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <option value="all">All Plans (Both ₹499 &amp; ₹999)</option>
                      <option value="vibe">Vibe Plan Only (₹499)</option>
                      <option value="premium">Premium Dandiya Plan Only (₹999)</option>
                    </select>
                  </div>

                  {/* Admin Notes */}
                  <div className="offer-form-full">
                    <label htmlFor="notes">Internal Notes (Optional)</label>
                    <input
                      id="notes"
                      type="text"
                      placeholder="e.g. VIP Pass for College Head or Fest Team"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="admin-modal-actions" style={{ marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    className="admin-modal-cancel-btn"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-modal-confirm-btn"
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
                  {/* Promo Summary */}
                  <div className="inf-conv-summary-grid">
                    <div className="inf-conv-stat">
                      <span>Total Redemptions</span>
                      <strong>{conversionsModalData.conversions?.length || 0}</strong>
                    </div>
                    <div className="inf-conv-stat">
                      <span>Total Net Revenue</span>
                      <strong style={{ color: "#2ecc71" }}>
                        ₹{conversionsModalData.promo?.totalRevenue || 0}
                      </strong>
                    </div>
                    <div className="inf-conv-stat">
                      <span>Total Discounts</span>
                      <strong style={{ color: "#ed709d" }}>
                        ₹{conversionsModalData.promo?.totalDiscountGiven || 0}
                      </strong>
                    </div>
                  </div>

                  {/* Conversions Table */}
                  {conversionsModalData.conversions?.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "rgba(255, 248, 242, 0.6)" }}>
                      <p>No students have redeemed this code yet.</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <table className="inf-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>College</th>
                            <th>Plan</th>
                            <th>Discount</th>
                            <th>Paid</th>
                            <th>UTR</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversionsModalData.conversions.map((conv) => (
                            <tr key={conv.paymentId}>
                              <td>
                                <div>
                                  <strong>{conv.studentName}</strong>
                                  <small className="inf-email" style={{ display: "block" }}>
                                    {conv.studentEmail}
                                  </small>
                                </div>
                              </td>
                              <td>{conv.collegeName}</td>
                              <td>
                                <span style={{ textTransform: "capitalize", color: "#f4c66c" }}>
                                  {conv.plan}
                                </span>
                              </td>
                              <td style={{ color: "#ed709d" }}>-₹{conv.discountAmount}</td>
                              <td style={{ fontWeight: "bold", color: "#2ecc71" }}>₹{conv.paidAmount}</td>
                              <td>
                                <code style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.08)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                                  {conv.utr || "N/A"}
                                </code>
                              </td>
                              <td>
                                <span
                                  className={`inf-status-badge ${
                                    conv.status === "APPROVED"
                                      ? "is-active"
                                      : conv.status === "PENDING"
                                      ? "is-pending"
                                      : "is-inactive"
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
