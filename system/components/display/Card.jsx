import React from "react";

export function Card({ eyebrow, title, description, media, footer, interactive = false, selected = false, as: Tag = "div", children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <Tag
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        display: "flex", flexDirection: "column", gap: "var(--dt-card-gap)",
        background: selected ? "var(--dt-card-selected-bg)" : "var(--dt-card-bg)",
        color: "var(--dt-card-fg)",
        border: `var(--dt-card-border-width) solid ${selected ? "var(--dt-card-selected-border)" : "var(--dt-card-border-color)"}`,
        borderRadius: "var(--dt-card-radius)",
        padding: "var(--dt-card-padding)",
        boxShadow: hover ? "var(--dt-card-elevation-hover)" : "var(--dt-card-elevation)",
        transition: "box-shadow var(--dt-card-transition), border-color var(--dt-card-transition)",
        cursor: interactive ? "pointer" : undefined,
        ...style,
      }}
      {...rest}
    >
      {media}
      {eyebrow && (
        <span style={{
          fontFamily: "var(--dt-text-eyebrow-family)", fontSize: "var(--dt-text-eyebrow-size)",
          lineHeight: "var(--dt-text-eyebrow-line)", fontWeight: "var(--dt-text-eyebrow-weight)",
          letterSpacing: "var(--dt-text-eyebrow-tracking)", textTransform: "uppercase",
          color: "var(--dt-text-secondary)",
        }}>{eyebrow}</span>
      )}
      {title && (
        <span style={{
          fontFamily: "var(--dt-text-heading-sm-family)", fontSize: "var(--dt-text-heading-sm-size)",
          lineHeight: "var(--dt-text-heading-sm-line)", fontWeight: "var(--dt-text-heading-sm-weight)",
          letterSpacing: "var(--dt-text-heading-sm-tracking)",
        }}>{title}</span>
      )}
      {description && (
        <span style={{
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)",
        }}>{description}</span>
      )}
      {children}
      {footer && <div style={{ marginTop: "var(--dt-space-stack-xs)" }}>{footer}</div>}
    </Tag>
  );
}
