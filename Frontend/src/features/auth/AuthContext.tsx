import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  register as apiRegister,
  login as apiLogin,
  getCurrentUser as apiGetCurrentUser,
  logout as apiLogout,
  getStoredToken,
  setStoredToken,
  removeStoredToken
} from "../../lib/authApi";

type AuthState = {
  user: { email: string } | null;
  loading: boolean;
  error: string | null;
  token: string | null;
};

type AuthAction =
  | { type: "SET_USER"; payload: { email: string } | null }
  | { type: "SET_TOKEN"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
  token: null
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_TOKEN":
      return { ...state, token: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      dispatch({ type: "SET_TOKEN", payload: token });
      // Verify token is still valid
      apiGetCurrentUser(token)
        .then((user) => {
          dispatch({ type: "SET_USER", payload: user });
          dispatch({ type: "SET_LOADING", payload: false });
        })
        .catch(() => {
          // Token is invalid or expired
          removeStoredToken();
          dispatch({ type: "SET_TOKEN", payload: null });
          dispatch({ type: "SET_LOADING", payload: false });
        });
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const signUp = async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const response = await apiRegister(email, password);
      setStoredToken(response.access_token);
      dispatch({ type: "SET_TOKEN", payload: response.access_token });
      dispatch({ type: "SET_USER", payload: { email: response.email } });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Unable to sign up";
      dispatch({ type: "SET_ERROR", payload: message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const signIn = async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const response = await apiLogin(email, password);
      setStoredToken(response.access_token);
      dispatch({ type: "SET_TOKEN", payload: response.access_token });
      dispatch({ type: "SET_USER", payload: { email: response.email } });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: string }).message)
          : "Unable to sign in";
      dispatch({ type: "SET_ERROR", payload: message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const signOut = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      if (state.token) {
        await apiLogout(state.token);
      }
    } finally {
      removeStoredToken();
      dispatch({ type: "SET_USER", payload: null });
      dispatch({ type: "SET_TOKEN", payload: null });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const value = useMemo(
    () => ({ state, signUp, signIn, signOut }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

