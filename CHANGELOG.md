# Changelog

Everything notable that changes in the Dovetail design system (`system/`), newest first. Versions follow [Semantic Versioning](https://semver.org) as applied to a design system in [docs/changelog.md](docs/changelog.md): a renamed or removed token, component, prop or default is a breaking change.

Don't edit this file directly. Add an entry to `changes/` with your pull request (`npm run change -- <slug>`); releases compile the entries into a new section here. Unreleased entries can be previewed with `npm run changelog`.

## 0.2.0 - 2026-09-29

### Breaking changes

- Dovetail's default look is monochrome and round: buttons, links, selection and focus are ink instead of the primary colour, secondary buttons are soft grey fills, buttons are pills, cards are bordered and flat, the greys have no hue, and the default primary is a warm orange used for accents. *(visual)* `Button` `IconButton` `Card` `Tabs` `Link` `--dt-surface-action` `--dt-text-link` `--dt-surface-selected` `--dt-border-selected` `--dt-focus-ring-color` `--dt-surface-action-secondary` `--dt-color-neutral-*` `--dt-color-primary-*` `--dt-radius-control` `--dt-radius-container` `--dt-radius-overlay` `--dt-button-radius` `--dt-card-elevation`

  In detail:

  - **Colour.** `--dt-surface-action`, `--dt-text-link`, `--dt-surface-selected`, `--dt-border-selected` and `--dt-focus-ring-color` point at the neutral ramp (ink on light, near-white on dark). Each has a new `-brand` twin holding the old primary values. `--dt-surface-action-secondary` is a soft grey fill with no border. The neutral ramp is pure grey (chroma 0); the primary ramp is a warm orange (500 is `#eb6834`) instead of blue.
  - **Shape.** `--dt-radius-control` 6→8px, `--dt-radius-container` 8→16px, `--dt-radius-overlay` 12→24px, `--dt-radius-media` 8→12px. `--dt-button-radius` reads `--dt-radius-pill`.
  - **Depth.** Cards are bordered and flat (`--dt-card-elevation` is `--dt-elevation-0`). Shadows are softer and wider, with a hairline ring on the floating levels.
  - **Type.** Display and heading roles are weight 500 with tighter tracking (new `--dt-tracking-tightest`, −0.04em). Body text uses tabular figures.
  - **Motion and glass.** `--dt-easing-standard` is `cubic-bezier(0.2, 0.8, 0.2, 1)`; glass saturates 1.6×.

  **Migration**

  To keep brand-coloured buttons, links, selection and focus, point each role at its `-brand` twin (or choose **Buttons and links: Brand** in Configure):

  ```css
  :root, .dark {
    --dt-surface-action: var(--dt-surface-action-brand);
    --dt-surface-action-hover: var(--dt-surface-action-brand-hover);
    --dt-surface-action-active: var(--dt-surface-action-brand-active);
    --dt-text-on-action: var(--dt-text-on-action-brand);
    --dt-text-link: var(--dt-text-link-brand);
    --dt-text-link-hover: var(--dt-text-link-brand-hover);
    --dt-surface-selected: var(--dt-surface-selected-brand);
    --dt-surface-selected-hover: var(--dt-surface-selected-brand-hover);
    --dt-text-on-selected: var(--dt-text-on-selected-brand);
    --dt-border-selected: var(--dt-border-selected-brand);
    --dt-focus-ring-color: var(--dt-focus-ring-color-brand);
  }
  ```

  To keep the previous shapes, set `--dt-radius-control: 6px; --dt-radius-container: 8px; --dt-radius-overlay: 12px; --dt-radius-media: 8px; --dt-button-radius: var(--dt-radius-control);` and `--dt-card-elevation: var(--dt-elevation-1);`. A theme that already sets its own primary ramp keeps its hue; only the controls change colour. Check screens with a primary button on a brand fill, which is now ink on colour.

### Added

- `data-surface="brand-muted"` sets a region, or the whole page on `html` or `body`, to the brand's own tint instead of white and grey: `--dt-surface-base` becomes `--dt-surface-brand-muted` (the primary's 050 step, 950 in dark) and `--dt-surface-subtle` steps a little toward ink, so a band inside still reads against the page. Text keeps its ordinary roles, and a region that is also `.dark` resolves the dark tint. `Section tone="brand-muted"` remains for a band that also re-colours its text from the brand. Nothing changes unless the attribute is set. `Section`
- `Card` can sit on a picture: `background` fills it with an image and `backgroundVideo` with a muted looping video. It sets its content at the bottom over a `scrim` (`gradient`, `solid` or `none`), and `onMedia` sets the text in near-white, pure white or a brand-tinted title. `Card` `--dt-text-on-scrim-strong` `--dt-text-on-scrim-brand` `--dt-size-media-min` `--dt-card-media-fg` `--dt-card-media-fg-secondary` `--dt-card-media-fg-strong` `--dt-card-media-fg-brand` `--dt-card-media-border` `--dt-card-media-min-height`

  A pictured card is dark in both colour modes (it scopes `.dark`, so buttons in its footer read light on dark) and holds at least `--dt-card-media-min-height`. The video doesn't autoplay for someone who prefers reduced motion; they see `background` as its still. New semantic tokens `--dt-text-on-scrim-strong` (pure white) and `--dt-text-on-scrim-brand` (a light brand step) are available for any text over imagery.

- Four layout layers say how closely the two things either side of a gap belong together: `related`, `group`, `block` and `section`, each with a stack and an inline gap (`--dt-layout-stack-*`, `--dt-layout-inline-*`). `Stack` and `Inline` take them as `layer`, which wins over `gap`. `Stack` `Inline` `--dt-layout-stack-related` `--dt-layout-stack-group` `--dt-layout-stack-block` `--dt-layout-stack-section` `--dt-layout-inline-related` `--dt-layout-inline-group` `--dt-layout-inline-block` `--dt-layout-inline-section`

  A layout character moves the layers as one: `tight` for a technical screen, `balanced` (the default), or `open` for room to breathe, where what is related stays close and the layers move apart. Set it on any region with `data-layout`, or with the new `spacing` prop on `Stack` and `Inline`; the layer tokens are re-declared under each value, so a region set inside a page of another character returns to its own. No existing token or prop changes.

  The Space foundation page is now Layout (`foundations/layout.html`, with the old address forwarding), and gains a Layers card.

- The layout has two more groups, both moved by the layout character (`tight`, `balanced`, `open`). Text is the gaps between the items of a block of text: `--dt-layout-text-eyebrow` (an eyebrow and its heading), `-subcopy` (a heading and its lead) and `-paragraph`. Modules is the room a module takes: `--dt-layout-module-padding` above and below its content, and `--dt-layout-module-gap` between its own parts. At `balanced` they are `--dt-space-stack-sm`, `-md`, `--dt-space-section` and `--dt-space-stack-xl`, so nothing changes until the layout does, and a context still moves them. `Stack` `Inline` `Section` `BlockHeader` `HeroBlock` `FeatureGridBlock` `StatsBlock` `TestimonialBlock` `FaqBlock` `SocialPost` `--dt-layout-text-eyebrow` `--dt-layout-text-subcopy` `--dt-layout-text-paragraph` `--dt-layout-module-padding` `--dt-layout-module-gap` `--dt-layout-scale`

  `Stack` takes `eyebrow`, `subcopy` and `paragraph` as its `layer`, and `Stack` and `Inline` multiply every layer by `--dt-layout-scale`, 1 on a page. `Section`'s default padding, `BlockHeader`'s gaps and the header-to-content gap in the hero, feature grid, stats, testimonial and FAQ blocks read them.

  `SocialPost` is built on `Stack` and `Inline`, with its margin and gaps as layout layers drawn at `--dt-social-scale` (2.5), so a post follows the page's layout, and takes `spacing` to set its own. Balanced looks as before.

- A new Blocks family of page sections that stack into landing pages: `HeroBlock`, `FeatureGridBlock`, `SplitBlock`, `StatsBlock`, `TestimonialBlock`, `FaqBlock` and `CtaBlock`, plus `BlockHeader` for starting a custom block in the same rhythm. `HeroBlock` `FeatureGridBlock` `SplitBlock` `StatsBlock` `TestimonialBlock` `FaqBlock` `CtaBlock` `BlockHeader`

  Each block is a `Section` with its layout decided and its content as props, and takes Section's `tone`, `dark`, `texture`, `spacing` and `width`, so a page is a list of blocks alternating tone. Layouts collapse to one column on a phone without media queries. A new "Landing page from blocks" template shows a full page built only from them.

- Configure's Fill has a Quiet option. `--dt-surface-brand` becomes the palest tint of the primary (`--dt-surface-brand-muted`, its 050 step, 950 in dark) and `--dt-text-on-brand` the text that belongs on it, so every band, block and social post on the brand tone goes quiet at once. The `-muted` tones stay as they are, for a single band. The choice is declared under `.dark` too, so a dark band inside a light page resolves its own tint; Gradient and Duotone now do the same. `Section` `SocialPost`
- New `Sheet` component: a modal panel that rises from the bottom of a phone, inset from its edges, and opens as a centred dialog on a wide screen. It has a sticky bar with close (or back, via `onBack`) and an `action` slot, a big `title` that shrinks into the bar on scroll, `actions` chips or a `footer` pinned to the bottom, and drag-down-to-close and drag-right-to-go-back on touch. `Sheet` `--dt-sheet-inset` `--dt-sheet-top-gap` `--dt-sheet-padding` `--dt-sheet-button-size` `--dt-sheet-button-bg` `--dt-sheet-shadow`

  It shares the overlay tokens with `Dialog` and adds `--dt-sheet-*` for its inset, top gap, padding, round buttons and shadow. Focus moves in on open, is trapped while open and returns on close; Escape and the scrim call `onClose` with the reason; reduced motion skips the open and close animations.

- New `SocialPost` component for Instagram stories (9:16) and grid posts (4:5 or 1:1). It draws at native pixel size (1080 wide) and scales to fit, in ten layouts that share one frame and editorial type scale: `headline`, `quote`, `stat`, `list` and `announcement` on a `tone`, and `cover`, `split`, `framed`, `card` and `poster` around an `image`. `SocialPost` `--dt-dim-artboard-width` `--dt-dim-artboard-square` `--dt-dim-artboard-portrait` `--dt-dim-artboard-story` `--dt-size-artboard-width` `--dt-size-artboard-square` `--dt-size-artboard-portrait` `--dt-size-artboard-story` `--dt-text-artboard-display-size` `--dt-text-artboard-title-size` `--dt-text-artboard-body-size` `--dt-text-artboard-meta-size` `--dt-social-width` `--dt-social-padding` `--dt-social-display-size` `--dt-social-bg` `--dt-social-fg` `--dt-social-on-image`

  Its sizes come from new artboard tokens (`--dt-size-artboard-*`, `--dt-text-artboard-*`), drawn for a 1080px canvas and never retuned by a context; its margin and gaps are layout layers drawn at the artboard's scale (`Stack` and `Inline` throughout), so a post follows the page's layout, and its colours alias the ordinary roles, so a theme rebrands every post. A new "Social templates" template shows all ten as stories, a 4:5 grid and squares.

- The marketing and dashboard templates draw line icons in navigation, buttons, feature cards and stat tiles. They also carry photo, video and illustration placeholders: fill a slot by dropping a file on it or by uploading in Configure's Media tab. *(visual)* `Image` `Video` `Cover`

  The icons come from `system/templates/_support/template-icons.js`, demo chrome drawn on the documented 24px convention. They follow Configure's icon stroke and size controls. The template switcher's Base theme now shows the shipped defaults instead of forcing the old blue ramp and radii. The site previews are compiled from `system/kits/` by `npm run build`, so the two no longer drift.

### Changed

- Accordion's disclosure icon is a plus that turns into a minus as a panel opens, in place of the chevron. Panels ease open and shut, with their height and opacity following `--dt-motion-emphasis`, so they respect reduced motion. A closed panel stays in the document but is hidden from the tab order and assistive technology. *(visual)* `Accordion`

### Fixed

- Button's loading spinner no longer logs an SVG error: its `width` attribute held a CSS variable, which browsers reject. The spinner is still sized by `--dt-size-icon-sm`. `Button`
- `Card` with `backgroundVideo` starts its video from an effect rather than an `autoPlay` attribute, so the server and the browser render the same markup and React no longer warns about a mismatch for readers who prefer reduced motion. The video still plays unprompted (it is muted and inline), and stays on its poster when reduced motion is on. `Card`
- The preview cards and the templates are responsive on a phone. None of them said `width=device-width`, so a phone laid every card out at 980px and shrank it to fit, and no media query in any of them ever ran; they only looked responsive in a desktop window dragged narrow. Every card now carries the viewport meta. *(visual)*

  Twelve colour and elevation cards, the type and space scales, the wordmark, the layers card, the settings page template and the theme configurator card were wider than a 390px screen. Their swatch rows become a grid, the settings page's sidebar becomes a strip above the page, the configurator's panel stacks over its preview, and the type scale sets each sample under its label. The docs pages also break a long path in a paragraph rather than widening the page. `npm run check` now loads every card and page as a 390px phone and fails on a missing viewport meta or content wider than the screen.

- Sixteen components' type declarations no longer clash with the native HTML attribute of the same name. `title` (a rich `ReactNode`), `content`, `role`, `size` and `onChange` (with the component's own signature) are left out of the inherited HTML props, so the declarations type-check under TypeScript with `@types/react` 18, and `<Tabs onChange={(id) => …}>` or `<Input size="lg">` no longer reads as an error. No runtime change. `Callout` `Cover` `Media` `Quote` `Card` `EmptyState` `Alert` `Banner` `Drawer` `Toast` `Tooltip` `Input` `Select` `AppShell` `Pagination` `Tabs`
- `SocialPost` headings keep the post's own colour on a page that styles `h2`, so a `brand` or photo post no longer shows dark text where it should be white. Body copy and the `list` layout ignore a host `max-width` on `p` and `ol`. If the `--dt-social-*` tokens haven't loaded, the artboard falls back to its native size (1080 × 1920, 1350 or 1080) instead of drawing blank or oversized. *(visual)* `SocialPost`

  On the docs site, links to preview cards now carry a stamp of the card and of the component bundle. A card opened after a release therefore loads the new bundle instead of a cached one that predates its component. This is what left the Social templates card blank.

- Every component now renders on the server with `renderToString`, so a Next.js-style page no longer logs React warnings. `SocialPost` was the only one that didn't: its scale measurement used `useLayoutEffect`, which React warns about during a server render. It now falls back to `useEffect` where there is no `document`, and behaves as before in the browser. The other 75 components already rendered cleanly. `node tools/check/ssr.mjs` renders all 76 and fails on any throw, `console.error` or `console.warn`. `SocialPost`

## 0.1.0 - 2026-09-28

The baseline: the first tracked version of Dovetail, recording what the system ships as of this release. Later releases list changes against it.

### Breaking changes

- The `accent` ramp and roles are now `primary`: `--dt-color-accent-*` became `--dt-color-primary-*`, and `tone="accent"` became `tone="primary"` on Badge, Progress and Link. Listed because exports made before the rename use the old names.

  **Migration**

  Find and replace `--dt-color-accent-` with `--dt-color-primary-`, and `tone="accent"` with `tone="primary"`. `--dt-surface-selected` and its hover now point at the primary ramp, so selected states follow the brand colour.

### Added

- **Tokens.** Three tiers: primitive, semantic and component. Every component colour alias is repeated under `.dark`, so scoped dark bands work. The set covers:
  - OKLCH colour ramps: primary, secondary, neutral and the feedback hues;
  - a type scale with display, body, secondary and mono families;
  - space, size, shape, elevation and blur, motion, and brand fills and textures;
  - layered surfaces for glass, image scrims and blur (`--dt-surface-glass*`, `--dt-scrim-*`, `--dt-backdrop-glass`).
- **Themes and contexts.** A base dark theme and a custom theme. Product, marketing and social contexts. Density, editorial and mono variations.
- **66 components** in one bundle (`system/components/bundle.js`, namespace `BeamMobileDesignSystem_e33121`), each with `.d.ts` types and usage docs:
  - Actions: Button, ButtonGroup, IconButton, Link
  - Content: Accordion, AspectRatio, BlockRenderer, Callout, Cover, Figure, Image, Media, Prose, Quote, Video
  - Display: Avatar, AvatarGroup, Badge, Card, Code, EmptyState, List, Skeleton, Stat, Table, Tag
  - Feedback: Alert, Banner, Dialog, Drawer, Popover, Progress, Spinner, Thinking, Toast, ToastRegion, Tooltip
  - Forms: Checkbox, CheckboxGroup, Combobox, Field, Input, Radio, RadioGroup, Select, Slider, Switch, Textarea
  - Navigation: AppShell, BottomNav, Breadcrumbs, Navbar, Pagination, Sidebar, Stepper, TabPanel, Tabs
  - Primitives: Divider, Grid, Inline, Section, Spacer, Stack, VisuallyHidden
  - Typography: Heading, Text
- **Thinking**, an assistant's loading states: connecting, listening, thinking, searching and speaking.
  - Nine shapes: five fluid (blob, orb, tile, dots, bars) and four textural (matrix, ascii, particles, sequence).
  - Inline or as a voice overlay, on a dark or light screen.
  - `tone`, `colors`, `speed`, `intensity` and a live `level`.
- **Brand controls** in Configure:
  - an exact brand hex anchored in its ramp, with editable steps and WCAG checks that explain themselves;
  - a secondary brand colour and a secondary type family;
  - 4 to 10 steps per ramp;
  - headline and wordmark colour roles.
- **Templates:** settings page, dashboard and marketing kits.

