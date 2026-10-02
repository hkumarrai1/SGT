import { useEffect, useRef, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";
import "./ProfilePhoto.css";
import { API_URL } from "../config";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ProfilePhoto() {
  const { token, isAuthenticated, user } = useAuth();
  const inputRef = useRef(null);
  const previewRef = useRef("");
  const [currentPhoto, setCurrentPhoto] = useState(null);
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

    async function loadPhoto() {
      try {
        const response = await fetch(`${API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.status === 400) {
          window.location.assign("/onboarding/college");
          return;
        }
        if (!response.ok)
          throw new Error(data.message || "Unable to load your profile photo.");
        if (!data.profile || !data.profile.fullName) {
          window.location.assign("/onboarding/profile");
          return;
        }
        setCurrentPhoto(data.profilePhoto);
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadPhoto();
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
        message: "Choose a JPG, PNG, or WebP image.",
      });
    if (file.size > MAX_FILE_SIZE)
      return setStatus({
        type: "error",
        message: "Profile photo must be 5 MB or smaller.",
      });
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = URL.createObjectURL(file);
    previewRef.current = nextPreview;
    setSelectedFile(file);
    setPreview(nextPreview);
  }

  async function uploadPhoto(event) {
    event.preventDefault();
    if (!selectedFile)
      return setStatus({
        type: "error",
        message: "Select a profile photo first.",
      });
    setIsSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const body = new FormData();
      body.append("photo", selectedFile);
      const response = await fetch(`${API_URL}/api/profile/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to save your profile photo.");
      setCurrentPhoto(data.profilePhoto);
      setSelectedFile(null);
      setPreview("");
      setStatus({
        type: "success",
        message: "Profile photo saved. Moving to verification...",
      });
      window.setTimeout(
        () => window.location.assign("/onboarding/college-id"),
        700,
      );
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <main className="photo-page">
      <Background />
      <a className="auth-home" href="/">
        ← Back to SGT
      </a>
      <div className="photo-page-shell">
        <div className="photo-story">
          <span className="auth-story-kicker">STEP 3 · PROFILE PHOTO</span>
          <h2>
            Let them see
            <br />
            <em>your real smile.</em>
          </h2>
          <p>
            Choose a clear, natural photograph. This is a profile image, not a
            liveness or identity-verification check.
          </p>
          <span className="auth-story-note">
            <i /> JPG · PNG · WEBP · 5 MB MAX
          </span>
        </div>
        <section className="auth-card photo-card">
          <div className="auth-card-topline">
            <span>{currentPhoto ? "REPLACE PHOTO" : "ADD YOUR PHOTO"}</span>
            <i />
          </div>
          <h1>
            Your
            <br />
            <em>profile photo.</em>
          </h1>
          <p className="auth-intro">
            {user?.email} · Use a photo where you are easy to recognize.
          </p>
          {isLoading ? (
            <div className="photo-loading">
              <Loader label="Loading your photo" />
            </div>
          ) : (
            <form className="photo-form" onSubmit={uploadPhoto}>
              <div className="photo-preview-wrap">
                {preview || currentPhoto?.secureUrl || currentPhoto?.url ? (
                  <img
                    src={preview || currentPhoto.secureUrl || currentPhoto.url}
                    alt="Profile preview"
                    className="photo-preview"
                  />
                ) : (
                  <div className="photo-empty">
                    Your photo preview appears here
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                className="photo-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseFile}
              />
              <button
                className="photo-choose"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                {currentPhoto ? "Choose a replacement" : "Choose a photo"}
              </button>
              <p className="photo-requirements">
                JPG, PNG, or WebP · Maximum 5 MB · Minimum 200 × 200 px
              </p>
              <button
                className="auth-submit"
                type="submit"
                disabled={!selectedFile || isSaving}
              >
                {isSaving ? (
                  <Loader label="Uploading" />
                ) : currentPhoto ? (
                  "Replace and continue"
                ) : (
                  "Save and continue"
                )}
                <span>→</span>
              </button>
            </form>
          )}
          {status.message && (
            <p
              className={`auth-status auth-status--${status.type}`}
              role="status"
            >
              {status.message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProfilePhoto;
