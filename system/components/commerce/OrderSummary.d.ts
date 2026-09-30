import * as React from "react";

/** One row of the money breakdown. */
export interface OrderSummaryLine {
  /** What the amount is: "Subtotal", "Shipping", "Discount (SUMMER10)". */
  label: string;
  /** Amount in major units. A discount shows as negative whatever its sign; 0 shows as "Free". */
  amount: number;
  /** discount shows the amount as a negative in the discount colour; muted is for estimates and pending figures. @default "default" */
  kind?: "default" | "discount" | "muted";
  /** A smaller line under the label: "Standard, 3–5 days", "Calculated at next step". */
  hint?: string;
}

/** The money breakdown of a cart or checkout: lines, a total, an optional free-shipping bar and a footer for actions. */
export interface OrderSummaryProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  /** The rows above the total, in order. Pass what your cart computed; nothing is added up here. */
  lines: OrderSummaryLine[];
  /** The total, emphasised under a rule. */
  total: {
    /** @default "Total" */
    label?: string;
    /** Amount in major units. */
    amount: number;
  };
  /** ISO 4217 currency code. @default "USD" */
  currency?: string;
  /** BCP 47 locale. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Under the total: the checkout Button, a PromoCode, trust copy. */
  footer?: React.ReactNode;
  /** Heading of the panel, also its accessible name. @default "Order summary" */
  title?: string;
  /** Level of the title's heading element. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Shows a progress bar and "You're $12.00 away from free shipping", or "You've got free shipping" once current reaches threshold. */
  freeShippingProgress?: {
    /** The amount that counts toward the threshold, usually the subtotal. */
    current: number;
    /** The amount that unlocks free shipping. */
    threshold: number;
  };
}

export declare function OrderSummary(props: OrderSummaryProps): React.JSX.Element;
