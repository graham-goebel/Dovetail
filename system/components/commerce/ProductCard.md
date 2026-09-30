# ProductCard

A product in a grid, a carousel, a list or search results: its photo, name, price and, optionally, rating, colours, a flag and an add action, with the whole card linking to the product page.

## Use it when
- Listing products to browse: a category grid, "You may also like", search results, a wishlist.
- The card should link to the product page and still carry its own add button.
- A list needs the photo beside the text: `layout="horizontal"`.

## Don't use it when
- It is a line in the cart or an order: that has a quantity and a remove action, not a card-sized photo. Compose it from `Price` and `QuantityStepper` in a row.
- The content isn't a product for sale. Use `Card`.
- You are on the product page itself. Use `ProductGallery`, `Price`, `Rating` and `VariantPicker` there.

## Example
```jsx
<ProductCard
  name="Stoneware mug"
  href="/products/stoneware-mug"
  image={{ src: "/img/mug-fern.jpg", alt: "" }}
  subtitle="Fern glaze"
  price={24}
  compareAt={30}
  badge="-20%"
  rating={{ value: 4.5, count: 128 }}
  swatches={[{ name: "Fern", color: "#5b7a6a" }, { name: "Chalk", color: "#ffffff" }]}
  onQuickAdd={() => addToCart("stoneware-mug")}
/>

<ProductCard
  layout="horizontal"
  name="Soy candle"
  href="/products/soy-candle"
  image={{ src: "/img/candle.jpg", alt: "" }}
  price={18}
  soldOut
  action={<Button variant="secondary" size="sm">Add to cart</Button>}
/>
```

## Variants
| Prop | What it is for |
|---|---|
| `layout="vertical"` | Default. The photo above the text, for grids and carousels. The action sits at the foot, so actions line up across a row. |
| `layout="horizontal"` | The photo beside the text, a third of the width up to 2.5 × `--dt-size-avatar-xl` (160px), for lists and search results. |
| `ratio` | `"1:1"` by default, which suits any catalogue. `"4:5"` for apparel and people; `"3:4"`, `"4:3"` or a number for other photography. Use one ratio across a grid. |
| `compareAt` | A sale. `Price` strikes through the old price and announces "Was …, now …". |
| `badge` | A flag over the top corner of the photo: "New", "-20%". A string becomes a solid neutral `Badge`; pass your own `Badge` for another tone. |
| `swatches` | Colour dots, display only. Past `maxSwatches` (5) the rest collapse into "+3". |
| `soldOut` | Washes out the photo, shows `soldOutLabel` ("Sold out") in place of the badge, disables the quick-add button, and clones `action` with `disabled: true`. |
| `onQuickAdd` | A round add button over the photo's bottom corner, named "Add {name} to cart". For dense grids. |
| `action` | Anything at the foot of the card, usually an "Add to cart" `Button`. For roomier cards. |

## Composition
- Built on `Card`: its surface, border, radius and the `href` pattern. The name is the one real link; an `aria-hidden` copy of it is stretched over the card for a pointer, and the action and quick-add button sit above it so they stay separately clickable and focusable. The card's padding is the tighter `--dt-space-inset-sm`.
- The photo is an `Image` (so an `AspectRatio`): the frame reserves its space before the photo loads, and without `image` it shows the system's placeholder.
- The price is a `Price`, the rating a small display `Rating`, the flag a `Badge`, the quick add an `IconButton`.
- Put cards in a `Grid`, or a CSS grid of `repeat(auto-fill, minmax(…, 1fr))`. The card fills its cell's height. Pass `as="li"` inside a list.
- Don't put other links or controls in the text: only `action` and the quick-add button sit above the stretched link.

## Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-product-subtitle-color` (`--dt-text-secondary`): the subtitle and the "+3".
- `--dt-product-soldout-overlay` (`--dt-surface-glass`): the wash over a sold-out photo. The system has no opacity token; the translucent glass surface dims the photo in either mode.
- `--dt-swatch-border` (`--dt-border-strong`): the hairline around each colour dot, so a white one shows on a white card.

It also reads Card's `--dt-card-*` tokens, `--dt-radius-media` for the photo, `--dt-text-label-lg-*` for the name and `--dt-text-body-sm-*` for the subtitle, and the tokens of `Price`, `Rating`, `Badge` and `IconButton`. Swatch colours come from product data: they are content, not tokens.

## Accessibility
- With `href`, the name is the card's only link, so a screen reader lists each product once, by its name. The stretched copy is `aria-hidden` and out of the tab order.
- The text comes first in the source and the photo is moved above it visually, so a screen reader and the Tab key meet the name (the link) first, then the flag and the quick-add button.
- The quick-add button is a real button named "Add {name} to cart" (override with `quickAddLabel`), so a list of them is not a column of identical "Add" buttons.
- The swatches are one `role="img"` named "Colours: Fern, Harbour, …", listing every colour, the collapsed ones included. Each dot has a tooltip.
- The sale is announced by `Price`; the rating is named "4.5 out of 5 stars, 128 reviews" by `Rating`.
- "Sold out" is text, not only the wash. The disabled quick-add button leaves the tab order.
- Alt text describes the photo. The name is already read, so pass `alt: ""` when the photo would only repeat it.

## Content
- `name` is the product's name as the catalogue has it, sentence case. It clamps to two lines.
- `subtitle` is one short line: the brand, the variant ("Fern glaze") or a summary ("8 colours").
- `badge` is one or two words or a number: "New", "-20%", "Sale". Don't put the price in it.
- Action labels start with a verb: "Add to cart", "Add to bag".
