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
