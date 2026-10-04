---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) stays quick with many frames on the canvas.

- A project with more than 6 frames keeps only the frames near the view live. Frames further away show as a dashed outline with their name, and come alive as you pan or zoom to them, or select them. However far out you zoom, at most 8 frames are live at once.
- A big project opens on its active frame instead of zoomed out to the whole board.
- An edit redraws only the frame it changed, instead of re-checking every frame on the canvas.
