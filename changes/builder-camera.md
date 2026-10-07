---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
In the Builder (`builder.html`), panning and zooming the canvas do far less work. The camera lives outside React (`assets/builder/app/Stage.js`), and only the pieces that draw from it (the frames, their labels, the selection's marks, rulers, guides and columns, the in-place editor, the frame resizers) re-render as it moves; the selection's marks are measured once in their frame's own pixels and placed as the camera moves. Nothing changes on screen.
