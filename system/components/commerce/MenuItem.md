# MenuItem

One dish on a menu: the name, a two-line description, the price, dietary tags and a thumbnail, with an add button, a basket count and an optional stepper.

## Use it when
- Listing dishes or products in a `MenuSection` on a food-ordering page.
- A dish needs a quick add and a way to open its details from the same row.

## Don't use it when
- It is a retail product with variants and a product page. Use a product card, or `Card` with `Price`.
- It is a line in the basket or at checkout. Use a cart line with `QuantityStepper`.

## Example
```jsx
<MenuItem
  name="Pad thai"
  description="Rice noodles wok-fried with tamarind, egg, tofu, bean sprouts and crushed peanuts."
  price={12.5}
  image={{ src: padThai, alt: "Pad thai on a white plate" }}
  tags={[{ label: "Popular", kind: "popular" }, { label: "Contains nuts" }]}
  quantity={basket["pad-thai"] || 0}
  onSelect={() => openDetails("pad-thai")}
  onAdd={() => openOptions("pad-thai")}
  onQuantityChange={(n) => setQuantity("pad-thai", n)}
  locale="en-US"
/>
```

## Variants
| Prop | What it is for |
|---|---|
| `image` | A square thumbnail on the right at `--dt-menu-thumb-size`, its space reserved. The add button sits on its corner. |
| `tags` | Small badges. `kind` picks the colour: `vegetarian`, `vegan`, `spicy`, `gluten-free`, `popular`, `new`, or `default`. Spicy gets a flame and popular a thumbs-up. The label always shows. |
| `compareAt` | A sale: the old price struck through, through `Price`. |
| `soldOut` | Dims the text and picture, shows "Sold out", and removes the add button and stepper. The row can still open details. |
| `quantity` | Above 0, a "2 in basket" badge. With `onQuantityChange`, also a small `QuantityStepper` whose minus becomes remove at 1 and calls `onQuantityChange(0)`. |
| `onAdd` | Shows the add button, named `Add ${name}`. Usually opens a `Sheet` of `ModifierGroup`s; for a dish with no options, add it straight away. |
| `onSelect` | Makes the whole row open the dish's details. |
| `layout` | `list` (a row, the default) or `grid` (a card). `MenuSection` sets it. |

## Composition
Lives in a `MenuSection`, which sets its `layout` and `headingLevel`. Renders `Price` for the price, `Badge` for the tags and counts, `IconButton` for add and `QuantityStepper` in the basket. The details or options it opens are yours: typically a `Sheet` with `ModifierGroup`s and an "Add to basket · $14.50" `Button`.

## Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- `--dt-menu-item-gap` (`--dt-space-inline-md`), `--dt-menu-item-padding` (`--dt-space-inset-md`).
- `--dt-menu-thumb-size` (2 × `--dt-size-control-lg`), `--dt-menu-thumb-radius` (`--dt-radius-media`), `--dt-menu-thumb-bg` (`--dt-surface-sunken`).
- `--dt-menu-item-description-color` (`--dt-text-secondary`), `--dt-menu-item-soldout-color` (`--dt-text-disabled`).
- Grid cards: `--dt-menu-item-card-bg` (`--dt-surface-base`), `--dt-menu-item-card-border` (`--dt-border-subtle`), `--dt-menu-item-bg-hover` (`--dt-surface-subtle`).
- Tags: `--dt-dietary-{kind}-bg` and `--dt-dietary-{kind}-fg` for each kind, from the success, danger, info, warning and brand subtle surfaces and their text roles; `default` is sunken and secondary.

The name is `--dt-text-label-lg-*`; the description `--dt-text-body-sm-*`.

## Accessibility
- The name is a heading (`h3` in a section with an `h2`).
- With `onSelect`, the name is a real `<button>` and a transparent layer inside it stretches over the whole row, so a press anywhere on the row is a press of that button. The add button and the stepper sit above that layer as their own targets: two tab stops, never one control nested in another. The row's focus ring is drawn around the whole item.
- The row button is described by the price line, so focusing it reads "Pad thai, $12.50, 2 in basket".
- The add button is named `Add ${name}` (override with `addLabel`), so a list of dishes does not read as a column of identical "Add" buttons. The stepper is named `Quantity, ${name}` and its remove button `Remove ${name}`.
- Tags always show their words; colour and icons repeat them. Sold out is said in text as well as shown by dimming.

## Content
- The name as the menu prints it, sentence case.
- The description says what is in the dish and how it is made. It is clamped to two lines, so lead with what matters.
- Tag labels are one or two words: "Vegan", "Gluten free", "Contains nuts".
