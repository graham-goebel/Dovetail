import React from "react";

const SIZES = { sm: 14, md: 18, lg: 24 };

export function Spinner({ size = "md", label = "Loading", inline = false, style, ...rest }) {
  const px = SIZES[size] || SIZES.md;
  return (
    <span role="status" aria-live="polite" style={{ display: inline ? "inline-flex" : "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", ...style }} {...rest}>
      <span aria-hidden="true" style={{
        width: px, height: px, flex: "none", borderRadius: "var(--dt-radius-pill)",
        border: "2px solid var(--dt-border-default)", borderTopColor: "var(--dt-surface-action)",
        animation: "dt-spin var(--dt-motion-duration-slow, 700ms) linear infinite",
      }} />
      <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>{label}</span>
    </span>
  );
}
