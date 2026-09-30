import * as React from "react";

/** One way to receive the order. */
export interface FulfilmentOption {
  /** The value reported to onChange. Unique within the toggle. */
  value: string;
  /** The segment's label: "Delivery", "Pickup", "Dine in". */
  label: string;
  /** A short second line under the label: "25–35 min", "Ready in 15". */
  detail?: string;
}

/** Delivery or pickup: a segmented control with radio semantics, full width by default. */
export interface FulfilmentToggleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "role" | "children" | "defaultValue"> {
  /** The chosen option's value. Controlled. With the default options, "delivery" or "pickup". */
  value: "delivery" | "pickup" | (string & {});
  /** Called with the newly chosen value, from a click or an arrow key. */
  onChange: (value: string) => void;
  /** The radio group's accessible name, e.g. "How to get your order". */
  label: string;
  /** The segments. @default [{ value: "delivery", label: "Delivery" }, { value: "pickup", label: "Pickup" }] */
  options?: FulfilmentOption[];
  /** Fill the container's width. false sizes it to its segments. @default true */
  fullWidth?: boolean;
  /** Disables every segment. */
  disabled?: boolean;
}

export declare function FulfilmentToggle(props: FulfilmentToggleProps): React.JSX.Element;
