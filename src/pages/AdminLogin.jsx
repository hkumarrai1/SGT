const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AdminLogin() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const r = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId: id, password }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.message);
      return;
    }
    localStorage.setItem("sgt_admin_token", d.token);
    window.location.assign("/admin/dashboard");
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-topline">
          <span>SGT ADMIN</span>
          <i />
        </div>
        <h1>
          Review
          <br />
          <em>applications.</em>
        </h1>
        <form onSubmit={submit}>
          <label>Admin ID</label>
          <input value={id} onChange={(e) => setId(e.target.value)} required />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="auth-submit">
            Admin sign in <span>→</span>
          </button>
        </form>
        {error && <p className="auth-status auth-status--error">{error}</p>}
      </section>
    </main>
  );
}
export default AdminLogin;
