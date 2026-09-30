import React from "react";
import { Select } from "../forms/Select.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* A cross over an unavailable swatch, drawn twice so it shows on a black
   swatch and a white one alike: a wide stroke in the surface colour under a
   thin one in the text colour. */
function Cross() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" strokeLinecap="round"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <path d="M5 19 19 5" strokeWidth="4" style={{ stroke: "var(--dt-surface-base)" }} />
      <path d="M5 19 19 5" strokeWidth="1.5" style={{ stroke: "var(--dt-text-secondary)" }} />
    </svg>
  );
}

export function VariantPicker({
  label,
  options = [],
  value,
  onChange,
  variant = "chips",
  showSelected = true,
  placeholder,
  unavailableLabel = "unavailable",
  style,
  ...rest
}) {
  const labelId = React.useId();
  const refs = React.useRef({});
  const [hover, setHover] = React.useState(null);
  const selected = options.find((o) => o.value === value);
  const nameOf = (o) => [o.label, o.note, o.disabled ? unavailableLabel : null].filter(Boolean).join(", ");

  if (variant === "select") {
    return (
      <Select
        label={label}
        value={value == null ? "" : value}
        placeholder={placeholder || `Choose ${label.toLowerCase()}`}
        options={options.map((o) => ({ value: o.value, label: o.disabled || o.note ? `${o.label} (${[o.note, o.disabled ? unavailableLabel : null].filter(Boolean).join(", ")})` : o.label }))}
        onChange={(e) => {
          /* Select renders options as strings, so an unavailable one can be
             picked in the native list; it is ignored here and the controlled
             value snaps back. */
          const o = options.find((x) => x.value === e.target.value);
          if (o && !o.disabled && o.value !== value && onChange) onChange(o.value);
        }}
        style={style}
        {...rest}
      />
    );
  }

  const swatches = variant === "swatches";
  const count = options.length;
  const firstEnabled = options.findIndex((o) => !o.disabled);
  /* One tab stop: the chosen option, or the first available one. */
  const tabStop = selected && !selected.disabled ? selected.value : firstEnabled >= 0 ? options[firstEnabled].value : null;

  const choose = (o) => {
    if (!o || o.disabled) return;
    if (o.value !== value && onChange) onChange(o.value);
    const el = refs.current[o.value];
    if (el) el.focus();
  };

  /* The next available option from i in direction dir, wrapping. */
  const step = (i, dir) => {
    for (let k = 1; k <= count; k++) {
      const j = (((i + dir * k) % count) + count) % count;
      if (!options[j].disabled) return options[j];
    }
    return null;
  };

  const onKeyDown = (e, i) => {
    const rtl = !!(e.currentTarget.closest && e.currentTarget.closest('[dir="rtl"]'));
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === fwd || e.key === "ArrowDown") next = step(i, 1);
    else if (e.key === back || e.key === "ArrowUp") next = step(i, -1);
    else if (e.key === "Home") next = step(-1, 1);
    else if (e.key === "End") next = step(count, -1);
    else return;
    e.preventDefault();
    choose(next);
  };

  const option = (o, i) => {
    const checked = o.value === value;
    const off = !!o.disabled;
    const hovered = hover === o.value && !off && !checked;
    const common = {
      ref: (el) => { refs.current[o.value] = el; },
      type: "button",
      role: "radio",
      "aria-checked": checked,
      "aria-disabled": off || undefined,
      "aria-label": nameOf(o),
      tabIndex: o.value === tabStop ? 0 : -1,
      onClick: () => choose(o),
      onKeyDown: (e) => onKeyDown(e, i),
      onMouseEnter: () => setHover(o.value),
      onMouseLeave: () => setHover(null),
    };

    if (swatches) {
      return (
        <button
          key={o.value}
          {...common}
          title={nameOf(o)}
          style={{
            flex: "none", boxSizing: "border-box",
            width: "var(--dt-size-touch-target)", height: "var(--dt-size-touch-target)",
            padding: "var(--dt-space-inset-2xs)", margin: 0,
            border: `var(--dt-border-width-strong) solid ${checked ? "var(--dt-swatch-ring)" : hovered ? "var(--dt-variant-border)" : "transparent"}`,
            borderRadius: "var(--dt-radius-pill)", background: "transparent",
            cursor: off ? "not-allowed" : "pointer",
            transition: "border-color var(--dt-motion-micro)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "relative", display: "block", boxSizing: "border-box", width: "100%", height: "100%",
              borderRadius: "var(--dt-radius-pill)", overflow: "hidden",
              backgroundColor: o.color || "var(--dt-surface-sunken)",
              backgroundImage: o.image ? `url(${JSON.stringify(o.image)})` : undefined,
              backgroundSize: "cover", backgroundPosition: "center",
              border: "var(--dt-border-width-default) solid var(--dt-swatch-border)",
            }}
          >
            {off && <Cross />}
          </span>
        </button>
      );
    }

    return (
      <button
        key={o.value}
        {...common}
        style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxSizing: "border-box", minWidth: "var(--dt-size-touch-target)", minHeight: "var(--dt-size-touch-target)",
          padding: "var(--dt-space-inset-2xs) var(--dt-space-inset-sm)", margin: 0,
          border: `var(--dt-border-width-default) ${off ? "dashed" : "solid"} ${
            checked ? "var(--dt-variant-selected-border)" : off ? "var(--dt-variant-unavailable-border)" : "var(--dt-variant-border)"
          }`,
          borderRadius: "var(--dt-radius-control)",
          background: checked ? "var(--dt-variant-selected-bg)" : hovered ? "var(--dt-variant-bg-hover)" : "var(--dt-variant-bg)",
          color: checked ? "var(--dt-variant-selected-fg)" : off ? "var(--dt-variant-unavailable-fg)" : "var(--dt-variant-fg)",
          cursor: off ? "not-allowed" : "pointer",
          transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
          ...role("label-md"),
        }}
      >
        <span style={{ textDecoration: off ? "line-through" : "none", whiteSpace: "nowrap" }}>{o.label}</span>
        {o.note && (
          <span style={{ ...role("body-xs"), color: off ? "var(--dt-variant-unavailable-fg)" : "var(--dt-variant-note-color)", whiteSpace: "nowrap" }}>
            {o.note}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)", minWidth: 0, ...style }} {...rest}>
      <span style={{ ...role("label-md"), color: "var(--dt-text-primary)" }}>
        <span id={labelId}>{label}</span>
        {showSelected && selected && (
          <span aria-hidden="true">
            {": "}
            <span style={{ color: "var(--dt-text-secondary)", fontWeight: "var(--dt-text-body-sm-weight)" }}>{selected.label}</span>
          </span>
        )}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        style={{ display: "flex", flexWrap: "wrap", gap: swatches ? "var(--dt-space-inline-2xs)" : "var(--dt-space-inline-xs)" }}
      >
        {options.map(option)}
      </div>
    </div>
  );
}
