import Background from "../components/Background/Background";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";

function LivePhotoPlaceholder() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    window.location.assign("/auth?mode=signup");
    return null;
  }

  return (
    <main className="auth-page">
      <Background />
      <a className="auth-home" href="/">
        ← Back to SGT
      </a>
      <div className="auth-page-shell">
        <div className="auth-story">
          <span className="auth-story-kicker">STEP 5 · COMING NEXT</span>
          <h2>
            One more step
            <br />
            <em>to be ready.</em>
          </h2>
          <p>
            Your College ID has been submitted for manual review. Live Photo
            verification will be designed here separately.
          </p>
        </div>
        <section className="auth-card">
          <div className="auth-card-topline">
            <span>LIVE PHOTO</span>
            <i />
          </div>
          <h1>
            Coming
            <br />
            <em>next.</em>
          </h1>
          <p className="auth-intro">
            {user?.email} has completed the College ID submission step. No
            camera capture or liveness decision is implemented yet.
          </p>
        </section>
      </div>
    </main>
  );
}

export default LivePhotoPlaceholder;
