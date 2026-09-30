# ProductDetailBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [ProductDetailBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/ProductDetailBlock.jsx), [ProductDetailBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/ProductDetailBlock.d.ts), [ProductDetailBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/ProductDetailBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ProductDetailBlock.html

## Guidelines

The top of a product page: a `ProductGallery` on the left and a buy box on the right with the name, price, rating, description, variant pickers, quantity, a full-width add button and collapsible details. The two stack on a narrow screen, gallery first.

### Use it when
- A page sells one product and the buyer needs to choose options before adding it.

### Don't use it when
- Showing several products. Use `ProductGridBlock`.
- A dish with modifiers in a food order. Use `MenuItem` and `ModifierGroup` in a `Sheet`.
- A quick-view overlay with no gallery: compose `Price`, `VariantPicker` and a `Button` in a `Dialog` instead.

### Example
```jsx
const [colour, setColour] = React.useState("fern");
const [size, setSize] = React.useState();
const [qty, setQty] = React.useState(1);

<ProductDetailBlock
  images={images}
  name="Stoneware mug"
  subtitle="Glazed by hand"
  price={size === "large" ? 28 : 24}
  rating={{ value: 4.5, count: 128 }}
  description="A heavy, straight-sided mug with a wide handle."
  variants={[
    { label: "Colour", variant: "swatches", value: colour, onChange: setColour, options: colours },
    { label: "Size", value: size, onChange: setSize, options: sizes },
  ]}
  quantity={qty}
  onQuantityChange={setQty}
  canAddToCart={!!size}
  addToCartNote={size ? "Free shipping over $75." : "Choose a size to add it to your cart."}
  onAddToCart={() => addToCart({ colour, size, qty })}
  details={[
    { title: "Materials and care", content: "Stoneware. Dishwasher safe." },
    { title: "Shipping", content: "Ships in 1–2 working days." },
    { title: "Returns", content: "Free returns within 30 days." },
  ]}
/>
```

### Variants
| State | How |
| --- | --- |
| A required variant unset | `canAddToCart={false}` disables the button. The block does not know which variants are required: work it out from your selection. Say what is missing in `addToCartNote`. |
| Sold out | `soldOut` disables the button and the stepper, and the button reads `soldOutLabel` ("Sold out"). Use `addToCartNote` for when it is back. |
| On sale | `compareAt` greater than `price`: `Price` shows the sale. |
| No quantity | Leave out `onQuantityChange` and the stepper is not shown. |

### Composition
A `Section` with two columns: `ProductGallery`, then a buy box of `Badge`s (`badges`), a `Heading`, `Rating`, `Price`, the description, one `VariantPicker` per entry of `variants` (spread, so each takes every `VariantPicker` prop), a `QuantityStepper`, a full-width `Button`, and an `Accordion` of `details` that allows several open. The block holds no state: the selection, the quantity and the price of the chosen variant are the page's.

### Tokens
Has none of its own. The column gap is `--dt-layout-inline-section` and the rows are `Stack` layers (`group`, `related`, `eyebrow`), all drawn at `--dt-layout-scale`, so the Configure sheet's layout reaches it. Everything else comes through the components it composes.

### Accessibility
- The name is the page's `h1` by default (`level`); set it to 2 when the page has another h1.
- The gallery is a named region (`galleryLabel`, default "Images of {name}").
- `addToCartNote` is linked to the button with `aria-describedby`, so a disabled button's reason is read with it.
- The stepper is named "Quantity, {name}"; each `VariantPicker` is a radio group named by its label.
- The accordion's buttons carry `aria-expanded` and control their panels.

### Content
- Button: a verb, "Add to cart" (or "Add to bag"). Don't swap it for "Loading…".
- Notes are one short sentence: "Choose a size", "Back in November".
- Details titles are nouns: "Materials and care", "Shipping", "Returns".

## Props

```ts
import * as React from "react";
import type { ProductGalleryImage } from "../commerce/ProductGallery";
import type { VariantPickerProps } from "../commerce/VariantPicker";

/** One collapsible section under the buy box: materials, shipping, returns. */
export interface ProductDetailSection {
  /** The section's heading, e.g. "Materials and care". */
  title: string;
  /** What it says: a paragraph, a list, a table. */
  content: React.ReactNode;
}

/** The top of a product page: a gallery beside a buy box with the name, price, variants, quantity and add to cart. */
export interface ProductDetailBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The product images, in order, shown in a ProductGallery. At least one. */
  images: ProductGalleryImage[];
  /** Accessible name of the gallery. @default `Images of ${name}` */
  galleryLabel?: string;
  /** Shape of the gallery images. A number is width / height. @default "1:1" */
  ratio?: "1:1" | "4:5" | "3:4" | "4:3" | number;
  /** The product's name: the block's heading. */
  name: string;
  /** A line under the name: the brand, the colour, a short description. */
  subtitle?: string;
  /** The price in major units, passed to Price. Pass the price of the chosen variant. */
  price: number;
  /** The original price. When greater than price, the price shows as a sale. */
  compareAt?: number;
  /** ISO 4217 currency code, passed to Price. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price and the review count. Set it when server rendering. */
  locale?: string;
  /** The average rating and, optionally, how many reviews it comes from. */
  rating?: { value: number; count?: number };
  /** A paragraph or two about the product. A string is set as secondary body text. */
  description?: React.ReactNode;
  /** One VariantPicker per option (colour, size), each spread from these props. The block holds no selection: pass value and onChange. */
  variants?: VariantPickerProps[];
  /** The quantity to add. Controlled. @default 1 */
  quantity?: number;
  /** Called with the next quantity. Shows a QuantityStepper above the add button when given. */
  onQuantityChange?: (next: number) => void;
  /** Highest quantity the stepper allows, e.g. the stock left. */
  maxQuantity?: number;
  /** Called when the add button is pressed. Not called while the button is disabled. */
  onAddToCart?: () => void;
  /** The add button's text. @default "Add to cart" */
  addToCartLabel?: string;
  /**
   * false disables the add button, e.g. while a required variant is unset. The block does not know
   * which variants are required: work it out from your selection and pass it here, with addToCartNote
   * saying what is missing. @default true
   */
  canAddToCart?: boolean;
  /** A line under the add button, linked to it by aria-describedby: "Choose a size", "Free delivery over $75". */
  addToCartNote?: React.ReactNode;
  /** Disables the add button and the stepper, and the button reads soldOutLabel. @default false */
  soldOut?: boolean;
  /** The add button's text while soldOut. @default "Sold out" */
  soldOutLabel?: string;
  /** Collapsible sections under the buy box, as an Accordion that allows several open. */
  details?: ProductDetailSection[];
  /** Badges above the name: "New", "Bestseller", "Low stock". */
  badges?: React.ReactNode;
  /** The name's heading level. The product page's h1 unless something above it is. @default 1 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function ProductDetailBlock(props: ProductDetailBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-layout-inline-section` | semantic | `var(--dt-dim-12)` |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-layout-scale` | semantic | `1` |
| `--dt-size-media-min` | semantic | `var(--dt-dim-64)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Stack } from "../primitives/Stack.jsx";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { Button } from "../actions/Button.jsx";
import { Accordion } from "../content/Accordion.jsx";
import { ProductGallery } from "../commerce/ProductGallery.jsx";
import { VariantPicker } from "../commerce/VariantPicker.jsx";
import { Price } from "../commerce/Price.jsx";
import { Rating } from "../commerce/Rating.jsx";
import { QuantityStepper } from "../commerce/QuantityStepper.jsx";

/* A column is at least this wide before the two stack: a gallery any
   narrower loses its thumbnails, and a buy box its one-line price. */
const MIN_COLUMN = "calc(var(--dt-size-media-min) * 1.25)";
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;

/* The top of a product page: the gallery on the left, the buy box on the
   right, stacked gallery first on a narrow screen. The block holds no state;
   the variants, the quantity and whether the product can be added are the
   consumer's, passed in as props. */
export function ProductDetailBlock({
  images = [],
  galleryLabel,
  ratio = "1:1",
  name,
  subtitle,
  price,
  compareAt,
  currency,
  locale,
  rating,
  description,
  variants = [],
  quantity,
  onQuantityChange,
  maxQuantity,
  onAddToCart,
  addToCartLabel = "Add to cart",
  canAddToCart = true,
  addToCartNote,
  soldOut = false,
  soldOutLabel = "Sold out",
  details = [],
  badges,
  level = 1,
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const uid = React.useId();
  const noteId = `${uid}-note`;
  const disabled = soldOut || !canAddToCart;
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div
        style={{
          display: "grid", alignItems: "start",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MIN_COLUMN}), 1fr))`,
          columnGap: scaled("--dt-layout-inline-section"), rowGap: "var(--dt-layout-module-gap)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <ProductGallery images={images} label={galleryLabel || `Images of ${name}`} ratio={ratio} />
        </div>

        <Stack layer="group" style={{ minWidth: 0 }}>
          {badges && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-xs)" }}>{badges}</div>}
          <Stack layer="eyebrow">
            <Heading level={level} size="heading-lg" measure="wide" style={{ overflowWrap: "break-word" }}>{name}</Heading>
            {subtitle && <Text tone="secondary">{subtitle}</Text>}
          </Stack>
          {rating && <Rating value={rating.value} count={rating.count} locale={locale} size="sm" style={{ alignSelf: "flex-start" }} />}
          <Price amount={price} compareAt={compareAt} currency={currency} locale={locale} size="lg" />
          {description && (typeof description === "string" ? <Text tone="secondary">{description}</Text> : <div style={{ color: "var(--dt-text-secondary)" }}>{description}</div>)}

          {variants.length > 0 && (
            <Stack layer="group">
              {variants.map((v, i) => <VariantPicker key={v.label || i} {...v} />)}
            </Stack>
          )}

          <Stack layer="related" style={{ marginBlockStart: "var(--dt-space-stack-xs)" }}>
            {onQuantityChange && (
              <QuantityStepper
                label={`Quantity, ${name}`}
                value={quantity == null ? 1 : quantity}
                onChange={onQuantityChange}
                max={maxQuantity}
                disabled={soldOut}
                style={{ alignSelf: "flex-start" }}
              />
            )}
            <Button
              size="lg"
              fullWidth
              disabled={disabled}
              onClick={disabled ? undefined : onAddToCart}
              aria-describedby={addToCartNote ? noteId : undefined}
            >
              {soldOut ? soldOutLabel : addToCartLabel}
            </Button>
            {addToCartNote && <Text id={noteId} variant="small" tone="secondary">{addToCartNote}</Text>}
          </Stack>

          {details.length > 0 && (
            <Accordion
              label={`About ${name}`}
              allowMultiple
              items={details.map((d, i) => ({ id: `${uid}-detail-${i}`, title: d.title, content: d.content }))}
              style={{ marginBlockStart: "var(--dt-space-stack-sm)" }}
            />
          )}
        </Stack>
      </div>
    </Section>
  );
}
```
