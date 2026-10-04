# CartBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [CartBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/CartBlock.jsx), [CartBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/CartBlock.d.ts), [CartBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/CartBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/CartBlock.html

## Guidelines

The cart page: the cart's lines on the left and an `OrderSummary` on the right with a promo field and the checkout action, sticky while a long cart scrolls. On a narrow screen the summary wraps below the lines. With no lines it shows an empty state.

### Use it when
- A full cart or bag page, before checkout.

### Don't use it when
- A mini cart in a `Drawer` or `Sheet`: compose `CartLine size="sm"` and `OrderSummary` there directly.
- The order has been placed. Use read-only `CartLine`s, `OrderSummary` and `OrderStatus`.
- The checkout itself. Use `CheckoutBlock`.

### Example
```jsx
const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

<CartBlock
  lead={`${count} items`}
  action={<Link href="/shop" underline="hover">Continue shopping</Link>}
  lines={lines.map((l) => ({
    id: l.id,
    name: l.name,
    details: [l.colour, l.size],
    price: l.price,
    quantity: l.quantity,
    lineTotal: l.price * l.quantity,
    image: { src: l.image, alt: "" },
    onQuantityChange: (n) => setQuantity(l.id, n),
    onRemove: () => remove(l.id),
  }))}
  summary={{
    lines: [{ label: "Subtotal", amount: subtotal }, { label: "Shipping", amount: 0 }],
    total: { amount: subtotal },
    freeShippingProgress: { current: subtotal, threshold: 75 },
  }}
  promo={{ value: code, onChange: setCode, onApply: applyCode }}
  checkoutAction={<Button size="lg" fullWidth onClick={toCheckout}>Check out</Button>}
/>
```

### Variants
| Prop | What it is for |
| --- | --- |
| `promo` | Adds a `PromoCode` to the summary's footer, above the checkout action. |
| `summary.footer` | Goes after the checkout action: trust copy, payment marks. |
| `emptyState` | When `lines` is empty. Defaults to an `EmptyState`, "Your cart is empty". Give yours a way back to the shop. |
| `action` | Beside the header: "Continue shopping". |

### Composition
A `Section` with a `BlockHeader`, then a `<ul>` of `CartLine`s (each with `divider`, spread from `lines`, so every `CartLine` prop is available; `id` is the key) beside an `OrderSummary` spread from `summary`. The block adds nothing up: every `lineTotal`, the subtotal, discounts, shipping, tax and total are your cart's.

### Tokens
Has none of its own. The header gap is `--dt-layout-module-gap` and the column gap `--dt-layout-inline-section` (at `--dt-layout-scale`), so the Configure sheet's layout reaches it. The list's top rule is `--dt-cart-line-divider`, matching the lines' own dividers; the rest comes from `CartLine`, `OrderSummary` and `PromoCode`.

### Accessibility
- The title is the page's `h1` by default (`level`); the summary's heading is one level below.
- The lines are a list, so the item count is announced.
- Each line's stepper and remove button are named after the item ("Remove Canvas tote").
- When a line is removed, focus is the page's to place: move it to the next line or the heading.

### Content
- Title: "Your cart" (or "Your bag"). Lead: the item count.
- Checkout button: "Check out". Mark estimates as estimates: `kind: "muted"` with a hint.

## Props

```ts
import * as React from "react";
import type { CartLineProps } from "../commerce/CartLine";
import type { OrderSummaryProps } from "../commerce/OrderSummary";
import type { PromoCodeProps } from "../commerce/PromoCode";

/** One line in a CartBlock: CartLine's props, plus a stable id. */
export interface CartBlockLine extends CartLineProps {
  /** A stable, unique id, such as the cart line's id. It is the React key and is not rendered. */
  id: string;
}

/** The cart page: the lines beside an order summary with the checkout action, or an empty state. */
export interface CartBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. @default "Your cart" */
  title?: React.ReactNode;
  /** A line under the title, e.g. "3 items". */
  lead?: React.ReactNode;
  /** Beside the header, at its end: a "Continue shopping" Link. */
  action?: React.ReactNode;
  /** The lines, each spread into a CartLine with a divider. Pass lineTotal, onQuantityChange and onRemove from your cart. */
  lines: CartBlockLine[];
  /**
   * The money breakdown, spread into an OrderSummary to the right of the lines on a wide screen
   * (sticky) and under them on a narrow one. Pass the figures your cart computed: nothing is added
   * up here. Its footer goes after the promo field and the checkout action.
   */
  summary: OrderSummaryProps;
  /** The checkout Button or link, in the summary's footer. */
  checkoutAction?: React.ReactNode;
  /** Adds a PromoCode to the summary's footer, above the checkout action. */
  promo?: PromoCodeProps;
  /** Shown instead of the lines and summary when lines is empty. @default an EmptyState, "Your cart is empty" */
  emptyState?: React.ReactNode;
  /** The title's heading level; the summary's heading is one below. @default 1 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Padding above and below, passed to Section: `sm`, `md`, `lg`, `xl` or `none`, from the module padding steps; `default` is `md` and `compact` is `sm`. @default "default" */
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "default" | "compact";
  /** Padding above, when it differs from `spacing`. */
  spacingTop?: "none" | "sm" | "md" | "lg" | "xl";
  /** Padding below, when it differs from `spacing`. */
  spacingBottom?: "none" | "sm" | "md" | "lg" | "xl";
  /** `full` spans the screen; `inset` sets the band in from the page edges with the container radius. Passed to Section. @default "full" */
  bleed?: "full" | "inset";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function CartBlock(props: CartBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-cart-line-divider` | component | `var(--dt-border-subtle)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-layout-inline-section` | semantic | `var(--dt-dim-12)` |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-layout-scale` | semantic | `1` |
| `--dt-size-media-min` | semantic | `var(--dt-dim-64)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { EmptyState } from "../display/EmptyState.jsx";
import { CartLine } from "../commerce/CartLine.jsx";
import { OrderSummary } from "../commerce/OrderSummary.jsx";
import { PromoCode } from "../commerce/PromoCode.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The summary column's width. The lines take the rest, and when they would
   get narrower than they are wide enough for, the summary wraps below them. */
const SUMMARY = "calc(var(--dt-size-media-min) * 1.375)";
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;

/* The cart page: the lines on the left, the summary on the right (sticky, so
   the checkout button stays in reach down a long cart), wrapping below the
   lines on a narrow screen. The block adds nothing up: lines, their totals
   and the summary's figures are the cart's, passed in as they are. */
export function CartBlock({
  eyebrow,
  title = "Your cart",
  lead,
  action,
  lines = [],
  summary,
  checkoutAction,
  promo,
  emptyState,
  level = 1,
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const empty = lines.length === 0;
  const s = summary || { lines: [], total: { amount: 0 } };
  const footer = (checkoutAction || promo || s.footer) ? (
    <>
      {promo && <PromoCode {...promo} />}
      {checkoutAction}
      {s.footer}
    </>
  ) : undefined;

  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)" }}>
        {(eyebrow || title || lead || action) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", columnGap: "var(--dt-space-inline-lg)", rowGap: "var(--dt-space-stack-sm)" }}>
            {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} level={level} style={{ flex: "1 1 auto", minWidth: 0 }} />}
            {action && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)" }}>{action}</div>}
          </div>
        )}

        {empty ? (
          emptyState || <EmptyState title="Your cart is empty" description="Items you add will show here." />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: scaled("--dt-layout-inline-section") }}>
            <ul
              role="list"
              style={{
                listStyle: "none", margin: 0, padding: 0,
                flex: `999 1 0`, minWidth: `min(100%, calc(${SUMMARY} * 1.25))`,
                borderBlockStart: "var(--dt-border-width-default) solid var(--dt-cart-line-divider)",
              }}
            >
              {lines.map(({ id, ...line }, i) => (
                <li key={id != null ? id : i}>
                  <CartLine divider {...line} />
                </li>
              ))}
            </ul>
            <div
              style={{
                flex: `1 1 ${SUMMARY}`, minWidth: 0,
                position: "sticky", insetBlockStart: "var(--dt-space-stack-lg)",
              }}
            >
              <OrderSummary headingLevel={level + 1 > 6 ? 6 : level + 1} {...s} footer={footer} />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
```
