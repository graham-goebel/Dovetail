# Price

An amount of money, formatted for its currency and locale by `Intl.NumberFormat`, with an optional compare-at price for a sale and a unit such as "/ month".

## Use it when
- Showing what something costs: a product card, a cart line, a menu item, a plan, an order total.
- A sale needs the original price beside the new one (`compareAt`).
- The price is per something: `unit="/ month"`, `"each"`, `"/ kg"`.

## Don't use it when
- The number is not money. Use `Text` with `numeric` for counts and measurements.
- You need a range ("$20–$40") or "from $20". Compose two `Price`s, or put "From" in `Text` before one.

## Example
```jsx
<Price amount={24.5} compareAt={30} />
<Price amount={12} unit="/ month" size="lg" />
<Price amount={1290} currency="EUR" locale="de-DE" />
<Price amount={1200} currency="JPY" locale="ja-JP" />
<Price amount={0} freeLabel="Free delivery" size="sm" />
```

`amount` is in major units. Prices stored in minor units must be converted first: `cents / 100` for USD, EUR or GBP; a zero-decimal currency such as JPY needs no conversion.

## Variants
| Prop | What it is for |
|---|---|
| `size="sm"` | Cart lines, menu rows, dense lists. Label type at the small size. |
| `size="md"` | Default. Product cards and summaries. |
| `size="lg"` | The price on a product page or a plan card, at heading size. |
| `compareAt` | A sale: when greater than `amount`, it shows struck through after the amount, and the amount turns the sale colour. Equal or lower is ignored. |
| `unit` | What the price is per, after it, smaller and secondary. |
| `freeLabel` | Replaces a formatted zero ("$0.00"), "Free" by default. |

The locale defaults to the runtime's. Pass `locale` when server rendering so the server and the browser print the same string and hydration matches. An unknown currency code falls back to the number followed by the code.

## Composition
Inline: it renders a `<span>`, so it sits in a line of text, a card's footer or a table cell. It wraps between the amount, the compare-at price and the unit when space is short, never inside one of them. Other commerce components (product cards, cart lines, menus) render their prices with it.

## Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-price-color` (`--dt-text-primary`): the amount.
- `--dt-price-sale-color` (`--dt-text-danger`): the amount when it is on sale.
- `--dt-price-compare-color` (`--dt-text-tertiary`): the struck compare-at price.
- `--dt-price-unit-color` (`--dt-text-secondary`): the unit.

Type comes from the semantic roles: `--dt-text-label-md-*`, `--dt-text-label-lg-*` or `--dt-text-heading-md-*` for the amount, and `--dt-text-body-xs-*` or `--dt-text-body-sm-*` for the compare-at price and the unit. Figures are tabular, so prices in a column line up.

## Accessibility
- On a sale, the visible amount and the struck price are hidden from assistive technology and a visually hidden span reads "Was $30.00, now $24.50", using the same formatted strings the page shows. A strikethrough alone is not announced by most screen readers, so without this the two prices would read as one confusing number.
- The sale colour is never the only signal: the struck compare-at price carries it too.
- The unit is ordinary text and is read after the price.

## Content
- `unit` is lowercase and short: "/ month", "each", "/ kg", "per person". Put a space after the slash.
- `freeLabel` is sentence case: "Free", "Free delivery", "Included".
- Don't add the currency code yourself; `Intl` places the symbol where the locale expects it (`12,90 €` in German, `€12.90` in Irish English).
