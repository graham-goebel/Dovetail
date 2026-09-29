# SocialPost

A social post drawn on an artboard at the format's native pixel size and scaled to fit wherever it is shown: an Instagram story (9:16, 1080 × 1920) or a grid post (4:5, 1080 × 1350, or 1:1, 1080 × 1080). A screenshot of the artboard at full size is ready to publish.

## Use it when
- Making a set of stories or grid posts that should read as one brand.
- Previewing social assets beside the product they announce, themed by the same tokens.

## Don't use it when
- Showing someone else's post in a feed. That is a `Card` in the social context.

## Layouts
Ten layouts share one frame: the brand and an optional `counter` along the top, the `handle` and a `cta` pill along the bottom, and one editorial type scale between.

| On a tone | Around a photograph |
|---|---|
| `headline`: a big line with eyebrow and body | `cover`: full-bleed photo, headline on a scrim |
| `quote`: an oversized quote mark, the quote and `meta` | `split`: photo above, copy below |
| `stat`: one huge number, what it counts, a qualifier | `framed`: the photo as a card inside the tone, caption under |
| `list`: a title over up to five numbered `items` | `card`: full-bleed photo with a frosted card of copy |
| `announcement`: centred, with a `badge` and a date | `poster`: one word, as large as its length allows |

## Example
```jsx
<SocialPost layout="headline" tone="brand" format="story" brand="High Route" handle="@highroute"
  eyebrow="Summer 2026" title="Walk the high route." body="Four to nine days between huts." cta="Link in bio" />

<SocialPost layout="cover" format="portrait" image="/img/alpine.jpg" eyebrow="Route 04" title="Above the tree line" />
```

## Keeping a set cohesive
Keep one `brand` and `handle`, alternate tone and pictured layouts down a carousel, and number it with `counter`. Every size and colour comes from tokens, so changing the theme rebrands the whole set.

## Tokens
`--dt-social-*` in `tokens/component/social.css`: the artboard width and heights alias `--dt-size-artboard-*`, and the padding and gap are layout layers (`--dt-layout-stack-block` and `--dt-layout-stack-group`) drawn at `--dt-social-scale`, 2.5, so a post follows the layout: Configure's Spacing, Text and Modules, or `spacing` on the post or `data-layout` on a region around it. Inside it, everything is a `Stack` or an `Inline` at a layer, scaled by `--dt-layout-scale`, which the artboard sets. The radius aliases the overlay radius; the type sizes alias the `--dt-text-artboard-*` roles, drawn for a 1080px canvas and never retuned by a context; the colours alias the ordinary surface and text roles, and `--dt-text-on-scrim-strong` on photographs.

## Accessibility
The post is exposed as one image (`role="img"`) named by `label`, or by its eyebrow, title and body. When you publish it, write the same text into the platform's alt text.
