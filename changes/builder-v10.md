---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) gets floating panels, a New menu, templates that add instead of replace, block titles you can resize, media fills and a tidier inspector.

- **Floating panels.** On a wide screen the canvas runs the full width. The left and right panels float over it, inset from the edges with rounded corners. Fitting and centring frames keeps them clear of the panels.
- **One search.** A single search floats at the foot of the left panel, in the same place on Assets, Layers and Content, and searches whichever page is open. Content's search finds your images, illustrations, icons and clips by name.
- **New is a menu.** The **+** opens a glass menu under it instead of a dialog. It offers:
  - a Freeform canvas or a Structured page;
  - each template as a new frame or into the current frame;
  - Paste a layout;
  - Start over with a blank frame.

  Templates never clear the canvas. Assets › Templates offers the same two choices.
- **A press on the canvas** lets go of the selected layer and the frame. A press on a frame's empty canvas lets go of whatever is selected. With nothing selected, the same press picks the frame.
- **Nothing selected.** The inspector shows the system:
  - **Variables:** colour, in the frame's own theme; spacing; radius.
  - **Primitives:** press one to add it, or drag it.
  - **Styles:** the text styles with their sizes, and the shadows.

  These replace the list of frames.
- **Block titles.** Press a block's heading on the canvas, or its Title row in Layers, to edit the title's words and size. The size uses the block's new `titleSize` prop. Shift+Up and Shift+Down step through the sizes.
- **Media fills.** Drag a picture from Content onto an Image, a Cover or a Video's poster to fill it. Drag a clip onto a Video to fill it. Content's Video tab now keeps clips up to 1.5 MB.
- **The inspector:**
  - Text colour shows only for text layers.
  - Invert colours shows only for pictures (Image, Figure, Cover).
  - Blend is an icon that opens its list.
  - A frame's light or dark mode is a sun or moon toggle in its header. A layer's dark band is a moon toggle on Fill.
- **Dropdowns** are taller and wider, with roomier options.
- **Icons.** The builder draws with Heroicons, outline at 1.5px. Each kind of layer in Layers has its own icon.
- **Removed:**
  - the canvas's Show panels button, since the header's toggle does the same;
  - Layers' expand-all and collapse-all buttons.
