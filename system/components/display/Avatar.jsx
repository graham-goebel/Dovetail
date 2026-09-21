import React from "react";

const SIZES = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 };
const TEXT = { xs: "var(--dt-text-label-sm-size)", sm: "var(--dt-text-label-sm-size)", md: "var(--dt-text-label-md-size)", lg: "var(--dt-text-label-lg-size)", xl: "var(--dt-text-heading-xs-size)" };

function initials(name) {
  if (!name) return "";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export function Avatar({ name, src, size = "md", shape = "circle", status, style, ...rest }) {
  const px = SIZES[size] || SIZES.md;
  const statusColor = { online: "var(--dt-surface-success)", busy: "var(--dt-surface-danger)", away: "var(--dt-surface-warning)", offline: "var(--dt-border-strong)" }[status];
  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "none", ...style }} {...rest}>
      <span
        aria-label={src ? undefined : name}
        role={src ? undefined : "img"}
        style={{
          width: px, height: px, borderRadius: shape === "circle" ? "var(--dt-radius-pill)" : "var(--dt-radius-control)",
          background: "var(--dt-surface-sunken)", color: "var(--dt-text-secondary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          fontFamily: "var(--dt-text-label-md-family)", fontSize: TEXT[size], fontWeight: "var(--dt-font-weight-medium)",
          border: "var(--dt-border-width-default) solid var(--dt-border-subtle)", userSelect: "none",
        }}
      >
        {src ? <img src={src} alt={name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
      </span>
      {status && (
        <span aria-label={status} role="img" style={{
          position: "absolute", right: -1, bottom: -1, width: Math.max(6, px * 0.28), height: Math.max(6, px * 0.28),
          borderRadius: "var(--dt-radius-pill)", background: statusColor,
          border: "var(--dt-border-width-thick, 2px) solid var(--dt-surface-base)",
        }} />
      )}
    </span>
  );
}
