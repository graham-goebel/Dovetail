# ModifierGroup

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [ModifierGroup.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/ModifierGroup.jsx), [ModifierGroup.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/ModifierGroup.d.ts), [ModifierGroup.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/ModifierGroup.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ModifierGroup.html

## Guidelines

A group of options for a dish, such as "Choose a size" or "Add extras": radios for one choice or checkboxes for several, in full-width rows with the price change on the right.

### Use it when
- A dish has options that change what is made or what it costs, usually in a `Sheet` opened from a `MenuItem`.
- One choice is required (a size) or several are allowed up to a limit (extras).

### Don't use it when
- It is a form field that is not about a product's options. Use `RadioGroup` or `CheckboxGroup`.
- The choice is a number of the same thing. Use `QuantityStepper`.
- There are two options without prices that switch a mode. Use `FulfilmentToggle` or `Switch`.

### Example
```jsx
<ModifierGroup
  title="Choose a size"
  mode="single"
  required
  options={[{ id: "regular", label: "Regular" }, { id: "large", label: "Large", price: 2 }]}
  value={size}
  onChange={setSize}
  error={tried && !size.length ? "Choose a size to continue." : undefined}
/>

<ModifierGroup
  title="Add extras"
  mode="multiple"
  max={3}
  options={[
    { id: "egg", label: "Fried egg", price: 2 },
    { id: "tofu", label: "Extra tofu", price: 1.5 },
    { id: "chicken", label: "Chicken", price: 2.5, disabled: true, note: "Sold out today" },
  ]}
  value={extras}
  onChange={setExtras}
/>
```

### Variants
| Prop | What it is for |
|---|---|
| `mode="single"` | Radios. `value` holds one id, or none until something is chosen. |
| `mode="multiple"` | Checkboxes. `value` holds every chosen id. |
| `required` | Shows the "Required" pill; a single-choice group is also `aria-required`. The group does not block anything itself: check it when the dish is added and set `error`. |
| `min`, `max` | Multiple mode. They write the hint ("Choose up to 3", "Choose 1 to 3", "Choose at least 2"). At `max` the unchosen options disable, and each adds ", limit of 3 reached" to its accessible name. `min` is not enforced; set `error`. |
| `error` | A message under the title, announced when it appears. It turns the pill the danger colour. |
| `options[].price` | The change in price: "+$1.50", "−$1.00" for a negative. 0 or no price shows nothing. |
| `options[].note` | A short second line: an allergen, "Sold out today". |
| `options[].disabled` | Greys the option out. Say why in `note`. |

### Composition
Usually two or three groups stacked in a `Sheet`, with a footer `Button` that adds the dish and shows the running total: "Add to basket · $14.50". The price deltas render with `Price`. Controlled: the choices and the total live in your app.

### Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- Rows: `--dt-modifier-row-min-height` (`--dt-size-touch-target`), `--dt-modifier-divider` (`--dt-border-subtle`).
- The drawn control: `--dt-modifier-control-size` (`--dt-size-icon-md`), `--dt-modifier-control-border` (`--dt-border-strong`), `--dt-modifier-control-bg` (`--dt-input-bg`), `--dt-modifier-control-accent` (`--dt-surface-action`), `--dt-modifier-control-mark` (`--dt-text-on-action`).
- `--dt-modifier-delta-color` and `--dt-modifier-hint-color` (`--dt-text-secondary`).
- The pill and error: `--dt-modifier-pill-bg` (`--dt-surface-sunken`), `--dt-modifier-pill-fg` (`--dt-text-secondary`), `--dt-modifier-error-color` (`--dt-text-danger`), `--dt-modifier-error-pill-bg` (`--dt-surface-danger-subtle`).

The title is `--dt-text-heading-xs-*`; option labels `--dt-text-body-md-*`. A disabled option reads `--dt-text-disabled`, `--dt-border-disabled` and `--dt-surface-disabled`.

### Accessibility
- A `<fieldset>` whose `<legend>` holds the title and the Required pill, so the group's name is "Choose a size Required".
- The controls are native radio and checkbox inputs, laid transparently over the drawn ones, so the keyboard works as it does everywhere: in single mode Tab reaches the group once and the arrow keys move and choose; in multiple mode each checkbox is a tab stop and Space toggles it. The focus ring is drawn on the visible control.
- Single mode sets `role="radiogroup"` on the fieldset, with `aria-required` and `aria-invalid` when they apply. The hint and the error are linked to the group with `aria-describedby`; the error is also a `role="alert"`, so it is announced when it appears. In multiple mode each checkbox is `aria-invalid` while there is an error.
- The price delta and the note are inside each option's label, so they are part of its name: "Large +$2.00".
- An option disabled because the limit is reached says so in its name, so a screen reader user knows why they can't choose it.
- Every row is at least a touch target tall and the whole row is the label.

### Content
- The title is a short instruction or a noun: "Choose a size", "Add extras", "Spice level".
- Option labels are nouns, sentence case: "Large", "Fried egg".
- The error says what to do: "Choose a size to continue."
- Notes are a few words: "Contains peanuts", "Sold out today".

## Props

```ts
import * as React from "react";

/** One choice in a modifier group. */
export interface ModifierOption {
  /** Unique within the group. This is what value holds. */
  id: string;
  /** The choice's name: "Large", "Extra egg". */
  label: string;
  /** Price change in major units, shown as "+$1.50". 0 or undefined shows nothing; a negative shows "−$1.00". */
  price?: number;
  /** Greys the choice out and removes it from the tab order. Say why in note. */
  disabled?: boolean;
  /** A short line under the label: "Contains peanuts", "Sold out today". */
  note?: string;
}

/** A group of options for a dish, such as "Choose a size" or "Add extras": radios or checkboxes in full-width rows. */
export interface ModifierGroupProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "onChange" | "title" | "children" | "defaultValue"> {
  /** The group's name, rendered as the fieldset's legend. */
  title: string;
  /** The choices, in order. */
  options: ModifierOption[];
  /** single: radios, one choice. multiple: checkboxes. */
  mode: "single" | "multiple";
  /** The chosen ids. Single mode uses one element (or none). Controlled. */
  value: string[];
  /** Called with the next list of chosen ids. */
  onChange: (next: string[]) => void;
  /** Shows the Required pill, and marks a single-choice group aria-required. */
  required?: boolean;
  /** Multiple mode: the fewest choices, stated in the hint. The group does not enforce it; set error when it is not met. */
  min?: number;
  /** Multiple mode: the most choices. Once reached, the other options disable, and each says why in its accessible name. */
  max?: number;
  /** An error under the title, announced when it appears and linked to the group with aria-describedby. It turns the Required pill red. */
  error?: string;
  /** Replaces the generated hint ("Choose up to 3", "Choose 1 to 3"). */
  hint?: string;
  /** ISO 4217 currency code for the price deltas. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price deltas. Defaults to the runtime's. */
  locale?: string;
  /** Text of the Required pill. @default "Required" */
  requiredLabel?: string;
  /** Added, visually hidden, to the name of an option disabled by max. @default (max) => `, limit of ${max} reached` */
  limitLabel?: (max: number) => string;
}

export declare function ModifierGroup(props: ModifierGroupProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-modifier-control-accent` | component | `var(--dt-surface-action)` |
| `--dt-modifier-control-bg` | component | `var(--dt-input-bg)` |
| `--dt-modifier-control-border` | component | `var(--dt-border-strong)` |
| `--dt-modifier-control-mark` | component | `var(--dt-text-on-action)` |
| `--dt-modifier-control-size` | component | `var(--dt-size-icon-md)` |
| `--dt-modifier-delta-color` | component | `var(--dt-text-secondary)` |
| `--dt-modifier-divider` | component | `var(--dt-border-subtle)` |
| `--dt-modifier-error-color` | component | `var(--dt-text-danger)` |
| `--dt-modifier-error-pill-bg` | component | `var(--dt-surface-danger-subtle)` |
| `--dt-modifier-hint-color` | component | `var(--dt-text-secondary)` |
| `--dt-modifier-pill-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-modifier-pill-fg` | component | `var(--dt-text-secondary)` |
| `--dt-modifier-row-min-height` | component | `var(--dt-size-touch-target)` |
| `--dt-price-color` | component | `var(--dt-text-primary)` |
| `--dt-border-disabled` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-focus-ring-color` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-focus-ring-offset` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-focus-ring-width` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-icon-xs` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-disabled` | semantic | `var(--dt-color-neutral-100)` |
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
import { Price } from "./Price.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* The rule for a multiple-choice group, in words: "Choose up to 3". */
function ruleFor(mode, min, max) {
  if (mode !== "multiple") return null;
  const hasMin = typeof min === "number" && min > 0;
  const hasMax = typeof max === "number";
  if (hasMin && hasMax) return min === max ? `Choose ${max}` : `Choose ${min} to ${max}`;
  if (hasMax) return `Choose up to ${max}`;
  if (hasMin) return `Choose at least ${min}`;
  return null;
}

const defaultLimitLabel = (max) => `, limit of ${max} reached`;

/* The drawn control. The real input sits over it, transparent, so the
   browser keeps the keyboard behaviour and the label click. */
function Mark({ single, on, off, focused }) {
  const size = "var(--dt-modifier-control-size)";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        boxSizing: "border-box", width: size, height: size,
        borderRadius: single ? "var(--dt-radius-pill)" : "calc(var(--dt-radius-control) / 2)",
        border: single && on
          ? `calc(${size} * 0.3) solid ${off ? "var(--dt-border-disabled)" : "var(--dt-modifier-control-accent)"}`
          : `var(--dt-border-width-strong) solid ${off ? "var(--dt-border-disabled)" : on ? "var(--dt-modifier-control-accent)" : "var(--dt-modifier-control-border)"}`,
        background: off
          ? "var(--dt-surface-disabled)"
          : !single && on ? "var(--dt-modifier-control-accent)" : "var(--dt-modifier-control-bg)",
        color: "var(--dt-modifier-control-mark)",
        outline: focused ? "var(--dt-focus-ring-width) solid var(--dt-focus-ring-color)" : "none",
        outlineOffset: "var(--dt-focus-ring-offset)",
        transition: "background var(--dt-motion-micro), border var(--dt-motion-micro)",
      }}
    >
      {!single && on && (
        <svg
          viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ display: "block", width: "var(--dt-size-icon-xs)", height: "var(--dt-size-icon-xs)" }}
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

export function ModifierGroup({
  title,
  options = [],
  mode = "single",
  value = [],
  onChange,
  required = false,
  min,
  max,
  error,
  hint,
  currency = "USD",
  locale,
  requiredLabel = "Required",
  limitLabel = defaultLimitLabel,
  style,
  ...rest
}) {
  const uid = React.useId();
  const name = `${uid}-choice`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const [focused, setFocused] = React.useState(null);
  const single = mode !== "multiple";
  const chosen = Array.isArray(value) ? value : [];
  const atMax = !single && typeof max === "number" && chosen.length >= max;
  const rule = hint || ruleFor(mode, min, max);
  const describedBy = [rule && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  const pick = (id) => {
    if (!onChange) return;
    if (single) {
      if (chosen[0] !== id || chosen.length !== 1) onChange([id]);
      return;
    }
    if (chosen.includes(id)) onChange(chosen.filter((v) => v !== id));
    else if (!atMax) onChange([...chosen, id]);
  };

  const onFocus = (e, id) => {
    let visible = true;
    try { visible = e.currentTarget.matches(":focus-visible"); } catch (err) { visible = true; }
    setFocused(visible ? id : null);
  };

  return (
    <fieldset
      role={single ? "radiogroup" : undefined}
      aria-required={single && required ? true : undefined}
      aria-invalid={single && error ? true : undefined}
      aria-describedby={describedBy}
      style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: "flex", flexDirection: "column", ...style }}
      {...rest}
    >
      <legend style={{ padding: 0, width: "100%", float: "left" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)" }}>
          <span style={{ ...role("heading-xs"), color: "var(--dt-text-primary)", minWidth: 0, overflowWrap: "anywhere" }}>{title}</span>
          {required && (
            <span
              style={{
                ...role("label-sm"), flex: "none", whiteSpace: "nowrap",
                padding: "0 var(--dt-space-inset-xs)", borderRadius: "var(--dt-radius-pill)",
                background: error ? "var(--dt-modifier-error-pill-bg)" : "var(--dt-modifier-pill-bg)",
                color: error ? "var(--dt-modifier-error-color)" : "var(--dt-modifier-pill-fg)",
              }}
            >
              {requiredLabel}
            </span>
          )}
        </span>
      </legend>
      {/* The float above takes the legend out of the fieldset's border
          layout, so it lays out like any other block; this clears it. */}
      <span aria-hidden="true" style={{ display: "block", clear: "both" }} />
      {rule && (
        <p id={hintId} style={{ ...role("body-sm"), margin: "var(--dt-space-stack-2xs) 0 0", color: "var(--dt-modifier-hint-color)" }}>{rule}</p>
      )}
      {error && (
        <p id={errorId} role="alert" style={{ ...role("body-sm"), margin: "var(--dt-space-stack-2xs) 0 0", color: "var(--dt-modifier-error-color)" }}>{error}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", marginTop: "var(--dt-space-stack-2xs)" }}>
        {options.map((opt, i) => {
          const on = single ? chosen[0] === opt.id : chosen.includes(opt.id);
          const limited = !single && atMax && !on && !opt.disabled;
          const off = !!opt.disabled || limited;
          const delta = typeof opt.price === "number" && opt.price !== 0 ? opt.price : null;
          const inputId = `${uid}-${i}`;
          return (
            <label
              key={opt.id}
              htmlFor={inputId}
              style={{
                display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
                minHeight: "var(--dt-modifier-row-min-height)", boxSizing: "border-box",
                padding: "var(--dt-space-inset-xs) 0",
                borderTop: i > 0 ? "var(--dt-border-width-default) solid var(--dt-modifier-divider)" : undefined,
                cursor: off ? "not-allowed" : "pointer",
                color: off ? "var(--dt-text-disabled)" : "var(--dt-text-primary)",
              }}
            >
              <span style={{ position: "relative", flex: "none", display: "flex" }}>
                <input
                  id={inputId}
                  type={single ? "radio" : "checkbox"}
                  name={name}
                  value={opt.id}
                  checked={on}
                  disabled={off}
                  aria-invalid={!single && error ? true : undefined}
                  onChange={() => pick(opt.id)}
                  onFocus={(e) => onFocus(e, opt.id)}
                  onBlur={() => setFocused(null)}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "inherit" }}
                />
                <Mark single={single} on={on} off={off} focused={focused === opt.id} />
              </span>
              <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ ...role("body-md"), overflowWrap: "anywhere" }}>
                  {opt.label}
                  {limited && <VisuallyHidden>{limitLabel(max)}</VisuallyHidden>}
                </span>
                {opt.note && (
                  <span style={{ ...role("body-xs"), color: off ? "var(--dt-text-disabled)" : "var(--dt-text-secondary)" }}>{opt.note}</span>
                )}
              </span>
              {delta != null && (
                <span
                  style={{
                    flex: "none", display: "inline-flex", alignItems: "baseline",
                    ...role("label-md"),
                    color: off ? "var(--dt-text-disabled)" : "var(--dt-modifier-delta-color)",
                    "--dt-price-color": off ? "var(--dt-text-disabled)" : "var(--dt-modifier-delta-color)",
                  }}
                >
                  {delta > 0 ? "+" : "−"}
                  <Price amount={Math.abs(delta)} currency={currency} locale={locale} size="sm" />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
```
