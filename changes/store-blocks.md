---
type: added
bump: minor
area: components
components: [ProductGridBlock, ProductDetailBlock, CartBlock, CheckoutBlock]
tokens: []
visual: false
---
Four store blocks compose the commerce components into page sections: `ProductGridBlock` sets `products` in a grid of `columns` (2, 3 or 4) that drops to two on a phone, with an `action` beside the header and an `emptyState`; `ProductDetailBlock` puts a gallery beside a buy box with `variants`, `quantity`, a full-width add button gated by `canAddToCart` or `soldOut`, and `details` in an accordion; `CartBlock` sets `lines` beside a sticky `summary` with `promo` and `checkoutAction`, or an empty state; and `CheckoutBlock` lays out contact, `address`, `deliveryOptions` and `payment` beside the order, which folds into a "Show order summary" disclosure below `collapseBelow` and becomes a form when you pass `onSubmit`. A new StoreKit template shows them working together, from browsing to an order confirmation.
