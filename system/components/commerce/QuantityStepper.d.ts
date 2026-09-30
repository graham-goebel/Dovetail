import * as React from "react";

/** A − value + control for a quantity, for cart lines and menus. */
export interface QuantityStepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** The current quantity. The stepper is controlled: it shows this value and reports changes. */
  value: number;
  /** Called with the next quantity, already clamped to min and max and snapped to step. */
  onChange: (next: number) => void;
  /** The accessible name of the group and the value field, e.g. "Quantity" or "Quantity, oat latte". */
  label: string;
  /** Lowest value. The minus button stops here, or becomes a remove button when onRemove is given. @default 1 */
  min?: number;
  /** Highest value. No upper limit when omitted. */
  max?: number;
  /** Amount each press or arrow key adds or takes away. PageUp and PageDown move ten steps. @default 1 */
  step?: number;
  /** @default "md" */
  size?: "sm" | "md";
  /** Disables both buttons and the field. */
  disabled?: boolean;
  /** When given, the minus button becomes a remove button (trash icon) at min, and pressing it calls this. */
  onRemove?: () => void;
  /** Accessible name of the minus button. @default "Decrease quantity" */
  decreaseLabel?: string;
  /** Accessible name of the plus button. @default "Increase quantity" */
  increaseLabel?: string;
  /** Accessible name of the remove button, e.g. "Remove oat latte". @default "Remove" */
  removeLabel?: string;
  /** id of the value field, for an external label's htmlFor. Generated when omitted. */
  id?: string;
}

export declare function QuantityStepper(props: QuantityStepperProps): React.JSX.Element;
