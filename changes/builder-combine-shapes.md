---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On a freeform canvas the Builder can combine free rectangles and ellipses into one shape: select two or more and pick *Union*, *Subtract*, *Intersect* or *Exclude* from the *Combine shapes* menu in the align row. They become a Group over their joint box, with the first shape's fill, drawn as a single inline SVG: subtract masks the others out of the first, intersect keeps where the first meets them, exclude keeps where they don't overlap. The shapes stay editable inside it (Layers selects each), the Group's *Combine* menu switches the operation, and *Off* shows them as plain shapes again. The code is the same SVG, with its masks, filled with the fill's token.
