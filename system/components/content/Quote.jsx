import React from "react";

export function Quote({ children, attribution, role, avatar, size = "md", style, ...rest }) {
  const t = size === "lg" ? "heading-sm" : "body-lg";
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)", ...style }} {...rest}>
      <blockquote style={{
        margin: 0, fontFamily: `var(--dt-text-${t}-family)`, fontSize: `var(--dt-text-${t}-size)`,
        lineHeight: `var(--dt-text-${t}-line)`, color: "var(--dt-text-primary)",
        fontWeight: size === "lg" ? "var(--dt-font-weight-medium)" : "var(--dt-font-weight-regular)",
        textWrap: "pretty", maxWidth: "54ch",
      }}>{children}</blockquote>
      {(attribution || avatar) && (
        <figcaption style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)" }}>
          {avatar}
          <span style={{ display: "flex", flexDirection: "column" }}>
            {attribution && <span style={{ fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-primary)" }}>{attribution}</span>}
            {role && <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-text-secondary)" }}>{role}</span>}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
