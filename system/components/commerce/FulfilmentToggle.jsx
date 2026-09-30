import React from "react";

const DEFAULT_OPTIONS = [
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
];

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* A segmented control with radio semantics: one tab stop, on the chosen
   segment, and arrow keys that move and choose together, the way a native
   radio group behaves. */
export function FulfilmentToggle({
  value,
  onChange,
  label,
  options = DEFAULT_OPTIONS,
  fullWidth = true,
  disabled = false,
  style,
  ...rest
}) {
  const refs = React.useRef([]);
  const [hover, setHover] = React.useState(null);
  const index = options.findIndex((o) => o.value === value);
  const tabStop = index >= 0 ? index : 0;

  const choose = (i) => {
    const opt = options[i];
    if (!opt || disabled) return;
    if (opt.value !== value) onChange && onChange(opt.value);
    const el = refs.current[i];
    if (el) el.focus();
  };

  const onKeyDown = (e, i) => {
    const rtl = !!(e.currentTarget.closest && e.currentTarget.closest('[dir="rtl"]'));
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const n = options.length;
    let next = null;
    if (e.key === fwd || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === back || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === " " || e.key === "Enter") next = i;
    if (next == null) return;
    e.preventDefault();
    choose(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      style={{
        display: fullWidth ? "grid" : "inline-grid",
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        gap: "var(--dt-fulfilment-inset)",
        boxSizing: "border-box",
        width: fullWidth ? "100%" : undefined,
        padding: "var(--dt-fulfilment-inset)",
        borderRadius: "var(--dt-fulfilment-radius)",
        background: "var(--dt-fulfilment-track-bg)",
        ...style,
      }}
      {...rest}
    >
      {options.map((opt, i) => {
        const on = i === index;
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => choose(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              appearance: "none", border: 0, margin: 0, minWidth: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 0,
              minHeight: "var(--dt-size-touch-target)",
              padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm)",
              borderRadius: "var(--dt-fulfilment-thumb-radius)",
              background: on ? "var(--dt-fulfilment-thumb-bg)" : "transparent",
              boxShadow: on ? "var(--dt-fulfilment-thumb-shadow)" : "none",
              color: disabled
                ? "var(--dt-text-disabled)"
                : on || hover === i ? "var(--dt-fulfilment-fg-selected)" : "var(--dt-fulfilment-fg)",
              cursor: disabled ? "not-allowed" : "pointer",
              textAlign: "center",
              transition: "background var(--dt-motion-micro), box-shadow var(--dt-motion-micro), color var(--dt-motion-micro)",
            }}
          >
            <span style={{ ...role("label-md"), fontWeight: on ? "var(--dt-font-weight-semibold)" : "var(--dt-text-label-md-weight)",maxWidth: "100%", overflowWrap: "anywhere" }}>
              {opt.label}
            </span>
            {opt.detail && (
              <span
                style={{
                  ...role("body-xs"), maxWidth: "100%", overflowWrap: "anywhere",
                  color: disabled
                    ? "var(--dt-text-disabled)"
                    : on ? "var(--dt-fulfilment-detail-color-selected)" : "var(--dt-fulfilment-detail-color)",
                }}
              >
                {opt.detail}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
