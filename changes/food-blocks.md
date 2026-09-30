---
type: added
bump: minor
area: components
components: [MenuBlock, BasketBar, OrderTrackingBlock]
tokens: []
visual: false
---
`MenuBlock` lays out a restaurant's ordering page from `store`, `fulfilment` and `sections`, with a sticky category nav that scrolls to each section and follows the reader, and per-dish `quantities`, `onItemSelect`, `onItemAdd` and `onQuantityChange`; `BasketBar` is the floating "View basket" bar (`count`, `total`, `onClick`) that renders nothing while the basket is empty; `OrderTrackingBlock` shows the `eta`, `status`, a `map` slot with a drawn placeholder, a `courier` card with named Call and Message buttons, and the order's `lines` and `summary`. The new Food ordering template (FoodKit) composes them into a working phone ordering flow, from menu to delivery.
