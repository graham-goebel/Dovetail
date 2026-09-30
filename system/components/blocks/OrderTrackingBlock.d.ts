import * as React from "react";
import type { OrderStatusProps } from "../commerce/OrderStatus";
import type { CartLineProps } from "../commerce/CartLine";
import type { OrderSummaryProps } from "../commerce/OrderSummary";

/** The person bringing the order. */
export interface OrderTrackingCourier {
  /** Their first name, as the app shows it: "Sam". Also goes into the Call and Message buttons' names. */
  name: string;
  /** Their picture. Without src, Avatar shows the initials of name. */
  avatar?: { src?: string; name: string };
  /** How they travel, shown under the name: "Blue e-bike · KX12". */
  vehicle?: string;
  /** Shows a Call IconButton, named `Call ${name}`. */
  onCall?: () => void;
  /** Shows a Message IconButton, named `Message ${name}`. */
  onMessage?: () => void;
  /** Replaces the Call button's accessible name. @default `Call ${name}` */
  callLabel?: string;
  /** Replaces the Message button's accessible name. @default `Message ${name}` */
  messageLabel?: string;
}

/** After checkout: the ETA and progress, a map slot, the courier and the order, in two columns when there is room. */
export interface OrderTrackingBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The page's heading: "Your order is on its way". Announced politely when it changes. */
  title?: React.ReactNode;
  /** When it arrives, as display text: "Arriving 7:45–7:55 pm". Shown under the title and announced with it. */
  eta?: string;
  /** The progress timeline, passed to OrderStatus. Its label defaults to "Order progress". */
  status: Omit<OrderStatusProps, "label"> & { label?: string };
  /** Shows a card with the courier's Avatar, name, vehicle, and Message and Call buttons. */
  courier?: OrderTrackingCourier;
  /** A live map. The system ships none: without it the slot shows an illustrated street map with the courier along the route. */
  map?: React.ReactNode;
  /** The order's lines, shown read-only and compact (CartLine readOnly, size sm). */
  lines?: CartLineProps[];
  /** The money breakdown, passed to OrderSummary. Its headingLevel defaults to one below the title. */
  summary?: OrderSummaryProps;
  /** Under the order: a "Get help" Link, a cancel Button. */
  help?: React.ReactNode;
  /** Heading over the lines. @default "Your order" */
  orderTitle?: string;
  /** The small line over the courier's name. @default "Your courier" */
  courierLabel?: string;
  /** Level of the title's heading; the order's headings are one below. @default 1 */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
  /** ISO 4217 currency code for the lines and summary that do not set their own. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the lines and summary that do not set their own. Set it when server rendering. */
  locale?: string;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function OrderTrackingBlock(props: OrderTrackingBlockProps): React.JSX.Element;
