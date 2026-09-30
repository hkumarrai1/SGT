import { useAuth } from "../../store";
import "./Hero.css";

function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="hero" id="home">
      <div className="hero-content">
        <h1 className="hero-title">
          This Navratri, find someone worth dancing with.
        </h1>

        <p className="hero-subtitle">
          Match with someone compatible. Chat anonymously. Build a vibe. Reveal
          when you’re both ready.
        </p>

        {isAuthenticated ? (
          <a className="hero-button" href="/dashboard">
            Go to Dashboard
          </a>
        ) : (
          <a className="hero-button" href="/auth?mode=signup">
            Find My Dandiya Partner
          </a>
        )}
      </div>
    </section>
  );
}

export default Hero;
