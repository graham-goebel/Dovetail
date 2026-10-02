---
type: changed
bump: minor
area: components
components: [Section, Button]
tokens: []
visual: true
---
Buttons follow every brand fill now, not only the pale Section tones.

- **On a strong fill** (`Section tone="brand"` or `"secondary"`, and the new `data-surface="brand"`), a primary or `brand` `Button` takes `--dt-text-on-brand` as its fill and the brand as its label. A secondary one is outlined in that text colour, and a ghost one reads in it. Before this change, a primary Button on a brand Section was the same colour as the band. Links (`--dt-text-link`), `--dt-border-subtle` and `-default`, `--dt-border-selected` and the focus ring move to the text colour too.
- **On the pale tint**, `data-surface="brand-muted"` now gives its buttons the brand colours, as a `brand-muted` Section already did: the primary takes the brand colour and the secondary the secondary brand colour. Text keeps its ordinary roles there, as before.
- **New `data-surface="brand"`** puts the strong brand fill on a page or any region, with the text, links, borders, focus ring and buttons that read on it.
- **In the builder**, Fill's brand options carry the same button rules, so what the builder shows is what the components do.

To keep the ink buttons on a brand region, set the `--dt-button-primary-*` and `--dt-button-secondary-*` tokens back to the action roles in a style or theme on that region.
