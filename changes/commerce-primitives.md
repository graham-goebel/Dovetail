---
type: added
bump: minor
area: components
components: [Price, Rating, QuantityStepper]
tokens: [--dt-price-color, --dt-price-sale-color, --dt-price-compare-color, --dt-price-unit-color, --dt-rating-color, --dt-rating-empty-color, --dt-rating-count-color]
visual: false
---
A new commerce family starts with three primitives. `Price` formats `amount` for its `currency` and `locale` with `Intl.NumberFormat`, strikes through a higher `compareAt` price and announces "Was …, now …", and takes a `unit`, a `size` and a `freeLabel`. `Rating` shows a `value` in half stars with an optional review `count`, or, given `onChange` and a required `label`, becomes a keyboard-operable radio group of stars. `QuantityStepper` is a − value + control with a typeable `role="spinbutton"` field, `min`, `max` and `step`, and an `onRemove` that turns the minus button into a remove button at the minimum. Their colours are the new `--dt-price-*` and `--dt-rating-*` tokens.
