# AddressFields

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [AddressFields.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/AddressFields.jsx), [AddressFields.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/AddressFields.d.ts), [AddressFields.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/AddressFields.md).

Live page: https://graham-goebel.github.io/Dovetail/components/AddressFields.html

## Guidelines

A fieldset of postal address inputs, built from `Input` and `Select`, with the right `autoComplete` token on every field so browsers and password managers fill it in one tap. It is presentational and controlled: it reports each change as a whole `Address`, and never validates, looks up or sends the address.

### Use it when
- A checkout needs a shipping or billing address.
- An account page edits a saved address.
- Anything asks where to deliver: a returns form, a gift recipient.

### Don't use it when
- You only need a country or a postal code (a shipping estimate). Use a single `Select` or `Input`.
- You use an address autocomplete service that renders its own fields. Wire that service to `Input` directly.
- The address is for display. Show it as text; there is no read-only mode here.

### Example
```jsx
const [address, setAddress] = React.useState({ name: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "US" });

<AddressFields
  value={address}
  onChange={setAddress}
  errors={errors}
  countries={[{ value: "US", label: "United States" }, { value: "CA", label: "Canada" }, { value: "GB", label: "United Kingdom" }]}
  fields={{ phone: false }}
/>
```

Import the `Address` type from the package for your state.

### Variants
| Prop | What it is for |
|---|---|
| `legend` | "Shipping address" by default; "Billing address", "Delivery address". |
| `countries` | Country becomes a `Select` of these options, `autoComplete="country"` (the value is the code). Without it, country is a text field with `autoComplete="country-name"`, the token for a name as typed. |
| `fields` | Hide optional fields: `{ phone: false }`, `{ line2: false }`. Both show by default. |
| `labels` | Replace any label, e.g. "ZIP code" and "State" for a US-only store, or a translation. |
| `errors` | A message per field, shown under it; the field turns `aria-invalid`. |
| `disabled` | Disables the whole fieldset, e.g. while "Same as shipping" is ticked. |

Fields, in order, with their tokens:

| Field | Label | `autoComplete` | Notes |
|---|---|---|---|
| `name` | Full name | `name` | required, `autoCapitalize="words"` |
| `line1` | Address | `address-line1` | required |
| `line2` | Apartment, suite, etc. (optional) | `address-line2` | hideable |
| `city` | City | `address-level2` | required |
| `region` | State or region | `address-level1` | not required: many countries have none |
| `postalCode` | Postal code | `postal-code` | required, `autoCapitalize="characters"`; letters allowed (UK, Canada), so no numeric keypad |
| `country` | Country | `country` (Select) or `country-name` (text) | required |
| `phone` | Phone (optional) | `tel` | `type="tel"`, `inputMode="tel"`, hideable |

Region and postal code sit two-up when there is room and stack in one column on a phone (the least column width is four large controls, so 390px is one column). Everything else, city included, is full width.

### Composition
Inside a checkout `<form>`, usually one per address, followed by a `Checkbox` such as "Billing address is the same". Each field is an `Input` or `Select` with a `Field` label, so it matches the rest of the form. Required fields are marked with the `Field` asterisk and the native `required` attribute; validation messages come from your app through `errors`.

### Tokens
No Tier 3 tokens of its own: it reads the `--dt-input-*` tokens through `Input` and `Select`. The legend reads `--dt-text-heading-xs-*` and `--dt-text-primary`; the gaps read `--dt-space-stack-md` and `--dt-space-inline-md`, and the row's least column width is `calc(var(--dt-size-control-lg) * 4)`.

### Accessibility
- A `<fieldset>` with a visible `<legend>`, so every field is announced within "Shipping address".
- Every input has a visible `<label>` and a standard `autoComplete` token, which also serves WCAG 1.3.5 (identify input purpose).
- Errors show under their field with `role="alert"`, and the field is `aria-invalid`.
- `phone` opens a phone keypad (`inputMode="tel"`); the postal code keeps the full keyboard because many postal codes contain letters.

### Content
- Labels are sentence case and name the thing, not an instruction: "City", not "Enter your city".
- Mark optional fields "(optional)" rather than marking required ones only, as the defaults do.
- Error messages say what to fix: "Enter a postal code", "Enter a city".

## Props

```ts
import * as React from "react";

/** A postal address as AddressFields edits it. Every value is the text as typed. */
export interface Address {
  /** Full name of the recipient. */
  name: string;
  /** Street address. */
  line1: string;
  /** Apartment, suite, unit, building. */
  line2: string;
  /** City or town. */
  city: string;
  /** State, province, county or region. */
  region: string;
  /** Postal or ZIP code. */
  postalCode: string;
  /** Country: a code from `countries` when that list is given, otherwise the name as typed. */
  country: string;
  /** Phone number, for the carrier. */
  phone?: string;
}

/** A fieldset of address inputs with the right autocomplete tokens, built from Input and Select. */
export interface AddressFieldsProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange" | "children"> {
  /** The address shown. Controlled; missing keys show as empty. */
  value: Address;
  /** Called with the whole address after any field changes. */
  onChange: (next: Address) => void;
  /** Messages shown under the matching fields, which are marked aria-invalid. */
  errors?: Partial<Record<keyof Address, string>>;
  /** The fieldset's visible legend and accessible name. @default "Shipping address" */
  legend?: string;
  /** Options for a country Select, with autocomplete "country" (the value is the code). Without it, country is a text field with autocomplete "country-name". */
  countries?: { value: string; label: string }[];
  /** Hide the optional fields: { phone: false }, { line2: false }. Both show by default. */
  fields?: { line2?: boolean; phone?: boolean };
  /** Replace any field's label, e.g. to translate them or to say "ZIP code". */
  labels?: Partial<Record<keyof Address, string>>;
  /** Disables every field. @default false */
  disabled?: boolean;
}

export declare function AddressFields(props: AddressFieldsProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-size-control-lg` | semantic | `var(--dt-dim-12)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |

## Source

```jsx
import React from "react";
import { Input } from "../forms/Input.jsx";
import { Select } from "../forms/Select.jsx";

const LABELS = {
  name: "Full name",
  line1: "Address",
  line2: "Apartment, suite, etc. (optional)",
  city: "City",
  region: "State or region",
  postalCode: "Postal code",
  country: "Country",
  phone: "Phone (optional)",
};

export function AddressFields({
  value = {},
  onChange,
  errors = {},
  legend = "Shipping address",
  countries,
  fields = {},
  labels = {},
  disabled = false,
  style,
  ...rest
}) {
  const base = React.useId();
  const show = { line2: fields.line2 !== false, phone: fields.phone !== false };
  const text = { ...LABELS, ...labels };

  /* Every input gets the same wiring: an id, its label, its error, the
     current value and a change that reports the whole address. */
  const bind = (key) => ({
    id: `${base}-${key}`,
    name: key,
    label: text[key],
    error: errors[key],
    disabled,
    value: value[key] == null ? "" : value[key],
    onChange: (e) => onChange({ ...value, [key]: e.target.value }),
  });

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
      <Input {...bind("name")} required autoComplete="name" autoCapitalize="words" spellCheck={false} />
      <Input {...bind("line1")} required autoComplete="address-line1" />
      {show.line2 && <Input {...bind("line2")} autoComplete="address-line2" />}
      <Input {...bind("city")} required autoComplete="address-level2" />
      {/* Region and postal code sit two-up when there is room, and stack on
          a phone. The least column is four large controls, so a 390px
          screen stays one column. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, calc(var(--dt-size-control-lg) * 4)), 1fr))",
          gap: "var(--dt-space-stack-md) var(--dt-space-inline-md)",
          alignItems: "start",
        }}
      >
        <Input {...bind("region")} autoComplete="address-level1" />
        <Input {...bind("postalCode")} required autoComplete="postal-code" autoCapitalize="characters" spellCheck={false} />
      </div>
      {countries && countries.length
        ? <Select {...bind("country")} required autoComplete="country" options={countries} placeholder="Select a country" />
        : <Input {...bind("country")} required autoComplete="country-name" />}
      {show.phone && <Input {...bind("phone")} type="tel" inputMode="tel" autoComplete="tel" />}
    </fieldset>
  );
}
```
