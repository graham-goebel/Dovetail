---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: true
---
The Builder (`builder.html`) reads better in dark mode and stays put on a phone.
- **Fields** in the inspector and the segmented controls sit lighter than their panel in dark mode, instead of darker.
- **Selection** draws in one clear colour, in both modes: the outline, the tag over what's picked, guides, the drop line and the resize handles. The handles are small white squares at each corner that grow when you hover one; the edges between still take a drag.
- **The canvas grid** is fainter and wider apart.
- **The page never scrolls.** The space left under the builder on a phone, which could be scrolled into and stick, is gone, and so is the site's floating menu button there.
- **Component previews** in Assets draw and scale in one step before they're shown, and draw even when the browser doesn't report that a tile has scrolled into view.
