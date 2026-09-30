import { useEffect, useRef, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";
import "./LivePhoto.css";
import { API_URL } from "../config";

function LivePhoto() {
  const { token, isAuthenticated } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewRef = useRef("");
  const [cameraState, setCameraState] = useState("checking");
  const [captured, setCaptured] = useState(null);
  const [preview, setPreview] = useState("");
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSaving, setIsSaving] = useState(false);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    stopCamera();
    setCameraState("checking");
    setStatus({ type: "", message: "" });

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      setStatus({
        type: "error",
        message: "Camera access is unavailable on this browser. You can use your phone instead.",
      });
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      streamRef.current = stream;
      setCameraState("ready");
    } catch {
      setCameraState("unavailable");
      setStatus({
        type: "error",
        message:
          "Camera access was denied or not found. You can use your phone instead.",
      });
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=signup");
      return undefined;
    }
    startCamera();
    return () => {
      stopCamera();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (cameraState === "ready" && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch((err) => console.warn("Video autoplay prevented:", err));
      };
      video.play().catch(() => {});
    }
  }, [cameraState]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;

    if (width === 0 || height === 0) {
      setStatus({
        type: "error",
        message: "Camera feed is still loading. Please wait a moment and try again.",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Mirror image horizontally to match the selfie preview
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus({
            type: "error",
            message: "Unable to capture photo. Please try again.",
          });
          return;
        }
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        const nextPreview = URL.createObjectURL(blob);
        previewRef.current = nextPreview;
        setCaptured(blob);
        setPreview(nextPreview);
        stopCamera();
        setCameraState("captured");
      },
      "image/jpeg",
      0.92,
    );
  }

  async function submitLaptopPhoto(event) {
    event.preventDefault();
    if (!captured) return;
    setIsSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const body = new FormData();
      body.append("photo", captured, "live-photo.jpg");
      const response = await fetch(`${API_URL}/api/verification/live-photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to submit your Live Photo.");
      setStatus({
        type: "success",
        message: "Live Photo submitted for review.",
      });
      window.setTimeout(
        () => window.location.assign("/onboarding/review"),
        700,
      );
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function createPhoneSession() {
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch(`${API_URL}/api/verification/live-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to create phone session.");
      setSession(data.session);
      setSessionStatus("WAITING_FOR_PHONE");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  useEffect(() => {
    if (!session?.sessionId) return undefined;
    const poll = window.setInterval(async () => {
      const response = await fetch(
        `${API_URL}/api/verification/live-session/${session.sessionId}/status`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) return;
      const data = await response.json();
      setSessionStatus(data.session.status);
      if (data.session.status === "COMPLETED")
        window.location.assign("/onboarding/review");
    }, 2000);
    return () => window.clearInterval(poll);
  }, [session, token]);

  if (!isAuthenticated) return null;

  return (
    <main className="live-photo-page">
      <Background />
      <a className="auth-home" href="/">
        ← Back to SGT
      </a>
      <div className="live-photo-shell">
        <div className="live-photo-story">
          <span className="auth-story-kicker">STEP 5 · FRESH CAMERA PHOTO</span>
          <h2>
            Show up
            <br />
            <em>as yourself.</em>
          </h2>
          <p>
            This photo is captured fresh for verification. V1 does not make
            liveness or biometric decisions.
          </p>
          <span className="auth-story-note">
            <i /> CAMERA REQUIRED · PRIVATE REVIEW
          </span>
        </div>
        <section className="auth-card live-photo-card">
          <div className="auth-card-topline">
            <span>LIVE PHOTO</span>
            <i />
          </div>
          <h1>
            Capture your
            <br />
            <em>moment.</em>
          </h1>
          <p className="auth-intro">
            Use your laptop camera or capture it on your phone through a secure
            one-time QR session.
          </p>
          {cameraState === "checking" ? (
            <div className="live-loading">
              <Loader label="Checking camera" />
            </div>
          ) : (
            <>
              {cameraState === "ready" && (
                <div className="camera-frame">
                  <video ref={videoRef} autoPlay playsInline muted />
                  <button
                    className="camera-capture"
                    type="button"
                    onClick={capturePhoto}
                  >
                    Capture photo
                  </button>
                </div>
              )}
              {cameraState === "captured" && (
                <form className="live-form" onSubmit={submitLaptopPhoto}>
                  <img
                    className="live-preview"
                    src={preview}
                    alt="Captured Live Photo preview"
                  />
                  <button
                    className="live-secondary"
                    type="button"
                    onClick={() => {
                      setCaptured(null);
                      setPreview("");
                      startCamera();
                    }}
                  >
                    Retake photo
                  </button>
                  <button
                    className="auth-submit"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader label="Submitting" />
                    ) : (
                      "Submit Live Photo"
                    )}
                    <span>→</span>
                  </button>
                </form>
              )}
              {cameraState === "unavailable" && (
                <div className="camera-unavailable">
                  <strong>Camera not available</strong>
                  <p>
                    Allow camera access or use your phone to capture the
                    required fresh photo.
                  </p>
                </div>
              )}
              {!session ? (
                <button
                  className="phone-option"
                  type="button"
                  onClick={createPhoneSession}
                >
                  Use Your Phone <span>▣</span>
                </button>
              ) : (
                <div className="phone-session">
                  <img
                    src={session.qrDataUrl}
                    alt="Scan this QR code with your phone"
                  />
                  <strong>
                    {sessionStatus === "PHONE_CONNECTED"
                      ? "Phone connected"
                      : "Scan to open SGT on your phone"}
                  </strong>
                  <small>
                    {sessionStatus === "EXPIRED"
                      ? "Session expired. Generate a new QR code."
                      : "This QR code expires in 5 minutes and can be used once."}
                  </small>
                  {sessionStatus === "EXPIRED" && (
                    <button
                      className="live-secondary"
                      type="button"
                      onClick={() => setSession(null)}
                    >
                      Generate new QR
                    </button>
                  )}
                </div>
              )}
            </>
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

export default LivePhoto;
