import { useEffect, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";
import "./ProfileDetails.css";
import { API_URL } from "../config";
const emptyForm = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  course: "",
  academicYear: "",
  studentId: "",
};

function formatDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function ProfileDetails() {
  const { token, isAuthenticated, user } = useAuth();
  const [institution, setInstitution] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=signup");
      return;
    }

    async function loadProfile() {
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
          throw new Error(data.message || "Unable to load your profile.");
        setInstitution(data.institution);
        setForm({
          ...emptyForm,
          ...(data.profile || {}),
          dateOfBirth: formatDate(data.profile?.dateOfBirth),
        });
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [isAuthenticated, token]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validate() {
    if (form.fullName.trim().length < 2 || form.fullName.trim().length > 100)
      return "Enter your full name (2-100 characters).";
    if (!form.dateOfBirth || new Date(form.dateOfBirth) >= new Date())
      return "Enter a valid date of birth.";
    if (!form.gender) return "Select your gender.";
    if (form.course.trim().length < 2 || form.course.trim().length > 100)
      return "Enter your course or degree (2-100 characters).";
    if (!form.academicYear) return "Select your current academic year.";
    if (form.studentId.trim().length < 2 || form.studentId.trim().length > 60)
      return "Enter a valid student or enrollment ID.";
    return "";
  }

  async function submitProfile(event) {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      setStatus({ type: "error", message: validationMessage });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to save your profile.");
      setStatus({
        type: "success",
        message: "Profile saved. Moving to your profile photo...",
      });
      window.setTimeout(
        () => window.location.assign("/onboarding/profile-photo"),
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
    <main className="profile-page">
      <Background />
      <a className="auth-home" href="/">
        ← Back to SGT
      </a>
      <div className="profile-page-shell">
        <div className="profile-story">
          <span className="auth-story-kicker">STEP 2 · BASIC PROFILE</span>
          <h2>
            Make it
            <br />
            <em>feel like you.</em>
          </h2>
          <p>
            These essentials help us prepare your SGT profile. Matching
            preferences will be collected separately later.
          </p>
          <span className="auth-story-note">
            <i /> PRIVATE · VERIFIED · ON CAMPUS
          </span>
        </div>
        <section className="auth-card profile-card">
          <div className="auth-card-topline">
            <span>YOUR DETAILS</span>
            <i />
          </div>
          <h1>
            Build your
            <br />
            <em>profile.</em>
          </h1>
          {isLoading ? (
            <div className="profile-loading">
              <Loader label="Loading your profile" />
            </div>
          ) : (
            <form className="profile-form" onSubmit={submitProfile}>
              <div className="profile-institution">
                <span>Selected college</span>
                <strong>
                  {institution?.name || "Institution unavailable"}
                </strong>
                <small>
                  {institution?.city || "Confirmed from your onboarding"}
                </small>
              </div>
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                placeholder="Enter your full name"
                maxLength="100"
                required
              />
              <div className="profile-form-row">
                <div>
                  <label htmlFor="dateOfBirth">Date of birth</label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={updateField}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <label htmlFor="course">Course / degree</label>
              <input
                id="course"
                name="course"
                value={form.course}
                onChange={updateField}
                placeholder="e.g. B.Tech Computer Science"
                maxLength="100"
                required
              />
              <div className="profile-form-row">
                <div>
                  <label htmlFor="academicYear">Current year</label>
                  <select
                    id="academicYear"
                    name="academicYear"
                    value={form.academicYear}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select year</option>
                    <option value="1">1st year</option>
                    <option value="2">2nd year</option>
                    <option value="3">3rd year</option>
                    <option value="4">4th year</option>
                    <option value="5">5th year</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="studentId">Student / enrollment ID</label>
                  <input
                    id="studentId"
                    name="studentId"
                    value={form.studentId}
                    onChange={updateField}
                    placeholder="Your ID"
                    maxLength="60"
                    required
                  />
                </div>
              </div>
              <button className="auth-submit" type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader label="Saving profile" />
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
          <p className="profile-account">
            Signed in as <strong>{user?.email}</strong>
          </p>
        </section>
      </div>
    </main>
  );
}

export default ProfileDetails;
