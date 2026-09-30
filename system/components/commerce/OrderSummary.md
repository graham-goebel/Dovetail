# OrderSummary

The money breakdown of a cart or checkout: subtotal, shipping, tax and discounts as a description list, an emphasised total, an optional free-shipping progress bar, and a footer for the checkout button. It is presentational: it prints the figures it is given and adds nothing up, so your cart or your commerce platform stays the source of truth.

## Use it when
- A cart page or checkout needs the totals beside the items.
- An order confirmation or receipt repeats what was charged.
- A cart drawer shows a compact subtotal with the checkout button (pass fewer `lines`).

## Don't use it when
- You are comparing plans or prices side by side. Use `Table` or plan cards.
- The numbers are not money for one order (analytics, balances). Use `Stat` or `Table`.
- You need the component to calculate tax, shipping or discounts. Compute them in your app or platform and pass the results.

## Example
```jsx
<OrderSummary
  currency="USD"
  locale="en-US"
  lines={[
    { label: "Subtotal", amount: 138 },
    { label: "Shipping", amount: 0, hint: "Standard, 3–5 days" },
    { label: "Discount (SUMMER10)", amount: 13.8, kind: "discount" },
    { label: "Tax", amount: 9.94, kind: "muted", hint: "Estimated" },
  ]}
  total={{ amount: 134.14 }}
  freeShippingProgress={{ current: 138, threshold: 150 }}
  footer={
    <>
      <PromoCode value={code} onChange={setCode} onApply={apply} />
      <Button fullWidth size="lg">Check out</Button>
    </>
  }
/>
```

## Variants
| Prop | What it is for |
|---|---|
| `lines[].kind="default"` | An ordinary figure: subtotal, shipping, tax. |
| `lines[].kind="discount"` | Money off. The amount always shows as a negative ("-$13.80"), in the discount colour. |
| `lines[].kind="muted"` | An estimate or a figure still to come: "Tax, calculated at next step". Label and figure in tertiary text. |
| `lines[].hint` | A smaller line under the label: the shipping method, "Estimated". |
| `amount: 0` | Shows "Free" (from `Price`), e.g. for free shipping. |
| `total` | Emphasised under a rule: label-lg label, `Price` at `size="lg"`. `label` defaults to "Total". |
| `freeShippingProgress` | A `Progress` bar and "You're $12.00 away from free shipping", or "You've got free shipping" (success tone) once `current` reaches `threshold`. The remaining amount is the one subtraction the component does, for the message. |
| `footer` | The checkout `Button`, a `PromoCode`, payment marks, trust copy. |
| `title` / `headingLevel` | The heading, "Order summary" by default, as an `h2` unless you pick another level to fit the page outline. |

## Composition
A panel on its own (it draws its own border and padding). It sits in the side column of a cart or checkout page, under the lines in a `Drawer`, or on an order confirmation. It renders `Price` for every figure, `Progress` for free shipping and `Heading` for its title; put `PromoCode` and a `Button` in `footer`.

## Tokens
Tier 3, in `tokens/component/commerce.css`, colours repeated under `.dark`:
- `--dt-summary-bg` (`--dt-surface-base`), `--dt-summary-border` (`--dt-border-subtle`), `--dt-summary-radius` (`--dt-radius-container`), `--dt-summary-padding` (`--dt-space-inset-lg`): the panel.
- `--dt-summary-divider` (`--dt-border-subtle`): the rule above the total.
- `--dt-summary-label-color` (`--dt-text-secondary`), `--dt-summary-value-color` (`--dt-text-primary`): a line's label and figure.
- `--dt-summary-muted-color` (`--dt-text-tertiary`): a muted line. `--dt-summary-hint-color` (`--dt-text-tertiary`): hints.
- `--dt-summary-discount-color` (`--dt-text-success`): a discount's figure. It deliberately does not reuse `--dt-price-sale-color` (danger text): in a summary a discount is money saved, and red next to a promo field reads as an error. The minus sign carries the meaning, so colour is never the only signal.
- `--dt-summary-total-color` (`--dt-text-primary`): the total's label and figure.

Figures reach `Price` by re-pointing `--dt-price-color` on each figure, so a line's colour changes without changing how it is formatted. Figures are right-aligned with tabular numerals.

## Accessibility
- The panel is a `<section>` named by its heading. The breakdown is a `<dl>`: each label is a `<dt>` and its figure a `<dd>`, so a screen reader pairs them, and the total is the last pair.
- A discount's figure is formatted as a negative ("-$13.80"), so it is read as money off without relying on colour.
- The free-shipping bar is a `role="progressbar"` named by its message, with `aria-valuenow` and `aria-valuemax` in money.
- Figures come from `Intl.NumberFormat` for the `currency` and `locale`; pass `locale` when server rendering so the server and the browser print the same.

## Content
- Line labels are sentence-case nouns: "Subtotal", "Shipping", "Estimated tax". Put a discount's code in its label: "Discount (SUMMER10)".
- `hint` is a short fragment with no full stop: "Standard, 3–5 days", "Calculated at next step".
- Keep the total's label "Total" unless the page needs more: "Total due today", "Total (incl. VAT)".
