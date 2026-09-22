# Combobox

A text input that filters a known list. Reach for it when a `Select` has grown past
the point where someone can scan it.

## Use it when
- The list is long enough that typing beats scrolling, roughly a dozen options and up.
- The options are known and fixed. A combobox filters; it does not create.

## Don't use it when
- There are a handful of options. Use `Select`: it is one control, it works without
  JavaScript, and every platform already knows how to render it.
- The user may need to enter something not on the list. That is a different control, and
  it needs to say so.
- The options come from a server as you type. This one filters what it was given.

## Example
```jsx
<Combobox
  label="Country"
  options={countries}
  value={country}
  onChange={setCountry}
  hint="Where the account is billed"
/>
```

## Keyboard
| Key | Does |
|---|---|
| `Down` / `Up` | Opens the list, then moves the active option |
| `Enter` | Selects the active option and closes |
| `Escape` | Closes and puts the selected label back in the box |
| `Home` / `End` | Jumps to the first or last match |
| `Tab` | Closes and moves on, leaving the selection as it was |

## Accessibility
The input is `role="combobox"` with `aria-expanded`, `aria-controls` and
`aria-autocomplete="list"`; the active option is pointed at with `aria-activedescendant`
rather than being focused, so focus never leaves the input. Options carry `aria-selected`.
Give it a `label`. A combobox with placeholder text and no label is the most common
failure in this pattern.

## Tokens
Reads the `--dt-input-*` tier so it lines up with `Input` and `Select` to the pixel, and
`--dt-surface-overlay` with `--dt-elevation-3` for the list, so it sits in the same
overlay family as `Popover`.

## Content
The label names the field, not the action: "Country", not "Choose a country". The empty
message says what happened, not sorry: "No matches".
