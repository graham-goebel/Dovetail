import * as React from "react";

export type ThinkingState = "connecting" | "listening" | "thinking" | "searching" | "speaking";

/**
 * An assistant's loading and thinking states, as a fluid animation that
 * reads the system's tokens. One component, two placements: inline beside a
 * chat message, or as a full-screen overlay for voice.
 */
export interface ThinkingProps extends Omit<React.HTMLAttributes<HTMLElement>, "color"> {
  /**
   * connecting: gathering, before a session is live. listening: follows the
   * person's voice. thinking: a merging swirl while a reply is prepared.
   * searching: an orbit, while tools or sources are consulted. speaking:
   * pulses with the reply. @default "thinking"
   */
  state?: ThinkingState;
  /** inline sits in a line of text; overlay covers the screen for a voice session. @default "inline" */
  mode?: "inline" | "overlay";
  /**
   * blob: free fluid. orb and tile: fluid inside a well, tile rounded by
   * --dt-radius-container. dots: the chat convention. bars: the voice
   * convention. @default "blob"
   */
  shape?: "blob" | "orb" | "tile" | "dots" | "bars";
  /** Which gradient the fluid sweeps. brand reads --dt-thinking-color-start and -end. @default "brand" */
  tone?: "brand" | "primary" | "secondary" | "duotone" | "neutral";
  /** Two CSS colours, start and end, overriding tone. Token references work: ["var(--dt-color-green-400)", "var(--dt-color-green-700)"]. */
  colors?: [string, string];
  /** sm is the inline icon size, xl the overlay size; or any CSS length. @default "sm" inline, "xl" overlay */
  size?: "sm" | "md" | "lg" | "xl" | string;
  /** Multiplies the pace set by --dt-thinking-duration. @default 1 */
  speed?: number;
  /** How far the fluid is allowed to travel and deform, 0 to 1. @default 0.6 */
  intensity?: number;
  /**
   * A live level from 0 to 1, a microphone's or the reply's amplitude. Drives
   * listening and speaking; omit it and they follow a built-in rhythm.
   */
  level?: number;
  /** Announced to assistive technology, and shown unless showLabel is false. Defaults to the state's name. */
  label?: string;
  /** Inline only: show the label beside the animation. It is announced either way. @default true */
  showLabel?: boolean;
  /** Overlay only: adds a close button and closes on Escape. */
  onDismiss?: () => void;
  /** Overlay: a caption or live transcript under the label. Inline: content after the label. */
  children?: React.ReactNode;
}

export declare function Thinking(props: ThinkingProps): JSX.Element;
