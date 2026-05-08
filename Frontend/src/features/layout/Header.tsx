import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Header() {
  const { signOut, state } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    setDropdownOpen(false);
    navigate("/login", { replace: true });
  };

  const handleSwitchUser = async () => {
    await signOut();
    setDropdownOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-header">
      <div className="header-spacer" />
      <div className="header-user-menu">
        <button
          type="button"
          className="user-button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="User menu"
        >
          <div className="user-avatar">
            {state.user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <span>{state.user?.email || "User"}</span>
        </button>

        {dropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-item-label">
              Signed in as
              <br />
              <strong>{state.user?.email}</strong>
            </div>
            <hr />
            <button
              type="button"
              className="dropdown-item"
              onClick={handleSwitchUser}
            >
              Switch User
            </button>
            <button
              type="button"
              className="dropdown-item logout"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
