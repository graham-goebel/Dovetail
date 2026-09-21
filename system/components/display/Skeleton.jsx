import React from "react";

export function Skeleton({ variant = "text", width, height, lines = 1, radius, style, ...rest }) {
  const base = {
    background: "var(--dt-surface-sunken)",
    borderRadius: radius || (variant === "circle" ? "var(--dt-radius-pill)" : variant === "text" ? "var(--dt-radius-control)" : "var(--dt-radius-container)"),
    animation: "dt-skeleton-pulse var(--dt-motion-duration-slower, 1400ms) var(--dt-motion-easing-standard) infinite",
  };
  if (variant === "text") {
    return (
      <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", width: width || "100%", ...style }} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} style={{ ...base, display: "block", height: height || "0.85em", width: i === lines - 1 && lines > 1 ? "62%" : "100%" }} />
        ))}
      </span>
    );
  }
  return <span aria-hidden="true" style={{ ...base, display: "block", width: width || (variant === "circle" ? 32 : "100%"), height: height || (variant === "circle" ? 32 : 80), ...style }} {...rest} />;
}
