import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const {
    state: { user, loading }
  } = useAuth();

  if (loading) {
    return (
      <div className="loading-shell">
        <p>Checking authentication…</p>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
