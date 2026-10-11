---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
A round of Builder fixes to the inspector and Layers:

- **Units and fields.** A width or height's unit (px, %, vw, vh) now sits inside its field. The frame's Size rows no longer touch. Dropdown options show only their names; what each one means, or the token behind it, is a tooltip.
- **No more Freeform or Structured choice.** Every frame, page and Group has the Auto layout button. Turning it off on a frame that was made with auto layout pins what's on it, free to move. In Assets the frames are now called Frame, Auto layout frame and Tall frame.
- **Auto layout controls.** The alignment grid sits beside the direction and Wrap. Gap and Padding share a row, as do Stretch and Space between.
- **Secondary buttons** in the inspector are outlined, not filled; a pressed one takes the selection colour.
- **Components have their own colour**, violet, in Layers and on the canvas: the system's components and the file's own, apart from groups, text, shapes and pictures.
- **Ctrl+V** pastes copied layers even when the browser sends no paste event: with a layer row focused, in Safari, or on an iPad keyboard.
- **Ctrl+G** groups any selection: layers from different parents join the first one's parent, a layer picked along with its parent goes with it, and freely placed layers keep where they stand inside a Group placed and sized over them.
- **Dragging a selected row in Layers** moves every selected layer with it, in layer order.
