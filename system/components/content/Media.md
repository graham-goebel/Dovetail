# Media

A media-and-copy row. This is the block a marketing or lifestyle page is mostly made of, so it is a component rather than something each template re-lays-out.

## Alternate, don't randomise

Stack several Media blocks and flip \`reverse\` on every other one. The zigzag gives a long page rhythm without any new layout code. Flipping them in an irregular order reads as a mistake.

\`\`\`jsx
<Media media={<Image src={a} alt="…" ratio="4:3" />} title="Ship the theme, not the fork" body="…" />
<Media media={<Image src={b} alt="…" ratio="4:3" />} title="One contract, every surface" body="…" reverse />
\`\`\`

## One primary action

\`actions\` takes a row of controls. At most one is primary — everything else is secondary or a link. Three buttons in a marketing row means you have not decided what the section is for.

## Weighting the columns

\`mediaWidth\` sets the media track. Use \`"1fr"\` for an even split, \`"1.2fr"\` when the image is the argument, and a fixed width like \`"360px"\` for a small supporting visual beside long copy.
