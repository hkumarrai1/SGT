import { useState } from "react";
import { useAuth } from "../../store";
import Loader from "../Loader/Loader";
import "./Authentication.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AuthForm({ mode = "signup", onSwitch }) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { setSession } = useAuth();

  const requestPath = isSignup ? "signup" : "login";

  async function requestOtp(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/${requestPath}/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send OTP.");
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
          body: JSON.stringify({ email, otp }),
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
      window.location.assign(nextPath);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
        <form onSubmit={requestOtp}>
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
          <button className="auth-submit" type="submit" disabled={isLoading}>
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
        <p className={`auth-status auth-status--${status.type}`} role="status">
          {status.message}
        </p>
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
  );
}

export default AuthForm;
