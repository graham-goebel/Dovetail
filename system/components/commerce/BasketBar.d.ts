import * as React from "react";

/** The floating "View basket · 3 items · $42.50" bar at the foot of a phone ordering screen. Renders nothing while the basket is empty. */
export interface BasketBarProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> {
  /** How many items are in the basket. At 0 (or below) the bar renders nothing. */
  count: number;
  /** What the basket comes to, in major units, as your basket computed it. Shown with Price. */
  total: number;
  /** ISO 4217 currency code for the total. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the total. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Opens the basket. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** The bar's words, and the start of its accessible name. @default "View basket" */
  label?: string;
  /** The count in words, for the accessible name. @default (n) => n === 1 ? "1 item" : `${n} items` */
  itemsLabel?: (count: number) => string;
  /** Turns the bar off, for a store that has just closed. */
  disabled?: boolean;
  /**
   * The bar is full width and has no position of its own. Place it with style: position "sticky" and
   * bottom inside a scrolling column, or "fixed" with inset, above a BottomNav.
   */
  style?: React.CSSProperties;
}

export declare function BasketBar(props: BasketBarProps): React.JSX.Element | null;
