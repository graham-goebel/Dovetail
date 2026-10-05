import * as React from "react";
import type { VoiceState, VoiceTone } from "./AmbientBorder";

/**
 * A voice conversation over the whole screen: the ambient border runs round
 * the screen's edge and glows inward, the exchange is set large in the
 * middle, and the microphone and End sit at the foot. Modal, as Dialog is:
 * focus moves in, Tab stays inside, Escape ends it, the page stops
 * scrolling, and focus goes back where it came from.
 */
export interface VoiceOverlayProps extends React.HTMLAttributes<HTMLElement> {
  /** Whether it is showing. */
  open: boolean;
  /** Ends the conversation: the End button and Escape. */
  onClose?: () => void;
  /** Where the conversation is: idle, listening, thinking, speaking or error. @default "idle" */
  state?: VoiceState;
  /**
   * brand: each state in its own colours, the person in the brand colour and
   * the assistant in the secondary brand colour. spectrum: a six-hue wheel
   * (--dt-voice-spectrum-1 to -6) for every state but error, which stays
   * danger; the state still sets the speed, the glow and the comets.
   * @default "brand"
   */
  tone?: VoiceTone;
  /** The voice's loudness, 0 to 1, from your own meter. Wins over the streams. */
  level?: number;
  /** The person's microphone, read while listening. */
  inputStream?: MediaStream | null;
  /** The assistant's voice, read while speaking. */
  outputStream?: MediaStream | null;
  /** What the person is saying, or said last. */
  transcript?: string;
  /** The assistant's reply. */
  response?: string;
  /** Shown large when nothing has been said yet. @default "Go ahead, I'm listening" */
  placeholder?: string;
  /** Who replies, before their words while the person speaks over them. @default "Assistant" */
  assistantName?: string;
  /** The dialog's accessible name. @default "Voice conversation" */
  label?: string;
  /** The End button's accessible name. @default "End conversation" */
  closeLabel?: string;
  /** The microphone button: start listening, or stop. */
  onToggle?: () => void;
  /** Scopes dark mode to the overlay, so it reads the same over any page. @default true */
  dark?: boolean;
  /** Shown above the words, such as an avatar or a Thinking figure. */
  children?: React.ReactNode;
}

export declare function VoiceOverlay(props: VoiceOverlayProps): React.JSX.Element | null;
