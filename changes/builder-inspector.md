---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
On the Builder page (`builder.html`), the inspector gives finer control.
- **Visibility:** the Layer section has an eye button that hides or shows the selected layer. The hover eye in the Layers panel is gone; a hidden layer keeps a quiet eye-off there, which shows it again.
- **Opacity in freeform frames:** a slider and a number take any whole percent. Arrows step 1%, Shift 10%; the keys 1 to 9 set 10% to 90% and 0 makes it opaque. A slider drag is one undo step, and the exported code carries it as `opacity`. Structured frames keep the opacity roles. Layouts store it as `style.alpha`, a whole percent from 0 to 99, only in freeform frames.
- **Swatches** are rounded squares, with corners in proportion to the controls around them.
- **Padding and margin:** a side left unset shows what the layer really has, measured on the canvas, in grey with where it comes from (a component's own padding names its token). Drag sideways on a side to step through the spacing that suits the layer, hold Shift to set every side, press Up and Down to step it, and Alt-click to clear it. A drag is one undo step.
- **Blend modes** show on the canvas as you hover them or move through them with the arrows. Escape, or moving away, puts back the mode you had; a click keeps the new one as one undo step.
