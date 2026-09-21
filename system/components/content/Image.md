# Image

A ratio-locked image with a built-in placeholder. Use it instead of a bare \`<img>\` anywhere in a template. It reserves space, crops predictably, and degrades to a labelled frame when the content system has not supplied a file yet.

## Alt text is required

\`alt\` is a required prop, not an optional one. Pass an empty string for a purely decorative image — that is an explicit decision a reviewer can see. An omitted \`alt\` is a type error.

## Fit and focal point

\`fit="cover"\` is the default and the right answer for nearly all editorial and marketing placements: the frame stays exact and the image crops. Use \`contain\` only for logos and screenshots where losing an edge is worse than leaving empty space.

When cover crops the wrong part of a photo, move the focal point rather than changing the ratio:

\`\`\`jsx
<Image src={hero} alt="Two engineers reviewing a schematic" ratio="21:9" position="center 30%" />
\`\`\`

## Placeholders

Without \`src\`, Image renders a dashed frame labelled with \`placeholder\` or \`alt\`. Templates ship this way on purpose — a consumer can see the intended ratio and subject before wiring up a CMS.
