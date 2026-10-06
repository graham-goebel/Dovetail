---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
In the Builder (`builder.html`), panning and zooming do less work: the selection's marks are measured in their frame's own pixels once and placed on the stage as the camera moves, instead of being measured again on every move. Nothing changes on screen.
