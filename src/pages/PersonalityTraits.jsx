import { useEffect, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";
import "./PersonalityTraits.css";
import { API_URL } from "../config";

const HEIGHT_OPTIONS = [
  "4'10\" (147 cm)", "4'11\" (150 cm)", "5'0\" (152 cm)", "5'1\" (155 cm)",
  "5'2\" (157 cm)", "5'3\" (160 cm)", "5'4\" (163 cm)", "5'5\" (165 cm)",
  "5'6\" (168 cm)", "5'7\" (170 cm)", "5'8\" (173 cm)", "5'9\" (175 cm)",
  "5'10\" (178 cm)", "5'11\" (180 cm)", "6'0\" (183 cm)", "6'1\" (185 cm)",
  "6'2\" (188 cm)", "6'3\" (191 cm)", "6'4\" (193 cm)", "6'5\"+ (195+ cm)"
];

const PARTNER_HEIGHT_PREFS = [
  "Taller than me",
  "Similar height to me",
  "Shorter than me",
  "Height doesn't matter to me"
];

const ZODIAC_SIGNS = [
  { label: "Aries ♈", value: "Aries" },
  { label: "Taurus ♉", value: "Taurus" },
  { label: "Gemini ♊", value: "Gemini" },
  { label: "Cancer ♋", value: "Cancer" },
  { label: "Leo ♌", value: "Leo" },
  { label: "Virgo ♍", value: "Virgo" },
  { label: "Libra ♎", value: "Libra" },
  { label: "Scorpio ♏", value: "Scorpio" },
  { label: "Sagittarius ♐", value: "Sagittarius" },
  { label: "Capricorn ♑", value: "Capricorn" },
  { label: "Aquarius ♒", value: "Aquarius" },
  { label: "Pisces ♓", value: "Pisces" }
];

const LIFESTYLE_TAGS = [
  "🏋️ Gym & Fitness", "☕ Cafe & Coffee lover", "🍕 Late Night Foodie",
  "🎨 Creative & Artsy", "💻 Tech & Coding", "📚 Avid Reader",
  "🎧 Music & Podcasts", "✈️ Travel & Roadtrips", "🍿 Movies & Series",
  "🧘 Chill & Mindful", "📸 Photography & Reels", "🐾 Pet Lover"
];

const DANDIYA_SKILLS = [
  "💃 Garba Pro (Knows 3-taali & intricate steps)",
  "🎶 Good Rhythm (Can follow steps easily)",
  "🌱 Enthusiastic Beginner (Here to learn & vibe)",
  "📸 Food & Aesthetic (Vibing from the sidelines)"
];

const OUTFIT_AESTHETICS = [
  "👑 Royal Traditional (Chaniya Choli / Kediya)",
  "✨ Indo-Western Glam",
  "🌟 Classy Festive Minimal",
  "⚡ Modern Casual Chic"
];

const EVENT_PERSONAS = [
  "🔥 Center of the dance circle",
  "📸 Reel & Aesthetic Photo Maker",
  "💬 Deep conversations in the lounge",
  "🍲 Exploring food stalls & cheering friends"
];

const SOCIAL_BATTERIES = [
  "⚡ Extrovert (Energized by big festive crowds)",
  "⚖️ Ambivert (Selective social butterfly)",
  "🌙 Introvert (Cozy vibes & small groups)"
];

const HUMOR_STYLES = [
  "😏 Sarcastic & Witty Banter",
  "🧠 Smart & Observational",
  "🥰 Sweet & Wholesome",
  "🤪 Spontaneous & Chaotic Fun"
];

const MUSIC_TASTES = [
  "🕺 High-Energy Bollywood & Garba Dhol",
  "🥁 Punjabi & Commercial Bangers",
  "🎸 Indie Acoustic & Lo-Fi",
  "🎧 EDM, House & Club Beats"
];

const PARTNER_VIBES = [
  "🤝 High-Energy Dance Partner",
  "💫 Genuine & Meaningful Connection",
  "😂 Someone to laugh and banter with all night",
  "✨ Calm, Classy & Respectful Soul"
];

const CAMPUS_PREFS = [
  "🏫 Same College / Campus Only",
  "🌐 Open to Other Colleges & Campuses",
  "✨ Open to Anyone Matching My Vibe"
];

const GREEN_FLAGS = [
  "✨ Great Communication & Effort",
  "💃 Passionate Dancer & Good Energy",
  "🎯 Ambitious & Passionate About Life",
  "💬 Attentive Listener & Kind-Hearted",
  "😂 Great Sense of Humor & Banter",
  "🌸 Respectful of Boundaries",
  "🍕 Always Down for Late Night Food"
];

export default function PersonalityTraits() {
  const { token, isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [form, setForm] = useState({
    height: "",
    partnerHeightPref: "",
    zodiacSign: "",
    lifestyleTags: [],
    dandiyaSkill: "",
    outfitAesthetic: "",
    eventPersona: "",
    socialBattery: "",
    humorStyle: "",
    musicTaste: "",
    partnerVibe: "",
    campusPreference: "",
    greenFlags: []
  });

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=login");
      return;
    }

    async function loadTraits() {
      try {
        const response = await fetch(`${API_URL}/api/profile/traits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.traits) {
          setForm({
            height: data.traits.height || "",
            partnerHeightPref: data.traits.partnerHeightPref || "",
            zodiacSign: data.traits.zodiacSign || "",
            lifestyleTags: Array.isArray(data.traits.lifestyleTags) ? data.traits.lifestyleTags : [],
            dandiyaSkill: data.traits.dandiyaSkill || "",
            outfitAesthetic: data.traits.outfitAesthetic || "",
            eventPersona: data.traits.eventPersona || "",
            socialBattery: data.traits.socialBattery || "",
            humorStyle: data.traits.humorStyle || "",
            musicTaste: data.traits.musicTaste || "",
            partnerVibe: data.traits.partnerVibe || "",
            campusPreference: data.traits.campusPreference || "",
            greenFlags: Array.isArray(data.traits.greenFlags) ? data.traits.greenFlags : []
          });
        }
      } catch (err) {
        console.error("Failed to load existing traits:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTraits();
  }, [isAuthenticated, token]);

  const toggleArrayItem = (field, value, max = 4) => {
    setForm(prev => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      }
      if (current.length >= max) return prev;
      return { ...prev, [field]: [...current, value] };
    });
  };

  const setSingleValue = (field, value) => {
    setForm(prev => ({ ...prev, [field]: prev[field] === value ? "" : value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch(`${API_URL}/api/profile/traits`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save traits.");

      setStatus({
        type: "success",
        message: "Preferences saved! Moving to Profile Photo...",
      });

      setTimeout(() => {
        window.location.assign("/onboarding/profile-photo");
      }, 600);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <main className="traits-page">
      <Background />
      <a className="auth-home" href="/onboarding/profile">
        ← Back to Profile
      </a>

      <div className="traits-page-shell">
        <aside className="traits-story">
          <span className="auth-story-kicker">STEP 3 · VIBE & PREFERENCES</span>
          <h2>
            Find your groove.
            <br />
            <em>Match your energy.</em>
          </h2>
          <p>
            Your answers feed SGT’s AI Matchmaking Engine to find your most compatible dance and conversation partner for the Dandiya night.
          </p>
          <div className="traits-story-points">
            <div className="traits-story-point">
              <strong>✨ 100% Anonymous</strong>
              <span>Only your curated anonymous alias & vibe match score are visible initially.</span>
            </div>
            <div className="traits-story-point">
              <strong>🎯 Precision Synergy</strong>
              <span>Balances height, dance energy, social comfort, and vibe expectations.</span>
            </div>
          </div>
          <span className="auth-story-note">
            <i /> ACCURATE · FUN · TAILORED FOR NAVRATRI
          </span>
        </aside>

        <section className="auth-card traits-card">
          <div className="auth-card-topline">
            <span>PERSONALITY & PREFERENCES</span>
            <i />
          </div>
          <h1>
            Your vibe &amp;
            <br />
            <em>partner match.</em>
          </h1>

          {isLoading ? (
            <div className="profile-loading">
              <Loader label="Loading your preferences" />
            </div>
          ) : (
            <form className="traits-form" onSubmit={handleSave}>
              {/* SECTION 1: PHYSICAL & PERSONAL */}
              <div className="traits-section">
                <div className="traits-section-title">
                  <span className="traits-sec-badge">01</span>
                  <h3>Physical &amp; Personal Aura</h3>
                </div>

                <div className="traits-field">
                  <label htmlFor="height-select">Your Height</label>
                  <select
                    id="height-select"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    className="traits-select"
                  >
                    <option value="">Select your height</option>
                    {HEIGHT_OPTIONS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div className="traits-field">
                  <label>Partner Height Preference</label>
                  <div className="chips-grid">
                    {PARTNER_HEIGHT_PREFS.map((pref) => (
                      <button
                        type="button"
                        key={pref}
                        className={`chip-btn ${form.partnerHeightPref === pref ? "active" : ""}`}
                        onClick={() => setSingleValue("partnerHeightPref", pref)}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <label>Zodiac Sign</label>
                  <div className="chips-grid zodiac-grid">
                    {ZODIAC_SIGNS.map((z) => (
                      <button
                        type="button"
                        key={z.value}
                        className={`chip-btn ${form.zodiacSign === z.value ? "active" : ""}`}
                        onClick={() => setSingleValue("zodiacSign", z.value)}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <div className="field-label-row">
                    <label>Lifestyle &amp; Daily Vibe</label>
                    <span className="field-hint">Pick up to 4 ({form.lifestyleTags.length}/4)</span>
                  </div>
                  <div className="chips-grid">
                    {LIFESTYLE_TAGS.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        className={`chip-btn ${form.lifestyleTags.includes(tag) ? "active" : ""}`}
                        onClick={() => toggleArrayItem("lifestyleTags", tag, 4)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: DANDIYA & EVENT ENERGY */}
              <div className="traits-section">
                <div className="traits-section-title">
                  <span className="traits-sec-badge">02</span>
                  <h3>Dandiya &amp; Event Energy</h3>
                </div>

                <div className="traits-field">
                  <label>Garba / Dandiya Skill Level</label>
                  <div className="chips-list">
                    {DANDIYA_SKILLS.map((skill) => (
                      <button
                        type="button"
                        key={skill}
                        className={`chip-btn chip-row ${form.dandiyaSkill === skill ? "active" : ""}`}
                        onClick={() => setSingleValue("dandiyaSkill", skill)}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <label>Your Outfit Aesthetic</label>
                  <div className="chips-list">
                    {OUTFIT_AESTHETICS.map((outfit) => (
                      <button
                        type="button"
                        key={outfit}
                        className={`chip-btn chip-row ${form.outfitAesthetic === outfit ? "active" : ""}`}
                        onClick={() => setSingleValue("outfitAesthetic", outfit)}
                      >
                        {outfit}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <label>Your Event Persona</label>
                  <div className="chips-list">
                    {EVENT_PERSONAS.map((persona) => (
                      <button
                        type="button"
                        key={persona}
                        className={`chip-btn chip-row ${form.eventPersona === persona ? "active" : ""}`}
                        onClick={() => setSingleValue("eventPersona", persona)}
                      >
                        {persona}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: PERSONALITY & SOCIAL DYNAMICS */}
              <div className="traits-section">
                <div className="traits-section-title">
                  <span className="traits-sec-badge">03</span>
                  <h3>Personality &amp; Social Dynamics</h3>
                </div>

                <div className="traits-field">
                  <label>Social Battery</label>
                  <div className="chips-list">
                    {SOCIAL_BATTERIES.map((battery) => (
                      <button
                        type="button"
                        key={battery}
                        className={`chip-btn chip-row ${form.socialBattery === battery ? "active" : ""}`}
                        onClick={() => setSingleValue("socialBattery", battery)}
                      >
                        {battery}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <label>Humor &amp; Banter Style</label>
                  <div className="chips-list">
                    {HUMOR_STYLES.map((humor) => (
                      <button
                        type="button"
                        key={humor}
                        className={`chip-btn chip-row ${form.humorStyle === humor ? "active" : ""}`}
                        onClick={() => setSingleValue("humorStyle", humor)}
                      >
                        {humor}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <label>Music &amp; Song Vibe</label>
                  <div className="chips-list">
                    {MUSIC_TASTES.map((music) => (
                      <button
                        type="button"
                        key={music}
                        className={`chip-btn chip-row ${form.musicTaste === music ? "active" : ""}`}
                        onClick={() => setSingleValue("musicTaste", music)}
                      >
                        {music}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 4: PARTNER EXPECTATIONS */}
              <div className="traits-section">
                <div className="traits-section-title">
                  <span className="traits-sec-badge">04</span>
                  <h3>Partner Expectations</h3>
                </div>

                <div className="traits-field">
                  <label>What are you looking for in a partner?</label>
                  <div className="chips-list">
                    {PARTNER_VIBES.map((vibe) => (
                      <button
                        type="button"
                        key={vibe}
                        className={`chip-btn chip-row ${form.partnerVibe === vibe ? "active" : ""}`}
                        onClick={() => setSingleValue("partnerVibe", vibe)}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <label>Campus Preference</label>
                  <div className="chips-list">
                    {CAMPUS_PREFS.map((camp) => (
                      <button
                        type="button"
                        key={camp}
                        className={`chip-btn chip-row ${form.campusPreference === camp ? "active" : ""}`}
                        onClick={() => setSingleValue("campusPreference", camp)}
                      >
                        {camp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="traits-field">
                  <div className="field-label-row">
                    <label>Green Flags You Value Most</label>
                    <span className="field-hint">Pick up to 3 ({form.greenFlags.length}/3)</span>
                  </div>
                  <div className="chips-grid">
                    {GREEN_FLAGS.map((flag) => (
                      <button
                        type="button"
                        key={flag}
                        className={`chip-btn ${form.greenFlags.includes(flag) ? "active" : ""}`}
                        onClick={() => toggleArrayItem("greenFlags", flag, 3)}
                      >
                        {flag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {status.message && (
                <p className={`auth-status auth-status--${status.type}`} role="status">
                  {status.message}
                </p>
              )}

              <div className="traits-actions">
                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader label="Saving preferences" /> : "Save & Continue"}
                  <span>→</span>
                </button>
              </div>
            </form>
          )}

          <p className="profile-account">
            Signed in as <strong>{user?.email}</strong>
          </p>
        </section>
      </div>
    </main>
  );
}
