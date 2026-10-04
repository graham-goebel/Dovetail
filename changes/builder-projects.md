---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) keeps projects, each with its own canvas.

- Projects live in the browser's IndexedDB, so the old few-megabyte limit on saved work and uploads is gone. Where IndexedDB isn't available, the builder falls back to localStorage as before.
- The bar names the project on screen. Double-click the name to rename it; its menu offers All projects, Versions, Duplicate and Download file.
- **Projects** lists every project as a card with a picture of it and when it was last edited. From there you can make a new one (blank, or from a template), open, rename, duplicate, download or delete one (delete asks first), search, or open a `.dovetail` file as a new project.
- Switching projects saves the one you're leaving and opens the other with its own history.
- **Versions** are kept every 10 minutes while you work and before starting over, pasting a layout over yours or restoring, 30 per project. You can also keep one yourself. Restoring a version is a step undo can take back.
- A share link opens as a new project instead of replacing your work. An example from the docs still joins the project you last had open.
- Work saved before projects moves into a project of its own the first time the builder opens, with its backup kept as a version, and the Content library moves too.
