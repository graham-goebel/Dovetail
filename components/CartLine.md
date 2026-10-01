# CartLine

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [CartLine.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/CartLine.jsx), [CartLine.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/CartLine.d.ts), [CartLine.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/CartLine.md).

Live page: https://graham-goebel.github.io/Dovetail/components/CartLine.html

## Guidelines

One line in a cart, bag or order confirmation: a thumbnail, the item's name and variant details, a quantity stepper with remove, and the price. It is presentational and controlled: it shows what it is given and calls back, and holds no cart state, adds nothing up and talks to no server.

### Use it when
- Listing what is in a cart page, a cart drawer or a mini bag (`size="sm"` in drawers).
- Showing what was bought on an order confirmation or receipt (`readOnly`).
- Checking out, in the list of items beside the `OrderSummary`.

### Don't use it when
- The item is being browsed, not bought. Use a product card (`Card` with `Price` and `Rating`).
- You need a table of many orders or SKUs with sortable columns. Use `Table`.
- A menu row where the only control is the count. Use `QuantityStepper` beside the dish name.

### Example
```jsx
<CartLine
  name="Linen shirt"
  href="/products/linen-shirt"
  image={{ src: "/img/linen-shirt.jpg", alt: "Linen shirt in sand" }}
  details={["Size M", "Colour Sand"]}
  price={48}
  compareAt={60}
  quantity={line.qty}
  maxQuantity={5}
  lineTotal={line.qty * 48}
  note="Only 2 left"
  onQuantityChange={(qty) => updateLine(line.id, qty)}
  onRemove={() => removeLine(line.id)}
  currency="USD"
  locale="en-US"
  divider
/>

{/* Order confirmation */}
<CartLine name="Linen shirt" details={["Size M"]} price={48} quantity={2} lineTotal={96} readOnly />
```

`lineTotal` is whatever your cart computed (after line discounts, bundles, tax rules); the component never multiplies price by quantity. Prices are in major units, as `Price` takes them.

### Variants
| Prop | What it is for |
|---|---|
| `size="md"` | Default. The cart page: 64px thumbnail, label-lg name, md price. |
| `size="sm"` | Drawers and mini carts: 48px thumbnail, label-md name, sm price. |
| `readOnly` | Order confirmation and receipts: "Qty 2" as text, no stepper, no remove. |
| `lineTotal` | The line's total on the right, and the unit price with "each" under the name. Without it the unit price is on the right. |
| `compareAt` | A sale on the unit price: struck through, and the price in the sale colour (from `Price`). |
| `maxQuantity` | The stepper's upper limit, e.g. the stock left. Pair it with a `note` saying so. |
| `note` | One short line of status: stock, delivery time, a gift message. |
| `onRemove` | A Remove button beside the stepper, and the stepper's minus turns into remove at 1. Without it the line cannot be removed from here. |
| `divider` | A rule under the line and padding above and below it, for stacked lines. |
| `image` without `src` | A small placeholder frame with an image icon, like `Image` with no file. Omit `image` for no thumbnail column at all. |

### Composition
Stack lines in a `<ul>`/`<li>` list (or a `Stack`) with `divider`, inside a cart page's main column or a `Drawer`. It renders `Price` for its prices and `QuantityStepper` for the quantity, so both follow their own tokens and rules. The totals belong in an `OrderSummary` beside or under the list. When the line is too narrow for the price beside the text (a phone, a slim drawer), the price moves under the text, at the inline end, rather than squeezing the name.

### Tokens
Tier 3, in `tokens/component/commerce.css`, colours repeated under `.dark`:
- `--dt-cart-line-divider` (`--dt-border-subtle`): the rule under a line with `divider`.
- `--dt-cart-thumb-bg` (`--dt-surface-sunken`), `--dt-cart-thumb-border` (`--dt-border-subtle`), `--dt-cart-thumb-fg` (`--dt-text-tertiary`): the thumbnail frame and its placeholder icon.
- `--dt-cart-detail-color` (`--dt-text-secondary`): the variant details and "Qty 2".
- `--dt-cart-note-color` (`--dt-text-secondary`): the note.
- `--dt-cart-thumb-radius` (`--dt-radius-media`), `--dt-cart-thumb-size-sm` (`--dt-size-control-lg`), `--dt-cart-thumb-size-md` (`--dt-size-avatar-xl`).

The name reads `--dt-text-primary` and the `--dt-text-label-md|lg-*` roles; details and the note read `--dt-text-body-xs|sm-*`. Prices read the `--dt-price-*` tokens through `Price`, and the stepper the input and ghost button tokens.

### Accessibility
- The stepper is named "Quantity, Linen shirt", its buttons "Decrease quantity, Linen shirt" and "Increase quantity, Linen shirt", and remove "Remove Linen shirt", so a screen-reader user moving through a cart of several lines always knows which line a control belongs to. The visible Remove button has the same name, which begins with its visible text.
- The stepper's keyboard contract is `QuantityStepper`'s: arrows step, Home and End jump, typing commits on Enter or blur, and ArrowDown never removes.
- A read-only quantity is shown as "Qty 2" and read as "Quantity 2".
- The thumbnail's `alt` is read. When the name already says everything the picture does, pass `alt: ""`.
- Detail lines are separated by a middle dot on screen and a comma for screen readers.

### Content
- `name` is the product name as the store lists it, in its own casing. Don't repeat the variant in it; that is what `details` is for.
- `details` are short "Attribute Value" pairs in sentence case: "Size M", "Colour Sand", "Gift wrap".
- `note` is one short sentence fragment, no full stop: "Only 2 left", "Ships in 3 days".

## Props

```ts
import * as React from "react";

/** One line in a cart, bag or order confirmation: thumbnail, name, variant details, quantity and price. */
export interface CartLineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The item's name. Also goes into the stepper's and the remove button's accessible names. */
  name: string;
  /** Link to the product page. The name becomes a link when given. */
  href?: string;
  /** Product thumbnail. With no src, a placeholder frame shows in its place. */
  image?: { src?: string; alt: string };
  /** Variant lines under the name, e.g. ["Size M", "Colour Sand"]. */
  details?: string[];
  /** Unit price in major units (24.5 for $24.50). */
  price: number;
  /** Original unit price. When greater than price, the price shows as a sale. */
  compareAt?: number;
  /** How many of the item are in the cart. */
  quantity: number;
  /** Called with the next quantity from the stepper, already clamped to 1 and maxQuantity. Not needed when readOnly. */
  onQuantityChange?: (next: number) => void;
  /** Removes the line. Shows a Remove button, and turns the stepper's minus into remove at 1. */
  onRemove?: () => void;
  /** ISO 4217 currency code for every price on the line. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the prices. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /**
   * Price for the whole line, as your cart computed it. Shown on the right when given, with the
   * unit price under the name; otherwise the unit price is shown on the right.
   */
  lineTotal?: number;
  /** Highest quantity the stepper allows, e.g. the stock left. No limit when omitted. */
  maxQuantity?: number;
  /** A short line under the details: "Only 2 left", "Ships in 3 days". */
  note?: React.ReactNode;
  /** Order confirmation: the quantity shows as "Qty 2" text and there are no controls. @default false */
  readOnly?: boolean;
  /** sm for drawers and mini carts (48px thumbnail), md for the cart page (64px). @default "md" */
  size?: "sm" | "md";
  /** Draws a rule under the line and pads it, for lines stacked in a list. @default false */
  divider?: boolean;
}

export declare function CartLine(props: CartLineProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-cart-detail-color` | component | `var(--dt-text-secondary)` |
| `--dt-cart-line-divider` | component | `var(--dt-border-subtle)` |
| `--dt-cart-note-color` | component | `var(--dt-text-secondary)` |
| `--dt-cart-thumb-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-cart-thumb-border` | component | `var(--dt-border-subtle)` |
| `--dt-cart-thumb-fg` | component | `var(--dt-text-tertiary)` |
| `--dt-cart-thumb-radius` | component | `var(--dt-radius-media)` |
| `--dt-cart-thumb-size-md` | component | `var(--dt-size-avatar-xl)` |
| `--dt-cart-thumb-size-sm` | component | `var(--dt-size-control-lg)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-size-control-lg` | semantic | `var(--dt-dim-12)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
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
import { QuantityStepper } from "./QuantityStepper.jsx";
import { Button } from "../actions/Button.jsx";
import { Link } from "../actions/Link.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Each size is a thumbnail, the type roles for the name and the lines under
   it, the Price size, and the gap between the columns. */
const SIZES = {
  sm: { thumb: "var(--dt-cart-thumb-size-sm)", name: "label-md", detail: "body-xs", price: "sm", gap: "var(--dt-space-inline-sm)", pad: "var(--dt-space-stack-sm)" },
  md: { thumb: "var(--dt-cart-thumb-size-md)", name: "label-lg", detail: "body-sm", price: "md", gap: "var(--dt-space-inline-md)", pad: "var(--dt-space-stack-md)" },
};

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* Stands in for a product image that has no src yet, like Image's empty
   frame but small enough for a cart line: an icon, no caption. */
function Placeholder() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

export function CartLine({
  name,
  href,
  image,
  details = [],
  price,
  compareAt,
  quantity,
  onQuantityChange,
  onRemove,
  currency = "USD",
  locale,
  lineTotal,
  maxQuantity,
  note,
  readOnly = false,
  size = "md",
  divider = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const hasTotal = typeof lineTotal === "number";
  const money = { currency, locale };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: image ? `${s.thumb} minmax(0, 1fr)` : "minmax(0, 1fr)",
        columnGap: s.gap,
        alignItems: "start",
        paddingBlock: divider ? s.pad : undefined,
        borderBlockEnd: divider ? "var(--dt-border-width-default) solid var(--dt-cart-line-divider)" : undefined,
        ...style,
      }}
      {...rest}
    >
      {image && (
        <span
          style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            width: s.thumb, height: s.thumb, overflow: "hidden", boxSizing: "border-box",
            borderRadius: "var(--dt-cart-thumb-radius)",
            border: "var(--dt-border-width-default) solid var(--dt-cart-thumb-border)",
            background: "var(--dt-cart-thumb-bg)", color: "var(--dt-cart-thumb-fg)",
          }}
        >
          {image.src
            ? <img src={image.src} alt={image.alt || ""} loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
            : <Placeholder />}
        </span>
      )}

      {/* The text and the price share a wrapping row. The text keeps at least
          three large controls' width; when the price no longer fits beside
          it, the price drops under it instead of squeezing the name. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", columnGap: s.gap, rowGap: "var(--dt-space-stack-xs)", minWidth: 0 }}>
        <div style={{ flex: "1 1 calc(var(--dt-size-control-lg) * 3)", display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", minWidth: 0 }}>
          <span style={{ ...role(s.name), color: "var(--dt-text-primary)", overflowWrap: "anywhere" }}>
            {href ? <Link href={href} tone="inherit" underline="hover">{name}</Link> : name}
          </span>
          {details.length > 0 && (
            <span style={{ ...role(s.detail), color: "var(--dt-cart-detail-color)" }}>
              {details.map((d, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  {i > 0 && <VisuallyHidden>, </VisuallyHidden>}
                  <span style={{ whiteSpace: "nowrap" }}>{d}</span>
                </React.Fragment>
              ))}
            </span>
          )}
          {hasTotal && (
            <Price amount={price} compareAt={compareAt} unit="each" size="sm" {...money} />
          )}
          {note && (
            <span style={{ ...role(s.detail), color: "var(--dt-cart-note-color)" }}>{note}</span>
          )}
          {readOnly ? (
            <span style={{ ...role(s.detail), color: "var(--dt-cart-detail-color)", fontVariantNumeric: "tabular-nums" }}>
              <span aria-hidden="true">Qty {quantity}</span>
              <VisuallyHidden>{`Quantity ${quantity}`}</VisuallyHidden>
            </span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)", marginBlockStart: "var(--dt-space-stack-2xs)" }}>
              <QuantityStepper
                size="sm"
                label={`Quantity, ${name}`}
                decreaseLabel={`Decrease quantity, ${name}`}
                increaseLabel={`Increase quantity, ${name}`}
                removeLabel={`Remove ${name}`}
                value={quantity}
                max={maxQuantity}
                onChange={onQuantityChange}
                onRemove={onRemove}
              />
              {onRemove && (
                <Button variant="ghost" size="sm" aria-label={`Remove ${name}`} onClick={onRemove}>
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", textAlign: "end", marginInlineStart: "auto", maxWidth: "100%" }}>
          {hasTotal
            ? <Price amount={lineTotal} size={s.price} style={{ justifyContent: "flex-end" }} {...money} />
            : <Price amount={price} compareAt={compareAt} size={s.price} style={{ justifyContent: "flex-end" }} {...money} />}
        </div>
      </div>
    </div>
  );
}
```
