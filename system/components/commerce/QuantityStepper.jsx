import React from "react";

const ICONS = {
  minus: ["M5 12h14"],
  plus: ["M5 12h14", "M12 5v14"],
  trash: ["M3 6h18", "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", "M10 11v6", "M14 11v6"],
};

function Icon({ name, size }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: size, height: size }}
    >
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const SIZES = {
  sm: { height: "var(--dt-input-height-sm)", icon: "var(--dt-size-icon-sm)", text: "label-md" },
  md: { height: "var(--dt-input-height-md)", icon: "var(--dt-size-icon-md)", text: "label-lg" },
};

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  max,
  step = 1,
  size = "md",
  disabled = false,
  onRemove,
  decreaseLabel = "Decrease quantity",
  increaseLabel = "Increase quantity",
  removeLabel = "Remove",
  id,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const auto = React.useId();
  const inputId = id || auto;
  const [draft, setDraft] = React.useState(null);
  const [hover, setHover] = React.useState(null);

  const top = typeof max === "number" ? max : Infinity;
  /* Onto the step grid counted from min, then inside the limits. */
  const clamp = (n) => {
    const snapped = min + Math.round((n - min) / step) * step;
    return Math.min(Math.max(snapped, min), top);
  };
  const commit = (n) => {
    setDraft(null);
    const next = clamp(n);
    if (next !== value) onChange(next);
  };
  /* What is typed counts once it is committed; until then a step starts from
     it, so typing 4 and pressing ArrowUp gives 5. */
  const current = () => {
    if (draft == null) return value;
    const typed = Number(draft.replace(/[^\d.-]/g, ""));
    return draft.trim() === "" || Number.isNaN(typed) ? value : typed;
  };

  const atMin = value <= min;
  const atMax = value >= top;
  const removing = !!onRemove && atMin;
  const decOff = disabled || (atMin && !removing);
  const incOff = disabled || atMax;

  const onKeyDown = (e) => {
    if (disabled) return;
    const big = step * 10;
    let next = null;
    if (e.key === "ArrowUp") next = current() + step;
    else if (e.key === "ArrowDown") next = current() - step;
    else if (e.key === "PageUp") next = current() + big;
    else if (e.key === "PageDown") next = current() - big;
    else if (e.key === "Home") next = min;
    else if (e.key === "End" && top !== Infinity) next = top;
    else if (e.key === "Enter") next = current();
    else if (e.key === "Escape" && draft != null) { e.preventDefault(); setDraft(null); return; }
    if (next == null) return;
    e.preventDefault();
    commit(next);
  };

  /* The limit buttons stay focusable (aria-disabled, not disabled), so focus
     is not dropped to the page when a click reaches the limit. */
  const button = (kind, off, onPress, ariaLabel, icon) => (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-disabled={off && !disabled ? true : undefined}
      aria-controls={inputId}
      disabled={disabled}
      onClick={() => { if (!off) onPress(); }}
      onMouseEnter={() => setHover(kind)}
      onMouseLeave={() => setHover(null)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
        width: s.height, height: "100%", padding: 0, border: 0,
        borderRadius: "var(--dt-input-radius)",
        background: hover === kind && !off ? "var(--dt-button-ghost-bg-hover)" : "var(--dt-button-ghost-bg)",
        color: off ? "var(--dt-text-disabled)" : "var(--dt-button-ghost-fg)",
        cursor: off ? "not-allowed" : "pointer",
        transition: "background var(--dt-button-transition), color var(--dt-button-transition)",
      }}
    >
      <Icon name={icon} size={s.icon} />
    </button>
  );

  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "inline-flex", alignItems: "stretch", boxSizing: "border-box",
        height: s.height,
        border: `var(--dt-input-border-width) solid ${disabled ? "var(--dt-input-border-disabled)" : "var(--dt-input-border)"}`,
        borderRadius: "var(--dt-input-radius)",
        background: disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
        ...style,
      }}
      {...rest}
    >
      {removing
        ? button("dec", decOff, onRemove, removeLabel, "trash")
        : button("dec", decOff, () => commit(value - step), decreaseLabel, "minus")}
      <input
        id={inputId}
        type="text"
        role="spinbutton"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={top === Infinity ? undefined : top}
        disabled={disabled}
        value={draft != null ? draft : String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft != null) commit(current()); }}
        onKeyDown={onKeyDown}
        style={{
          width: s.height, minWidth: 0, flex: "none", padding: 0, margin: 0, border: 0,
          background: "transparent", textAlign: "center",
          fontFamily: `var(--dt-text-${s.text}-family)`, fontSize: `var(--dt-text-${s.text}-size)`,
          fontWeight: `var(--dt-text-${s.text}-weight)`, lineHeight: `var(--dt-text-${s.text}-line)`,
          fontVariantNumeric: "tabular-nums",
          color: disabled ? "var(--dt-input-fg-disabled)" : "var(--dt-input-fg)",
          borderRadius: "var(--dt-input-radius)",
        }}
      />
      {button("inc", incOff, () => commit(value + step), increaseLabel, "plus")}
    </div>
  );
}
