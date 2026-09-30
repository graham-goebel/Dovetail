# Changelog

Everything notable that changes in the Dovetail design system (`system/`), newest first. Versions follow [Semantic Versioning](https://semver.org) as applied to a design system in [docs/changelog.md](docs/changelog.md): a renamed or removed token, component, prop or default is a breaking change.

<!-- Contributors: don't edit this file directly. Add an entry to `changes/` with your pull request (`npm run change -- <slug>`); releases compile the entries into a new section here. Unreleased entries can be previewed with `npm run changelog`. -->

## 0.6.0 - 2026-09-30

### Added

- A chat family builds a conversation from props: `ChatHeader` (title, subtitle, avatar, `presence`, `onBack`, `actions`), `MessageList` (a named `role="log"` that stays pinned to the newest message and offers a "New messages" jump when the reader has scrolled up) with `MessageDivider`, `MessageBubble` (`from`, `time`, `status` with `onRetry`, group `author`, and `grouped` run shapes), `Composer` (controlled; Enter sends, Shift+Enter adds a line, grows to `maxRows`, optional `onAttach`), `TypingIndicator` (`name`) and `QuickReplies` (`options`, `onSelect`). Sent bubbles use the action surface, so they follow the ink-or-brand choice in Configure; the new `--dt-bubble-*`, `--dt-presence-*`, `--dt-chat-*`, `--dt-typing-*` and `--dt-quick-replies-*` tokens tune the rest. `ChatHeader` `MessageList` `MessageDivider` `MessageBubble` `Composer` `TypingIndicator` `QuickReplies` `--dt-bubble-sent-bg` `--dt-bubble-sent-fg` `--dt-bubble-received-bg` `--dt-bubble-received-fg` `--dt-bubble-meta-fg` `--dt-bubble-author-fg` `--dt-bubble-read-fg` `--dt-bubble-failed-fg` `--dt-bubble-radius` `--dt-bubble-radius-tight` `--dt-bubble-padding` `--dt-bubble-gap` `--dt-bubble-run-gap` `--dt-presence-online` `--dt-presence-away` `--dt-presence-offline` `--dt-presence-size` `--dt-chat-surface` `--dt-chat-border` `--dt-chat-divider-fg` `--dt-typing-beat` `--dt-typing-dot` `--dt-typing-dot-size` `--dt-quick-replies-gap` `--dt-quick-replies-border`
- Six cart and checkout components join the commerce family, all presentational and controlled: they show what they are given and call back, with no cart state, totals arithmetic, payment processing or network. `CartLine` shows an item with `image`, `details`, `price`/`compareAt`, an optional `lineTotal` and `note`, and a `QuantityStepper` and Remove button named after the item (`onQuantityChange`, `onRemove`, `maxQuantity`), or "Qty 2" when `readOnly`, at `size` `"sm"` or `"md"`. `OrderSummary` lays out `lines` (with `kind` `"discount"` shown as a negative, and `"muted"`) and a `total` as a description list, with an optional `freeShippingProgress` bar and a `footer`. `PromoCode` is a collapsible code field whose `onApply` fires on Apply or Enter, with `error`, `loading` and an `applied` chip removed by `onRemove`. `AddressFields` and `PaymentFields` are fieldsets with the standard `autoComplete` tokens; `PaymentFields` formats card numbers (4-6-5 for Amex) and `MM / YY` as the user types and shows a text `brand` badge, and its guide directs real payments to the provider's hosted fields. `OrderStatus` is an ordered-list timeline with `aria-current="step"`, a `status` of `"active"`, `"delayed"` or `"cancelled"`, and an `orientation="horizontal"` that turns vertical when its box is too narrow. Their colours and sizes are the new `--dt-cart-*`, `--dt-summary-*`, `--dt-promo-*` and `--dt-order-status-*` tokens. `CartLine` `OrderSummary` `PromoCode` `AddressFields` `PaymentFields` `OrderStatus` `--dt-cart-line-divider` `--dt-cart-thumb-bg` `--dt-cart-thumb-border` `--dt-cart-thumb-fg` `--dt-cart-detail-color` `--dt-cart-note-color` `--dt-cart-thumb-radius` `--dt-cart-thumb-size-sm` `--dt-cart-thumb-size-md` `--dt-summary-bg` `--dt-summary-border` `--dt-summary-divider` `--dt-summary-label-color` `--dt-summary-value-color` `--dt-summary-muted-color` `--dt-summary-hint-color` `--dt-summary-discount-color` `--dt-summary-total-color` `--dt-summary-radius` `--dt-summary-padding` `--dt-promo-chip-bg` `--dt-promo-chip-fg` `--dt-promo-chip-border` `--dt-promo-chip-icon` `--dt-promo-chip-description` `--dt-order-status-complete` `--dt-order-status-on-complete` `--dt-order-status-current` `--dt-order-status-upcoming` `--dt-order-status-line` `--dt-order-status-delayed` `--dt-order-status-on-delayed` `--dt-order-status-delayed-text` `--dt-order-status-cancelled` `--dt-order-status-on-cancelled` `--dt-order-status-cancelled-text` `--dt-order-status-marker-size` `--dt-order-status-line-width` `--dt-order-status-step-min-width`
- Five food-ordering components join the commerce family. `StoreHeader` tops a store page with a cover `image`, a `logo`, the `name`, a `rating`, `meta` facts, a `deliveryTime` and a `deliveryFee` (0 reads "Free delivery"), and a `status` that dims a closed store and says so. `FulfilmentToggle` is a full-width delivery or pickup control with radio semantics and arrow keys, taking `value`, `onChange`, a required `label` and optional `options` with a `detail` line. `MenuSection` groups dishes under a `title` with an anchor `id`, as a `layout="list"` or a two-up `layout="grid"`. `MenuItem` shows a dish's `name`, `description`, `price`, `image` and dietary `tags`, with `soldOut`, a `quantity` badge and stepper (`onQuantityChange`), an add button (`onAdd`), and a whole-row `onSelect` that stays a separate focus target from add. `ModifierGroup` offers a dish's options in `mode="single"` or `"multiple"` with price deltas, `required`, `min`/`max` limits that disable the rest and say why, and an announced `error`. Their tokens are the new `--dt-store-*`, `--dt-fulfilment-*`, `--dt-menu-*`, `--dt-modifier-*` and `--dt-dietary-*`. `StoreHeader` `FulfilmentToggle` `MenuSection` `MenuItem` `ModifierGroup` `--dt-store-cover-bg` `--dt-store-cover-radius` `--dt-store-cover-max-height` `--dt-store-logo-size` `--dt-store-logo-radius` `--dt-store-logo-bg` `--dt-store-logo-ring` `--dt-store-meta-color` `--dt-store-open-color` `--dt-store-closed-color` `--dt-store-closed-scrim` `--dt-fulfilment-track-bg` `--dt-fulfilment-thumb-bg` `--dt-fulfilment-thumb-shadow` `--dt-fulfilment-fg` `--dt-fulfilment-fg-selected` `--dt-fulfilment-detail-color` `--dt-fulfilment-detail-color-selected` `--dt-fulfilment-inset` `--dt-fulfilment-radius` `--dt-fulfilment-thumb-radius` `--dt-menu-item-gap` `--dt-menu-item-padding` `--dt-menu-item-divider` `--dt-menu-item-bg-hover` `--dt-menu-item-card-bg` `--dt-menu-item-card-border` `--dt-menu-item-description-color` `--dt-menu-item-soldout-color` `--dt-menu-thumb-size` `--dt-menu-thumb-radius` `--dt-menu-thumb-bg` `--dt-menu-grid-min` `--dt-menu-section-gap` `--dt-modifier-row-min-height` `--dt-modifier-divider` `--dt-modifier-control-size` `--dt-modifier-control-border` `--dt-modifier-control-bg` `--dt-modifier-control-accent` `--dt-modifier-control-mark` `--dt-modifier-delta-color` `--dt-modifier-hint-color` `--dt-modifier-pill-bg` `--dt-modifier-pill-fg` `--dt-modifier-error-color` `--dt-modifier-error-pill-bg` `--dt-dietary-vegetarian-bg` `--dt-dietary-vegetarian-fg` `--dt-dietary-vegan-bg` `--dt-dietary-vegan-fg` `--dt-dietary-spicy-bg` `--dt-dietary-spicy-fg` `--dt-dietary-gluten-free-bg` `--dt-dietary-gluten-free-fg` `--dt-dietary-popular-bg` `--dt-dietary-popular-fg` `--dt-dietary-new-bg` `--dt-dietary-new-fg` `--dt-dietary-default-bg` `--dt-dietary-default-fg`
- A new commerce family starts with three primitives. `Price` formats `amount` for its `currency` and `locale` with `Intl.NumberFormat`, strikes through a higher `compareAt` price and announces "Was …, now …", and takes a `unit`, a `size` and a `freeLabel`. `Rating` shows a `value` in half stars with an optional review `count`, or, given `onChange` and a required `label`, becomes a keyboard-operable radio group of stars. `QuantityStepper` is a − value + control with a typeable `role="spinbutton"` field, `min`, `max` and `step`, and an `onRemove` that turns the minus button into a remove button at the minimum. Their colours are the new `--dt-price-*` and `--dt-rating-*` tokens. `Price` `Rating` `QuantityStepper` `--dt-price-color` `--dt-price-sale-color` `--dt-price-compare-color` `--dt-price-unit-color` `--dt-rating-color` `--dt-rating-empty-color` `--dt-rating-count-color`
- The commerce family gains three product components. `ProductCard` shows a product's `image`, `name`, `price` (with `compareAt`, `currency` and `locale`), `rating`, `badge`, `subtitle` and colour `swatches` in a `vertical` or `horizontal` `layout`; with `href` the name is its one link, stretched over the card, while an `action` or the `onQuickAdd` button stays separately clickable, and `soldOut` washes out the photo and disables both. `ProductGallery` shows `images` with previous and next buttons, thumbnails at the `bottom`, on the `left` (moving below when the gallery is narrower than `collapseBelow`) or `none`, a counter, keyboard and swipe navigation, and a controlled `value` / `onChange` or an uncontrolled `defaultIndex`. `VariantPicker` chooses one option as `chips`, colour `swatches` or a `select`, as a radio group whose arrow keys skip `disabled` options, with the chosen label in the legend (`showSelected`). Their colours are the new `--dt-product-*`, `--dt-swatch-*`, `--dt-variant-*` and `--dt-gallery-*` tokens. `ProductCard` `ProductGallery` `VariantPicker` `--dt-product-subtitle-color` `--dt-product-soldout-overlay` `--dt-swatch-border` `--dt-swatch-ring` `--dt-variant-bg` `--dt-variant-bg-hover` `--dt-variant-fg` `--dt-variant-border` `--dt-variant-selected-bg` `--dt-variant-selected-fg` `--dt-variant-selected-border` `--dt-variant-unavailable-fg` `--dt-variant-unavailable-border` `--dt-variant-note-color` `--dt-gallery-control-bg` `--dt-gallery-control-bg-hover` `--dt-gallery-control-fg` `--dt-gallery-thumb-border` `--dt-gallery-thumb-selected-border`

### Changed

- The install instructions everywhere (README, docs overview, Download page, home hero) read `npm install @dovetail-ds/react react react-dom`, with a line on why: `react-dom` is not a peer of the package, since nothing in it imports `react-dom`, but an app needs it to render, and npm records an auto-installed peer only in the lockfile, so a fresh project could end up with neither `react` nor `react-dom` in `package.json`.

  The `dovetail-setup` skill now checks for exactly that and adds what is missing, and it handles a folder with no app yet: it offers to scaffold Vite + React + TypeScript (or Next.js) around the package before asking the theme questions, from `references/scaffold.md`.

## 0.5.0 - 2026-09-30

### Added

- The package ships a Claude Code skill, `skills/dovetail-setup`, that sets Dovetail up in a project. It interviews you about brand colour, buttons, type, corners, spacing and surfaces, or imports a `theme-custom.css` downloaded from Configure. Then it writes the theme, wires `fonts.css`, `styles.css` and the theme into the app's root in the right order, and reports contrast failures with exact fixes. Copy it into `.claude/skills/` to use it; the README shows how.

  The skill runs Configure's own code from the installed package (`dist/configure/core.js`, which is not public API), so a theme built from answers is byte-for-byte the file Configure's "Download theme.css" gives for the same choices. Its script also checks any theme file: anything that isn't a token declaration is an error, and a token this version doesn't know is a warning.

## 0.4.0 - 2026-09-30

### Added

- `require("@dovetail-ds/react")` works on Node 22.12 and later: the exports map uses the `default` condition, so a Node that can `require()` an ES module loads the package without a separate CommonJS build. Older Node versions still need `import`.

### Fixed

- `Dialog` behaves as a modal: it is named by its `title` (`aria-labelledby`) and described by its `description`, focus moves into it when it opens, Tab and Shift+Tab stay inside, the page behind stops scrolling, and focus returns to the opener on close. A new `label` prop names a dialog with no visible title, and `style` and other `div` attributes pass through to the panel. `Drawer` gains the same focus trap and scroll lock, and is named by its title whatever type it is. `Dialog` `Drawer`

  Before this, a screen reader announced the dialog with no name, focus stayed on the opener, and Tab after the last button left the modal. Consumer audits of 0.2.0 found all three.

- `Tabs` skips disabled tabs from the keyboard: ArrowLeft, ArrowRight, Home and End move only among enabled tabs, wrapping at the ends, and `onChange` is never called with a disabled tab's id. Before this, ArrowRight from a tab next to a disabled one selected the disabled tab and showed its panel. `Tabs`

## 0.3.0 - 2026-09-30

### Breaking changes

- `@dovetail-ds/react/styles.css` no longer loads Geist from Google Fonts. The font `@import` moves to a new opt-in `@dovetail-ds/react/fonts.css`, so the stylesheet makes no third-party request, works offline and under a strict CSP, and leaves self-hosting up to you. *(visual)* `--dt-font-family-sans` `--dt-font-family-mono`

  Without `fonts.css` or your own `@font-face` for "Geist" and "Geist Mono", text falls back to the system font. The docs site is unchanged.

  **Migration**

  To keep Geist from Google Fonts, import `fonts.css` before `styles.css`:

  ```js
  import "@dovetail-ds/react/fonts.css";
  import "@dovetail-ds/react/styles.css";
  ```

  To self-host, leave `fonts.css` out and serve the fonts under the same family names (for example with `next/font/local` or `@font-face`), or point `--dt-font-family-sans` and `--dt-font-family-mono` at your own families. Afterwards, check that headings and body text render in Geist rather than the system font.

### Changed

- `react` is the package's only peer dependency: `react-dom` is no longer required (nothing in the package imports it), and the published manifest has no `engines` field, so installs on any Node version stop warning. The npm description now describes the package rather than the repository.

### Fixed

- The type declarations work with React 19: every `.d.ts` uses `React.JSX` instead of the global `JSX` namespace, which `@types/react` 19 removed. With React 19 types, every component's declaration previously failed with "Cannot find namespace 'JSX'". The package check now type-checks against `@types/react` 18 and 19.
- The package works in React Server Components and the Next.js App Router: interactive components start with `"use client"`, while layout and type components (`Section`, `Stack`, `Heading`, `Text` and others) stay server components. `Navbar` no longer crashes when it collapses on a narrow screen, and `Navbar` and `Sheet` render the same markup on the server and on the first client pass, so hydration matches. `Navbar` `Sheet`

  `Navbar` rendered its mobile menu with `Drawer` without importing it, which only worked on the docs site, where every component shares one scope. Both components now read `matchMedia` through `useSyncExternalStore`, with a server snapshot of `false`, instead of in their initial state. The package build now fails on any component that renders another one without importing it.

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

