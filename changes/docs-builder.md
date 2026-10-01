---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The docs site has a Builder page (`builder.html`) for arranging Dovetail components and blocks into new screens.

- **Placing things:** drag from the palette onto the canvas, or tap to add. Section, Stack, Inline, Grid and Card accept children. Drop lines show where a drop will land, and nodes move by dragging their tag or with the layer controls.
- **The canvas:** a real 390, 768 or 1280px frame in light or dark, in any context. It follows the Configure theme.
- **The inspector:** offers only tokens. Each component's own token-scale props (gap, layer, spacing, tone, width) come first. The surface, padding, radius, border, elevation and max-width choices are validated against the token files at build time, so a raw value can't be set.
- **Saving and sharing:** layouts save as you go, open from a share link, and export as React code that imports from `@dovetail-ds/react`. There are starters for a landing page, a store page, a settings form and a phone support chat.
