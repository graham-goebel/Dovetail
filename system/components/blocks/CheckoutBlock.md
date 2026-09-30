# CheckoutBlock

A one-page checkout. The form (contact email, shipping address, delivery method, card details and the place-order action) sits on the left; the order, read-only lines over an `OrderSummary`, sits on the right and stays in view. When the block is narrower than `collapseBelow` the order moves to the top, folded into a "Show order summary · $141.09" disclosure, the usual phone pattern.

## Use it when
- The final step of a purchase, on one page.

## Don't use it when
- The cart, before checkout. Use `CartBlock`.
- Real card payments: render your payment provider's hosted fields in place of `payment` (leave it out) so card data never touches your page.
- A multi-step checkout: compose `AddressFields`, `PaymentFields` and `OrderSummary` with a `Stepper`.

## Example
```jsx
<CheckoutBlock
  email={email}
  onEmailChange={setEmail}
  address={{ value: address, onChange: setAddress }}
  deliveryOptions={[
    { id: "standard", label: "Standard", detail: "3–5 working days", price: 0 },
    { id: "express", label: "Express", detail: "Next working day", price: 15 },
  ]}
  delivery={delivery}
  onDeliveryChange={setDelivery}
  payment={{ value: card, onChange: setCard }}
  lines={lines}
  summary={{ lines: [{ label: "Subtotal", amount: 120 }, { label: "Shipping", amount: 15 }, { label: "Tax", amount: 6.09 }], total: { amount: 141.09 } }}
  onSubmit={(e) => { e.preventDefault(); placeOrder(); }}
  submitAction={<Button type="submit" size="lg" fullWidth>Place order</Button>}
/>
```

## Variants
| Prop | What it is for |
| --- | --- |
| `onSubmit` | Wraps the form and summary in a `<form>`, so Enter submits and browsers autofill. Without it they sit in a `div` and `submitAction` handles its own click. |
| `address` | Leave out for a digital order. |
| `deliveryOptions` | A `RadioGroup`; each `price` shows with `Price` (0 reads "Free"). Leave out `price` to show none. |
| `payment` | Leave out when a provider's hosted fields take its place. |
| `collapseBelow` | The block's own width (not the viewport's) under which the order folds into the disclosure. Default 768. |

## Composition
A `Section` with a `BlockHeader`, then the form column: a Contact fieldset with an email `Input`, `AddressFields`, a Delivery fieldset with a `RadioGroup`, `PaymentFields` and `submitAction`. Beside it, or in the disclosure on a narrow block, `CartLine`s at `readOnly size="sm"` over an `OrderSummary` that drops its own frame for the panel's. The block validates and adds up nothing: every value, error and figure is yours.

## Tokens
Has none of its own. The header gap is `--dt-layout-module-gap`, the column gap `--dt-layout-inline-section` and the sections a `Stack` at `layer="block"`, all following the Configure sheet's layout. The order panel and the disclosure use `--dt-surface-subtle`, `--dt-border-subtle` and `--dt-radius-container`; legends use the `heading-xs` type role, as `AddressFields` and `PaymentFields` do.

## Accessibility
- The title is the page's `h1` by default (`level`); the summary heading is one below.
- The disclosure is a `<button>` with `aria-expanded` and `aria-controls` pointing at its panel. The total is part of its name ("Show order summary $141.09"), so it is heard without opening it.
- The email field has `type="email"`, `autocomplete="email"` and `inputmode="email"`; the address and card fields carry their own autocomplete tokens.
- Contact and Delivery are fieldsets named by their legends; each delivery option is a radio.
- The layout switch is measured with `ResizeObserver` after mount, so server and first client render match (wide).

## Content
- Place-order button names what happens: "Place order", "Pay $141.09".
- Delivery labels are the method ("Standard", "Express"); the detail says when.
- Say what is estimated until the address is known.
