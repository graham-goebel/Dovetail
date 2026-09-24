# BottomNav

A phone app's primary navigation: three to five destinations docked to the bottom of the screen, where a thumb can reach them, with the home indicator's safe area kept clear.

## Use it when
- A phone app has a handful of top-level destinations a person moves between often.
- Inside an `AppShell`, passed as `bottomNav`.

## Don't use it when
- There are more than five destinations. Put the rest behind a "More" item or in a Drawer.
- It is a website rather than an app. Use `Navbar`, which collapses to a menu on a phone.
- The choices are views of one screen. Those are `Tabs`.

## Variants
- `bar`: a full-width docked bar, glass by default, with an indicator pill behind the active icon.
- `floating`: an inset glass pill that sits over a fade of the page surface, with room for an `action` beside it, such as an add or record button. Good over imagery and dark, immersive screens.

## Example
```jsx
<BottomNav
  current={tab}
  onNavigate={setTab}
  items={[
    { id: "today", label: "Today", icon: <HomeIcon /> },
    { id: "trends", label: "Trends", icon: <ChartIcon />, badge: 2 },
    { id: "me", label: "Me", icon: <UserIcon /> },
  ]}
/>
```

Every item is at least `--dt-size-touch-target` tall. The current item carries `aria-current="page"`, and a badge is announced with its label ("Trends, 2 new"), so it is not colour alone.

## Tokens
`--dt-bottomnav-*` (Tier 3): the bar surface and border, the item colours at rest and active, the indicator for each variant, and the badge. The bar reads `--dt-surface-glass` and `--dt-backdrop-glass`; the floating variant sits on `--dt-scrim-fade-bottom`.
