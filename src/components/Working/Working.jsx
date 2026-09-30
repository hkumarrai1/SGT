import { useState } from "react";
import "./Working.css";

const plans = [
  {
    id: "vibe",
    name: "Vibe Dandiya Plan",
    eyebrow: "FIND YOUR DANDIYA PARTNER",
    price: "499",
    cta: "Choose Vibe Plan",
    className: "working-card--vibe",
    features: [
      "Create your profile & set preferences",
      "Get matched with compatible participants",
      "Chat and connect before the event",
      "Attend the university Dandiya event",
      "Chance to find your Dandiya partner",
    ],
    refund: "Get 50% Back",
  },
  {
    id: "premium",
    name: "Premium Dandiya Night Plan",
    eyebrow: "A COMPLETE EXPERIENCE",
    price: "999",
    cta: "Choose Premium Plan",
    className: "working-card--premium",
    popular: true,
    features: [
      "Everything in Vibe Dandiya Plan",
      "Priority matching for better chances",
      "Attend the exclusive Dandiya Night",
      "₹400 per participant for refreshments",
      "Access to premium event perks",
      "More opportunities to connect",
    ],
    refund: "Get 65% Back Guaranteed",
  },
];

function Working() {
  const [selectedPlan, setSelectedPlan] = useState("vibe");

  return (
    <section className="working" id="plans">
      <div className="working-shell">
        <div className="working-heading">
          <span className="working-kicker">OUR PLANS</span>
          <h2>
            Be a Part of
            <br />
            Something <em>Special</em>
          </h2>
          <p>
            Choose your plan, join the experience, and get a chance to find your
            Dandiya partner.
            <br className="working-desktop-break" /> More than just an event -
            it&apos;s a chance to meet, connect and create memories.
          </p>
        </div>

        <div className="working-layout">
          <aside
            className="working-notes working-notes--left"
            aria-label="Vibe plan benefits"
          >
            <div>
              <strong>●</strong>
              <span>
                <b>Real People</b>Students from our university
              </span>
            </div>
            <div>
              <strong>◆</strong>
              <span>
                <b>Safe &amp; Verified</b>A trusted and moderated platform
              </span>
            </div>
            <div>
              <strong>●</strong>
              <span>
                <b>On-Campus Event</b>Meet your match in real life
              </span>
            </div>
          </aside>

          <div className="working-cards">
            {plans.map((plan) => (
              <article
                className={`working-card ${plan.className} ${selectedPlan === plan.id ? "is-selected" : ""}`}
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <span className="working-popular">MOST POPULAR</span>
                )}
                <div className="working-icon">{plan.popular ? "♛" : "●"}</div>
                <h3>{plan.name}</h3>
                <span className="working-eyebrow">{plan.eyebrow}</span>
                <div className="working-price">
                  <span>₹</span>
                  {plan.price}
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="working-refund">
                  <strong>◆</strong>
                  <span>
                    <b>No Match?</b>
                    {plan.refund}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.assign(`/payment?plan=${plan.id}`)}
                >
                  {plan.cta}
                  <span>→</span>
                </button>
              </article>
            ))}
          </div>

          <aside
            className="working-notes working-notes--right"
            aria-label="Premium plan benefits"
          >
            <div>
              <strong>♜</strong>
              <span>
                <b>₹400 Refreshments</b>Per participant (Premium Plan)
              </span>
            </div>
            <div>
              <strong>▦</strong>
              <span>
                <b>Dandiya Night On Campus</b>Date &amp; venue shared with
                selected participants
              </span>
            </div>
            <div>
              <strong>●</strong>
              <span>
                <b>Meet. Dance. Connect.</b>Same campus. New people. New
                stories.
              </span>
            </div>
          </aside>
        </div>

        <div className="working-footer">SAME CAMPUS. NEW CONNECTIONS.</div>
      </div>
    </section>
  );
}

export default Working;
