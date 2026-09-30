# CartLine

One line in a cart, bag or order confirmation: a thumbnail, the item's name and variant details, a quantity stepper with remove, and the price. It is presentational and controlled: it shows what it is given and calls back, and holds no cart state, adds nothing up and talks to no server.

## Use it when
- Listing what is in a cart page, a cart drawer or a mini bag (`size="sm"` in drawers).
- Showing what was bought on an order confirmation or receipt (`readOnly`).
- Checking out, in the list of items beside the `OrderSummary`.

## Don't use it when
- The item is being browsed, not bought. Use a product card (`Card` with `Price` and `Rating`).
- You need a table of many orders or SKUs with sortable columns. Use `Table`.
- A menu row where the only control is the count. Use `QuantityStepper` beside the dish name.

## Example
```jsx
<CartLine
  name="Linen shirt"
  href="/products/linen-shirt"
  image={{ src: "/img/linen-shirt.jpg", alt: "Linen shirt in sand" }}
  details={["Size M", "Colour Sand"]}
  price={48}
  compareAt={60}
  quantity={line.qty}
  maxQuantity={5}
  lineTotal={line.qty * 48}
  note="Only 2 left"
  onQuantityChange={(qty) => updateLine(line.id, qty)}
  onRemove={() => removeLine(line.id)}
  currency="USD"
  locale="en-US"
  divider
/>

{/* Order confirmation */}
<CartLine name="Linen shirt" details={["Size M"]} price={48} quantity={2} lineTotal={96} readOnly />
```

`lineTotal` is whatever your cart computed (after line discounts, bundles, tax rules); the component never multiplies price by quantity. Prices are in major units, as `Price` takes them.

## Variants
| Prop | What it is for |
|---|---|
| `size="md"` | Default. The cart page: 64px thumbnail, label-lg name, md price. |
| `size="sm"` | Drawers and mini carts: 48px thumbnail, label-md name, sm price. |
| `readOnly` | Order confirmation and receipts: "Qty 2" as text, no stepper, no remove. |
| `lineTotal` | The line's total on the right, and the unit price with "each" under the name. Without it the unit price is on the right. |
| `compareAt` | A sale on the unit price: struck through, and the price in the sale colour (from `Price`). |
| `maxQuantity` | The stepper's upper limit, e.g. the stock left. Pair it with a `note` saying so. |
| `note` | One short line of status: stock, delivery time, a gift message. |
| `onRemove` | A Remove button beside the stepper, and the stepper's minus turns into remove at 1. Without it the line cannot be removed from here. |
| `divider` | A rule under the line and padding above and below it, for stacked lines. |
| `image` without `src` | A small placeholder frame with an image icon, like `Image` with no file. Omit `image` for no thumbnail column at all. |

## Composition
Stack lines in a `<ul>`/`<li>` list (or a `Stack`) with `divider`, inside a cart page's main column or a `Drawer`. It renders `Price` for its prices and `QuantityStepper` for the quantity, so both follow their own tokens and rules. The totals belong in an `OrderSummary` beside or under the list. When the line is too narrow for the price beside the text (a phone, a slim drawer), the price moves under the text, at the inline end, rather than squeezing the name.

## Tokens
Tier 3, in `tokens/component/commerce.css`, colours repeated under `.dark`:
- `--dt-cart-line-divider` (`--dt-border-subtle`): the rule under a line with `divider`.
- `--dt-cart-thumb-bg` (`--dt-surface-sunken`), `--dt-cart-thumb-border` (`--dt-border-subtle`), `--dt-cart-thumb-fg` (`--dt-text-tertiary`): the thumbnail frame and its placeholder icon.
- `--dt-cart-detail-color` (`--dt-text-secondary`): the variant details and "Qty 2".
- `--dt-cart-note-color` (`--dt-text-secondary`): the note.
- `--dt-cart-thumb-radius` (`--dt-radius-media`), `--dt-cart-thumb-size-sm` (`--dt-size-control-lg`), `--dt-cart-thumb-size-md` (`--dt-size-avatar-xl`).

The name reads `--dt-text-primary` and the `--dt-text-label-md|lg-*` roles; details and the note read `--dt-text-body-xs|sm-*`. Prices read the `--dt-price-*` tokens through `Price`, and the stepper the input and ghost button tokens.

## Accessibility
- The stepper is named "Quantity, Linen shirt", its buttons "Decrease quantity, Linen shirt" and "Increase quantity, Linen shirt", and remove "Remove Linen shirt", so a screen-reader user moving through a cart of several lines always knows which line a control belongs to. The visible Remove button has the same name, which begins with its visible text.
- The stepper's keyboard contract is `QuantityStepper`'s: arrows step, Home and End jump, typing commits on Enter or blur, and ArrowDown never removes.
- A read-only quantity is shown as "Qty 2" and read as "Quantity 2".
- The thumbnail's `alt` is read. When the name already says everything the picture does, pass `alt: ""`.
- Detail lines are separated by a middle dot on screen and a comma for screen readers.

## Content
- `name` is the product name as the store lists it, in its own casing. Don't repeat the variant in it; that is what `details` is for.
- `details` are short "Attribute Value" pairs in sentence case: "Size M", "Colour Sand", "Gift wrap".
- `note` is one short sentence fragment, no full stop: "Only 2 left", "Ships in 3 days".
