---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) sizes things in pixels and context, pins items to a frame, and gets a smoother tool bar.

- **Sizes in pixels:** every size, spacing and offset option shows what it measures in the active frame, then its token name, such as `48 control-lg` or `24 lg`. The measurement follows the frame's layout character and the theme tried in Configure.
- **Context sizes:** the options that suit the selected item come first. A Button leads with control sizes, an Avatar with avatar sizes, an Image with media widths, and a Section or block with containers and the layout layers for its padding. Everything else sits under More sizes or More spacing.
- **Position:** a new Position section in Layout sets In flow, Sticky, Pinned (fixed to the frame) or Floating (over its parent). A pin pad places it in one of nine spots or across the top or bottom edge, and Offset sets the gap from that edge with an inset token.
- **Frames:** a frame's device, width and height sit under its name, with a swap button and Fixed height or Hug contents.
- **Smart tabs:** the inspector opens on the tab that suits the layer. A shape opens on Appearance, a container or frame on Layout, and text or a component on Content. It remembers the tab you pick for each kind.
- **Tool bar:**
  - Select and Hand share one button that toggles between them.
  - A group's tray floats above the bar and eases open and shut. It doesn't move under reduced motion.
  - Items drag from a tray, or from the assets panel, onto a frame.
  - A press on the empty canvas clears the selection and closes an open tray.
- **Tooltips:** resting the pointer on a control shows what it does after a moment.
