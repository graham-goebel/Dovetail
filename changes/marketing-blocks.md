---
type: added
bump: minor
area: components
components: [HeroBlock, FeatureGridBlock, SplitBlock, StatsBlock, TestimonialBlock, FaqBlock, CtaBlock, BlockHeader]
tokens: []
visual: false
---
A new Blocks family of page sections that stack into landing pages: `HeroBlock`, `FeatureGridBlock`, `SplitBlock`, `StatsBlock`, `TestimonialBlock`, `FaqBlock` and `CtaBlock`, plus `BlockHeader` for starting a custom block in the same rhythm.

Each block is a `Section` with its layout decided and its content as props, and takes Section's `tone`, `dark`, `texture`, `spacing` and `width`, so a page is a list of blocks alternating tone. Layouts collapse to one column on a phone without media queries. A new "Landing page from blocks" template shows a full page built only from them.
