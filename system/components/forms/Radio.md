# Radio

One choice from a mutually exclusive set, with all options visible.

## Use it when
- Two to five options and the user benefits from seeing them all.

## Don't use it when
- More than about five options. Use Select.
- The choices are not exclusive. Use Checkbox.
- There are exactly two opposite states applied instantly. Use Switch.

## Example
```jsx
<Stack gap="xs">
  <Radio name="billing" value="monthly" label="Monthly" hint="$20 per seat" defaultChecked />
  <Radio name="billing" value="annual" label="Annual" hint="$16 per seat, billed yearly" />
</Stack>
```

## Accessibility
Every radio in a group needs the same name — that is what gives the group arrow-key navigation and a single tab stop. Wrap the group in a fieldset with a legend, or a Field with role="radiogroup".

## Content
Options are parallel in structure and length. Put price or consequence in the hint, not the label.
