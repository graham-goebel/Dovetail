---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
In the Builder (`builder.html`), Fill is rows of swatches instead of a dropdown, grouped Neutral, Brand and Status.
- Each swatch shows "Aa" in the frame's own colours, the surface and the text on it, so a dark builder no longer shows the light surfaces as black.
- The chosen fill is named after the label ("Fill Brand"). Pointing at or focusing a swatch names it there instead, and shows its tokens beneath (`--dt-surface-brand-muted · --dt-text-on-brand-muted`); otherwise no tokens show.
- The custom-colour eyedropper moves to the Fill section's head, beside the dark-band moon.
