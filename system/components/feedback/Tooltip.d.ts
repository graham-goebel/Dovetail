import * as React from "react";

/** Short label revealed on hover or focus. */
export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tooltip text. Keep it to a few words. */
  content: React.ReactNode;
  /** The trigger. Must be focusable. */
  children: React.ReactNode;
  /** @default "top" */
  placement?: "top" | "bottom" | "left" | "right";
  /** Hover delay in ms. @default 200 */
  delay?: number;
}

export declare function Tooltip(props: TooltipProps): JSX.Element;
