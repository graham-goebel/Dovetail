# PromoCode

A field for a promo, discount or gift code, with an Apply button. It starts as a "Have a promo code?" disclosure so it doesn't tempt people without a code to leave and search for one, shows the server's error under the field, and replaces the field with a removable chip once a code is applied. It is presentational and controlled: it never validates a code or calls a server; `onApply` hands the code to your app, and you pass back `loading`, `error` or `applied`.

## Use it when
- A cart or checkout accepts discount or gift codes: in the `OrderSummary` footer, or under the cart lines.
- One code at a time is in effect, and the customer should see which and be able to remove it.

## Don't use it when
- The code is a gift card balance with a PIN and an amount to apply. Build a form from `Input` fields.
- Several codes stack. Show each applied code as its own chip and keep a separate field, or extend this per product need.
- It is any other one-field form (a newsletter signup, a search). Use `Input` with a `Button`.

## Example
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

## Variants
| State | How you get it | What shows |
|---|---|---|
| Collapsed | Default (`collapsible` true), no value or error | A link-style "Have a promo code?" button with `aria-expanded="false"`. |
| Open | Press the disclosure, or `collapsible={false}`, or a non-empty `value` | The labelled field and an Apply button (secondary). Focus moves to the field when the user opens it. |
| Error | `error` | The field is marked `aria-invalid` with the error under it, and stays open. |
| Loading | `loading` | The Apply button shows a spinner and is disabled; Enter does nothing until it clears. |
| Applied | `applied` | A chip with a tag icon, the code and its `description`, and a remove button when `onRemove` is given. The field is hidden. |

Labels are props for translation: `label` ("Promo code"), `toggleLabel` ("Have a promo code?"), `applyLabel` ("Apply").

## Composition
Put it in the `footer` of an `OrderSummary`, above the checkout `Button`, or under the lines in a cart `Drawer`. It uses `Input` for the field and `Button` for Apply, so both follow the input and button tokens. When a code is applied, show its effect as a `kind: "discount"` line in the `OrderSummary`.

## Tokens
Tier 3, in `tokens/component/commerce.css`, repeated under `.dark`:
- `--dt-promo-chip-bg` (`--dt-surface-success-subtle`), `--dt-promo-chip-border` (`--dt-border-success`), `--dt-promo-chip-fg` (`--dt-text-primary`): the applied chip.
- `--dt-promo-chip-icon` (`--dt-text-success`): its tag icon.
- `--dt-promo-chip-description` (`--dt-text-secondary`): the description beside the code.

The disclosure button reads `--dt-text-link` and `--dt-text-label-md-*`; the chip's remove button reads `--dt-button-ghost-bg` and `--dt-button-ghost-bg-hover`. The field and Apply read the `--dt-input-*` and `--dt-button-*` tokens.

## Accessibility
- The disclosure is a real `<button>` with `aria-expanded` and `aria-controls` pointing at the field's panel. Opening it moves focus into the field.
- The field has a visible `<label>`. Enter in the field applies the code (and does not submit the surrounding form); Apply does the same.
- An error shows under the field with `role="alert"`, so it is announced when it appears, and the field is `aria-invalid`.
- The applied chip sits in an `aria-live="polite"` region and reads "Code SUMMER10 applied: 10% off". Its remove button is named "Remove code SUMMER10". After removing, focus moves to the field, so it is not lost to the page.

## Content
- Error messages say what happened and what to do, in sentence case: "This code has expired", "Enter a code to apply it". The server's wording is fine if it follows this.
- `description` is what the code does, short: "10% off", "Free shipping", "$5 off orders over $50".
- Keep the disclosure a question: "Have a promo code?", "Have a gift card?".
