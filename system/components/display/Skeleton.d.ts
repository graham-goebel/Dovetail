import * as React from "react";

/** Placeholder shape shown while content loads. */
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "text" */
  variant?: "text" | "rect" | "circle";
  width?: number | string;
  height?: number | string;
  /** Number of text lines. The last line is shortened. @default 1 */
  lines?: number;
  /** Override the variant's corner radius. */
  radius?: string;
}

export declare function Skeleton(props: SkeletonProps): JSX.Element;
