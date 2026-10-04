---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
Each project on the Builder page (`builder.html`) keeps its own settings, and the Projects home works better.

- The canvas colour behind the frames belongs to the project, so a black canvas in one project and a red one in another each stay put. A new project starts on the builder's own colour.
- The Configure theme in the left panel belongs to the project too. A new project starts with the theme on screen, and a project saved before this keeps the theme it opens with. Downloaded project files carry their canvas colour and theme. Opening a file from someone else brings only the theme settings Configure knows, each checked.
- A project can have a picture of your choosing: pick an image from its card on the Projects home, or use the frame on screen from the project menu. A chosen picture stays until you choose again or set it back to follow the canvas.
- The project on screen is listed first. New blank projects are numbered (Untitled 2, Untitled 3) instead of all being Untitled.
- Pictures of the canvas are quicker. They no longer fetch web fonts, so switching projects no longer waits on them, and they no longer fill the console with failed requests.
- On a phone, projects are listed as rows with their actions beside them, and Close stays in the dialog's corner.
