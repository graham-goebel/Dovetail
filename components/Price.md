# Price

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [Price.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/Price.jsx), [Price.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/Price.d.ts), [Price.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/Price.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Price.html

## Guidelines

An amount of money, formatted for its currency and locale by `Intl.NumberFormat`, with an optional compare-at price for a sale and a unit such as "/ month".

### Use it when
- Showing what something costs: a product card, a cart line, a menu item, a plan, an order total.
- A sale needs the original price beside the new one (`compareAt`).
- The price is per something: `unit="/ month"`, `"each"`, `"/ kg"`.

### Don't use it when
- The number is not money. Use `Text` with `numeric` for counts and measurements.
- You need a range ("$20–$40") or "from $20". Compose two `Price`s, or put "From" in `Text` before one.

### Example
```jsx
<Price amount={24.5} compareAt={30} />
<Price amount={12} unit="/ month" size="lg" />
<Price amount={1290} currency="EUR" locale="de-DE" />
<Price amount={1200} currency="JPY" locale="ja-JP" />
<Price amount={0} freeLabel="Free delivery" size="sm" />
```

`amount` is in major units. Prices stored in minor units must be converted first: `cents / 100` for USD, EUR or GBP; a zero-decimal currency such as JPY needs no conversion.

### Variants
| Prop | What it is for |
|---|---|
| `size="sm"` | Cart lines, menu rows, dense lists. Label type at the small size. |
| `size="md"` | Default. Product cards and summaries. |
| `size="lg"` | The price on a product page or a plan card, at heading size. |
| `compareAt` | A sale: when greater than `amount`, it shows struck through after the amount, and the amount turns the sale colour. Equal or lower is ignored. |
| `unit` | What the price is per, after it, smaller and secondary. |
| `freeLabel` | Replaces a formatted zero ("$0.00"), "Free" by default. |

The locale defaults to the runtime's. Pass `locale` when server rendering so the server and the browser print the same string and hydration matches. An unknown currency code falls back to the number followed by the code.

### Composition
Inline: it renders a `<span>`, so it sits in a line of text, a card's footer or a table cell. It wraps between the amount, the compare-at price and the unit when space is short, never inside one of them. Other commerce components (product cards, cart lines, menus) render their prices with it.

### Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-price-color` (`--dt-text-primary`): the amount.
- `--dt-price-sale-color` (`--dt-text-danger`): the amount when it is on sale.
- `--dt-price-compare-color` (`--dt-text-tertiary`): the struck compare-at price.
- `--dt-price-unit-color` (`--dt-text-secondary`): the unit.

Type comes from the semantic roles: `--dt-text-label-md-*`, `--dt-text-label-lg-*` or `--dt-text-heading-md-*` for the amount, and `--dt-text-body-xs-*` or `--dt-text-body-sm-*` for the compare-at price and the unit. Figures are tabular, so prices in a column line up.

### Accessibility
- On a sale, the visible amount and the struck price are hidden from assistive technology and a visually hidden span reads "Was $30.00, now $24.50", using the same formatted strings the page shows. A strikethrough alone is not announced by most screen readers, so without this the two prices would read as one confusing number.
- The sale colour is never the only signal: the struck compare-at price carries it too.
- The unit is ordinary text and is read after the price.

### Content
- `unit` is lowercase and short: "/ month", "each", "/ kg", "per person". Put a space after the slash.
- `freeLabel` is sentence case: "Free", "Free delivery", "Included".
- Don't add the currency code yourself; `Intl` places the symbol where the locale expects it (`12,90 €` in German, `€12.90` in Irish English).

## Props

```ts
import * as React from "react";

/** An amount of money, formatted for its currency and locale, with an optional compare-at price and unit. */
export interface PriceProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * The amount in major units: 24.5 for $24.50, 1200 for ¥1,200. Prices stored in
   * minor units (cents) must be converted first: divide by 100 for USD or EUR, and
   * leave a zero-decimal currency such as JPY as it is.
   */
  amount: number;
  /** ISO 4217 currency code, passed to Intl.NumberFormat. @default "USD" */
  currency?: string;
  /**
   * BCP 47 locale for the format, e.g. "de-DE" or "ja-JP". Defaults to the runtime's
   * locale; set it when server rendering so the server and the browser print the same.
   */
  locale?: string;
  /**
   * The original price, in the same units as amount. When it is greater than amount it
   * shows struck through after the amount, and the amount takes the sale colour.
   */
  compareAt?: number;
  /** What the price is per, shown after it, smaller and secondary: "/ month", "each", "/ kg". */
  unit?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Shown instead of a formatted zero when amount is 0. @default "Free" */
  freeLabel?: string;
}

export declare function Price(props: PriceProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-price-color` | component | `var(--dt-text-primary)` |
| `--dt-price-compare-color` | component | `var(--dt-text-tertiary)` |
| `--dt-price-sale-color` | component | `var(--dt-text-danger)` |
| `--dt-price-unit-color` | component | `var(--dt-text-secondary)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-artboard-body-line` | semantic | `calc(var(--dt-line-height-md) * 2.35)` |
| `--dt-text-artboard-body-size` | semantic | `calc(var(--dt-font-size-md) * 2.5)` |
| `--dt-text-artboard-display-family` | semantic | `var(--dt-text-display-lg-family)` |
| `--dt-text-artboard-display-line` | semantic | `calc(var(--dt-line-height-7xl) * 2.55)` |
| `--dt-text-artboard-display-size` | semantic | `calc(var(--dt-font-size-7xl) * 2.8)` |
| `--dt-text-artboard-display-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-artboard-display-weight` | semantic | `var(--dt-text-display-lg-weight)` |
| `--dt-text-artboard-meta-size` | semantic | `calc(var(--dt-font-size-sm) * 2.2)` |
| `--dt-text-artboard-meta-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-artboard-title-line` | semantic | `calc(var(--dt-line-height-7xl) * 1.7)` |
| `--dt-text-artboard-title-size` | semantic | `calc(var(--dt-font-size-7xl) * 1.75)` |
| `--dt-text-body-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-lg-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-lg-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-body-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-brand-secondary` | semantic | `var(--dt-color-secondary-700)` |
| `--dt-text-code-md-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-code-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-code-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-code-sm-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-code-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-code-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-display-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-lg-line` | semantic | `var(--dt-line-height-7xl)` |
| `--dt-text-display-lg-size` | semantic | `var(--dt-font-size-7xl)` |
| `--dt-text-display-lg-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-md-line` | semantic | `var(--dt-line-height-6xl)` |
| `--dt-text-display-md-size` | semantic | `var(--dt-font-size-6xl)` |
| `--dt-text-display-md-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xl-line` | semantic | `var(--dt-line-height-4xl)` |
| `--dt-text-heading-xl-size` | semantic | `var(--dt-font-size-4xl)` |
| `--dt-text-heading-xl-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-heading-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-link-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-link-brand-hover` | semantic | `var(--dt-color-primary-800)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-link-visited` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-on-action-ghost` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-secondary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-secondary-muted` | semantic | `var(--dt-color-secondary-900)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-info` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-on-scrim-strong` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-selected-brand` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-text-wordmark` | semantic | `var(--dt-text-primary)` |

## Source

```jsx
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
```
