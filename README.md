# Dovetail

A white-label React design system: a strict token contract, a 4px grid, and components that
never name a colour. Swap the theme and every surface follows.

[Documentation](https://graham-goebel.github.io/Dovetail/) ·
[Components](https://graham-goebel.github.io/Dovetail/components/index.html) ·
[Changelog](CHANGELOG.md)

## Install

```sh
npm install @dovetail-ds/react react
```

React 18 or newer is the only peer dependency (your app brings its own `react-dom`).

## Set up with Claude Code

The package ships a [Claude Code](https://claude.com/claude-code) skill that does the setup for you. It asks a few questions about your brand colour, buttons, type, corners and spacing, or takes the `theme-custom.css` you downloaded from Configure. Then it writes your theme, wires the stylesheets and fonts into your app's root, and checks contrast.

```sh
mkdir -p .claude/skills
cp -r node_modules/@dovetail-ds/react/skills/dovetail-setup .claude/skills/
```

Then ask Claude to "set up Dovetail with our brand", or attach your downloaded theme. The theme it writes records your answers, so later you can ask for "rounder corners" or "buttons in our blue" and it rebuilds the file. It uses the same code as Configure, so the file matches what Configure's Download would give.

## Use

```jsx
import "@dovetail-ds/react/fonts.css"; // optional: Geist from Google Fonts
import "@dovetail-ds/react/styles.css";
import { Button, Section, Stack } from "@dovetail-ds/react";

export function Example() {
  return (
    <Section>
      <Stack gap="md">
        <Button variant="primary">Save changes</Button>
      </Stack>
    </Section>
  );
}
```

- **Styles.** Import `@dovetail-ds/react/styles.css` once, near the root. It is the whole token stack
  in one file, and the components read its `var(--dt-*)` tokens. It makes no network request.
- **Fonts.** `@dovetail-ds/react/fonts.css` loads Geist and Geist Mono from Google Fonts. Leave it
  out to self-host them under the same family names (with `next/font` or `@font-face`), or set
  `--dt-font-family-*` in your theme. Without either, text falls back to the system font.
- **Server components.** Works in the Next.js App Router. Interactive components ship with
  `"use client"`; layout and type (`Section`, `Stack`, `Heading`, `Text` and others) render on
  the server.
- **Dark mode.** Put `class="dark"` on `<html>`, or on any element (a `Section`, say) to
  darken just that band.
- **Types.** Every component ships a `.d.ts` with a comment on each prop.
- **Browsers.** Safari 16.4, Chrome and Edge 111, Firefox 113 or newer, for `oklch()` and
  `color-mix()`.

## Without a bundler

The package is ES modules that `import React from "react"`, so a plain HTML page needs an import
map. This one loads the modules from esm.sh, the stylesheets from jsDelivr, and keeps a single
copy of React:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@dovetail-ds/react/dist/fonts.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@dovetail-ds/react/dist/styles.css">
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?external=react",
      "@dovetail-ds/react": "https://esm.sh/@dovetail-ds/react?external=react"
    }
  }
</script>
<div id="root"></div>
<script type="module">
  import React from "react";
  import { createRoot } from "react-dom/client";
  import { Button, Stack } from "@dovetail-ds/react";

  const h = React.createElement;
  createRoot(document.getElementById("root")).render(
    h(Stack, { gap: "md" }, h(Button, { variant: "primary" }, "Save changes")),
  );
</script>
```

Pin a version (`@dovetail-ds/react@0.3.0`) in production.

## Theme it

Components never read raw values: primitives feed semantic roles, and components read the
roles. A theme re-points the roles. Build one visually with Configure on the
[docs site](https://graham-goebel.github.io/Dovetail/) and export the CSS, or see
[Theming](https://graham-goebel.github.io/Dovetail/guide/theming.html).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). How the docs site is built is in
[docs/site.md](docs/site.md).

## License

[MIT](LICENSE)
