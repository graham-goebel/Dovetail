import * as React from "react";

/** Where a message is written. Enter sends, Shift+Enter adds a line; the field grows up to `maxRows`, then scrolls. */
export interface ComposerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The text. Controlled. */
  value: string;
  /** Called with the new text on every edit. */
  onChange: (next: string) => void;
  /** Called with the trimmed text on Enter or the send button; clear `value` here. Never called while the text is empty or only whitespace. */
  onSend: (text: string) => void;
  /** Accessible name of the text field, e.g. "Message Maya". Required: a placeholder is not a label. */
  label: string;
  /** Hint shown while the field is empty. */
  placeholder?: string;
  /** Disables the field and both buttons. @default false */
  disabled?: boolean;
  /** Shows an attach button, labelled "Attach a file", before the field. */
  onAttach?: () => void;
  /** Lines the field grows to before it scrolls. @default 6 */
  maxRows?: number;
}

export declare function Composer(props: ComposerProps): React.JSX.Element;
