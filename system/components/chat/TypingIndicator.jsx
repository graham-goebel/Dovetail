import React from "react";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Someone is writing a reply: three dots in a received bubble. Show it while
   the app knows the other side is typing, and remove it when their message
   arrives. For an assistant working on an answer, Thinking says more.

   The dots are animated with the Web Animations API from an effect, paced by
   --dt-typing-beat, because inline styles cannot declare keyframes. Under
   prefers-reduced-motion they hold still. */

const REDUCE = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(REDUCE);
    const sync = () => setReduced(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else mq.addListener(sync);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", sync) : mq.removeListener(sync));
  }, []);
  return reduced;
}

/* One beat, in milliseconds, and its easing, read from the token on the
   element so a theme or context that retunes the motion role is honoured. */
function readBeat(node) {
  const raw = getComputedStyle(node).getPropertyValue("--dt-typing-beat").trim();
  const m = raw.match(/^(-?[\d.]+)(ms|s)\b\s*(.*)$/);
  if (!m) return { ms: 0, easing: "linear" };
  return { ms: parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1), easing: m[3] || "linear" };
}

export function TypingIndicator({ name, style, ...rest }) {
  const dots = React.useRef(null);
  const reduced = useReducedMotion();
  const message = name ? `${name} is typing` : "Typing";

  /* The live region mounts empty and is filled a moment later, so a screen
     reader announces the text once instead of missing a region that arrived
     already full. */
  const [spoken, setSpoken] = React.useState("");
  React.useEffect(() => {
    setSpoken(message);
  }, [message]);

  React.useEffect(() => {
    const box = dots.current;
    if (reduced || !box || typeof box.animate !== "function") return undefined;
    const { ms, easing } = readBeat(box);
    if (!ms) return undefined;
    /* Each dot rises over two beats and rests for two, a beat after the one
       before it, so the three read as a wave. */
    const running = Array.from(box.children).map((dot, i) =>
      dot.animate(
        [
          { opacity: 0.4, transform: "scale(0.75)" },
          { opacity: 1, transform: "scale(1)", offset: 0.25 },
          { opacity: 0.4, transform: "scale(0.75)", offset: 0.5 },
          { opacity: 0.4, transform: "scale(0.75)" },
        ],
        { duration: ms * 4, delay: ms * i, iterations: Infinity, easing },
      ),
    );
    return () => running.forEach((a) => a.cancel());
  }, [reduced]);

  const dot = {
    display: "block", flex: "none",
    width: "var(--dt-typing-dot-size)", height: "var(--dt-typing-dot-size)",
    borderRadius: "var(--dt-radius-pill)", background: "var(--dt-typing-dot)",
    opacity: reduced ? 0.7 : 0.4,
  };

  return (
    <div
      aria-live="polite"
      style={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--dt-space-inline-xs)",
        marginTop: "var(--dt-bubble-run-gap)",
        ...style,
      }}
      {...rest}
    >
      <div aria-hidden="true" ref={dots} style={{
        display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)",
        padding: "var(--dt-bubble-padding)",
        /* The height of one line of bubble text, so the indicator is the same
           height as the one-line reply that replaces it. */
        minHeight: "calc(var(--dt-text-body-sm-line) + var(--dt-space-inset-xs) * 2)",
        borderRadius: "var(--dt-bubble-radius)",
        background: "var(--dt-bubble-received-bg)",
      }}>
        <span style={dot} />
        <span style={dot} />
        <span style={dot} />
      </div>
      {name && (
        <span aria-hidden="true" style={{
          fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
          lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-bubble-meta-fg)",
        }}>{message}</span>
      )}
      <VisuallyHidden>{spoken}</VisuallyHidden>
    </div>
  );
}
