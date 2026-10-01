---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) gets an open canvas and a tabbed inspector.

- **Canvas:** every frame sits side by side on one surface. The wheel or a drag on empty canvas pans it, and Space-drag pans from anywhere. Ctrl/Cmd and the wheel, a trackpad pinch or a two-finger pinch on a touch screen zoom at the pointer. The zoom menu fits every frame (Shift+1), the active frame (Shift+2) or a set percentage (Shift+0 for 100%). Each frame's name and size sit above it. Click the name to select the frame, and double-click it to rename the frame. A click inside another frame makes that frame active. Components drag from one frame into another.
- **Frames:** a frame takes any width and height (200 to 3840 wide), from a device preset or typed. Hug contents makes its height follow what's in it. Starters and older layouts hug. The frame's context control is gone, and the canvas follows the context chosen in Configure.
- **Panels:** Tab, or Ctrl/Cmd+\, hides both side panels. Preview hides them too, and Escape leaves preview. The builder's own chrome no longer changes with a theme tried in Configure. Only the frames take it.
- **Inspector:** Appearance (tone, variant and other looks, fill, border, radius, shadow, dark band), Layout (arrangement, size, spacing) and Content tabs. Every item gets Height and Min width beside Width and Min height, all from tokens.
- **Assets and layers:** categories are named pills. Both search fields have a clear button, and Escape clears them too. Layers list every frame, with the active one open. The usage tips under the panels are gone.
- **Code:** the overlay is taller and wider.
