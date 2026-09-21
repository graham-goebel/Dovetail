import React from "react";
import { Field } from "./Field.jsx";
import { Radio } from "./Radio.jsx";

export function RadioGroup({ label, hint, error, required = false, options = [], value, defaultValue, onChange, disabled = false, orientation = "vertical", name, style, ...rest }) {
  const auto = React.useId();
  const groupName = name || auto;
  const [internal, setInternal] = React.useState(defaultValue);
  const selected = value !== undefined ? value : internal;

  const pick = (optValue) => {
    if (value === undefined) setInternal(optValue);
    onChange && onChange(optValue);
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} style={style} {...rest}>
      <div role="radiogroup" style={{ display: "flex", flexDirection: orientation === "horizontal" ? "row" : "column", flexWrap: "wrap", gap: orientation === "horizontal" ? "var(--dt-space-inline-lg)" : "var(--dt-space-stack-sm)" }}>
        {options.map(opt => (
          <Radio
            key={opt.value}
            name={groupName}
            value={opt.value}
            label={opt.label}
            hint={opt.hint}
            checked={selected === opt.value}
            disabled={disabled || opt.disabled}
            onChange={() => pick(opt.value)}
          />
        ))}
      </div>
    </Field>
  );
}
