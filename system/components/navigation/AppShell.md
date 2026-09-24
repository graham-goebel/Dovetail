# AppShell

The frame of a phone app: a top bar, a body that scrolls, and a bottom navigation. It honours the device's safe areas on every side, so nothing sits under the notch, the home indicator or a rounded corner in landscape.

## Use it when
- Building a phone app screen, or a mobile web app meant to feel like one.
- Showing an app screen inside a device frame, a dialog or a docs card: `scroll="contained"`.

## Don't use it when
- It is a website. Use `Navbar` and `Section`.
- It is a desktop product. Use `Sidebar` and a page layout.

## Example
```jsx
<AppShell
  title="Today"
  leading={<Avatar name="Ada Lovelace" size="sm" />}
  trailing={<IconButton label="Notifications"><BellIcon /></IconButton>}
  bottomNav={<BottomNav items={tabs} current={tab} onNavigate={setTab} />}
>
  <Stack gap="md" style={{ padding: "var(--dt-space-inset-md)" }}>…</Stack>
</AppShell>
```

## How it scrolls
The bars are sticky inside whatever scrolls. With `scroll="page"`, the default, the document scrolls, which lets a phone browser collapse its own bars; the shell is at least the screen's height. With `scroll="contained"` the shell fills its parent and scrolls itself. Either way content scrolls beneath glass bars, which is why they are translucent by default. Pass `translucent={false}` for solid bars.

## Immersive screens
`backdrop` takes a layer that stays put behind everything: a photograph, a gradient, an illustration. Pair it with `dark` to scope dark mode to the app, `BottomNav variant="floating"`, and `Card surface="glass-inverse"` for cards that stay readable over the picture. Measure text against the real image, as `guidelines/accessibility.md` describes.

## Tokens
`--dt-appshell-*` (Tier 3): the bar height, surface and border, the shell background, and the phone width. The bars read `--dt-surface-glass` and `--dt-backdrop-glass`.
