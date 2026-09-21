import React from "react";
import { Field } from "./Field.jsx";

export function Slider({ label, hint, error, min = 0, max = 100, step = 1, value, defaultValue, onChange, disabled = false, showValue = true, formatValue, id, style, ...rest }) {
  const auto = React.useId();
  const inputId = id || auto;
  const [internal, setInternal] = React.useState(defaultValue !== undefined ? defaultValue : min);
  const current = value !== undefined ? value : internal;
  const pct = max === min ? 0 : ((current - min) / (max - min)) * 100;

  const handle = (e) => {
    const next = Number(e.target.value);
    if (value === undefined) setInternal(next);
    onChange && onChange(next);
  };

  const shown = formatValue ? formatValue(current) : String(current);

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} style={style} {...rest}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-md)", opacity: disabled ? 0.6 : 1 }}>
        <input
          id={inputId} type="range" min={min} max={max} step={step} value={current}
          onChange={handle} disabled={disabled}
          style={{
            flex: 1, minWidth: 0, height: "var(--dt-dim-5)", appearance: "none", background: "transparent", cursor: disabled ? "not-allowed" : "pointer",
            backgroundImage: `linear-gradient(to right, var(--dt-surface-action) 0 ${pct}%, var(--dt-surface-sunken) ${pct}% 100%)`,
            backgroundSize: "100% var(--dt-dim-hair-2)", backgroundPosition: "center", backgroundRepeat: "no-repeat",
            borderRadius: "var(--dt-radius-pill)",
          }}
        />
        {showValue && (
          <output htmlFor={inputId} style={{ flex: "none", minWidth: "5ch", textAlign: "right", fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-text-secondary)", fontVariantNumeric: "tabular-nums" }}>{shown}</output>
        )}
      </div>
    </Field>
  );
}
