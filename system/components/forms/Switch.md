# Switch

An instant on/off setting. Flipping it applies the change — there is no Save button.

## Use it when
- A preference takes effect immediately: notifications, dark mode, autopay.

## Don't use it when
- The value is submitted with a form. Use Checkbox — a switch that needs saving lies about when it took effect.
- The choice is not two opposite states.

## Example
```jsx
<Switch label="Autopay" hint="Charge the card on file each month" labelPosition="start" defaultChecked />
```

## Variants
labelPosition="start" is the settings-row pattern: label left, switch pushed to the right edge.

## Accessibility
Renders role="switch" on a real checkbox input, so state is announced as on/off rather than checked/unchecked.

## Content
Label names the thing being switched, not the action. "Autopay", not "Turn on autopay".
