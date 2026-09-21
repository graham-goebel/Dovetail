import React from "react";

export function EmptyState({ title, description, icon, action, secondaryAction, size = "md", style, ...rest }) {
  const pad = size === "sm" ? "var(--dt-space-inset-lg)" : "var(--dt-space-inset-xl)";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      gap: "var(--dt-space-stack-sm)", padding: pad, ...style,
    }} {...rest}>
      {icon && <span aria-hidden="true" style={{ color: "var(--dt-text-tertiary)", display: "flex" }}>{icon}</span>}
      <span style={{
        fontFamily: "var(--dt-text-heading-xs-family)", fontSize: size === "sm" ? "var(--dt-text-body-lg-size)" : "var(--dt-text-heading-xs-size)",
        lineHeight: "var(--dt-text-heading-xs-line)", fontWeight: "var(--dt-font-weight-semibold)", color: "var(--dt-text-primary)",
      }}>{title}</span>
      {description && (
        <p style={{
          margin: 0, maxWidth: "46ch",
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)", textWrap: "pretty",
        }}>{description}</p>
      )}
      {(action || secondaryAction) && (
        <span style={{ display: "flex", gap: "var(--dt-space-inline-sm)", marginTop: "var(--dt-space-stack-2xs)" }}>
          {action}{secondaryAction}
        </span>
      )}
    </div>
  );
}
