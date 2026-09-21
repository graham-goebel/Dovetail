import * as React from "react";

/** Pull quote or testimonial with attribution. */
export interface QuoteProps extends React.HTMLAttributes<HTMLElement> {
  /** The quoted text, without quotation marks. */
  children?: React.ReactNode;
  /** Who said it. */
  attribution?: React.ReactNode;
  /** Their title or company. */
  role?: React.ReactNode;
  /** Avatar element for the speaker. */
  avatar?: React.ReactNode;
  /** @default "md" */
  size?: "md" | "lg";
}

export declare function Quote(props: QuoteProps): JSX.Element;
