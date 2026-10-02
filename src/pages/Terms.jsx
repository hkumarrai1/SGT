import { useEffect, useState } from "react";
import "./Terms.css";

const SECTIONS = [
  { id: "sec-1", num: "01", title: "Acceptance of terms" },
  { id: "sec-2", num: "02", title: "Eligibility" },
  { id: "sec-3", num: "03", title: "Nature of the service" },
  { id: "sec-4", num: "04", title: "Matching system" },
  { id: "sec-5", num: "05", title: "Anonymous chat" },
  { id: "sec-6", num: "06", title: "Mutual reveal" },
  { id: "sec-7", num: "07", title: "Refund policy" },
  { id: "sec-8", num: "08", title: "User conduct" },
  { id: "sec-9", num: "09", title: "Safety" },
  { id: "sec-10", num: "10", title: "Content & responsibility" },
  { id: "sec-11", num: "11", title: "Suspension & termination" },
  { id: "sec-12", num: "12", title: "Privacy & personal data" },
  { id: "sec-13", num: "13", title: "Third-party services" },
  { id: "sec-14", num: "14", title: "Disclaimers" },
  { id: "sec-15", num: "15", title: "Limitation of liability" },
  { id: "sec-16", num: "16", title: "Refund & cancellation" },
  { id: "sec-17", num: "17", title: "Changes to terms" },
  { id: "sec-18", num: "18", title: "Governing law & jurisdiction" },
  { id: "sec-19", num: "19", title: "Contact us" },
];

function Terms() {
  const [activeSection, setActiveSection] = useState("sec-1");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0.1 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
      setMobileDrawerOpen(false);
    }
  };

  return (
    <div className="terms-page">
      {/* Topbar */}
      <header className="terms-topbar">
        <div className="terms-topbar-left">
          <a href="/" className="terms-back-btn">
            ← Back to SGT
          </a>
          <a href="/" className="terms-brand">
            <svg
              className="terms-brand-mark"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="20" cy="20" r="19" stroke="#e0a24c" strokeWidth="1.4" />
              <path
                d="M20 6 L23.5 16.5 L34 20 L23.5 23.5 L20 34 L16.5 23.5 L6 20 L16.5 16.5 Z"
                fill="#e0a24c"
                opacity="0.95"
              />
            </svg>
            <div className="terms-brand-text">
              <span className="terms-brand-name">SGT</span>
              <span className="terms-brand-tag">Where Souls Gather.</span>
            </div>
          </a>
        </div>

        <div className="terms-topbar-doc">
          <strong>Terms &amp; Conditions</strong>
          <span>sgtofficial.in</span>
        </div>
      </header>

      {/* Hero */}
      <section className="terms-hero">
        <h1>Terms &amp; Conditions</h1>
        <p>
          These Terms govern your access to and use of the SGT platform — our
          anonymous partner-matching and event service built around Navratri
          dandiya. Please read them in full before registering.
        </p>
        <div className="terms-hero-meta">
          <span>
            Effective date: <strong>21 September 2026</strong>
          </span>
          <span>
            Last updated: <strong>31 December 2027</strong>
          </span>
          <span>
            Governing law: <strong>India</strong>
          </span>
        </div>
      </section>

      {/* Mobile Table of Contents Toggle */}
      <button
        type="button"
        className="terms-mobile-toc-toggle"
        onClick={() => setMobileDrawerOpen((open) => !open)}
        aria-expanded={mobileDrawerOpen}
      >
        <span>
          Jump to section:{" "}
          <strong>
            {SECTIONS.find((s) => s.id === activeSection)?.num}.{" "}
            {SECTIONS.find((s) => s.id === activeSection)?.title}
          </strong>
        </span>
        <span>{mobileDrawerOpen ? "▲" : "▼"}</span>
      </button>

      {mobileDrawerOpen && (
        <div className="terms-mobile-toc-drawer">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className={activeSection === sec.id ? "active" : ""}
              onClick={(e) => scrollToSection(e, sec.id)}
            >
              <span className="terms-toc-num">{sec.num}</span> {sec.title}
            </a>
          ))}
        </div>
      )}

      {/* Main Layout */}
      <div className="terms-layout">
        {/* Table of contents sidebar */}
        <aside className="terms-toc-sidebar" aria-label="Table of contents">
          <p className="terms-toc-label">On this page</p>
          <ul className="terms-toc-list">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  className={activeSection === sec.id ? "active" : ""}
                  onClick={(e) => scrollToSection(e, sec.id)}
                >
                  <span className="terms-toc-num">{sec.num}</span>
                  <span>{sec.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Document Content */}
        <main className="terms-doc">
          <section id="sec-1" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">01</span>
              <h2>Acceptance of terms</h2>
            </div>
            <p>
              By registering for or using the SGT platform in any way, you confirm
              that you have read, understood, and agree to be bound by these Terms
              &amp; Conditions (&quot;Terms&quot;), our Privacy Policy, and any
              other rules, guidelines, or notices we publish on the platform. If
              you do not agree to these Terms, you must not register for or use
              the platform.
            </p>
            <p>
              We may update these Terms from time to time as described in Section
              17. Your continued use of the platform after an update constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section id="sec-2" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">02</span>
              <h2>Eligibility</h2>
            </div>
            <ul>
              <li>
                SGT is intended primarily for university and college students,
                though it is not restricted to any one institution.
              </li>
              <li>
                You must provide accurate, current, and complete information at the
                time of registration and keep it updated.
              </li>
              <li>
                You must be at least <strong>18 years old</strong> to register for
                or use the platform. We do not knowingly permit anyone under this
                age to hold an account.
              </li>
              <li>
                Impersonation of another person, and the creation of fake,
                duplicate, or automated accounts, is strictly prohibited.
              </li>
            </ul>
          </section>

          <section id="sec-3" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">03</span>
              <h2>Nature of the service</h2>
            </div>
            <p>
              SGT facilitates partner discovery, matching, and communication
              between users ahead of Navratri dandiya events. The platform is a
              discovery and communication tool only.
            </p>
            <p>
              We do not guarantee that you will receive a particular match, a
              response from a matched user, compatibility with any matched user, a
              friendship or relationship, or any specific experience at an event.
              Use of the platform is at your own discretion.
            </p>
          </section>

          <section id="sec-4" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">04</span>
              <h2>Matching system</h2>
            </div>
            <p>
              Matches on SGT may be generated using automated systems, algorithmic
              matching, AI-assisted systems, and/or other matching mechanisms.
              These systems may take into account information you provide during
              registration and the availability of other suitable participants at
              the time.
            </p>
            <blockquote className="terms-clause">
              A match does not constitute an endorsement, verification,
              recommendation, or guarantee of the matched person&#39;s identity,
              character, intentions, or conduct. You remain solely responsible for
              exercising judgment and caution in any interaction that results from
              a match.
            </blockquote>
          </section>

          <section id="sec-5" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">05</span>
              <h2>Anonymous chat</h2>
            </div>
            <ul>
              <li>
                When first matched, users interact through the platform without
                directly revealing identifying information such as full name,
                phone number, social media handles, or exact location.
              </li>
              <li>
                You must not share sensitive personal information (financial
                details, home address, ID documents, etc.) with a matched user
                during the anonymous phase, or at any point unless you choose to
                do so at your own risk after a mutual reveal.
              </li>
              <li>
                Either user may choose to stop communicating with their match at
                any time, without needing to give a reason.
              </li>
              <li>
                Harassment, threats, stalking, sexual harassment, impersonation,
                and any other abusive conduct during anonymous chat is strictly
                prohibited and may result in immediate suspension under Section 11.
              </li>
            </ul>
          </section>

          <section id="sec-6" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">06</span>
              <h2>Mutual reveal</h2>
            </div>
            <p>
              Identity or selected profile information is revealed between matched
              users only in accordance with the platform&#39;s mutual-consent
              reveal mechanism — meaning both users must independently agree
              before any identifying information is shared. Neither party&#39;s
              identity is disclosed to the other unless this mutual consent has
              been given.
            </p>
          </section>

          <section id="sec-7" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">07</span>
              <h2>Refund policy</h2>
            </div>
            <p>
              Where an eligible paid matching service is expressly covered by the
              refund offer stated at the time of purchase, and the platform is
              unable to provide an eligible match within the stated service period,
              the user may be entitled to a refund equal to{" "}
              <strong className="terms-highlight">80% of the eligible service fee</strong>,
              subject to the conditions below and any additional conditions stated
              at the time of purchase.
            </p>

            <div className="terms-def-grid">
              <div className="terms-def-row">
                <dt>Eligible match</dt>
                <dd>
                  A match with a genuine, verified human user of the platform who
                  meets the eligibility criteria in Section 2. A match generated
                  with a bot, test account, or AI-simulated profile does{" "}
                  <strong>not</strong> count as an eligible match for refund
                  purposes.
                </dd>
              </div>
              <div className="terms-def-row">
                <dt>Service period</dt>
                <dd>
                  <strong>180 days</strong> from the time of successful payment,
                  within which SGT will attempt to provide the user with an
                  eligible match.
                </dd>
              </div>
              <div className="terms-def-row">
                <dt>Exclusions</dt>
                <dd>
                  No refund is owed where the user was matched within the service
                  period and later chose to stop communicating, where the user
                  provided false or incomplete information affecting matchability,
                  or where the user violated Section 8 (User Conduct).
                </dd>
              </div>
              <div className="terms-def-row">
                <dt>Processing time</dt>
                <dd>
                  Approved refunds are processed within{" "}
                  <strong>5-7 business days</strong> to the original payment
                  method.
                </dd>
              </div>
              <div className="terms-def-row">
                <dt>Gateway charges</dt>
                <dd>
                  Any non-refundable charges levied by the payment gateway will be
                  deducted from the refunded amount, where applicable.
                </dd>
              </div>
              <div className="terms-def-row">
                <dt>Duplicate accounts</dt>
                <dd>
                  Refund requests from duplicate, fake, or fraudulently created
                  accounts will be rejected, and the associated account(s) may be
                  suspended under Section 11.
                </dd>
              </div>
              <div className="terms-def-row">
                <dt>User inability</dt>
                <dd>
                  No refund is owed where SGT was unable to provide a match due to
                  incomplete profile information, unreasonable preferences, or lack
                  of responsiveness on the user&#39;s part.
                </dd>
              </div>
            </div>
          </section>

          <section id="sec-8" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">08</span>
              <h2>User conduct</h2>
            </div>
            <p>While using SGT, you must not engage in any of the following:</p>
            <ul>
              <li>Harassment, hate speech, or threats directed at another user</li>
              <li>Stalking or persistent unwanted contact</li>
              <li>Impersonation of another person or entity</li>
              <li>Scams, fraud, or attempts to solicit money from other users</li>
              <li>Sending unsolicited explicit or sexual content</li>
              <li>
                Doxxing or sharing another person&#39;s private information
                without consent
              </li>
              <li>
                Attempting to manipulate, exploit, or reverse-engineer the
                matching system
              </li>
              <li>Creating or operating multiple or fake accounts</li>
              <li>
                Automated abuse of the platform, including bots or scripted
                interactions
              </li>
            </ul>
            <p>
              Violation of this section may result in content removal, warnings,
              suspension, or permanent termination of your account under Section
              11, without prejudice to any other legal remedies available to SGT or
              affected users.
            </p>
          </section>

          <section id="sec-9" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">09</span>
              <h2>Safety</h2>
            </div>
            <p>
              Any decision to meet, communicate with, or otherwise interact with a
              matched user — online or in person — is made entirely at your own
              discretion and risk. SGT does not perform background checks on users
              beyond the verification measures we choose to implement, and does
              not guarantee the identity, intentions, or conduct of any user.
            </p>
            <p>
              We strongly encourage you to follow basic personal safety
              practices: verify who you are meeting where possible, meet in public
              places, inform a friend or family member of your plans, and trust
              your judgment if something feels wrong.
            </p>
          </section>

          <section id="sec-10" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">10</span>
              <h2>Content &amp; user responsibility</h2>
            </div>
            <p>
              You are solely responsible for any content, messages, or material
              you send, upload, or share through the platform. You must not
              upload or share content that is unlawful, infringing, obscene,
              defamatory, or otherwise violates these Terms or applicable law.
            </p>
            <p>
              SGT reserves the right, but is not obligated, to monitor, moderate,
              or remove any content that violates these Terms, and to take action
              against the account responsible.
            </p>
          </section>

          <section id="sec-11" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">11</span>
              <h2>Suspension &amp; termination</h2>
            </div>
            <p>
              SGT may suspend or permanently terminate your account, with or
              without prior notice, where we reasonably believe you have engaged
              in:
            </p>
            <ul>
              <li>Fraud or attempted fraud</li>
              <li>Abuse or harassment of another user</li>
              <li>Submission of fake or misleading information</li>
              <li>Manipulation of the matching system</li>
              <li>Any other violation of these Terms</li>
              <li>
                Conduct that poses a security concern to the platform or its users
              </li>
            </ul>
            <p>
              Where an account is terminated for cause under this section, any
              refund entitlement under Sections 7 and 16 may be forfeited to the
              extent permitted by applicable law.
            </p>
          </section>

          <section id="sec-12" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">12</span>
              <h2>Privacy &amp; personal data</h2>
            </div>
            <p>
              We collect information you provide at registration (such as name,
              contact details, college/university, and matching preferences) and
              information generated through your use of the platform, in order to
              operate the matching system, process payments, communicate with you,
              and improve the service.
            </p>
            <p>
              Your data is stored on our secure database infrastructure and
              retained for as long as your account is active, or as required for
              legal, accounting, or dispute-resolution purposes thereafter. We do
              not sell your personal data to third parties. Data may be shared
              with the service providers named in Section 13 solely to operate the
              platform.
            </p>
            <p>
              You may request access to, correction of, or deletion of your
              personal data by contacting us using the details in Section 19,
              subject to any retention we are legally required to maintain.
            </p>
          </section>

          <section id="sec-13" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">13</span>
              <h2>Third-party services</h2>
            </div>
            <p>
              SGT relies on third-party providers to operate the platform,
              including payment gateways, hosting providers, database providers,
              analytics services, and authentication services. These providers
              may process relevant user information strictly to the extent needed
              to perform their function, and are bound by their own terms and
              privacy practices.
            </p>
          </section>

          <section id="sec-14" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">14</span>
              <h2>Disclaimers</h2>
            </div>
            <p>
              The platform is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis. SGT does not guarantee:
            </p>
            <ul>
              <li>Compatibility between matched users</li>
              <li>
                The formation of any friendship, relationship, or ongoing
                connection
              </li>
              <li>Attendance of any matched user at an event</li>
              <li>A response from any matched user</li>
              <li>
                Authenticity of any user beyond whatever verification measures
                SGT actually performs at the relevant time
              </li>
            </ul>
          </section>

          <section id="sec-15" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">15</span>
              <h2>Limitation of liability</h2>
            </div>
            <p>
              To the maximum extent permitted by applicable law, SGT, its
              founders, employees, and affiliates shall not be liable for any
              indirect, incidental, special, or consequential damages arising from
              your use of the platform, including but not limited to damages
              arising from interactions with matched users, event attendance, or
              reliance on the matching system.
            </p>
          </section>

          <section id="sec-16" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">16</span>
              <h2>Refund &amp; cancellation</h2>
            </div>
            <p>
              This section restates, for clarity, the refund mechanics set out in
              Section 7. Any request for a refund or cancellation of a paid plan
              must be raised within{" "}
              <strong className="terms-highlight">3 hours</strong> of purchase
              through the contact details in Section 19, along with the
              order/payment reference. Refunds are processed only where the
              conditions in Section 7 are met, and are not available once the
              reveal mechanism in Section 6 has been used unless otherwise stated
              at the time of purchase.
            </p>
          </section>

          <section id="sec-17" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">17</span>
              <h2>Changes to terms</h2>
            </div>
            <p>
              We may revise these Terms from time to time to reflect changes in our
              service, legal requirements, or business practices. When we do, we
              will update the &quot;Last updated&quot; date at the top of this page
              and, where the change is material, provide additional notice through
              the platform or by email. Continued use of SGT after a revised
              version takes effect constitutes your acceptance of it.
            </p>
          </section>

          <section id="sec-18" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">18</span>
              <h2>Governing law &amp; jurisdiction</h2>
            </div>
            <p>
              These Terms are governed by the laws of India. Subject to your
              non-waivable statutory rights as a consumer, any dispute arising out
              of or relating to these Terms shall be subject to the exclusive
              jurisdiction of the courts at{" "}
              <strong className="terms-highlight">Delhi, India</strong>.
            </p>
          </section>

          <section id="sec-19" className="terms-section">
            <div className="terms-sec-head">
              <span className="terms-sec-num">19</span>
              <h2>Contact us</h2>
            </div>
            <p>For any questions about these Terms, reach us at:</p>
            <div className="terms-contact-card">
              <div className="terms-contact-row">
                <span>Website</span>
                <span>sgtofficial.in</span>
              </div>
              <div className="terms-contact-row">
                <span>Support email</span>
                <span className="terms-highlight">help@sgtofficial.in</span>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="terms-footer">
        <span>© {new Date().getFullYear()} SGT — Souls Gather Together. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default Terms;
