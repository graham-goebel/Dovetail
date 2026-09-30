import React from "react";
import { Price } from "./Price.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

const defaultItemsLabel = (n) => (n === 1 ? "1 item" : `${n} items`);

function format(amount, currency, locale) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch (err) {
    return String(amount);
  }
}

/* The bar at the foot of a phone ordering screen: how many things are in the
   basket, what they come to, and the way in. It renders nothing while the
   basket is empty. Where it sits (sticky, fixed, in a footer) is the page's
   choice, through style. */
export function BasketBar({
  count,
  total,
  currency = "USD",
  locale,
  onClick,
  label = "View basket",
  itemsLabel = defaultItemsLabel,
  disabled = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [down, setDown] = React.useState(false);
  if (!(count > 0)) return null;

  const bg = disabled
    ? "var(--dt-button-disabled-bg)"
    : down
      ? "var(--dt-button-primary-bg-active)"
      : hover
        ? "var(--dt-button-primary-bg-hover)"
        : "var(--dt-button-primary-bg)";
  const fg = disabled ? "var(--dt-button-disabled-fg)" : "var(--dt-button-primary-fg)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}, ${itemsLabel(count)}, ${format(total, currency, locale)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setDown(false); }}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      style={{
        appearance: "none", boxSizing: "border-box", margin: 0,
        display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
        width: "100%", minHeight: "max(var(--dt-size-control-lg), var(--dt-size-touch-target))",
        paddingBlock: 0, paddingInlineStart: "var(--dt-space-inset-xs)",
        paddingInlineEnd: "var(--dt-space-inset-md)",
        border: "var(--dt-border-width-default) solid var(--dt-button-primary-border)",
        borderRadius: "var(--dt-button-radius)",
        background: bg, color: fg,
        boxShadow: "var(--dt-elevation-3)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "start",
        transition: "background var(--dt-button-transition)",
        "--dt-price-color": "currentColor",
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden="true"
        style={{
          ...role("label-md"), flex: "none", boxSizing: "border-box",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: "var(--dt-size-control-sm)", height: "var(--dt-size-control-sm)",
          padding: "0 var(--dt-space-inset-xs)", borderRadius: "var(--dt-radius-pill)",
          background: "color-mix(in oklab, currentColor 18%, transparent)",
          fontWeight: "var(--dt-font-weight-semibold)", fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </span>
      <span aria-hidden="true" style={{ ...role("label-lg"), flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "var(--dt-font-weight-semibold)" }}>
        {label}
      </span>
      <span aria-hidden="true" style={{ flex: "none", fontWeight: "var(--dt-font-weight-semibold)" }}>
        <Price amount={total} currency={currency} locale={locale} size="md" />
      </span>
    </button>
  );
}
