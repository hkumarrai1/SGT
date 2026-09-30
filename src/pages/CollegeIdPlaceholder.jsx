import Background from "../components/Background/Background";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";

function CollegeIdPlaceholder() {
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
          <span className="auth-story-kicker">STEP 3 · COMING NEXT</span>
          <h2>
            Ready for
            <br />
            <em>verification.</em>
          </h2>
          <p>
            Your basic profile is complete. College ID verification will be
            designed here in the next onboarding step.
          </p>
        </div>
        <section className="auth-card">
          <div className="auth-card-topline">
            <span>COLLEGE ID</span>
            <i />
          </div>
          <h1>
            Coming
            <br />
            <em>next.</em>
          </h1>
          <p className="auth-intro">
            {user?.email} has completed the basic profile step. No document
            upload or verification is implemented yet.
          </p>
        </section>
      </div>
    </main>
  );
}

export default CollegeIdPlaceholder;
