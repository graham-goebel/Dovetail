import React from "react";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Each size is a type role for the amount and a smaller one for the struck
   compare-at price and the unit beside it. */
const SIZES = {
  sm: { amount: "label-md", aside: "body-xs" },
  md: { amount: "label-lg", aside: "body-sm" },
  lg: { amount: "heading-md", aside: "body-sm" },
};

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* One formatter per currency and locale. An unknown currency code makes
   Intl throw; the amount still shows, with the code after it. */
function useFormat(currency, locale) {
  return React.useMemo(() => {
    try {
      const nf = new Intl.NumberFormat(locale, { style: "currency", currency });
      return (n) => nf.format(n);
    } catch (err) {
      return (n) => `${n} ${currency}`;
    }
  }, [currency, locale]);
}

export function Price({
  amount,
  currency = "USD",
  locale,
  compareAt,
  unit,
  size = "md",
  freeLabel = "Free",
  style,
  ...rest
}) {
  const format = useFormat(currency, locale);
  const s = SIZES[size] || SIZES.md;
  const shown = amount === 0 ? freeLabel : format(amount);
  const onSale = typeof compareAt === "number" && compareAt > amount;
  const was = onSale ? format(compareAt) : null;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex", alignItems: "baseline", flexWrap: "wrap",
        columnGap: "var(--dt-space-inline-xs)",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
      {...rest}
    >
      {onSale && <VisuallyHidden>{`Was ${was}, now ${shown}`}</VisuallyHidden>}
      <span
        aria-hidden={onSale || undefined}
        style={{ ...role(s.amount), color: onSale ? "var(--dt-price-sale-color)" : "var(--dt-price-color)", whiteSpace: "nowrap" }}
      >
        {shown}
      </span>
      {onSale && (
        <s aria-hidden="true" style={{ ...role(s.aside), color: "var(--dt-price-compare-color)", whiteSpace: "nowrap" }}>
          {was}
        </s>
      )}
      {unit && (
        <span style={{ ...role(s.aside), color: "var(--dt-price-unit-color)", whiteSpace: "nowrap" }}>{unit}</span>
      )}
    </span>
  );
}
