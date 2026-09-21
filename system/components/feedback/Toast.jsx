import React from "react";

const TONES = {
  neutral: { bd: "var(--dt-border-default)", fg: "var(--dt-text-secondary)" },
  success: { bd: "var(--dt-border-success)", fg: "var(--dt-text-success)" },
  warning: { bd: "var(--dt-border-warning)", fg: "var(--dt-text-warning)" },
  danger: { bd: "var(--dt-border-danger)", fg: "var(--dt-text-danger)" },
};

export function Toast({ tone = "neutral", title, children, icon, action, onDismiss, dismissLabel = "Dismiss", style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <div role={tone === "danger" ? "alert" : "status"} aria-live={tone === "danger" ? "assertive" : "polite"} style={{
      display: "flex", alignItems: "flex-start", gap: "var(--dt-space-inline-sm)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-md)",
      background: "var(--dt-surface-raised)", color: "var(--dt-text-primary)",
      border: `var(--dt-border-width-default) solid ${t.bd}`,
      borderRadius: "var(--dt-radius-overlay)", boxShadow: "var(--dt-elevation-3)",
      minWidth: 260, maxWidth: 420, boxSizing: "border-box", ...style,
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
          color: "var(--dt-text-tertiary)", fontSize: "var(--dt-text-body-md-size)", lineHeight: 1,
          padding: "var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)",
        }}>×</button>
      )}
    </div>
  );
}

export function ToastRegion({ children, placement = "bottom-right", label = "Notifications", style, ...rest }) {
  const pos = {
    "bottom-right": { bottom: "var(--dt-space-inset-lg)", right: "var(--dt-space-inset-lg)", alignItems: "flex-end" },
    "bottom-left": { bottom: "var(--dt-space-inset-lg)", left: "var(--dt-space-inset-lg)", alignItems: "flex-start" },
    "top-right": { top: "var(--dt-space-inset-lg)", right: "var(--dt-space-inset-lg)", alignItems: "flex-end" },
    "top-center": { top: "var(--dt-space-inset-lg)", left: "50%", transform: "translateX(-50%)", alignItems: "center" },
  }[placement];
  return (
    <div role="region" aria-label={label} style={{
      position: "fixed", zIndex: 50, display: "flex", flexDirection: "column",
      gap: "var(--dt-space-stack-xs)", pointerEvents: "none", ...pos, ...style,
    }} {...rest}>
      {React.Children.map(children, c => <div style={{ pointerEvents: "auto" }}>{c}</div>)}
    </div>
  );
}
