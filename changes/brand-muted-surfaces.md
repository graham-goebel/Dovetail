---
type: added
bump: minor
area: styles
components: [Section]
tokens: []
visual: false
---
`data-surface="brand-muted"` sets a region, or the whole page on `html` or `body`, to the brand's own tint instead of white and grey: `--dt-surface-base` becomes `--dt-surface-brand-muted` (the primary's 050 step, 950 in dark) and `--dt-surface-subtle` steps a little toward ink, so a band inside still reads against the page. Text keeps its ordinary roles, and a region that is also `.dark` resolves the dark tint. `Section tone="brand-muted"` remains for a band that also re-colours its text from the brand. Nothing changes unless the attribute is set.
