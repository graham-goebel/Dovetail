import React from "react";

/* The layer that makes any headless source work. A block is `{ _type, _key, ...props }`;
   the registry maps a `_type` to a component. Nothing here knows about a CMS, which is
   the point: an adapter turns a payload into this array and stops. */

export function BlockRenderer({ blocks = [], registry = {}, debug, onUnknown, ...rest }) {
  const loud = debug === undefined ? isDevelopment() : debug;

  return (
    <React.Fragment {...rest}>
      {blocks.map((block, i) => {
        if (!block || !block._type) return null;
        const { _type, _key, ...props } = block;
        const Component = registry[_type];

        if (!Component) {
          if (onUnknown) onUnknown(_type, block);
          /* A missing block is loud in review and silent for the reader: shipping a
             red box to production would be a worse failure than the missing block. */
          return loud ? <UnknownBlock key={_key || i} type={_type} /> : null;
        }

        return <Component key={_key || i} {...props} />;
      })}
    </React.Fragment>
  );
}

function isDevelopment() {
  try {
    return typeof process !== "undefined" && !!process.env && process.env.NODE_ENV !== "production";
  } catch (e) {
    /* No bundler, no process: a plain script tag in a browser. Stay quiet. */
    return false;
  }
}

function UnknownBlock({ type }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--dt-space-stack-2xs)",
        padding: "var(--dt-space-inset-md)",
        background: "var(--dt-surface-danger-subtle)",
        border: `var(--dt-border-width-default) dashed var(--dt-border-danger)`,
        borderRadius: "var(--dt-radius-container)",
        fontFamily: "var(--dt-text-body-sm-family)",
        fontSize: "var(--dt-text-body-sm-size)",
        lineHeight: "var(--dt-text-body-sm-line)",
        color: "var(--dt-text-danger)",
      }}
    >
      <strong style={{ fontWeight: "var(--dt-font-weight-semibold)" }}>No component for “{type}”</strong>
      <span style={{ color: "var(--dt-text-secondary)" }}>
        Add it to the registry you pass to BlockRenderer, or remove the block from the content.
      </span>
    </div>
  );
}
