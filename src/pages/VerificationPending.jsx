import { useEffect, useState, useRef } from "react";
import { useAuth } from "../store";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import "../components/Authentication/Authentication.css";
import { API_URL } from "../config";

function VerificationPending() {
  const { token, isAuthenticated } = useAuth();
  const [status, setStatus] = useState("PENDING");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(2);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=login");
      return;
    }

    async function checkStatus() {
      try {
        const response = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) return;

        const currentStatus = data.onboarding?.verificationStatus || "PENDING";
        setStatus(currentStatus);

        if (currentStatus === "REJECTED") {
          setRejectionReason(
            data.onboarding?.collegeIdRejectionReason ||
              "Your verification details could not be verified. Please update your documents.",
          );
        } else if (currentStatus === "VERIFIED") {
          setAutoRedirecting(true);
          const targetUrl =
            data.onboarding?.questionnaireStatus === "COMPLETED"
              ? "/dashboard"
              : "/questionnaire";

          let remaining = 2;
          setRedirectCountdown(remaining);
          const interval = setInterval(() => {
            remaining -= 1;
            setRedirectCountdown(remaining);
            if (remaining <= 0) {
              clearInterval(interval);
              window.location.assign(targetUrl);
            }
          }, 1000);
        }
      } catch (err) {
        console.error("Status check failed:", err);
      }
    }

    // Run initial check
    checkStatus();

    // Auto-poll every 3.5 seconds until verified or rejected
    timerRef.current = setInterval(() => {
      if (!autoRedirecting && status !== "VERIFIED") {
        checkStatus();
      }
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, token, autoRedirecting, status]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${API_URL}/api/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const currentStatus = data.onboarding?.verificationStatus || "PENDING";
        setStatus(currentStatus);
        if (currentStatus === "VERIFIED") {
          const targetUrl =
            data.onboarding?.questionnaireStatus === "COMPLETED"
              ? "/dashboard"
              : "/questionnaire";
          window.location.assign(targetUrl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <main className="auth-page">
      <Background />
      <section
        className="auth-card"
        style={{
          maxWidth: "460px",
          textAlign: "center",
          padding: "2.5rem 2rem",
          background: "linear-gradient(145deg, rgba(28, 20, 26, 0.95), rgba(18, 14, 20, 0.98))",
          border: status === "VERIFIED" ? "1px solid rgba(74, 222, 128, 0.4)" : "1px solid rgba(244, 198, 108, 0.25)",
          boxShadow: status === "VERIFIED" ? "0 20px 40px rgba(74, 222, 128, 0.15)" : "0 20px 40px rgba(0, 0, 0, 0.4)",
          transition: "all 0.4s ease",
        }}
      >
        <div className="auth-card-topline" style={{ justifyContent: "center" }}>
          <span>
            {status === "VERIFIED"
              ? "VERIFICATION APPROVED"
              : status === "REJECTED"
                ? "ACTION REQUIRED"
                : "LIVE STATUS · REVIEW IN PROGRESS"}
          </span>
        </div>

        {status === "VERIFIED" ? (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 1.25rem",
                borderRadius: "50%",
                background: "rgba(74, 222, 128, 0.15)",
                border: "2px solid #4ade80",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                color: "#4ade80",
                animation: "pulse 1.5s infinite",
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: "2rem", margin: "0 0 0.75rem", color: "#fff8f2" }}>
              Identity <em style={{ color: "#4ade80", fontStyle: "normal" }}>Verified!</em>
            </h1>
            <p className="auth-intro" style={{ color: "rgba(255, 248, 242, 0.8)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Congratulations! Your verification application has been approved by SGT admins. Entering your campus experience...
            </p>

            <div
              style={{
                padding: "0.9rem",
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                borderRadius: "10px",
                color: "#4ade80",
                fontSize: "0.9rem",
                fontWeight: "500",
                marginBottom: "1.5rem",
              }}
            >
              🚀 Redirecting in {redirectCountdown} second{redirectCountdown === 1 ? "" : "s"}...
            </div>

            <button
              className="auth-submit"
              type="button"
              onClick={() => window.location.assign("/dashboard")}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Enter Dashboard Now <span>→</span>
            </button>
          </div>
        ) : status === "REJECTED" ? (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 1.25rem",
                borderRadius: "50%",
                background: "rgba(248, 113, 113, 0.15)",
                border: "2px solid #f87171",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                color: "#f87171",
              }}
            >
              ✕
            </div>
            <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.75rem", color: "#fff8f2" }}>
              Application <em>Needs Update</em>
            </h1>
            <p className="auth-intro" style={{ color: "rgba(255, 248, 242, 0.7)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              {rejectionReason}
            </p>
            <button
              className="auth-submit"
              type="button"
              onClick={() => window.location.assign("/onboarding/college-id")}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Re-upload Documents <span>→</span>
            </button>
          </div>
        ) : (
          <div style={{ marginTop: "1rem" }}>
            {/* Animated Radar Pulse */}
            <div
              style={{
                position: "relative",
                width: "80px",
                height: "80px",
                margin: "0 auto 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid rgba(244, 198, 108, 0.4)",
                  animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(244, 198, 108, 0.25) 0%, rgba(244, 198, 108, 0.05) 70%)",
                  border: "1px solid rgba(244, 198, 108, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                }}
              >
                ⏳
              </div>
            </div>

            <h1 style={{ fontSize: "1.85rem", margin: "0 0 0.75rem", color: "#fff8f2" }}>
              Verification <em>In Progress</em>
            </h1>
            <p className="auth-intro" style={{ color: "rgba(255, 248, 242, 0.75)", fontSize: "0.92rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
              Our team is verifying your College ID and Live Photo. This page will <strong style={{ color: "#f4c66c" }}>automatically advance</strong> as soon as your profile is approved.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                padding: "0.75rem 1rem",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "rgba(255, 248, 242, 0.65)",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#f4c66c",
                  boxShadow: "0 0 8px #f4c66c",
                  display: "inline-block",
                }}
              />
              Listening for admin approval in real-time
            </div>

            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 248, 242, 0.2)",
                color: "rgba(255, 248, 242, 0.8)",
                padding: "0.65rem 1.25rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {isChecking ? <Loader label="Checking status" /> : "Check status now ⟳"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default VerificationPending;
