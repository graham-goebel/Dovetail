# CartBlock

The cart page: the cart's lines on the left and an `OrderSummary` on the right with a promo field and the checkout action, sticky while a long cart scrolls. On a narrow screen the summary wraps below the lines. With no lines it shows an empty state.

## Use it when
- A full cart or bag page, before checkout.

## Don't use it when
- A mini cart in a `Drawer` or `Sheet`: compose `CartLine size="sm"` and `OrderSummary` there directly.
- The order has been placed. Use read-only `CartLine`s, `OrderSummary` and `OrderStatus`.
- The checkout itself. Use `CheckoutBlock`.

## Example
```jsx
const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

<CartBlock
  lead={`${count} items`}
  action={<Link href="/shop" underline="hover">Continue shopping</Link>}
  lines={lines.map((l) => ({
    id: l.id,
    name: l.name,
    details: [l.colour, l.size],
    price: l.price,
    quantity: l.quantity,
    lineTotal: l.price * l.quantity,
    image: { src: l.image, alt: "" },
    onQuantityChange: (n) => setQuantity(l.id, n),
    onRemove: () => remove(l.id),
  }))}
  summary={{
    lines: [{ label: "Subtotal", amount: subtotal }, { label: "Shipping", amount: 0 }],
    total: { amount: subtotal },
    freeShippingProgress: { current: subtotal, threshold: 75 },
  }}
  promo={{ value: code, onChange: setCode, onApply: applyCode }}
  checkoutAction={<Button size="lg" fullWidth onClick={toCheckout}>Check out</Button>}
/>
```

## Variants
| Prop | What it is for |
| --- | --- |
| `promo` | Adds a `PromoCode` to the summary's footer, above the checkout action. |
| `summary.footer` | Goes after the checkout action: trust copy, payment marks. |
| `emptyState` | When `lines` is empty. Defaults to an `EmptyState`, "Your cart is empty". Give yours a way back to the shop. |
| `action` | Beside the header: "Continue shopping". |

## Composition
A `Section` with a `BlockHeader`, then a `<ul>` of `CartLine`s (each with `divider`, spread from `lines`, so every `CartLine` prop is available; `id` is the key) beside an `OrderSummary` spread from `summary`. The block adds nothing up: every `lineTotal`, the subtotal, discounts, shipping, tax and total are your cart's.

## Tokens
Has none of its own. The header gap is `--dt-layout-module-gap` and the column gap `--dt-layout-inline-section` (at `--dt-layout-scale`), so the Configure sheet's layout reaches it. The list's top rule is `--dt-cart-line-divider`, matching the lines' own dividers; the rest comes from `CartLine`, `OrderSummary` and `PromoCode`.

## Accessibility
- The title is the page's `h1` by default (`level`); the summary's heading is one level below.
- The lines are a list, so the item count is announced.
- Each line's stepper and remove button are named after the item ("Remove Canvas tote").
- When a line is removed, focus is the page's to place: move it to the next line or the heading.

## Content
- Title: "Your cart" (or "Your bag"). Lead: the item count.
- Checkout button: "Check out". Mark estimates as estimates: `kind: "muted"` with a hint.
