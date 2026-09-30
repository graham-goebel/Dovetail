import React from "react";
import { Price } from "./Price.jsx";
import { Progress } from "../feedback/Progress.jsx";
import { Heading } from "../typography/Heading.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* Label and figure colours per kind. A figure's colour reaches Price by
   re-pointing --dt-price-color on its wrapper, so Price keeps its own
   formatting and only the colour changes. */
const KINDS = {
  default: { label: "var(--dt-summary-label-color)", value: "var(--dt-summary-value-color)" },
  discount: { label: "var(--dt-summary-label-color)", value: "var(--dt-summary-discount-color)" },
  muted: { label: "var(--dt-summary-muted-color)", value: "var(--dt-summary-muted-color)" },
};

/* The amount in the free-shipping message, formatted the way Price formats. */
function useMoney(currency, locale) {
  return React.useMemo(() => {
    try {
      const nf = new Intl.NumberFormat(locale, { style: "currency", currency });
      return (n) => nf.format(n);
    } catch (err) {
      return (n) => `${n} ${currency}`;
    }
  }, [currency, locale]);
}

export function OrderSummary({
  lines = [],
  total,
  currency = "USD",
  locale,
  footer,
  title = "Order summary",
  headingLevel = 2,
  freeShippingProgress,
  style,
  ...rest
}) {
  const titleId = React.useId();
  const money = useMoney(currency, locale);
  const fs = freeShippingProgress;
  const reached = fs ? fs.current >= fs.threshold : false;
  const message = fs
    ? reached
      ? "You've got free shipping"
      : `You're ${money(Math.max(0, fs.threshold - fs.current))} away from free shipping`
    : null;

  const row = { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--dt-space-inline-md)" };
  const dd = { margin: 0, flex: "none", textAlign: "end", fontVariantNumeric: "tabular-nums" };

  return (
    <section
      aria-labelledby={titleId}
      style={{
        display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)",
        padding: "var(--dt-summary-padding)", boxSizing: "border-box", minWidth: 0,
        background: "var(--dt-summary-bg)", color: "var(--dt-text-primary)",
        border: "var(--dt-border-width-default) solid var(--dt-summary-border)",
        borderRadius: "var(--dt-summary-radius)",
        ...style,
      }}
      {...rest}
    >
      <Heading id={titleId} level={headingLevel} size="heading-xs" tone="primary">{title}</Heading>

      {fs && (
        <Progress
          size="sm"
          tone={reached ? "success" : "primary"}
          value={Math.min(Math.max(fs.current, 0), fs.threshold)}
          max={fs.threshold}
          label={message}
        />
      )}

      <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)" }}>
        {lines.map((line, i) => {
          const kind = KINDS[line.kind] || KINDS.default;
          const discount = line.kind === "discount";
          return (
            <div key={line.label + i} style={row}>
              <dt style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ ...role("body-sm"), color: kind.label }}>{line.label}</span>
                {line.hint && <span style={{ ...role("body-xs"), color: "var(--dt-summary-hint-color)" }}>{line.hint}</span>}
              </dt>
              <dd style={dd}>
                <Price
                  amount={discount ? -Math.abs(line.amount) : line.amount}
                  size="sm"
                  currency={currency}
                  locale={locale}
                  style={{ "--dt-price-color": kind.value }}
                />
              </dd>
            </div>
          );
        })}
        <div
          style={{
            ...row,
            paddingBlockStart: "var(--dt-space-stack-sm)",
            marginBlockStart: lines.length ? "var(--dt-space-stack-2xs)" : 0,
            borderBlockStart: lines.length ? "var(--dt-border-width-default) solid var(--dt-summary-divider)" : undefined,
          }}
        >
          <dt style={{ ...role("label-lg"), color: "var(--dt-summary-total-color)" }}>{total.label || "Total"}</dt>
          <dd style={dd}>
            <Price
              amount={total.amount}
              size="lg"
              currency={currency}
              locale={locale}
              style={{ "--dt-price-color": "var(--dt-summary-total-color)" }}
            />
          </dd>
        </div>
      </dl>

      {footer && <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)" }}>{footer}</div>}
    </section>
  );
}
