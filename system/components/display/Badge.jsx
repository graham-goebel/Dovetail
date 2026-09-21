import React from "react";

const TONES = {
  neutral: { bg: "var(--dt-surface-sunken)", fg: "var(--dt-text-secondary)", bd: "var(--dt-border-default)" },
  accent: { bg: "var(--dt-surface-selected)", fg: "var(--dt-text-on-selected)", bd: "var(--dt-border-selected)" },
  success: { bg: "var(--dt-surface-success-subtle)", fg: "var(--dt-text-success)", bd: "var(--dt-border-success)" },
  warning: { bg: "var(--dt-surface-warning-subtle)", fg: "var(--dt-text-warning)", bd: "var(--dt-border-warning)" },
  danger: { bg: "var(--dt-surface-danger-subtle)", fg: "var(--dt-text-danger)", bd: "var(--dt-border-danger)" },
  info: { bg: "var(--dt-surface-info-subtle)", fg: "var(--dt-text-info)", bd: "var(--dt-border-info)" },
};

export function Badge({ tone = "neutral", variant = "subtle", dot = false, children, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  const solid = variant === "solid";
  const solidBg = { neutral: "var(--dt-surface-inverse)", accent: "var(--dt-surface-action)", success: "var(--dt-surface-success)", warning: "var(--dt-surface-warning)", danger: "var(--dt-surface-danger)", info: "var(--dt-surface-info)" }[tone];
  const solidFg = { neutral: "var(--dt-text-inverse)", accent: "var(--dt-text-on-action)", success: "var(--dt-text-on-success)", warning: "var(--dt-text-on-warning)", danger: "var(--dt-text-on-danger)", info: "var(--dt-text-on-info)" }[tone];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)",
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
        lineHeight: "var(--dt-text-label-sm-line)", fontWeight: "var(--dt-font-weight-medium)",
        padding: "2px var(--dt-space-inset-xs)",
        borderRadius: "var(--dt-radius-pill)",
        background: solid ? solidBg : t.bg,
        color: solid ? solidFg : t.fg,
        border: solid ? "var(--dt-border-width-default) solid transparent" : `var(--dt-border-width-default) solid ${t.bd}`,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flex: "none" }} />}
      {children}
    </span>
  );
}
