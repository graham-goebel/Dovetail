# QuantityStepper

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [QuantityStepper.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/QuantityStepper.jsx), [QuantityStepper.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/QuantityStepper.d.ts), [QuantityStepper.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/QuantityStepper.md).

Live page: https://graham-goebel.github.io/Dovetail/components/QuantityStepper.html

## Guidelines

A − value + control for choosing how many of something: a cart line, a menu item, a ticket count. The value can also be typed.

### Use it when
- The quantity is small and usually changes by one: cart lines, menu items, seats, tickets.
- A cart line should be removable from the same control: pass `onRemove`, and at the minimum the minus button becomes a remove button.

### Don't use it when
- The number is large or rarely nudged (an amount of money, a year). Use `Input` with `type="number"` or `inputMode="numeric"`.
- The value is approximate. Use `Slider`.
- There are a few named options (Small, Medium, Large). Use `RadioGroup` or `ButtonGroup`.

### Example
```jsx
<QuantityStepper label="Quantity" value={qty} onChange={setQty} max={10} />

{/* Cart line: at 1 the minus becomes a remove button */}
<QuantityStepper
  label="Quantity, oat latte"
  removeLabel="Remove oat latte"
  value={line.qty}
  onChange={(qty) => update(line.id, qty)}
  onRemove={() => remove(line.id)}
  size="sm"
/>
```

### Variants
| Prop | What it is for |
|---|---|
| `size="md"` | Default, 40px: product pages and menus, touch-first. |
| `size="sm"` | 32px: cart lines and dense lists. |
| `min` / `max` / `step` | Limits and increment. `min` defaults to 1 and `step` to 1; with no `max` there is no upper limit. Typed values are snapped to the step grid counted from `min`, then clamped. |
| `onRemove` | At `min`, the minus button shows a trash icon, is named `removeLabel` ("Remove") and calls `onRemove` instead of stepping. |
| `disabled` | Both buttons and the field are disabled. |

The stepper is controlled: it shows `value` and calls `onChange(next)` with a value already clamped and snapped. It never calls `onChange` with the current value.

### Composition
Inline. It sits at the end of a cart line or menu row, beside a `Price`, or under a product's options on a product page. For a visible label, put a `<label htmlFor>` pointing at `id` (the value field's id) or use it inside a `Field` with `htmlFor`.

### Tokens
No Tier 3 tokens of its own: it is a field, so it reads the input tokens and the ghost button tokens, and restyling those restyles it with the rest of the form.
- Frame: `--dt-input-height-sm|md`, `--dt-input-radius`, `--dt-input-border-width`, `--dt-input-border`, `--dt-input-bg`, and `--dt-input-border-disabled` / `--dt-input-bg-disabled` when disabled.
- Value: `--dt-input-fg` (`--dt-input-fg-disabled`), type from `--dt-text-label-md-*` (sm) or `--dt-text-label-lg-*` (md), tabular figures.
- Buttons: `--dt-button-ghost-bg`, `--dt-button-ghost-bg-hover`, `--dt-button-ghost-fg`, `--dt-button-transition`; `--dt-text-disabled` at a limit. Icons read `--dt-size-icon-sm|md`.

### Accessibility
- The value is an `<input role="spinbutton">` named by `label`, with `aria-valuenow`, `aria-valuemin` and (when `max` is set) `aria-valuemax`, and `inputMode="numeric"` for a number keypad on phones. The whole control is a `role="group"` with the same name.
- **Keyboard, in the field:** ArrowUp and ArrowDown add or take away one step; PageUp and PageDown ten steps; Home jumps to `min` and End to `max` (when set). Typing a number commits on Enter or on blur, clamped and snapped; Escape abandons what was typed. ArrowDown at the minimum never removes the line; removing takes the button.
- **Buttons:** named "Decrease quantity" and "Increase quantity" by default (`decreaseLabel`, `increaseLabel`). In a cart with several lines, pass names that include the item ("Increase oat latte") so a screen-reader user moving between buttons knows which line they are on. At a limit a button is `aria-disabled` rather than `disabled`, so the focus stays on it when a click reaches the limit instead of dropping to the page.
- The remove button is named `removeLabel`, "Remove" by default; pass the item name here too.
- `label` is required in the types. There is no visible label; the context (a cart line's title) is the visual one.

### Content
- `label` is sentence case and names the thing counted: "Quantity", "Tickets", "Quantity, oat latte".
- Button labels are verb-first: "Increase quantity", "Remove oat latte".

## Props

```ts
import * as React from "react";

/** A − value + control for a quantity, for cart lines and menus. */
export interface QuantityStepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** The current quantity. The stepper is controlled: it shows this value and reports changes. */
  value: number;
  /** Called with the next quantity, already clamped to min and max and snapped to step. */
  onChange: (next: number) => void;
  /** The accessible name of the group and the value field, e.g. "Quantity" or "Quantity, oat latte". */
  label: string;
  /** Lowest value. The minus button stops here, or becomes a remove button when onRemove is given. @default 1 */
  min?: number;
  /** Highest value. No upper limit when omitted. */
  max?: number;
  /** Amount each press or arrow key adds or takes away. PageUp and PageDown move ten steps. @default 1 */
  step?: number;
  /** @default "md" */
  size?: "sm" | "md";
  /** Disables both buttons and the field. */
  disabled?: boolean;
  /** When given, the minus button becomes a remove button (trash icon) at min, and pressing it calls this. */
  onRemove?: () => void;
  /** Accessible name of the minus button. @default "Decrease quantity" */
  decreaseLabel?: string;
  /** Accessible name of the plus button. @default "Increase quantity" */
  increaseLabel?: string;
  /** Accessible name of the remove button, e.g. "Remove oat latte". @default "Remove" */
  removeLabel?: string;
  /** id of the value field, for an external label's htmlFor. Generated when omitted. */
  id?: string;
}

export declare function QuantityStepper(props: QuantityStepperProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-button-ghost-bg` | component | `var(--dt-surface-action-ghost)` |
| `--dt-button-ghost-bg-hover` | component | `var(--dt-surface-action-ghost-hover)` |
| `--dt-button-ghost-fg` | component | `var(--dt-text-on-action-ghost)` |
| `--dt-button-transition` | component | `var(--dt-motion-micro)` |
| `--dt-input-bg` | component | `var(--dt-surface-base)` |
| `--dt-input-bg-disabled` | component | `var(--dt-surface-disabled)` |
| `--dt-input-border` | component | `var(--dt-border-default)` |
| `--dt-input-border-disabled` | component | `var(--dt-border-disabled)` |
| `--dt-input-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-input-fg` | component | `var(--dt-text-primary)` |
| `--dt-input-fg-disabled` | component | `var(--dt-text-disabled)` |
| `--dt-input-height-md` | component | `var(--dt-size-control-md)` |
| `--dt-input-height-sm` | component | `var(--dt-size-control-sm)` |
| `--dt-input-radius` | component | `var(--dt-radius-control)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
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

## Source

```jsx
import React from "react";

const ICONS = {
  minus: ["M5 12h14"],
  plus: ["M5 12h14", "M12 5v14"],
  trash: ["M3 6h18", "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", "M10 11v6", "M14 11v6"],
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

const SIZES = {
  sm: { height: "var(--dt-input-height-sm)", icon: "var(--dt-size-icon-sm)", text: "label-md" },
  md: { height: "var(--dt-input-height-md)", icon: "var(--dt-size-icon-md)", text: "label-lg" },
};

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  max,
  step = 1,
  size = "md",
  disabled = false,
  onRemove,
  decreaseLabel = "Decrease quantity",
  increaseLabel = "Increase quantity",
  removeLabel = "Remove",
  id,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const auto = React.useId();
  const inputId = id || auto;
  const [draft, setDraft] = React.useState(null);
  const [hover, setHover] = React.useState(null);

  const top = typeof max === "number" ? max : Infinity;
  /* Onto the step grid counted from min, then inside the limits. */
  const clamp = (n) => {
    const snapped = min + Math.round((n - min) / step) * step;
    return Math.min(Math.max(snapped, min), top);
  };
  const commit = (n) => {
    setDraft(null);
    const next = clamp(n);
    if (next !== value) onChange(next);
  };
  /* What is typed counts once it is committed; until then a step starts from
     it, so typing 4 and pressing ArrowUp gives 5. */
  const current = () => {
    if (draft == null) return value;
    const typed = Number(draft.replace(/[^\d.-]/g, ""));
    return draft.trim() === "" || Number.isNaN(typed) ? value : typed;
  };

  const atMin = value <= min;
  const atMax = value >= top;
  const removing = !!onRemove && atMin;
  const decOff = disabled || (atMin && !removing);
  const incOff = disabled || atMax;

  const onKeyDown = (e) => {
    if (disabled) return;
    const big = step * 10;
    let next = null;
    if (e.key === "ArrowUp") next = current() + step;
    else if (e.key === "ArrowDown") next = current() - step;
    else if (e.key === "PageUp") next = current() + big;
    else if (e.key === "PageDown") next = current() - big;
    else if (e.key === "Home") next = min;
    else if (e.key === "End" && top !== Infinity) next = top;
    else if (e.key === "Enter") next = current();
    else if (e.key === "Escape" && draft != null) { e.preventDefault(); setDraft(null); return; }
    if (next == null) return;
    e.preventDefault();
    commit(next);
  };

  /* The limit buttons stay focusable (aria-disabled, not disabled), so focus
     is not dropped to the page when a click reaches the limit. */
  const button = (kind, off, onPress, ariaLabel, icon) => (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-disabled={off && !disabled ? true : undefined}
      aria-controls={inputId}
      disabled={disabled}
      onClick={() => { if (!off) onPress(); }}
      onMouseEnter={() => setHover(kind)}
      onMouseLeave={() => setHover(null)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
        width: s.height, height: "100%", padding: 0, border: 0,
        borderRadius: "var(--dt-input-radius)",
        background: hover === kind && !off ? "var(--dt-button-ghost-bg-hover)" : "var(--dt-button-ghost-bg)",
        color: off ? "var(--dt-text-disabled)" : "var(--dt-button-ghost-fg)",
        cursor: off ? "not-allowed" : "pointer",
        transition: "background var(--dt-button-transition), color var(--dt-button-transition)",
      }}
    >
      <Icon name={icon} size={s.icon} />
    </button>
  );

  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "inline-flex", alignItems: "stretch", boxSizing: "border-box",
        height: s.height,
        border: `var(--dt-input-border-width) solid ${disabled ? "var(--dt-input-border-disabled)" : "var(--dt-input-border)"}`,
        borderRadius: "var(--dt-input-radius)",
        background: disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
        ...style,
      }}
      {...rest}
    >
      {removing
        ? button("dec", decOff, onRemove, removeLabel, "trash")
        : button("dec", decOff, () => commit(value - step), decreaseLabel, "minus")}
      <input
        id={inputId}
        type="text"
        role="spinbutton"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={top === Infinity ? undefined : top}
        disabled={disabled}
        value={draft != null ? draft : String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft != null) commit(current()); }}
        onKeyDown={onKeyDown}
        style={{
          width: s.height, minWidth: 0, flex: "none", padding: 0, margin: 0, border: 0,
          background: "transparent", textAlign: "center",
          fontFamily: `var(--dt-text-${s.text}-family)`, fontSize: `var(--dt-text-${s.text}-size)`,
          fontWeight: `var(--dt-text-${s.text}-weight)`, lineHeight: `var(--dt-text-${s.text}-line)`,
          fontVariantNumeric: "tabular-nums",
          color: disabled ? "var(--dt-input-fg-disabled)" : "var(--dt-input-fg)",
          borderRadius: "var(--dt-input-radius)",
        }}
      />
      {button("inc", incOff, () => commit(value + step), increaseLabel, "plus")}
    </div>
  );
}
```
