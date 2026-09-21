import React from "react";

export function Tag({ selected = false, onRemove, disabled = false, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!rest.onClick;
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role={interactive ? "button" : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)",
        fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
        lineHeight: 1, fontWeight: "var(--dt-font-weight-medium)",
        height: "var(--dt-size-control-sm)", padding: "0 var(--dt-space-inset-sm)",
        borderRadius: "var(--dt-radius-pill)",
        border: `var(--dt-border-width-default) solid ${selected ? "var(--dt-border-selected)" : "var(--dt-border-default)"}`,
        background: selected ? "var(--dt-surface-selected)" : hover && interactive ? "var(--dt-surface-subtle)" : "var(--dt-surface-base)",
        color: selected ? "var(--dt-text-on-selected)" : "var(--dt-text-primary)",
        cursor: disabled ? "not-allowed" : interactive ? "pointer" : "default",
        opacity: disabled ? 0.6 : 1,
        transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
        ...style,
      }}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${typeof children === "string" ? children : "tag"}`}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ display: "flex", padding: 0, border: 0, background: "none", color: "inherit", cursor: "pointer" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      )}
    </span>
  );
}
