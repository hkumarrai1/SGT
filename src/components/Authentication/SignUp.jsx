import AuthForm from "./AuthForm";

function SignUp({ onSwitch }) {
  return <AuthForm mode="signup" onSwitch={onSwitch} />;
}

export default SignUp;
