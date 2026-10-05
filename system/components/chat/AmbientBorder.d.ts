import * as React from "react";

/** Who has the floor in a voice conversation. */
export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

/**
 * An ambient border: a gradient that turns around its container and answers
 * to a voice conversation. The state picks the colours (the person's brand
 * colour while listening, the secondary brand colour while the assistant
 * speaks, both with the info hue while thinking); the voice's level brightens
 * the glow and quickens the turn. With reduced motion the ring stands still.
 */
export interface AmbientBorderProps extends React.HTMLAttributes<HTMLElement> {
  /** idle: a slow, quiet turn. listening: the person's voice. thinking: two comets chase round a faint track. speaking: the assistant's voice. error: danger colours, still. @default "idle" */
  state?: VoiceState;
  /** The voice's loudness, 0 to 1, from your own meter. Wins over the streams. Leave it out, with no stream, and listening and speaking follow a gentle synthesised level. */
  level?: number;
  /** The person's microphone. Read while listening, by analysing the stream, never playing it. */
  inputStream?: MediaStream | null;
  /** The assistant's voice, such as a WebRTC remote stream. Read while speaking. */
  outputStream?: MediaStream | null;
  /** The corner, from the radius tokens. @default "container" */
  radius?: "none" | "control" | "container" | "overlay" | "pill";
  /** thin (--dt-voice-ring-width) around a module, thick (--dt-voice-ring-width-thick) around a screen. @default "thin" */
  thickness?: "thin" | "thick";
  /** What fills the ring: raised (--dt-voice-surface), base, sunken, or none to let the page and the glow show through. @default "raised" */
  surface?: "raised" | "base" | "sunken" | "none";
  /** The blurred halo behind the ring that answers to the level. @default true */
  glow?: boolean;
  /** The element to render. @default "div" */
  as?: keyof React.JSX.IntrinsicElements;
  /** Styles for the inner surface, inside the ring. */
  contentStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

export declare function AmbientBorder(props: AmbientBorderProps): React.JSX.Element;
