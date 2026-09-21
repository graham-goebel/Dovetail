import React from "react";
import { Field } from "./Field.jsx";

export function Select({ label, hint, error, required, options = [], placeholder, size = "md", id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const auto = React.useId();
  const selectId = id || auto;
  const border = error ? "var(--dt-input-border-error)" : focus ? "var(--dt-input-border-focus)" : "var(--dt-input-border)";

  const control = (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <select
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          height: `var(--dt-input-height-${size})`,
          padding: "0 calc(var(--dt-input-padding-x) * 2 + var(--dt-size-icon-sm)) 0 var(--dt-input-padding-x)",
          fontFamily: "var(--dt-input-font-family)",
          fontSize: "var(--dt-input-font-size)",
          color: "var(--dt-input-fg)",
          background: rest.disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
          border: `var(--dt-input-border-width) solid ${border}`,
          borderRadius: "var(--dt-input-radius)",
          outline: "none",
          appearance: "none",
          cursor: "pointer",
          transition: "border-color var(--dt-input-transition)",
          boxSizing: "border-box",
        }}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
      <svg
        aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: "absolute", right: "var(--dt-input-padding-x)", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", pointerEvents: "none", color: "var(--dt-text-secondary)" }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );

  if (!label && !hint && !error) return <div style={style}>{control}</div>;
  return <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId} style={style}>{control}</Field>;
}
