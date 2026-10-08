---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's Shape takes a third kind, *Line*, picked from its Shape menu. A line is drawn by its border: the Border section's colour, width and style, or a strong border until one is set, and a custom fill colours it. Its *Start* and *End* menus put a cap on each end (none, arrow, dot or bar), in the line's colour and at its stroke's width. A selected line has a handle at each end, and turns with the rotation handle. Every Border now has *Width* (default or `--dt-border-width-strong`) and *Style* (solid, dashed or dotted) menus. They rewrite the width and style inside the border, so the code keeps one `border` declaration per side; a line exports as a `div` whose `borderTop` is its stroke, with its caps as small inline SVGs. Pasted code brings a border's width and style back as these choices.
