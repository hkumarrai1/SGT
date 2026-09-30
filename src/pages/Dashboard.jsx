import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../store";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import "./Dashboard.css";
import { API_URL } from "../config";

// Controlled SGT Tag Library
const TAG_CATEGORIES = {
  personality: ["Introvert", "Ambivert", "Extrovert"],
  energy: ["Calm", "Balanced", "Energetic", "High Energy"],
  lifestyle: ["Homebody", "Explorer", "Adventurous", "Planner", "Spontaneous"],
  socialStyle: ["Private", "Balanced", "Social", "One-on-One", "Crowd Lover"],
  interests: [
    "Movie Lover",
    "Foodie",
    "Gamer",
    "Music Lover",
    "Activity Lover",
  ],
  dandiya: [
    "Traditional",
    "Modern Vibe",
    "Bollywood Lover",
    "Social Dancer",
    "Dance Partner",
  ],
  connection: [
    "Deep Conversationalist",
    "Humor Driven",
    "Common-Interest Seeker",
    "Experience Seeker",
    "Fun Seeker",
  ],
};

const CATEGORY_LABELS = {
  energy: "Energy",
  lifestyle: "Lifestyle",
  socialStyle: "Social Style",
  interests: "Interest",
  dandiya: "Dandiya Vibe",
  connection: "Connection",
};

const ALL_ALLOWED_TAGS = new Set(Object.values(TAG_CATEGORIES).flat());
const PERSONALITY_TAGS = new Set(TAG_CATEGORIES.personality);

const PERSONALITY_DESCRIPTIONS = {
  Extrovert:
    "You thrive around vibrant energy, light up celebrations, and naturally turn group moments into memorable connections.",
  Ambivert:
    "You balance lively Dandiya celebration with meaningful one-on-one conversations, adapting effortlessly to the room's vibe.",
  Introvert:
    "You value authentic, thoughtful connections and comfortable shared moments within the festive campus celebration.",
};

function readStoredTags() {
  try {
    const raw = localStorage.getItem("sgt_user_tags");
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Dashboard() {
  const { token, isAuthenticated, user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [tags, setTags] = useState(readStoredTags);
  const [activePlan, setActivePlan] = useState("none");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [isLoading, setIsLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Matchmaking Engine states (Step 9 & Step 10)
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchSession, setMatchSession] = useState({ status: "IDLE", attempt: 1 });
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isMatching, setIsMatching] = useState(false);
  const [scannerStep, setScannerStep] = useState(0);
  const [matchAlert, setMatchAlert] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=login");
      return;
    }

    async function loadDashboardData() {
      try {
        // 1. Fetch Onboarding / Verification Status
        const statusRes = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statusData = await statusRes.json();

        if (!statusRes.ok || !statusData.onboarding) {
          window.location.replace("/auth?mode=login");
          return;
        }

        const { onboarding } = statusData;

        // STRICT VERIFICATION & ONBOARDING GATEKEEPING:
        // Unverified, pending, or rejected users CANNOT view the Dashboard!
        if (onboarding.verificationStatus === "PENDING") {
          window.location.replace("/verification/pending");
          return;
        }
        if (onboarding.verificationStatus === "REJECTED") {
          window.location.replace("/onboarding/review");
          return;
        }
        if (onboarding.verificationStatus !== "VERIFIED") {
          const stepMap = {
            COLLEGE: "/onboarding/college",
            PROFILE: "/onboarding/profile",
            PROFILE_PHOTO: "/onboarding/profile-photo",
            COLLEGE_ID: "/onboarding/college-id",
            LIVE_PHOTO: "/onboarding/live-photo",
            REVIEW: "/onboarding/review",
            VERIFICATION_PENDING: "/verification/pending",
          };
          window.location.replace(stepMap[onboarding.nextStep] || "/onboarding/review");
          return;
        }

        // User is verified: check if they have answered questionnaire
        if (onboarding.questionnaireStatus !== "COMPLETED") {
          window.location.replace("/questionnaire");
          return;
        }

        if (onboarding.profile) setProfile(onboarding.profile);
        if (onboarding.institution) setInstitution(onboarding.institution);

        // 2. Fetch Profile Photo & Full Profile Data
        const profileRes = await fetch(`${API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();

        if (profileRes.ok) {
          if (profileData.profilePhoto) {
            setProfilePhoto(profileData.profilePhoto);
          }
          if (profileData.profile) {
            setProfile((prev) => ({ ...(prev || {}), ...profileData.profile }));
          }
          if (profileData.institution) {
            setInstitution(profileData.institution);
          }
        }

        // 3. Fetch Questionnaire Tags from Backend
        const questRes = await fetch(`${API_URL}/api/questionnaire`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const questData = await questRes.json();

        if (questRes.ok && Array.isArray(questData.tags) && questData.tags.length > 0) {
          setTags(questData.tags);
          try {
            localStorage.setItem("sgt_user_tags", JSON.stringify(questData.tags));
          } catch {
            // Ignore storage errors
          }
        }

        // 4. Fetch Payment & Plan Status
        const payRes = await fetch(`${API_URL}/api/payment/my-payment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (payRes.ok) {
          const payData = await payRes.json();
          if (payData.activePlan) setActivePlan(payData.activePlan);
          if (payData.paymentStatus) setPaymentStatus(payData.paymentStatus);
        }

        // 5. Fetch Match Session & Active Match
        const [matchRes, sessionRes] = await Promise.all([
          fetch(`${API_URL}/api/matches/current`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/matches/session`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (matchRes.ok) {
          const matchData = await matchRes.json();
          if (matchData.match) {
            setActiveMatch(matchData.match);
          }
        }

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.session) {
            setMatchSession(sessionData.session);
            if (sessionData.session.cooldownSeconds > 0) {
              setCooldownSeconds(sessionData.session.cooldownSeconds);
            }
          }
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [isAuthenticated, token]);

  // Live 60-second Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setMatchSession((s) => ({ ...s, status: "IDLE" }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Handler: Start Matchmaking
  const handleFindMatch = async () => {
    if (paymentStatus !== "PAID") {
      window.location.assign("/payment");
      return;
    }

    setIsMatching(true);
    setScannerStep(0);
    setMatchAlert({ type: "", message: "" });

    // Step animation cadence
    const stepInterval = setInterval(() => {
      setScannerStep((prev) => (prev < 2 ? prev + 1 : prev));
    }, 1100);

    try {
      const res = await fetch(`${API_URL}/api/matches/find`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok) {
        throw new Error(data.message || "Unable to initiate matchmaking.");
      }

      if (data.status === "MATCHED" && data.match) {
        setActiveMatch(data.match);
        setMatchSession({ status: "MATCHED", attempt: data.attempt || 1 });
        setCooldownSeconds(0);
        setMatchAlert({
          type: "success",
          message: "✦ Dandiya Partner Found! Your anonymous match is ready below.",
        });
      } else if (data.status === "WAITING_RETRY") {
        setCooldownSeconds(data.cooldownSeconds || 60);
        setMatchSession({
          status: "WAITING_RETRY",
          attempt: data.attempt || 1,
          nextRetryAt: data.nextRetryAt,
        });
        setMatchAlert({
          type: "info",
          message: data.message || "Scanning campus pool. Please retry in 60s.",
        });
      }
    } catch (err) {
      clearInterval(stepInterval);
      setMatchAlert({
        type: "error",
        message: err.message || "Matchmaking request failed. Please try again.",
      });
    } finally {
      setIsMatching(false);
    }
  };

  // Handler: Decline Match
  const handleDeclineMatch = async (matchId) => {
    if (!window.confirm("Are you sure you want to decline this match and find a new partner?")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/matches/${matchId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setActiveMatch(null);
        setMatchSession({ status: "IDLE", attempt: 1 });
        setCooldownSeconds(0);
        setMatchAlert({
          type: "info",
          message: "Match declined. You can initiate a new search whenever ready.",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Safe tag processing & categorization
  const { primaryPersonality, supportingVibes } = useMemo(() => {
    // Only accept tags that belong to the controlled SGT tag library
    const validTags = (tags || []).filter((tag) => ALL_ALLOWED_TAGS.has(tag));

    // Identify Primary Personality: ONLY Introvert / Ambivert / Extrovert
    const primary = validTags.find((tag) => PERSONALITY_TAGS.has(tag)) || null;

    // Filter supporting vibes (excluding the primary tag)
    const supporting = validTags
      .filter((tag) => tag !== primary)
      .map((tag) => {
        let category = "Vibe";
        for (const [catKey, list] of Object.entries(TAG_CATEGORIES)) {
          if (catKey !== "personality" && list.includes(tag)) {
            category = CATEGORY_LABELS[catKey] || "Vibe";
            break;
          }
        }
        return { name: tag, category };
      });

    return { primaryPersonality: primary, supportingVibes: supporting };
  }, [tags]);

  if (!isAuthenticated) return null;

  if (isLoading || !profile) {
    return (
      <main className="dashboard-page">
        <Background />
        <div style={{ display: "grid", minHeight: "100vh", placeItems: "center" }}>
          <Loader label="Opening your SGT space" />
        </div>
      </main>
    );
  }

  const fullName = profile?.fullName || "Fellow Student";
  const firstName = fullName.trim().split(" ")[0] || "Explorer";
  const photoUrl = !imgError && (profilePhoto?.secureUrl || profilePhoto?.url);
  const initials = fullName
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "SGT";

  const collegeName = institution?.name || "University Campus";
  const courseDetails = profile?.course || "University Student";
  const academicYear = profile?.academicYear ? `Year ${profile.academicYear}` : "";

  return (
    <main className="dashboard-page">
      <Background />

      {/* Navigation */}
      <header className="dashboard-nav">
        <a className="dashboard-brand" href="/" aria-label="SGT Home">
          <img src="/images/logo.png" alt="SGT - Souls Gather Together" />
        </a>

        <nav className="dashboard-nav-links" aria-label="Dashboard navigation">
          <a href="/">Home</a>
          <a href="#my-vibe">My Vibe</a>
          <a href="#about-you">About You</a>
          <a href="/payment" style={{ color: "#f4c66c" }}>
            {paymentStatus === "PAID" ? "My Plan" : "Dandiya Plan"}
          </a>
        </nav>

        <div className="dashboard-nav-user">
          {photoUrl ? (
            <img
              className="dashboard-nav-avatar"
              src={photoUrl}
              alt={firstName}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="dashboard-nav-avatar-initials" aria-hidden="true">
              {initials}
            </div>
          )}
          <button
            className="dashboard-logout-btn"
            type="button"
            onClick={logout}
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="dashboard-shell">
        {/* ==========================================================
            1. TOP HERO / PROFILE SECTION
            ========================================================== */}
        <section className="dashboard-hero" aria-label="Your Profile Hero">
          <div className="dashboard-hero-avatar-wrap">
            {photoUrl ? (
              <img
                className="dashboard-hero-avatar"
                src={photoUrl}
                alt={`Profile photo of ${fullName}`}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="dashboard-hero-avatar-initials" aria-hidden="true">
                {initials}
              </div>
            )}
            <div className="dashboard-hero-badge" title="Verified Campus Student">
              ✓
            </div>
          </div>

          <div className="dashboard-hero-body">
            <div className="dashboard-kicker">
              <span>SGT PROFILE</span>
              <i aria-hidden="true" />
            </div>
            <h1 className="dashboard-hero-title">
              Welcome back, <em>{firstName}.</em>
            </h1>
            <p className="dashboard-hero-subtitle">
              Your SGT journey starts here.
            </p>

            <div className="dashboard-hero-meta">
              <span className="dashboard-meta-chip dashboard-meta-chip--highlight">
                🏛️ {collegeName}
              </span>
              {courseDetails && (
                <span className="dashboard-meta-chip">
                  🎓 {courseDetails} {academicYear ? `· ${academicYear}` : ""}
                </span>
              )}
              <span className="dashboard-meta-chip">
                ✨ Verified Profile
              </span>
              {paymentStatus === "PAID" ? (
                <span
                  className="dashboard-meta-chip"
                  style={{
                    borderColor: "#f4c66c",
                    color: "#f4c66c",
                    background: "rgba(244, 198, 108, 0.12)",
                    fontWeight: 700,
                  }}
                >
                  {activePlan === "premium"
                    ? "♛ Premium Plan Active"
                    : "🎟️ Vibe Plan Active"}
                </span>
              ) : paymentStatus === "PENDING" ? (
                <a
                  href="/payment"
                  className="dashboard-meta-chip"
                  style={{
                    borderColor: "#f4c66c",
                    color: "#f4c66c",
                    textDecoration: "none",
                  }}
                >
                  ⏳ Payment Pending Review →
                </a>
              ) : (
                <a
                  href="/payment"
                  className="dashboard-meta-chip"
                  style={{
                    borderColor: "rgba(244, 198, 108, 0.4)",
                    color: "#f4c66c",
                    background: "rgba(244, 198, 108, 0.15)",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  ⚡ Select Dandiya Plan →
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ==========================================================
            2. PRIMARY "YOUR SGT VIBE" SECTION
            ========================================================== */}
        <section className="dashboard-vibe-section" id="my-vibe" aria-label="Your SGT Vibe">
          <header className="dashboard-vibe-header">
            <div className="dashboard-kicker">
              <span>AI PERSONALITY &amp; EVENT VIBE</span>
              <i aria-hidden="true" />
            </div>
            <h2>
              Your SGT <em>Vibe.</em>
            </h2>
            <p>
              Curated through thoughtful questionnaire analysis to help you connect
              with someone naturally compatible before the Dandiya celebration.
            </p>
          </header>

          {/* Primary Personality Centerpiece */}
          <div className="dashboard-personality-centerpiece">
            <span className="dashboard-personality-eyebrow">
              YOUR PERSONALITY
            </span>

            {primaryPersonality ? (
              <>
                <div className="dashboard-personality-title">
                  {primaryPersonality.toUpperCase()}
                </div>
                <div className="dashboard-personality-subtitle">
                  &ldquo;Your social energy&rdquo;
                </div>
                <p className="dashboard-personality-description">
                  {PERSONALITY_DESCRIPTIONS[primaryPersonality] ||
                    "You bring a unique energy and presence to the SGT community."}
                </p>
              </>
            ) : (
              <>
                <div className="dashboard-personality-title" style={{ fontSize: "2.4rem" }}>
                  REFINING YOUR VIBE
                </div>
                <p className="dashboard-personality-description">
                  Your SGT personality is being refined.
                </p>
              </>
            )}
          </div>

          {/* Supporting SGT Vibes */}
          <div className="dashboard-supporting-vibes">
            <span className="dashboard-supporting-title">
              SUPPORTING SGT VIBES
            </span>

            {supportingVibes.length > 0 ? (
              <div className="dashboard-tags-grid">
                {supportingVibes.map(({ name, category }) => (
                  <div className="dashboard-vibe-card" key={name}>
                    <span className="dashboard-vibe-category">{category}</span>
                    <strong className="dashboard-vibe-name">{name}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "rgba(255, 248, 242, 0.6)", fontSize: "0.85rem", margin: 0 }}>
                Additional vibe tags will appear here once your questionnaire analysis is finalized.
              </p>
            )}
          </div>
        </section>

        {/* ==========================================================
            3. TWO-COLUMN: ABOUT YOU + PROFILE STATUS
            ========================================================== */}
        <div className="dashboard-details-grid" id="about-you">
          {/* About You Card */}
          <section className="dashboard-card" aria-label="About You">
            <div className="dashboard-card-header">
              <div className="dashboard-kicker">
                <span>CAMPUS IDENTITY</span>
                <i aria-hidden="true" />
              </div>
              <h3>
                About <em>You.</em>
              </h3>
            </div>

            <div className="dashboard-about-rows">
              <div className="dashboard-about-item">
                <span className="dashboard-about-label">Full Name</span>
                <span className="dashboard-about-value">{fullName}</span>
              </div>
              <div className="dashboard-about-item">
                <span className="dashboard-about-label">College</span>
                <span className="dashboard-about-value">{collegeName}</span>
              </div>
              <div className="dashboard-about-item">
                <span className="dashboard-about-label">Course</span>
                <span className="dashboard-about-value">{courseDetails}</span>
              </div>
              {profile?.academicYear && (
                <div className="dashboard-about-item">
                  <span className="dashboard-about-label">Academic Year</span>
                  <span className="dashboard-about-value">{academicYear}</span>
                </div>
              )}
              {profile?.gender && (
                <div className="dashboard-about-item">
                  <span className="dashboard-about-label">Gender</span>
                  <span className="dashboard-about-value" style={{ textTransform: "capitalize" }}>
                    {profile.gender.replace("-", " ")}
                  </span>
                </div>
              )}
              <div className="dashboard-about-item">
                <span className="dashboard-about-label">University Email</span>
                <span className="dashboard-about-value">{user?.email}</span>
              </div>
            </div>
          </section>

          {/* SGT Profile Status Card */}
          <section className="dashboard-card" aria-label="Profile Status">
            <div className="dashboard-card-header">
              <div className="dashboard-kicker">
                <span>READINESS CHECK</span>
                <i aria-hidden="true" />
              </div>
              <h3>
                Profile <em>Complete.</em>
              </h3>
            </div>

            <div className="dashboard-status-list">
              <div className="dashboard-status-item is-complete">
                <span className="dashboard-status-icon">✓</span>
                <div className="dashboard-status-text">
                  <span className="dashboard-status-title">Profile Verified</span>
                  <span className="dashboard-status-desc">
                    Your campus identity was verified by the SGT team.
                  </span>
                </div>
              </div>

              <div className="dashboard-status-item is-complete">
                <span className="dashboard-status-icon">✓</span>
                <div className="dashboard-status-text">
                  <span className="dashboard-status-title">Questionnaire Completed</span>
                  <span className="dashboard-status-desc">
                    All 10 compatibility questions answered and processed.
                  </span>
                </div>
              </div>

              <div className="dashboard-status-item is-complete">
                <span className="dashboard-status-icon">✓</span>
                <div className="dashboard-status-text">
                  <span className="dashboard-status-title">SGT Vibe Created</span>
                  <span className="dashboard-status-desc">
                    Personality tags and Dandiya style successfully mapped.
                  </span>
                </div>
              </div>

              {paymentStatus === "PAID" ? (
                <div className="dashboard-status-item is-complete">
                  <span className="dashboard-status-icon">✓</span>
                  <div className="dashboard-status-text">
                    <span className="dashboard-status-title">
                      {activePlan === "premium"
                        ? "Premium Dandiya Plan Active"
                        : "Vibe Dandiya Plan Active"}
                    </span>
                    <span className="dashboard-status-desc">
                      Payment verified. You are confirmed for Dandiya Night matching.
                    </span>
                  </div>
                </div>
              ) : paymentStatus === "PENDING" ? (
                <div
                  className="dashboard-status-item"
                  style={{
                    borderColor: "rgba(244, 198, 108, 0.4)",
                    background: "rgba(244, 198, 108, 0.04)",
                  }}
                >
                  <span
                    className="dashboard-status-icon"
                    style={{ background: "rgba(244, 198, 108, 0.2)", color: "#f4c66c" }}
                  >
                    ⏳
                  </span>
                  <div className="dashboard-status-text">
                    <span className="dashboard-status-title" style={{ color: "#f4c66c" }}>
                      Payment Proof In Review
                    </span>
                    <span className="dashboard-status-desc">
                      Awaiting admin bank verification.{" "}
                      <a href="/payment" style={{ color: "#f4c66c", textDecoration: "underline" }}>
                        View status
                      </a>
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="dashboard-status-item"
                  style={{
                    borderColor: "rgba(232, 93, 67, 0.4)",
                    background: "rgba(232, 93, 67, 0.04)",
                  }}
                >
                  <span
                    className="dashboard-status-icon"
                    style={{ background: "rgba(232, 93, 67, 0.2)", color: "#ff9d8b" }}
                  >
                    ✦
                  </span>
                  <div className="dashboard-status-text">
                    <span className="dashboard-status-title">Dandiya Plan Needed</span>
                    <span className="dashboard-status-desc">
                      Choose your Dandiya plan to activate matching.{" "}
                      <a
                        href="/payment"
                        style={{ color: "#f4c66c", fontWeight: 700, textDecoration: "underline" }}
                      >
                        Choose Plan →
                      </a>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ==========================================================
            4. STEP 9 & STEP 10: MATCHMAKING ENGINE & ANONYMOUS MATCH
            ========================================================== */}
        <section className="dashboard-matching-area" id="matching-area" aria-label="Dandiya Matchmaking">
          {matchAlert.message && (
            <div
              style={{
                width: "min(100%, 540px)",
                padding: "0.85rem 1.25rem",
                borderRadius: "14px",
                fontSize: "0.88rem",
                marginBottom: "1.5rem",
                background:
                  matchAlert.type === "error"
                    ? "rgba(232, 93, 67, 0.18)"
                    : matchAlert.type === "success"
                    ? "rgba(46, 204, 113, 0.18)"
                    : "rgba(244, 198, 108, 0.18)",
                border: `1px solid ${
                  matchAlert.type === "error"
                    ? "rgba(232, 93, 67, 0.4)"
                    : matchAlert.type === "success"
                    ? "rgba(46, 204, 113, 0.4)"
                    : "rgba(244, 198, 108, 0.4)"
                }`,
                color:
                  matchAlert.type === "error"
                    ? "#ff9d8b"
                    : matchAlert.type === "success"
                    ? "#72e9a5"
                    : "#f4c66c",
              }}
            >
              {matchAlert.message}
            </div>
          )}

          {/* STATE A: ACTIVE ANONYMOUS MATCH FOUND */}
          {activeMatch ? (
            <div className="dashboard-match-card">
              <div className="dashboard-match-header">
                <div>
                  <div className="dashboard-kicker">
                    <span>STEP 10: ACTIVE ANONYMOUS MATCH</span>
                    <i aria-hidden="true" />
                  </div>
                  <h3 style={{ margin: "0.4rem 0 0", fontFamily: "Playfair Display, Georgia, serif", fontSize: "1.8rem" }}>
                    {activeMatch.synthesis?.matchHeadline || "Your Dandiya Connection"}
                  </h3>
                </div>

                <div className="dashboard-match-score-badge">
                  <span>✦</span>
                  <strong>{activeMatch.compatibilityScore}% Compatibility</strong>
                </div>
              </div>

              {/* Partner Anonymous Profile */}
              <div className="dashboard-match-partner-row">
                <div className="dashboard-match-avatar">
                  {activeMatch.partner?.initials || "SGT"}
                </div>
                <div className="dashboard-match-partner-info">
                  <h4>{activeMatch.partner?.firstName}</h4>
                  <div className="dashboard-match-partner-meta">
                    <span>🏛️ {activeMatch.partner?.college}</span>
                    <span>·</span>
                    <span>🎓 {activeMatch.partner?.course} {activeMatch.partner?.academicYear ? `(Yr ${activeMatch.partner.academicYear})` : ""}</span>
                  </div>
                  {activeMatch.partner?.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {activeMatch.partner.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            background: "rgba(244, 198, 108, 0.12)",
                            border: "1px solid rgba(244, 198, 108, 0.3)",
                            color: "#f4c66c",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.65rem",
                            borderRadius: "999px",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Chemistry & Compatibility Synthesis (Q9 & Q10 Focus) */}
              <div className="dashboard-synthesis-grid">
                <div className="dashboard-synthesis-card">
                  <span className="dashboard-synthesis-label">✦ WHY YOU CONNECT (Q9 &amp; Q10)</span>
                  <p className="dashboard-synthesis-text">
                    {activeMatch.synthesis?.connectionNarrative ||
                      "Complementary connection style and mutual first interaction preferences."}
                  </p>
                </div>

                <div className="dashboard-synthesis-card">
                  <span className="dashboard-synthesis-label">🪔 DANDIYA VIBE HARMONY</span>
                  <p className="dashboard-synthesis-text">
                    {activeMatch.synthesis?.sharedVibe || "Shared event rhythm and campus energy."}
                  </p>
                </div>

                <div className="dashboard-synthesis-card" style={{ gridColumn: "1 / -1" }}>
                  <span className="dashboard-synthesis-label">💬 SUGGESTED FIRST ICEBREAKER</span>
                  <p className="dashboard-synthesis-text" style={{ fontStyle: "italic", color: "#f4c66c" }}>
                    &ldquo;{activeMatch.synthesis?.icebreakerPrompt || "Say hi and ask what their favorite Dandiya song is!"}&rdquo;
                  </p>
                </div>
              </div>

              {/* Match Actions */}
              <div className="dashboard-match-actions">
                <button
                  type="button"
                  className="dashboard-chat-btn"
                  onClick={() => window.location.assign(`/chat/${activeMatch.matchId}`)}
                >
                  <span>💬</span> {activeMatch.isRevealed ? "Open Chat (Profile Revealed ✓)" : "Start Anonymous Chat →"}
                </button>

                <button
                  type="button"
                  className="dashboard-decline-btn"
                  onClick={() => handleDeclineMatch(activeMatch.matchId)}
                >
                  Decline &amp; Find New Partner ✕
                </button>
              </div>
            </div>
          ) : isMatching ? (
            /* STATE B: SCANNING / AI EVALUATING */
            <div className="dashboard-scanner-box">
              <div className="dashboard-scanner-radar">
                <span className="dashboard-scanner-core">🪔</span>
              </div>

              <div className="dashboard-kicker">
                <span>AI MATCHMAKING ENGINE ACTIVE</span>
                <i aria-hidden="true" />
              </div>

              <h3 style={{ margin: 0, fontFamily: "Playfair Display, Georgia, serif", fontSize: "1.8rem" }}>
                Scanning <em>Campus Rhythm...</em>
              </h3>

              <div className="dashboard-scanner-steps">
                <div className={`dashboard-scanner-step ${scannerStep >= 0 ? "is-active" : ""}`}>
                  <span>{scannerStep > 0 ? "✓" : "✦"}</span>
                  <span>Scanning verified profiles from {collegeName}...</span>
                </div>
                <div className={`dashboard-scanner-step ${scannerStep >= 1 ? "is-active" : ""}`}>
                  <span>{scannerStep > 1 ? "✓" : "✦"}</span>
                  <span>Calculating Dandiya harmony &amp; lifestyle vectors (Q1–Q8)...</span>
                </div>
                <div className={`dashboard-scanner-step ${scannerStep >= 2 ? "is-active" : ""}`}>
                  <span>{scannerStep >= 2 ? "✦" : "○"}</span>
                  <span>Gemini AI evaluating Q9 &amp; Q10 conversational synergy...</span>
                </div>
              </div>
            </div>
          ) : cooldownSeconds > 0 ? (
            /* STATE C: WAITING RETRY (60s Cooldown) */
            <div className="dashboard-cooldown-box">
              <div className="dashboard-matching-motif" aria-hidden="true">
                ✦ 🪔 ✦
              </div>

              <div className="dashboard-kicker">
                <span>SCANNING CAMPUS POOL</span>
                <i aria-hidden="true" />
              </div>

              <div className="dashboard-cooldown-timer">
                00:{cooldownSeconds < 10 ? `0${cooldownSeconds}` : cooldownSeconds}
              </div>

              <h3 style={{ margin: 0, fontFamily: "Playfair Display, Georgia, serif", fontSize: "1.7rem" }}>
                Refining <em>Campus Pool.</em>
              </h3>

              <p className="dashboard-matching-desc">
                No immediate match found in the current batch. New students are completing verifications every minute. Next scan available shortly.
              </p>

              <button
                type="button"
                className="dashboard-match-btn"
                disabled={cooldownSeconds > 0}
                onClick={handleFindMatch}
              >
                Scan Campus Pool Again 🔄
              </button>
            </div>
          ) : paymentStatus !== "PAID" ? (
            /* STATE D: UNPAID PLAN GATEWAY */
            <div>
              <div className="dashboard-matching-motif" aria-hidden="true">
                ✦ 🪔 ✦
              </div>

              <span className="dashboard-matching-pill">
                <span className="dashboard-matching-dot" aria-hidden="true" />
                Dandiya Plan Required
              </span>

              <h3>
                Unlock Your <em>Dandiya Partner.</em>
              </h3>

              <p className="dashboard-matching-desc">
                Select your Dandiya plan to activate the AI matching engine and connect with your anonymous partner before the celebration.
              </p>

              <button
                type="button"
                className="dashboard-match-btn"
                onClick={() => window.location.assign("/payment")}
                style={{ marginTop: "1rem" }}
              >
                Choose Dandiya Plan →
              </button>
            </div>
          ) : (
            /* STATE E: IDLE & READY TO MATCH */
            <div>
              <div className="dashboard-matching-motif" aria-hidden="true">
                ✦ 🪔 ✦
              </div>

              <span className="dashboard-matching-pill">
                <span className="dashboard-matching-dot" aria-hidden="true" />
                Matching Ready
              </span>

              <h3>
                Find Your Dandiya <em>Partner.</em>
              </h3>

              <p className="dashboard-matching-desc">
                Our AI analyzes your event rhythm, questionnaire vectors (Q1–Q8), and your Questions 9 &amp; 10 connection style to find someone you will genuinely vibe with on Dandiya Night.
              </p>

              <button
                type="button"
                className="dashboard-match-btn"
                onClick={handleFindMatch}
                style={{ marginTop: "1.25rem" }}
              >
                <span>🪔</span> Find My Dandiya Match <span>➔</span>
              </button>
            </div>
          )}
        </section>

        {/* Dashboard Footer */}
        <footer className="dashboard-footer">
          <div>
            <strong>SGT</strong> · SOULS GATHER TOGETHER
          </div>
          <div>Match. Vibe. Reveal. Meet. · © 2026 SGT</div>
        </footer>
      </div>
    </main>
  );
}

export default Dashboard;
