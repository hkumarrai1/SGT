import AuthForm from "./AuthForm";

function Login({ onSwitch }) {
  return <AuthForm mode="login" onSwitch={onSwitch} />;
}

export default Login;
