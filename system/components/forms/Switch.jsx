import React from "react";

export function Switch({ label, hint, checked, defaultChecked = false, onChange, disabled = false, id, labelPosition = "end", style, ...rest }) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const auto = React.useId();
  const switchId = id || auto;
  const isOn = checked !== undefined ? checked : internal;

  const handle = (e) => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  const track = (
    <span
      aria-hidden="true"
      style={{
        flex: "none", position: "relative", width: 40, height: 24, borderRadius: "var(--dt-radius-pill)",
        background: isOn ? "var(--dt-surface-action)" : "var(--dt-border-strong)",
        transition: "background var(--dt-motion-micro)",
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: isOn ? 19 : 3, width: 18, height: 18, borderRadius: "50%",
          background: "var(--dt-color-white)", boxShadow: "var(--dt-elevation-1)",
          transition: "left var(--dt-motion-micro)",
        }}
      />
    </span>
  );

  const text = (
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-primary)" }}>{label}</span>
      {hint && <span style={{ fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-secondary)" }}>{hint}</span>}
    </span>
  );

  return (
    <div style={{ display: "flex", opacity: disabled ? 0.6 : 1, ...style }}>
      <input
        type="checkbox" role="switch" id={switchId} checked={isOn} onChange={handle} disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <label
        htmlFor={switchId}
        style={{
          display: "flex", alignItems: hint ? "flex-start" : "center", gap: "var(--dt-space-inline-sm)",
          cursor: disabled ? "not-allowed" : "pointer",
          justifyContent: labelPosition === "start" ? "space-between" : undefined,
          width: labelPosition === "start" ? "100%" : undefined,
          flexDirection: labelPosition === "start" ? "row-reverse" : "row",
        }}
      >
        {track}
        {text}
      </label>
    </div>
  );
}
