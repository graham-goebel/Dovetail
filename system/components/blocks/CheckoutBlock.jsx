import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Stack } from "../primitives/Stack.jsx";
import { Input } from "../forms/Input.jsx";
import { RadioGroup } from "../forms/RadioGroup.jsx";
import { AddressFields } from "../commerce/AddressFields.jsx";
import { PaymentFields } from "../commerce/PaymentFields.jsx";
import { OrderSummary } from "../commerce/OrderSummary.jsx";
import { CartLine } from "../commerce/CartLine.jsx";
import { Price } from "../commerce/Price.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

const SUMMARY = "calc(var(--dt-size-media-min) * 1.5)";
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* A fieldset whose legend is set like AddressFields' and PaymentFields', so
   the four steps of the form read as one list of headings. */
const fieldset = { border: 0, margin: 0, padding: 0, minWidth: 0 };
const legend = { ...role("heading-xs"), padding: 0, marginBlockEnd: "var(--dt-space-stack-md)", color: "var(--dt-text-primary)" };

/* The block's own width, not the viewport's, so it acts as a container
   query. False while server rendering and until the first measurement, so
   the server's markup and the first client render match. */
function useNarrow(ref, below) {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setNarrow(el.getBoundingClientRect().width < below);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, below]);
  return narrow;
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        display: "block", flex: "none", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)",
        transform: open ? "rotate(180deg)" : "none", transition: "transform var(--dt-motion-micro)",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* One-page checkout. The form (contact, address, delivery, payment and the
   place-order action) on the left; the order on the right, sticky. When the
   block is narrower than collapseBelow the order moves to the top, folded
   into a "Show order summary · total" disclosure, the usual phone pattern.
   The block validates and adds up nothing: every value and figure is the
   consumer's. */
export function CheckoutBlock({
  eyebrow,
  title = "Checkout",
  lead,
  email = "",
  onEmailChange,
  emailLabel = "Email",
  emailHint,
  contactLegend = "Contact",
  address,
  deliveryOptions = [],
  delivery,
  onDeliveryChange,
  deliveryLegend = "Delivery",
  payment,
  submitAction,
  onSubmit,
  summary,
  lines = [],
  currency,
  locale,
  collapseBelow = 768,
  showSummaryLabel = "Show order summary",
  hideSummaryLabel = "Hide order summary",
  level = 1,
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const uid = React.useId();
  const panelId = `${uid}-summary`;
  const box = React.useRef(null);
  const narrow = useNarrow(box, collapseBelow);
  const [open, setOpen] = React.useState(false);
  const money = { currency: currency || (summary && summary.currency), locale: locale || (summary && summary.locale) };
  const s = summary || { lines: [], total: { amount: 0 } };

  const items = lines.length > 0 && (
    <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)" }}>
      {lines.map(({ id, ...line }, i) => (
        <li key={id != null ? id : i}><CartLine readOnly size="sm" {...money} {...line} /></li>
      ))}
    </ul>
  );
  /* The read-only lines, then the figures. The panel around them is the
     column's (or the disclosure's), so the summary drops its own frame. */
  const panel = (
    <>
      {items}
      <OrderSummary
        headingLevel={level + 1 > 6 ? 6 : level + 1}
        {...money}
        {...s}
        style={{
          padding: 0, border: 0, borderRadius: 0, background: "transparent",
          paddingBlockStart: items ? "var(--dt-space-stack-md)" : 0,
          borderBlockStart: items ? "var(--dt-border-width-default) solid var(--dt-border-subtle)" : 0,
          ...(s.style || {}),
        }}
      />
    </>
  );

  const form = (
    <Stack layer="block" style={{ minWidth: 0 }}>
      <fieldset style={fieldset}>
        <legend style={legend}>{contactLegend}</legend>
        <Input
          type="email"
          label={emailLabel}
          hint={emailHint}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          value={email}
          onChange={(ev) => { if (onEmailChange) onEmailChange(ev.target.value); }}
        />
      </fieldset>

      {address && <AddressFields {...address} />}

      {deliveryOptions.length > 0 && (
        <fieldset style={fieldset}>
          <legend style={legend}>{deliveryLegend}</legend>
          <RadioGroup
            name={`${uid}-delivery`}
            value={delivery}
            onChange={onDeliveryChange}
            options={deliveryOptions.map((o) => ({
              value: o.id,
              hint: o.detail,
              label: (
                <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", columnGap: "var(--dt-space-inline-xs)" }}>
                  <span>{o.label}</span>
                  {typeof o.price === "number" && <Price amount={o.price} size="sm" {...money} />}
                </span>
              ),
            }))}
          />
        </fieldset>
      )}

      {payment && <PaymentFields {...payment} />}

      {submitAction && <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)" }}>{submitAction}</div>}
    </Stack>
  );

  const Tag = onSubmit ? "form" : "div";
  const formProps = onSubmit ? { onSubmit } : {};

  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div ref={box} style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} level={level} />}

        {narrow && (
          <div
            style={{
              border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
              borderRadius: "var(--dt-radius-container)",
              background: "var(--dt-surface-subtle)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "var(--dt-space-inline-sm)", padding: "var(--dt-space-inset-md)",
                minHeight: "var(--dt-size-touch-target)", boxSizing: "border-box",
                appearance: "none", border: 0, background: "transparent", cursor: "pointer", textAlign: "start",
                color: "var(--dt-text-link)", ...role("label-md"),
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
                {open ? hideSummaryLabel : showSummaryLabel}
                <Chevron open={open} />
              </span>
              <span style={{ color: "var(--dt-text-primary)", flex: "none" }}>
                <Price amount={s.total ? s.total.amount : 0} size="md" {...money} />
              </span>
            </button>
            <div
              id={panelId}
              hidden={!open}
              style={{ display: open ? "flex" : "none", flexDirection: "column", gap: "var(--dt-space-stack-md)", padding: "0 var(--dt-space-inset-md) var(--dt-space-inset-md)" }}
            >
              {panel}
            </div>
          </div>
        )}

        <Tag {...formProps} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: scaled("--dt-layout-inline-section") }}>
          <div style={{ flex: "999 1 0", minWidth: `min(100%, calc(${SUMMARY} * 1.25))` }}>{form}</div>
          {!narrow && (
            <div style={{ flex: `1 1 ${SUMMARY}`, minWidth: 0, position: "sticky", insetBlockStart: "var(--dt-space-stack-lg)" }}>
              <div
                style={{
                  display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)",
                  padding: "var(--dt-space-inset-md)", boxSizing: "border-box",
                  background: "var(--dt-surface-subtle)",
                  border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
                  borderRadius: "var(--dt-radius-container)",
                }}
              >
                {panel}
              </div>
            </div>
          )}
        </Tag>
      </div>
    </Section>
  );
}
