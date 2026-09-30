import * as React from "react";
import type { CartLineProps } from "../commerce/CartLine";
import type { OrderSummaryProps } from "../commerce/OrderSummary";
import type { PromoCodeProps } from "../commerce/PromoCode";

/** One line in a CartBlock: CartLine's props, plus a stable id. */
export interface CartBlockLine extends CartLineProps {
  /** A stable, unique id, such as the cart line's id. It is the React key and is not rendered. */
  id: string;
}

/** The cart page: the lines beside an order summary with the checkout action, or an empty state. */
export interface CartBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. @default "Your cart" */
  title?: React.ReactNode;
  /** A line under the title, e.g. "3 items". */
  lead?: React.ReactNode;
  /** Beside the header, at its end: a "Continue shopping" Link. */
  action?: React.ReactNode;
  /** The lines, each spread into a CartLine with a divider. Pass lineTotal, onQuantityChange and onRemove from your cart. */
  lines: CartBlockLine[];
  /**
   * The money breakdown, spread into an OrderSummary to the right of the lines on a wide screen
   * (sticky) and under them on a narrow one. Pass the figures your cart computed: nothing is added
   * up here. Its footer goes after the promo field and the checkout action.
   */
  summary: OrderSummaryProps;
  /** The checkout Button or link, in the summary's footer. */
  checkoutAction?: React.ReactNode;
  /** Adds a PromoCode to the summary's footer, above the checkout action. */
  promo?: PromoCodeProps;
  /** Shown instead of the lines and summary when lines is empty. @default an EmptyState, "Your cart is empty" */
  emptyState?: React.ReactNode;
  /** The title's heading level; the summary's heading is one below. @default 1 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function CartBlock(props: CartBlockProps): React.JSX.Element;
