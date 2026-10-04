---
type: added
bump: none
area: site
components: []
tokens: []
visual: true
---
On the Builder page (`builder.html`), a page sets its own column and gutter, and bands take their room from the module padding steps.

- **Frame settings.** Page width (Page, Narrow, Wide) and Page gutter (Page, Wide, None) re-point `--dt-layout-page-width` and `--dt-layout-page-gutter` for everything on that frame, and the exported code carries them on its root.
- **Width.** A layer's Width options for the page column read the page-width tokens, as "page narrow", "page" and "page wide", so a Group lines up with the Sections around it.
- **Padding.** Padding offers a section's padding, "section sm" to "section xl": a module padding step above and below and the page gutter at the sides. Padding top and bottom offer the module steps, and left and right offer the page gutter and the module inset. "Module padding" on Padding now sets the gutter at the sides instead of 96px all round.
- **Group gap.** Takes the layout layers (related, group, block, section) beside the space scale, so it moves with the layout's character. A Stack or Inline with a `layer` keeps it when it comes in or is detached.
- **Sections and blocks.** Spacing top, Spacing bottom and Bleed are in their Layout tab.
- **New structured pages.** The Content group sits in the page column with the page gutter at its sides and a group-layer gap.
