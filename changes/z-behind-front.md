---
type: added
bump: minor
area: tokens
components: []
tokens: [--dt-z-behind, --dt-z-front]
visual: false
---
The stacking ladder gains two steps for content: `--dt-z-behind` (-1) puts a layer under its siblings, and `--dt-z-front` (20) puts one over raised layers, such as copy above a floating shape. The Builder sets them with a new style key, `z` (Layer order: `behind`, `base`, `raised`, `front`), shown under Position. A container holding a layer set behind gets `isolation: isolate`, on the canvas and in exported code, so that layer stays above the container's own fill. Pasted JSX reads the order back, and a floating Group pasted from code now stays floating.
