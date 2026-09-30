import React from "react";
import { Button } from "../actions/Button.jsx";

/* The scrolling log of a conversation. It stays pinned to the newest message
   as children arrive, unless the reader has scrolled up to read history; then
   it leaves them where they are and offers a jump back down. It never fetches
   or invents messages: the children are the conversation.

   Every DOM read happens in an effect, never during render, so the list
   server-renders as a plain log. */

/* How close to the bottom, in CSS pixels, still counts as at the bottom: a
   rounding allowance for fractional scroll positions, not a visual size. */
const SLACK = 8;

/* A layout effect in the browser, so a new message never paints one frame
   off the bottom; a plain effect on the server, where layout effects warn. */
const useIsoLayoutEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const DOWN = ["M12 4.5v15", "m6 13.5 6 6 6-6"];

export function MessageList({ label, children, style, ...rest }) {
  const scroller = React.useRef(null);
  const content = React.useRef(null);
  const pinned = React.useRef(true);
  const lastHeight = React.useRef(0);
  const [unseen, setUnseen] = React.useState(false);

  const toBottom = React.useCallback((smooth) => {
    const el = scroller.current;
    if (!el) return;
    const top = el.scrollHeight - el.clientHeight;
    if (smooth && el.scrollTo && !prefersReducedMotion()) el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
  }, []);

  /* Called whenever the content may have changed size: new children, an image
     that loaded, a bubble that grew. Pinned, follow it; scrolled up, say that
     something new is below. */
  const sync = React.useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const height = el.scrollHeight;
    const grew = height > lastHeight.current;
    lastHeight.current = height;
    if (pinned.current) toBottom(false);
    else if (grew) setUnseen(true);
  }, [toBottom]);

  useIsoLayoutEffect(() => {
    sync();
  }, [children, sync]);

  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !content.current) return undefined;
    const ro = new ResizeObserver(() => sync());
    ro.observe(content.current);
    return () => ro.disconnect();
  }, [sync]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SLACK;
    pinned.current = atBottom;
    if (atBottom && unseen) setUnseen(false);
    if (rest.onScroll) rest.onScroll(e);
  };

  const jump = () => {
    pinned.current = true;
    setUnseen(false);
    toBottom(true);
    /* The button is about to unmount; keep focus on the log rather than
       letting it fall back to the page. */
    if (scroller.current) scroller.current.focus({ preventScroll: true });
  };

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label={label}
      tabIndex={0}
      {...rest}
      ref={scroller}
      onScroll={onScroll}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        minHeight: 0, overflowY: "auto", overflowX: "hidden",
        overscrollBehavior: "contain",
        padding: "var(--dt-space-inset-sm)",
        ...style,
      }}
    >
      {/* margin-top: auto keeps a short conversation at the bottom, next to
          the composer, the way every messenger does. */}
      <div ref={content} style={{ display: "flex", flexDirection: "column", marginTop: "auto", minWidth: 0 }}>
        {children}
      </div>
      {unseen && (
        <div aria-live="off" style={{
          position: "sticky", bottom: "var(--dt-space-inset-xs)", height: 0, flex: "none",
          display: "flex", justifyContent: "center", alignItems: "flex-end", overflow: "visible",
        }}>
          <Button
            type="button"
            size="sm"
            onClick={jump}
            iconStart={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
                style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", display: "block" }}>
                {DOWN.map((d) => <path key={d} d={d} />)}
              </svg>
            }
            style={{ boxShadow: "var(--dt-elevation-2)", flex: "none" }}
          >
            New messages
          </Button>
        </div>
      )}
    </div>
  );
}

/* A centred label across the log: a day, or an event such as a hand-off.
   A separator's content is presentational, so the text is also its name. */
export function MessageDivider({ children, label, style, ...rest }) {
  const name = label || (typeof children === "string" ? children : undefined);
  const rule = { flex: "1 1 0", minWidth: 0, borderTop: "var(--dt-border-width-default) solid var(--dt-chat-border)" };
  return (
    <div
      role="separator"
      aria-label={name}
      style={{
        display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
        margin: "var(--dt-bubble-run-gap) 0",
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
        lineHeight: "var(--dt-text-label-sm-line)", fontWeight: "var(--dt-font-weight-medium)",
        color: "var(--dt-chat-divider-fg)",
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={rule} />
      <span style={{ flex: "0 1 auto", minWidth: 0, textAlign: "center", overflowWrap: "anywhere" }}>{children}</span>
      <span aria-hidden="true" style={rule} />
    </div>
  );
}
