import React from "react";

export function Link({ href, external = false, underline = "always", tone = "accent", children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const color = tone === "inherit" ? "inherit" : hover ? "var(--dt-text-link-hover)" : "var(--dt-text-link)";
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color,
        textDecoration: underline === "never" ? "none" : underline === "hover" ? (hover ? "underline" : "none") : "underline",
        textUnderlineOffset: 2,
        textDecorationThickness: hover ? 2 : 1,
        display: external ? "inline-flex" : undefined,
        alignItems: external ? "center" : undefined,
        gap: external ? "var(--dt-space-inline-2xs)" : undefined,
        transition: "color var(--dt-motion-micro)",
        ...style,
      }}
      {...rest}
    >
      {children}
      {external && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      )}
    </a>
  );
}
