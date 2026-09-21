# ButtonGroup

Groups related buttons. Detached by default; `attached` joins them into a segmented control.

## Use it when
- Two or more buttons act on the same object: a dialog footer, a toolbar cluster.
- `attached`: mutually exclusive view options such as list/grid or day/week/month.

## Don't use it when
- The buttons are unrelated. Use `Inline`.
- The options are a form value. Use `Radio` or `Select`.

## Example
```jsx
<ButtonGroup label="View mode" attached>
  <Button variant="secondary">List</Button>
  <Button variant="secondary">Grid</Button>
</ButtonGroup>
```

## Accessibility
Renders `role="group"` with the required `label`. For a segmented control where one option is selected, set `aria-pressed` on each button yourself — ButtonGroup does not manage selection state.
