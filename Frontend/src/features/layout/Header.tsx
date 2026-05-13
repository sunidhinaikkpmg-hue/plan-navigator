import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getUserRole } from "../../lib/user";

export function Header() {
  const { signOut, state, switchUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const role = getUserRole(state.user?.email);
  const otherUsers = state.allUsers.filter(u => u.email !== state.user?.email);
  const currentUserPrefix = state.user?.email?.split("@")[0] || "";
  const samePrefixUsers = otherUsers.filter((user) => user.email.split("@")[0] === currentUserPrefix);
  const otherPrefixUsers = otherUsers.filter((user) => user.email.split("@")[0] !== currentUserPrefix);

  const handleLogoutAll = async () => {
    await signOut();
    setDropdownOpen(false);
    navigate("/login", { replace: true });
  };

  const handleAddAccount = () => {
    setDropdownOpen(false);
    navigate("/login");
  };

  return (
    <header className="app-header">
      <div className="header-actions">
        <button type="button" className="header-action-button">
          Contact
        </button>
        <button type="button" className="header-action-button">
          News
        </button>
        <button type="button" className="header-action-button">
          Help
        </button>
        <span className={`header-role-badge ${role.toLowerCase()}`}>
          {role}
        </span>
      </div>

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

            {samePrefixUsers.length > 0 && (
              <>
                <hr />
                <div style={{ padding: "8px 16px", fontSize: "0.85rem", color: "#6b7280" }}>
                  Quick switch
                </div>
                {samePrefixUsers.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      switchUser(user.email);
                      setDropdownOpen(false);
                    }}
                  >
                    {user.email}
                  </button>
                ))}
              </>
            )}

            {otherPrefixUsers.length > 0 && (
              <>
                <hr />
                <div style={{ padding: "8px 16px", fontSize: "0.85rem", color: "#6b7280" }}>
                  Other signed-in accounts
                </div>
                {otherPrefixUsers.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      switchUser(user.email);
                      setDropdownOpen(false);
                    }}
                  >
                    {user.email}
                  </button>
                ))}
              </>
            )}

            <hr />
            <button
              type="button"
              className="dropdown-item"
              onClick={handleAddAccount}
            >
              Sign in another account
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={handleLogoutAll}
              title="Log out from all accounts"
            >
              Log out all
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
