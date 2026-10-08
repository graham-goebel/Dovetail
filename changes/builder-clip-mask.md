---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
In the Builder, a Group has *Clip content* under Layer: *To its box* (`overflow: hidden`, with its corners) or *To an ellipse* (`clip-path: ellipse(50% 50% at 50% 50%)`), so what reaches past its edge is cut off. On a freeform canvas, select a rectangle or ellipse and the layers over it, then pick *Use the shape as a mask* from the menu (right-click or Shift+F10): the shape becomes a Group in its place and size, keeping its fill, border and corners, clipped to its outline, with the other layers inside where they stood.
