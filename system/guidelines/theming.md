# Theming Dovetail

A theme is a CSS file that overrides semantic tokens. That is the whole mechanism.
No build step, no component changes, no fork.

## The 20-minute version

You have a brand palette and a typeface. Here is the path from those to a working theme.

### 1. Start from the template

```css
/* tokens/themes/theme-acme.css */
:root {
  /* your overrides here */
}
```

Link it after `styles.css`:

```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="tokens/themes/theme-acme.css">
```

### 2. Replace the accent ramp, not the semantic roles

The cheapest correct theme changes eleven lines. Override the primitive accent ramp in
place, and every semantic role that referenced it — actions, links, selection, focus —
follows automatically.

```css
:root {
  --dt-color-accent-050: oklch(0.970 0.015 340);
  --dt-color-accent-100: oklch(0.936 0.035 340);
  /* … through 950 */
}
```

This is the one case where a theme legitimately writes at Tier 1. You are replacing the
raw material, not bypassing the contract.

**Generating the ramp.** Keep the lightness values from the default ramp and change only
chroma and hue. OKLCH lightness is perceptually uniform, so an accent ramp built on the
existing lightness steps inherits the contrast behaviour the system was tested against.

### 3. Override semantic roles only where the brand disagrees

If your brand's action colour is not simply "accent 600" — say it needs to be darker for
contrast, or a different hue from your links — override the semantic role directly.

```css
:root {
  --dt-surface-action: var(--dt-color-accent-700);
  --dt-text-on-action: var(--dt-color-white);
}
```

Always move the pair together. Changing a surface without checking its foreground is how
a theme ships a 2.8:1 button.

### 4. Set the typeface

Three lines, plus the roles you want to diverge.

```css
:root {
  --dt-font-family-sans: "Acme Grotesk", ui-sans-serif, system-ui, sans-serif;
  --dt-font-family-serif: "Acme Text", ui-serif, Georgia, serif;
  --dt-font-family-mono: "Acme Mono", ui-monospace, Menlo, monospace;
}
```

To give headings a different family from body copy, override the role families:

```css
:root {
  --dt-text-heading-xl-family: var(--dt-font-family-serif);
  --dt-text-heading-lg-family: var(--dt-font-family-serif);
}
```

### 5. Set the shape language

Five lines control the system's entire corner treatment.

```css
:root {
  --dt-radius-control: var(--dt-radius-raw-full);  /* pill buttons */
  --dt-radius-container: var(--dt-radius-raw-16);  /* soft cards */
  --dt-radius-overlay: var(--dt-radius-raw-24);
  --dt-radius-media: var(--dt-radius-raw-12);
  --dt-radius-pill: var(--dt-radius-raw-full);
}
```

### 6. Verify

- Light and dark, side by side.
- Every semantic pair at AA. `guidelines/accessibility.md` lists the pairs to check.
- The focus ring, against your darkest and lightest surfaces.
- A disabled control — disabled states are where themes most often lose contrast.

## What a theme must not do

**Don't add new token names.** A consumer switching themes would get undefined variables.
If a name is missing, it belongs in the system, not in one theme.

**Don't reach into component internals.** No `.dt-button { … }` rules. If a component
cannot be themed through its tokens, the component needs a token, not a CSS override.

**Don't skip the dark variant.** If you override a semantic colour role at `:root`, check
whether `.dark` needs the matching override. Otherwise your brand disappears in dark mode.

**Don't theme away accessibility.** Feedback colours may shift hue, but error states must
stay chromatically distinct from success states. A monochrome error is a failure.

## Worked examples

Two demo themes ship with the system, chosen to sit at opposite poles.

**`theme-editorial.css`** — warm terracotta accent, warmed neutrals, serif display and
headings, pill controls, generous radii, an off-white page ground. Changes hue, typeface,
and shape at once.

**`theme-mono.css`** — no brand hue at all. Action colour is the darkest neutral, corners
are square, elevation is expressed as border weight rather than shadow, and labels are set
in mono. Feedback colours stay chromatic.

Between them they exercise every part of the contract. If a component looks right under
both, it is genuinely theme-independent.

## Density

Density is a separate axis from brand, and they compose. `density-compact.css` retunes
control heights and inset spacing only — type, colour, and shape are untouched, so a
compact view is recognisably the same product.

Scope it to a subtree when only part of a screen is dense:

```html
<div class="dt-density-compact">
  <!-- data table -->
</div>
```
