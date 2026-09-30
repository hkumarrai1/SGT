import { useEffect, useRef, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import "../components/Authentication/Authentication.css";
import "./LivePhoto.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function MobileLivePhoto() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState("checking");
  const [captured, setCaptured] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const token = new URLSearchParams(window.location.search).get("t");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    if (!token || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      setStatus({
        type: "error",
        message:
          "This mobile verification link is invalid or your camera is unavailable.",
      });
      return;
    }
    try {
      const connectResponse = await fetch(
        `${API_URL}/api/verification/live-session/connect?t=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const connectData = await connectResponse.json();
      if (!connectResponse.ok)
        throw new Error(
          connectData.message ||
            "This verification session is no longer active.",
        );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraState("ready");
    } catch (error) {
      setCameraState("unavailable");
      setStatus({
        type: "error",
        message: error.message || "Camera permission was denied.",
      });
    }
  }

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCaptured(blob);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
        setCameraState("captured");
      },
      "image/jpeg",
      0.92,
    );
  }

  async function submitPhoto(event) {
    event.preventDefault();
    if (!captured || !token) return;
    setIsSaving(true);
    try {
      const body = new FormData();
      body.append("photo", captured, "mobile-live-photo.jpg");
      const response = await fetch(
        `${API_URL}/api/verification/live-photo/mobile?t=${encodeURIComponent(token)}`,
        { method: "POST", body },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to submit your Live Photo.");
      setStatus({
        type: "success",
        message: "Photo submitted. You can close this page.",
      });
      setCameraState("submitted");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mobile-live-page">
      <Background />
      <section className="auth-card mobile-live-card">
        <div className="auth-card-topline">
          <span>SGT · SECURE CAMERA</span>
          <i />
        </div>
        <h1>
          Capture your
          <br />
          <em>Live Photo.</em>
        </h1>
        <p className="auth-intro">
          Take a fresh photo for your SGT verification flow. This is not a
          liveness or biometric check.
        </p>
        {cameraState === "checking" && (
          <div className="live-loading">
            <Loader label="Opening camera" />
          </div>
        )}
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
          <form className="live-form" onSubmit={submitPhoto}>
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
            <button className="auth-submit" type="submit" disabled={isSaving}>
              {isSaving ? <Loader label="Submitting" /> : "Submit photo"}
              <span>→</span>
            </button>
          </form>
        )}
        {cameraState === "submitted" && (
          <p className="mobile-success">
            Your Live Photo has been submitted successfully.
          </p>
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
    </main>
  );
}

export default MobileLivePhoto;
