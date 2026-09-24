import React from "react";

const GLASS = "var(--dt-backdrop-glass, saturate(1.4) blur(16px))";

/* Glass surfaces for a card that sits over other content. Glass follows the
   colour mode; inverse glass is dark in both, for a card over a photograph,
   and scopes dark mode so everything inside it reads light on dark. */
const SURFACES = {
  glass: { bg: "var(--dt-surface-glass)", bd: "var(--dt-border-glass)" },
  "glass-strong": { bg: "var(--dt-surface-glass-strong)", bd: "var(--dt-border-glass)" },
  "glass-inverse": { bg: "var(--dt-surface-glass-inverse)", bd: "var(--dt-border-glass-inverse)" },
};

export function Card({ eyebrow, title, description, media, footer, href, interactive = false, selected = false, surface = "raised", as: Tag = "div", className, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const linked = !!href;
  const lift = interactive || linked;
  const glass = SURFACES[surface];
  return (
    <Tag
      className={[surface === "glass-inverse" ? "dark" : null, className].filter(Boolean).join(" ") || undefined}
      onMouseEnter={() => lift && setHover(true)}
      onMouseLeave={() => lift && setHover(false)}
      style={{
        display: "flex", flexDirection: "column", gap: "var(--dt-card-gap)",
        background: selected ? "var(--dt-card-selected-bg)" : glass ? glass.bg : "var(--dt-card-bg)",
        backdropFilter: glass ? GLASS : undefined,
        WebkitBackdropFilter: glass ? GLASS : undefined,
        color: "var(--dt-card-fg)",
        border: `var(--dt-card-border-width) solid ${selected ? "var(--dt-card-selected-border)" : glass ? glass.bd : "var(--dt-card-border-color)"}`,
        borderRadius: "var(--dt-card-radius)",
        padding: "var(--dt-card-padding)",
        boxShadow: glass ? "none" : hover ? "var(--dt-card-elevation-hover)" : "var(--dt-card-elevation)",
        transition: "box-shadow var(--dt-card-transition), border-color var(--dt-card-transition)",
        cursor: lift ? "pointer" : undefined,
        position: linked ? "relative" : undefined,
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
        }}>{linked ? <a href={href} style={{ color: "inherit", textDecoration: hover ? "underline" : "none", textUnderlineOffset: 2 }}>{title}</a> : title}</span>
      )}
      {description && (
        <span style={{
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)",
        }}>{description}</span>
      )}
      {children}
      {/* The title is the one link a screen reader hears. This copy stretches
          the same target over the whole card for a pointer, and sits under the
          footer so a real button there still gets its own click. */}
      {linked && <a href={href} aria-hidden="true" tabIndex={-1} style={{ position: "absolute", inset: 0, borderRadius: "inherit" }} />}
      {footer && <div style={{ marginTop: "var(--dt-space-stack-xs)", position: linked ? "relative" : undefined, zIndex: linked ? 1 : undefined }}>{footer}</div>}
    </Tag>
  );
}
