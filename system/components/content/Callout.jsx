import React from "react";

const TONES = {
  note: { bd: "var(--dt-border-default)", bg: "var(--dt-surface-subtle)", fg: "var(--dt-text-secondary)" },
  tip: { bd: "var(--dt-border-success)", bg: "var(--dt-surface-success-subtle)", fg: "var(--dt-text-success)" },
  important: { bd: "var(--dt-border-info)", bg: "var(--dt-surface-info-subtle)", fg: "var(--dt-text-info)" },
  caution: { bd: "var(--dt-border-warning)", bg: "var(--dt-surface-warning-subtle)", fg: "var(--dt-text-warning)" },
};

export function Callout({ tone = "note", title, children, icon, style, ...rest }) {
  const t = TONES[tone] || TONES.note;
  return (
    <aside style={{
      display: "flex", gap: "var(--dt-space-inline-sm)",
      padding: "var(--dt-space-inset-md)",
      background: t.bg, borderRadius: "var(--dt-radius-container)",
      border: `var(--dt-border-width-default) solid ${t.bd}`,
      ...style,
    }} {...rest}>
      {icon && <span aria-hidden="true" style={{ color: t.fg, flex: "none", display: "flex", marginTop: 2 }}>{icon}</span>}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
        {title && <span style={{ fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-semibold)", color: "var(--dt-text-primary)" }}>{title}</span>}
        <div style={{
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)", textWrap: "pretty",
        }}>{children}</div>
      </div>
    </aside>
  );
}
