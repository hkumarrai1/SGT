import "./Loader.css";

function Loader({ label = "Loading" }) {
  return (
    <div className="app-loader" role="status" aria-live="polite">
      <span className="app-loader-mark" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default Loader;
