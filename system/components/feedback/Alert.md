# Alert

An inline message about the state of the page or a form. It sits in the layout and stays until the condition clears.

## Use it when
- A form failed validation at the form level.
- The page is in a state the user should know about: trial ending, sync paused.

## Don't use it when
- The message confirms an action the user just took. Use `Toast`.
- It relates to one field. Use that field's `error` prop.
- It is permanent marketing copy. That is page content, not an alert.

## Example
```jsx
<Alert tone="danger" title="We couldn't save your changes">
  Your session expired. Sign in again and retry.
</Alert>
```

## Accessibility
`danger` renders `role="alert"` and interrupts; the other tones render `role="status"` and wait for a pause. Omit `onDismiss` when the user must act — a dismissible blocker is a dead end.

## Content
Title says what happened. Body says what to do next. Never lead with an apology.
