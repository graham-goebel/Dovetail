# Stepper

Shows how far through a sequential task the user is and how much remains. Use it for
checkout, onboarding, and setup wizards.

## Rules

- Steps must be genuinely sequential. If the user can complete them in any order, use
  Tabs or a checklist.
- Three to five steps. A seven-step stepper reads as a warning, not a guide.
- Step labels are nouns or short verb phrases, sentence case: "Shipping address", not
  "STEP 2: ENTER YOUR SHIPPING ADDRESS".
- The active step carries `aria-current="step"`. Do not also mark it with colour alone.
- Use `vertical` when step descriptions run longer than a few words.

## Tradeoffs

Showing the full path sets expectations but can deter users at step one. If your flow is
long, consider splitting it so the first commitment is small.
