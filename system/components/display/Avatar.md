# Avatar

Identifies a person or entity at a glance. Use it in lists, tables, comment threads, and
account menus — anywhere a name alone reads slower than a face.

## Rules

- `name` is required even when `src` is set. It is the image alt text and the initials
  fallback. An avatar with no name is unlabelled to a screen reader.
- Use `xs` and `sm` inside dense rows, `md` as the default, `lg` and `xl` for profile
  headers only.
- `status` is presence, not role or state. Do not repurpose it as a notification dot —
  use Badge for that.
- Square avatars are for organisations and workspaces. Circles are for people.

## Tradeoffs

Initials collide often in large directories. If your data set has many shared initials,
supply images or add a secondary identifier next to the avatar.
