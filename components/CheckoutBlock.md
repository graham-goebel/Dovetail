# CheckoutBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [CheckoutBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/CheckoutBlock.jsx), [CheckoutBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/CheckoutBlock.d.ts), [CheckoutBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/CheckoutBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/CheckoutBlock.html

## Guidelines

A one-page checkout. The form (contact email, shipping address, delivery method, card details and the place-order action) sits on the left; the order, read-only lines over an `OrderSummary`, sits on the right and stays in view. When the block is narrower than `collapseBelow` the order moves to the top, folded into a "Show order summary · $141.09" disclosure, the usual phone pattern.

### Use it when
- The final step of a purchase, on one page.

### Don't use it when
- The cart, before checkout. Use `CartBlock`.
- Real card payments: render your payment provider's hosted fields in place of `payment` (leave it out) so card data never touches your page.
- A multi-step checkout: compose `AddressFields`, `PaymentFields` and `OrderSummary` with a `Stepper`.

### Example
```jsx
<CheckoutBlock
  email={email}
  onEmailChange={setEmail}
  address={{ value: address, onChange: setAddress }}
  deliveryOptions={[
    { id: "standard", label: "Standard", detail: "3–5 working days", price: 0 },
    { id: "express", label: "Express", detail: "Next working day", price: 15 },
  ]}
  delivery={delivery}
  onDeliveryChange={setDelivery}
  payment={{ value: card, onChange: setCard }}
  lines={lines}
  summary={{ lines: [{ label: "Subtotal", amount: 120 }, { label: "Shipping", amount: 15 }, { label: "Tax", amount: 6.09 }], total: { amount: 141.09 } }}
  onSubmit={(e) => { e.preventDefault(); placeOrder(); }}
  submitAction={<Button type="submit" size="lg" fullWidth>Place order</Button>}
/>
```

### Variants
| Prop | What it is for |
| --- | --- |
| `onSubmit` | Wraps the form and summary in a `<form>`, so Enter submits and browsers autofill. Without it they sit in a `div` and `submitAction` handles its own click. |
| `address` | Leave out for a digital order. |
| `deliveryOptions` | A `RadioGroup`; each `price` shows with `Price` (0 reads "Free"). Leave out `price` to show none. |
| `payment` | Leave out when a provider's hosted fields take its place. |
| `collapseBelow` | The block's own width (not the viewport's) under which the order folds into the disclosure. Default 768. |

### Composition
A `Section` with a `BlockHeader`, then the form column: a Contact fieldset with an email `Input`, `AddressFields`, a Delivery fieldset with a `RadioGroup`, `PaymentFields` and `submitAction`. Beside it, or in the disclosure on a narrow block, `CartLine`s at `readOnly size="sm"` over an `OrderSummary` that drops its own frame for the panel's. The block validates and adds up nothing: every value, error and figure is yours.

### Tokens
Has none of its own. The header gap is `--dt-layout-module-gap`, the column gap `--dt-layout-inline-section` and the sections a `Stack` at `layer="block"`, all following the Configure sheet's layout. The order panel and the disclosure use `--dt-surface-subtle`, `--dt-border-subtle` and `--dt-radius-container`; legends use the `heading-xs` type role, as `AddressFields` and `PaymentFields` do.

### Accessibility
- The title is the page's `h1` by default (`level`); the summary heading is one below.
- The disclosure is a `<button>` with `aria-expanded` and `aria-controls` pointing at its panel. The total is part of its name ("Show order summary $141.09"), so it is heard without opening it.
- The email field has `type="email"`, `autocomplete="email"` and `inputmode="email"`; the address and card fields carry their own autocomplete tokens.
- Contact and Delivery are fieldsets named by their legends; each delivery option is a radio.
- The layout switch is measured with `ResizeObserver` after mount, so server and first client render match (wide).

### Content
- Place-order button names what happens: "Place order", "Pay $141.09".
- Delivery labels are the method ("Standard", "Express"); the detail says when.
- Say what is estimated until the address is known.

## Props

```ts
import * as React from "react";
import type { AddressFieldsProps } from "../commerce/AddressFields";
import type { PaymentFieldsProps } from "../commerce/PaymentFields";
import type { OrderSummaryProps } from "../commerce/OrderSummary";
import type { CartLineProps } from "../commerce/CartLine";

/** One delivery method, shown as a radio. */
export interface CheckoutDeliveryOption {
  /** Unique id, reported by onDeliveryChange and matched against delivery. */
  id: string;
  /** The method: "Standard", "Express". */
  label: string;
  /** A line under it: "3–5 working days", "Order by 2pm". */
  detail?: string;
  /** Its cost in major units, shown with Price after the label; 0 shows as "Free". Leave it out to show no price. */
  price?: number;
}

/** One read-only line in the checkout's order summary: CartLine's props, plus a stable id. */
export interface CheckoutLine extends Omit<CartLineProps, "readOnly" | "size" | "onQuantityChange" | "onRemove"> {
  /** A stable, unique id. It is the React key and is not rendered. */
  id: string;
}

/** A one-page checkout: contact, address, delivery and payment beside the order summary, which folds into a disclosure on a phone. */
export interface CheckoutBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onSubmit"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. Pass "" to leave it out. @default "Checkout" */
  title?: React.ReactNode;
  /** A line under the title. */
  lead?: React.ReactNode;
  /** The email address. Controlled; the field has type email and autocomplete "email". */
  email: string;
  /** Called with the field's new text. */
  onEmailChange: (value: string) => void;
  /** The email field's label. @default "Email" */
  emailLabel?: string;
  /** A line under the email field: "For your receipt and delivery updates". */
  emailHint?: string;
  /** The contact section's legend. @default "Contact" */
  contactLegend?: string;
  /** The shipping address, spread into AddressFields. Leave it out for a digital order. */
  address?: AddressFieldsProps;
  /** The delivery methods, as a RadioGroup with each price after its label. */
  deliveryOptions?: CheckoutDeliveryOption[];
  /** id of the chosen delivery method. Controlled. */
  delivery?: string;
  /** Called with the chosen method's id. */
  onDeliveryChange?: (id: string) => void;
  /** The delivery section's legend. @default "Delivery" */
  deliveryLegend?: string;
  /** The card details, spread into PaymentFields. For real payments, render your provider's hosted fields instead and leave this out. */
  payment?: PaymentFieldsProps;
  /** The place-order Button (type="submit" when onSubmit is given) and any note under it, at the end of the form. */
  submitAction?: React.ReactNode;
  /** Wraps the form and the summary in a form element with this submit handler. Without it they sit in a div, and submitAction handles its own click. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  /** The money breakdown, spread into an OrderSummary under the lines. Pass the figures your checkout computed. */
  summary: OrderSummaryProps;
  /** The items being bought, each a CartLine rendered readOnly at size sm. */
  lines?: CheckoutLine[];
  /** ISO 4217 currency code for the lines, the delivery prices and the disclosure's total. @default summary.currency, then "USD" */
  currency?: string;
  /** BCP 47 locale for every price. @default summary.locale */
  locale?: string;
  /** Width in CSS pixels of the block itself (not the viewport) under which the summary moves to the top as a disclosure. Measured with ResizeObserver. @default 768 */
  collapseBelow?: number;
  /** The disclosure's text while the summary is folded. The total follows it. @default "Show order summary" */
  showSummaryLabel?: string;
  /** The disclosure's text while the summary is open. @default "Hide order summary" */
  hideSummaryLabel?: string;
  /** The title's heading level; the summary's heading is one below. @default 1 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Padding above and below, passed to Section: `sm`, `md`, `lg`, `xl` or `none`, from the module padding steps; `default` is `md` and `compact` is `sm`. @default "default" */
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "default" | "compact";
  /** Padding above, when it differs from `spacing`. */
  spacingTop?: "none" | "sm" | "md" | "lg" | "xl";
  /** Padding below, when it differs from `spacing`. */
  spacingBottom?: "none" | "sm" | "md" | "lg" | "xl";
  /** `full` spans the screen; `inset` sets the band in from the page edges with the container radius. Passed to Section. @default "full" */
  bleed?: "full" | "inset";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function CheckoutBlock(props: CheckoutBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-layout-inline-section` | semantic | `var(--dt-dim-12)` |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-layout-scale` | semantic | `1` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-size-media-min` | semantic | `var(--dt-dim-64)` |
| `--dt-size-touch-target` | semantic | `var(--dt-dim-11)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-surface-subtle` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-artboard-body-line` | semantic | `calc(var(--dt-line-height-md) * 2.35)` |
| `--dt-text-artboard-body-size` | semantic | `calc(var(--dt-font-size-md) * 2.5)` |
| `--dt-text-artboard-display-family` | semantic | `var(--dt-text-display-lg-family)` |
| `--dt-text-artboard-display-line` | semantic | `calc(var(--dt-line-height-7xl) * 2.55)` |
| `--dt-text-artboard-display-size` | semantic | `calc(var(--dt-font-size-7xl) * 2.8)` |
| `--dt-text-artboard-display-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-artboard-display-weight` | semantic | `var(--dt-text-display-lg-weight)` |
| `--dt-text-artboard-meta-size` | semantic | `calc(var(--dt-font-size-sm) * 2.2)` |
| `--dt-text-artboard-meta-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-artboard-title-line` | semantic | `calc(var(--dt-line-height-7xl) * 1.7)` |
| `--dt-text-artboard-title-size` | semantic | `calc(var(--dt-font-size-7xl) * 1.75)` |
| `--dt-text-body-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-lg-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-lg-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-body-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-brand-secondary` | semantic | `var(--dt-color-secondary-700)` |
| `--dt-text-code-md-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-code-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-code-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-code-sm-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-code-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-code-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-display-2xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-2xl-line` | semantic | `var(--dt-line-height-fluid)` |
| `--dt-text-display-2xl-size` | semantic | `var(--dt-font-size-fluid-2xl)` |
| `--dt-text-display-2xl-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-2xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-lg-line` | semantic | `var(--dt-line-height-7xl)` |
| `--dt-text-display-lg-size` | semantic | `var(--dt-font-size-7xl)` |
| `--dt-text-display-lg-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-md-line` | semantic | `var(--dt-line-height-6xl)` |
| `--dt-text-display-md-size` | semantic | `var(--dt-font-size-6xl)` |
| `--dt-text-display-md-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-xl-line` | semantic | `var(--dt-line-height-fluid)` |
| `--dt-text-display-xl-size` | semantic | `var(--dt-font-size-fluid-xl)` |
| `--dt-text-display-xl-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xl-line` | semantic | `var(--dt-line-height-4xl)` |
| `--dt-text-heading-xl-size` | semantic | `var(--dt-font-size-4xl)` |
| `--dt-text-heading-xl-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-heading-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-link-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-link-brand-hover` | semantic | `var(--dt-color-primary-800)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-link-visited` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-on-action-ghost` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-secondary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-secondary-muted` | semantic | `var(--dt-color-secondary-900)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-info` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-on-scrim-strong` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-selected-brand` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-text-wordmark` | semantic | `var(--dt-text-primary)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Stack } from "../primitives/Stack.jsx";
import { Input } from "../forms/Input.jsx";
import { RadioGroup } from "../forms/RadioGroup.jsx";
import { AddressFields } from "../commerce/AddressFields.jsx";
import { PaymentFields } from "../commerce/PaymentFields.jsx";
import { OrderSummary } from "../commerce/OrderSummary.jsx";
import { CartLine } from "../commerce/CartLine.jsx";
import { Price } from "../commerce/Price.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

const SUMMARY = "calc(var(--dt-size-media-min) * 1.5)";
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* A fieldset whose legend is set like AddressFields' and PaymentFields', so
   the four steps of the form read as one list of headings. */
const fieldset = { border: 0, margin: 0, padding: 0, minWidth: 0 };
const legend = { ...role("heading-xs"), padding: 0, marginBlockEnd: "var(--dt-space-stack-md)", color: "var(--dt-text-primary)" };

/* The block's own width, not the viewport's, so it acts as a container
   query. False while server rendering and until the first measurement, so
   the server's markup and the first client render match. */
function useNarrow(ref, below) {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setNarrow(el.getBoundingClientRect().width < below);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, below]);
  return narrow;
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        display: "block", flex: "none", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)",
        transform: open ? "rotate(180deg)" : "none", transition: "transform var(--dt-motion-micro)",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* One-page checkout. The form (contact, address, delivery, payment and the
   place-order action) on the left; the order on the right, sticky. When the
   block is narrower than collapseBelow the order moves to the top, folded
   into a "Show order summary · total" disclosure, the usual phone pattern.
   The block validates and adds up nothing: every value and figure is the
   consumer's. */
export function CheckoutBlock({
  eyebrow,
  title = "Checkout",
  lead,
  email = "",
  onEmailChange,
  emailLabel = "Email",
  emailHint,
  contactLegend = "Contact",
  address,
  deliveryOptions = [],
  delivery,
  onDeliveryChange,
  deliveryLegend = "Delivery",
  payment,
  submitAction,
  onSubmit,
  summary,
  lines = [],
  currency,
  locale,
  collapseBelow = 768,
  showSummaryLabel = "Show order summary",
  hideSummaryLabel = "Hide order summary",
  level = 1,
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const uid = React.useId();
  const panelId = `${uid}-summary`;
  const box = React.useRef(null);
  const narrow = useNarrow(box, collapseBelow);
  const [open, setOpen] = React.useState(false);
  const money = { currency: currency || (summary && summary.currency), locale: locale || (summary && summary.locale) };
  const s = summary || { lines: [], total: { amount: 0 } };

  const items = lines.length > 0 && (
    <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)" }}>
      {lines.map(({ id, ...line }, i) => (
        <li key={id != null ? id : i}><CartLine readOnly size="sm" {...money} {...line} /></li>
      ))}
    </ul>
  );
  /* The read-only lines, then the figures. The panel around them is the
     column's (or the disclosure's), so the summary drops its own frame. */
  const panel = (
    <>
      {items}
      <OrderSummary
        headingLevel={level + 1 > 6 ? 6 : level + 1}
        {...money}
        {...s}
        style={{
          padding: 0, border: 0, borderRadius: 0, background: "transparent",
          paddingBlockStart: items ? "var(--dt-space-stack-md)" : 0,
          borderBlockStart: items ? "var(--dt-border-width-default) solid var(--dt-border-subtle)" : 0,
          ...(s.style || {}),
        }}
      />
    </>
  );

  const form = (
    <Stack layer="block" style={{ minWidth: 0 }}>
      <fieldset style={fieldset}>
        <legend style={legend}>{contactLegend}</legend>
        <Input
          type="email"
          label={emailLabel}
          hint={emailHint}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          value={email}
          onChange={(ev) => { if (onEmailChange) onEmailChange(ev.target.value); }}
        />
      </fieldset>

      {address && <AddressFields {...address} />}

      {deliveryOptions.length > 0 && (
        <fieldset style={fieldset}>
          <legend style={legend}>{deliveryLegend}</legend>
          <RadioGroup
            name={`${uid}-delivery`}
            value={delivery}
            onChange={onDeliveryChange}
            options={deliveryOptions.map((o) => ({
              value: o.id,
              hint: o.detail,
              label: (
                <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", columnGap: "var(--dt-space-inline-xs)" }}>
                  <span>{o.label}</span>
                  {typeof o.price === "number" && <Price amount={o.price} size="sm" {...money} />}
                </span>
              ),
            }))}
          />
        </fieldset>
      )}

      {payment && <PaymentFields {...payment} />}

      {submitAction && <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)" }}>{submitAction}</div>}
    </Stack>
  );

  const Tag = onSubmit ? "form" : "div";
  const formProps = onSubmit ? { onSubmit } : {};

  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div ref={box} style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} level={level} />}

        {narrow && (
          <div
            style={{
              border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
              borderRadius: "var(--dt-radius-container)",
              background: "var(--dt-surface-subtle)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "var(--dt-space-inline-sm)", padding: "var(--dt-space-inset-md)",
                minHeight: "var(--dt-size-touch-target)", boxSizing: "border-box",
                appearance: "none", border: 0, background: "transparent", cursor: "pointer", textAlign: "start",
                color: "var(--dt-text-link)", ...role("label-md"),
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
                {open ? hideSummaryLabel : showSummaryLabel}
                <Chevron open={open} />
              </span>
              <span style={{ color: "var(--dt-text-primary)", flex: "none" }}>
                <Price amount={s.total ? s.total.amount : 0} size="md" {...money} />
              </span>
            </button>
            <div
              id={panelId}
              hidden={!open}
              style={{ display: open ? "flex" : "none", flexDirection: "column", gap: "var(--dt-space-stack-md)", padding: "0 var(--dt-space-inset-md) var(--dt-space-inset-md)" }}
            >
              {panel}
            </div>
          </div>
        )}

        <Tag {...formProps} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: scaled("--dt-layout-inline-section") }}>
          <div style={{ flex: "999 1 0", minWidth: `min(100%, calc(${SUMMARY} * 1.25))` }}>{form}</div>
          {!narrow && (
            <div style={{ flex: `1 1 ${SUMMARY}`, minWidth: 0, position: "sticky", insetBlockStart: "var(--dt-space-stack-lg)" }}>
              <div
                style={{
                  display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)",
                  padding: "var(--dt-space-inset-md)", boxSizing: "border-box",
                  background: "var(--dt-surface-subtle)",
                  border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
                  borderRadius: "var(--dt-radius-container)",
                }}
              >
                {panel}
              </div>
            </div>
          )}
        </Tag>
      </div>
    </Section>
  );
}
```
