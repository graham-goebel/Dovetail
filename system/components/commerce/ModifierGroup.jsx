import React from "react";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";
import { Price } from "./Price.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* The rule for a multiple-choice group, in words: "Choose up to 3". */
function ruleFor(mode, min, max) {
  if (mode !== "multiple") return null;
  const hasMin = typeof min === "number" && min > 0;
  const hasMax = typeof max === "number";
  if (hasMin && hasMax) return min === max ? `Choose ${max}` : `Choose ${min} to ${max}`;
  if (hasMax) return `Choose up to ${max}`;
  if (hasMin) return `Choose at least ${min}`;
  return null;
}

const defaultLimitLabel = (max) => `, limit of ${max} reached`;

/* The drawn control. The real input sits over it, transparent, so the
   browser keeps the keyboard behaviour and the label click. */
function Mark({ single, on, off, focused }) {
  const size = "var(--dt-modifier-control-size)";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        boxSizing: "border-box", width: size, height: size,
        borderRadius: single ? "var(--dt-radius-pill)" : "calc(var(--dt-radius-control) / 2)",
        border: single && on
          ? `calc(${size} * 0.3) solid ${off ? "var(--dt-border-disabled)" : "var(--dt-modifier-control-accent)"}`
          : `var(--dt-border-width-strong) solid ${off ? "var(--dt-border-disabled)" : on ? "var(--dt-modifier-control-accent)" : "var(--dt-modifier-control-border)"}`,
        background: off
          ? "var(--dt-surface-disabled)"
          : !single && on ? "var(--dt-modifier-control-accent)" : "var(--dt-modifier-control-bg)",
        color: "var(--dt-modifier-control-mark)",
        outline: focused ? "var(--dt-focus-ring-width) solid var(--dt-focus-ring-color)" : "none",
        outlineOffset: "var(--dt-focus-ring-offset)",
        transition: "background var(--dt-motion-micro), border var(--dt-motion-micro)",
      }}
    >
      {!single && on && (
        <svg
          viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ display: "block", width: "var(--dt-size-icon-xs)", height: "var(--dt-size-icon-xs)" }}
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

export function ModifierGroup({
  title,
  options = [],
  mode = "single",
  value = [],
  onChange,
  required = false,
  min,
  max,
  error,
  hint,
  currency = "USD",
  locale,
  requiredLabel = "Required",
  limitLabel = defaultLimitLabel,
  style,
  ...rest
}) {
  const uid = React.useId();
  const name = `${uid}-choice`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const [focused, setFocused] = React.useState(null);
  const single = mode !== "multiple";
  const chosen = Array.isArray(value) ? value : [];
  const atMax = !single && typeof max === "number" && chosen.length >= max;
  const rule = hint || ruleFor(mode, min, max);
  const describedBy = [rule && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  const pick = (id) => {
    if (!onChange) return;
    if (single) {
      if (chosen[0] !== id || chosen.length !== 1) onChange([id]);
      return;
    }
    if (chosen.includes(id)) onChange(chosen.filter((v) => v !== id));
    else if (!atMax) onChange([...chosen, id]);
  };

  const onFocus = (e, id) => {
    let visible = true;
    try { visible = e.currentTarget.matches(":focus-visible"); } catch (err) { visible = true; }
    setFocused(visible ? id : null);
  };

  return (
    <fieldset
      role={single ? "radiogroup" : undefined}
      aria-required={single && required ? true : undefined}
      aria-invalid={single && error ? true : undefined}
      aria-describedby={describedBy}
      style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: "flex", flexDirection: "column", ...style }}
      {...rest}
    >
      <legend style={{ padding: 0, width: "100%", float: "left" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)" }}>
          <span style={{ ...role("heading-xs"), color: "var(--dt-text-primary)", minWidth: 0, overflowWrap: "anywhere" }}>{title}</span>
          {required && (
            <span
              style={{
                ...role("label-sm"), flex: "none", whiteSpace: "nowrap",
                padding: "0 var(--dt-space-inset-xs)", borderRadius: "var(--dt-radius-pill)",
                background: error ? "var(--dt-modifier-error-pill-bg)" : "var(--dt-modifier-pill-bg)",
                color: error ? "var(--dt-modifier-error-color)" : "var(--dt-modifier-pill-fg)",
              }}
            >
              {requiredLabel}
            </span>
          )}
        </span>
      </legend>
      {/* The float above takes the legend out of the fieldset's border
          layout, so it lays out like any other block; this clears it. */}
      <span aria-hidden="true" style={{ display: "block", clear: "both" }} />
      {rule && (
        <p id={hintId} style={{ ...role("body-sm"), margin: "var(--dt-space-stack-2xs) 0 0", color: "var(--dt-modifier-hint-color)" }}>{rule}</p>
      )}
      {error && (
        <p id={errorId} role="alert" style={{ ...role("body-sm"), margin: "var(--dt-space-stack-2xs) 0 0", color: "var(--dt-modifier-error-color)" }}>{error}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", marginTop: "var(--dt-space-stack-2xs)" }}>
        {options.map((opt, i) => {
          const on = single ? chosen[0] === opt.id : chosen.includes(opt.id);
          const limited = !single && atMax && !on && !opt.disabled;
          const off = !!opt.disabled || limited;
          const delta = typeof opt.price === "number" && opt.price !== 0 ? opt.price : null;
          const inputId = `${uid}-${i}`;
          return (
            <label
              key={opt.id}
              htmlFor={inputId}
              style={{
                display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
                minHeight: "var(--dt-modifier-row-min-height)", boxSizing: "border-box",
                padding: "var(--dt-space-inset-xs) 0",
                borderTop: i > 0 ? "var(--dt-border-width-default) solid var(--dt-modifier-divider)" : undefined,
                cursor: off ? "not-allowed" : "pointer",
                color: off ? "var(--dt-text-disabled)" : "var(--dt-text-primary)",
              }}
            >
              <span style={{ position: "relative", flex: "none", display: "flex" }}>
                <input
                  id={inputId}
                  type={single ? "radio" : "checkbox"}
                  name={name}
                  value={opt.id}
                  checked={on}
                  disabled={off}
                  aria-invalid={!single && error ? true : undefined}
                  onChange={() => pick(opt.id)}
                  onFocus={(e) => onFocus(e, opt.id)}
                  onBlur={() => setFocused(null)}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "inherit" }}
                />
                <Mark single={single} on={on} off={off} focused={focused === opt.id} />
              </span>
              <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ ...role("body-md"), overflowWrap: "anywhere" }}>
                  {opt.label}
                  {limited && <VisuallyHidden>{limitLabel(max)}</VisuallyHidden>}
                </span>
                {opt.note && (
                  <span style={{ ...role("body-xs"), color: off ? "var(--dt-text-disabled)" : "var(--dt-text-secondary)" }}>{opt.note}</span>
                )}
              </span>
              {delta != null && (
                <span
                  style={{
                    flex: "none", display: "inline-flex", alignItems: "baseline",
                    ...role("label-md"),
                    color: off ? "var(--dt-text-disabled)" : "var(--dt-modifier-delta-color)",
                    "--dt-price-color": off ? "var(--dt-text-disabled)" : "var(--dt-modifier-delta-color)",
                  }}
                >
                  {delta > 0 ? "+" : "−"}
                  <Price amount={Math.abs(delta)} currency={currency} locale={locale} size="sm" />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
