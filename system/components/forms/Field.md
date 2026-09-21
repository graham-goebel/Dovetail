# Field

The wrapper that gives a control its label, hint, and error. Input, Textarea, and Select render their own Field when you pass them a label; use Field directly when you need to wrap something else.

## Use it when
- Wrapping a custom or composed control that needs the standard label and error treatment.

## Don't use it when
- You are using Input, Textarea, or Select with a label prop. They already build one.

## Example
\`\`\`jsx
<Field label="Timezone" hint="Used for scheduling" htmlFor="tz">
  <MyCustomPicker id="tz" />
</Field>
\`\`\`

## Accessibility
htmlFor must point at the control's id. The error renders in role="alert" so it is announced when it appears. The required asterisk is aria-hidden — set required on the control so assistive tech hears it once, not twice.

## Content
Labels are sentence case nouns without a colon. Hints explain the format or the consequence. Errors say what happened and what to do next: "That email is already in use. Try signing in instead."
