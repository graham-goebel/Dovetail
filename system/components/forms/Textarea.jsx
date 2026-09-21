import React from "react";
import { Field } from "./Field.jsx";

export function Textarea({ label, hint, error, required, rows = 4, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const auto = React.useId();
  const areaId = id || auto;
  const border = error ? "var(--dt-input-border-error)" : focus ? "var(--dt-input-border-focus)" : "var(--dt-input-border)";

  const control = (
    <textarea
      id={areaId}
      rows={rows}
      required={required}
      aria-invalid={error ? true : undefined}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: "100%",
        padding: "var(--dt-space-inset-xs) var(--dt-input-padding-x)",
        fontFamily: "var(--dt-input-font-family)",
        fontSize: "var(--dt-input-font-size)",
        lineHeight: "var(--dt-line-height-sm)",
        color: "var(--dt-input-fg)",
        background: rest.disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
        border: `var(--dt-input-border-width) solid ${border}`,
        borderRadius: "var(--dt-input-radius)",
        outline: "none",
        resize: "vertical",
        transition: "border-color var(--dt-input-transition)",
        boxSizing: "border-box",
      }}
      {...rest}
    />
  );

  if (!label && !hint && !error) return <div style={style}>{control}</div>;
  return <Field label={label} hint={hint} error={error} required={required} htmlFor={areaId} style={style}>{control}</Field>;
}
