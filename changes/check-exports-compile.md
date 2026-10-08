---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The builder check (`npm run check:builder`) type-checks the React code the Builder exports: every page of the Playground, a structured page with Groups, a Section, Cards, slots and a Carousel, and a selection's code are each type-checked (strict, `jsx: react-jsx`) against a fresh build of `@dovetail-ds/react`, and a failure names the export, file, line and type error. The package check shares the same harness (`tools/check/typecheck.mjs`), and `tools/build-package.mjs --out <dir>` builds just the components into a directory of their own.
