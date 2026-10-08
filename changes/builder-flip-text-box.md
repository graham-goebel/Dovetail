---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On a freeform canvas the Builder's align row has *Flip across* and *Flip down* (Shift+H, Shift+V): they mirror the selected free layers, and pressed again put them back. A flip is written into the same `transform` as the layer's turn, as `rotate(…) scaleX(-1)`. A free Text or Heading has a *Text box* menu under Layout > Size: *Auto width* (it grows as it's typed, `width: max-content` in the code), *Auto height* (it wraps at its own width) or *Fixed size* (its own width and height, with what doesn't fit cut off). Picking one takes the size the text is drawn at; dragging a side or a corner on the canvas moves it between them the same way.
