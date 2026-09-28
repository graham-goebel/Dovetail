---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: false
---
Documentation pages load their stylesheets and scripts with a content hash in the URL, so a browser can't combine a freshly deployed page with a cached copy of the old CSS or JS.

Inline icons also carry an intrinsic size, so they stay icon-sized even if a stylesheet is missing.
