import * as React from "react";

/** Transient confirmation or failure notice. */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "neutral" */
  tone?: "neutral" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** One action, usually Undo. */
  action?: React.ReactNode;
  onDismiss?: () => void;
  /** @default "Dismiss" */
  dismissLabel?: string;
}

/** Fixed container that stacks toasts in a corner. */
export interface ToastRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** @default "bottom-right" */
  placement?: "bottom-right" | "bottom-left" | "top-right" | "top-center";
  /** @default "Notifications" */
  label?: string;
}

export declare function Toast(props: ToastProps): JSX.Element;
export declare function ToastRegion(props: ToastRegionProps): JSX.Element;
