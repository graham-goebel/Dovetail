import React from "react";

export function Radio({ label, hint, name, value, checked, defaultChecked, onChange, disabled = false, id, style, ...rest }) {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const auto = React.useId();
  const radioId = id || auto;
  const isOn = checked !== undefined ? checked : internal;

  const handle = (e) => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", opacity: disabled ? 0.6 : 1, ...style }}>
      <input
        type="radio" id={radioId} name={name} value={value} checked={isOn} onChange={handle} disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <label htmlFor={radioId} style={{ display: "flex", gap: "var(--dt-space-inline-xs)", cursor: disabled ? "not-allowed" : "pointer", alignItems: hint ? "flex-start" : "center" }}>
        <span
          aria-hidden="true"
          style={{
            flex: "none", width: 18, height: 18, marginTop: hint ? 2 : 0, boxSizing: "border-box", borderRadius: "50%",
            border: isOn ? "6px solid var(--dt-surface-action)" : "var(--dt-border-width-strong) solid var(--dt-border-strong)",
            background: "var(--dt-input-bg)",
            transition: "border var(--dt-motion-micro)",
          }}
        />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-primary)" }}>{label}</span>
          {hint && <span style={{ fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-secondary)" }}>{hint}</span>}
        </span>
      </label>
    </div>
  );
}
