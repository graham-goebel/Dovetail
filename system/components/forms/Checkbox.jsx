import React from "react";

export function Checkbox({ label, hint, checked, defaultChecked = false, indeterminate = false, onChange, disabled = false, id, style, ...rest }) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const ref = React.useRef(null);
  const auto = React.useId();
  const boxId = id || auto;
  const isOn = checked !== undefined ? checked : internal;

  React.useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);

  const handle = (e) => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", opacity: disabled ? 0.6 : 1, ...style }}>
      <input
        ref={ref} type="checkbox" id={boxId} checked={isOn} onChange={handle} disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <label
        htmlFor={boxId}
        style={{ display: "flex", gap: "var(--dt-space-inline-xs)", cursor: disabled ? "not-allowed" : "pointer", alignItems: hint ? "flex-start" : "center" }}
      >
        <span
          aria-hidden="true"
          style={{
            flex: "none", width: 18, height: 18, marginTop: hint ? 2 : 0, boxSizing: "border-box",
            borderRadius: "var(--dt-radius-raw-4)",
            border: `var(--dt-border-width-strong) solid ${isOn || indeterminate ? "var(--dt-surface-action)" : "var(--dt-border-strong)"}`,
            background: isOn || indeterminate ? "var(--dt-surface-action)" : "var(--dt-input-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
          }}
        >
          {indeterminate ? (
            <svg width="10" height="10" viewBox="0 0 24 24" stroke="var(--dt-text-on-action)" strokeWidth="4" strokeLinecap="round"><path d="M5 12h14" /></svg>
          ) : isOn ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dt-text-on-action)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : null}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-primary)" }}>{label}</span>
          {hint && <span style={{ fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-secondary)" }}>{hint}</span>}
        </span>
      </label>
    </div>
  );
}
