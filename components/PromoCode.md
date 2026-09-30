# PromoCode

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [PromoCode.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/PromoCode.jsx), [PromoCode.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/PromoCode.d.ts), [PromoCode.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/PromoCode.md).

Live page: https://graham-goebel.github.io/Dovetail/components/PromoCode.html

## Guidelines

A field for a promo, discount or gift code, with an Apply button. It starts as a "Have a promo code?" disclosure so it doesn't tempt people without a code to leave and search for one, shows the server's error under the field, and replaces the field with a removable chip once a code is applied. It is presentational and controlled: it never validates a code or calls a server; `onApply` hands the code to your app, and you pass back `loading`, `error` or `applied`.

### Use it when
- A cart or checkout accepts discount or gift codes: in the `OrderSummary` footer, or under the cart lines.
- One code at a time is in effect, and the customer should see which and be able to remove it.

### Don't use it when
- The code is a gift card balance with a PIN and an amount to apply. Build a form from `Input` fields.
- Several codes stack. Show each applied code as its own chip and keep a separate field, or extend this per product need.
- It is any other one-field form (a newsletter signup, a search). Use `Input` with a `Button`.

### Example
```jsx
const [code, setCode] = React.useState("");
const [state, setState] = React.useState({});

<PromoCode
  value={code}
  onChange={setCode}
  onApply={async (c) => {
    setState({ loading: true });
    const res = await cart.applyCode(c);
    setState(res.ok ? { applied: { code: res.code, description: res.summary } } : { error: res.message });
  }}
  applied={state.applied}
  onRemove={() => { cart.removeCode(); setState({}); setCode(""); }}
  error={state.error}
  loading={state.loading}
/>
```

### Variants
| State | How you get it | What shows |
|---|---|---|
| Collapsed | Default (`collapsible` true), no value or error | A link-style "Have a promo code?" button with `aria-expanded="false"`. |
| Open | Press the disclosure, or `collapsible={false}`, or a non-empty `value` | The labelled field and an Apply button (secondary). Focus moves to the field when the user opens it. |
| Error | `error` | The field is marked `aria-invalid` with the error under it, and stays open. |
| Loading | `loading` | The Apply button shows a spinner and is disabled; Enter does nothing until it clears. |
| Applied | `applied` | A chip with a tag icon, the code and its `description`, and a remove button when `onRemove` is given. The field is hidden. |

Labels are props for translation: `label` ("Promo code"), `toggleLabel` ("Have a promo code?"), `applyLabel` ("Apply").

### Composition
Put it in the `footer` of an `OrderSummary`, above the checkout `Button`, or under the lines in a cart `Drawer`. It uses `Input` for the field and `Button` for Apply, so both follow the input and button tokens. When a code is applied, show its effect as a `kind: "discount"` line in the `OrderSummary`.

### Tokens
Tier 3, in `tokens/component/commerce.css`, repeated under `.dark`:
- `--dt-promo-chip-bg` (`--dt-surface-success-subtle`), `--dt-promo-chip-border` (`--dt-border-success`), `--dt-promo-chip-fg` (`--dt-text-primary`): the applied chip.
- `--dt-promo-chip-icon` (`--dt-text-success`): its tag icon.
- `--dt-promo-chip-description` (`--dt-text-secondary`): the description beside the code.

The disclosure button reads `--dt-text-link` and `--dt-text-label-md-*`; the chip's remove button reads `--dt-button-ghost-bg` and `--dt-button-ghost-bg-hover`. The field and Apply read the `--dt-input-*` and `--dt-button-*` tokens.

### Accessibility
- The disclosure is a real `<button>` with `aria-expanded` and `aria-controls` pointing at the field's panel. Opening it moves focus into the field.
- The field has a visible `<label>`. Enter in the field applies the code (and does not submit the surrounding form); Apply does the same.
- An error shows under the field with `role="alert"`, so it is announced when it appears, and the field is `aria-invalid`.
- The applied chip sits in an `aria-live="polite"` region and reads "Code SUMMER10 applied: 10% off". Its remove button is named "Remove code SUMMER10". After removing, focus moves to the field, so it is not lost to the page.

### Content
- Error messages say what happened and what to do, in sentence case: "This code has expired", "Enter a code to apply it". The server's wording is fine if it follows this.
- `description` is what the code does, short: "10% off", "Free shipping", "$5 off orders over $50".
- Keep the disclosure a question: "Have a promo code?", "Have a gift card?".

## Props

```ts
import * as React from "react";

/** A promo or gift code field with an Apply button, a disclosure to reveal it, and a removable chip once a code is applied. */
export interface PromoCodeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "children"> {
  /** What is typed in the field. Controlled. */
  value: string;
  /** Called with the field's new text. */
  onChange: (value: string) => void;
  /** Called with the trimmed code when Apply is pressed or Enter is pressed in the field. Not called when the field is empty or loading. */
  onApply: (code: string) => void;
  /** The code in effect. Replaces the field with a chip showing the code and its description. */
  applied?: {
    /** The code as the customer should see it, e.g. "SUMMER10". */
    code: string;
    /** What it does: "10% off", "Free shipping". */
    description?: string;
  };
  /** Removes the applied code. Adds a remove button, named "Remove code SUMMER10", to the chip; focus moves to the field afterwards. */
  onRemove?: () => void;
  /** Why the code was not accepted. Shows under the field, which stays open while it is set. */
  error?: string;
  /** Checking the code: the Apply button shows a spinner and Apply does nothing until it clears. @default false */
  loading?: boolean;
  /** The field's visible label. @default "Promo code" */
  label?: string;
  /** Starts as a "Have a promo code?" disclosure button that reveals the field. false shows the field at once. @default true */
  collapsible?: boolean;
  /** Text of the disclosure button. @default "Have a promo code?" */
  toggleLabel?: string;
  /** Text of the apply button. @default "Apply" */
  applyLabel?: string;
  /** id of the text field. Generated when omitted. */
  id?: string;
}

export declare function PromoCode(props: PromoCodeProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-button-ghost-bg` | component | `var(--dt-surface-action-ghost)` |
| `--dt-button-ghost-bg-hover` | component | `var(--dt-surface-action-ghost-hover)` |
| `--dt-input-label-gap` | component | `var(--dt-space-stack-2xs)` |
| `--dt-promo-chip-bg` | component | `var(--dt-surface-success-subtle)` |
| `--dt-promo-chip-border` | component | `var(--dt-border-success)` |
| `--dt-promo-chip-description` | component | `var(--dt-text-secondary)` |
| `--dt-promo-chip-fg` | component | `var(--dt-text-primary)` |
| `--dt-promo-chip-icon` | component | `var(--dt-text-success)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-size-control-xs` | semantic | `var(--dt-dim-6)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
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
import { Button } from "../actions/Button.jsx";
import { Input } from "../forms/Input.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

function Icon({ paths, size = "var(--dt-size-icon-sm)" }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: size, height: size }}
    >
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const TAG = ["M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z", "M7.5 7.5h.01"];
const CLOSE = ["M18 6 6 18", "m6 6 12 12"];
const CHEVRON = ["m6 9 6 6 6-6"];

export function PromoCode({
  value,
  onChange,
  onApply,
  applied,
  onRemove,
  error,
  loading = false,
  label = "Promo code",
  collapsible = true,
  toggleLabel = "Have a promo code?",
  applyLabel = "Apply",
  id,
  style,
  ...rest
}) {
  const auto = React.useId();
  const inputId = id || auto + "-input";
  const panelId = auto + "-panel";
  const [open, setOpen] = React.useState(() => !collapsible || !!error || !!value);
  const [removeHover, setRemoveHover] = React.useState(false);
  /* Set when the user opens the field or removes a code, so focus follows
     them to the field once it is on the page. */
  const focusNext = React.useRef(false);
  const shown = !collapsible || open || !!error;

  React.useEffect(() => {
    if (!focusNext.current || applied || !shown) return;
    focusNext.current = false;
    const el = document.getElementById(inputId);
    if (el) el.focus();
  });

  const apply = () => {
    const code = (value || "").trim();
    if (!code || loading) return;
    onApply(code);
  };

  const remove = () => {
    focusNext.current = true;
    setOpen(true);
    if (onRemove) onRemove();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)", minWidth: 0, ...style }} {...rest}>
      {/* Always on the page, so a code that becomes applied is announced.
          Empty, it is taken out of the flow so it adds no gap. */}
      <div aria-live="polite" style={applied ? { display: "flex" } : { position: "absolute" }}>
        {applied && (
          <span
            style={{
              display: "inline-flex", alignItems: "center", flexWrap: "wrap", maxWidth: "100%", boxSizing: "border-box",
              columnGap: "var(--dt-space-inline-xs)",
              minHeight: "var(--dt-size-control-sm)",
              paddingInlineStart: "var(--dt-space-inset-sm)",
              paddingInlineEnd: onRemove ? "var(--dt-space-inset-2xs)" : "var(--dt-space-inset-sm)",
              borderRadius: "var(--dt-radius-pill)",
              border: "var(--dt-border-width-default) solid var(--dt-promo-chip-border)",
              background: "var(--dt-promo-chip-bg)", color: "var(--dt-promo-chip-fg)",
            }}
          >
            <span style={{ color: "var(--dt-promo-chip-icon)" }}><Icon paths={TAG} /></span>
            <span style={{ ...role("label-md"), overflowWrap: "anywhere" }}>
              <VisuallyHidden>Code </VisuallyHidden>
              {applied.code}
              <VisuallyHidden> applied</VisuallyHidden>
            </span>
            {applied.description && (
              <span style={{ ...role("body-xs"), color: "var(--dt-promo-chip-description)" }}>
                <VisuallyHidden>: </VisuallyHidden>
                {applied.description}
              </span>
            )}
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove code ${applied.code}`}
                title={`Remove code ${applied.code}`}
                onClick={remove}
                onMouseEnter={() => setRemoveHover(true)}
                onMouseLeave={() => setRemoveHover(false)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
                  width: "var(--dt-size-control-xs)", height: "var(--dt-size-control-xs)", padding: 0, border: 0,
                  borderRadius: "var(--dt-radius-pill)", cursor: "pointer", color: "inherit",
                  background: removeHover ? "var(--dt-button-ghost-bg-hover)" : "var(--dt-button-ghost-bg)",
                  transition: "background var(--dt-motion-micro)",
                }}
              >
                <Icon paths={CLOSE} />
              </button>
            )}
          </span>
        )}
      </div>

      {!applied && collapsible && (
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={panelId}
          onClick={() => {
            focusNext.current = !shown;
            setOpen(!shown);
          }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", alignSelf: "flex-start",
            padding: 0, border: 0, background: "none", cursor: "pointer",
            ...role("label-md"), color: "var(--dt-text-link)",
            textDecoration: "underline", textUnderlineOffset: "var(--dt-space-inline-2xs)",
          }}
        >
          {toggleLabel}
          <span style={{ display: "flex", transform: shown ? "rotate(180deg)" : undefined, transition: "transform var(--dt-motion-micro)" }}>
            <Icon paths={CHEVRON} />
          </span>
        </button>
      )}

      {!applied && shown && (
        <div id={panelId} style={{ display: "flex", flexDirection: "column", gap: "var(--dt-input-label-gap)" }}>
          <label htmlFor={inputId} style={{ ...role("label-md"), color: "var(--dt-text-primary)" }}>{label}</label>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--dt-space-inline-xs)" }}>
            <Input
              id={inputId}
              value={value}
              error={error}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                apply();
              }}
              style={{ flex: "1 1 auto", minWidth: 0 }}
            />
            <Button variant="secondary" loading={loading} onClick={apply} style={{ flex: "none" }}>
              {applyLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```
