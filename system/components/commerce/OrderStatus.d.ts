import * as React from "react";

/** One stage of an order or delivery. */
export interface OrderStatusStep {
  /** Unique id, matched against current. */
  id: string;
  /** The stage: "Ordered", "Shipped", "Out for delivery", "Delivered". */
  label: string;
  /** When it happened or is expected, as display text: "Sep 28, 10:42", "Expected Oct 2". */
  time?: string;
  /** A line of detail: "Left the Leeds depot". */
  description?: string;
}

/** A timeline of an order's progress: completed steps with checks, the current step, and the ones to come. */
export interface OrderStatusProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The stages, in order. */
  steps: OrderStatusStep[];
  /** id of the step the order is at. Steps before it show as completed, after it as upcoming. */
  current: string;
  /** delayed and cancelled change the current step's colour and icon and add a badge saying so. @default "active" */
  status?: "active" | "delayed" | "cancelled";
  /** horizontal turns vertical by itself when its box is narrower than every step's least width side by side. @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Accessible name of the list, e.g. "Order 1042 progress". */
  label: string;
  /** Replaces the badge text for a delayed or cancelled order. @default "Delayed" or "Cancelled" */
  statusText?: string;
}

export declare function OrderStatus(props: OrderStatusProps): React.JSX.Element;
