import { useEffect, useState, useMemo } from "react";
import Loader from "../components/Loader/Loader";
import "./AdminDashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const REJECT_PRESETS = [
  "UTR does not match any entry in bank statement.",
  "Screenshot is blurry or unreadable.",
  "Screenshot does not show transaction date & amount.",
  "Incorrect amount paid for the selected plan.",
  "Duplicate payment proof submitted.",
];

function AdminDashboard() {
  const token = localStorage.getItem("sgt_admin_token");

  const [activeTab, setActiveTab] = useState("payments"); // "payments" | "verifications"

  // Data states
  const [payments, setPayments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | APPROVED | REJECTED
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [viewImageModal, setViewImageModal] = useState(null); // url string
  const [approveConfirmModal, setApproveConfirmModal] = useState(null); // payment object
  const [rejectModal, setRejectModal] = useState(null); // payment object
  const [rejectReason, setRejectReason] = useState(REJECT_PRESETS[0]);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [copiedUtr, setCopiedUtr] = useState("");

  // Check login & load data
  useEffect(() => {
    if (!token) {
      window.location.assign("/admin/login");
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [verifRes, payRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/verifications`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (verifRes.status === 401 || payRes.status === 401) {
        localStorage.removeItem("sgt_admin_token");
        window.location.assign("/admin/login");
        return;
      }

      if (verifRes.ok) {
        const verifData = await verifRes.json();
        setApplications(verifData.applications || []);
      }

      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData.payments || []);
      }
    } catch (err) {
      console.error("Admin data load error:", err);
      setAlert({
        type: "error",
        message:
          "Unable to reach the backend server. Please make sure the backend is running on http://localhost:5000.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUtr = (utrVal) => {
    navigator.clipboard.writeText(utrVal);
    setCopiedUtr(utrVal);
    setTimeout(() => setCopiedUtr(""), 2000);
  };

  // Approve Payment Action
  const handleApprovePayment = async () => {
    if (!approveConfirmModal) return;
    setActionInProgress(true);
    setAlert({ type: "", message: "" });

    try {
      const res = await fetch(
        `${API_URL}/api/admin/payments/${approveConfirmModal._id}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to approve payment.");

      setAlert({
        type: "success",
        message: `Payment for ${approveConfirmModal.profile?.fullName || approveConfirmModal.userId?.email || "Student"} approved! Plan activated.`,
      });

      // Update state locally
      setPayments((prev) =>
        prev.map((p) =>
          p._id === approveConfirmModal._id
            ? { ...p, status: "APPROVED", approvedAt: new Date().toISOString() }
            : p,
        ),
      );
      setApproveConfirmModal(null);
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  // Reject Payment Action
  const handleRejectPayment = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      setAlert({ type: "error", message: "Please provide a rejection reason." });
      return;
    }

    setActionInProgress(true);
    setAlert({ type: "", message: "" });

    try {
      const res = await fetch(
        `${API_URL}/api/admin/payments/${rejectModal._id}/reject`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reject payment.");

      setAlert({
        type: "success",
        message: `Payment for ${rejectModal.profile?.fullName || rejectModal.userId?.email || "Student"} rejected. Reason logged.`,
      });

      // Update state locally
      setPayments((prev) =>
        prev.map((p) =>
          p._id === rejectModal._id
            ? {
                ...p,
                status: "REJECTED",
                rejectionReason: rejectReason.trim(),
                reviewedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
      setRejectModal(null);
      setRejectReason(REJECT_PRESETS[0]);
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setActionInProgress(false);
    }
  };

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const email = item.userId?.email?.toLowerCase() || "";
        const name = item.profile?.fullName?.toLowerCase() || "";
        const studentId = item.profile?.studentId?.toLowerCase() || "";
        const utr = item.utr?.toLowerCase() || "";
        const plan = item.planName?.toLowerCase() || "";

        return (
          email.includes(q) ||
          name.includes(q) ||
          studentId.includes(q) ||
          utr.includes(q) ||
          plan.includes(q)
        );
      }

      return true;
    });
  }, [payments, statusFilter, searchQuery]);

  // Counts
  const pendingPaymentsCount = useMemo(
    () => payments.filter((p) => p.status === "PENDING").length,
    [payments],
  );

  const pendingAppsCount = useMemo(
    () => applications.filter((a) => a.verificationStatus === "PENDING").length,
    [applications],
  );

  const handleLogout = () => {
    localStorage.removeItem("sgt_admin_token");
    window.location.assign("/admin/login");
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        {/* Top bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1>
              SGT <em>Admin Portal.</em>
            </h1>
            <p>Review verification applications and manual QR payment submissions.</p>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-logout-btn"
              onClick={handleLogout}
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
            className={`admin-tab-btn ${activeTab === "payments" ? "is-active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            <span>💳 Payment Proofs</span>
            {pendingPaymentsCount > 0 && (
              <span className="admin-tab-count">{pendingPaymentsCount} PENDING</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "verifications" ? "is-active" : ""}`}
            onClick={() => setActiveTab("verifications")}
          >
            <span>🎓 College ID Verifications</span>
            {pendingAppsCount > 0 && (
              <span className="admin-tab-count">{pendingAppsCount} PENDING</span>
            )}
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoading ? (
          <div style={{ padding: "4rem 0", display: "grid", placeItems: "center" }}>
            <Loader label="Fetching submissions..." />
          </div>
        ) : activeTab === "payments" ? (
          /* ==========================================================
             PAYMENTS TAB CONTENT
             ========================================================== */
          <>
            {/* Toolbar: Filters & Search */}
            <div className="admin-toolbar">
              <div className="admin-filter-group">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`admin-filter-chip ${statusFilter === st ? "is-active" : ""}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="admin-search-input"
                placeholder="Search UTR, name, email, student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Payments List */}
            {filteredPayments.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "16px",
                  color: "rgba(255, 248, 242, 0.5)",
                }}
              >
                No payment proofs found matching current filters.
              </div>
            ) : (
              <div className="admin-payments-list">
                {filteredPayments.map((p) => {
                  const studentName = p.profile?.fullName || "Student";
                  const collegeName = p.institutionId?.name || "University";
                  const regId = p.profile?.studentId || "N/A";
                  const isPending = p.status === "PENDING";
                  const isApproved = p.status === "APPROVED";
                  const isRejected = p.status === "REJECTED";

                  return (
                    <article className="admin-payment-card" key={p._id}>
                      {/* 1. User & College Info */}
                      <div className="admin-user-info">
                        <div className="admin-user-name">{studentName}</div>
                        <div className="admin-user-sub">
                          <span>{p.userId?.email}</span>
                          <span>
                            {collegeName} · ID: <strong>{regId}</strong>
                          </span>
                          <span style={{ fontSize: "0.74rem", opacity: 0.7 }}>
                            Submitted:{" "}
                            {new Date(p.submittedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* 2. Plan, Amount & UTR */}
                      <div className="admin-plan-info">
                        <div className="admin-plan-badge">
                          <span>{p.planName}</span>
                          <span style={{ color: "#fff8f2" }}>· ₹{p.amount}</span>
                        </div>

                        {p.utr ? (
                          <div className="admin-utr-box">
                            <span>UTR: {p.utr}</span>
                            <button
                              type="button"
                              className="admin-utr-copy"
                              onClick={() => handleCopyUtr(p.utr)}
                              title="Copy UTR"
                            >
                              {copiedUtr === p.utr ? "Copied!" : "📋"}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.76rem", color: "rgba(255, 248, 242, 0.6)" }}>
                            Receipt screenshot attached
                          </span>
                        )}

                        {isRejected && p.rejectionReason && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#ff9d8b",
                              lineHeight: 1.3,
                            }}
                          >
                            Reason: {p.rejectionReason}
                          </span>
                        )}
                      </div>

                      {/* 3. Screenshot Preview Thumbnail */}
                      <div
                        className="admin-screenshot-thumb"
                        onClick={() => setViewImageModal(p.screenshotUrl)}
                        title="Click to view full screenshot"
                      >
                        <img src={p.screenshotUrl} alt="Payment Receipt" />
                        <div className="admin-screenshot-overlay">
                          🔍 Zoom
                        </div>
                      </div>

                      {/* 4. Status & Action Buttons */}
                      <div className="admin-card-actions">
                        <span className={`admin-status-chip ${p.status.toLowerCase()}`}>
                          {p.status}
                        </span>

                        {isPending ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              type="button"
                              className="admin-btn-approve"
                              onClick={() => setApproveConfirmModal(p)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="admin-btn-reject"
                              onClick={() => {
                                setRejectModal(p);
                                setRejectReason(REJECT_PRESETS[0]);
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : isApproved ? (
                          <span
                            style={{
                              fontSize: "0.74rem",
                              color: "#2ecc71",
                            }}
                          >
                            ✓ Plan Active
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.74rem",
                              color: "#ff9d8b",
                            }}
                          >
                            ✕ Rejected
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ==========================================================
             ID VERIFICATIONS TAB CONTENT (Preserved)
             ========================================================== */
          <div style={{ display: "grid", gap: "1rem" }}>
            {applications.map((a) => (
              <button
                className="admin-payment-card"
                style={{ textAlign: "left", cursor: "pointer" }}
                key={a._id}
                onClick={() =>
                  window.location.assign(`/admin/verifications/${a._id}`)
                }
              >
                <div className="admin-user-info">
                  <div className="admin-user-name">
                    {a.userId?.email || "Applicant"}
                  </div>
                  <div className="admin-user-sub">
                    <span>{a.institutionId?.name}</span>
                  </div>
                </div>
                <div>
                  <span className={`admin-status-chip ${a.verificationStatus?.toLowerCase()}`}>
                    {a.verificationStatus}
                  </span>
                </div>
                <div style={{ textAlign: "right", color: "#f4c66c" }}>
                  View Application Details →
                </div>
              </button>
            ))}
            {applications.length === 0 && (
              <p style={{ color: "rgba(255, 248, 242, 0.5)" }}>
                No verification applications available.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ==========================================================
          MODAL 1: FULL SCREENSHOT MODAL
          ========================================================== */}
      {viewImageModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setViewImageModal(null)}
        >
          <div
            className="admin-image-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="admin-image-close"
              onClick={() => setViewImageModal(null)}
            >
              ✕
            </button>
            <img src={viewImageModal} alt="Full Size Payment Screenshot" />
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 2: APPROVE CONFIRMATION MODAL
          ========================================================== */}
      {approveConfirmModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setApproveConfirmModal(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Payment & Activate Plan</h3>
            <p>
              Are you sure you want to approve this payment? This will
              instantaneously activate the{" "}
              <strong>{approveConfirmModal.planName} (₹{approveConfirmModal.amount})</strong>{" "}
              for <strong>{approveConfirmModal.profile?.fullName || approveConfirmModal.userId?.email}</strong>{" "}
              and unlock all Dandiya matching features.
            </p>

            {approveConfirmModal.utr ? (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                }}
              >
                UTR: {approveConfirmModal.utr}
              </div>
            ) : null}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setApproveConfirmModal(null)}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-approve"
                style={{ padding: "0.6rem 1.4rem" }}
                onClick={handleApprovePayment}
                disabled={actionInProgress}
              >
                {actionInProgress ? "Activating..." : "Confirm & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 3: REJECT REASON MODAL
          ========================================================== */}
      {rejectModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !actionInProgress && setRejectModal(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Payment Proof</h3>
            <p>
              Provide a clear reason for rejecting the payment submitted by{" "}
              <strong>{rejectModal.profile?.fullName || rejectModal.userId?.email}</strong>.
              This message will be shown to the student on their payment screen so
              they can resolve it and resubmit.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.78rem", color: "rgba(255, 248, 242, 0.6)" }}>
                Quick Presets:
              </label>
              <select
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff8f2",
                  padding: "0.6rem",
                  borderRadius: "8px",
                  outline: "none",
                }}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              >
                {REJECT_PRESETS.map((preset) => (
                  <option key={preset} value={preset} style={{ background: "#170a22" }}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.78rem", color: "rgba(255, 248, 242, 0.6)" }}>
                Custom Reason Note:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Type specific rejection details..."
              />
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setRejectModal(null)}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-reject"
                style={{ padding: "0.6rem 1.4rem" }}
                onClick={handleRejectPayment}
                disabled={actionInProgress || !rejectReason.trim()}
              >
                {actionInProgress ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;
