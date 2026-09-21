import * as React from "react";

/** Readable long-form text container with a measure cap. */
export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Body role applied to the text. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Maximum line length. @default "68ch" */
  measure?: string;
}

export declare function Prose(props: ProseProps): JSX.Element;
