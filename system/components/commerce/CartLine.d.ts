import * as React from "react";

/** One line in a cart, bag or order confirmation: thumbnail, name, variant details, quantity and price. */
export interface CartLineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The item's name. Also goes into the stepper's and the remove button's accessible names. */
  name: string;
  /** Link to the product page. The name becomes a link when given. */
  href?: string;
  /** Product thumbnail. With no src, a placeholder frame shows in its place. */
  image?: { src?: string; alt: string };
  /** Variant lines under the name, e.g. ["Size M", "Colour Sand"]. */
  details?: string[];
  /** Unit price in major units (24.5 for $24.50). */
  price: number;
  /** Original unit price. When greater than price, the price shows as a sale. */
  compareAt?: number;
  /** How many of the item are in the cart. */
  quantity: number;
  /** Called with the next quantity from the stepper, already clamped to 1 and maxQuantity. Not needed when readOnly. */
  onQuantityChange?: (next: number) => void;
  /** Removes the line. Shows a Remove button, and turns the stepper's minus into remove at 1. */
  onRemove?: () => void;
  /** ISO 4217 currency code for every price on the line. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the prices. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /**
   * Price for the whole line, as your cart computed it. Shown on the right when given, with the
   * unit price under the name; otherwise the unit price is shown on the right.
   */
  lineTotal?: number;
  /** Highest quantity the stepper allows, e.g. the stock left. No limit when omitted. */
  maxQuantity?: number;
  /** A short line under the details: "Only 2 left", "Ships in 3 days". */
  note?: React.ReactNode;
  /** Order confirmation: the quantity shows as "Qty 2" text and there are no controls. @default false */
  readOnly?: boolean;
  /** sm for drawers and mini carts (48px thumbnail), md for the cart page (64px). @default "md" */
  size?: "sm" | "md";
  /** Draws a rule under the line and pads it, for lines stacked in a list. @default false */
  divider?: boolean;
}

export declare function CartLine(props: CartLineProps): React.JSX.Element;
