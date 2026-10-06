---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
In the Builder (`builder.html`), the inspector's first tab is Properties, ahead of Appearance and Layout, and holds everything a component has of its own.
- Content stays open. A component's own style props (Variant, Tone, Size and the like) sit under Style, and its own arrangement props (Spacing top, Bleed and the like) under Arrangement. Both start folded and remember being opened.
- Appearance and Layout now hold the same sections for every layer: fill, border, effects, blend; size, spacing, position. A container's auto layout stays under Layout.
