import { useEffect, useMemo, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";
import "./CollegeSelection.css";
import { API_URL } from "../config";

function CollegeSelection() {
  const { token, isAuthenticated } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=signup");
      return;
    }

    async function loadInstitutions() {
      try {
        const response = await fetch(`${API_URL}/api/institutions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load colleges.");
        setInstitutions(data.institutions);
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadInstitutions();
  }, [isAuthenticated, token]);

  const filteredInstitutions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return institutions.filter((institution) =>
      [institution.name, institution.shortName, institution.city]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [institutions, search]);

  async function saveSelection(event) {
    event.preventDefault();
    if (!selectedId) return;
    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${API_URL}/api/profile/institution`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ institutionId: selectedId }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to save your college.");
      setStatus({
        type: "success",
        message: "College selected. Moving to your next step...",
      });
      window.setTimeout(
        () => window.location.assign("/onboarding/profile"),
        700,
      );
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="college-page">
      <Background />
      <a className="auth-home" href="/">
        ← Back to SGT
      </a>
      <section className="college-card">
        <div className="auth-card-topline">
          <span>FIRST STEP</span>
          <i />
        </div>
        <h1>
          Find your
          <br />
          <em>campus.</em>
        </h1>
        <p className="auth-intro">
          Choose your university so we can create a more meaningful and relevant
          SGT experience for you.
        </p>

        {isLoading ? (
          <div className="college-loading">
            <Loader label="Finding active colleges" />
          </div>
        ) : (
          <form onSubmit={saveSelection}>
            <label htmlFor="college-search">Search your college</label>
            <input
              id="college-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or city"
            />
            <div
              className="college-options"
              role="radiogroup"
              aria-label="Active colleges"
            >
              {filteredInstitutions.map((institution) => (
                <button
                  className={`college-option ${selectedId === institution.id ? "is-selected" : ""}`}
                  type="button"
                  key={institution.id}
                  onClick={() => setSelectedId(institution.id)}
                  role="radio"
                  aria-checked={selectedId === institution.id}
                >
                  <span className="college-option-mark">
                    {selectedId === institution.id ? "✓" : ""}
                  </span>
                  <span>
                    <strong>{institution.name}</strong>
                    <small>
                      {institution.city ||
                        institution.shortName ||
                        "University campus"}
                    </small>
                  </span>
                </button>
              ))}
              {!filteredInstitutions.length && (
                <p className="college-empty">
                  No active college matches your search.
                </p>
              )}
            </div>
            <button
              className="auth-submit"
              type="submit"
              disabled={!selectedId || isSaving}
            >
              {isSaving ? <Loader label="Saving" /> : "Continue"}
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
    </main>
  );
}

export default CollegeSelection;
