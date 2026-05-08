import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const DEMO_EMAIL = "test@plannavigator.app";
const DEMO_PASSWORD = "Test1234!";

export function LoginPage() {
  const navigate = useNavigate();
  const { state, signIn, signUp } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      // Navigation will happen automatically when auth state updates
      navigate("/");
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <header>
          <h1>Plan Navigator Login</h1>
          <p>{isSignUp ? "Create a new account" : "Sign in to your account"}</p>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </label>

          {state.error ? <div className="form-error">{state.error}</div> : null}

          <button type="submit" disabled={state.loading}>
            {state.loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Create Account" : "Sign in")}
          </button>
        </form>

        <div className="login-toggle">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              // Reset error when toggling
            }}
            className="toggle-button"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="login-hint">
          <strong>Demo credentials</strong>
          <p>Email: {DEMO_EMAIL}</p>
          <p>Password: {DEMO_PASSWORD}</p>
          <p>
            Use these credentials to test the application. Passwords are securely hashed using Passlib (bcrypt) and stored locally.
          </p>
        </div>
      </div>
    </div>
  );
}

