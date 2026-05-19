import { useState, type FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const DEMO_EMAIL = "test@plannavigator.app";
const DEMO_PASSWORD = "Test1234!";

function getSavedAccounts(): string[] {
  const saved = localStorage.getItem("saved_accounts");
  return saved ? JSON.parse(saved) : [];
}

function addSavedAccount(email: string) {
  const accounts = getSavedAccounts();
  if (!accounts.includes(email)) {
    accounts.push(email);
    localStorage.setItem("saved_accounts", JSON.stringify(accounts));
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const { state, signIn, signUp } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [isSignUp, setIsSignUp] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const hasLoggedInAccounts = state.allUsers.length > 0;

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
        addSavedAccount(email);
      }
      navigate("/plan-checkup");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Authentication failed";
      if (message.toLowerCase().includes("user not found")) {
        setIsSignUp(true);
        setPassword("");
      }
      console.error("Auth error:", message);
    }
  };

  const handleQuickSwitch = (savedEmail: string) => {
    setEmail(savedEmail);
    setPassword("");
    setIsSignUp(false);
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <header>
          <h1>Plan Navigator Login</h1>
          <p>{isSignUp ? "Create a new account" : "Sign in to your account"}</p>
        </header>

        {savedAccounts.length > 0 && !isSignUp && (
          <div className="saved-accounts">
            <p className="saved-accounts-label">Quick switch:</p>
            <div className="saved-accounts-buttons">
              {savedAccounts.map((account) => (
                <button
                  key={account}
                  type="button"
                  className="quick-switch-btn"
                  onClick={() => handleQuickSwitch(account)}
                  title={`Switch to ${account}`}
                >
                  {account}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasLoggedInAccounts && (
          <div className="login-info">
            You are already signed in with {state.allUsers.length} account{state.allUsers.length > 1 ? "s" : ""}.
            Signing in here will keep existing sessions so you can switch between accounts.
          </div>
        )}

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
          <p style={{ color: "#9ca3af" }}>Email: {DEMO_EMAIL}</p>
          <p style={{ color: "#9ca3af" }}>Password: {DEMO_PASSWORD}</p>
          <p>
            Use these credentials to test the application. Passwords are securely hashed using Passlib (bcrypt) and stored locally.
          </p>
        </div>
      </div>
    </div>
  );
}

