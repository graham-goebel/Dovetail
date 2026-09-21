import React from "react";

export function Progress({ value, max = 100, label, showValue = false, tone = "accent", size = "md", style, ...rest }) {
  const indeterminate = value == null;
  const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const h = size === "sm" ? 4 : size === "lg" ? 10 : 6;
  const fill = { accent: "var(--dt-surface-action)", success: "var(--dt-surface-success)", warning: "var(--dt-surface-warning)", danger: "var(--dt-surface-danger)" }[tone];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", ...style }} {...rest}>
      {(label || showValue) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)" }}>
          {label && <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", color: "var(--dt-text-secondary)", fontWeight: "var(--dt-font-weight-medium)" }}>{label}</span>}
          {showValue && !indeterminate && <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", color: "var(--dt-text-secondary)", fontVariantNumeric: "tabular-nums" }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={typeof label === "string" ? label : undefined}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        style={{ height: h, background: "var(--dt-surface-sunken)", borderRadius: "var(--dt-radius-pill)", overflow: "hidden" }}
      >
        <div style={{
          height: "100%", background: fill, borderRadius: "var(--dt-radius-pill)",
          width: indeterminate ? "35%" : pct + "%",
          transition: "width var(--dt-motion-duration-normal) var(--dt-motion-easing-standard)",
          animation: indeterminate ? "dt-progress-slide 1200ms var(--dt-motion-easing-standard) infinite" : undefined,
        }} />
      </div>
    </div>
  );
}
