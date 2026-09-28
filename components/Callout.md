# Callout

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Content family. Files: [Callout.jsx](https://graham-goebel.github.io/Dovetail/system/components/content/Callout.jsx), [Callout.d.ts](https://graham-goebel.github.io/Dovetail/system/components/content/Callout.d.ts), [Callout.md](https://graham-goebel.github.io/Dovetail/system/components/content/Callout.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Callout.html

## Guidelines

Aside within documentation or long-form content. Use it to lift out a caveat, a
shortcut, or a prerequisite the reader would otherwise skim past.

### Rules

- Callout is for editorial content. For application state, such as a failed save or an expiring
  trial, use Alert or Banner. They announce to assistive technology; a callout does not.
- One callout per section. Three in a row means the surrounding prose is not doing its
  job.
- `caution` is for irreversible or costly actions. Do not use it for mild inconvenience.
- Give it a `title` when the tone alone does not say why the reader should stop.
- `brand` is not a feedback tone. Nothing is wrong and nothing needs your attention; it is
  the callout for a pull-quote, a feature highlight, or a moment the page is allowed to feel
  like the product rather than like a warning. Reach for `tip` first if the content is
  actually advice.
- `texture` is a dot or line grid behind the fill, drawn in the border-strength colour so it
  never competes with the tone. It reads best on `brand` or `note`; a chromatic tone
  (`tip`, `important`, `caution`) is already carrying enough on its own.

### Tradeoffs

Boxing content pulls the eye out of the reading flow. That is useful once per section and
counterproductive when the page becomes a stack of boxes.

## Props

```ts
import * as React from "react";

/** Aside inside editorial content. */
export interface CalloutProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * note, tip, important and caution are feedback tones: pale, and matched to
   * a semantic role a reader already knows from Alert and Banner. brand is
   * not feedback. It reads --dt-surface-brand-muted, the same full-bleed
   * tint a hero band uses, for the one callout that is meant to feel like
   * the product rather than like a warning.
   * @default "note"
   */
  tone?: "note" | "tip" | "important" | "caution" | "brand";
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Lucide icon, or a sketch mark on a brand or editorial callout. */
  icon?: React.ReactNode;
  /**
   * Layers --dt-surface-texture, a dot or line grid, behind the tone's fill.
   * The pattern is drawn in the border-strength colour, never the brand hue,
   * so it never fights the tone underneath it.
   * @default false
   */
  texture?: boolean;
}

export declare function Callout(props: CalloutProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-info` | semantic | `var(--dt-color-cyan-200)` |
| `--dt-border-success` | semantic | `var(--dt-color-green-200)` |
| `--dt-border-warning` | semantic | `var(--dt-color-amber-200)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-brand-muted` | semantic | `var(--dt-color-primary-050)` |
| `--dt-surface-info-subtle` | semantic | `var(--dt-color-cyan-050)` |
| `--dt-surface-subtle` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-surface-success-subtle` | semantic | `var(--dt-color-green-050)` |
| `--dt-surface-texture` | semantic | `none` |
| `--dt-surface-warning-subtle` | semantic | `var(--dt-color-amber-050)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

const TONES = {
  note: { bd: "var(--dt-border-default)", bg: "var(--dt-surface-subtle)", fg: "var(--dt-text-secondary)" },
  tip: { bd: "var(--dt-border-success)", bg: "var(--dt-surface-success-subtle)", fg: "var(--dt-text-success)" },
  important: { bd: "var(--dt-border-info)", bg: "var(--dt-surface-info-subtle)", fg: "var(--dt-text-info)" },
  caution: { bd: "var(--dt-border-warning)", bg: "var(--dt-surface-warning-subtle)", fg: "var(--dt-text-warning)" },
  brand: { bd: "var(--dt-border-brand)", bg: "var(--dt-surface-brand-muted)", fg: "var(--dt-text-on-brand-muted)" },
};

export function Callout({ tone = "note", title, children, icon, texture = false, style, ...rest }) {
  const t = TONES[tone] || TONES.note;
  /* --dt-surface-texture is a full background shorthand (image, position and
     size together), so it has to stay in the shorthand: background-image
     alone rejects a value carrying a size and silently renders nothing. A
     second, comma-separated layer is how one declaration paints the texture
     over the tone's own flat colour without a second element. */
  const fill = texture ? `var(--dt-surface-texture), ${t.bg}` : t.bg;
  return (
    <aside style={{
      display: "flex", gap: "var(--dt-space-inline-sm)",
      padding: "var(--dt-space-inset-md)",
      background: fill,
      borderRadius: "var(--dt-radius-container)",
      border: `var(--dt-border-width-default) solid ${t.bd}`,
      ...style,
    }} {...rest}>
      {icon && <span aria-hidden="true" style={{ color: t.fg, flex: "none", display: "flex", marginTop: 2 }}>{icon}</span>}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
        {title && <span style={{ fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-semibold)", color: "var(--dt-text-primary)" }}>{title}</span>}
        <div style={{
          fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
          lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)", textWrap: "pretty",
        }}>{children}</div>
      </div>
    </aside>
  );
}
```
