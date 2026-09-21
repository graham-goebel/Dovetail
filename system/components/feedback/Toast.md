# Toast

Confirms that something happened, out of the user's way. Use it for results of actions
the user just took.

## Rules

- Render toasts inside a `ToastRegion`. It owns the fixed positioning, stacking, and
  the accessible region name.
- Toasts are for outcomes, not errors that need a decision. A failed save that the user
  must resolve belongs in an Alert next to the form.
- One action, and it should be Undo or Retry. A toast that disappears while the user
  reaches for a link is a broken control.
- `danger` announces assertively and should not auto-dismiss. Everything else can.
- Never stack more than three. Collapse the rest into a count.

## Tradeoffs

Toasts are easy to miss — they appear away from the point of action and vanish. For
anything the user must acknowledge, use a Dialog or an inline Alert.
