---
type: added
bump: minor
area: components
components: [Sheet]
tokens: [--dt-sheet-inset, --dt-sheet-top-gap, --dt-sheet-padding, --dt-sheet-button-size, --dt-sheet-button-bg, --dt-sheet-shadow]
visual: false
---
New `Sheet` component: a modal panel that rises from the bottom of a phone, inset from its edges, and opens as a centred dialog on a wide screen. It has a sticky bar with close (or back, via `onBack`) and an `action` slot, a big `title` that shrinks into the bar on scroll, `actions` chips or a `footer` pinned to the bottom, and drag-down-to-close and drag-right-to-go-back on touch.

It shares the overlay tokens with `Dialog` and adds `--dt-sheet-*` for its inset, top gap, padding, round buttons and shadow. Focus moves in on open, is trapped while open and returns on close; Escape and the scrim call `onClose` with the reason; reduced motion skips the open and close animations.
