import React from "react";

export function IconButton({ label, variant = "ghost", size = "md", disabled = false, children, style, ...rest }) {
  const [state, setState] = React.useState("idle");
  const solid = variant === "solid";
  const bg = disabled
    ? "var(--dt-button-disabled-bg)"
    : solid
      ? `var(--dt-button-primary-bg${state === "active" ? "-active" : state === "hover" ? "-hover" : ""})`
      : `var(--dt-button-ghost-bg${state === "active" ? "-active" : state === "hover" ? "-hover" : ""})`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseEnter={() => !disabled && setState("hover")}
      onMouseLeave={() => setState("idle")}
      onMouseDown={() => !disabled && setState("active")}
      onMouseUp={() => !disabled && setState("hover")}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: `var(--dt-size-control-${size})`, height: `var(--dt-size-control-${size})`,
        padding: 0, border: 0, borderRadius: "var(--dt-button-radius)",
        background: bg,
        color: disabled ? "var(--dt-button-disabled-fg)" : solid ? "var(--dt-button-primary-fg)" : "var(--dt-button-ghost-fg)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background var(--dt-button-transition)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
