# ProductCard

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [ProductCard.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/ProductCard.jsx), [ProductCard.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/ProductCard.d.ts), [ProductCard.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/ProductCard.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ProductCard.html

## Guidelines

A product in a grid, a carousel, a list or search results: its photo, name, price and, optionally, rating, colours, a flag and an add action, with the whole card linking to the product page.

### Use it when
- Listing products to browse: a category grid, "You may also like", search results, a wishlist.
- The card should link to the product page and still carry its own add button.
- A list needs the photo beside the text: `layout="horizontal"`.

### Don't use it when
- It is a line in the cart or an order: that has a quantity and a remove action, not a card-sized photo. Compose it from `Price` and `QuantityStepper` in a row.
- The content isn't a product for sale. Use `Card`.
- You are on the product page itself. Use `ProductGallery`, `Price`, `Rating` and `VariantPicker` there.

### Example
```jsx
<ProductCard
  name="Stoneware mug"
  href="/products/stoneware-mug"
  image={{ src: "/img/mug-fern.jpg", alt: "" }}
  subtitle="Fern glaze"
  price={24}
  compareAt={30}
  badge="-20%"
  rating={{ value: 4.5, count: 128 }}
  swatches={[{ name: "Fern", color: "#5b7a6a" }, { name: "Chalk", color: "#ffffff" }]}
  onQuickAdd={() => addToCart("stoneware-mug")}
/>

<ProductCard
  layout="horizontal"
  name="Soy candle"
  href="/products/soy-candle"
  image={{ src: "/img/candle.jpg", alt: "" }}
  price={18}
  soldOut
  action={<Button variant="secondary" size="sm">Add to cart</Button>}
/>
```

### Variants
| Prop | What it is for |
|---|---|
| `layout="vertical"` | Default. The photo above the text, for grids and carousels. The action sits at the foot, so actions line up across a row. |
| `layout="horizontal"` | The photo beside the text, a third of the width up to 2.5 × `--dt-size-avatar-xl` (160px), for lists and search results. |
| `ratio` | `"1:1"` by default, which suits any catalogue. `"4:5"` for apparel and people; `"3:4"`, `"4:3"` or a number for other photography. Use one ratio across a grid. |
| `compareAt` | A sale. `Price` strikes through the old price and announces "Was …, now …". |
| `badge` | A flag over the top corner of the photo: "New", "-20%". A string becomes a solid neutral `Badge`; pass your own `Badge` for another tone. |
| `swatches` | Colour dots, display only. Past `maxSwatches` (5) the rest collapse into "+3". |
| `soldOut` | Washes out the photo, shows `soldOutLabel` ("Sold out") in place of the badge, disables the quick-add button, and clones `action` with `disabled: true`. |
| `onQuickAdd` | A round add button over the photo's bottom corner, named "Add {name} to cart". For dense grids. |
| `action` | Anything at the foot of the card, usually an "Add to cart" `Button`. For roomier cards. |

### Composition
- Built on `Card`: its surface, border, radius and the `href` pattern. The name is the one real link; an `aria-hidden` copy of it is stretched over the card for a pointer, and the action and quick-add button sit above it so they stay separately clickable and focusable. The card's padding is the tighter `--dt-space-inset-sm`.
- The photo is an `Image` (so an `AspectRatio`): the frame reserves its space before the photo loads, and without `image` it shows the system's placeholder.
- The price is a `Price`, the rating a small display `Rating`, the flag a `Badge`, the quick add an `IconButton`.
- Put cards in a `Grid`, or a CSS grid of `repeat(auto-fill, minmax(…, 1fr))`. The card fills its cell's height. Pass `as="li"` inside a list.
- Don't put other links or controls in the text: only `action` and the quick-add button sit above the stretched link.

### Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-product-subtitle-color` (`--dt-text-secondary`): the subtitle and the "+3".
- `--dt-product-soldout-overlay` (`--dt-surface-glass`): the wash over a sold-out photo. The system has no opacity token; the translucent glass surface dims the photo in either mode.
- `--dt-swatch-border` (`--dt-border-strong`): the hairline around each colour dot, so a white one shows on a white card.

It also reads Card's `--dt-card-*` tokens, `--dt-radius-media` for the photo, `--dt-text-label-lg-*` for the name and `--dt-text-body-sm-*` for the subtitle, and the tokens of `Price`, `Rating`, `Badge` and `IconButton`. Swatch colours come from product data: they are content, not tokens.

### Accessibility
- With `href`, the name is the card's only link, so a screen reader lists each product once, by its name. The stretched copy is `aria-hidden` and out of the tab order.
- The text comes first in the source and the photo is moved above it visually, so a screen reader and the Tab key meet the name (the link) first, then the flag and the quick-add button.
- The quick-add button is a real button named "Add {name} to cart" (override with `quickAddLabel`), so a list of them is not a column of identical "Add" buttons.
- The swatches are one `role="img"` named "Colours: Fern, Harbour, …", listing every colour, the collapsed ones included. Each dot has a tooltip.
- The sale is announced by `Price`; the rating is named "4.5 out of 5 stars, 128 reviews" by `Rating`.
- "Sold out" is text, not only the wash. The disabled quick-add button leaves the tab order.
- Alt text describes the photo. The name is already read, so pass `alt: ""` when the photo would only repeat it.

### Content
- `name` is the product's name as the catalogue has it, sentence case. It clamps to two lines.
- `subtitle` is one short line: the brand, the variant ("Fern glaze") or a summary ("8 colours").
- `badge` is one or two words or a number: "New", "-20%", "Sale". Don't put the price in it.
- Action labels start with a verb: "Add to cart", "Add to bag".

## Props

```ts
import * as React from "react";

/** A product image, with the alt text the page needs. */
export interface ProductCardImage {
  /** URL of the image. */
  src: string;
  /** What the image shows, e.g. "Green ceramic mug, side view". Pass "" when it would only repeat the name. */
  alt: string;
}

/** One colour a product comes in, shown as a dot. */
export interface ProductCardSwatch {
  /** The colour's name, read to a screen reader and shown as a tooltip: "Sand", "Forest green". */
  name: string;
  /** Any CSS colour from the product data, e.g. "#c8b79a". It is content, not a design token. */
  color: string;
}

/** A product in a grid, a carousel, a list or search results: picture, name, price and an optional action. */
export interface ProductCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  /** The product's name. It is the card's heading text and, with href, its one link. */
  name: string;
  /**
   * The product page. The name becomes the one link a screen reader hears, and a copy
   * stretches over the whole card for a pointer, as Card's href does. The action and the
   * quick-add button stay separately focusable and clickable above it.
   */
  href?: string;
  /** The product photo. Without one the frame keeps its space and shows the Image placeholder. */
  image?: ProductCardImage;
  /** Shape of the photo frame. "4:5" suits apparel; a number is width / height. @default "1:1" */
  ratio?: "1:1" | "4:5" | "3:4" | "4:3" | number;
  /** The price in major units, passed to Price as amount. */
  price: number;
  /** The original price. When greater than price, the card shows a sale. */
  compareAt?: number;
  /** ISO 4217 currency code, passed to Price. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price and the review count. Set it when server rendering. */
  locale?: string;
  /** The average rating and, optionally, how many reviews it comes from. Shown as a small Rating. */
  rating?: { value: number; count?: number };
  /**
   * A flag over the top corner of the photo: "New", "-20%". A string becomes a solid neutral
   * Badge; pass a Badge of your own for another tone. Hidden while soldOut, whose label takes
   * its place.
   */
  badge?: React.ReactNode;
  /** A line under the name: the brand, or a summary of the variants ("3 sizes"). */
  subtitle?: string;
  /** Colours the product comes in, as small dots. Display only; choose a colour with VariantPicker. */
  swatches?: ProductCardSwatch[];
  /** How many swatches show before the rest collapse into "+3". @default 5 */
  maxSwatches?: number;
  /** Washes out the photo, shows soldOutLabel over it, and disables the quick-add button and the action. */
  soldOut?: boolean;
  /** The sold-out flag's text. @default "Sold out" */
  soldOutLabel?: string;
  /**
   * An action at the foot of the card, e.g. a Button that adds to the cart. It sits above the
   * stretched link. While soldOut it is cloned with disabled: true.
   */
  action?: React.ReactNode;
  /** Renders a compact add button over the photo's bottom corner and calls this when it is pressed. */
  onQuickAdd?: () => void;
  /** Accessible name of the quick-add button. @default `Add ${name} to cart` */
  quickAddLabel?: string;
  /** vertical stacks the photo over the text, for grids; horizontal puts it beside, for lists and search results. @default "vertical" */
  layout?: "vertical" | "horizontal";
  /** The element the card renders as, passed to Card: "article" or "li" in a list of products. @default "div" */
  as?: React.ElementType;
}

export declare function ProductCard(props: ProductCardProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-card-elevation` | component | `var(--dt-elevation-0)` |
| `--dt-card-elevation-hover` | component | `var(--dt-elevation-1)` |
| `--dt-card-fg` | component | `var(--dt-text-primary)` |
| `--dt-product-soldout-overlay` | component | `var(--dt-surface-glass)` |
| `--dt-product-subtitle-color` | component | `var(--dt-text-secondary)` |
| `--dt-swatch-border` | component | `var(--dt-border-strong)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-2` | semantic | `var(--dt-shadow-raw-2)` |
| `--dt-radius-media` | semantic | `var(--dt-radius-raw-12)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-avatar-xl` | semantic | `var(--dt-dim-16)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
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
import { Card } from "../display/Card.jsx";
import { Image } from "../content/Image.jsx";
import { Badge } from "../display/Badge.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { Price } from "./Price.jsx";
import { Rating } from "./Rating.jsx";

/* Product photography ratios. AspectRatio names the square "square" and
   has no 4:5, so both are mapped here; a number passes straight through. */
const RATIOS = { "1:1": "square", "4:5": 4 / 5, "3:4": "3:4", "4:3": "4:3" };

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

/* Colour dots, display only. One accessible name lists every colour, the
   ones past the limit included, so "+3" is never all a screen reader gets. */
function Swatches({ swatches, max }) {
  const shown = swatches.slice(0, max);
  const extra = swatches.length - shown.length;
  return (
    <span
      role="img"
      aria-label={`Colours: ${swatches.map((s) => s.name).join(", ")}`}
      style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)" }}
    >
      {shown.map((s, i) => (
        <span
          key={`${i}-${s.name}`}
          title={s.name}
          style={{
            display: "block", flex: "none", boxSizing: "border-box",
            width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)",
            borderRadius: "var(--dt-radius-pill)",
            background: s.color,
            border: "var(--dt-border-width-default) solid var(--dt-swatch-border)",
          }}
        />
      ))}
      {extra > 0 && (
        <span style={{ ...role("body-xs"), color: "var(--dt-product-subtitle-color)", fontVariantNumeric: "tabular-nums" }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

export function ProductCard({
  name,
  href,
  image,
  ratio = "1:1",
  price,
  compareAt,
  currency,
  locale,
  rating,
  badge,
  subtitle,
  swatches,
  maxSwatches = 5,
  soldOut = false,
  soldOutLabel = "Sold out",
  action,
  onQuickAdd,
  quickAddLabel,
  layout = "vertical",
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const horizontal = layout === "horizontal";
  const linked = !!href;
  const r = typeof ratio === "number" ? ratio : RATIOS[ratio] || RATIOS["1:1"];
  const corner = "var(--dt-space-inset-xs)";

  /* A string badge becomes a solid neutral Badge, which reads on any photo;
     pass a Badge of your own for another tone. Sold out takes its place. */
  const flag = soldOut
    ? <Badge tone="neutral">{soldOutLabel}</Badge>
    : typeof badge === "string" || typeof badge === "number"
      ? <Badge tone="neutral" variant="solid">{badge}</Badge>
      : badge;

  /* A sold-out product can't be added: the consumer's action is disabled
     when it is an element that takes a disabled prop, such as Button. */
  const act = soldOut && React.isValidElement(action) ? React.cloneElement(action, { disabled: true }) : action;

  /* The photo comes after the text in the source and before it on screen
     (order -1), so a screen reader meets the name first and the quick-add
     button after the link. */
  const media = (
    <div style={{ position: "relative", minWidth: 0, order: -1 }}>
      {image && image.src ? (
        <Image src={image.src} alt={image.alt} ratio={r} radius="media" />
      ) : (
        <Image alt="" placeholder={name} ratio={r} radius="media" aria-hidden="true" />
      )}
      {soldOut && (
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, borderRadius: "var(--dt-radius-media)", background: "var(--dt-product-soldout-overlay)" }}
        />
      )}
      {flag && (
        <div style={{ position: "absolute", insetBlockStart: corner, insetInlineStart: corner, display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)" }}>
          {flag}
        </div>
      )}
      {onQuickAdd && (
        <IconButton
          label={quickAddLabel || `Add ${name} to cart`}
          variant="solid"
          size="md"
          disabled={soldOut}
          onClick={onQuickAdd}
          style={{
            position: "absolute", insetBlockEnd: corner, insetInlineEnd: corner, zIndex: 1,
            borderRadius: "var(--dt-radius-pill)", boxShadow: soldOut ? "none" : "var(--dt-elevation-2)",
          }}
        >
          <PlusIcon />
        </IconButton>
      )}
    </div>
  );

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", minWidth: 0, flex: horizontal ? undefined : 1 }}>
      <span
        style={{
          ...role("label-lg"), color: "var(--dt-card-fg)",
          display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
        }}
      >
        {linked ? (
          <a href={href} style={{ color: "inherit", textDecoration: hover ? "underline" : "none", textUnderlineOffset: "0.2em" }}>{name}</a>
        ) : name}
      </span>
      {subtitle && <span style={{ ...role("body-sm"), color: "var(--dt-product-subtitle-color)" }}>{subtitle}</span>}
      <Price amount={price} compareAt={compareAt} currency={currency} locale={locale} />
      {rating && <Rating value={rating.value} count={rating.count} locale={locale} size="sm" style={{ alignSelf: "flex-start" }} />}
      {swatches && swatches.length > 0 && <Swatches swatches={swatches} max={maxSwatches} />}
      {act && (
        <div style={{ marginTop: horizontal ? "var(--dt-space-stack-xs)" : "auto", paddingTop: horizontal ? undefined : "var(--dt-space-stack-xs)", position: "relative", zIndex: 1 }}>
          {act}
        </div>
      )}
    </div>
  );

  return (
    <Card
      href={href}
      onMouseEnter={(e) => { setHover(true); if (onMouseEnter) onMouseEnter(e); }}
      onMouseLeave={(e) => { setHover(false); if (onMouseLeave) onMouseLeave(e); }}
      style={{
        padding: "var(--dt-space-inset-sm)",
        height: "100%", boxSizing: "border-box", minWidth: 0,
        boxShadow: linked && hover ? "var(--dt-card-elevation-hover)" : "var(--dt-card-elevation)",
        ...style,
      }}
      {...rest}
    >
      <div
        style={horizontal
          ? { display: "grid", gridTemplateColumns: "min(33%, calc(var(--dt-size-avatar-xl) * 2.5)) minmax(0, 1fr)", gap: "var(--dt-space-inline-md)", alignItems: "start", flex: 1 }
          : { display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)", flex: 1 }}
      >
        {body}
        {media}
      </div>
    </Card>
  );
}
```
