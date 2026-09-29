# Dovetail

A white-label React design system: a strict token contract, a 4px grid, and components that
never name a colour. Swap the theme and every surface follows.

[Documentation](https://graham-goebel.github.io/Dovetail/) ·
[Components](https://graham-goebel.github.io/Dovetail/components/index.html) ·
[Changelog](CHANGELOG.md)

## Install

```sh
npm install @dovetail-ds/react react react-dom
```

React 18 or newer is a peer dependency.

## Use

```jsx
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
  in one file, and the components read its `var(--dt-*)` tokens. It loads Geist from Google
  Fonts; to serve the fonts yourself, remove that `@import` and set `--dt-font-family-*` in
  your theme.
- **Dark mode.** Put `class="dark"` on `<html>`, or on any element (a `Section`, say) to
  darken just that band.
- **Types.** Every component ships a `.d.ts` with a comment on each prop.
- **Browsers.** Safari 16.4, Chrome and Edge 111, Firefox 113 or newer, for `oklch()` and
  `color-mix()`.

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
