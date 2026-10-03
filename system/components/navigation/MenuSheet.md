# MenuSheet

A site or app menu as one sheet: sections set large, a layer per section that slides in from the side, and search in the footer beside close. It grows out of the button that opened it and shrinks back into it. This is the menu the Dovetail site uses on a phone.

## Use it when
- A site or app has more places than a tab bar can hold, and on a phone they should all be one tap from a menu button.
- Sections have pages under them, and people should be able to look inside a section without leaving the menu.
- People should be able to search from the same place they browse.

## Don't use it when
- There are five places or fewer that people move between all the time. Use `BottomNav` or `Tabs`.
- The navigation should stay on screen beside the content on a wide screen. Use `Sidebar`, and open the MenuSheet only on a phone.
- It's a task or a form. Use `Sheet` or `Dialog`.

## Example
```jsx
const button = useRef(null);
const [open, setOpen] = useState(false);

<span ref={button}><IconButton label="Menu" onClick={() => setOpen(true)}><MenuIcon /></IconButton></span>
<MenuSheet
  open={open}
  onClose={() => setOpen(false)}
  anchor={button}
  home={{ label: "Home", href: "/" }}
  items={[
    { label: "Shop", items: [
      { label: "Mugs", href: "/mugs", description: "Stoneware, made to order" },
      { label: "Bowls", href: "/bowls", description: "Nesting sets" },
    ] },
    { label: "Journal", display: "cards", items: posts },
    { label: "Visit", href: "/visit", current: true },
  ]}
  links={[{ label: "Gift cards", href: "/gift" }]}
/>
```

## Layers
- An entry with `items` opens a layer. The path at the top ("Menu / Shop") goes back, and so does a swipe right.
- A layer's `display` sets its layout:
  - `list`: rows. An entry with entries of its own shows a count and opens a further layer.
  - `cards`: two up, with the first across the full width.
  - `filter`: each entry is a group. The groups become filter chips over one list.
- Mark the page you're on with `current`. It gets `aria-current="page"` and a dot.

## Search
- Search and close sit in the footer, the same on every layer, with close where the menu button was.
- Search turns the footer into a field fixed to the bottom of the sheet, above the keyboard on a phone. Results fill the sheet above it.
- By default it looks through every entry in `items` and describes each by the sections above it. Pass `searchItems` for a different set, or `onSearch` to search your own way.
- Enter takes the first result. Escape, or the field's own close, goes back to the menu.

## Composition
- Give it the button that opens it as `anchor`, so it grows out of that button. Without one it rises from the bottom.
- `onSelect` hears every choice. Use it to route in an app; links still navigate unless you prevent it.
- `home` takes an item or your own element for the top right.

## Tokens
- Sheet: `--dt-menu-sheet-bg`, `--dt-menu-sheet-fg`, `--dt-menu-sheet-muted`, `--dt-menu-sheet-divider`, `--dt-menu-sheet-scrim`, `--dt-menu-sheet-radius`, `--dt-menu-sheet-shadow`, `--dt-menu-sheet-inset`, `--dt-menu-sheet-top-gap`, `--dt-menu-sheet-padding`, `--dt-menu-sheet-width`.
- Parts: `--dt-menu-sheet-fill`, `--dt-menu-sheet-chip-on-bg`, `--dt-menu-sheet-chip-on-fg`, `--dt-menu-sheet-link-size`, `--dt-menu-sheet-control-size`.
- Motion, read when it opens: `--dt-menu-sheet-open`, `--dt-menu-sheet-close`, `--dt-menu-sheet-layer`, `--dt-menu-sheet-travel`, `--dt-menu-sheet-ease`.
- Colours are repeated under `.dark`.

## Accessibility
- A modal dialog named by `label`. Focus moves into it, Tab stays inside, and focus returns to the opener on close. The page behind doesn't scroll.
- The path is a `nav`, with the current step marked `aria-current="location"`. Going back puts focus on the entry that opened the layer.
- Search announces the number of results politely as you type.
- Escape leaves search first, then closes.
- Under `prefers-reduced-motion` nothing grows, slides or fades. Swipes still work.
- Touch: a drag down from the top closes it and a drag right in a layer goes back. Both follow the finger and settle back if let go early.

## Content
- Keep top-level labels to one or two words. They're set large and don't wrap.
- A layer reads best with a short description per entry: what it is, not what it does.
- `label` names the menu ("Menu"), and it's the first step of the path.
