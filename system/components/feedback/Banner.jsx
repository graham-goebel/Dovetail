import React from "react";

const TONES = {
  info: { bg: "var(--dt-surface-info-subtle)", fg: "var(--dt-text-info)", bd: "var(--dt-border-info)" },
  success: { bg: "var(--dt-surface-success-subtle)", fg: "var(--dt-text-success)", bd: "var(--dt-border-success)" },
  warning: { bg: "var(--dt-surface-warning-subtle)", fg: "var(--dt-text-warning)", bd: "var(--dt-border-warning)" },
  danger: { bg: "var(--dt-surface-danger-subtle)", fg: "var(--dt-text-danger)", bd: "var(--dt-border-danger)" },
};

export function Banner({ tone = "info", title, children, icon, action, onDismiss, dismissLabel = "Dismiss", style, ...rest }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div role={tone === "danger" ? "alert" : "status"} style={{
      display: "flex", alignItems: "flex-start", gap: "var(--dt-space-inline-sm)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-md)",
      background: t.bg, color: "var(--dt-text-primary)",
      borderBottom: `var(--dt-border-width-default) solid ${t.bd}`,
      width: "100%", boxSizing: "border-box", ...style,
    }} {...rest}>
      {icon && <span aria-hidden="true" style={{ color: t.fg, flex: "none", display: "flex", marginTop: 1 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {title && <span style={{ fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-semibold)" }}>{title}</span>}
        {children && <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{children}</span>}
      </div>
      {action && <span style={{ flex: "none" }}>{action}</span>}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={dismissLabel} style={{
          flex: "none", appearance: "none", background: "transparent", border: "none", cursor: "pointer",
          color: "var(--dt-text-secondary)", fontSize: "var(--dt-text-body-md-size)", lineHeight: 1,
          padding: "var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)",
        }}>×</button>
      )}
    </div>
  );
}
