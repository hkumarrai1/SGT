import { useEffect, useState } from "react";
import Loader from "../components/Loader/Loader";
import { API_URL } from "../config";
import "./AdminDashboard.css";

function AdminVerificationDetail() {
  const id = window.location.pathname.split("/").pop();
  const [data, setData] = useState(null);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewImageModal, setViewImageModal] = useState(null);
  const [confirmApproveModal, setConfirmApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [status, setStatus] = useState("PENDING");

  const token = localStorage.getItem("sgt_admin_token");

  useEffect(() => {
    if (!token) {
      window.location.assign("/admin/login");
      return;
    }

    async function fetchDetail() {
      try {
        const response = await fetch(`${API_URL}/api/admin/verifications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load application.");
        }
        setData(result);
        setStatus(result.application?.verificationStatus || "PENDING");
      } catch (err) {
        setAlert({ type: "error", message: err.message });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
  }, [id, token]);

  const handleApprove = async () => {
    setIsUpdating(true);
    setAlert({ type: "", message: "" });
    try {
      const response = await fetch(
        `${API_URL}/api/admin/verifications/${id}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Approval failed.");

      setStatus("VERIFIED");
      setConfirmApproveModal(false);
      setAlert({
        type: "success",
        message: "🎉 Student verified and approved successfully! Account unlocked.",
      });

      // Auto redirect back to admin dashboard after 2.5s
      setTimeout(() => {
        window.location.assign("/admin/dashboard");
      }, 2500);
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setAlert({ type: "error", message: "Please enter a rejection reason." });
      return;
    }
    setIsUpdating(true);
    setAlert({ type: "", message: "" });
    try {
      const response = await fetch(
        `${API_URL}/api/admin/verifications/${id}/reject`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        },
      );
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Rejection failed.");

      setStatus("REJECTED");
      setRejectModal(false);
      setAlert({
        type: "success",
        message: "Verification application rejected with feedback sent to student.",
      });

      setTimeout(() => {
        window.location.assign("/admin/dashboard");
      }, 2500);
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <main className="admin-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Loader label="Loading applicant verification data" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="admin-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "#fff8f2" }}>
          <p>{alert.message || "Application not found."}</p>
          <button
            type="button"
            className="admin-logout-btn"
            style={{ marginTop: "1rem" }}
            onClick={() => window.location.assign("/admin/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const { profile, application, privateDocuments } = data;

  return (
    <main className="admin-page">
      <div className="admin-shell" style={{ maxWidth: "1000px" }}>
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-logout-btn"
              style={{ marginBottom: "0.75rem", display: "inline-block" }}
              onClick={() => window.location.assign("/admin/dashboard")}
            >
              ← Back to Admin Dashboard
            </button>
            <h1>
              Verification <em>Review.</em>
            </h1>
            <p>Review student credentials, College ID card, and live liveness capture.</p>
          </div>

          <div className="admin-topbar-actions">
            <span className={`admin-status-chip ${status.toLowerCase()}`}>
              {status}
            </span>
          </div>
        </header>

        {/* Global Alert Notification */}
        {alert.message && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "12px",
              marginBottom: "1.5rem",
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
              fontWeight: "500",
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

        {/* Applicant Overview Card */}
        <div
          style={{
            background: "linear-gradient(145deg, rgba(28, 20, 26, 0.95), rgba(18, 14, 20, 0.98))",
            border: "1px solid rgba(244, 198, 108, 0.25)",
            borderRadius: "16px",
            padding: "1.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.5rem", color: "#fff8f2", margin: "0 0 0.5rem" }}>
                {profile?.fullName || "Student Applicant"}
              </h2>
              <p style={{ color: "#f4c66c", margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
                🏛️ {application?.institutionId?.name || "University"} · {profile?.course || "Course"}
              </p>
              <p style={{ color: "rgba(255, 248, 242, 0.6)", margin: 0, fontSize: "0.85rem" }}>
                Student ID: <strong>{profile?.studentId || "N/A"}</strong> · Year: <strong>{profile?.academicYear || "N/A"}</strong> · Gender: <strong>{profile?.gender || "N/A"}</strong>
              </p>
            </div>

            {status === "PENDING" && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setConfirmApproveModal(true)}
                  disabled={isUpdating}
                  className="admin-approve-btn"
                  style={{ padding: "0.7rem 1.5rem", fontSize: "0.95rem" }}
                >
                  Approve Verification ✓
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModal(true)}
                  disabled={isUpdating}
                  className="admin-reject-btn"
                  style={{ padding: "0.7rem 1.25rem", fontSize: "0.95rem" }}
                >
                  Reject ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Verification Media Section */}
        <h3 style={{ color: "#fff8f2", fontSize: "1.1rem", marginBottom: "1rem" }}>
          Submitted Verification Documents
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          {/* Profile Photo */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "14px",
              padding: "1.25rem",
              textAlign: "center",
            }}
          >
            <h4 style={{ color: "#f4c66c", margin: "0 0 0.75rem", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              1. Profile Photo
            </h4>
            {profile?.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt="Profile Preview"
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  cursor: "pointer",
                }}
                onClick={() => setViewImageModal(profile.profilePhoto)}
              />
            ) : (
              <div style={{ height: "220px", display: "grid", placeItems: "center", color: "rgba(255, 248, 242, 0.4)", fontSize: "0.85rem" }}>
                No Profile Photo Uploaded
              </div>
            )}
            <p style={{ color: "rgba(255, 248, 242, 0.5)", fontSize: "0.75rem", margin: "0.75rem 0 0" }}>
              Click photo to enlarge
            </p>
          </div>

          {/* College ID Card */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "14px",
              padding: "1.25rem",
              textAlign: "center",
            }}
          >
            <h4 style={{ color: "#f4c66c", margin: "0 0 0.75rem", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              2. College ID Card
            </h4>
            {privateDocuments?.collegeIdUrl ? (
              <img
                src={privateDocuments.collegeIdUrl}
                alt="College ID Preview"
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  cursor: "pointer",
                }}
                onClick={() => setViewImageModal(privateDocuments.collegeIdUrl)}
              />
            ) : (
              <div style={{ height: "220px", display: "grid", placeItems: "center", color: "rgba(255, 248, 242, 0.4)", fontSize: "0.85rem" }}>
                No College ID Uploaded
              </div>
            )}
            <p style={{ color: "rgba(255, 248, 242, 0.5)", fontSize: "0.75rem", margin: "0.75rem 0 0" }}>
              Click image to inspect ID details
            </p>
          </div>

          {/* Live Photo Capture */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "14px",
              padding: "1.25rem",
              textAlign: "center",
            }}
          >
            <h4 style={{ color: "#f4c66c", margin: "0 0 0.75rem", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              3. Live Selfie Verification
            </h4>
            {privateDocuments?.livePhotoUrl ? (
              <img
                src={privateDocuments.livePhotoUrl}
                alt="Live Selfie Preview"
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  cursor: "pointer",
                }}
                onClick={() => setViewImageModal(privateDocuments.livePhotoUrl)}
              />
            ) : (
              <div style={{ height: "220px", display: "grid", placeItems: "center", color: "rgba(255, 248, 242, 0.4)", fontSize: "0.85rem" }}>
                No Live Photo Uploaded
              </div>
            )}
            <p style={{ color: "rgba(255, 248, 242, 0.5)", fontSize: "0.75rem", margin: "0.75rem 0 0" }}>
              Click image to verify liveness
            </p>
          </div>
        </div>
      </div>

      {/* MODAL 1: FULL SCREENSHOT ZOOM */}
      {viewImageModal && (
        <div className="admin-modal-backdrop" onClick={() => setViewImageModal(null)}>
          <div className="admin-image-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-image-close"
              onClick={() => setViewImageModal(null)}
            >
              ✕
            </button>
            <img src={viewImageModal} alt="Document Full View" />
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM APPROVAL MODAL */}
      {confirmApproveModal && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmApproveModal(false)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Verification Application?</h3>
            <p>
              Are you sure you want to verify{" "}
              <strong>{profile?.fullName || "this applicant"}</strong>?
            </p>
            <div className="admin-confirm-box">
              <div>
                <span>College / University:</span>
                <strong>{application?.institutionId?.name || "N/A"}</strong>
              </div>
              <div>
                <span>Student ID:</span>
                <strong>{profile?.studentId || "N/A"}</strong>
              </div>
              <div>
                <span>Course & Year:</span>
                <strong>{profile?.course} (Year {profile?.academicYear})</strong>
              </div>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setConfirmApproveModal(false)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-approve-btn"
                onClick={handleApprove}
                disabled={isUpdating}
              >
                {isUpdating ? "Approving..." : "Yes, Approve Application ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT MODAL */}
      {rejectModal && (
        <div className="admin-modal-backdrop" onClick={() => setRejectModal(false)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Verification Application</h3>
            <p>
              Please provide feedback explaining why the ID card or live selfie could not be verified.
            </p>
            <textarea
              className="admin-reason-textarea"
              placeholder="e.g. College ID is blurry, or Live selfie face does not match ID card photo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setRejectModal(false)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reject-btn"
                onClick={handleReject}
                disabled={isUpdating || !rejectReason.trim()}
              >
                {isUpdating ? "Rejecting..." : "Reject Application ✕"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminVerificationDetail;
