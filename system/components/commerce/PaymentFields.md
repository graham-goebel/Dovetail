# PaymentFields

Card entry fields (number, expiry, security code and name) that format as the user types and label the card brand. This is the UI only.

> **For real payments, use your payment provider's hosted fields** (Stripe Elements, Adyen Web Components, Braintree Hosted Fields). Hosted fields keep card data out of your pages and servers, which keeps your PCI DSS scope at its smallest (SAQ A). Raw card fields put your page in scope. Use `PaymentFields` only for providers that accept raw fields and where you have accepted that scope, for prototypes and demos, or with test card numbers.

The component is presentational and controlled: it never stores, logs or sends the values. It holds no card data in state; it formats what it is given, reports each change through `onChange`, and what happens to the value is entirely your code's.

## Use it when
- Prototyping or demoing a checkout with test cards.
- Your provider takes raw card fields and you have taken on the PCI scope that comes with them.
- You want the house layout and labels around a provider that renders its own inputs: copy the layout, not the inputs.

## Don't use it when
- You take real card payments through Stripe, Adyen, Braintree or similar. Use their hosted fields.
- You take wallets (Apple Pay, Google Pay) or bank payments. Use the provider's buttons.
- You need to validate a card. It checks nothing: no Luhn check, no expiry check. The provider decides.

## Example
```jsx
const [card, setCard] = React.useState({ number: "", expiry: "", cvc: "", name: "" });

<PaymentFields value={card} onChange={setCard} errors={errors} />

// Before handing to a provider that accepts raw fields:
const digits = card.number.replace(/\D/g, "");
const [mm, yy] = card.expiry.split(" / ");
```

## Variants
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

## Composition
Inside a checkout `<form>`, after `AddressFields` or a "Billing address is the same" `Checkbox`, with the pay `Button` after it. Each field is an `Input` with a visible label styled like `Field`'s; expiry and security code share a row at every width.

## Tokens
No Tier 3 tokens of its own: the fields read the `--dt-input-*` tokens through `Input`, and the brand badge the neutral `Badge` colours. The legend reads `--dt-text-heading-xs-*`; gaps read `--dt-space-stack-md` and `--dt-space-inline-md`.

## Accessibility
- A `<fieldset>` with a visible `<legend>`. Every input has a visible label.
- `autoComplete` tokens `cc-number`, `cc-exp`, `cc-csc` and `cc-name` let the browser fill a saved card; `inputMode="numeric"` opens a number keypad on phones for the number, expiry and code.
- The detected brand is visible text, and the number field is `aria-describedby` it, so a screen reader hears "Visa" with the field.
- Errors show under their field with `role="alert"`, and the field is `aria-invalid`.

## Content
- Labels: "Card number", "Expiry date", "Security code", "Name on card". "Security code" is clearer than CVC or CVV to most people; the placeholder says how many digits.
- Error messages say what to fix: "Enter the expiry date as MM / YY", "Your card number is incomplete".
