---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
Frames and loose objects on the Builder page (`builder.html`) move and size more predictably.

- Drag a frame by its own background to move it on the canvas, as well as by its name. A click on the background still selects the frame. On a touch screen, press and hold a frame's background, or drag its name. Empty canvas, Space with a drag, the middle button and the hand tool still pan.
- Something dragged off a frame onto the canvas keeps the width it had there, instead of becoming a desktop-wide frame. A section or block keeps its width too.
- Something put down loose from Assets is as wide as it is (up to a readable 960), instead of being squeezed to 120.
- A loose object has a right edge to drag, which gives it a width of its own.
- A new frame (the Frame tool, or F) is the screen size of the frame on screen when that is a screen size, and a desktop screen otherwise. It is never the size of a loose object. Dragged from the bar, it lands where you drop it. Otherwise it goes beside the frames already there.
