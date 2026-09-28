# Changelog

Everything notable that changes in the Dovetail design system (`system/`), newest first. Versions follow [Semantic Versioning](https://semver.org) as applied to a design system in [docs/changelog.md](docs/changelog.md): a renamed or removed token, component, prop or default is a breaking change.

Don't edit this file directly. Add an entry to `changes/` with your pull request (`npm run change -- <slug>`); releases compile the entries into a new section here. Unreleased entries can be previewed with `npm run changelog`.

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

