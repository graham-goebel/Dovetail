---
type: added
bump: none
area: site
components: []
tokens: []
visual: true
---
In the Builder (`builder.html`), the inspector is quieter, its choices slide, and width and height take relative units.
- **Units on W and H**: px, `%` of the parent, or `vw` and `vh` of the screen, for free layers and layers in the flow. Switching the unit keeps the size the layer has now. Layouts store them as `style.rw` and `style.rh` (for example `"50%"`, `"100vw"`), and the exported code writes them as they are. Dragging a handle goes back to pixels.
- **Sliding choices**: segmented rows and the inspector's tabs have a thumb that slides to the chosen option. Drag along the row to choose; letting go picks once.
- **Box model** marks margin and padding with an icon instead of the words.
- **Chevrons** show on hover: on a layer's row in Layers, and beside a section's name in the inspector. Touch screens always show them.
- **Variables move to the left sidebar**: the Canvas panel no longer lists them. Variables in Assets has In this project and Everything.
