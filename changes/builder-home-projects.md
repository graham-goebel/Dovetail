---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
On the Builder page (`builder.html`), Home holds projects as well as files.
- **Files and projects:** what Home used to call projects are now files, each with its own pages. A project is a group of files. A file can sit loose on Home or inside a project, and **Move to…** in its ⋯ menu moves it in or out. Your existing work becomes loose files and is otherwise unchanged.
- **New:** one **New** button holds New project, New file, a file from a template, and Open a file. A file you make inside a project belongs to it.
- **Finding and sorting:** search is large and at the top, and on Home it also finds files inside projects. A switch sorts by Recent, A–Z or Date created, and the choice is remembered.
- **Card actions:** every card's actions (open, rename, picture, duplicate, download, move, delete) sit in a ⋯ menu beside its name. Nothing covers the picture.
- **Whole projects:** a project downloads as one `.dovetail` file holding all its files, and opening that file brings the whole project back. Deleting a project asks first, and offers to keep its files on Home.
- **Moving around:** the page fades between Home and a project. Cards show their shapes while the list loads, a file shows a spinner while it opens, and the canvas fades in once it's open. With reduced motion, none of this animates. Escape steps back a level, and `/` jumps to search.
- **Top bar:** a file in a project shows the project's name first in the top bar, and pressing it opens the project on Home.
