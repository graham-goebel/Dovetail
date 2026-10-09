# VariantPicker

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [VariantPicker.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/VariantPicker.jsx), [VariantPicker.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/VariantPicker.d.ts), [VariantPicker.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/VariantPicker.md).

Live page: https://graham-goebel.github.io/Dovetail/components/VariantPicker.html

## Guidelines

Choose one variant of a product, such as a size, a colour or a material: a radio group of chips or colour swatches, or the system `Select` for a long list.

### Use it when
- A product comes in options and the customer picks one before adding it to the cart.
- Some options are out of stock but should stay visible, so people know they exist.
- Colours are best shown as colours: `variant="swatches"`.

### Don't use it when
- More than one can be chosen, such as toppings or add-ons. Use `CheckboxGroup`.
- It is a filter on a product list, which usually allows several values. Use `Tag`s or a `CheckboxGroup`.
- The choice is not about a product, such as a plan or a setting. Use `RadioGroup`.

### Example
```jsx
const [size, setSize] = React.useState();
<VariantPicker
  label="Size"
  value={size}
  onChange={setSize}
  options={[
    { value: "s", label: "S" },
    { value: "m", label: "M" },
    { value: "l", label: "L", note: "Low stock" },
    { value: "xl", label: "XL", disabled: true },
  ]}
/>

<VariantPicker
  label="Colour"
  variant="swatches"
  value={colour}
  onChange={setColour}
  options={[
    { value: "fern", label: "Fern", color: "#5b7a6a" },
    { value: "chalk", label: "Chalk", color: "#ffffff" },
    { value: "linen", label: "Linen", image: "/img/linen-swatch.jpg" },
  ]}
/>

<VariantPicker label="Waist" variant="select" value={waist} onChange={setWaist} options={waists} />
```

### Variants
| Variant | What it is for |
|---|---|
| `chips` | Default. Labelled buttons at least 44px square, for sizes, materials and anything with a short text label. A `note` shows as a second line. |
| `swatches` | 44px circles of each option's `color` or `image`, for colours and fabrics. The chosen one has a ring. The label is the accessible name and a tooltip, and the legend shows it ("Colour: Chalk"). |
| `select` | The system `Select`, for a long list (more than about a dozen) or long labels. `showSelected` doesn't apply: the select shows its value. |

Unavailable options (`disabled: true`) stay in place. A chip is struck through with a dashed border; a swatch is crossed. `showSelected` (on by default) prints the chosen label after the legend: "Size: M".

### Composition
- On a product page, one picker per dimension, stacked under the price and above the quantity and the add button.
- Swatch colours come from product data. They are content, not design tokens, so a literal colour value in `options` is right.
- `select` renders `Select`, and so `Field` for its label. In that variant, extra props go to the native `<select>`; in the others they go to the root.
- The picker only reports a choice; which variants are in stock, and what the price becomes, is your app's state.

### Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-variant-bg` (`--dt-surface-base`), `--dt-variant-bg-hover` (`--dt-surface-subtle`), `--dt-variant-fg` (`--dt-text-primary`), `--dt-variant-border` (`--dt-border-default`): a resting chip. The border also marks a hovered swatch.
- `--dt-variant-selected-bg` (`--dt-surface-selected`), `--dt-variant-selected-fg` (`--dt-text-on-selected`), `--dt-variant-selected-border` (`--dt-border-selected`): the chosen chip.
- `--dt-variant-unavailable-fg` (`--dt-text-disabled`), `--dt-variant-unavailable-border` (`--dt-border-disabled`): an unavailable chip.
- `--dt-variant-note-color` (`--dt-text-secondary`): a chip's note.
- `--dt-swatch-ring` (`--dt-border-selected`): the ring around the chosen swatch.
- `--dt-swatch-border` (`--dt-border-strong`): the hairline around every swatch, so a white one shows on a white surface.

Sizes come from `--dt-size-touch-target` (44px), type from `--dt-text-label-md-*`, and the transition from `--dt-motion-micro`, which is instant under reduced motion.

### Accessibility
- Chips and swatches are a `role="radiogroup"` named by the visible `label`, with a `role="radio"` button per option and `aria-checked` on the chosen one.
- One tab stop (roving tabindex): the chosen option, or the first available one when nothing is chosen. Arrow keys move to the next available option and choose it, skipping unavailable ones and wrapping; Home and End go to the first and last available. Space and Enter choose the focused option. Arrows follow the reading direction in right-to-left pages.
- An unavailable option has `aria-disabled="true"` and is named with "unavailable" ("XL, unavailable"; `unavailableLabel` translates it). It can't be chosen, and the arrows pass over it.
- A note is part of the name: "L, Low stock".
- Focus shows the system focus ring. Every option is at least 44px square.
- In `select`, the native select does the keyboard work. `Select` can't disable an option, so an unavailable one reads "XL (unavailable)" and is ignored if picked: the controlled value stays.
- The chosen label in the legend is hidden from assistive technology, since the checked radio already says it.

### Content
- `label` is the dimension, sentence case and short: "Size", "Colour", "Material".
- Option labels are as short as the product allows: "M", "EU 42", "Fern".
- A `note` is two or three words: "Low stock", "+$8", "Ships in 2 weeks".

## Props

```ts
import * as React from "react";

/** One choice in a VariantPicker. */
export interface VariantPickerOption {
  /** What onChange reports, e.g. "m" or "sand". Unique within the picker. */
  value: string;
  /** What people see and hear: "M", "Sand". A swatch shows it as a tooltip and in the legend. */
  label: string;
  /** For swatches: any CSS colour from the product data. It is content, not a design token. */
  color?: string;
  /** For swatches: an image URL, such as a fabric close-up, drawn in the circle instead of color. */
  image?: string;
  /** Out of stock or not offered with the other choices. It stays visible, crossed out, is skipped by the arrow keys and cannot be chosen. */
  disabled?: boolean;
  /** A short extra line: "Low stock", "+$10". Shown under a chip's label and added to every variant's accessible name. */
  note?: string;
}

/** Choose one variant of a product, such as a colour, a size or a material. */
export interface VariantPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** What is being chosen, e.g. "Size" or "Colour". Names the radio group, or labels the select. */
  label: string;
  /** The choices, in order. */
  options: VariantPickerOption[];
  /** The chosen option's value. The picker is controlled; leave it undefined for nothing chosen yet. */
  value?: string;
  /** Called with the chosen option's value. Never called with a disabled option. */
  onChange: (value: string) => void;
  /**
   * chips are labelled buttons, for sizes and materials. swatches are circles of each option's
   * color or image, for colours. select is the system Select, for a long list. @default "chips"
   */
  variant?: "chips" | "swatches" | "select";
  /** Shows the chosen label after the legend: "Size: M". Chips and swatches only. @default true */
  showSelected?: boolean;
  /** The select's empty first option. @default `Choose ${label.toLowerCase()}` */
  placeholder?: string;
  /** Added to a disabled option's accessible name and, in a select, its text. @default "unavailable" */
  unavailableLabel?: string;
}

export declare function VariantPicker(props: VariantPickerProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-swatch-border` | component | `var(--dt-border-strong)` |
| `--dt-swatch-ring` | component | `var(--dt-border-selected)` |
| `--dt-variant-bg` | component | `var(--dt-surface-base)` |
| `--dt-variant-bg-hover` | component | `var(--dt-surface-subtle)` |
| `--dt-variant-border` | component | `var(--dt-border-default)` |
| `--dt-variant-fg` | component | `var(--dt-text-primary)` |
| `--dt-variant-note-color` | component | `var(--dt-text-secondary)` |
| `--dt-variant-selected-bg` | component | `var(--dt-surface-selected)` |
| `--dt-variant-selected-border` | component | `var(--dt-border-selected)` |
| `--dt-variant-selected-fg` | component | `var(--dt-text-on-selected)` |
| `--dt-variant-unavailable-border` | component | `var(--dt-border-disabled)` |
| `--dt-variant-unavailable-fg` | component | `var(--dt-text-disabled)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-touch-target` | semantic | `var(--dt-dim-11)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
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
import { Select } from "../forms/Select.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* A cross over an unavailable swatch, drawn twice so it shows on a black
   swatch and a white one alike: a wide stroke in the surface colour under a
   thin one in the text colour. */
function Cross() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" strokeLinecap="round"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <path d="M5 19 19 5" strokeWidth="4" style={{ stroke: "var(--dt-surface-base)" }} />
      <path d="M5 19 19 5" strokeWidth="1.5" style={{ stroke: "var(--dt-text-secondary)" }} />
    </svg>
  );
}

export function VariantPicker({
  label,
  options = [],
  value,
  onChange,
  variant = "chips",
  showSelected = true,
  placeholder,
  unavailableLabel = "unavailable",
  style,
  ...rest
}) {
  const labelId = React.useId();
  const refs = React.useRef({});
  const [hover, setHover] = React.useState(null);
  const selected = options.find((o) => o.value === value);
  const nameOf = (o) => [o.label, o.note, o.disabled ? unavailableLabel : null].filter(Boolean).join(", ");

  if (variant === "select") {
    return (
      <Select
        label={label}
        value={value == null ? "" : value}
        placeholder={placeholder || `Choose ${label.toLowerCase()}`}
        options={options.map((o) => ({ value: o.value, label: o.disabled || o.note ? `${o.label} (${[o.note, o.disabled ? unavailableLabel : null].filter(Boolean).join(", ")})` : o.label }))}
        onChange={(e) => {
          /* Select renders options as strings, so an unavailable one can be
             picked in the native list; it is ignored here and the controlled
             value snaps back. */
          const o = options.find((x) => x.value === e.target.value);
          if (o && !o.disabled && o.value !== value && onChange) onChange(o.value);
        }}
        style={style}
        {...rest}
      />
    );
  }

  const swatches = variant === "swatches";
  const count = options.length;
  const firstEnabled = options.findIndex((o) => !o.disabled);
  /* One tab stop: the chosen option, or the first available one. */
  const tabStop = selected && !selected.disabled ? selected.value : firstEnabled >= 0 ? options[firstEnabled].value : null;

  const choose = (o) => {
    if (!o || o.disabled) return;
    if (o.value !== value && onChange) onChange(o.value);
    const el = refs.current[o.value];
    if (el) el.focus();
  };

  /* The next available option from i in direction dir, wrapping. */
  const step = (i, dir) => {
    for (let k = 1; k <= count; k++) {
      const j = (((i + dir * k) % count) + count) % count;
      if (!options[j].disabled) return options[j];
    }
    return null;
  };

  const onKeyDown = (e, i) => {
    const rtl = !!(e.currentTarget.closest && e.currentTarget.closest('[dir="rtl"]'));
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === fwd || e.key === "ArrowDown") next = step(i, 1);
    else if (e.key === back || e.key === "ArrowUp") next = step(i, -1);
    else if (e.key === "Home") next = step(-1, 1);
    else if (e.key === "End") next = step(count, -1);
    else return;
    e.preventDefault();
    choose(next);
  };

  const option = (o, i) => {
    const checked = o.value === value;
    const off = !!o.disabled;
    const hovered = hover === o.value && !off && !checked;
    const common = {
      ref: (el) => { refs.current[o.value] = el; },
      type: "button",
      role: "radio",
      "aria-checked": checked,
      "aria-disabled": off || undefined,
      "aria-label": nameOf(o),
      tabIndex: o.value === tabStop ? 0 : -1,
      onClick: () => choose(o),
      onKeyDown: (e) => onKeyDown(e, i),
      onMouseEnter: () => setHover(o.value),
      onMouseLeave: () => setHover(null),
    };

    if (swatches) {
      return (
        <button
          key={o.value}
          {...common}
          title={nameOf(o)}
          style={{
            flex: "none", boxSizing: "border-box",
            width: "var(--dt-size-touch-target)", height: "var(--dt-size-touch-target)",
            padding: "var(--dt-space-inset-2xs)", margin: 0,
            border: `var(--dt-border-width-strong) solid ${checked ? "var(--dt-swatch-ring)" : hovered ? "var(--dt-variant-border)" : "transparent"}`,
            borderRadius: "var(--dt-radius-pill)", background: "transparent",
            cursor: off ? "not-allowed" : "pointer",
            transition: "border-color var(--dt-motion-micro)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "relative", display: "block", boxSizing: "border-box", width: "100%", height: "100%",
              borderRadius: "var(--dt-radius-pill)", overflow: "hidden",
              backgroundColor: o.color || "var(--dt-surface-sunken)",
              backgroundImage: o.image ? `url(${JSON.stringify(o.image)})` : undefined,
              backgroundSize: "cover", backgroundPosition: "center",
              border: "var(--dt-border-width-default) solid var(--dt-swatch-border)",
            }}
          >
            {off && <Cross />}
          </span>
        </button>
      );
    }

    return (
      <button
        key={o.value}
        {...common}
        style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxSizing: "border-box", minWidth: "var(--dt-size-touch-target)", minHeight: "var(--dt-size-touch-target)",
          padding: "var(--dt-space-inset-2xs) var(--dt-space-inset-sm)", margin: 0,
          border: `var(--dt-border-width-default) ${off ? "dashed" : "solid"} ${
            checked ? "var(--dt-variant-selected-border)" : off ? "var(--dt-variant-unavailable-border)" : "var(--dt-variant-border)"
          }`,
          borderRadius: "var(--dt-radius-control)",
          background: checked ? "var(--dt-variant-selected-bg)" : hovered ? "var(--dt-variant-bg-hover)" : "var(--dt-variant-bg)",
          color: checked ? "var(--dt-variant-selected-fg)" : off ? "var(--dt-variant-unavailable-fg)" : "var(--dt-variant-fg)",
          cursor: off ? "not-allowed" : "pointer",
          transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
          ...role("label-md"),
        }}
      >
        <span style={{ textDecoration: off ? "line-through" : "none", whiteSpace: "nowrap" }}>{o.label}</span>
        {o.note && (
          <span style={{ ...role("body-xs"), color: off ? "var(--dt-variant-unavailable-fg)" : "var(--dt-variant-note-color)", whiteSpace: "nowrap" }}>
            {o.note}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)", minWidth: 0, ...style }} {...rest}>
      <span style={{ ...role("label-md"), color: "var(--dt-text-primary)" }}>
        <span id={labelId}>{label}</span>
        {showSelected && selected && (
          <span aria-hidden="true">
            {": "}
            <span style={{ color: "var(--dt-text-secondary)", fontWeight: "var(--dt-text-body-sm-weight)" }}>{selected.label}</span>
          </span>
        )}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        style={{ display: "flex", flexWrap: "wrap", gap: swatches ? "var(--dt-space-inline-2xs)" : "var(--dt-space-inline-xs)" }}
      >
        {options.map(option)}
      </div>
    </div>
  );
}
```
