import * as React from "react";

/** Placeholder for a view with no content yet, no results, or no access. */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What is empty, in sentence case. */
  title: React.ReactNode;
  /** Why it is empty and what to do next. */
  description?: React.ReactNode;
  /** Lucide icon element, sized from --dt-size-icon-*. */
  icon?: React.ReactNode;
  /** Primary action — usually the thing that fills the empty space. */
  action?: React.ReactNode;
  /** Optional secondary action, e.g. "Learn more". */
  secondaryAction?: React.ReactNode;
  /** @default "md" */
  size?: "sm" | "md";
}

export declare function EmptyState(props: EmptyStateProps): JSX.Element;
