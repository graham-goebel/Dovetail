---
type: fixed
bump: patch
area: templates
components: []
tokens: []
visual: true
---
The preview cards and the templates are responsive on a phone. None of them said `width=device-width`, so a phone laid every card out at 980px and shrank it to fit, and no media query in any of them ever ran; they only looked responsive in a desktop window dragged narrow. Every card now carries the viewport meta.

Twelve colour and elevation cards, the type and space scales, the wordmark, the layers card, the settings page template and the theme configurator card were wider than a 390px screen. Their swatch rows become a grid, the settings page's sidebar becomes a strip above the page, the configurator's panel stacks over its preview, and the type scale sets each sample under its label. The docs pages also break a long path in a paragraph rather than widening the page. `npm run check` now loads every card and page as a 390px phone and fails on a missing viewport meta or content wider than the screen.
