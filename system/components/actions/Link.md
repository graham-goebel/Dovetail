# Link

Navigation. The rule: if it changes the page, it is a Link; if it changes data, it is a Button.

## Use it when
- Navigating within the app or out to another site.

## Don't use it when
- It performs an action. Use `Button variant="ghost"` — a link that deletes something is a trap.

## Example
```jsx
<Link href="/settings">Account settings</Link>
<Link href="https://example.com" external>Read the spec</Link>
```

## Variants
`underline="always"` is the default and is correct inside prose — colour alone is not a sufficient signal. `underline="hover"` is acceptable in navigation lists where position already marks the links.

## Accessibility
`external` adds `rel="noopener noreferrer"` and a visible icon, so a new tab is never a surprise.

## Content
Link text describes the destination. "Account settings", not "click here" or a bare URL.
