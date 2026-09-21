import React from "react";

export function Stepper({ steps = [], current = 0, orientation = "horizontal", label = "Progress", style, ...rest }) {
  const horiz = orientation === "horizontal";
  return (
    <nav aria-label={label} style={style} {...rest}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: horiz ? "row" : "column", gap: horiz ? "var(--dt-space-inline-sm)" : "var(--dt-space-stack-sm)" }}>
        {steps.map((s, i) => {
          const done = i < current, active = i === current;
          const ring = done ? "var(--dt-surface-action)" : active ? "var(--dt-surface-action)" : "var(--dt-surface-sunken)";
          const fg = done || active ? "var(--dt-text-on-action)" : "var(--dt-text-tertiary)";
          return (
            <li key={s.id || i} aria-current={active ? "step" : undefined} style={{ display: "flex", flexDirection: horiz ? "column" : "row", gap: horiz ? "var(--dt-space-stack-2xs)" : "var(--dt-space-inline-sm)", flex: horiz ? 1 : "none", alignItems: horiz ? "stretch" : "flex-start", minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
                <span aria-hidden="true" style={{
                  width: 24, height: 24, flex: "none", borderRadius: "var(--dt-radius-pill)",
                  background: ring, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
                  fontWeight: "var(--dt-font-weight-medium)",
                  border: active ? "none" : done ? "none" : "var(--dt-border-width-default) solid var(--dt-border-default)",
                }}>{done ? "✓" : i + 1}</span>
                {horiz && i < steps.length - 1 && <span aria-hidden="true" style={{ flex: 1, height: "var(--dt-dim-hair)", background: done ? "var(--dt-surface-action)" : "var(--dt-border-subtle)" }} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: "block", fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                  fontWeight: active ? "var(--dt-font-weight-semibold)" : "var(--dt-font-weight-medium)",
                  color: active || done ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
                }}>{s.label}</span>
                {s.description && <span style={{ display: "block", fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)", color: "var(--dt-text-tertiary)" }}>{s.description}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
