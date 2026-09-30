---
type: fixed
bump: patch
area: components
components: [Navbar, Sheet]
tokens: []
visual: false
---
The package works in React Server Components and the Next.js App Router: interactive components start with `"use client"`, while layout and type components (`Section`, `Stack`, `Heading`, `Text` and others) stay server components. `Navbar` no longer crashes when it collapses on a narrow screen, and `Navbar` and `Sheet` render the same markup on the server and on the first client pass, so hydration matches.

`Navbar` rendered its mobile menu with `Drawer` without importing it, which only worked on the docs site, where every component shares one scope. Both components now read `matchMedia` through `useSyncExternalStore`, with a server snapshot of `false`, instead of in their initial state. The package build now fails on any component that renders another one without importing it.
