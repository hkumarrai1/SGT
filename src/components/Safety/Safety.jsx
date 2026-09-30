import "./Safety.css";

const protections = [
  {
    icon: "✓",
    title: "Verified Students",
    text: "SGT is designed for university students using their official campus details.",
  },
  {
    icon: "◇",
    title: "Private by Design",
    text: "Your identity stays private until both people choose to connect.",
  },
  {
    icon: "!",
    title: "Report or Block",
    text: "Our team takes reports seriously. You can block or report someone at any time.",
  },
];

const precautions = [
  "Keep your personal details, passwords, and live location private.",
  "Meet your connection only inside the official SGT campus programme.",
  "Stay in the designated event area and tell a friend where you are.",
  "Leave the conversation and contact the SGT team if anything feels wrong.",
];

function Safety() {
  return (
    <section className="safety" id="safety">
      <div className="safety-shell">
        <header className="safety-heading">
          <span className="safety-kicker">BUILT AROUND TRUST</span>
          <h2>
            Your Safety Comes <em>First</em>
          </h2>
          <p>
            A meaningful connection should always feel comfortable, private, and
            in your control.
          </p>
        </header>

        <div className="safety-layout">
          <div className="safety-protections">
            <span className="safety-label">WHAT SGT DOES</span>
            {protections.map((item) => (
              <article className="safety-card" key={item.title}>
                <span className="safety-card-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="safety-precautions">
            <span className="safety-label">YOUR SAFETY CHECKLIST</span>
            <h3>
              Stay aware.
              <br />
              <em>Stay in control.</em>
            </h3>
            <ul>
              {precautions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="safety-mandatory">
              <strong>MANDATORY</strong>
              <p>
                Meet your connection only at the official SGT campus programme.
                Never meet them outside the programme for your first meeting.
              </p>
            </div>
          </div>
        </div>

        <div className="safety-bottom">
          <span>PRIVATE</span>
          <i /> <span>RESPECTFUL</span>
          <i /> <span>ON CAMPUS</span>
          <i /> <span>VERIFIED</span>
        </div>
      </div>
    </section>
  );
}

export default Safety;
