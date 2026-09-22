# Spacer

Empty space as an element. It exists for one job: pushing siblings apart inside a flex container.

## Use it flexible, rarely fixed

With no \`size\`, Spacer absorbs the remaining space: the clean way to push a trailing action to the far end of a toolbar without \`margin-left: auto\` scattered through the markup.

\`\`\`jsx
<Inline align="center">
  <Heading>Members</Heading>
  <Spacer />
  <Button variant="primary">Invite</Button>
</Inline>
\`\`\`

A fixed \`size\` is almost always the wrong tool. If two children need a gap, set \`gap\` on the \`Stack\` or \`Inline\` that holds them; the container should own the rhythm, not a sibling wedged between them. Reach for a fixed Spacer only when one gap in a set genuinely differs and you do not want to split the container in two.

Spacer is \`aria-hidden\`. It never carries content.
