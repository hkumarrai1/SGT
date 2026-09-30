import { useEffect, useRef, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "./Payment.css";
import { API_URL } from "../config";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const DEFAULT_PLANS = [
  {
    id: "vibe",
    name: "Vibe Dandiya Plan",
    price: 499,
  },
  {
    id: "premium",
    name: "Premium Dandiya Night Plan",
    price: 999,
    popular: true,
  },
];

function Payment() {
  const { token, isAuthenticated, logout } = useAuth();
  const fileInputRef = useRef(null);

  // Pre-select plan from URL (?plan=vibe or ?plan=premium), default to premium
  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("plan");
    return p === "vibe" ? "vibe" : "premium";
  });

  const [existingPayment, setExistingPayment] = useState(null);
  const [activePlan, setActivePlan] = useState("none");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  const [screenshotFile, setScreenshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  const currentPlan =
    DEFAULT_PLANS.find((p) => p.id === selectedPlanId) || DEFAULT_PLANS[1];

  // Fetch payment status if logged in
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=signup");
      return;
    }

    async function loadStatus() {
      try {
        const res = await fetch(`${API_URL}/api/payment/my-payment`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          logout();
          window.location.assign("/auth?mode=login");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setActivePlan(data.activePlan || "none");
          setPaymentStatus(data.paymentStatus || "UNPAID");
          setExistingPayment(data.payment || null);
          if (data.payment?.plan) {
            setSelectedPlanId(data.payment.plan);
          }
        }
      } catch (err) {
        console.error("Error loading payment status:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStatus();
  }, [isAuthenticated, token, logout]);

  // Handle Copy UPI ID
  const handleCopyUpi = (upiId) => {
    navigator.clipboard.writeText(upiId);
    setCopiedId(upiId);
    setTimeout(() => setCopiedId(""), 2200);
  };

  // Handle screenshot file change
  const handleFileChange = (file) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.has(file.type)) {
      setAlert({
        type: "error",
        message: "Please upload a valid image file (JPG, PNG, or WebP).",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAlert({
        type: "error",
        message: "Screenshot size must be under 10MB.",
      });
      return;
    }

    setAlert({ type: "", message: "" });
    setScreenshotFile(file);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit payment form
  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      window.location.assign(
        `/auth?mode=login&redirect=/payment?plan=${selectedPlanId}`,
      );
      return;
    }

    if (!screenshotFile) {
      setAlert({
        type: "error",
        message: "Please upload your payment screenshot before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    setAlert({ type: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("plan", selectedPlanId);
      formData.append("screenshot", screenshotFile);

      const response = await fetch(`${API_URL}/api/payment/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit payment screenshot.");
      }

      setAlert({
        type: "success",
        message: "Payment submitted — awaiting admin verification.",
      });

      setExistingPayment(data.payment);
      setPaymentStatus("PENDING");
      setShowResubmitForm(false);
      handleRemoveScreenshot();
    } catch (err) {
      setAlert({
        type: "error",
        message: err.message || "Payment submission failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh status
  const handleRefreshStatus = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payment/my-payment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivePlan(data.activePlan || "none");
        setPaymentStatus(data.paymentStatus || "UNPAID");
        setExistingPayment(data.payment || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="payment-page">
        <Background />
        <div style={{ display: "grid", minHeight: "80vh", placeItems: "center" }}>
          <Loader label="Opening official SGT payment" />
        </div>
      </main>
    );
  }

  const isApproved =
    paymentStatus === "PAID" || existingPayment?.status === "APPROVED";
  const isPending =
    paymentStatus === "PENDING" || existingPayment?.status === "PENDING";
  const isRejected = existingPayment?.status === "REJECTED";

  if (!isAuthenticated) return null;

  return (
    <main className="payment-page">
      <Background />

      <div className="payment-shell">
        {/* Top Navigation */}
        <header className="payment-nav-bar">
          <div className="payment-kicker">
            <span>OFFICIAL SGT UPI PAYMENT</span>
            <i aria-hidden="true" />
          </div>

          <div className="payment-nav-links">
            {isAuthenticated ? (
              <a href="/dashboard" className="payment-nav-btn">
                <span>←</span> Dashboard
              </a>
            ) : (
              <a href="/auth?mode=login" className="payment-nav-btn">
                Sign In
              </a>
            )}
            <a href="/" className="payment-nav-btn">
              Home
            </a>
          </div>
        </header>

        {/* Global Alert Notification */}
        {alert.message && (
          <div className={`payment-alert ${alert.type}`}>
            <span>{alert.type === "error" ? "⚠️" : "✓"}</span>
            <span>{alert.message}</span>
          </div>
        )}

        {/* ==========================================================
            VIEW 1: APPROVED / ACTIVE PLAN CARD
            ========================================================== */}
        {isApproved && (
          <section className="payment-status-card" aria-label="Plan Activated">
            <span className="payment-status-badge approved">
              ✓ Active SGT Plan
            </span>
            <h2>
              You are <em>Verified & Ready!</em>
            </h2>
            <p>
              Your payment for the <strong>{existingPayment?.planName || currentPlan.name}</strong> (₹
              {existingPayment?.amount || currentPlan.price}) has been verified and approved by the
              admin team. Your Dandiya matching features are fully active.
            </p>

            <div className="payment-details-table">
              <div className="payment-table-cell">
                <span className="payment-cell-label">Plan</span>
                <span className="payment-cell-val">
                  {existingPayment?.planName || currentPlan.name}
                </span>
              </div>
              <div className="payment-table-cell">
                <span className="payment-cell-label">Amount Paid</span>
                <span className="payment-cell-val">
                  ₹{existingPayment?.amount || currentPlan.price}
                </span>
              </div>
              <div className="payment-table-cell">
                <span className="payment-cell-label">Status</span>
                <span className="payment-cell-val" style={{ color: "#2ecc71" }}>
                  APPROVED
                </span>
              </div>
            </div>

            <div className="payment-status-actions">
              <button
                type="button"
                className="payment-submit-btn"
                onClick={() => window.location.assign("/dashboard")}
              >
                Go to Dashboard <span>→</span>
              </button>
            </div>
          </section>
        )}

        {/* ==========================================================
            VIEW 2: PENDING APPROVAL CARD
            ========================================================== */}
        {isPending && !showResubmitForm && (
          <section className="payment-status-card" aria-label="Awaiting Verification">
            <span className="payment-status-badge pending">
              ⏳ Awaiting Admin Verification
            </span>
            <h2>
              Payment Proof <em>Submitted.</em>
            </h2>
            <p>
              We received your payment screenshot for the{" "}
              <strong>{existingPayment?.planName || currentPlan.name}</strong> (₹
              {existingPayment?.amount || currentPlan.price}).
              Our team manually verifies every transaction to keep the campus event 100% genuine and safe.
            </p>

            <div className="payment-details-table">
              <div className="payment-table-cell">
                <span className="payment-cell-label">Plan</span>
                <span className="payment-cell-val">
                  {existingPayment?.planName || currentPlan.name}
                </span>
              </div>
              <div className="payment-table-cell">
                <span className="payment-cell-label">Amount</span>
                <span className="payment-cell-val">
                  ₹{existingPayment?.amount || currentPlan.price}
                </span>
              </div>
              <div className="payment-table-cell">
                <span className="payment-cell-label">Submitted At</span>
                <span className="payment-cell-val">
                  {existingPayment?.submittedAt
                    ? new Date(existingPayment.submittedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                      })
                    : "Just now"}
                </span>
              </div>
            </div>

            <div className="payment-status-actions">
              <button
                type="button"
                className="payment-nav-btn"
                onClick={handleRefreshStatus}
              >
                🔄 Refresh Status
              </button>
              <button
                type="button"
                className="payment-nav-btn"
                onClick={() => window.location.assign("/dashboard")}
              >
                View Dashboard
              </button>
            </div>
          </section>
        )}

        {/* ==========================================================
            VIEW 3: REJECTED NOTICE (Allows re-submission)
            ========================================================== */}
        {isRejected && !showResubmitForm && (
          <section className="payment-status-card" aria-label="Payment Rejected">
            <span className="payment-status-badge rejected">
              ✕ Verification Unsuccessful
            </span>
            <h2>
              Payment Verification <em>Declined.</em>
            </h2>
            <p style={{ color: "#ff9d8b" }}>
              <strong>Admin Note:</strong>{" "}
              {existingPayment?.rejectionReason ||
                "Payment could not be matched with bank deposits or screenshot was unreadable."}
            </p>

            <div className="payment-status-actions">
              <button
                type="button"
                className="payment-submit-btn"
                onClick={() => setShowResubmitForm(true)}
              >
                Submit New Screenshot <span>→</span>
              </button>
            </div>
          </section>
        )}

        {/* ==========================================================
            VIEW 4: SIMPLE MOBILE-FIRST PAYMENT FLOW
            Plan Name → ₹Amount → Official QR image → UPI ID [Copy] → Upload Screenshot → Submit
            ========================================================== */}
        {(!isApproved && !isPending) || showResubmitForm ? (
          <div className="payment-simple-card">
            {/* 1. Plan Selector Pills */}
            <div className="payment-plan-selector">
              {DEFAULT_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={`payment-plan-pill ${
                    selectedPlanId === plan.id ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <span className="payment-pill-name">{plan.name}</span>
                  <span className="payment-pill-price">₹{plan.price}</span>
                </button>
              ))}
            </div>

            {/* 2. Plan Name & Amount Display */}
            <div className="payment-amount-hero">
              <h1 className="payment-hero-plan-name">{currentPlan.name}</h1>
              <div className="payment-hero-price">
                <span>₹</span>
                {currentPlan.price}
              </div>
            </div>

            {/* 3. Official SGT QR Image */}
            <div className="payment-qr-wrap">
              <div className="payment-qr-frame">
                <img
                  src="/PaymentQr.png"
                  alt="Official SGT UPI Payment QR"
                  className="payment-qr-image"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.retried) {
                      e.currentTarget.dataset.retried = "true";
                      e.currentTarget.src = "/images/PaymentQr.png";
                    }
                  }}
                />
              </div>
            </div>

            {/* 4. UPI ID & Copy Button */}
            <div className="payment-upi-section">
              <div className="payment-upi-row">
                <span className="payment-upi-label">UPI ID:</span>
                <span className="payment-upi-id">9971284797@ptaxis</span>
                <button
                  type="button"
                  className="payment-copy-btn"
                  onClick={() => handleCopyUpi("9971284797@ptaxis")}
                >
                  {copiedId === "9971284797@ptaxis" ? "Copied! ✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* 5. Instruction text */}
            <p className="payment-prompt-instruction">
              Pay using any UPI app and upload the payment screenshot below.
            </p>

            {/* 6. Form: Screenshot Upload & Submit */}
            <form className="payment-simple-form" onSubmit={handleSubmitPayment}>
              {previewUrl ? (
                <div className="payment-preview-box">
                  <img src={previewUrl} alt="Payment Screenshot Preview" />
                  <button
                    type="button"
                    className="payment-preview-remove"
                    onClick={handleRemoveScreenshot}
                    title="Remove and select another"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  className={`payment-upload-zone ${isDragging ? "is-dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="payment-upload-icon">📸</div>
                  <div className="payment-upload-text">
                    <strong>Upload Payment Screenshot</strong>
                  </div>
                  <span className="payment-upload-subtext">
                    Tap to browse image (PNG, JPG, or WebP)
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files[0])}
              />

              <button
                type="submit"
                className="payment-submit-btn"
                disabled={isSubmitting || !screenshotFile}
              >
                {isSubmitting ? "Uploading Screenshot..." : "Submit Payment"}
              </button>

              {!isAuthenticated && (
                <p className="payment-auth-reminder">
                  You will be prompted to sign in or register before submitting.
                </p>
              )}
            </form>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default Payment;
