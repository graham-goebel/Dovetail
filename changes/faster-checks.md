---
type: changed
bump: none
area: tooling
components: []
tokens: []
visual: false
---
The checks run faster, and the same things are checked.
- `npm run check:browser` waits for each card or page to be ready instead of sleeping a fixed time after every load, and it doesn't fetch web fonts, which the check already set aside. It takes about half the time it did.
- CI runs the browser, behaviour and builder checks as three jobs side by side, and caches Chromium between runs.
- `npm run check` runs the quick checks first, then the three browser checks side by side, and reports how long each took. `npm run check:fast` runs just the quick ones, in about fifteen seconds.
