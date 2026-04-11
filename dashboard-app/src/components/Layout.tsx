import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Runs" },
  { to: "/analytics", label: "Analytics" },
  { to: "/logs", label: "Logs" },
];

export function Layout() {
  return (
    <>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-header)",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            letterSpacing: "3px",
            color: "var(--text-accent)",
          }}
        >
          JUSTICE LEAGUE FACTORY
        </h1>
        <nav style={{ display: "flex", gap: "4px" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                padding: "0.375rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.875rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "1px",
                color: isActive ? "var(--text-accent)" : "var(--text-muted)",
                background: isActive ? "var(--bg-card)" : "transparent",
                border: isActive
                  ? "1px solid var(--border-accent)"
                  : "1px solid transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </>
  );
}
