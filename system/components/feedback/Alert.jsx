import React from "react";

const TONES = {
  info: { bg: "var(--dt-surface-info-subtle)", bd: "var(--dt-border-info)", fg: "var(--dt-text-info)", icon: "M12 16v-4 M12 8h.01", ring: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" },
  success: { bg: "var(--dt-surface-success-subtle)", bd: "var(--dt-border-success)", fg: "var(--dt-text-success)", icon: "m9 12 2 2 4-4", ring: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" },
  warning: { bg: "var(--dt-surface-warning-subtle)", bd: "var(--dt-border-warning)", fg: "var(--dt-text-warning)", icon: "M12 9v4 M12 17h.01", ring: "m10.3 3.6-8 14A2 2 0 0 0 4 20.5h16a2 2 0 0 0 1.7-2.9l-8-14a2 2 0 0 0-3.4 0" },
  danger: { bg: "var(--dt-surface-danger-subtle)", bd: "var(--dt-border-danger)", fg: "var(--dt-text-danger)", icon: "M15 9l-6 6 M9 9l6 6", ring: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" },
};

export function Alert({ tone = "info", title, action, onDismiss, children, style, ...rest }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      style={{
        display: "flex", gap: "var(--dt-space-inline-sm)",
        padding: "var(--dt-space-inset-md)",
        background: t.bg,
        border: `var(--dt-border-width-default) solid ${t.bd}`,
        borderRadius: "var(--dt-radius-container)",
        ...style,
      }}
      {...rest}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke={t.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)", flex: "none", marginTop: 1 }}>
        <path d={t.ring} />
        {t.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", flex: 1, minWidth: 0 }}>
        {title && (
          <span style={{ fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)", lineHeight: "var(--dt-text-label-md-line)", fontWeight: "var(--dt-font-weight-semibold)", color: "var(--dt-text-primary)" }}>{title}</span>
        )}
        {children && (
          <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>{children}</span>
        )}
        {action && <div style={{ marginTop: "var(--dt-space-stack-2xs)" }}>{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss}
          style={{ display: "flex", padding: 0, border: 0, background: "none", color: "var(--dt-text-secondary)", cursor: "pointer", flex: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      )}
    </div>
  );
}
