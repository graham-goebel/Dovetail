import * as React from "react";

/** Full-width message pinned to the top of a page or region. */
export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "info" */
  tone?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  /** Body copy. */
  children?: React.ReactNode;
  /** Lucide icon. */
  icon?: React.ReactNode;
  /** One trailing action, usually a ghost Button or Link. */
  action?: React.ReactNode;
  /** Renders a close button when supplied. */
  onDismiss?: () => void;
  /** @default "Dismiss" */
  dismissLabel?: string;
}

export declare function Banner(props: BannerProps): JSX.Element;
