---
type: added
bump: minor
area: components
components: [Navbar, Drawer]
tokens: []
visual: false
---
`Navbar` has a `surface` prop, and the menu it opens on a narrow screen takes the same fill.

- `"base"` (default): the page surface, as before.
- `"brand"`: the strong brand fill. Text, links, the current link's mark and the buttons in `actions` turn to `--dt-text-on-brand`, the same as on a brand `Section`.
- `"brand-muted"`: the pale brand tint, with the brand's ink for text and the brand colours for buttons.
- `"glass"`: the page shows through, blurred.

`Drawer` has a matching `surface` prop: `"raised"` (default), `"glass"`, `"glass-strong"`, `"brand"` or `"brand-muted"`.
