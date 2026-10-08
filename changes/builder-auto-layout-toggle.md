---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On a freeform canvas a Builder Group can switch between free positions and auto layout. With a free group of free layers selected, *Use auto layout* (Shift+A, or the menu) lays them out in a row or a column, whichever way they spread, in the order they stand, with the nearest gap (`--dt-space-inline-*` or `--dt-space-stack-*`) and padding (`--dt-space-inset-*`) tokens to what they had; the group keeps its place and hugs them. *Free positions* (Shift+A again) pins each where the layout put it and gives the group its drawn size. A shape or picture keeps its own size inside an auto layout.
