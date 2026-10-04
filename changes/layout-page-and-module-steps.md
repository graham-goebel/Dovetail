---
type: added
bump: minor
area: tokens
components: [Section, HeroBlock, FeatureGridBlock, CtaBlock, FaqBlock, SplitBlock, StatsBlock, TestimonialBlock, ProductGridBlock, ProductDetailBlock, CartBlock, CheckoutBlock, MenuBlock, OrderTrackingBlock]
tokens: [--dt-layout-page-width, --dt-layout-page-width-narrow, --dt-layout-page-width-wide, --dt-layout-page-gutter, --dt-layout-module-padding-sm, --dt-layout-module-padding-md, --dt-layout-module-padding-lg, --dt-layout-module-padding-xl, --dt-layout-module-inset]
visual: true
---
Pages share one column, and bands take their room from a scale. `--dt-layout-page-width` (1280px) is the content width every page and section reads, beside `--dt-layout-page-width-narrow` (768px) and `--dt-layout-page-width-wide` (1536px); Configure's new Page width setting (`pageWidth`: 1024, 1280 or 1536) moves it for every page. `--dt-layout-page-gutter` keeps the column off the screen's edge. `--dt-layout-module-padding-sm`, `-md`, `-lg` and `-xl` (64, 96, 128 and 160px at the balanced character) are the steps of a band's padding, and `--dt-layout-module-inset` pads a band set in from the page edges. All of them except the page widths move with the layout's character, contexts and Configure's Modules setting.

`Section`, and every block built on it, takes `spacing="sm" | "md" | "lg" | "xl" | "none"`, `spacingTop` and `spacingBottom` to set either edge apart, and `bleed="inset"` to set the band's fill in from the screen's edges with the container radius. `spacing="default"` and `"compact"` still work, as `md` and `sm`. Its widths now read the page-width tokens, which have the same values as the container sizes they replace.

Looks different: a `compact` section, and the side gutter of a section inside a `data-layout="tight"` or `"open"` region, now follow the layout's character, so a compact band is 40px on a tight page and 80px on an open one rather than 64px everywhere. A band inside a product, marketing or social context region now takes that context's rhythm and gutter even when the context class isn't on the page's root.
