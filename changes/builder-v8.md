---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) gets a New dialog, two kinds of frame, a clipboard, loose objects and a set of inspector and panel changes.

- **New.** The **+** in the toolbar replaces Start from. It opens three choices:
  - **Freeform canvas:** place anything anywhere, and give any layer a custom fill or text colour (`style.fill`, `style.color` as `#rrggbb`).
  - **Structured page:** everything sits in Groups that lay out with flex, in the flow, with tokens only. Something put straight on the page comes in a Group of its own. A frame's Kind switches between the two, and going structured gathers loose items into a Group.
  - **Template:** the ready-made pages and Paste a layout, as before.
- **Clipboard.** Ctrl+C, Ctrl+X and Ctrl+V (Cmd on a Mac) copy, cut and paste layers, between frames and pages too. The system clipboard gets the layers as JSON, so they also paste in another tab.
- **Code for the selection.** Code shows just what's selected: a Button is its own component. With nothing inside the frame selected, it's the whole screen.
- **PNG and JPG.** A frame's menu exports it as a picture at twice its size.
- **Loose objects.** Something dropped off every frame stays on the canvas where it's let go, with no page around it. A frame's name drags the frame anywhere.
- **Dragging** carries the thing itself under the pointer, drawn as it is, while the original fades. It no longer shows an outline with a name.
- **Type scale.** With a Heading or Text selected, Shift+Up and Shift+Down step it a size along the scale. A Heading goes from `heading-xl` to `display-sm`, and a Text goes from `body` to `lead`.
- **Frames.** Constrain proportions keeps width and height together, typed or dragged.
- **Builder settings.** A press on the empty canvas selects nothing, not even a frame. The inspector then shows the builder's own settings, such as the canvas background colour.
- **Layers.**
  - A component folds open onto what it's made of. Its own parts (headings, copy, pictures, controls) are shown but disabled, since they're set through its props, and its slots sit among them as real layers.
  - Every frame folds, and Expand everything and Collapse everything work at once.
- **Content** opens on a card for each kind (images, illustrations, icons, video), and a card opens its gallery.
- **Inspector.**
  - A Layer section adds a blend mode (`style.blend`) and Invert colours (`style.invert`).
  - Fill and a frame's canvas offer the strong `brand` and `brand-secondary` surfaces. Their text roles are re-pointed the way a brand Section's are, so a Heading on them reads in `--dt-text-on-brand`.
  - Tone dropdowns show a swatch for each tone.
  - Size dropdowns offer control, icon, avatar and media sizes only on the components they're named for, so avatar sizes appear only for an Avatar.
- **Layouts and links** can carry `mode`, `lock`, `x`, `y`, `bare`, and custom colours in a free frame, as `assets/builder-layouts.md` now describes.
