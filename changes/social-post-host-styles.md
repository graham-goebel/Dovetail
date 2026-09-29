---
type: fixed
bump: patch
area: components
components: [SocialPost]
visual: true
---
`SocialPost` headings keep the post's own colour on a page that styles `h2`, so a `brand` or photo post no longer shows dark text where it should be white. Body copy and the `list` layout ignore a host `max-width` on `p` and `ol`. If the `--dt-social-*` tokens haven't loaded, the artboard falls back to its native size (1080 × 1920, 1350 or 1080) instead of drawing blank or oversized.

On the docs site, links to preview cards now carry a stamp of the card and of the component bundle. A card opened after a release therefore loads the new bundle instead of a cached one that predates its component. This is what left the Social templates card blank.
