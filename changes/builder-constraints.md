---
type: added
bump: none
area: site
components: []
tokens: []
visual: true
---
In the Builder (`builder.html`), a free layer on a freeform frame has constraints, the full set Figma has: across it keeps to the left (the default), the right, both edges (it stretches), the centre, or scales; down, the same with top and bottom.
- Set them in Layout → Position → Constraints: click an edge of the pin square (Shift for both edges, the middle lines to centre) or choose from the H and V lists.
- They apply whenever the frame changes size: dragging its edge (the layers follow as it moves), a typed or scrubbed width or height, Swap, a preset or a ratio.
- A selected layer shows dashed lines to the edges it keeps to.
- The exported code places pinned layers from those edges, in tokens and percentages, so the page keeps them there at any size.
