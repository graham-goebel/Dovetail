# Token pipeline

`tokens/dovetail.tokens.json` is the source of truth. It is written in the
[W3C Design Tokens Format Module](https://tr.designtokens.org/) (DTCG), the
interchange format Figma Variables, Tokens Studio, and Style Dictionary all read.

One source, many outputs. This is what stops design and code from drifting into
two systems that happen to look alike.

```
tokens/dovetail.tokens.json
        │
        ├─ Style Dictionary ─┬─ CSS custom properties   (web)
        │                    ├─ TypeScript declarations (type-safe token names)
        │                    ├─ Swift                   (iOS)
        │                    └─ XML                     (Android)
        │
        └─ Tokens Studio ────── Figma Variables         (design)
```

## Building

```bash
npx style-dictionary build --config templates/_support/style-dictionary.config.cjs
```

Output lands in `tokens/build/`.

## Why the CSS is committed

The hand-written CSS under `tokens/primitive`, `tokens/semantic`, and
`tokens/component` is the version this design system renders from, so the project
works with no toolchain installed. It mirrors the JSON exactly.

When you change a token: edit the JSON, run the build, and port the change into the
committed CSS. If the two ever disagree, the JSON wins. A CI check comparing the
generated output against the committed files is the next thing to add.

## Adding a token

1. Add it to the JSON at the correct tier. A semantic token's `$value` must be a
   reference (`{primitive.color.accent.600}`), never a literal.
2. Give it a `$description` if the name does not fully explain when to use it.
3. Rebuild, port to CSS, and add it to the relevant spec card in `guidelines/`.
4. If it is a colour pair, verify contrast before committing.

## Figma

Import the JSON into Tokens Studio and push to Figma Variables. Use one collection
per tier and mode-switch at the semantic tier only — primitives should have a single
mode, themes and dark mode live as modes on the semantic collection.

## Where these files live

Browser-side helpers (`card-kit.js`, `theme-runtime.js`) and the Node build config
(`style-dictionary.config.cjs`) live in `templates/_support/`, not here. The design-system
compiler sweeps every `.js`, `.jsx`, and `.cjs` in the project into `_ds_bundle.js`;
`templates/` is the one tree it skips. Keeping them there stops a page script from being
evaluated twice and stops a Node config from throwing on every page load.
