# Accessibility

Accessibility is encoded in the tokens and the component APIs, not left to the person
using them. This page documents what the system guarantees and what you still owe.

## What the system guarantees

**Contrast.** Every semantic foreground/background pair clears WCAG 2.2 AA in both light
and dark: 4.5:1 for body text, 3:1 for large text (19px bold / 23px regular and above) and
non-text elements like borders and icons.

**Focus.** One ring, defined by `--dt-focus-ring-*` and applied through `:focus-visible` in
`tokens/base.css`. It is 2px, offset 2px, and uses the accent colour, which is contrast-
checked against every surface in the system. Pointer users never see it; keyboard users
always do.

**Touch targets.** `--dt-size-control-md` is 40px and `--dt-size-touch-target` is 44px.
WCAG 2.2 §2.5.8 sets the floor at 24px; 44px is the size people can actually hit.

**Reduced motion.** All four motion roles collapse to `0ms linear` under
`prefers-reduced-motion: reduce`. No component needs its own media query.

## What you owe

**Never remove a focus ring.** Not with `outline: none`, not by overriding
`--dt-focus-ring-width` to zero. If the ring looks wrong on a component, the component
needs a different offset, not a removal.

**Labels are not optional.** Every icon-only control takes a required `label` prop. Every
form field is associated with a `<label>`. Placeholder text is not a label, because it disappears
the moment someone types.

**Don't carry meaning in colour alone.** An error state needs an icon or text, not just a
red border. This is why `theme-mono` keeps feedback colours chromatic even though it
strips the brand hue.

**Keyboard contracts are part of the component.** Each component's `.md` file documents
its keyboard behaviour. If you compose components into a new pattern, the pattern needs a
documented contract too.

**Respect the heading hierarchy.** Type roles are visual, not structural.
`--dt-text-heading-md` on an `<h4>` is fine. Skipping from `<h2>` to `<h5>` because it
looked right is not.

## The pairs to check when theming

If you override any of these surfaces, verify the paired foreground with it.

| Surface | Foreground | Minimum |
|---|---|---|
| `--dt-surface-base` | `--dt-text-primary` | 4.5:1 |
| `--dt-surface-base` | `--dt-text-secondary` | 4.5:1 |
| `--dt-surface-base` | `--dt-text-tertiary` | 4.5:1 |
| `--dt-surface-subtle` | `--dt-text-primary` | 4.5:1 |
| `--dt-surface-action` | `--dt-text-on-action` | 4.5:1 |
| `--dt-surface-action-danger` | `--dt-text-on-action-danger` | 4.5:1 |
| `--dt-surface-inverse` | `--dt-text-inverse` | 4.5:1 |
| `--dt-surface-selected` | `--dt-text-on-selected` | 4.5:1 |
| `--dt-surface-success` | `--dt-text-on-success` | 4.5:1 |
| `--dt-surface-warning` | `--dt-text-on-warning` | 4.5:1 |
| `--dt-surface-base` | `--dt-border-default` | 3:1 for meaningful borders |
| `--dt-surface-base` | `--dt-focus-ring-color` | 3:1 |

Disabled states are exempt from the text contrast minimum under WCAG, but Dovetail still
aims for 3:1, because a disabled control nobody can read is a usability problem even if it passes.

## Testing

Automated checks catch roughly 30% of issues. The rest need a person.

1. Tab through the entire screen. Every interactive element must be reachable, in a
   sensible order, with a visible ring.
2. Operate it with the keyboard alone. No mouse, no trackpad.
3. Run it at 200% browser zoom and 320px width.
4. Turn on `prefers-reduced-motion` and confirm nothing animates.
5. Check it in dark mode, where contrast regressions hide.
