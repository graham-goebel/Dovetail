import * as React from "react";

/** Flexible or fixed empty space inside a flex container. */
export interface SpacerProps extends React.HTMLAttributes<HTMLElement> {
  /** Fixed size from the space scale. Omit to absorb all remaining space. */
  size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** @default "vertical" */
  axis?: "vertical" | "horizontal";
}

export declare function Spacer(props: SpacerProps): JSX.Element;
