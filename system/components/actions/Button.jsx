import React from "react";

const V = {
  primary: { bg: "--dt-button-primary-bg", hover: "--dt-button-primary-bg-hover", active: "--dt-button-primary-bg-active", fg: "--dt-button-primary-fg", border: "--dt-button-primary-border" },
  secondary: { bg: "--dt-button-secondary-bg", hover: "--dt-button-secondary-bg-hover", active: "--dt-button-secondary-bg-active", fg: "--dt-button-secondary-fg", border: "--dt-button-secondary-border" },
  ghost: { bg: "--dt-button-ghost-bg", hover: "--dt-button-ghost-bg-hover", active: "--dt-button-ghost-bg-active", fg: "--dt-button-ghost-fg", border: "--dt-button-ghost-border" },
  danger: { bg: "--dt-button-danger-bg", hover: "--dt-button-danger-bg-hover", active: "--dt-button-danger-bg-active", fg: "--dt-button-danger-fg", border: "--dt-button-danger-border" },
};

export function Button({ variant = "primary", size = "md", disabled = false, loading = false, fullWidth = false, iconStart, iconEnd, as: Tag = "button", children, style, ...rest }) {
  const [state, setState] = React.useState("idle");
  const v = V[variant] || V.primary;
  const isOff = disabled || loading;
  const bg = isOff ? "var(--dt-button-disabled-bg)" : `var(${state === "active" ? v.active : state === "hover" ? v.hover : v.bg})`;
  const fg = isOff ? "var(--dt-button-disabled-fg)" : `var(${v.fg})`;
  const bd = isOff ? "var(--dt-button-disabled-border)" : `var(${v.border})`;

  return (
    <Tag
      disabled={Tag === "button" ? isOff : undefined}
      aria-disabled={isOff || undefined}
      aria-busy={loading || undefined}
      onMouseEnter={() => !isOff && setState("hover")}
      onMouseLeave={() => setState("idle")}
      onMouseDown={() => !isOff && setState("active")}
      onMouseUp={() => !isOff && setState("hover")}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: "var(--dt-button-gap)",
        height: `var(--dt-button-height-${size})`,
        padding: `0 var(--dt-button-padding-${size})`,
        fontFamily: "var(--dt-button-font-family)",
        fontSize: `var(--dt-button-font-size-${size})`,
        fontWeight: "var(--dt-button-font-weight)",
        lineHeight: 1,
        color: fg,
        background: bg,
        border: `var(--dt-button-border-width) solid ${bd}`,
        borderRadius: "var(--dt-button-radius)",
        cursor: isOff ? "not-allowed" : "pointer",
        textDecoration: "none",
        transition: "background var(--dt-button-transition), border-color var(--dt-button-transition)",
        width: fullWidth ? "100%" : undefined,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner /> : iconStart}
      {children}
      {iconEnd}
    </Tag>
  );
}

function Spinner() {
  return (
    <svg width="var(--dt-size-icon-sm)" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", animation: "dt-spin 700ms linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
