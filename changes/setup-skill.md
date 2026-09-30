---
type: added
bump: minor
area: tooling
components: []
tokens: []
visual: false
---
The package ships a Claude Code skill, `skills/dovetail-setup`, that sets Dovetail up in a project. It interviews you about brand colour, buttons, type, corners, spacing and surfaces, or imports a `theme-custom.css` downloaded from Configure. Then it writes the theme, wires `fonts.css`, `styles.css` and the theme into the app's root in the right order, and reports contrast failures with exact fixes. Copy it into `.claude/skills/` to use it; the README shows how.

The skill runs Configure's own code from the installed package (`dist/configure/core.js`, which is not public API), so a theme built from answers is byte-for-byte the file Configure's "Download theme.css" gives for the same choices. Its script also checks any theme file: anything that isn't a token declaration is an error, and a token this version doesn't know is a warning.
