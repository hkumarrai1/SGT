import { useState } from "react";
import { useAuth } from "../../store";
import "./Navbar.css";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const closeMenu = () => setIsOpen(false);

  function handleLogout() {
    logout();
    closeMenu();
  }

  return (
    <header className="site-navbar">
      <a className="site-navbar-logo" href="#home" onClick={closeMenu}>
        <img src="/images/logo.png" alt="SGT - Souls Gather Together" />
      </a>

      <button
        className="site-navbar-toggle"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        className={`site-navbar-nav ${isOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <a href="#how-it-works" onClick={closeMenu}>
          How It Works
        </a>
        <a href="#plans" onClick={closeMenu}>
          Plans
        </a>
        <a href="#safety" onClick={closeMenu}>
          Safety
        </a>
        <a href="#faq" onClick={closeMenu}>
          FAQ
        </a>
        {isAuthenticated && (
          <a href="/dashboard" onClick={closeMenu}>
            Dashboard
          </a>
        )}
        <div className="site-navbar-actions">
          {isAuthenticated && (
            <span className="site-navbar-user">{user.email}</span>
          )}
          {isAuthenticated ? (
            <>
              <a
                className="site-navbar-dashboard"
                href="/dashboard"
                onClick={closeMenu}
              >
                Dashboard
              </a>
              <button
                className="site-navbar-login site-navbar-logout"
                type="button"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </>
          ) : (
            <a
              className="site-navbar-login"
              href="/auth?mode=login"
              onClick={closeMenu}
            >
              Log In
            </a>
          )}
          {!isAuthenticated && (
            <a
              className="site-navbar-signup"
              href="/auth?mode=signup"
              onClick={closeMenu}
            >
              Sign Up
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
