# AddressFields

A fieldset of postal address inputs, built from `Input` and `Select`, with the right `autoComplete` token on every field so browsers and password managers fill it in one tap. It is presentational and controlled: it reports each change as a whole `Address`, and never validates, looks up or sends the address.

## Use it when
- A checkout needs a shipping or billing address.
- An account page edits a saved address.
- Anything asks where to deliver: a returns form, a gift recipient.

## Don't use it when
- You only need a country or a postal code (a shipping estimate). Use a single `Select` or `Input`.
- You use an address autocomplete service that renders its own fields. Wire that service to `Input` directly.
- The address is for display. Show it as text; there is no read-only mode here.

## Example
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

## Variants
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

## Composition
Inside a checkout `<form>`, usually one per address, followed by a `Checkbox` such as "Billing address is the same". Each field is an `Input` or `Select` with a `Field` label, so it matches the rest of the form. Required fields are marked with the `Field` asterisk and the native `required` attribute; validation messages come from your app through `errors`.

## Tokens
No Tier 3 tokens of its own: it reads the `--dt-input-*` tokens through `Input` and `Select`. The legend reads `--dt-text-heading-xs-*` and `--dt-text-primary`; the gaps read `--dt-space-stack-md` and `--dt-space-inline-md`, and the row's least column width is `calc(var(--dt-size-control-lg) * 4)`.

## Accessibility
- A `<fieldset>` with a visible `<legend>`, so every field is announced within "Shipping address".
- Every input has a visible `<label>` and a standard `autoComplete` token, which also serves WCAG 1.3.5 (identify input purpose).
- Errors show under their field with `role="alert"`, and the field is `aria-invalid`.
- `phone` opens a phone keypad (`inputMode="tel"`); the postal code keeps the full keyboard because many postal codes contain letters.

## Content
- Labels are sentence case and name the thing, not an instruction: "City", not "Enter your city".
- Mark optional fields "(optional)" rather than marking required ones only, as the defaults do.
- Error messages say what to fix: "Enter a postal code", "Enter a city".
