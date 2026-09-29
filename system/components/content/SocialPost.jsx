import React from "react";

/* A social post: an Instagram story (9:16) or grid post (4:5 or 1:1), drawn on
   an artboard at the format's native pixel size and scaled to fit its
   container. A screenshot of it at full size is ready to publish.

   Ten layouts share one frame so a set of posts reads as one voice: a mark and
   an optional counter along the top, a handle and a call to action along the
   bottom, and one type scale for everything between. Half the layouts sit on
   a plain tone and half on a photograph. */

const RATIO = { story: "9 / 16", portrait: "4 / 5", square: "1 / 1" };
const HEIGHT = {
  story: "var(--dt-social-height-story)",
  portrait: "var(--dt-social-height-portrait)",
  square: "var(--dt-social-height-square)",
};
/* The display size steps down as the format gets shorter. */
const SCALE = { story: 1, portrait: 0.86, square: 0.74 };

function fill(bg, fg) {
  return { background: bg, color: fg, "--dt-social-fg": fg, "--dt-social-muted": `color-mix(in oklab, ${fg} 76%, transparent)`, "--dt-social-rule": `color-mix(in oklab, ${fg} 24%, transparent)` };
}
const TONES = {
  paper: { style: { background: "var(--dt-social-bg)", color: "var(--dt-social-fg)" } },
  ink: { dark: true, style: { background: "var(--dt-social-bg)", color: "var(--dt-social-fg)" } },
  brand: { style: fill("var(--dt-surface-brand)", "var(--dt-text-on-brand)") },
  "brand-muted": { style: fill("var(--dt-surface-brand-muted)", "var(--dt-text-on-brand-muted)") },
  secondary: { style: fill("var(--dt-surface-brand-secondary)", "var(--dt-text-on-brand-secondary)") },
};
const PICTURED = { cover: true, split: true, framed: true, card: true, poster: true };

function useScale(ref) {
  const [scale, setScale] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const native = parseFloat(getComputedStyle(el).getPropertyValue("--dt-social-width")) || 1;
      setScale(el.clientWidth / native);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

const meta = {
  fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-social-meta-size)",
  letterSpacing: "var(--dt-social-meta-tracking)", textTransform: "uppercase", lineHeight: 1.2,
};
const body = { margin: 0, fontSize: "var(--dt-social-body-size)", lineHeight: "var(--dt-social-body-line)", color: "var(--dt-social-muted)", textWrap: "pretty" };

function display(format, factor = 1) {
  const k = SCALE[format] * factor;
  return {
    margin: 0,
    fontFamily: "var(--dt-social-display-family)",
    fontSize: `calc(var(--dt-social-display-size) * ${k})`,
    lineHeight: `calc(var(--dt-social-display-line) * ${k})`,
    fontWeight: "var(--dt-social-display-weight)",
    letterSpacing: "var(--dt-social-display-tracking)",
    textWrap: "balance",
  };
}
function title(format, factor = 1) {
  const k = SCALE[format] * factor;
  return {
    margin: 0,
    fontFamily: "var(--dt-social-display-family)",
    fontSize: `calc(var(--dt-social-title-size) * ${k})`,
    lineHeight: `calc(var(--dt-social-title-line) * ${k})`,
    fontWeight: "var(--dt-social-display-weight)",
    letterSpacing: "var(--dt-social-display-tracking)",
    textWrap: "balance",
  };
}

function Picture({ image, position, label, style }) {
  return image ? (
    <img src={image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position, display: "block", ...style }} />
  ) : (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--dt-surface-sunken)", color: "var(--dt-text-tertiary)", ...meta, ...style }}>{label || "Image"}</div>
  );
}

export function SocialPost({
  layout = "headline",
  format = "story",
  tone = "brand",
  image,
  imagePosition = "center",
  eyebrow,
  title: heading,
  body: text,
  meta: byline,
  items = [],
  badge,
  brand = "Dovetail",
  mark,
  handle,
  cta,
  counter,
  label,
  style,
  ...rest
}) {
  const box = React.useRef(null);
  const scale = useScale(box);
  const t = TONES[tone] || TONES.brand;
  const pictured = !!PICTURED[layout];
  const onImage = layout === "cover" || layout === "poster" || layout === "card";

  const frame = {
    position: "absolute", inset: 0, zIndex: 2,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "var(--dt-social-padding)", gap: "var(--dt-social-gap)",
    color: onImage ? "var(--dt-social-on-image)" : undefined,
    "--dt-social-muted": onImage ? "var(--dt-social-on-image-muted)" : undefined,
  };
  const top = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-social-gap)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "calc(var(--dt-social-gap) / 2)", fontSize: "var(--dt-social-body-size)", fontWeight: "var(--dt-font-weight-semibold)", letterSpacing: "var(--dt-tracking-tight)" }}>
        {mark || <span aria-hidden="true" style={{ width: "calc(var(--dt-social-meta-size) * 1.1)", height: "calc(var(--dt-social-meta-size) * 1.1)", borderRadius: "var(--dt-radius-pill)", background: "currentColor" }} />}
        {brand}
      </span>
      {counter && <span style={meta}>{counter}</span>}
    </div>
  );
  const bottom = (handle || cta) && (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-social-gap)", ...meta }}>
      <span>{handle}</span>
      {cta && <span style={{ padding: "calc(var(--dt-social-gap) / 2.5) calc(var(--dt-social-gap) / 1.4)", border: "var(--dt-border-width-strong, 2px) solid currentColor", borderRadius: "var(--dt-radius-pill)" }}>{cta}</span>}
    </div>
  );
  const eyebrowEl = eyebrow && <p style={{ margin: 0, ...meta, color: "var(--dt-social-muted)" }}>{eyebrow}</p>;

  let content = null;
  let background = null;

  if (layout === "headline") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <h2 style={display(format)}>{heading}</h2>
        {text && <p style={body}>{text}</p>}
      </div>
    );
  } else if (layout === "quote") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        <span aria-hidden="true" style={{ ...display(format, 1.6), lineHeight: 0.6, height: "calc(var(--dt-social-display-size) * 0.5)" }}>“</span>
        <blockquote style={{ margin: 0, ...title(format) }}>{heading}</blockquote>
        {byline && <p style={{ margin: 0, ...meta }}>{byline}</p>}
      </div>
    );
  } else if (layout === "stat") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <p style={{ ...display(format, 1.9), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{heading}</p>
        {text && <p style={{ ...body, fontSize: "calc(var(--dt-social-body-size) * 1.2)", color: "inherit" }}>{text}</p>}
        {byline && <p style={{ margin: 0, ...meta, color: "var(--dt-social-muted)" }}>{byline}</p>}
      </div>
    );
  } else if (layout === "list") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <h2 style={title(format)}>{heading}</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((it, i) => (
            <li key={i} style={{ display: "flex", gap: "var(--dt-social-gap)", alignItems: "baseline", padding: "calc(var(--dt-social-gap) * 0.6) 0", borderTop: "var(--dt-border-width-strong, 2px) solid var(--dt-social-rule)", fontSize: "calc(var(--dt-social-body-size) * 1.1)", lineHeight: "var(--dt-social-body-line)" }}>
              <span style={{ ...meta, color: "var(--dt-social-muted)", minWidth: "2.4em" }}>{String(i + 1).padStart(2, "0")}</span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  } else if (layout === "announcement") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "var(--dt-social-gap)" }}>
        {badge && <span style={{ ...meta, padding: "calc(var(--dt-social-gap) / 2.5) calc(var(--dt-social-gap) / 1.2)", borderRadius: "var(--dt-radius-pill)", border: "var(--dt-border-width-strong, 2px) solid currentColor" }}>{badge}</span>}
        <h2 style={display(format)}>{heading}</h2>
        {text && <p style={{ ...body, maxWidth: "80%" }}>{text}</p>}
        {byline && <p style={{ margin: 0, ...meta }}>{byline}</p>}
      </div>
    );
  } else if (layout === "cover") {
    background = (
      <>
        <Picture image={image} position={imagePosition} label={label} />
        <div style={{ position: "absolute", inset: 0, background: "var(--dt-scrim-bottom)" }} />
        <div style={{ position: "absolute", inset: "0 0 auto", height: "30%", background: "var(--dt-scrim-top)", opacity: 0.6 }} />
      </>
    );
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
        {eyebrowEl}
        <h2 style={display(format, 0.9)}>{heading}</h2>
        {text && <p style={body}>{text}</p>}
      </div>
    );
  } else if (layout === "poster") {
    background = (
      <>
        <Picture image={image} position={imagePosition} label={label} />
        <div style={{ position: "absolute", inset: 0, background: "var(--dt-scrim-top)" }} />
        <div style={{ position: "absolute", inset: "auto 0 0", height: "40%", background: "var(--dt-scrim-bottom)" }} />
      </>
    );
    content = null;
  } else if (layout === "card") {
    background = (
      <>
        <Picture image={image} position={imagePosition} label={label} />
        <div style={{ position: "absolute", inset: "0 0 auto", height: "30%", background: "var(--dt-scrim-top)", opacity: 0.6 }} />
      </>
    );
    content = (
      <div className="dark" style={{
        display: "flex", flexDirection: "column", gap: "calc(var(--dt-social-gap) * 0.6)",
        padding: "var(--dt-social-gap)", borderRadius: "var(--dt-social-radius)",
        background: "var(--dt-surface-glass-inverse)", color: "var(--dt-social-on-image)",
        backdropFilter: "var(--dt-backdrop-glass, blur(24px))", WebkitBackdropFilter: "var(--dt-backdrop-glass, blur(24px))",
      }}>
        {eyebrowEl}
        <h2 style={title(format, 0.9)}>{heading}</h2>
        {text && <p style={{ ...body, color: "var(--dt-social-on-image-muted)" }}>{text}</p>}
      </div>
    );
  }

  const inner = (() => {
    if (layout === "split") {
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", flex: format === "square" ? "0 0 48%" : "0 0 56%" }}>
            <Picture image={image} position={imagePosition} label={label} />
            <div style={{ position: "absolute", inset: "0 0 auto", height: "40%", background: "var(--dt-scrim-top)", opacity: 0.6 }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "var(--dt-social-padding)", gap: "var(--dt-social-gap)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "calc(var(--dt-social-gap) * 0.6)" }}>
              {eyebrowEl}
              <h2 style={title(format)}>{heading}</h2>
              {text && format !== "square" && <p style={body}>{text}</p>}
            </div>
            {bottom}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "var(--dt-social-padding)", color: "var(--dt-social-on-image)" }}>{top}</div>
        </div>
      );
    }
    if (layout === "framed") {
      return (
        <div style={frame}>
          {top}
          <div style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: "var(--dt-social-radius)", overflow: "hidden" }}>
            <Picture image={image} position={imagePosition} label={label} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "calc(var(--dt-social-gap) * 0.5)" }}>
            {eyebrowEl}
            <h2 style={title(format, 0.85)}>{heading}</h2>
          </div>
          {bottom}
        </div>
      );
    }
    if (layout === "poster") {
      return (
        <div style={frame}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
            {top}
            {/* One word, set as large as its length allows without breaking it. */}
            <h2 style={{ ...display(format, Math.min(1.9, 9 / Math.max(4, String(heading || "").length))), lineHeight: 0.86, whiteSpace: "nowrap" }}>{heading}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-social-gap)" }}>
            {text && <p style={body}>{text}</p>}
            {bottom}
          </div>
        </div>
      );
    }
    return (
      <div style={{ ...frame, justifyContent: "space-between" }}>
        {top}
        {content}
        {bottom || <span />}
      </div>
    );
  })();

  return (
    <div
      ref={box}
      role="img"
      aria-label={label || [eyebrow, typeof heading === "string" ? heading : null, typeof text === "string" ? text : null].filter(Boolean).join(". ")}
      style={{ position: "relative", width: "100%", aspectRatio: RATIO[format] || RATIO.story, overflow: "hidden", borderRadius: "var(--dt-radius-media)", ...style }}
      {...rest}
    >
      <div
        className={t.dark ? "dark" : undefined}
        style={{
          position: "absolute", top: 0, left: 0,
          width: "var(--dt-social-width)", height: HEIGHT[format] || HEIGHT.story,
          transform: `scale(${scale})`, transformOrigin: "0 0", visibility: scale ? "visible" : "hidden",
          overflow: "hidden", fontFamily: "var(--dt-font-family-sans)",
          ...(pictured && layout !== "framed" && layout !== "split" ? { background: "var(--dt-surface-sunken)", color: "var(--dt-social-on-image)" } : t.style),
        }}
      >
        {background}
        {inner}
      </div>
    </div>
  );
}
