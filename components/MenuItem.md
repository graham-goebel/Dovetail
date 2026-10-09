# MenuItem

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [MenuItem.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/MenuItem.jsx), [MenuItem.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/MenuItem.d.ts), [MenuItem.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/MenuItem.md).

Live page: https://graham-goebel.github.io/Dovetail/components/MenuItem.html

## Guidelines

One dish on a menu: the name, a two-line description, the price, dietary tags and a thumbnail, with an add button, a basket count and an optional stepper.

### Use it when
- Listing dishes or products in a `MenuSection` on a food-ordering page.
- A dish needs a quick add and a way to open its details from the same row.

### Don't use it when
- It is a retail product with variants and a product page. Use a product card, or `Card` with `Price`.
- It is a line in the basket or at checkout. Use a cart line with `QuantityStepper`.

### Example
```jsx
<MenuItem
  name="Pad thai"
  description="Rice noodles wok-fried with tamarind, egg, tofu, bean sprouts and crushed peanuts."
  price={12.5}
  image={{ src: padThai, alt: "Pad thai on a white plate" }}
  tags={[{ label: "Popular", kind: "popular" }, { label: "Contains nuts" }]}
  quantity={basket["pad-thai"] || 0}
  onSelect={() => openDetails("pad-thai")}
  onAdd={() => openOptions("pad-thai")}
  onQuantityChange={(n) => setQuantity("pad-thai", n)}
  locale="en-US"
/>
```

### Variants
| Prop | What it is for |
|---|---|
| `image` | A square thumbnail on the right at `--dt-menu-thumb-size`, its space reserved. The add button sits on its corner. |
| `tags` | Small badges. `kind` picks the colour: `vegetarian`, `vegan`, `spicy`, `gluten-free`, `popular`, `new`, or `default`. Spicy gets a flame and popular a thumbs-up. The label always shows. |
| `compareAt` | A sale: the old price struck through, through `Price`. |
| `soldOut` | Dims the text and picture, shows "Sold out", and removes the add button and stepper. The row can still open details. |
| `quantity` | Above 0, a "2 in basket" badge. With `onQuantityChange`, also a small `QuantityStepper` whose minus becomes remove at 1 and calls `onQuantityChange(0)`. |
| `onAdd` | Shows the add button, named `Add ${name}`. Usually opens a `Sheet` of `ModifierGroup`s; for a dish with no options, add it straight away. |
| `onSelect` | Makes the whole row open the dish's details. |
| `layout` | `list` (a row, the default) or `grid` (a card). `MenuSection` sets it. |

### Composition
Lives in a `MenuSection`, which sets its `layout` and `headingLevel`. Renders `Price` for the price, `Badge` for the tags and counts, `IconButton` for add and `QuantityStepper` in the basket. The details or options it opens are yours: typically a `Sheet` with `ModifierGroup`s and an "Add to basket · $14.50" `Button`.

### Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- `--dt-menu-item-gap` (`--dt-space-inline-md`), `--dt-menu-item-padding` (`--dt-space-inset-md`).
- `--dt-menu-thumb-size` (2 × `--dt-size-control-lg`), `--dt-menu-thumb-radius` (`--dt-radius-media`), `--dt-menu-thumb-bg` (`--dt-surface-sunken`).
- `--dt-menu-item-description-color` (`--dt-text-secondary`), `--dt-menu-item-soldout-color` (`--dt-text-disabled`).
- Grid cards: `--dt-menu-item-card-bg` (`--dt-surface-base`), `--dt-menu-item-card-border` (`--dt-border-subtle`), `--dt-menu-item-bg-hover` (`--dt-surface-subtle`).
- Tags: `--dt-dietary-{kind}-bg` and `--dt-dietary-{kind}-fg` for each kind, from the success, danger, info, warning and brand subtle surfaces and their text roles; `default` is sunken and secondary.

The name is `--dt-text-label-lg-*`; the description `--dt-text-body-sm-*`.

### Accessibility
- The name is a heading (`h3` in a section with an `h2`).
- With `onSelect`, the name is a real `<button>` and a transparent layer inside it stretches over the whole row, so a press anywhere on the row is a press of that button. The add button and the stepper sit above that layer as their own targets: two tab stops, never one control nested in another. The row's focus ring is drawn around the whole item.
- The row button is described by the price line, so focusing it reads "Pad thai, $12.50, 2 in basket".
- The add button is named `Add ${name}` (override with `addLabel`), so a list of dishes does not read as a column of identical "Add" buttons. The stepper is named `Quantity, ${name}` and its remove button `Remove ${name}`.
- Tags always show their words; colour and icons repeat them. Sold out is said in text as well as shown by dimming.

### Content
- The name as the menu prints it, sentence case.
- The description says what is in the dish and how it is made. It is clamped to two lines, so lead with what matters.
- Tag labels are one or two words: "Vegan", "Gluten free", "Contains nuts".

## Props

```ts
import * as React from "react";

/** A small label on a dish. */
export interface MenuItemTag {
  /** Always shown, so colour is never the only signal: "Vegan", "Spicy", "Popular". */
  label: string;
  /** Picks the tag's colour tokens. spicy and popular also get an icon. @default "default" */
  kind?: "vegetarian" | "vegan" | "spicy" | "gluten-free" | "popular" | "new" | "default";
}

/** One dish on a menu: name, description, price, tags, a thumbnail and an add button. */
export interface MenuItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "children"> {
  /** The dish's name, rendered as a heading. */
  name: string;
  /** What is in it. Clamped to two lines. */
  description?: string;
  /** Price in major units, shown with Price. */
  price: number;
  /** Original price. When higher than price, it shows struck through. */
  compareAt?: number;
  /** ISO 4217 currency code. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Square thumbnail on the right, at --dt-menu-thumb-size. Its space is reserved before it loads. */
  image?: { src?: string; alt: string };
  /** Dietary and highlight tags, shown as small badges. */
  tags?: MenuItemTag[];
  /** Dims the dish, shows soldOutLabel and removes the add button and stepper. */
  soldOut?: boolean;
  /** How many are in the basket. Above 0 it shows quantityLabel as a badge, and a stepper when onQuantityChange is given. @default 0 */
  quantity?: number;
  /** Shows an add button, named `Add ${name}`. Usually opens a Sheet of ModifierGroups. */
  onAdd?: () => void;
  /** With quantity above 0, shows a QuantityStepper; its remove button calls this with 0. */
  onQuantityChange?: (next: number) => void;
  /** Makes the whole row a button that opens the dish's details. The add button stays a separate target. */
  onSelect?: () => void;
  /** list: a row in a list. grid: a card. Set by MenuSection; set it yourself only outside one. @default "list" */
  layout?: "list" | "grid";
  /** Level of the name's heading. MenuSection sets it one below its own. @default 3 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Accessible name of the add button. @default `Add ${name}` */
  addLabel?: string;
  /** Badge text for a sold-out dish. @default "Sold out" */
  soldOutLabel?: string;
  /** Badge text for the basket count. @default (n) => `${n} in basket` */
  quantityLabel?: (quantity: number) => string;
}

export declare function MenuItem(props: MenuItemProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-dietary-default-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-dietary-default-fg` | component | `var(--dt-text-secondary)` |
| `--dt-dietary-gluten-free-bg` | component | `var(--dt-surface-info-subtle)` |
| `--dt-dietary-gluten-free-fg` | component | `var(--dt-text-info)` |
| `--dt-dietary-new-bg` | component | `var(--dt-surface-brand-muted)` |
| `--dt-dietary-new-fg` | component | `var(--dt-text-brand)` |
| `--dt-dietary-popular-bg` | component | `var(--dt-surface-warning-subtle)` |
| `--dt-dietary-popular-fg` | component | `var(--dt-text-warning)` |
| `--dt-dietary-spicy-bg` | component | `var(--dt-surface-danger-subtle)` |
| `--dt-dietary-spicy-fg` | component | `var(--dt-text-danger)` |
| `--dt-dietary-vegan-bg` | component | `var(--dt-surface-success-subtle)` |
| `--dt-dietary-vegan-fg` | component | `var(--dt-text-success)` |
| `--dt-dietary-vegetarian-bg` | component | `var(--dt-surface-success-subtle)` |
| `--dt-dietary-vegetarian-fg` | component | `var(--dt-text-success)` |
| `--dt-menu-item-bg-hover` | component | `var(--dt-surface-subtle)` |
| `--dt-menu-item-card-bg` | component | `var(--dt-surface-base)` |
| `--dt-menu-item-card-border` | component | `var(--dt-border-subtle)` |
| `--dt-menu-item-description-color` | component | `var(--dt-text-secondary)` |
| `--dt-menu-item-gap` | component | `var(--dt-space-inline-md)` |
| `--dt-menu-item-padding` | component | `var(--dt-space-inset-md)` |
| `--dt-menu-item-soldout-color` | component | `var(--dt-text-disabled)` |
| `--dt-menu-thumb-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-menu-thumb-radius` | component | `var(--dt-radius-media)` |
| `--dt-menu-thumb-size` | component | `calc(2 * var(--dt-size-control-lg))` |
| `--dt-price-color` | component | `var(--dt-text-primary)` |
| `--dt-price-sale-color` | component | `var(--dt-text-danger)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-elevation-2` | semantic | `var(--dt-shadow-raw-2)` |
| `--dt-focus-ring-color` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-focus-ring-offset` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-focus-ring-width` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-size-icon-xs` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
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
| `--dt-text-display-2xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-2xl-line` | semantic | `var(--dt-line-height-fluid)` |
| `--dt-text-display-2xl-size` | semantic | `var(--dt-font-size-fluid-2xl)` |
| `--dt-text-display-2xl-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-2xl-weight` | semantic | `var(--dt-font-weight-medium)` |
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
| `--dt-text-display-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-xl-line` | semantic | `var(--dt-line-height-fluid)` |
| `--dt-text-display-xl-size` | semantic | `var(--dt-font-size-fluid-xl)` |
| `--dt-text-display-xl-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
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
import { Badge } from "../display/Badge.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { Price } from "./Price.jsx";
import { QuantityStepper } from "./QuantityStepper.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

const ICONS = {
  plus: ["M5 12h14", "M12 5v14"],
  flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
  thumb: ["M7 10v12", "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"],
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

/* Each tag kind reads its own pair of tokens. Spicy and popular carry an
   icon as well; every kind always shows its label. */
const KINDS = ["vegetarian", "vegan", "spicy", "gluten-free", "popular", "new", "default"];
const TAG_ICON = { spicy: "flame", popular: "thumb" };

function DishTag({ label, kind }) {
  const k = KINDS.includes(kind) ? kind : "default";
  return (
    <Badge
      style={{
        background: `var(--dt-dietary-${k}-bg)`,
        color: `var(--dt-dietary-${k}-fg)`,
        border: "var(--dt-border-width-default) solid transparent",
      }}
    >
      {TAG_ICON[k] && <Icon name={TAG_ICON[k]} size="var(--dt-size-icon-xs)" />}
      {label}
    </Badge>
  );
}

const defaultQuantityLabel = (n) => `${n} in basket`;

export function MenuItem({
  name,
  description,
  price,
  compareAt,
  currency = "USD",
  locale,
  image,
  tags = [],
  soldOut = false,
  quantity = 0,
  onAdd,
  onQuantityChange,
  onSelect,
  layout = "list",
  headingLevel = 3,
  addLabel,
  soldOutLabel = "Sold out",
  quantityLabel = defaultQuantityLabel,
  style,
  ...rest
}) {
  const metaId = React.useId();
  const [hover, setHover] = React.useState(false);
  const [ring, setRing] = React.useState(false);
  const grid = layout === "grid";
  const level = Math.min(Math.max(Math.round(headingLevel) || 3, 1), 6);
  const H = `h${level}`;
  const inBasket = quantity > 0;
  const showStepper = inBasket && !!onQuantityChange && !soldOut;
  const showAdd = !!onAdd && !soldOut;
  const selectable = !!onSelect;
  const dim = soldOut ? "var(--dt-menu-item-soldout-color)" : null;

  /* The row's focus ring is drawn on the whole item, not on the name, so a
     keyboard user sees the target the stretched button covers. */
  const onFocus = (e) => {
    let visible = true;
    try { visible = e.currentTarget.matches(":focus-visible"); } catch (err) { visible = true; }
    setRing(visible);
  };

  const title = selectable ? (
    <button
      type="button"
      onClick={onSelect}
      onFocus={onFocus}
      onBlur={() => setRing(false)}
      aria-describedby={metaId}
      style={{
        appearance: "none", background: "none", border: 0, margin: 0, padding: 0,
        font: "inherit", color: "inherit", letterSpacing: "inherit", textAlign: "start",
        cursor: "pointer", outline: "none", position: "static",
        textDecoration: hover && !grid ? "underline" : "none",
        textUnderlineOffset: "var(--dt-border-width-strong)",
      }}
    >
      {/* The stretched target: positioned against the item and stacked over
          its text, price and picture, so a press anywhere on the row is a
          press of this button. The add button and stepper sit above it. */}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
      {name}
    </button>
  ) : name;

  return (
    <div
      onMouseEnter={selectable ? () => setHover(true) : undefined}
      onMouseLeave={selectable ? () => setHover(false) : undefined}
      style={{
        position: "relative", isolation: "isolate", boxSizing: "border-box",
        display: "flex", alignItems: "flex-start", gap: "var(--dt-menu-item-gap)",
        minWidth: 0, height: grid ? "100%" : undefined,
        padding: grid ? "var(--dt-menu-item-padding)" : "var(--dt-menu-item-padding) 0",
        borderRadius: "var(--dt-radius-container)",
        border: grid ? "var(--dt-border-width-default) solid var(--dt-menu-item-card-border)" : undefined,
        background: grid ? (hover ? "var(--dt-menu-item-bg-hover)" : "var(--dt-menu-item-card-bg)") : undefined,
        outline: ring ? "var(--dt-focus-ring-width) solid var(--dt-focus-ring-color)" : "none",
        outlineOffset: "var(--dt-focus-ring-offset)",
        cursor: selectable ? "pointer" : undefined,
        transition: "background var(--dt-motion-micro)",
        ...(soldOut ? { "--dt-price-color": "var(--dt-menu-item-soldout-color)", "--dt-price-sale-color": "var(--dt-menu-item-soldout-color)" } : null),
        ...style,
      }}
      {...rest}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
        <H style={{ ...role("label-lg"), margin: 0, overflowWrap: "anywhere", color: dim || "var(--dt-text-primary)" }}>{title}</H>
        {description && (
          <p
            style={{
              ...role("body-sm"), margin: 0,
              color: dim || "var(--dt-menu-item-description-color)",
              display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {description}
          </p>
        )}
        <div id={metaId} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)", minWidth: 0 }}>
          <Price amount={price} compareAt={compareAt} currency={currency} locale={locale} size="sm" />
          {soldOut && <Badge tone="neutral">{soldOutLabel}</Badge>}
          {inBasket && !soldOut && <Badge tone="primary">{quantityLabel(quantity)}</Badge>}
        </div>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)", minWidth: 0 }}>
            {tags.map((t) => <DishTag key={t.label} label={t.label} kind={t.kind} />)}
          </div>
        )}
        {showStepper && (
          <div style={{ position: "relative", zIndex: 2, marginTop: "var(--dt-space-stack-2xs)", alignSelf: "flex-start" }}>
            <QuantityStepper
              size="sm"
              value={quantity}
              min={1}
              onChange={onQuantityChange}
              onRemove={() => onQuantityChange(0)}
              label={`Quantity, ${name}`}
              removeLabel={`Remove ${name}`}
            />
          </div>
        )}
      </div>

      {(image || showAdd) && (
        <div style={{ position: "relative", flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {image && (
            <span
              style={{
                display: "block", position: "relative", overflow: "hidden",
                width: "var(--dt-menu-thumb-size)", height: "var(--dt-menu-thumb-size)",
                borderRadius: "var(--dt-menu-thumb-radius)", background: "var(--dt-menu-thumb-bg)",
              }}
            >
              {image.src && (
                <img
                  src={image.src}
                  alt={image.alt || ""}
                  loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", filter: soldOut ? "grayscale(1)" : undefined }}
                />
              )}
            </span>
          )}
          {showAdd && (
            <IconButton
              label={addLabel || `Add ${name}`}
              variant="solid"
              size="sm"
              onClick={onAdd}
              style={{
                position: image ? "absolute" : "relative", zIndex: 2,
                insetBlockEnd: image ? "var(--dt-space-inset-2xs)" : undefined,
                insetInlineEnd: image ? "var(--dt-space-inset-2xs)" : undefined,
                borderRadius: "var(--dt-radius-pill)",
                boxShadow: image ? "var(--dt-elevation-2)" : undefined,
              }}
            >
              <Icon name="plus" size="var(--dt-size-icon-sm)" />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}
```
