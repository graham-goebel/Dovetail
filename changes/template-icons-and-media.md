---
type: added
bump: minor
area: templates
components: [Image, Video, Cover]
tokens: []
visual: true
---
The marketing and dashboard templates draw line icons in navigation, buttons, feature cards and stat tiles. They also carry photo, video and illustration placeholders: fill a slot by dropping a file on it or by uploading in Configure's Media tab.

The icons come from `system/templates/_support/template-icons.js`, demo chrome drawn on the documented 24px convention. They follow Configure's icon stroke and size controls. The template switcher's Base theme now shows the shipped defaults instead of forcing the old blue ramp and radii. The site previews are compiled from `system/kits/` by `npm run build`, so the two no longer drift.
