---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) gets changes to dragging, sizing, the panels and the top bar.

- **Dragging moves the layer itself.** A layer dragged inside its frame moves in place, snapped to where it will land. Nothing is copied and nothing fades. Off its frame it travels over the canvas as itself, with no card or shadow around it.
- **Swap.** With a component selected, Cmd-drag (Ctrl on Windows) another from Assets onto it to swap it. Cmd-click on a tile does the same. The new one takes the old one's place, its tokens and its size: a size set on it, or else the size token nearest to how big it was drawn.
- **Copy a frame.** Cmd+Shift-drag a frame or page, by its name or anywhere on it, to drop a copy where you let go. An outline shows where the copy lands.
- **Selection outlines** are 1px.
- **Sizes.** Width and Height list Auto, Hug contents, Fill container and Fixed. Fixed holds the layer at the size token nearest its drawn size. A frame's Fixed or Hug contents choice is now a Resizing menu.
- **Scrubbing.**
  - Press W, H, Min W or Min H and drag sideways to step through the sizes, smallest to largest. The whole drag is one undo step.
  - A frame's W and H scrub a pixel at a time, or ten with Shift.
- **Custom colours** open from a colour picker icon in place of the colour wheel. Once picked, the colour shows as a swatch.
- **A frame's components.** The inspector for a frame lists every component in it, indented by depth. Pressing one selects it on the canvas. With nothing selected, the builder settings list every frame.
- **Assets** opens on five kinds:
  - **Primitives:** layout and type.
  - **Variables:** fill, border, padding, radius, shadow and width tokens. Pressing one applies it to the selection.
  - **Components:** every other category.
  - **Blocks.**
  - **Templates:** each adds its frames beside yours without replacing anything.

  Search still looks through every component, from any of these views.
- **Tiles and cards** are all one height, with the picture over the words. In list view too, and on the Content panel's cards.
- **Top bar.** The bar spans the header. **Code** is now **Export**, at the right. Export offers the code, a PNG or JPG of the frame, and the layout JSON.
- **Layer links.** Copy link names the selected layer (`#b=…&f=<frame>&n=<layer>`). Opening the link selects that layer and brings its frame into view. A layer's inspector and a frame's menu each have their own Copy link.
- **New** opens as a glass dialog about half the screen tall.
