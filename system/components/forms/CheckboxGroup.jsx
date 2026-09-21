import React from "react";
import { Field } from "./Field.jsx";
import { Checkbox } from "./Checkbox.jsx";

export function CheckboxGroup({ label, hint, error, required = false, options = [], value, defaultValue = [], onChange, disabled = false, orientation = "vertical", name, style, ...rest }) {
  const [internal, setInternal] = React.useState(defaultValue);
  const selected = value !== undefined ? value : internal;

  const toggle = (optValue) => {
    const next = selected.includes(optValue) ? selected.filter(v => v !== optValue) : [...selected, optValue];
    if (value === undefined) setInternal(next);
    onChange && onChange(next);
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} style={style} {...rest}>
      <div role="group" style={{ display: "flex", flexDirection: orientation === "horizontal" ? "row" : "column", flexWrap: "wrap", gap: orientation === "horizontal" ? "var(--dt-space-inline-lg)" : "var(--dt-space-stack-sm)" }}>
        {options.map(opt => (
          <Checkbox
            key={opt.value}
            name={name}
            label={opt.label}
            hint={opt.hint}
            checked={selected.includes(opt.value)}
            disabled={disabled || opt.disabled}
            onChange={() => toggle(opt.value)}
          />
        ))}
      </div>
    </Field>
  );
}
