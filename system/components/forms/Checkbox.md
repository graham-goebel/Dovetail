# Checkbox

Binary choice inside a form, committed when the form is submitted.

## Use it when
- Opting in or out: terms, notifications, add-ons.
- Selecting several items from a list.
- indeterminate: a "select all" row over a partial selection.

## Don't use it when
- The change applies immediately. Use Switch.
- The options are mutually exclusive. Use Radio.

## Example
```jsx
<Checkbox label="Email me about product updates" hint="About one message a month" />
<Checkbox label="Select all" indeterminate={some && !all} onChange={toggleAll} />
```

## Variants
labelPosition="start" puts the label on the left and the box at the right edge of the row. Use it in a column of options under a heading or field label, where a leading box would indent every label past the text above it. It's the same settings-row pattern as `Switch`.

```jsx
<Checkbox label="Include archived invoices" labelPosition="start" />
```

## Accessibility
The real input stays in the DOM and receives focus, so keyboard and screen-reader behaviour is native. The indeterminate flag is set on the element, not faked with an attribute.

## Content
Label states what checking it does, phrased positively. "Email me about product updates", never "Do not email me".
