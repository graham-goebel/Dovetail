import React from "react";

export function Figure({ caption, credit, align = "start", children, style, ...rest }) {
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)", ...style }} {...rest}>
      {children}
      {(caption || credit) && (
        <figcaption style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", textAlign: align === "center" ? "center" : "left", alignItems: align === "center" ? "center" : "flex-start" }}>
          {caption && <span style={{ fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-font-size-sm)", lineHeight: "var(--dt-line-height-sm)", color: "var(--dt-text-secondary)" }}>{caption}</span>}
          {credit && <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-font-size-xs)", lineHeight: "var(--dt-line-height-xs)", color: "var(--dt-text-tertiary)" }}>{credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
