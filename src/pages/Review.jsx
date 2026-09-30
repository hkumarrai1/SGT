import { useEffect, useState } from "react";
import { useAuth } from "../store";
import Loader from "../components/Loader/Loader";
import Background from "../components/Background/Background";
import "../components/Authentication/Authentication.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
function Review() {
  const { token, isAuthenticated } = useAuth();
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) return window.location.assign("/auth?mode=login");
    fetch(`${API_URL}/api/verification/review`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        setReview(d.review);
      })
      .catch((e) => setError(e.message));
  }, [isAuthenticated, token]);
  async function submit() {
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/api/verification/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      window.location.assign("/verification/pending");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!isAuthenticated) return null;
  return (
    <main className="auth-page">
      <Background />
      <section className="auth-card">
        <div className="auth-card-topline">
          <span>FINAL REVIEW</span>
          <i />
        </div>
        <h1>
          Ready to
          <br />
          <em>submit?</em>
        </h1>
        {!review && !error ? (
          <Loader label="Loading review" />
        ) : error ? (
          <p className="auth-status auth-status--error">{error}</p>
        ) : (
          <>
            <div className="review-summary">
              <p>
                <b>College:</b> {review.institution?.name}
              </p>
              <p>
                <b>Name:</b> {review.profile?.fullName}
              </p>
              <p>
                <b>Course:</b> {review.profile?.course}
              </p>
              <p>
                <b>Year:</b> {review.profile?.academicYear}
              </p>
              <p>
                <b>Student ID:</b> {review.profile?.studentId}
              </p>
              <p>✓ Profile photo uploaded</p>
              <p>✓ College ID uploaded for review</p>
              <p>✓ Mandatory Live Photo captured</p>
            </div>
            <div className="review-actions">
              <button
                className="live-secondary"
                type="button"
                onClick={() => window.location.assign("/onboarding/profile")}
              >
                Edit profile
              </button>
              <button
                className="live-secondary"
                type="button"
                onClick={() =>
                  window.location.assign("/onboarding/profile-photo")
                }
              >
                Replace photo
              </button>
            </div>
            <button className="auth-submit" disabled={busy} onClick={submit}>
              {busy ? <Loader label="Submitting" /> : "Submit for Verification"}
              <span>→</span>
            </button>
          </>
        )}
      </section>
    </main>
  );
}
export default Review;
