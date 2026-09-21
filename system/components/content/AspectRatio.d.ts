import * as React from "react";

/** Reserves a fixed proportion of space before its content loads, so media never shifts the layout. */
export interface AspectRatioProps extends React.HTMLAttributes<HTMLElement> {
  /** Named ratio from the system scale, or a raw width/height number. @default "16:9" */
  ratio?: "square" | "4:3" | "3:2" | "16:9" | "21:9" | "3:4" | "9:16" | number;
  /** Element to render. @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function AspectRatio(props: AspectRatioProps): JSX.Element;
