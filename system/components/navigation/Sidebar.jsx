import React from "react";

export function Sidebar({ sections = [], current, onNavigate, header, footer, label = "Sections", width = 240, style, ...rest }) {
  return (
    <nav aria-label={label} style={{
      width, flex: "none", display: "flex", flexDirection: "column",
      gap: "var(--dt-space-stack-md)", padding: "var(--dt-space-inset-md)",
      background: "var(--dt-surface-subtle)",
      borderRight: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
      boxSizing: "border-box", ...style,
    }} {...rest}>
      {header}
      {sections.map((s, si) => (
        <div key={s.title || si} style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
          {s.title && (
            <span style={{
              fontFamily: "var(--dt-text-eyebrow-family, var(--dt-font-family-mono))",
              fontSize: "var(--dt-text-label-sm-size)", textTransform: "uppercase",
              letterSpacing: "var(--dt-tracking-wide, 0.05em)", color: "var(--dt-text-tertiary)",
              padding: "0 var(--dt-space-inset-xs)",
            }}>{s.title}</span>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {s.items.map(it => {
              const on = it.id === current;
              return (
                <li key={it.id}>
                  <a
                    href={it.href || "#"}
                    aria-current={on ? "page" : undefined}
                    onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate(it.id); } }}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
                      padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm)",
                      borderRadius: "var(--dt-radius-control)", textDecoration: "none",
                      background: on ? "var(--dt-surface-selected)" : "transparent",
                      color: on ? "var(--dt-text-on-selected)" : "var(--dt-text-secondary)",
                      fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                      fontWeight: on ? "var(--dt-font-weight-medium)" : "var(--dt-font-weight-regular)",
                      transition: "background var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
                    }}
                  >
                    {it.icon && <span style={{ flex: "none", display: "flex" }}>{it.icon}</span>}
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                    {it.trailing}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {footer && <div style={{ marginTop: "auto" }}>{footer}</div>}
    </nav>
  );
}
