import * as React from "react";

/**
 * The frame of a phone app: a top bar, a body that scrolls, and a bottom
 * navigation, with the device's safe areas honoured on every side.
 */
export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title in the default top bar, set in the heading-xs role and the headline colour. */
  title?: React.ReactNode;
  /** Left slot of the default top bar: a back button, an avatar. */
  leading?: React.ReactNode;
  /** Right slot of the default top bar: one or two IconButtons. */
  trailing?: React.ReactNode;
  /** Replaces the default top bar entirely. Pass null for no top bar. */
  header?: React.ReactNode;
  /** Usually a BottomNav. Sticky to the bottom of whatever scrolls. */
  bottomNav?: React.ReactNode;
  /** A layer behind everything that does not scroll: a photograph, a gradient, an illustration. */
  backdrop?: React.ReactNode;
  /**
   * page: the document scrolls and the shell is at least the screen's height,
   * the right choice for a real app so the browser's own bars collapse.
   * contained: the shell fills its parent and scrolls itself, for a device
   * frame, a dialog or a docs card. @default "page"
   */
  scroll?: "page" | "contained";
  /** phone centres the shell at --dt-appshell-max-width on a wide screen. @default "full" */
  width?: "full" | "phone";
  /** Glass bars that content scrolls beneath. Off gives solid bars. @default true */
  translucent?: boolean;
  /** Scopes dark mode to the app, whatever the page is doing. */
  dark?: boolean;
  children?: React.ReactNode;
}

export declare function AppShell(props: AppShellProps): JSX.Element;
