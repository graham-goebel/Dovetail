import * as React from "react";
import type { VoiceState, VoiceTone } from "./AmbientBorder";

/**
 * Voice input for a conversation, at the size of a module: a bar where a
 * composer would sit, or a panel that holds the exchange. Controlled: the app
 * owns the microphone, the recognition and the reply, and passes the state.
 * An ambient border turns in the person's colour while they speak and the
 * assistant's while it answers, following the voice's level.
 */
export interface VoiceInputProps extends React.HTMLAttributes<HTMLElement> {
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
  /** The assistant's reply, shown while it thinks and speaks. */
  response?: string;
  /** Shown when nothing has been said yet. @default "Press the microphone and speak" */
  placeholder?: string;
  /** Who replies, before their words in the panel. @default "Assistant" */
  assistantName?: string;
  /** bar: one line, pill-shaped, where a composer sits. panel: the exchange in a card, with a large microphone. @default "bar" */
  layout?: "bar" | "panel";
  /** The group's accessible name. @default "Voice input" */
  label?: string;
  /** The microphone button: start listening, or stop. Its pressed state follows listening. */
  onToggle?: () => void;
  /** Shows an End button while the conversation isn't idle. */
  onEnd?: () => void;
  /** Turns the buttons off. @default false */
  disabled?: boolean;
}

export declare function VoiceInput(props: VoiceInputProps): React.JSX.Element;
