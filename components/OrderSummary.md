# OrderSummary

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [OrderSummary.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/OrderSummary.jsx), [OrderSummary.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/OrderSummary.d.ts), [OrderSummary.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/OrderSummary.md).

Live page: https://graham-goebel.github.io/Dovetail/components/OrderSummary.html

## Guidelines

The money breakdown of a cart or checkout: subtotal, shipping, tax and discounts as a description list, an emphasised total, an optional free-shipping progress bar, and a footer for the checkout button. It is presentational: it prints the figures it is given and adds nothing up, so your cart or your commerce platform stays the source of truth.

### Use it when
- A cart page or checkout needs the totals beside the items.
- An order confirmation or receipt repeats what was charged.
- A cart drawer shows a compact subtotal with the checkout button (pass fewer `lines`).

### Don't use it when
- You are comparing plans or prices side by side. Use `Table` or plan cards.
- The numbers are not money for one order (analytics, balances). Use `Stat` or `Table`.
- You need the component to calculate tax, shipping or discounts. Compute them in your app or platform and pass the results.

### Example
```jsx
<OrderSummary
  currency="USD"
  locale="en-US"
  lines={[
    { label: "Subtotal", amount: 138 },
    { label: "Shipping", amount: 0, hint: "Standard, 3–5 days" },
    { label: "Discount (SUMMER10)", amount: 13.8, kind: "discount" },
    { label: "Tax", amount: 9.94, kind: "muted", hint: "Estimated" },
  ]}
  total={{ amount: 134.14 }}
  freeShippingProgress={{ current: 138, threshold: 150 }}
  footer={
    <>
      <PromoCode value={code} onChange={setCode} onApply={apply} />
      <Button fullWidth size="lg">Check out</Button>
    </>
  }
/>
```

### Variants
| Prop | What it is for |
|---|---|
| `lines[].kind="default"` | An ordinary figure: subtotal, shipping, tax. |
| `lines[].kind="discount"` | Money off. The amount always shows as a negative ("-$13.80"), in the discount colour. |
| `lines[].kind="muted"` | An estimate or a figure still to come: "Tax, calculated at next step". Label and figure in tertiary text. |
| `lines[].hint` | A smaller line under the label: the shipping method, "Estimated". |
| `amount: 0` | Shows "Free" (from `Price`), e.g. for free shipping. |
| `total` | Emphasised under a rule: label-lg label, `Price` at `size="lg"`. `label` defaults to "Total". |
| `freeShippingProgress` | A `Progress` bar and "You're $12.00 away from free shipping", or "You've got free shipping" (success tone) once `current` reaches `threshold`. The remaining amount is the one subtraction the component does, for the message. |
| `footer` | The checkout `Button`, a `PromoCode`, payment marks, trust copy. |
| `title` / `headingLevel` | The heading, "Order summary" by default, as an `h2` unless you pick another level to fit the page outline. |

### Composition
A panel on its own (it draws its own border and padding). It sits in the side column of a cart or checkout page, under the lines in a `Drawer`, or on an order confirmation. It renders `Price` for every figure, `Progress` for free shipping and `Heading` for its title; put `PromoCode` and a `Button` in `footer`.

### Tokens
Tier 3, in `tokens/component/commerce.css`, colours repeated under `.dark`:
- `--dt-summary-bg` (`--dt-surface-base`), `--dt-summary-border` (`--dt-border-subtle`), `--dt-summary-radius` (`--dt-radius-container`), `--dt-summary-padding` (`--dt-space-inset-lg`): the panel.
- `--dt-summary-divider` (`--dt-border-subtle`): the rule above the total.
- `--dt-summary-label-color` (`--dt-text-secondary`), `--dt-summary-value-color` (`--dt-text-primary`): a line's label and figure.
- `--dt-summary-muted-color` (`--dt-text-tertiary`): a muted line. `--dt-summary-hint-color` (`--dt-text-tertiary`): hints.
- `--dt-summary-discount-color` (`--dt-text-success`): a discount's figure. It deliberately does not reuse `--dt-price-sale-color` (danger text): in a summary a discount is money saved, and red next to a promo field reads as an error. The minus sign carries the meaning, so colour is never the only signal.
- `--dt-summary-total-color` (`--dt-text-primary`): the total's label and figure.

Figures reach `Price` by re-pointing `--dt-price-color` on each figure, so a line's colour changes without changing how it is formatted. Figures are right-aligned with tabular numerals.

### Accessibility
- The panel is a `<section>` named by its heading. The breakdown is a `<dl>`: each label is a `<dt>` and its figure a `<dd>`, so a screen reader pairs them, and the total is the last pair.
- A discount's figure is formatted as a negative ("-$13.80"), so it is read as money off without relying on colour.
- The free-shipping bar is a `role="progressbar"` named by its message, with `aria-valuenow` and `aria-valuemax` in money.
- Figures come from `Intl.NumberFormat` for the `currency` and `locale`; pass `locale` when server rendering so the server and the browser print the same.

### Content
- Line labels are sentence-case nouns: "Subtotal", "Shipping", "Estimated tax". Put a discount's code in its label: "Discount (SUMMER10)".
- `hint` is a short fragment with no full stop: "Standard, 3–5 days", "Calculated at next step".
- Keep the total's label "Total" unless the page needs more: "Total due today", "Total (incl. VAT)".

## Props

```ts
import * as React from "react";

/** One row of the money breakdown. */
export interface OrderSummaryLine {
  /** What the amount is: "Subtotal", "Shipping", "Discount (SUMMER10)". */
  label: string;
  /** Amount in major units. A discount shows as negative whatever its sign; 0 shows as "Free". */
  amount: number;
  /** discount shows the amount as a negative in the discount colour; muted is for estimates and pending figures. @default "default" */
  kind?: "default" | "discount" | "muted";
  /** A smaller line under the label: "Standard, 3–5 days", "Calculated at next step". */
  hint?: string;
}

/** The money breakdown of a cart or checkout: lines, a total, an optional free-shipping bar and a footer for actions. */
export interface OrderSummaryProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  /** The rows above the total, in order. Pass what your cart computed; nothing is added up here. */
  lines: OrderSummaryLine[];
  /** The total, emphasised under a rule. */
  total: {
    /** @default "Total" */
    label?: string;
    /** Amount in major units. */
    amount: number;
  };
  /** ISO 4217 currency code. @default "USD" */
  currency?: string;
  /** BCP 47 locale. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Under the total: the checkout Button, a PromoCode, trust copy. */
  footer?: React.ReactNode;
  /** Heading of the panel, also its accessible name. @default "Order summary" */
  title?: string;
  /** Level of the title's heading element. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Shows a progress bar and "You're $12.00 away from free shipping", or "You've got free shipping" once current reaches threshold. */
  freeShippingProgress?: {
    /** The amount that counts toward the threshold, usually the subtotal. */
    current: number;
    /** The amount that unlocks free shipping. */
    threshold: number;
  };
}

export declare function OrderSummary(props: OrderSummaryProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-price-color` | component | `var(--dt-text-primary)` |
| `--dt-summary-bg` | component | `var(--dt-surface-base)` |
| `--dt-summary-border` | component | `var(--dt-border-subtle)` |
| `--dt-summary-discount-color` | component | `var(--dt-text-success)` |
| `--dt-summary-divider` | component | `var(--dt-border-subtle)` |
| `--dt-summary-hint-color` | component | `var(--dt-text-tertiary)` |
| `--dt-summary-label-color` | component | `var(--dt-text-secondary)` |
| `--dt-summary-muted-color` | component | `var(--dt-text-tertiary)` |
| `--dt-summary-padding` | component | `var(--dt-space-inset-lg)` |
| `--dt-summary-radius` | component | `var(--dt-radius-container)` |
| `--dt-summary-total-color` | component | `var(--dt-text-primary)` |
| `--dt-summary-value-color` | component | `var(--dt-text-primary)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
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
```
