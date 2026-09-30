---
type: changed
bump: major
area: styles
components: []
tokens: [--dt-font-family-sans, --dt-font-family-mono]
visual: true
---
`@dovetail-ds/react/styles.css` no longer loads Geist from Google Fonts. The font `@import` moves to a new opt-in `@dovetail-ds/react/fonts.css`, so the stylesheet makes no third-party request, works offline and under a strict CSP, and leaves self-hosting up to you.

Without `fonts.css` or your own `@font-face` for "Geist" and "Geist Mono", text falls back to the system font. The docs site is unchanged.

## Migration

To keep Geist from Google Fonts, import `fonts.css` before `styles.css`:

```js
import "@dovetail-ds/react/fonts.css";
import "@dovetail-ds/react/styles.css";
```

To self-host, leave `fonts.css` out and serve the fonts under the same family names (for example with `next/font/local` or `@font-face`), or point `--dt-font-family-sans` and `--dt-font-family-mono` at your own families. Afterwards, check that headings and body text render in Geist rather than the system font.
