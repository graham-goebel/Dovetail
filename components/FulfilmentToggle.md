# FulfilmentToggle

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [FulfilmentToggle.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/FulfilmentToggle.jsx), [FulfilmentToggle.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/FulfilmentToggle.d.ts), [FulfilmentToggle.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/FulfilmentToggle.md).

Live page: https://graham-goebel.github.io/Dovetail/components/FulfilmentToggle.html

## Guidelines

A segmented control for how an order reaches its buyer, delivery or pickup, with radio semantics and an optional detail line under each segment.

### Use it when
- A store page or checkout lets people switch between delivery and pickup, and the page's times and fees depend on the choice.
- There are two or three ways to receive an order: add "Dine in" through `options`.

### Don't use it when
- It switches views of content. Use `Tabs`.
- There are more than three choices, or the choices need descriptions. Use `RadioGroup`.
- It is an on/off setting. Use `Switch`.

### Example
```jsx
const [how, setHow] = React.useState("delivery");

<FulfilmentToggle
  label="How to get your order"
  value={how}
  onChange={setHow}
  options={[
    { value: "delivery", label: "Delivery", detail: "25–35 min" },
    { value: "pickup", label: "Pickup", detail: "Ready in 15" },
  ]}
/>
```

### Variants
| Prop | What it is for |
|---|---|
| `options` | The segments. Defaults to Delivery and Pickup with no detail. Each takes a `detail` line for a time or a fee. |
| `fullWidth` | On by default: the segments share the container's width, which is what a phone wants. `false` sizes it to its segments. |
| `disabled` | Turns every segment off, for a store that offers only one way. Prefer hiding the toggle when there is no choice. |

### Composition
Sits under the `StoreHeader` on a store page, or at the top of a checkout. Controlled: the choice lives in your app, which changes the `deliveryTime` and `deliveryFee` it passes to `StoreHeader` and the totals it shows.

### Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- `--dt-fulfilment-track-bg` (`--dt-surface-sunken`), `--dt-fulfilment-thumb-bg` (`--dt-surface-raised`), `--dt-fulfilment-thumb-shadow` (`--dt-elevation-1`).
- `--dt-fulfilment-fg` (`--dt-text-secondary`), `--dt-fulfilment-fg-selected` (`--dt-text-primary`), `--dt-fulfilment-detail-color` (`--dt-text-tertiary`), `--dt-fulfilment-detail-color-selected` (`--dt-text-secondary`).
- `--dt-fulfilment-inset` (`--dt-space-inset-2xs`), `--dt-fulfilment-radius` (`--dt-radius-container`), `--dt-fulfilment-thumb-radius` (`--dt-radius-media`).

Each segment is at least `--dt-size-touch-target` tall. The label is `--dt-text-label-md-*`, semibold when chosen; the detail is `--dt-text-body-xs-*`. Motion is `--dt-motion-micro`, which is instant under reduced motion.

### Accessibility
- A `role="radiogroup"` named by the required `label`; each segment is a `role="radio"` button with `aria-checked`.
- One tab stop, on the chosen segment. The arrow keys move and choose together and wrap at the ends; Home and End jump to the first and last; in a right-to-left page the horizontal arrows follow the reading direction.
- The chosen segment is marked by a raised surface and a heavier label, and announced as checked.
- The detail line is part of each segment's name: "Delivery 25–35 min".

### Content
- Labels are one word, sentence case: "Delivery", "Pickup", "Dine in".
- Details are short and concrete: "25–35 min", "Ready in 15", "Free".
- The group `label` is a question or a noun phrase: "How to get your order".

## Props

```ts
import * as React from "react";

/** One way to receive the order. */
export interface FulfilmentOption {
  /** The value reported to onChange. Unique within the toggle. */
  value: string;
  /** The segment's label: "Delivery", "Pickup", "Dine in". */
  label: string;
  /** A short second line under the label: "25–35 min", "Ready in 15". */
  detail?: string;
}

/** Delivery or pickup: a segmented control with radio semantics, full width by default. */
export interface FulfilmentToggleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "role" | "children" | "defaultValue"> {
  /** The chosen option's value. Controlled. With the default options, "delivery" or "pickup". */
  value: "delivery" | "pickup" | (string & {});
  /** Called with the newly chosen value, from a click or an arrow key. */
  onChange: (value: string) => void;
  /** The radio group's accessible name, e.g. "How to get your order". */
  label: string;
  /** The segments. @default [{ value: "delivery", label: "Delivery" }, { value: "pickup", label: "Pickup" }] */
  options?: FulfilmentOption[];
  /** Fill the container's width. false sizes it to its segments. @default true */
  fullWidth?: boolean;
  /** Disables every segment. */
  disabled?: boolean;
}

export declare function FulfilmentToggle(props: FulfilmentToggleProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-fulfilment-detail-color` | component | `var(--dt-text-tertiary)` |
| `--dt-fulfilment-detail-color-selected` | component | `var(--dt-text-secondary)` |
| `--dt-fulfilment-fg` | component | `var(--dt-text-secondary)` |
| `--dt-fulfilment-fg-selected` | component | `var(--dt-text-primary)` |
| `--dt-fulfilment-inset` | component | `var(--dt-space-inset-2xs)` |
| `--dt-fulfilment-radius` | component | `var(--dt-radius-container)` |
| `--dt-fulfilment-thumb-bg` | component | `var(--dt-surface-raised)` |
| `--dt-fulfilment-thumb-radius` | component | `var(--dt-radius-media)` |
| `--dt-fulfilment-thumb-shadow` | component | `var(--dt-elevation-1)` |
| `--dt-fulfilment-track-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-size-touch-target` | semantic | `var(--dt-dim-11)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
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
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

const DEFAULT_OPTIONS = [
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
];

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* A segmented control with radio semantics: one tab stop, on the chosen
   segment, and arrow keys that move and choose together, the way a native
   radio group behaves. */
export function FulfilmentToggle({
  value,
  onChange,
  label,
  options = DEFAULT_OPTIONS,
  fullWidth = true,
  disabled = false,
  style,
  ...rest
}) {
  const refs = React.useRef([]);
  const [hover, setHover] = React.useState(null);
  const index = options.findIndex((o) => o.value === value);
  const tabStop = index >= 0 ? index : 0;

  const choose = (i) => {
    const opt = options[i];
    if (!opt || disabled) return;
    if (opt.value !== value) onChange && onChange(opt.value);
    const el = refs.current[i];
    if (el) el.focus();
  };

  const onKeyDown = (e, i) => {
    const rtl = !!(e.currentTarget.closest && e.currentTarget.closest('[dir="rtl"]'));
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const n = options.length;
    let next = null;
    if (e.key === fwd || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === back || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === " " || e.key === "Enter") next = i;
    if (next == null) return;
    e.preventDefault();
    choose(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      style={{
        display: fullWidth ? "grid" : "inline-grid",
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        gap: "var(--dt-fulfilment-inset)",
        boxSizing: "border-box",
        width: fullWidth ? "100%" : undefined,
        padding: "var(--dt-fulfilment-inset)",
        borderRadius: "var(--dt-fulfilment-radius)",
        background: "var(--dt-fulfilment-track-bg)",
        ...style,
      }}
      {...rest}
    >
      {options.map((opt, i) => {
        const on = i === index;
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => choose(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              appearance: "none", border: 0, margin: 0, minWidth: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 0,
              minHeight: "var(--dt-size-touch-target)",
              padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm)",
              borderRadius: "var(--dt-fulfilment-thumb-radius)",
              background: on ? "var(--dt-fulfilment-thumb-bg)" : "transparent",
              boxShadow: on ? "var(--dt-fulfilment-thumb-shadow)" : "none",
              color: disabled
                ? "var(--dt-text-disabled)"
                : on || hover === i ? "var(--dt-fulfilment-fg-selected)" : "var(--dt-fulfilment-fg)",
              cursor: disabled ? "not-allowed" : "pointer",
              textAlign: "center",
              transition: "background var(--dt-motion-micro), box-shadow var(--dt-motion-micro), color var(--dt-motion-micro)",
            }}
          >
            <span style={{ ...role("label-md"), fontWeight: on ? "var(--dt-font-weight-semibold)" : "var(--dt-text-label-md-weight)",maxWidth: "100%", overflowWrap: "anywhere" }}>
              {opt.label}
            </span>
            {opt.detail && (
              <span
                style={{
                  ...role("body-xs"), maxWidth: "100%", overflowWrap: "anywhere",
                  color: disabled
                    ? "var(--dt-text-disabled)"
                    : on ? "var(--dt-fulfilment-detail-color-selected)" : "var(--dt-fulfilment-detail-color)",
                }}
              >
                {opt.detail}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```
