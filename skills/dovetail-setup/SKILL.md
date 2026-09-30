---
name: dovetail-setup
description: Sets up the Dovetail design system (@dovetail-ds/react) in a project and gives it the team's own look. It either interviews the user about brand colour, buttons, type, shape, spacing and surfaces, or imports a theme CSS file downloaded from the Dovetail docs site's Configure panel (usually theme-custom.css). It then writes the theme with Configure's own code, wires the stylesheets and fonts into the app root, and checks contrast. Use it whenever someone installs, sets up, themes, brands or restyles Dovetail, mentions @dovetail-ds/react with colours, fonts or dark mode, attaches or points at a theme-custom.css or other Dovetail theme file, or asks to change the Dovetail look later ("make the buttons our blue", "rounder corners", "switch to Inter"), even if they never say "skill" or "theme".
---

# Dovetail setup

The goal is a project where `@dovetail-ds/react` renders in the team's own look. That takes three stylesheets loaded in the right order, the fonts the theme names, and a theme file that holds only token overrides.

A Dovetail theme is a file of CSS custom properties (`--dt-*`) under `:root`, plus a few under `.dark`. It never styles a component: components read semantic tokens, so re-pointing tokens restyles everything consistently in light and dark. Keep to that. If someone asks for a component-specific tweak, find the token that expresses it rather than writing a selector.

Everything here uses `scripts/theme.mjs` next to this file. It runs the docs site's Configure panel code headlessly from the installed package, so a theme built from answers is the same file Configure's Download button would give. Run it with `node <this skill's dir>/scripts/theme.mjs <command>` from the project root.

## 1. Look at the project first

Before asking anything, find out:

- Whether there is an app at all. A folder with only a README, or a `package.json` with no framework, no entry file and no build script, has nothing to wire a theme into. Say so, and offer to scaffold one: Vite + React + TypeScript by default, or Next.js if they plan to deploy there. `references/scaffold.md` has the files. Do this before the theme questions, so the theme has somewhere to land and step 5 has something to build.
- Whether `@dovetail-ds/react` is installed, and which version (`npm ls @dovetail-ds/react`). The theme script needs 0.5.0 or later. If it's missing or older, install it with `npm install @dovetail-ds/react@latest react react-dom`, after saying so.
- Whether `react` and `react-dom` are listed in `package.json` `dependencies`, not only present in the lockfile. npm installs a missing peer on its own but records it only in the lockfile, and `react-dom` isn't a peer of the package (nothing in it imports `react-dom`), so a fresh project can end up with neither declared and nothing to render with. Add whichever is missing with `npm install react react-dom`.
- The framework and the app's root module: `app/layout.tsx` (Next.js App Router), `pages/_app.tsx` (Pages Router), `src/main.tsx` or `src/index.tsx` (Vite, CRA), `app/root.tsx` (Remix, React Router). Wiring differs per framework: read `references/wiring.md` when you get to step 4.
- Whether a Dovetail theme already exists: grep for `--dt-color-primary-` in the project's CSS. If one does and its first comment holds `dovetail-setup choices`, this is a change to an existing theme (see "Changing a theme later").

## 2. Pick the path

Ask one question: do they already have a theme from Configure, or should you ask a few questions to make one?

- If they attached a file, named one, or said they "downloaded the theme", take the **import** path.
- If they want to see choices visually before deciding, point them at Configure (https://graham-goebel.github.io/Dovetail/, the Configure button at the top right). Its Export tab has "Download theme.css". Then take the import path with the file they download.
- Otherwise take the **interview** path.

### Interview path

Run `node scripts/theme.mjs options` first. It prints every choice with its allowed values, labels and default, taken from the installed package. Use those values, not ones remembered from elsewhere: the lists change between versions.

Ask in two short rounds. Use your structured question tool if you have one (four questions per round, each with a few options and a free-text "Other"). Otherwise ask in plain text, one round per message. Put a recommended option first. Offer "use the defaults for the rest" after round one, because many people only care about colour and type.

**Round one: identity**

| Question | Answer key | How to offer it |
|---|---|---|
| Brand colour | `primary`, `primaryHex` | Ask for a hex. Also offer the named ramps from `options` (Blue, Violet, Green, Amber, Red, Cyan, Terracotta). A hex means `primary: "custom"` plus `primaryHex`; the ramp is built around their exact colour. |
| Buttons and links | `actions` | "Ink" is Dovetail's default: near-black buttons, with the brand colour kept for accents. "Brand" puts buttons, links, selection and focus in the brand colour. |
| Typeface | `font`, optionally `displayFont` | Offer three or four sans options from `options.font` (Geist is the default), plus "a serif or display face for headings", which sets `displayFont`. Body text stays in `font`. |
| Corners | `radius` | Sharp, standard or soft, with labels from `options`. |

**Round two: feel** (skip on "defaults")

| Question | Answer key | How to offer it |
|---|---|---|
| Spacing | `whitespace` | Tight (dense, technical), balanced (default), airy (editorial, breathing room). |
| Brand bands | `brandFill` | How full-bleed brand sections look: solid, quiet (pale tint of the brand), gradient, duotone. |
| Page colour | `pageTint`, `sectionTint` | White and grey (`neutral`), or the brand's pale tint on the quiet bands only (`sectionTint: "muted"`) or on the whole page (`pageTint: "muted"`). |
| Second colour | `secondary`, `secondaryHex` | Optional: a secondary brand colour for accents and illustrations, as for the primary. |

Anything they don't mention keeps its default; leave it out of the answers rather than restating defaults. The advanced choices (`headlineColor`, `wordmarkColor`, `texture`, `textSpacing`, `moduleSpacing`, `codeFont`, `secondaryFont`, `baseUnit`, `focusRing`, `density`, `mono`, `steps`) are all in `options`. Set them only when the user asks for something they express, such as "headlines in our brand colour" (`headlineColor: "primary"`).

Write the answers to a JSON file, then build:

```sh
node scripts/theme.mjs build dovetail-answers.json --out src/styles/dovetail-theme.css
```

Put the theme next to the app's other global CSS; `src/styles/` is only an example. Delete the answers file afterwards, because the theme keeps a copy of the answers in its first comment.

### Import path

Find the file, then check it:

```sh
node scripts/theme.mjs check path/to/theme-custom.css
```

The check reports errors (declarations that aren't tokens, which a theme must not contain) and warnings (tokens this version of Dovetail doesn't know, usually a typo or a theme from a newer version). It also lists the fonts the theme names and how to load them. Fix errors with the user rather than silently dropping lines, since they may be deliberate customisations that belong in the app's own CSS instead. Then move the file to where the app keeps global CSS, for example `src/styles/dovetail-theme.css`.

## 3. Read the build or check output

Both commands print a short report after the file. Act on it:

- **Contrast.** Each failing pair is listed with its ratio and the minimum, followed by one line with the fix: an exact `primaryEdits` (or `secondaryEdits`) value that moves only the failing steps. Tell the user plainly which pair fails, for example "white text on your buttons is 3.9:1 and needs 4.5:1". Offer to adopt the fix: add that value to the answers, then rebuild. Don't change `primaryHex` for this, because that rebuilds the whole ramp around a different colour. Don't adopt a fix silently either: it changes their brand colour.
- **Fonts.** The report says whether to import `@dovetail-ds/react/fonts.css` (Geist and Geist Mono) and gives a Google Fonts URL for any other face. A face with no URL (System UI, or a custom family in an imported theme) needs nothing loaded, or the user's own `@font-face`.

## 4. Wire it into the app

Read `references/wiring.md` for the framework's snippet. The order is what matters:

1. `@dovetail-ds/react/fonts.css`, only if the report says the theme uses Geist or Geist Mono.
2. `@dovetail-ds/react/styles.css`
3. The theme file.

The theme must come after `styles.css`, or the defaults win. Load each once, at the root, never per page. Add the Google Fonts link if the report gave one. Set up dark mode if they want it: Dovetail's dark theme applies wherever the `dark` class is, on `<html>` for the whole page or on any element for one band. `wiring.md` has a snippet for following the operating system.

## 5. Verify

Run the project's own type check or build, so a wrong import path fails now rather than in the browser. If there's a dev server and a browser tool, open a page and confirm a Dovetail `Button` picks up the theme. Its background should be the brand colour when `actions` is `brand`, near-black otherwise. Then summarise for the user in a few lines: the file you wrote and where, what it sets, the imports added, and anything left for them (a failing contrast pair they chose to keep, fonts to self-host).

## Changing a theme later

A theme built by this skill starts with a comment like `/* dovetail-setup choices: {...} */` holding the answers. To change something ("make buttons our brand colour", "softer corners"), follow these steps:

1. Read that JSON from the file.
2. Change only the keys the request is about.
3. Rebuild over the same file with `build --out`.
4. Show the user the diff in plain terms.

Never hand-edit the colour ramps, because they are computed together and the contrast checks depend on them. A theme imported from Configure has no choices comment. To change it, either re-export from Configure, or rebuild it with the interview path (the check output shows its primary colour and fonts to start from). Say which you're doing.

## What not to do

- Don't write component selectors (`.button`, `[role=dialog]`) into the theme, and don't override `--dt-button-*` or other component tokens to recolour things. Change the semantic or brand choice that drives them, so light, dark and every component stay consistent.
- Don't edit anything in `node_modules/@dovetail-ds/react`.
- Don't paste Dovetail's `styles.css` into the project. Import it, so upgrades arrive with `npm update`.
