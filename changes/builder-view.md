---
type: added
bump: none
area: site
components: []
tokens: []
visual: true
---
In the Builder (`builder.html`), a View button beside zoom holds what the canvas shows and snaps to, each switch kept in this browser.
- Rulers (Shift+R) run along the open canvas, numbered in the active frame's pixels, with the selection's span lit.
- Guides drag out of a ruler onto a frame, land on a whole pixel, move by dragging, and go when dragged back onto a ruler. Free layers snap to them. They're kept with the frame; View can clear them.
- Layout columns (Shift+G) lay the page column over each frame: its gutters, then columns a `--dt-space-gutter` apart inside `--dt-layout-page-width`, read from the frame's own theme and page settings. A frame shows 4, 8 or 12 by its width; set its own count (1 to 24) under Page layout → Layout columns.
- Snap to objects and Snap to guides switch each kind of snapping off; Ctrl still skips both while held.
