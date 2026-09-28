---
type: changed
bump: major
area: tokens
components: [Button, IconButton, Card, Tabs, Link]
tokens: [--dt-surface-action, --dt-text-link, --dt-surface-selected, --dt-border-selected, --dt-focus-ring-color, --dt-surface-action-secondary, --dt-color-neutral-*, --dt-color-primary-*, --dt-radius-control, --dt-radius-container, --dt-radius-overlay, --dt-button-radius, --dt-card-elevation]
visual: true
---
Dovetail's default look is monochrome and round: buttons, links, selection and focus are ink instead of the primary colour, secondary buttons are soft grey fills, buttons are pills, cards are bordered and flat, the greys have no hue, and the default primary is a warm orange used for accents.

In detail:

- **Colour.** `--dt-surface-action`, `--dt-text-link`, `--dt-surface-selected`, `--dt-border-selected` and `--dt-focus-ring-color` point at the neutral ramp (ink on light, near-white on dark). Each has a new `-brand` twin holding the old primary values. `--dt-surface-action-secondary` is a soft grey fill with no border. The neutral ramp is pure grey (chroma 0); the primary ramp is a warm orange (500 is `#eb6834`) instead of blue.
- **Shape.** `--dt-radius-control` 6→8px, `--dt-radius-container` 8→16px, `--dt-radius-overlay` 12→24px, `--dt-radius-media` 8→12px. `--dt-button-radius` reads `--dt-radius-pill`.
- **Depth.** Cards are bordered and flat (`--dt-card-elevation` is `--dt-elevation-0`). Shadows are softer and wider, with a hairline ring on the floating levels.
- **Type.** Display and heading roles are weight 500 with tighter tracking (new `--dt-tracking-tightest`, −0.04em). Body text uses tabular figures.
- **Motion and glass.** `--dt-easing-standard` is `cubic-bezier(0.2, 0.8, 0.2, 1)`; glass saturates 1.6×.

## Migration

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
