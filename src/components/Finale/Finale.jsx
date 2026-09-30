import { useState } from "react";
import { useAuth } from "../../store";
import "./Finale.css";

const questions = [
  {
    question: "What is SGT?",
    answer:
      "SGT, or Souls Gather Together, is a safe campus experience that helps university students meet someone compatible before Dandiya Night.",
  },
  {
    question: "Is my identity visible immediately?",
    answer:
      "No. Your identity stays private while you explore your match. Profiles are revealed only when both people show interest.",
  },
  {
    question: "When do profiles get revealed?",
    answer:
      "Profiles are revealed after both sides choose to connect. Until then, you can take the experience at your own pace.",
  },
  {
    question: "What is the Dandiya Plan?",
    answer:
      "The Dandiya Plan gives you access to profile matching, anonymous chat, and the chance to meet your connection at the university event.",
  },
  {
    question: "Can I report or block someone?",
    answer:
      "Yes. You can report or block any participant at any time. Our team is here to keep the experience respectful and trusted.",
  },
  {
    question: "What happens if I do not find a match?",
    answer:
      "You still get to enjoy the event and meet new people. Eligible plans also include a clear no-match benefit.",
  },
];

function Finale() {
  const [openQuestion, setOpenQuestion] = useState(0);
  const { isAuthenticated } = useAuth();

  return (
    <section className="finale" id="faq">
      <div className="finale-faq">
        <div className="finale-intro">
          <span className="finale-kicker">A LITTLE CLARITY</span>
          <h2>
            Questions before
            <br />
            <em>the first step?</em>
          </h2>
          <p>
            Everything you need to know before you find your way to the dance
            floor.
          </p>
        </div>

        <div className="finale-accordion">
          {questions.map((item, index) => {
            const isOpen = openQuestion === index;
            return (
              <div
                className={`finale-item ${isOpen ? "is-open" : ""}`}
                key={item.question}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenQuestion(isOpen ? -1 : index)}
                >
                  <span>{item.question}</span>
                  <b aria-hidden="true">{isOpen ? "−" : "+"}</b>
                </button>
                <div className="finale-answer">
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="finale-cta" id="join">
        <span className="finale-cta-mark">✦</span>
        <span className="finale-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
        <h2>
          This Navratri, find someone
          <br />
          <em>worth dancing with.</em>
        </h2>
        {isAuthenticated ? (
          <a href="/dashboard">
            Go to Dashboard <span aria-hidden="true">→</span>
          </a>
        ) : (
          <a href="/auth?mode=signup">
            Find My Dandiya Partner <span aria-hidden="true">→</span>
          </a>
        )}
      </div>

      <footer className="finale-footer">
        <div className="finale-brand">
          <strong>SGT</strong>
          <span>SOULS GATHER TOGETHER</span>
          <p>Match. Vibe. Reveal. Meet.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#how-it-works">How It Works</a>
          <a href="#safety">Safety</a>
          <a href="#faq">FAQ</a>
          <a href="#terms">Terms</a>
          <a href="#privacy">Privacy</a>
          <a href="#contact">Contact</a>
        </nav>
        <span className="finale-copyright">© 2026 SGT</span>
      </footer>
    </section>
  );
}

export default Finale;
