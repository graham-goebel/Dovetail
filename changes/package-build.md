---
type: added
bump: none
area: tooling
components: []
tokens: []
visual: false
---
The first step toward an installable package, not yet published. `npm run build:package` compiles every component to ES modules in `dist/react/`, with React as a peer dependency and each component's `.d.ts` beside it, plus an `index.js` and `index.d.ts`. `package.json` gains `exports`, `main`, `module`, `types`, `files` and `sideEffects`, and stays private. New checks: `check:ssr` renders every component on the server, `check:package` builds the package, imports it, renders from it and type-checks a consumer against it (both run in `npm run check` and CI), and `check:tokens` reports where the DTCG file, `tokens.json` and the CSS disagree (a report, not yet a gate).
