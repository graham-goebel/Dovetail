---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) gets local components, social type, a theater for Play and a lighter left panel.

- **My components.** Select layers and press **Create component** in the inspector's head (Ctrl+Alt+K) to save them as a component of your own. It goes in Assets › Components › **My components**, to drag or press into any frame. Search finds it too.
  - A component has to be built from the system's tokens. The dialog lists what stops it: a custom fill or text colour, a layer placed by position inside it, a slot on its own, more than 300 layers, or no tokens at all. **Use the system's instead** takes the custom colours and positions out.
  - Uploaded pictures and a lone leaf layer are warnings, not blocks. The dialog lists every token the component is built on.
  - Rename or delete a component from its menu.
- **Social type.** The Device menu adds **Social post** (1080 × 1350), **Square post** (1080 × 1080) and **Story** (1080 × 1920). Each turns on the system's social type scale (`data-type-scale="social"`) so the words stay legible in a feed. A frame's **Type scale** setting, under Page layout, turns it on or off for any size. The JSX export carries the attribute.
- **Freeform frames** take any width and height, down to 16px, and resizing one by its edge no longer snaps to device sizes. Structured pages still land on a device size.
- **Structured pages lay themselves out.** A Group on a structured page stacks its contents with a gap and padding from the system, and a new structured page gaps its sections. Switching a frame to Structured does the same for what's in it.
- **Corners and shadow** wait behind a + in their own sections, as Border does, and a − takes them off.
- **A frame's inspector** no longer lists the frame's components. Pick them on the canvas or in Layers.
- **The system at rest.** Variables, Primitives and Styles list as rows: a swatch, sample or icon, the name and its token.
- **Play** opens as a theater: the screen alone on a dark stage, its name and Close at the top, and the screen heights in a bar at the foot where the canvas keeps its tools.
- **The left panel.** Assets' kinds and the primitives are white rounded tiles, an icon over a name, two to a row. Component tiles keep their previews, with the name centred under them, and rows no longer stretch to fill the panel.
