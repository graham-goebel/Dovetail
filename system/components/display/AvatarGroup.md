# AvatarGroup

Shows who is involved without spending a full row per person. Use it for project members,
shared documents, and assignee columns.

## Rules

- `label` is required. Screen readers announce the group, not each overlapping image.
- Keep `max` at 3–5. Past that the overlap stops being readable and the +N chip carries
  no useful information.
- Order matters: put the most relevant people first. Do not sort alphabetically unless
  the list is a directory.
- Do not make individual avatars in a group clickable. If a person needs an action,
  use a List instead.

## Tradeoffs

Overlap saves horizontal space but hides parts of each face. In a directory or a picker
where identification matters more than density, use a List with full avatars.
