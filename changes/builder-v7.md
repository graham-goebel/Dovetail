---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) gets a left rail, a content library, free placement, edge resizing, spacing on Shift, and Play.

- **Left rail:** icons down the left panel switch between Assets, Layers, Content and Configure.
  - Configure now sits in the panel on this page, instead of floating over it.
  - The top bar no longer repeats New frame, the frame size or dark mode. They live in the tool bar and the frame's inspector.
- **Content:** a library of images, illustrations and SVG icons, kept in this browser.
  - Upload them, or drop files on the panel.
  - Drag one onto a frame, or press it to add it.
  - Pick one for any Image from the inspector.
  - Remove background cuts a plain backdrop out of a picture and keeps the original to put back. It runs in the browser and works on plain or smoothly graded backdrops, not busy scenes.
  - The Icons tab also picks the icon library the system draws with. Video is marked coming soon.
- **Tool bar:** a press adds the item straight away, into the selection or the frame. A drag puts it exactly where it's let go. There's no marquee to draw on the canvas any more.
- **Free placement:** something dropped on a frame's canvas, outside any stack, stays where it lands. Its position is x and y steps of `--dt-space-inset-2xs`.
  - Bands (sections, headers, blocks) still join the page's flow.
  - Dropping an item into a stack puts it back in the flow.
  - X and Y fields and Put it in the flow sit under Position.
- **Resizing:** drag a frame's right edge, bottom edge or corner to resize it.
  - A page lands on a standard viewport width or height.
  - A frame snaps to one when it comes close.
- **Canvas colour:** a frame's canvas takes a surface token, or one custom colour.
- **Spacing:** hold Shift and point at something.
  - With an item selected, it shows the gap between them with the token that makes it, such as `16 gap md`, or the padding of a container around the item.
  - With nothing selected, it shows the item's own padding.
  - Press a label to open that token in the inspector.
- **Override dots:** an inspector section shows a dot when something in it is set on the item rather than left to the default.
- **Play:** opens the frame in a window cut to a device's height (812 on a phone, 1180 on a tablet, 900 on a desktop, and others). It scrolls inside, so sticky, pinned and floating items behave the way they would on the device.
