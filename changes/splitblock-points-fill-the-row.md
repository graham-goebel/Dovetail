---
type: fixed
bump: patch
area: components
components: [SplitBlock]
tokens: []
visual: false
---
`SplitBlock` gives each of its `points` the rest of its row beside the check, rather than sizing it to its own text, so a point never collapses to one word a line (as it could in Safari beside media). The copy column also no longer grows wider than its share of the grid.
