import React from "react";

export function Navbar({ brand, links = [], actions, current, onNavigate, label = "Main", sticky = false, style, ...rest }) {
  return (
    <nav aria-label={label} style={{
      display: "flex", alignItems: "center", gap: "var(--dt-space-inline-lg)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-lg)",
      background: "var(--dt-surface-base)",
      borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
      position: sticky ? "sticky" : "static", top: 0, zIndex: 10, ...style,
    }} {...rest}>
      {brand && <span style={{ display: "flex", alignItems: "center", flex: "none" }}>{brand}</span>}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "var(--dt-space-inline-md)", alignItems: "center", flex: 1, minWidth: 0, overflowX: "auto" }}>
        {links.map(l => {
          const on = l.id === current;
          return (
            <li key={l.id}>
              <a
                href={l.href || "#"}
                aria-current={on ? "page" : undefined}
                onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate(l.id); } }}
                style={{
                  fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                  fontWeight: "var(--dt-font-weight-medium)", textDecoration: "none", whiteSpace: "nowrap",
                  color: on ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
                  padding: "var(--dt-space-inset-2xs, 4px) 0",
                  borderBottom: `2px solid ${on ? "var(--dt-border-selected)" : "transparent"}`,
                }}
              >{l.label}</a>
            </li>
          );
        })}
      </ul>
      {actions && <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)", flex: "none" }}>{actions}</span>}
    </nav>
  );
}
