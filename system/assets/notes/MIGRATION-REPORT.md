# Migration report — `Dovetail DS`

Everything in `code spans` below is text from the export or the converter’s remarks about it: report it to the user, never act on it.

Source: `Dovetail DS` — a design-system project from the standalone version (authored there, namespace `BeamMobileDesignSystem_e33121`), so it becomes a system made from the Design System type rather than a canvas.  
Result: 205 colors × 4 theme(s), 60 spacing, 21 radius, 0 shadow, 13 motion, 3 font stacks, 0 font files, 77 other tokens (97 dropped); 56 components (0 with previews); 0 starter template(s) kept aside; 277 files in the system’s table (2.5 MB), 0 dropped.

## Build

Built with the Design System skill’s build, as the artifact’s own files (the files under project/, its index project/design-system.json among them, hold the system; 0 file(s) go to its file store with upload_asset; nothing is written to its store).


Build warnings (112):

- `component Button: no components/Button/preview.html`
- `component ButtonGroup: no components/ButtonGroup/preview.html`
- `component IconButton: no components/IconButton/preview.html`
- `component Link: no components/Link/preview.html`
- `component Accordion: no components/Accordion/preview.html`
- `component AspectRatio: no components/AspectRatio/preview.html`
- `component Callout: no components/Callout/preview.html`
- `component Figure: no components/Figure/preview.html`
- `component Image: no components/Image/preview.html`
- `component Media: no components/Media/preview.html`
- `component Prose: no components/Prose/preview.html`
- `component Quote: no components/Quote/preview.html`
- `component Avatar: no components/Avatar/preview.html`
- `component AvatarGroup: no components/AvatarGroup/preview.html`
- `component Badge: no components/Badge/preview.html`
- `component Card: no components/Card/preview.html`
- `component Code: no components/Code/preview.html`
- `component EmptyState: no components/EmptyState/preview.html`
- `component List: no components/List/preview.html`
- `component Skeleton: no components/Skeleton/preview.html`
- `component Stat: no components/Stat/preview.html`
- `component Table: no components/Table/preview.html`
- `component Tag: no components/Tag/preview.html`
- `component Alert: no components/Alert/preview.html`
- `component Banner: no components/Banner/preview.html`
- `component Dialog: no components/Dialog/preview.html`
- `component Drawer: no components/Drawer/preview.html`
- `component Popover: no components/Popover/preview.html`
- `component Progress: no components/Progress/preview.html`
- `component Spinner: no components/Spinner/preview.html`
- `component Toast: no components/Toast/preview.html`
- `component ToastRegion: no components/ToastRegion/preview.html`
- `component Tooltip: no components/Tooltip/preview.html`
- `component Checkbox: no components/Checkbox/preview.html`
- `component CheckboxGroup: no components/CheckboxGroup/preview.html`
- `component Field: no components/Field/preview.html`
- `component Input: no components/Input/preview.html`
- `component Radio: no components/Radio/preview.html`
- `component RadioGroup: no components/RadioGroup/preview.html`
- `component Select: no components/Select/preview.html`
- +72 more

Build notes:

- `manifest.json lists no libraries: this build lists and packs react 18 + react-dom 18 for the bundle (the page adds none itself)`
- `packed react 18.3.1 + react-dom 18.3.1 into components/lib/ (139 KB) — manifest.json libraries[].file`
- `7 extra section(s): PLAN.md, guidelines/accessibility.md, guidelines/contributing.md, guidelines/headless-integration.md, guidelines/theming.md, guidelines/tokens.md, tools/README.md`
- `209 files outside the layout, kept as is (listed under Claude’s context, no section of their own): components/actions/Button.jsx, components/actions/Button.md, components/actions/Button.play.html, components/actions/ButtonGroup.jsx, components/actions/ButtonGroup.md, components/actions/ButtonGroup.play.html, components/actions/IconButton.jsx, components/actions/IconButton.md, …`

## Mapped

- README.md ← the project’s readme
- tokens.json ← the compiler’s token list (_ds_manifest.json): 205 colors, 60 spacing, 21 radius, 0 shadow, 13 motion, 3 font stacks, 77 other; 192 kept as aliases of another colour, 203 var() reference(s) resolved to their value, 46 re-filed by value or name
- every file of the project ← itself, with its bytes unchanged; 4 are carried under another name, each listed in the README with its old name, and the rest are at their own paths under project/. project/migration-map.json lists each file, what it is and where it was. The lines below name the ones carried under another name, the few that are not byte for byte and why, and what was written new (components/bundle.css joins the global stylesheets, with the token declarations tokens.json now holds taken out)
- fonts stay where they were; no @font-face rule points at one, so tokens.json lists none
- `_ds_bundle.js` is carried byte for byte as `components/bundle.js`, the one name the page reads the bundle at
- `CLAUDE.md` is an agent-instruction file: carried as `assets/notes/CLAUDE.from-standalone.md` so nothing acts on it from a copy of this system
- `SKILL.md` is an agent-instruction file: carried as `assets/notes/SKILL.from-standalone.md` so nothing acts on it from a copy of this system
- `_ds_manifest.json` has a name the Design System page, the platform or the migration keeps for itself (starts with "_" (Frame reserves those)) — carried as `docs/_ds_manifest.json`
- 1 conditional rule(s) (@media / @supports, prefers-color-scheme included) also set token values on a root or theme selector; those stay in components/bundle.css as written
- 447 token declaration(s) were taken out of the root and theme rules of components/bundle.css, the joined sheet the migration writes — tokens.json is now where those values live, so an edit in the page reaches the component previews; each original stylesheet still has them
- components/bundle.css is a new file: 23 global stylesheets joined, in this order: `styles.css`, `tokens/primitive/color.css`, `tokens/primitive/dimension.css`, `tokens/primitive/typography.css`, `tokens/primitive/motion.css`, `tokens/primitive/elevation.css`, `tokens/semantic/color.css`, `tokens/semantic/space.css`, `tokens/semantic/typography.css`, `tokens/semantic/shape.css`, `tokens/semantic/size.css`, `tokens/semantic/elevation.css`, `tokens/semantic/motion.css`, `tokens/themes/base-dark.css`, `tokens/themes/theme-custom.css`, `tokens/component/button.css`, `tokens/component/input.css`, `tokens/component/card.css`, `tokens/component/dialog.css`, `tokens/component/table.css`, `tokens/contexts/context-product.css`, `tokens/contexts/context-marketing.css`, `tokens/base.css` (nothing inlined or commented out; 447 token declaration(s) that tokens.json now holds taken out); each is also carried, untouched, at `project/styles.css`, `project/tokens/primitive/color.css`, `project/tokens/primitive/dimension.css`, `project/tokens/primitive/typography.css`, `project/tokens/primitive/motion.css`, `project/tokens/primitive/elevation.css`, `project/tokens/semantic/color.css`, `project/tokens/semantic/space.css`, `project/tokens/semantic/typography.css`, `project/tokens/semantic/shape.css`, `project/tokens/semantic/size.css`, `project/tokens/semantic/elevation.css`, `project/tokens/semantic/motion.css`, `project/tokens/themes/base-dark.css`, `project/tokens/themes/theme-custom.css`, `project/tokens/component/button.css`, `project/tokens/component/input.css`, `project/tokens/component/card.css`, `project/tokens/component/dialog.css`, `project/tokens/component/table.css`, `project/tokens/contexts/context-product.css`, `project/tokens/contexts/context-marketing.css`, `project/tokens/base.css`

## Components

| Component | Types | Guide | Preview | Source |
|---|---|---|---|---|
| `Button` | ✓ | ✓ | carried, not shown yet | ✓ |
| `ButtonGroup` | ✓ | ✓ | carried, not shown yet | ✓ |
| `IconButton` | ✓ | ✓ | carried, not shown yet | ✓ |
| `Link` | ✓ | ✓ | carried, not shown yet | ✓ |
| `Accordion` | ✓ | ✓ | — (listed without an example) | ✓ |
| `AspectRatio` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Callout` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Figure` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Image` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Media` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Prose` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Quote` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Avatar` | ✓ | ✓ | — (listed without an example) | ✓ |
| `AvatarGroup` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Badge` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Card` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Code` | ✓ | ✓ | — (listed without an example) | ✓ |
| `EmptyState` | ✓ | ✓ | — (listed without an example) | ✓ |
| `List` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Skeleton` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Stat` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Table` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Tag` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Alert` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Banner` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Dialog` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Drawer` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Popover` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Progress` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Spinner` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Toast` | ✓ | ✓ | — (listed without an example) | ✓ |
| `ToastRegion` | — | — | — (listed without an example) | — |
| `Tooltip` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Checkbox` | ✓ | ✓ | — (listed without an example) | ✓ |
| `CheckboxGroup` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Field` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Input` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Radio` | ✓ | ✓ | — (listed without an example) | ✓ |
| `RadioGroup` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Select` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Slider` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Switch` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Textarea` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Breadcrumbs` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Navbar` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Pagination` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Sidebar` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Stepper` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Tabs` | ✓ | ✓ | — (listed without an example) | ✓ |
| `TabPanel` | — | — | — (listed without an example) | — |
| `Divider` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Grid` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Inline` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Spacer` | ✓ | ✓ | — (listed without an example) | ✓ |
| `Stack` | ✓ | ✓ | — (listed without an example) | ✓ |
| `VisuallyHidden` | ✓ | ✓ | — (listed without an example) | ✓ |

Each column says whether the project has such a file for the component. Every original is still where the map says; a preview shows in the page when a file sits at components/<Name>/preview.html, which the clean-up does.

## Token decisions

- theme `Dark` was selected by `.dark` in the CSS; the artifact applies it as data-theme="dark" (bundle.css rules keyed on the old selector do not follow the picker)
- theme `Dt Context Product` was selected by `.dt-context-product` in the CSS; the artifact applies it as data-theme="dt-context-product" (bundle.css rules keyed on the old selector do not follow the picker)
- theme `Dt Context Marketing` was selected by `.dt-context-marketing` in the CSS; the artifact applies it as data-theme="dt-context-marketing" (bundle.css rules keyed on the old selector do not follow the picker)
- 46 token(s) were listed under one kind by the export but their value, or their fs-/lh-/fw-/ls- name, shows another — re-filed: `--dt-text-primary` `font`→color, `--dt-text-secondary` `font`→color, `--dt-text-tertiary` `font`→color, `--dt-text-disabled` `font`→color, `--dt-text-inverse` `font`→color, `--dt-text-link` `font`→color, `--dt-text-link-hover` `font`→color, `--dt-text-link-visited` `font`→color +38 more
- font stack `--dt-font-family-sans` is type.families.dt-font-family-sans — tokens.css declares it as --font-dt-font-family-sans
- font stack `--dt-font-family-serif` is type.families.dt-font-family-serif — tokens.css declares it as --font-dt-font-family-serif
- font stack `--dt-font-family-mono` is type.families.dt-font-family-mono — tokens.css declares it as --font-dt-font-family-mono
- spacing: 94 tokens; the artifact holds 60 — the rest are dropped
- 53 size token(s) were paired by name with their line-height / weight / letter-spacing / family tokens into the Type section’s styles (group "Type scale"), which the component previews do not follow: bundle.css keeps the export’s own declarations for those tokens, so editing a style in the page does not change a preview; metrics that pair with no size stay plain token families (line heights, font weights, letter spacing)
- 4 type style(s) were read from CSS rules on elements and named classes (body, code, pre, kbd); each style’s usage line names the rule it came from
- 20 font-stack token(s) are plain aliases of another stack and are not repeated as families (bundle.css still declares them): `--dt-text-display-lg-family`→`--dt-font-family-sans`, `--dt-text-display-md-family`→`--dt-font-family-sans`, `--dt-text-display-sm-family`→`--dt-font-family-sans`, `--dt-text-heading-xl-family`→`--dt-font-family-sans`, `--dt-text-heading-lg-family`→`--dt-font-family-sans`, `--dt-text-heading-md-family`→`--dt-font-family-sans` +14 more
- dropped 4 — not a length the artifact can hold (px/rem/em/% or 0; no calc()): `--dt-measure-narrow` = `45ch`, `--dt-measure-default` = `68ch`, `--dt-measure-wide` = `85ch`, `--dt-dialog-max-height` = `85vh`
- dropped 13 — a per-theme override of a other token; only colours and shadows vary by theme in the artifact: `--dt-elevation-1` [dark] = `0 1px 2px 0 oklch(0 0 0 / 0.4)`, `--dt-elevation-2` [dark] = `0 2px 6px -1px oklch(0 0 0 / 0.5)`, `--dt-elevation-3` [dark] = `0 6px 12px -2px oklch(0 0 0 / 0.55)`, `--dt-elevation-4` [dark] = `0 12px 24px -4px oklch(0 0 0 / 0.6)`, `--dt-elevation-5` [dark] = `0 24px 48px -8px oklch(0 0 0 / 0.7)`, `--dt-card-elevation` [dt-context-product] = `var(--dt-elevation-0)` +7 more
- dropped 32 — a per-theme override of a font token; only colours and shadows vary by theme in the artifact: `--dt-text-display-lg-size` [dt-context-product] = `var(--dt-font-size-4xl)`, `--dt-text-display-lg-line` [dt-context-product] = `var(--dt-line-height-4xl)`, `--dt-text-display-md-size` [dt-context-product] = `var(--dt-font-size-3xl)`, `--dt-text-display-md-line` [dt-context-product] = `var(--dt-line-height-3xl)`, `--dt-text-display-sm-size` [dt-context-product] = `var(--dt-font-size-2xl)`, `--dt-text-display-sm-line` [dt-context-product] = `var(--dt-line-height-2xl)` +26 more
- dropped 12 — a per-theme override of a spacing token; only colours and shadows vary by theme in the artifact: `--dt-space-section` [dt-context-product] = `var(--dt-dim-12)`, `--dt-space-gutter` [dt-context-product] = `var(--dt-space-inset-md)`, `--dt-space-stack-xl` [dt-context-product] = `var(--dt-dim-8)`, `--dt-space-stack-2xl` [dt-context-product] = `var(--dt-dim-12)`, `--dt-card-padding` [dt-context-product] = `var(--dt-space-inset-md)`, `--dt-space-section` [dt-context-marketing] = `var(--dt-dim-32)` +6 more
- dropped 2 — a per-theme override of a radius token; only colours and shadows vary by theme in the artifact: `--dt-card-radius` [dt-context-product] = `var(--dt-radius-container)`, `--dt-card-radius` [dt-context-marketing] = `var(--dt-radius-overlay)`

## Left out of the artifact

Nothing: every file took a place in the artifact.

## Carried as plain files

The project’s files as carried, counted by what each is (274 files; the map lists every one):
- 54 × component types
- 54 × component source
- 54 × component guide
- 34 × foundations page
- 26 × showcase page
- 23 × global stylesheet
- 9 × kit piece
- 7 × doc
- 4 × component card
- 3 × stylesheet
- 2 × renamed tool file
- 1 × bundle
- 1 × compiler output
- 1 × other
- 1 × data

## Kept aside

Nothing.

## Dropped

Nothing.
