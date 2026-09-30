---
type: added
bump: minor
area: components
components: [ProductCard, ProductGallery, VariantPicker]
tokens: [--dt-product-subtitle-color, --dt-product-soldout-overlay, --dt-swatch-border, --dt-swatch-ring, --dt-variant-bg, --dt-variant-bg-hover, --dt-variant-fg, --dt-variant-border, --dt-variant-selected-bg, --dt-variant-selected-fg, --dt-variant-selected-border, --dt-variant-unavailable-fg, --dt-variant-unavailable-border, --dt-variant-note-color, --dt-gallery-control-bg, --dt-gallery-control-bg-hover, --dt-gallery-control-fg, --dt-gallery-thumb-border, --dt-gallery-thumb-selected-border]
visual: false
---
The commerce family gains three product components. `ProductCard` shows a product's `image`, `name`, `price` (with `compareAt`, `currency` and `locale`), `rating`, `badge`, `subtitle` and colour `swatches` in a `vertical` or `horizontal` `layout`; with `href` the name is its one link, stretched over the card, while an `action` or the `onQuickAdd` button stays separately clickable, and `soldOut` washes out the photo and disables both. `ProductGallery` shows `images` with previous and next buttons, thumbnails at the `bottom`, on the `left` (moving below when the gallery is narrower than `collapseBelow`) or `none`, a counter, keyboard and swipe navigation, and a controlled `value` / `onChange` or an uncontrolled `defaultIndex`. `VariantPicker` chooses one option as `chips`, colour `swatches` or a `select`, as a radio group whose arrow keys skip `disabled` options, with the chosen label in the legend (`showSelected`). Their colours are the new `--dt-product-*`, `--dt-swatch-*`, `--dt-variant-*` and `--dt-gallery-*` tokens.
