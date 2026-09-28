---
type: fixed
bump: patch
area: components
components: [Button]
tokens: []
visual: false
---
Button's loading spinner no longer logs an SVG error: its `width` attribute held a CSS variable, which browsers reject. The spinner is still sized by `--dt-size-icon-sm`.
