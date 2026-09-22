# Input

Single-line text field. Builds its own Field when given a label.

## Use it when
- Collecting a short, free-form value: name, email, search term.

## Don't use it when
- The value is one of a known set. Use Select.
- The answer runs past a line. Use Textarea.

## Example
\`\`\`jsx
<Input label="Work email" type="email" required hint="We only use this for billing" />
<Input label="Email" error="That email is already in use. Try signing in instead." />
\`\`\`

## Tokens
--dt-input-*, shared with Textarea and Select so every field in a form has identical geometry.

## Accessibility
Generates an id and wires htmlFor automatically. The error prop sets aria-invalid and announces in a live region. Placeholder is never a label; it disappears the moment someone types.

## Content
Label is a sentence-case noun. Placeholder shows format, not instruction: "name@company.com", not "Enter your email".
