import React from "react";
import { Badge } from "../display/Badge.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Measuring the width happens before paint in the browser. On the server
   there is nothing to measure, and React warns about the layout hook there. */
const useMeasureEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

const ICONS = {
  check: ["M20 6 9 17l-5-5"],
  alert: ["M12 7v6", "M12 17h.01"],
  cross: ["M18 6 6 18", "m6 6 12 12"],
};

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)" }}
    >
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const STATUS_TEXT = { delayed: "Delayed", cancelled: "Cancelled" };

/* complete: a filled disc with a check. current: a ring with a filled centre,
   or for a delayed or cancelled order a filled disc with ! or ×. upcoming:
   an empty ring. */
function Marker({ state, status }) {
  const box = {
    display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxSizing: "border-box",
    width: "var(--dt-order-status-marker-size)", height: "var(--dt-order-status-marker-size)",
    borderRadius: "var(--dt-radius-pill)",
    transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
  };
  const ring = (color) => ({ ...box, border: `var(--dt-order-status-line-width) solid ${color}`, background: "var(--dt-surface-base)" });
  if (state === "complete") {
    return <span style={{ ...box, background: "var(--dt-order-status-complete)", color: "var(--dt-order-status-on-complete)" }}><Icon name="check" /></span>;
  }
  if (state === "current" && status === "delayed") {
    return <span style={{ ...box, background: "var(--dt-order-status-delayed)", color: "var(--dt-order-status-on-delayed)" }}><Icon name="alert" /></span>;
  }
  if (state === "current" && status === "cancelled") {
    return <span style={{ ...box, background: "var(--dt-order-status-cancelled)", color: "var(--dt-order-status-on-cancelled)" }}><Icon name="cross" /></span>;
  }
  if (state === "current") {
    return (
      <span style={ring("var(--dt-order-status-current)")}>
        <span style={{ width: "50%", height: "50%", borderRadius: "var(--dt-radius-pill)", background: "var(--dt-order-status-current)" }} />
      </span>
    );
  }
  return <span style={ring("var(--dt-order-status-upcoming)")} />;
}

export function OrderStatus({
  steps = [],
  current,
  status = "active",
  orientation = "vertical",
  label,
  statusText,
  style,
  ...rest
}) {
  const rootRef = React.useRef(null);
  const probeRef = React.useRef(null);
  const [fits, setFits] = React.useState(true);
  const wantsRow = orientation === "horizontal";

  /* A horizontal timeline needs every step's least width side by side. When
     the box is narrower than that it turns vertical, and turns back when it
     widens. The least width is a token, read off a hidden probe. */
  useMeasureEffect(() => {
    if (!wantsRow) return undefined;
    const el = rootRef.current;
    const probe = probeRef.current;
    if (!el || !probe) return undefined;
    const measure = () => setFits(el.clientWidth >= probe.offsetWidth * Math.max(steps.length, 1));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wantsRow, steps.length]);

  const row = wantsRow && fits;
  const at = steps.findIndex((s) => s.id === current);
  const worded = status === "delayed" || status === "cancelled";
  const tone = status === "delayed" ? "warning" : "danger";
  const statusColor = status === "delayed" ? "var(--dt-order-status-delayed-text)" : "var(--dt-order-status-cancelled-text)";

  return (
    <div ref={rootRef} data-orientation={row ? "horizontal" : "vertical"} style={{ position: "relative", minWidth: 0, ...style }} {...rest}>
      {wantsRow && (
        <span
          ref={probeRef}
          aria-hidden="true"
          style={{ position: "absolute", visibility: "hidden", height: 0, overflow: "hidden", width: "var(--dt-order-status-step-min-width)" }}
        />
      )}
      {/* role="list" keeps the list a list in Safari, which drops the role
          from a list with list-style: none. */}
      <ol
        role="list"
        aria-label={label}
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: row ? "row" : "column" }}
      >
        {steps.map((step, i) => {
          const state = at < 0 || i > at ? "upcoming" : i < at ? "complete" : "current";
          const last = i === steps.length - 1;
          const lineColor = i < at ? "var(--dt-order-status-complete)" : "var(--dt-order-status-line)";
          const isCurrent = state === "current";
          const labelColor = state === "upcoming"
            ? status === "cancelled" ? "var(--dt-text-tertiary)" : "var(--dt-text-secondary)"
            : isCurrent && worded ? statusColor : "var(--dt-text-primary)";

          const text = (
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", paddingBlockEnd: !row && !last ? "var(--dt-space-stack-lg)" : 0, paddingInlineEnd: row ? "var(--dt-space-inline-sm)" : 0 }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
                <span
                  style={{
                    fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                    lineHeight: "var(--dt-text-label-md-line)", letterSpacing: "var(--dt-text-label-md-tracking)",
                    fontWeight: isCurrent ? "var(--dt-font-weight-semibold)" : "var(--dt-text-label-md-weight)",
                    color: labelColor,
                  }}
                >
                  {state === "complete" && <VisuallyHidden>Completed: </VisuallyHidden>}
                  {state === "upcoming" && <VisuallyHidden>Upcoming: </VisuallyHidden>}
                  {step.label}
                </span>
                {isCurrent && worded && <Badge tone={tone}>{statusText || STATUS_TEXT[status]}</Badge>}
              </span>
              {step.time && (
                <span style={{ fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                  {step.time}
                </span>
              )}
              {step.description && (
                <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>
                  {step.description}
                </span>
              )}
            </div>
          );

          if (row) {
            return (
              <li key={step.id} aria-current={isCurrent ? "step" : undefined} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)" }}>
                <span aria-hidden="true" style={{ display: "flex", alignItems: "center" }}>
                  <Marker state={state} status={status} />
                  {!last && <span style={{ flex: 1, height: "var(--dt-order-status-line-width)", marginInline: "var(--dt-space-inline-xs)", borderRadius: "var(--dt-radius-pill)", background: lineColor }} />}
                </span>
                {text}
              </li>
            );
          }
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              style={{ display: "grid", gridTemplateColumns: "var(--dt-order-status-marker-size) minmax(0, 1fr)", columnGap: "var(--dt-space-inline-sm)" }}
            >
              <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Marker state={state} status={status} />
                {!last && <span style={{ flex: 1, width: "var(--dt-order-status-line-width)", marginBlock: "var(--dt-space-stack-2xs)", borderRadius: "var(--dt-radius-pill)", background: lineColor }} />}
              </span>
              {text}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
