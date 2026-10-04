---
type: added
bump: none
area: site
components: []
tokens: []
visual: true
---
On the Builder page (`builder.html`), the canvas gains the precision tools other design tools have.

- **Keys.** Arrows move a free object a step of `--dt-space-inset-2xs` (Shift: four). Cmd+A selects everything at the top of the frame. Cmd+] and Cmd+[ step the z-order, with Shift to the front and the back. Shift+2 zooms to the selection. Alt-drag drags a copy and leaves the original in place. 1 to 9 step a layer's opacity through its roles, 0 makes it opaque. Ctrl+Alt+C and Ctrl+Alt+V copy and paste a style between layers.
- **Marquee.** With the Select tool, a mouse or pen dragged across empty canvas draws a box and selects what it touches; Shift adds, Escape cancels. Space, the Hand tool, the middle button and touch still pan.
- **Align and distribute.** Under the inspector's title, free objects get align left, centres, right, top, middles and bottom, spread evenly across or down, and tidy up (Alt+A/H/D/W/V/S, Shift+Alt+H/V/T). One object lines up with its frame, several with each other.
- **Smart guides.** A free object dragged near a sibling's edge or centre, or the frame's, snaps to it with a guide line; between two siblings it snaps to equal gaps, labelled. Cmd or Ctrl held turns the snapping off.
- **Resize handles.** The selected object gets handles that set its width and height to the nearest size tokens, live, as one undo step; a free object's top and left edges move it as it grows; Shift on a corner keeps the shape.
- **Lock and hide.** Each layer row ends with an eye and a lock (Ctrl+Shift+H, Ctrl+Shift+L). A hidden layer isn't drawn and stays out of the exported code; a locked one is left alone on the canvas but still answers in Layers.
- **Right-click menu.** On a canvas layer, a layer row or empty canvas (and Shift+F10): cut, copy, paste, duplicate, delete, copy and paste style, select all of a kind, bring forward or back, group, hide, lock, rename, make a component, copy a link.
- **Opacity.** The Layer section offers the four opacity roles from the new `--dt-opacity-*` tokens.
