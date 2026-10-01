---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) works more like a design tool.

- **Frames:** a layout is a set of frames. Add, duplicate, rename and delete them from the strip above the canvas. Each has a size from six device presets (390 to 1440px), its own light or dark mode, context and fill. Code exports the active frame, named after it.
- **Header:** the toolbar (start from, undo, frame size, mode, zoom, saved, preview, share, code) sits in the site header, which drops its search and page menu on this page.
- **Canvas:** zoom with Ctrl/Cmd and the wheel, Ctrl/Cmd+plus and minus, or the zoom menu (Ctrl/Cmd+0 fits). Clicking empty canvas deselects. Double-click text, or Cmd/Ctrl+click it, to type in place. Selection marks are monochrome.
- **Selection:** Enter selects a container's children (or edits a leaf's text); Shift+Enter selects the parent. Shift-click selects several anywhere. Several of one kind edit together, and a mix edits size, spacing and appearance together; differing values read Mixed.
- **Inspector:** the head keeps Wrap, Group and Detach only. Padding, margin and border each take one value or one per side. Image, Cover and Video take an uploaded file or a URL. No lock icons.
- **Detach:** rebuilds Card, BlockHeader, HeroBlock, SplitBlock, CtaBlock, FeatureGridBlock, StatsBlock, TestimonialBlock, FaqBlock, ProductGridBlock, Stack and Inline from primitives, so their parts can be moved and restyled.
- **Layers:** no drag handles (drag the row), and double-click a Group to rename it.
