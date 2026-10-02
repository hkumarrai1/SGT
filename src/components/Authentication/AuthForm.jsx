import { useState } from "react";
import { useAuth } from "../../store";
import { API_URL } from "../../config";
import Loader from "../Loader/Loader";
import "./Authentication.css";

function AuthForm({ mode = "signup", onSwitch }) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { setSession } = useAuth();

  const requestPath = isSignup ? "signup" : "login";

  async function requestOtp(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    setTermsError("");

    if (isSignup && !agreedToTerms) {
      setTermsError("You must agree to the Terms & Conditions and confirm you are 18+ to proceed.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/${requestPath}/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, termsAccepted: isSignup ? agreedToTerms : undefined }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404 || data.isNewUser) {
          setStatus({
            type: "new_user",
            message: data.message || "No account found with this email. Please sign up first.",
          });
          return;
        }
        throw new Error(data.message || "Unable to send OTP.");
      }
      setStep("otp");
      setStatus({
        type: "success",
        message: "Your verification code is on its way.",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/${requestPath}/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, termsAccepted: isSignup ? agreedToTerms : true }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to verify OTP.");
      setSession(data.token, data.user);
      const onboardingResponse = await fetch(
        `${API_URL}/api/onboarding/status`,
        {
          headers: { Authorization: `Bearer ${data.token}` },
        },
      );
      const onboardingData = await onboardingResponse.json();
      if (!onboardingResponse.ok)
        throw new Error(
          onboardingData.message || "Unable to load onboarding status.",
        );
      setStatus({
        type: "success",
        message: isSignup
          ? "Your SGT account is ready."
          : "Welcome back to SGT.",
      });
      const nextPath =
        {
          college: "/onboarding/college",
          "profile-details": "/onboarding/profile",
          "profile-photo": "/onboarding/profile-photo",
          "college-id": "/onboarding/college-id",
          "live-photo": "/onboarding/live-photo",
          complete: "/",
          REVIEW: "/onboarding/review",
          VERIFICATION_PENDING: "/verification/pending",
          QUESTIONNAIRE: "/questionnaire",
          DASHBOARD: "/dashboard",
          RETRY_VERIFICATION: "/onboarding/review",
          COLLEGE: "/onboarding/college",
          PROFILE: "/onboarding/profile",
          PROFILE_PHOTO: "/onboarding/profile-photo",
          COLLEGE_ID: "/onboarding/college-id",
          LIVE_PHOTO: "/onboarding/live-photo",
        }[onboardingData.onboarding.nextStep] || "/onboarding/college";
      window.location.replace(nextPath);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="auth-card">
        <div className="auth-card-topline">
          <span>{isSignup ? "JOIN THE CIRCLE" : "WELCOME BACK"}</span>
          <i />
        </div>
        <h1>
          {isSignup ? "Find your" : "Welcome to"}
          <br />
          <em>{isSignup ? "Dandiya connection." : "your circle."}</em>
        </h1>
        <p className="auth-intro">
          {isSignup
            ? "Your next meaningful connection could be one step away."
            : "Continue your journey with the people who share your campus."}
        </p>

        {step === "email" ? (
          <form onSubmit={requestOtp} noValidate>
            <label htmlFor="auth-email">University / Student email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@university.edu or student@college.ac.in"
              required
              autoComplete="email"
            />
            <p className="auth-helper">
              Enter your college, university, or official student email.
            </p>

            {isSignup && (
              <div className={`auth-terms-box ${termsError ? "auth-terms-box--error" : ""}`}>
                <label className="auth-terms-label">
                  <input
                    type="checkbox"
                    id="auth-terms-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setTermsError("");
                    }}
                  />
                  <span className="auth-terms-custom-box">
                    {agreedToTerms && <span className="auth-terms-check-icon">✓</span>}
                  </span>
                  <span className="auth-terms-text">
                    I confirm that I am <strong>18+ years old</strong> and agree to SGT&#39;s{" "}
                    <button
                      type="button"
                      className="auth-terms-link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTermsModal(true);
                      }}
                    >
                      Terms &amp; Conditions
                    </button>{" "}
                    and Privacy Policy.
                  </span>
                </label>
                {termsError && <p className="auth-terms-error-msg">{termsError}</p>}
              </div>
            )}

            {!isSignup && (
              <div className="auth-terms-login-note">
                By logging in, you agree to SGT&#39;s{" "}
                <button
                  type="button"
                  className="auth-terms-link-btn"
                  onClick={() => setShowTermsModal(true)}
                >
                  Terms &amp; Conditions
                </button>
                .
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={isLoading || (isSignup && !agreedToTerms)}
              title={isSignup && !agreedToTerms ? "Please accept Terms & Conditions to continue" : ""}
            >
              {isLoading ? (
                <Loader label="Sending code" />
              ) : (
                "Send verification code"
              )}
              <span>→</span>
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <label htmlFor="auth-otp">Verification code</label>
            <input
              id="auth-otp"
              className="auth-otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength="6"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
              autoComplete="one-time-code"
            />
            <p className="auth-helper">
              Code sent to <strong>{email}</strong>. It expires in 10 minutes.
            </p>
            <button
              className="auth-submit"
              type="submit"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? <Loader label="Checking" /> : "Verify and continue"}
              <span>→</span>
            </button>
            <button
              className="auth-back"
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setStatus({ type: "", message: "" });
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {status.message && (
          <div className={`auth-status auth-status--${status.type}`} role="status">
            <span>{status.message}</span>
            {status.type === "new_user" && (
              <button
                type="button"
                className="auth-status-action-btn"
                onClick={() => {
                  setStatus({ type: "", message: "" });
                  onSwitch("signup");
                }}
              >
                Switch to Sign Up →
              </button>
            )}
          </div>
        )}
        <p className="auth-switch">
          {isSignup ? "Already part of SGT?" : "New to SGT?"}{" "}
          <button
            type="button"
            onClick={() => onSwitch(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
      </div>

      {/* Quick Terms Modal for instant in-auth reading */}
      {showTermsModal && (
        <div className="auth-modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div
            className="auth-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <div className="auth-modal-header">
              <div>
                <span className="auth-modal-kicker">SGT LEGAL COMPLIANCE</span>
                <h3 id="auth-modal-title">Terms &amp; Conditions</h3>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowTermsModal(false)}
                aria-label="Close Terms modal"
              >
                ✕
              </button>
            </div>

            <div className="auth-modal-body">
              <div className="auth-modal-highlight">
                <strong>Key Highlights:</strong>
                <ul>
                  <li>Must be at least <strong>18 years old</strong> and enrolled in university/college.</li>
                  <li>Anonymous chat until <strong>mutual consent reveal</strong>.</li>
                  <li>Zero tolerance for fake accounts, harassment, bot abuse, or impersonation.</li>
                  <li>Eligible plans carry an 80% refund if unmatched within the 180-day service period.</li>
                </ul>
              </div>

              <p>
                By registering, you agree to adhere to all community standards, privacy rules,
                and user conduct policies outlined in our comprehensive agreement.
              </p>

              <div className="auth-modal-full-link">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="auth-modal-external-btn"
                >
                  Open Full Terms &amp; Conditions Page (19 Sections) ↗
                </a>
              </div>
            </div>

            <div className="auth-modal-footer">
              {isSignup && !agreedToTerms && (
                <button
                  type="button"
                  className="auth-modal-agree-btn"
                  onClick={() => {
                    setAgreedToTerms(true);
                    setTermsError("");
                    setShowTermsModal(false);
                  }}
                >
                  I Agree &amp; Confirm I&#39;m 18+
                </button>
              )}
              <button
                type="button"
                className="auth-modal-dismiss-btn"
                onClick={() => setShowTermsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AuthForm;
