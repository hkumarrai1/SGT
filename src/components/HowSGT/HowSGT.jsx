import { useState } from "react";
import "./HowSGT.css";

const steps = [
  {
    number: "01",
    title: "Make Your Profile",
    description:
      "Sign up with your university email, add your basic details and interests.",
    image: "/images/profile.png",
    icon: "◎",
    detail: "Tell us a little about who you are and what makes you light up.",
  },
  {
    number: "02",
    title: "Fill the Questionnaire",
    description:
      "Answer a few fun and thoughtful questions so we can find someone truly compatible.",
    image: "/images/questionnaire.png",
    icon: "?",
    detail:
      "Your answers help us look beyond a profile and find a real point of connection.",
  },
  {
    number: "03",
    title: "Choose the Plan and Pay",
    description:
      "Select a plan that suits you and complete the payment securely.",
    image: "/images/payment.png",
    icon: "₹",
    detail:
      "Pick the experience that feels right, then you are ready to meet your match.",
  },
  {
    number: "04",
    title: "If Both Sides Say OK, Reveal",
    description:
      "When both people show interest, your profiles are revealed to each other.",
    image: "/images/profile-reveal.png",
    icon: "♥",
    detail: "Mutual interest is the key. No pressure, no awkward surprises.",
  },
  {
    number: "05",
    title: "Chat",
    description:
      "Now you can chat, get to know each other and plan to meet at the event.",
    image: "/images/chat.png",
    icon: "•••",
    detail:
      "Start with a hello, share a laugh, and build your vibe before the big night.",
  },
  {
    number: "06",
    title: "Meet at the Venue",
    description:
      "Take the conversation offline and meet at the university Dandiya Night.",
    image: "/images/venue-meet.png",
    icon: "✦",
    detail:
      "A shared campus, a little music, and a chance to make a memory together.",
  },
];

function HowSGT() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="how-sgt" id="how-it-works">
      <div className="how-sgt-shell">
        <header className="how-sgt-heading">
          <span className="how-sgt-kicker">HOW SGT WORKS</span>
          <h2>
            From Profile to
            <br />
            <em>Dandiya Night</em>
          </h2>
          <p>
            A simple, safe and meaningful journey - designed for university
            students
            <br className="how-sgt-break" /> to meet, connect and create real
            memories.
          </p>
        </header>

        <div className="how-sgt-track" role="list" aria-label="How SGT works">
          {steps.map((step, index) => (
            <button
              className={`how-sgt-step ${activeStep === index ? "is-active" : ""}`}
              key={step.number}
              type="button"
              role="listitem"
              aria-pressed={activeStep === index}
              onClick={() => setActiveStep(index)}
            >
              <span className="how-sgt-number">{step.number}</span>
              <span className="how-sgt-step-image-wrap">
                <img className="how-sgt-step-image" src={step.image} alt="" />
              </span>
              <strong>{step.title}</strong>
              <span>{step.description}</span>
              {index < steps.length - 1 && (
                <i className="how-sgt-arrow" aria-hidden="true">
                  →
                </i>
              )}
            </button>
          ))}
        </div>

        <div className="how-sgt-detail" aria-live="polite">
          <span className="how-sgt-detail-label">
            STEP {steps[activeStep].number}
          </span>
          <p>{steps[activeStep].detail}</p>
          <span className="how-sgt-dots">
            {steps.map((step, index) => (
              <i
                className={activeStep === index ? "is-active" : ""}
                key={step.number}
              />
            ))}
          </span>
        </div>

        <footer className="how-sgt-footer">
          <span>♣</span> For University Students Only
          <span>◆</span> Safe &amp; Verified Community
          <span>▦</span> On-Campus Event
          <span>♥</span> Real People, Real Connections
        </footer>
      </div>
    </section>
  );
}

export default HowSGT;
