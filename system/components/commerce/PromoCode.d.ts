import * as React from "react";

/** A promo or gift code field with an Apply button, a disclosure to reveal it, and a removable chip once a code is applied. */
export interface PromoCodeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "children"> {
  /** What is typed in the field. Controlled. */
  value: string;
  /** Called with the field's new text. */
  onChange: (value: string) => void;
  /** Called with the trimmed code when Apply is pressed or Enter is pressed in the field. Not called when the field is empty or loading. */
  onApply: (code: string) => void;
  /** The code in effect. Replaces the field with a chip showing the code and its description. */
  applied?: {
    /** The code as the customer should see it, e.g. "SUMMER10". */
    code: string;
    /** What it does: "10% off", "Free shipping". */
    description?: string;
  };
  /** Removes the applied code. Adds a remove button, named "Remove code SUMMER10", to the chip; focus moves to the field afterwards. */
  onRemove?: () => void;
  /** Why the code was not accepted. Shows under the field, which stays open while it is set. */
  error?: string;
  /** Checking the code: the Apply button shows a spinner and Apply does nothing until it clears. @default false */
  loading?: boolean;
  /** The field's visible label. @default "Promo code" */
  label?: string;
  /** Starts as a "Have a promo code?" disclosure button that reveals the field. false shows the field at once. @default true */
  collapsible?: boolean;
  /** Text of the disclosure button. @default "Have a promo code?" */
  toggleLabel?: string;
  /** Text of the apply button. @default "Apply" */
  applyLabel?: string;
  /** id of the text field. Generated when omitted. */
  id?: string;
}

export declare function PromoCode(props: PromoCodeProps): React.JSX.Element;
