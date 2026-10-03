---
type: added
bump: minor
area: components
components: [MenuSheet]
tokens: [--dt-menu-sheet-bg, --dt-menu-sheet-fg, --dt-menu-sheet-muted, --dt-menu-sheet-divider, --dt-menu-sheet-scrim, --dt-menu-sheet-radius, --dt-menu-sheet-shadow, --dt-menu-sheet-inset, --dt-menu-sheet-top-gap, --dt-menu-sheet-padding, --dt-menu-sheet-width, --dt-menu-sheet-fill, --dt-menu-sheet-chip-on-bg, --dt-menu-sheet-chip-on-fg, --dt-menu-sheet-link-size, --dt-menu-sheet-control-size, --dt-menu-sheet-open, --dt-menu-sheet-close, --dt-menu-sheet-layer, --dt-menu-sheet-travel, --dt-menu-sheet-ease]
visual: false
---
`MenuSheet` is a site or app menu as one sheet, with search built in. It is the menu the Dovetail site uses on a phone.
- `items` is the top level, set large. An item with `items` opens a layer that slides in from the side, and the path at the top ("Menu / Shop") goes back.
- A layer's `display` is `list`, `cards` or `filter`; `filter` turns each group into a chip over one list.
- Search and close sit in the footer, the same on every layer. Search turns the footer into a field with results above it, and looks through every item unless you pass `searchItems` or `onSearch`.
- Pass the button that opens it as `anchor` and the sheet grows out of it and shrinks back into it.
- On touch, a drag down closes it and a drag right goes back.
- It is a modal dialog: focus moves in and stays in, Escape leaves search and then closes, and focus returns to the opener. Under reduced motion nothing grows, slides or fades.
- `onSelect` hears every choice, for routing in an app. `home`, `links`, `surface` and every label are options.
- Its colours, sizes and motion timing are `--dt-menu-sheet-*` tokens.
