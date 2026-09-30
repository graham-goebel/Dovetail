---
type: changed
bump: patch
area: tooling
components: []
tokens: []
visual: false
---
The install instructions everywhere (README, docs overview, Download page, home hero) read `npm install @dovetail-ds/react react react-dom`, with a line on why: `react-dom` is not a peer of the package, since nothing in it imports `react-dom`, but an app needs it to render, and npm records an auto-installed peer only in the lockfile, so a fresh project could end up with neither `react` nor `react-dom` in `package.json`.

The `dovetail-setup` skill now checks for exactly that and adds what is missing, and it handles a folder with no app yet: it offers to scaffold Vite + React + TypeScript (or Next.js) around the package before asking the theme questions, from `references/scaffold.md`.
