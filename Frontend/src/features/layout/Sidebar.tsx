import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/plan-checkup", label: "Plan Check-Up" },
  { to: "/plan-health-tests", label: "Plan Health Tests" },
  { to: "/operations-tests", label: "Operations Tests" },
  { to: "/recommendations", label: "Recommendations" },
  { to: "/participant-education", label: "Participant Education" },
  { to: "/documents", label: "Documents" },
  { to: "/what-if-simulator", label: "What-If Simulator" },
  { to: "/retirement-ai", label: "RetirementAI" },
  { to: "/usage", label: "Usage" },
  { to: "/data-schema", label: "Data Schema" }
];

export function Sidebar() {
  return (
    <aside className="sidebar-shell">
      <div className="sidebar-brand">
        <div className="brand-icon">PS</div>
        <div>
          <strong>Plan Sponsor</strong>
          <span>Plan Sponsor 401(k) Plan</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

