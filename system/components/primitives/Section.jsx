import React from "react";

const WIDTHS = {
  narrow: "var(--dt-size-container-narrow)",
  default: "var(--dt-size-container-default)",
  wide: "var(--dt-size-container-wide)",
  full: "none",
};
const SPACING = { default: "var(--dt-space-section)", compact: "var(--dt-space-section-compact)", none: "0" };
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
const TONES = {
  base: { background: "var(--dt-surface-base)" },
  subtle: { background: "var(--dt-surface-subtle)" },
  brand: { background: "var(--dt-surface-brand)", ...onFill("var(--dt-text-on-brand)") },
  "brand-muted": { background: "var(--dt-surface-brand-muted)", ...onFill("var(--dt-text-on-brand-muted)") },
  secondary: { background: "var(--dt-surface-brand-secondary)", ...onFill("var(--dt-text-on-brand-secondary)") },
  "secondary-muted": { background: "var(--dt-surface-brand-secondary-muted)", ...onFill("var(--dt-text-on-brand-secondary-muted)") },
};

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
  const pad = SPACING[spacing] || SPACING.default;

  return (
    <Tag
      className={[scoped ? "dark" : null, className].filter(Boolean).join(" ") || undefined}
      style={{
        position: "relative",
        overflow: photo ? "hidden" : undefined,
        ...surface,
        background: fill,
        color: surface.color || "var(--dt-text-primary)",
        display: photo ? "flex" : undefined,
        flexDirection: photo ? "column" : undefined,
        justifyContent: photo ? ALIGN[align] || ALIGN.bottom : undefined,
        minHeight: minHeight || (photo ? "min(70vh, var(--dt-dim-container-sm))" : undefined),
        paddingBlock: pad,
        ...style,
      }}
      {...rest}
    >
      {photo && <img src={media} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      {photo && scrim !== "none" && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: scrimImage(scrim, align) }} />}
      <div
        style={{
          position: photo ? "relative" : undefined,
          width: "100%",
          maxWidth: WIDTHS[width] || WIDTHS.default,
          marginInline: "auto",
          paddingInline: "var(--dt-space-gutter)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </Tag>
  );
}
