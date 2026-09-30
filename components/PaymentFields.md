# PaymentFields

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [PaymentFields.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/PaymentFields.jsx), [PaymentFields.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/PaymentFields.d.ts), [PaymentFields.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/PaymentFields.md).

Live page: https://graham-goebel.github.io/Dovetail/components/PaymentFields.html

## Guidelines

Card entry fields (number, expiry, security code and name) that format as the user types and label the card brand. This is the UI only.

> **For real payments, use your payment provider's hosted fields** (Stripe Elements, Adyen Web Components, Braintree Hosted Fields). Hosted fields keep card data out of your pages and servers, which keeps your PCI DSS scope at its smallest (SAQ A). Raw card fields put your page in scope. Use `PaymentFields` only for providers that accept raw fields and where you have accepted that scope, for prototypes and demos, or with test card numbers.

The component is presentational and controlled: it never stores, logs or sends the values. It holds no card data in state; it formats what it is given, reports each change through `onChange`, and what happens to the value is entirely your code's.

### Use it when
- Prototyping or demoing a checkout with test cards.
- Your provider takes raw card fields and you have taken on the PCI scope that comes with them.
- You want the house layout and labels around a provider that renders its own inputs: copy the layout, not the inputs.

### Don't use it when
- You take real card payments through Stripe, Adyen, Braintree or similar. Use their hosted fields.
- You take wallets (Apple Pay, Google Pay) or bank payments. Use the provider's buttons.
- You need to validate a card. It checks nothing: no Luhn check, no expiry check. The provider decides.

### Example
```jsx
const [card, setCard] = React.useState({ number: "", expiry: "", cvc: "", name: "" });

<PaymentFields value={card} onChange={setCard} errors={errors} />

// Before handing to a provider that accepts raw fields:
const digits = card.number.replace(/\D/g, "");
const [mm, yy] = card.expiry.split(" / ");
```

### Variants
| Prop | What it is for |
|---|---|
| `brand` | Force the brand: `"visa"`, `"mastercard"`, `"amex"`, `"discover"` or `"unknown"`, e.g. from your provider's BIN lookup. When omitted it is detected from the leading digits (below). |
| `errors` | A message per field (`number`, `expiry`, `cvc`, `name`), shown under it; the field turns `aria-invalid`. |
| `fields` | `{ name: false }` hides "Name on card". |
| `legend` | "Card details" by default. |
| `disabled` | Disables the whole fieldset, e.g. while paying. |

**Formatting as the user types.** The number keeps digits only and groups them in fours (up to 19 digits), or 4-6-5 for Amex (15 digits). Expiry becomes `MM / YY`: a first digit above 1, or 1 followed by 3–9, gets its leading zero ("4" becomes "04"), and the separator appears once the year starts, so Backspace never fights it. The security code keeps 3 digits, or 4 for Amex. The caret stays after the same digit when a reformat moves characters. `onChange` receives the formatted strings; strip non-digits before use.

**Brand detection** is a prefix check on the digits, documented here so no one mistakes it for validation:

| Brand | Leading digits |
|---|---|
| Amex | 34, 37 |
| Visa | 4 |
| Mastercard | 51–55, 22–27 (an approximation of 2221–2720) |
| Discover | 6011, 65, 644–649 |
| unknown | anything else; no badge shows |

The brand shows as a neutral text `Badge` ("Visa", "Mastercard", "Amex", "Discover") at the end of the card number's label row, outside the field, so it never covers the digits. There are no card logos: they are trademarks with their own usage rules, and your provider supplies approved artwork if you need it.

### Composition
Inside a checkout `<form>`, after `AddressFields` or a "Billing address is the same" `Checkbox`, with the pay `Button` after it. Each field is an `Input` with a visible label styled like `Field`'s; expiry and security code share a row at every width.

### Tokens
No Tier 3 tokens of its own: the fields read the `--dt-input-*` tokens through `Input`, and the brand badge the neutral `Badge` colours. The legend reads `--dt-text-heading-xs-*`; gaps read `--dt-space-stack-md` and `--dt-space-inline-md`.

### Accessibility
- A `<fieldset>` with a visible `<legend>`. Every input has a visible label.
- `autoComplete` tokens `cc-number`, `cc-exp`, `cc-csc` and `cc-name` let the browser fill a saved card; `inputMode="numeric"` opens a number keypad on phones for the number, expiry and code.
- The detected brand is visible text, and the number field is `aria-describedby` it, so a screen reader hears "Visa" with the field.
- Errors show under their field with `role="alert"`, and the field is `aria-invalid`.

### Content
- Labels: "Card number", "Expiry date", "Security code", "Name on card". "Security code" is clearer than CVC or CVV to most people; the placeholder says how many digits.
- Error messages say what to fix: "Enter the expiry date as MM / YY", "Your card number is incomplete".

## Props

```ts
import * as React from "react";

/** Card details as PaymentFields shows them: formatted text, not raw digits. */
export interface PaymentValue {
  /** Card number with spaces between groups, e.g. "4242 4242 4242 4242". Strip non-digits before use. */
  number: string;
  /** Expiry as "MM / YY". */
  expiry: string;
  /** Security code, digits only. */
  cvc: string;
  /** Name on the card. */
  name?: string;
}

/** Card entry fields that format as the user types. The UI only: for real payments use your provider's hosted fields. */
export interface PaymentFieldsProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange" | "children"> {
  /** The card details shown. Controlled; values passed unformatted are formatted for display. */
  value: PaymentValue;
  /** Called with the whole value, already formatted, after any field changes. */
  onChange: (next: PaymentValue) => void;
  /** Messages shown under the matching fields, which are marked aria-invalid. */
  errors?: Partial<Record<keyof PaymentValue, string>>;
  /** The fieldset's visible legend and accessible name. @default "Card details" */
  legend?: string;
  /**
   * The card brand, shown as a text badge beside the card number's label and used to group the digits
   * (amex 4-6-5, others in fours). Detected from the leading digits when omitted.
   */
  brand?: "visa" | "mastercard" | "amex" | "discover" | "unknown";
  /** Hide the name on card field: { name: false }. It shows by default. */
  fields?: { name?: boolean };
  /** Disables every field. @default false */
  disabled?: boolean;
}

export declare function PaymentFields(props: PaymentFieldsProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-input-label-gap` | component | `var(--dt-space-stack-2xs)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |

## Source

```jsx
import React from "react";
import { Badge } from "../display/Badge.jsx";
import { Input } from "../forms/Input.jsx";

/* A layout effect puts the caret back after a reformat, before paint. On the
   server there is no layout, and React warns about the layout hook there. */
const useCaretEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

const BRAND_NAMES = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" };

/* The leading digits only, enough to label the field and group the digits.
   It is not validation: the provider decides whether a number is real. */
function detectBrand(digits) {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  return "unknown";
}

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

/* Amex is 15 digits in 4-6-5; everything else up to 19 in fours. */
function formatNumber(raw, brand) {
  if (brand === "amex") {
    const d = onlyDigits(raw).slice(0, 15);
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(" ");
  }
  const d = onlyDigits(raw).slice(0, 19);
  return (d.match(/.{1,4}/g) || []).join(" ");
}

/* MM / YY. A first digit above 1, or a 1 followed by a digit above 2, can
   only be a one-digit month, so it gets its leading zero. The separator is
   added once the year starts, so backspace never fights it. */
function formatExpiry(raw) {
  let d = onlyDigits(raw);
  if ((d.length === 1 && d > "1") || (d.length > 1 && d[0] === "1" && d[1] > "2")) d = "0" + d;
  d = d.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

/* Where the caret goes in a reformatted value: after the same number of
   digits it followed before. */
function caretAfterDigits(formatted, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) seen++;
    if (seen === count) return i + 1;
  }
  return formatted.length;
}

export function PaymentFields({
  value = {},
  onChange,
  errors = {},
  legend = "Card details",
  brand,
  fields = {},
  disabled = false,
  style,
  ...rest
}) {
  const base = React.useId();
  const ids = { number: `${base}-number`, expiry: `${base}-expiry`, cvc: `${base}-cvc`, name: `${base}-name`, brand: `${base}-brand` };
  const detected = brand || detectBrand(onlyDigits(value.number));
  const number = formatNumber(value.number, detected);
  const expiry = formatExpiry(value.expiry);
  const caret = React.useRef(null);

  useCaretEffect(() => {
    const c = caret.current;
    if (!c) return;
    caret.current = null;
    const el = document.getElementById(c.id);
    if (!el || el !== document.activeElement) return;
    const at = caretAfterDigits(el.value, c.digits);
    el.setSelectionRange(at, at);
  });

  /* Reformat what was typed, remember where the caret was among the digits,
     and report the whole value. */
  const edit = (key, format) => (e) => {
    const raw = e.target.value;
    const at = e.target.selectionStart == null ? raw.length : e.target.selectionStart;
    caret.current = { id: ids[key], digits: onlyDigits(raw.slice(0, at)).length };
    onChange({ ...value, [key]: format(raw) });
  };

  const brandName = BRAND_NAMES[detected];

  return (
    <fieldset
      disabled={disabled}
      style={{
        margin: 0, padding: 0, border: 0, minWidth: 0,
        display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)",
        ...style,
      }}
      {...rest}
    >
      <legend
        style={{
          padding: 0, marginBlockEnd: "var(--dt-space-stack-md)",
          fontFamily: "var(--dt-text-heading-xs-family)", fontSize: "var(--dt-text-heading-xs-size)",
          lineHeight: "var(--dt-text-heading-xs-line)", fontWeight: "var(--dt-text-heading-xs-weight)",
          letterSpacing: "var(--dt-text-heading-xs-tracking)",
          color: "var(--dt-text-primary)",
        }}
      >
        {legend}
      </legend>

      {/* The label row carries the brand badge at its inline end, outside the
          field, so it never covers the digits however narrow the field is.
          The label is styled as Field's; the Input carries only the error. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-input-label-gap)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)", minHeight: "var(--dt-text-label-md-line)" }}>
          <label
            htmlFor={ids.number}
            style={{
              fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
              lineHeight: "var(--dt-text-label-md-line)", fontWeight: "var(--dt-text-label-md-weight)",
              color: "var(--dt-text-primary)",
            }}
          >
            Card number
            <span aria-hidden="true" style={{ color: "var(--dt-text-danger)", marginInlineStart: "var(--dt-space-inline-2xs)" }}>*</span>
          </label>
          {brandName && <Badge id={ids.brand} tone="neutral">{brandName}</Badge>}
        </div>
        <Input
          id={ids.number}
          name="cardnumber"
          value={number}
          onChange={edit("number", (raw) => formatNumber(raw, brand || detectBrand(onlyDigits(raw))))}
          required
          disabled={disabled}
          autoComplete="cc-number"
          inputMode="numeric"
          placeholder="1234 1234 1234 1234"
          spellCheck={false}
          error={errors.number}
          aria-describedby={brandName ? ids.brand : undefined}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--dt-space-stack-md) var(--dt-space-inline-md)", alignItems: "start" }}>
        <Input
          id={ids.expiry}
          name="cc-exp"
          label="Expiry date"
          value={expiry}
          onChange={edit("expiry", formatExpiry)}
          error={errors.expiry}
          required
          disabled={disabled}
          autoComplete="cc-exp"
          inputMode="numeric"
          placeholder="MM / YY"
          spellCheck={false}
        />
        <Input
          id={ids.cvc}
          name="cvc"
          label="Security code"
          value={onlyDigits(value.cvc).slice(0, 4)}
          onChange={edit("cvc", (raw) => onlyDigits(raw).slice(0, detected === "amex" ? 4 : 3))}
          error={errors.cvc}
          required
          disabled={disabled}
          autoComplete="cc-csc"
          inputMode="numeric"
          placeholder={detected === "amex" ? "4 digits" : "3 digits"}
          spellCheck={false}
        />
      </div>

      {fields.name !== false && (
        <Input
          id={ids.name}
          name="ccname"
          label="Name on card"
          value={value.name == null ? "" : value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          error={errors.name}
          disabled={disabled}
          autoComplete="cc-name"
          autoCapitalize="words"
          spellCheck={false}
        />
      )}
    </fieldset>
  );
}
```
