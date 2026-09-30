import { useEffect, useRef, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";
import "./CollegeId.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);

function CollegeId() {
  const { token, isAuthenticated, user } = useAuth();
  const inputRef = useRef(null);
  const previewRef = useRef("");
  const [institution, setInstitution] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState("NOT_UPLOADED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=signup");
      return;
    }

    async function loadVerificationStatus() {
      try {
        const response = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.message || "Unable to load verification status.",
          );
        setInstitution(data.onboarding.institution);
        setVerificationStatus(
          data.onboarding.collegeIdStatus || "NOT_UPLOADED",
        );
        setRejectionReason(data.onboarding?.collegeIdRejectionReason || "");
        if (!data.onboarding?.institutionSelected) {
          window.location.assign("/onboarding/college");
          return;
        }
        if (!data.onboarding?.profileComplete) {
          window.location.assign("/onboarding/profile");
          return;
        }
        if (!data.onboarding?.profilePhotoComplete) {
          window.location.assign("/onboarding/profile-photo");
          return;
        }
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadVerificationStatus();
  }, [isAuthenticated, token]);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus({ type: "", message: "" });
    if (!ACCEPTED_TYPES.has(file.type))
      return setStatus({
        type: "error",
        message: "Choose a JPG, JPEG, or PNG image.",
      });
    if (file.size > MAX_FILE_SIZE)
      return setStatus({
        type: "error",
        message: "College ID must be 10 MB or smaller.",
      });
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = URL.createObjectURL(file);
    previewRef.current = nextPreview;
    setSelectedFile(file);
    setPreview(nextPreview);
  }

  async function submitCollegeId(event) {
    event.preventDefault();
    if (!selectedFile)
      return setStatus({
        type: "error",
        message: "Select your College ID card first.",
      });
    setIsSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const body = new FormData();
      body.append("document", selectedFile);
      const response = await fetch(`${API_URL}/api/verification/college-id`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to submit your College ID.");
      setVerificationStatus(data.verification.verificationStatus);
      setStatus({
        type: "success",
        message: "College ID submitted for manual review.",
      });
      window.setTimeout(
        () => window.location.assign("/onboarding/live-photo"),
        700,
      );
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthenticated) return null;
  const canUpload =
    verificationStatus === "NOT_UPLOADED" || verificationStatus === "REJECTED";

  return (
    <main className="college-id-page">
      <Background />
      <a className="auth-home" href="/">
        ← Back to SGT
      </a>
      <div className="college-id-shell">
        <div className="college-id-story">
          <span className="auth-story-kicker">
            STEP 4 · MANDATORY VERIFICATION
          </span>
          <h2>
            Keep the
            <br />
            <em>community trusted.</em>
          </h2>
          <p>
            Your College ID is collected privately for SGT verification and
            manual review. It will not be shown as part of your public profile.
          </p>
          <span className="auth-story-note">
            <i /> PRIVATE · REVIEWED BY SGT
          </span>
        </div>
        <section className="auth-card college-id-card">
          <div className="auth-card-topline">
            <span>COLLEGE ID CARD</span>
            <i />
          </div>
          <h1>
            Verify your
            <br />
            <em>campus.</em>
          </h1>
          <p className="auth-intro">
            {institution?.name || "Your selected institution"} · A valid College
            ID is mandatory for SGT verification.
          </p>
          {isLoading ? (
            <div className="college-id-loading">
              <Loader label="Checking verification" />
            </div>
          ) : canUpload ? (
            <form className="college-id-form" onSubmit={submitCollegeId}>
              {verificationStatus === "REJECTED" && (
                <p className="college-id-rejection">
                  Previous submission rejected
                  {rejectionReason
                    ? `: ${rejectionReason}`
                    : ". Please upload a new image."}
                </p>
              )}
              <div className="college-id-preview-wrap">
                {preview ? (
                  <img
                    src={preview}
                    alt="College ID preview"
                    className="college-id-preview"
                  />
                ) : (
                  <div className="college-id-empty">
                    Your ID preview appears here
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                className="college-id-file-input"
                type="file"
                accept="image/jpeg,image/png"
                onChange={chooseFile}
              />
              <button
                className="college-id-choose"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                Choose College ID image
              </button>
              <p className="college-id-requirements">
                JPG, JPEG, or PNG · Maximum 10 MB · Clear and readable image
              </p>
              <button
                className="auth-submit"
                type="submit"
                disabled={!selectedFile || isSaving}
              >
                {isSaving ? <Loader label="Submitting" /> : "Submit for review"}
                <span>→</span>
              </button>
            </form>
          ) : (
            <div className="college-id-pending">
              <span className="college-id-status-mark">✓</span>
              <h3>Submitted for review</h3>
              <p>
                Your College ID is safely stored for manual SGT review. You do
                not need to upload it again.
              </p>
              <button
                className="auth-submit"
                type="button"
                onClick={() => window.location.assign("/onboarding/live-photo")}
              >
                Continue <span>→</span>
              </button>
            </div>
          )}
          {status.message && (
            <p
              className={`auth-status auth-status--${status.type}`}
              role="status"
            >
              {status.message}
            </p>
          )}
          <p className="college-id-account">
            Signed in as <strong>{user?.email}</strong>
          </p>
        </section>
      </div>
    </main>
  );
}

export default CollegeId;
