import React from "react";
import { Field } from "./Field.jsx";

export function Input({ label, hint, error, required, size = "md", id, iconStart, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const auto = React.useId();
  const inputId = id || auto;
  const border = error ? "var(--dt-input-border-error)" : focus ? "var(--dt-input-border-focus)" : hover ? "var(--dt-input-border-hover)" : "var(--dt-input-border)";

  const control = (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {iconStart && (
        <span aria-hidden="true" style={{ position: "absolute", left: "var(--dt-input-padding-x)", display: "flex", color: "var(--dt-text-tertiary)", pointerEvents: "none" }}>
          {iconStart}
        </span>
      )}
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: "100%",
          height: `var(--dt-input-height-${size})`,
          padding: iconStart
            ? "0 var(--dt-input-padding-x) 0 calc(var(--dt-input-padding-x) * 2 + var(--dt-size-icon-md))"
            : "0 var(--dt-input-padding-x)",
          fontFamily: "var(--dt-input-font-family)",
          fontSize: "var(--dt-input-font-size)",
          color: "var(--dt-input-fg)",
          background: rest.disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
          border: `var(--dt-input-border-width) solid ${border}`,
          borderRadius: "var(--dt-input-radius)",
          outline: "none",
          transition: "border-color var(--dt-input-transition)",
          boxSizing: "border-box",
        }}
        {...rest}
      />
    </div>
  );

  if (!label && !hint && !error) return <div style={style}>{control}</div>;
  return <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId} style={style}>{control}</Field>;
}
