import { useEffect, useState } from "react";
import Background from "../components/Background/Background";
import Login from "../components/Authentication/Login";
import SignUp from "../components/Authentication/SignUp";
import "../components/Authentication/Authentication.css";

function getMode() {
  return new URLSearchParams(window.location.search).get("mode") === "login"
    ? "login"
    : "signup";
}

function Authentication() {
  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    const handlePopState = () => setMode(getMode());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function switchMode(nextMode) {
    window.history.pushState({}, "", `/auth?mode=${nextMode}`);
    setMode(nextMode);
  }

  return (
    <main className="auth-page">
      <Background />
      <a className="auth-home" href="/">
        ← Back to SGT
      </a>
      <div className="auth-page-shell">
        <div className="auth-story">
          <span className="auth-story-kicker">SOULS GATHER TOGETHER</span>
          <h2>
            One campus.
            <br />
            <em>Many possibilities.</em>
          </h2>
          <p>
            Meet someone compatible, build a genuine vibe, and step into Dandiya
            Night feeling comfortable and ready.
          </p>
          <span className="auth-story-note">
            <i /> PRIVATE · VERIFIED · ON CAMPUS
          </span>
        </div>
        {mode === "login" ? (
          <Login onSwitch={switchMode} />
        ) : (
          <SignUp onSwitch={switchMode} />
        )}
      </div>
    </main>
  );
}

export default Authentication;
