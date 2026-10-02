import * as React from "react";

/** Transient confirmation or failure notice. */
export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** @default "neutral" */
  tone?: "neutral" | "success" | "warning" | "danger";
  /** "glass" lets what's behind show through, blurred (--dt-surface-glass with --dt-backdrop-glass); "glass-strong" lets less through. Use over a picture or a busy screen. @default "raised" */
  surface?: "raised" | "glass" | "glass-strong";
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

export declare function Toast(props: ToastProps): React.JSX.Element;
export declare function ToastRegion(props: ToastRegionProps): React.JSX.Element;
