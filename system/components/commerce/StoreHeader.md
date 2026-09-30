# StoreHeader

The top of a restaurant or store page: a cover, a logo, the name, a rating, a line of short facts, the delivery time and fee, and whether the store is open.

## Use it when
- Opening a store's own page in a food-ordering or retail app, above the `FulfilmentToggle` and the menu.
- A store needs to say at a glance whether it takes orders now, how long delivery takes and what it costs.

## Don't use it when
- Listing many stores in a feed or a search result. Use `Card` with a `media` image; a header is for one store's page.
- The page is about a product, not a store. Use `Heading` and `Price`.
- You need a marketing hero. Use `HeroBlock` or `Cover`.

## Example
```jsx
<StoreHeader
  name="Bangkok Kitchen"
  image={{ src: cover, alt: "" }}
  logo={{ src: logo, alt: "" }}
  rating={{ value: 4.6, count: 1284 }}
  meta={["Thai", "$$", "1.2 mi"]}
  deliveryTime="25–35 min"
  deliveryFee={2.99}
  status={{ open: true, label: "Open until 10pm" }}
  actions={<IconButton label="Save to favourites"><HeartIcon /></IconButton>}
  locale="en-US"
/>

{/* Closed, with free delivery */}
<StoreHeader name="Bangkok Kitchen" deliveryFee={0} status={{ open: false, label: "Closed · opens 11am" }} />
```

## Variants
| Prop | What it is for |
|---|---|
| `image` | The cover, 3:1 and no taller than `--dt-store-cover-max-height`. Its space is reserved before it loads, so the page does not jump; without a `src` the empty surface shows. Omit it for no cover. |
| `logo` | A square tile. With a cover it overlaps the cover's lower edge on a ring of the page surface; without one it sits above the name. |
| `rating` | A small display `Rating` with the review count. |
| `meta` | Three or four short facts separated by middle dots. A line never starts or ends with a dot when it wraps. |
| `deliveryTime`, `deliveryFee` | The time with a clock icon; the fee through `Price`, "$2.99 delivery", or `freeDeliveryLabel` at 0. Leave the fee out for pickup. |
| `status` | `open: false` greys the cover and logo, lays the scrim over the cover and turns the label the danger colour. The label says it in words. |
| `actions` | Favourite, share and similar `IconButton`s, beside the name. |
| `headingLevel` | The name's heading level, 1 by default. |

## Composition
Sits at the top of a store page, usually inside an `AppShell` body on a phone, followed by a `FulfilmentToggle` and the `MenuSection`s. The fee reads `Price` and the rating reads `Rating`, so they follow those components' tokens. Actions are whatever you pass; keep them to two.

## Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- `--dt-store-cover-bg` (`--dt-surface-sunken`), `--dt-store-cover-radius` (`--dt-radius-media`), `--dt-store-cover-max-height` (`--dt-size-media-min`).
- `--dt-store-logo-size` (`--dt-size-avatar-xl`), `--dt-store-logo-radius` (`--dt-radius-media`), `--dt-store-logo-bg` (`--dt-surface-raised`), `--dt-store-logo-ring` (`--dt-surface-base`).
- `--dt-store-meta-color` (`--dt-text-secondary`), `--dt-store-open-color` (`--dt-text-success`), `--dt-store-closed-color` (`--dt-text-danger`), `--dt-store-closed-scrim` (`--dt-surface-scrim`).

The name is `--dt-text-heading-md-*`; the facts are `--dt-text-body-sm-*`.

## Accessibility
- The name is a real heading (`h1` by default). Set `headingLevel` to fit the page's outline.
- Status is announced as its label ("Closed · opens 11am"). The greyed cover and the colour repeat it; they never carry it alone.
- The middle dots are `aria-hidden`, so the facts read as a sequence of words. The rating reads as "4.6 out of 5 stars, 1,284 reviews".
- Give the cover and logo empty `alt` when they only decorate; describe them when they show something the text does not.
- Each action is yours to label: pass `IconButton`s with a `label`.

## Content
- `name` as the store writes it.
- `meta` items are one or two words each: cuisine, price band, distance.
- `status.label` is sentence case and says what happens next: "Open until 10pm", "Closed · opens 11am", "Busy · orders may be late".
- `deliveryTime` is a range with an en dash and a unit: "25–35 min".
