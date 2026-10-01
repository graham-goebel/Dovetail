---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) opens up a component's own parts: its element props are slots.

- **Slots come from the types.** Every `React.ReactNode` prop whose sample is an element, such as a hero's `actions` and `media` or a card's `media` and `footer`, becomes a slot. No component lists them by hand.
  - What's in the sample comes apart into real components: the hero's `Inline` of two `Button`s, and its `Image` (keeping the sample's 4:3 ratio).
  - A prop the component clones, such as a popover's `trigger`, stays whole.
- **Pick a part on the canvas.** Click the hero's "Shop the collection" button and it's a Button in the inspector, at Landing › HeroBlock › Actions › Inline › Button. Change its variant or label, or add, reorder and delete what's in the slot. The hero stays a HeroBlock and keeps its own layout.
- **Real code.** Code writes the slot as JSX in its prop, for example `actions={<><Inline gap="sm"><Button variant="brand">Browse mugs</Button>…</Inline></>}`.
- **Slot inspector.** A slot says what it takes, lists what's in it, and can be emptied or put back to the sample.
  - A slot only takes the kinds that fit: `actions` takes buttons, links, badges and layout, and `media` takes images, video and figures.
  - Something it doesn't take goes after the component instead.
  - A component's types can name exactly what a slot takes with `@slot Button, Link`, or opt a prop out with `@slot none`.
- **Layouts and links.** A layout or share link can carry slots: `{ "type": "Slot", "props": { "name": "actions" }, "children": [...] }`, as `assets/builder-layouts.md` now describes.
- **More props in the inspector.** The builder now reads a literal union with a free-form fallback, number choices and indexed types. That adds `ratio` on Image, Video, Cover and AspectRatio, heading `level`s, grid `columns` on blocks, and a chat header's `presence`: 29 more props in all.
