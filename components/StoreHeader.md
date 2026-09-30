# StoreHeader

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [StoreHeader.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/StoreHeader.jsx), [StoreHeader.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/StoreHeader.d.ts), [StoreHeader.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/StoreHeader.md).

Live page: https://graham-goebel.github.io/Dovetail/components/StoreHeader.html

## Guidelines

The top of a restaurant or store page: a cover, a logo, the name, a rating, a line of short facts, the delivery time and fee, and whether the store is open.

### Use it when
- Opening a store's own page in a food-ordering or retail app, above the `FulfilmentToggle` and the menu.
- A store needs to say at a glance whether it takes orders now, how long delivery takes and what it costs.

### Don't use it when
- Listing many stores in a feed or a search result. Use `Card` with a `media` image; a header is for one store's page.
- The page is about a product, not a store. Use `Heading` and `Price`.
- You need a marketing hero. Use `HeroBlock` or `Cover`.

### Example
```jsx
<StoreHeader
  name="Bangkok Kitchen"
  image={{ src: cover, alt: "" }}
  logo={{ src: logo, alt: "" }}
  rating={{ value: 4.6, count: 1284 }}
  meta={["Thai", "$$", "1.2 mi"]}
  deliveryTime="25–35 min"
  deliveryFee={2.99}
  status={{ open: true, label: "Open until 10pm" }}
  actions={<IconButton label="Save to favourites"><HeartIcon /></IconButton>}
  locale="en-US"
/>

{/* Closed, with free delivery */}
<StoreHeader name="Bangkok Kitchen" deliveryFee={0} status={{ open: false, label: "Closed · opens 11am" }} />
```

### Variants
| Prop | What it is for |
|---|---|
| `image` | The cover, 3:1 and no taller than `--dt-store-cover-max-height`. Its space is reserved before it loads, so the page does not jump; without a `src` the empty surface shows. Omit it for no cover. |
| `logo` | A square tile. With a cover it overlaps the cover's lower edge on a ring of the page surface; without one it sits above the name. |
| `rating` | A small display `Rating` with the review count. |
| `meta` | Three or four short facts separated by middle dots. A line never starts or ends with a dot when it wraps. |
| `deliveryTime`, `deliveryFee` | The time with a clock icon; the fee through `Price`, "$2.99 delivery", or `freeDeliveryLabel` at 0. Leave the fee out for pickup. |
| `status` | `open: false` greys the cover and logo, lays the scrim over the cover and turns the label the danger colour. The label says it in words. |
| `actions` | Favourite, share and similar `IconButton`s, beside the name. |
| `headingLevel` | The name's heading level, 1 by default. |

### Composition
Sits at the top of a store page, usually inside an `AppShell` body on a phone, followed by a `FulfilmentToggle` and the `MenuSection`s. The fee reads `Price` and the rating reads `Rating`, so they follow those components' tokens. Actions are whatever you pass; keep them to two.

### Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- `--dt-store-cover-bg` (`--dt-surface-sunken`), `--dt-store-cover-radius` (`--dt-radius-media`), `--dt-store-cover-max-height` (`--dt-size-media-min`).
- `--dt-store-logo-size` (`--dt-size-avatar-xl`), `--dt-store-logo-radius` (`--dt-radius-media`), `--dt-store-logo-bg` (`--dt-surface-raised`), `--dt-store-logo-ring` (`--dt-surface-base`).
- `--dt-store-meta-color` (`--dt-text-secondary`), `--dt-store-open-color` (`--dt-text-success`), `--dt-store-closed-color` (`--dt-text-danger`), `--dt-store-closed-scrim` (`--dt-surface-scrim`).

The name is `--dt-text-heading-md-*`; the facts are `--dt-text-body-sm-*`.

### Accessibility
- The name is a real heading (`h1` by default). Set `headingLevel` to fit the page's outline.
- Status is announced as its label ("Closed · opens 11am"). The greyed cover and the colour repeat it; they never carry it alone.
- The middle dots are `aria-hidden`, so the facts read as a sequence of words. The rating reads as "4.6 out of 5 stars, 1,284 reviews".
- Give the cover and logo empty `alt` when they only decorate; describe them when they show something the text does not.
- Each action is yours to label: pass `IconButton`s with a `label`.

### Content
- `name` as the store writes it.
- `meta` items are one or two words each: cuisine, price band, distance.
- `status.label` is sentence case and says what happens next: "Open until 10pm", "Closed · opens 11am", "Busy · orders may be late".
- `deliveryTime` is a range with an en dash and a unit: "25–35 min".

## Props

```ts
import * as React from "react";

/** An image with its alternative text. */
export interface StoreHeaderImage {
  /** Image URL. Without one the reserved space shows the empty surface. */
  src?: string;
  /** Alternative text. Pass "" when the picture is decoration and says nothing the name does not. */
  alt: string;
}

/** Whether the store takes orders now, and the words for it. */
export interface StoreHeaderStatus {
  /** false greys the cover and logo, lays the cover under a scrim and turns the label the danger colour. */
  open: boolean;
  /** What to show, and what a screen reader hears: "Open until 10pm", "Closed · opens 11am". */
  label: string;
}

/** The top of a restaurant or store page: cover, logo, name, rating, facts, delivery and opening status. */
export interface StoreHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The store's name, rendered as the heading. */
  name: string;
  /** Cover image. Its space (3:1, at most --dt-store-cover-max-height tall) is reserved before it loads. Omit for no cover. */
  image?: StoreHeaderImage;
  /** Square logo. With a cover it overlaps the cover's lower edge; without one it sits above the name. */
  logo?: StoreHeaderImage;
  /** Average rating and review count, shown as a small Rating. */
  rating?: { value: number; count?: number };
  /** Short facts after the rating, separated by middle dots: "Thai", "$$", "1.2 mi". */
  meta?: string[];
  /** Delivery or preparation time, shown with a clock: "25–35 min". */
  deliveryTime?: string;
  /** Delivery fee in major units, shown with Price. 0 shows freeDeliveryLabel. Omit to show no fee. */
  deliveryFee?: number;
  /** ISO 4217 currency code for the fee. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the fee and the review count. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Opening status. A closed store dims and says so. */
  status?: StoreHeaderStatus;
  /** Buttons beside the name, such as favourite and share IconButtons, each with its own label. */
  actions?: React.ReactNode;
  /** Level of the name's heading element. Use 1 when the header tops the store's own page. @default 1 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Shown instead of a fee of 0. @default "Free delivery" */
  freeDeliveryLabel?: string;
  /** Shown after a non-zero fee, as its unit: "$2.99 delivery". @default "delivery" */
  deliveryFeeLabel?: string;
}

export declare function StoreHeader(props: StoreHeaderProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-store-closed-color` | component | `var(--dt-text-danger)` |
| `--dt-store-closed-scrim` | component | `var(--dt-surface-scrim)` |
| `--dt-store-cover-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-store-cover-max-height` | component | `var(--dt-size-media-min)` |
| `--dt-store-cover-radius` | component | `var(--dt-radius-media)` |
| `--dt-store-logo-bg` | component | `var(--dt-surface-raised)` |
| `--dt-store-logo-radius` | component | `var(--dt-radius-media)` |
| `--dt-store-logo-ring` | component | `var(--dt-surface-base)` |
| `--dt-store-logo-size` | component | `var(--dt-size-avatar-xl)` |
| `--dt-store-meta-color` | component | `var(--dt-text-secondary)` |
| `--dt-store-open-color` | component | `var(--dt-text-success)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-size-icon-xs` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
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
| `--dt-font-weight-medium` | primitive | `500` |

## Source

```jsx
import React from "react";
import { AspectRatio } from "../content/AspectRatio.jsx";
import { Price } from "./Price.jsx";
import { Rating } from "./Rating.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)" }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* Items in a line with a middle dot between them. The dots are decoration,
   hidden from assistive technology, so the line reads as a list of facts.
   Every item leads with its dot, and the row is pulled back by one dot's
   width inside a clipping box, so the dot that starts a line (the first, or
   one after a wrap) is cut off and no line begins or ends with a stray dot. */
const SEP = "var(--dt-space-inline-md)";
function Dotted({ items }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div style={{ overflow: "hidden", minWidth: 0 }}>
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "center",
          rowGap: "var(--dt-space-stack-2xs)", marginInlineStart: `calc(-1 * ${SEP})`,
          ...role("body-sm"), color: "var(--dt-store-meta-color)",
        }}
      >
        {shown.map((node, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", minWidth: 0 }}>
            <span aria-hidden="true" style={{ flex: "none", width: SEP, textAlign: "center" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", minWidth: 0 }}>{node}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function StoreHeader({
  name,
  image,
  logo,
  rating,
  meta = [],
  deliveryTime,
  deliveryFee,
  currency = "USD",
  locale,
  status,
  actions,
  headingLevel = 1,
  freeDeliveryLabel = "Free delivery",
  deliveryFeeLabel = "delivery",
  style,
  ...rest
}) {
  const closed = !!status && status.open === false;
  const level = Math.min(Math.max(Math.round(headingLevel) || 1, 1), 6);
  const H = `h${level}`;
  const hasCover = !!image;
  const greyed = closed ? "grayscale(1)" : undefined;

  const fee = typeof deliveryFee === "number" ? (
    <Price
      amount={deliveryFee}
      currency={currency}
      locale={locale}
      size="sm"
      freeLabel={freeDeliveryLabel}
      unit={deliveryFee === 0 ? undefined : deliveryFeeLabel}
    />
  ) : null;

  const statusNode = status ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", color: closed ? "var(--dt-store-closed-color)" : "var(--dt-store-open-color)", fontWeight: "var(--dt-font-weight-medium)" }}>
      <span aria-hidden="true" style={{ flex: "none", width: "calc(var(--dt-size-icon-xs) / 2)", height: "calc(var(--dt-size-icon-xs) / 2)", borderRadius: "var(--dt-radius-pill)", background: "currentColor" }} />
      {status.label}
    </span>
  ) : null;

  const time = deliveryTime ? (
    <React.Fragment>
      <ClockIcon />
      {deliveryTime}
    </React.Fragment>
  ) : null;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)", minWidth: 0, color: "var(--dt-text-primary)", ...style }}
      {...rest}
    >
      {hasCover && (
        <AspectRatio
          ratio={3}
          style={{ maxHeight: "var(--dt-store-cover-max-height)", background: "var(--dt-store-cover-bg)", borderRadius: "var(--dt-store-cover-radius)" }}
        >
          {image.src && (
            <img
              src={image.src}
              alt={image.alt || ""}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", filter: greyed }}
            />
          )}
          {closed && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--dt-store-closed-scrim)" }} />}
        </AspectRatio>
      )}

      {logo && (
        <span
          style={{
            position: "relative", display: "block", flex: "none", overflow: "hidden", boxSizing: "content-box",
            width: "var(--dt-store-logo-size)", height: "var(--dt-store-logo-size)",
            marginTop: hasCover ? "calc(-0.5 * var(--dt-store-logo-size) - var(--dt-space-stack-sm))" : 0,
            marginInlineStart: hasCover ? "var(--dt-space-inset-md)" : 0,
            borderRadius: "var(--dt-store-logo-radius)",
            border: hasCover ? "var(--dt-border-width-strong) solid var(--dt-store-logo-ring)" : "var(--dt-border-width-default) solid var(--dt-border-subtle)",
            background: "var(--dt-store-logo-bg)",
          }}
        >
          {logo.src && (
            <img src={logo.src} alt={logo.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: greyed }} />
          )}
        </span>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)", minWidth: 0 }}>
        <H style={{ ...role("heading-md"), margin: 0, minWidth: 0, overflowWrap: "anywhere", color: "var(--dt-text-primary)" }}>{name}</H>
        {actions && <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", flex: "none" }}>{actions}</div>}
      </div>

      {(rating || meta.length > 0 || status || time || fee) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", minWidth: 0 }}>
          <Dotted
            items={[
              rating && typeof rating.value === "number" ? <Rating value={rating.value} count={rating.count} size="sm" locale={locale} /> : null,
              ...meta,
            ]}
          />
          <Dotted items={[statusNode, time, fee]} />
        </div>
      )}
    </div>
  );
}
```
