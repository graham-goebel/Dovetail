---
type: added
bump: minor
area: tokens
components: [Stack, Inline, Section, BlockHeader, HeroBlock, FeatureGridBlock, StatsBlock, TestimonialBlock, FaqBlock, SocialPost]
tokens: [--dt-layout-text-eyebrow, --dt-layout-text-subcopy, --dt-layout-text-paragraph, --dt-layout-module-padding, --dt-layout-module-gap, --dt-layout-scale]
visual: false
---
The layout has two more groups, both moved by the layout character (`tight`, `balanced`, `open`). Text is the gaps between the items of a block of text: `--dt-layout-text-eyebrow` (an eyebrow and its heading), `-subcopy` (a heading and its lead) and `-paragraph`. Modules is the room a module takes: `--dt-layout-module-padding` above and below its content, and `--dt-layout-module-gap` between its own parts. At `balanced` they are `--dt-space-stack-sm`, `-md`, `--dt-space-section` and `--dt-space-stack-xl`, so nothing changes until the layout does, and a context still moves them.

`Stack` takes `eyebrow`, `subcopy` and `paragraph` as its `layer`, and `Stack` and `Inline` multiply every layer by `--dt-layout-scale`, 1 on a page. `Section`'s default padding, `BlockHeader`'s gaps and the header-to-content gap in the hero, feature grid, stats, testimonial and FAQ blocks read them.

`SocialPost` is built on `Stack` and `Inline`, with its margin and gaps as layout layers drawn at `--dt-social-scale` (2.5), so a post follows the page's layout, and takes `spacing` to set its own. Balanced looks as before.
