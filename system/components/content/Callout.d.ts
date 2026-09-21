import * as React from "react";

/** Aside inside editorial content. */
export interface CalloutProps extends React.HTMLAttributes<HTMLElement> {
  /** @default "note" */
  tone?: "note" | "tip" | "important" | "caution";
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Lucide icon. */
  icon?: React.ReactNode;
}

export declare function Callout(props: CalloutProps): JSX.Element;
