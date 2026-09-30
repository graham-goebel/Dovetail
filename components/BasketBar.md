# BasketBar

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [BasketBar.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/BasketBar.jsx), [BasketBar.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/BasketBar.d.ts), [BasketBar.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/BasketBar.md).

Live page: https://graham-goebel.github.io/Dovetail/components/BasketBar.html

## Guidelines

The full-width bar at the foot of a phone ordering screen that says how many things are in the basket and what they come to, and opens it: "3 · View basket · $42.50". It renders nothing while the basket is empty.

### Use it when
- A phone menu or store page needs a way into the basket that stays in reach while the reader scrolls.

### Don't use it when
- It is a wide web page with a basket panel beside the menu. Show the `OrderSummary` there.
- It is the checkout's pay button. Use `Button` with the amount in its label.
- It is a header shortcut. Use an `IconButton` with a badge count in its label.

### Example
```jsx
<BasketBar
  count={3}
  total={42.5}
  locale="en-US"
  onClick={() => setScreen("basket")}
  style={{ position: "sticky", bottom: "var(--dt-space-inset-sm)" }}
/>
```

### Placing it
It has no position of its own, so it can sit wherever the screen needs it. Pass `style`:
- In an `AppShell` with a `BottomNav`: pass both in `bottomNav` (`<><BasketBar … /><BottomNav … /></>`), with an inline margin on the bar. The shell's footer is sticky, so the bar floats above the nav while the menu scrolls behind it.
- In any other scrolling column: `position: "sticky"` and a `bottom`.
- Over a whole page: `position: "fixed"` with `insetInline` and `bottom`, and pad the page's end so the last dish is not covered.
Leave it out of the tree, or pass `count={0}`, when the basket is empty.

### Variants
| Prop | What it is for |
|---|---|
| `label` | The words in the middle. "View basket" by default; "View order" or "Checkout" where that is the next step. |
| `itemsLabel` | The count in words, for the accessible name and translations. |
| `disabled` | A store that has just closed: the bar stays, greyed, so the basket is not lost. |

### Composition
Pair it with `MenuBlock` or `MenuItem`s. Your basket holds the count and computes the total; nothing is added up here.

### Tokens
None of its own. It reads Button's primary tokens (`--dt-button-primary-bg`, `-bg-hover`, `-bg-active`, `-fg`, `-border`, `--dt-button-radius`, `--dt-button-transition`, and the disabled pair), so it follows every retheme of `Button`. It is `--dt-size-control-lg` tall with `--dt-elevation-3`. The count sits in a pill tinted from the text colour; the total is a `Price` in the bar's text colour.

### Accessibility
- A native `<button>`, named "View basket, 3 items, $42.50": the visible label comes first, so voice control finds it by what it says.
- The visible count, label and price are hidden from assistive technology, since the name already says them.
- It is at least a touch target tall and keeps the focus ring. Its colour change on press is instant under reduced motion.

### Content
- Label is a verb phrase, sentence case, two or three words.
- The total is what the basket costs before delivery; say so on the basket screen, not in the bar.

## Props

```ts
import * as React from "react";

/** The floating "View basket · 3 items · $42.50" bar at the foot of a phone ordering screen. Renders nothing while the basket is empty. */
export interface BasketBarProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> {
  /** How many items are in the basket. At 0 (or below) the bar renders nothing. */
  count: number;
  /** What the basket comes to, in major units, as your basket computed it. Shown with Price. */
  total: number;
  /** ISO 4217 currency code for the total. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the total. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Opens the basket. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** The bar's words, and the start of its accessible name. @default "View basket" */
  label?: string;
  /** The count in words, for the accessible name. @default (n) => n === 1 ? "1 item" : `${n} items` */
  itemsLabel?: (count: number) => string;
  /** Turns the bar off, for a store that has just closed. */
  disabled?: boolean;
  /**
   * The bar is full width and has no position of its own. Place it with style: position "sticky" and
   * bottom inside a scrolling column, or "fixed" with inset, above a BottomNav.
   */
  style?: React.CSSProperties;
}

export declare function BasketBar(props: BasketBarProps): React.JSX.Element | null;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-button-disabled-bg` | component | `var(--dt-surface-action-disabled)` |
| `--dt-button-disabled-fg` | component | `var(--dt-text-on-action-disabled)` |
| `--dt-button-primary-bg` | component | `var(--dt-surface-action)` |
| `--dt-button-primary-bg-active` | component | `var(--dt-surface-action-active)` |
| `--dt-button-primary-bg-hover` | component | `var(--dt-surface-action-hover)` |
| `--dt-button-primary-border` | component | `var(--dt-color-transparent)` |
| `--dt-button-primary-fg` | component | `var(--dt-text-on-action)` |
| `--dt-button-radius` | component | `var(--dt-radius-pill)` |
| `--dt-button-transition` | component | `var(--dt-motion-micro)` |
| `--dt-price-color` | component | `var(--dt-text-primary)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-3` | semantic | `var(--dt-shadow-raw-3)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-control-lg` | semantic | `var(--dt-dim-12)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-size-touch-target` | semantic | `var(--dt-dim-11)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
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
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
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
```
