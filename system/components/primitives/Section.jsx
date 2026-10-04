import React from "react";

/* The page column, from the page-width tokens, so every page lines up. */
const WIDTHS = {
  narrow: "var(--dt-layout-page-width-narrow)",
  default: "var(--dt-layout-page-width)",
  wide: "var(--dt-layout-page-width-wide)",
  full: "none",
};
/* The module padding steps, which move with the layout's character. default
   and compact are the md and sm steps by their older names. */
const pad = (step) => `var(--dt-layout-module-padding-${step})`;
const SPACING = { none: "0", sm: pad("sm"), md: pad("md"), lg: pad("lg"), xl: pad("xl"), default: pad("md"), compact: pad("sm") };
const ALIGN = { top: "flex-start", center: "center", bottom: "flex-end" };

/* Each tone is a surface and the text roles that belong on it. The text roles
   are re-pointed on the section itself, so a Heading or Text inside it that
   reads --dt-text-secondary gets the fill's own secondary rather than the
   page's grey. That is the "fixed card" pattern: the band decides its colours,
   and everything inside it follows without a prop. */
function onFill(fg) {
  return {
    "--dt-text-primary": fg,
    "--dt-text-headline": fg,
    "--dt-text-secondary": `color-mix(in oklab, ${fg} 88%, transparent)`,
    "--dt-text-tertiary": `color-mix(in oklab, ${fg} 76%, transparent)`,
    color: fg,
  };
}
/* On a pale brand tint, a Button's primary and secondary take the brand
   colours: the tint's own hue leads, the other brand hue follows. Each pair
   comes from the brand-coloured action roles, whose text passes on them. */
function buttonsIn(lead, follow) {
  const out = {};
  [["primary", lead], ["secondary", follow]].forEach(([variant, hue]) => {
    const role = `--dt-surface-action-${hue}`;
    out[`--dt-button-${variant}-bg`] = `var(${role})`;
    out[`--dt-button-${variant}-bg-hover`] = `var(${role}-hover)`;
    out[`--dt-button-${variant}-bg-active`] = `var(${role}-active)`;
    out[`--dt-button-${variant}-fg`] = `var(--dt-text-on-action-${hue})`;
    out[`--dt-button-${variant}-border`] = "transparent";
  });
  return out;
}
/* On a strong brand fill the brand can't be the button too: a primary (or
   brand) Button turns to the fill's own text colour with the fill as its
   label, a secondary one is outlined in that text colour, and a ghost one
   reads in it. Links, borders, the selected mark and the focus ring move to
   the text colour as well, so nothing on the fill disappears into it. */
function onStrong(fg, fill) {
  const mix = (a, pct, b) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;
  const out = {
    "--dt-text-link": fg,
    "--dt-border-subtle": mix(fg, 18, "transparent"),
    "--dt-border-default": mix(fg, 32, "transparent"),
    "--dt-border-selected": fg,
    "--dt-focus-ring-color": fg,
    "--dt-focus-ring-offset-color": fill,
  };
  ["primary", "brand", "brand-secondary"].forEach((v) => {
    out[`--dt-button-${v}-bg`] = fg;
    out[`--dt-button-${v}-bg-hover`] = mix(fg, 88, fill);
    out[`--dt-button-${v}-bg-active`] = mix(fg, 76, fill);
    out[`--dt-button-${v}-fg`] = fill;
    out[`--dt-button-${v}-border`] = "transparent";
  });
  out["--dt-button-secondary-bg"] = "transparent";
  out["--dt-button-secondary-bg-hover"] = mix(fg, 12, "transparent");
  out["--dt-button-secondary-bg-active"] = mix(fg, 20, "transparent");
  out["--dt-button-secondary-fg"] = fg;
  out["--dt-button-secondary-border"] = mix(fg, 55, "transparent");
  out["--dt-button-ghost-bg-hover"] = mix(fg, 12, "transparent");
  out["--dt-button-ghost-bg-active"] = mix(fg, 20, "transparent");
  out["--dt-button-ghost-fg"] = fg;
  return out;
}
const TONES = {
  base: { background: "var(--dt-surface-base)" },
  subtle: { background: "var(--dt-surface-subtle)" },
  brand: { background: "var(--dt-surface-brand)", ...onFill("var(--dt-text-on-brand)"), ...onStrong("var(--dt-text-on-brand)", "var(--dt-surface-brand)") },
  "brand-muted": { background: "var(--dt-surface-brand-muted)", ...onFill("var(--dt-text-on-brand-muted)"), ...buttonsIn("brand", "brand-secondary") },
  secondary: { background: "var(--dt-surface-brand-secondary)", ...onFill("var(--dt-text-on-brand-secondary)"), ...onStrong("var(--dt-text-on-brand-secondary)", "var(--dt-surface-brand-secondary)") },
  "secondary-muted": { background: "var(--dt-surface-brand-secondary-muted)", ...onFill("var(--dt-text-on-brand-secondary-muted)"), ...buttonsIn("brand-secondary", "brand") },
};
TONES["brand-secondary"] = TONES.secondary;
TONES["brand-secondary-muted"] = TONES["secondary-muted"];

/* A brand fill's background and every role that has to follow it: text,
   links, borders, focus and buttons. Section uses it for its tones; other
   bands that take a brand fill (Navbar, the open menu in Drawer) use the same
   declarations, so a Button reads the same on every brand fill. Unknown
   tones give the base surface. */
export function fillTone(tone) {
  return TONES[tone] || TONES.base;
}

function scrimImage(scrim, align) {
  if (scrim === "none") return "none";
  if (scrim === "solid" || align === "center") return "var(--dt-scrim-full, var(--dt-surface-scrim))";
  const to = align === "bottom" ? "to top" : "to bottom";
  /* A band's text block runs taller than a card's caption, so the scrim holds
     at full strength for its first third before it fades. */
  return `linear-gradient(${to}, var(--dt-scrim-full, var(--dt-surface-scrim)) 30%, transparent 90%)`;
}

export function Section({
  width = "default",
  tone = "base",
  dark,
  texture = false,
  spacing = "default",
  spacingTop,
  spacingBottom,
  bleed = "full",
  media,
  scrim = "gradient",
  align = "bottom",
  minHeight,
  as: Tag = "section",
  className,
  children,
  style,
  ...rest
}) {
  const photo = !!media;
  const scoped = dark === undefined ? photo : dark;
  const surface = photo ? { background: "var(--dt-surface-base)", ...onFill("var(--dt-text-on-scrim)"), "--dt-text-secondary": "var(--dt-text-on-scrim-secondary)" } : TONES[tone] || TONES.base;
  const fill = texture && surface.background ? `var(--dt-surface-texture), ${surface.background}` : surface.background;
  const both = SPACING[spacing] || SPACING.default;
  const inset = bleed === "inset";
  const limit = WIDTHS[width] || WIDTHS.default;

  /* The band: its fill, its photo and its padding above and below. Full
     bleed, it spans the screen; inset, it sits in the page column with the
     container radius, so a page can set one theme apart from the next. */
  const band = {
    position: "relative",
    overflow: photo || inset ? "hidden" : undefined,
    ...surface,
    background: fill,
    color: surface.color || "var(--dt-text-primary)",
    display: photo ? "flex" : undefined,
    flexDirection: photo ? "column" : undefined,
    justifyContent: photo ? ALIGN[align] || ALIGN.bottom : undefined,
    minHeight: minHeight || (photo ? "min(70vh, var(--dt-dim-container-sm))" : undefined),
    paddingTop: SPACING[spacingTop] || both,
    paddingBottom: SPACING[spacingBottom] || both,
  };
  const content = (
    <>
      {photo && <img src={media} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      {photo && scrim !== "none" && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: scrimImage(scrim, align) }} />}
      <div
        style={{
          position: photo ? "relative" : undefined,
          width: "100%",
          maxWidth: inset ? undefined : limit,
          marginInline: "auto",
          paddingInline: inset ? "var(--dt-layout-module-inset)" : "var(--dt-layout-page-gutter)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </>
  );
  const scope = [scoped ? "dark" : null, className].filter(Boolean).join(" ") || undefined;

  if (inset) {
    /* The gutter keeps it off the screen's edge, and a block of space keeps
       two inset bands apart. */
    return (
      <Tag className={className} style={{ paddingInline: "var(--dt-layout-page-gutter)", paddingBlock: "var(--dt-layout-stack-block)", ...style }} {...rest}>
        <div className={scoped ? "dark" : undefined} style={{ ...band, maxWidth: limit, marginInline: "auto", borderRadius: "var(--dt-radius-container)", boxSizing: "border-box" }}>
          {content}
        </div>
      </Tag>
    );
  }

  return (
    <Tag className={scope} style={{ ...band, ...style }} {...rest}>
      {content}
    </Tag>
  );
}
