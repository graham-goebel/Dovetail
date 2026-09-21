/* Playground harness — Storybook-style isolated preview for one component.

   A page sets window.DT_PLAYGROUND = "Button" and loads this file. Everything else —
   sidebar index, canvas, props controls, code, states, tokens, a11y — is built here so a
   component page stays a three-line file.

   Preview only by design. Nothing here writes to the project: token edits are scoped to
   the canvas element and vanish on reload. This is a place to judge a component, not to
   change it. To ship a change, edit the source or the theme file.

   Lives under templates/ because the design-system compiler sweeps every .js in the
   project into _ds_bundle.js, and templates/ is the tree it skips. */

const PG = {};

/* ---------- token discovery ---------- */

function readAllTokens() {
  const found = new Map();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    walk(rules);
  }
  function walk(rules) {
    for (const rule of Array.from(rules)) {
      if (rule.cssRules) { walk(rule.cssRules); continue; }
      if (!rule.style || !rule.selectorText) continue;
      if (!/:root|\.dark|\.dt-context/.test(rule.selectorText)) continue;
      for (const prop of Array.from(rule.style)) {
        if (prop.startsWith("--dt-") && !found.has(prop)) found.set(prop, rule.style.getPropertyValue(prop).trim());
      }
    }
  }
  return Array.from(found, ([name, value]) => ({ name, value }));
}

function tierOf(name) {
  if (/^--dt-color-|^--dt-font-|^--dt-dim-|^--dt-scale-/.test(name)) return "Primitive";
  if (/^--dt-(surface|text|border|space|radius|elevation|motion|focus|size)-/.test(name)) return "Semantic";
  return "Component";
}

/* ---------- small controls ---------- */

function Row({ label, hint, children }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
      <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-primary)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, lineHeight: 1.5, color: "var(--dt-text-tertiary)", textWrap: "pretty" }}>{hint}</span>}
    </label>
  );
}

const inputCss = {
  width: "100%", boxSizing: "border-box", padding: "6px 8px",
  borderRadius: "var(--dt-radius-control)",
  border: "var(--dt-border-width-default) solid var(--dt-border-default)",
  background: "var(--dt-surface-base)", color: "var(--dt-text-primary)",
  font: "inherit", fontSize: "var(--dt-text-body-sm-size)",
};

function Control({ spec, value, onChange }) {
  const c = spec.control;
  if (c === "boolean") {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 15, height: 15, accentColor: "var(--dt-surface-action)" }} />
        <span style={{ display: "grid", gap: 2 }}>
          <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", fontWeight: "var(--dt-font-weight-medium)" }}>{spec.name}</span>
          {spec.notes && <span style={{ fontSize: 11, lineHeight: 1.5, color: "var(--dt-text-tertiary)" }}>{spec.notes}</span>}
        </span>
      </label>
    );
  }
  if (c === "select") {
    return (
      <Row label={spec.name} hint={spec.notes}>
        <select value={value ?? ""} onChange={e => onChange(e.target.value || undefined)} style={inputCss}>
          {spec.optional && <option value="">— none —</option>}
          {spec.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Row>
    );
  }
  if (c === "number") {
    return (
      <Row label={spec.name} hint={spec.notes}>
        <input type="number" value={value ?? ""} min={spec.min} max={spec.max} step={spec.step}
          onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))} style={inputCss} />
      </Row>
    );
  }
  return (
    <Row label={spec.name} hint={spec.notes}>
      <input type="text" value={value ?? ""} onChange={e => onChange(e.target.value)} style={inputCss} />
    </Row>
  );
}

/* ---------- panels ---------- */

function PropsPanel({ spec, values, set, reset }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {spec.props.map(p => <Control key={p.name} spec={p} value={values[p.name]} onChange={v => set(p.name, v)} />)}
      <button onClick={reset} style={{
        alignSelf: "flex-start", appearance: "none", cursor: "pointer",
        padding: "6px 12px", borderRadius: "var(--dt-radius-control)",
        border: "var(--dt-border-width-default) solid var(--dt-border-default)",
        background: "var(--dt-surface-base)", color: "var(--dt-text-secondary)",
        font: "inherit", fontSize: "var(--dt-text-label-sm-size)",
      }}>Reset props</button>
    </div>
  );
}

function CodePanel({ code }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <pre style={{
        margin: 0, padding: 12, overflowX: "auto",
        background: "var(--dt-surface-sunken)", borderRadius: "var(--dt-radius-container)",
        border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
        fontFamily: "var(--dt-font-family-mono)", fontSize: 12, lineHeight: 1.65,
        color: "var(--dt-text-primary)", whiteSpace: "pre",
      }}>{code}</pre>
      <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); }} style={{
        alignSelf: "flex-start", appearance: "none", cursor: "pointer",
        padding: "6px 12px", borderRadius: "var(--dt-radius-control)",
        border: "var(--dt-border-width-default) solid var(--dt-border-default)",
        background: "var(--dt-surface-base)", color: "var(--dt-text-secondary)",
        font: "inherit", fontSize: "var(--dt-text-label-sm-size)",
      }}>{copied ? "Copied" : "Copy JSX"}</button>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: "var(--dt-text-tertiary)" }}>
        Reflects the props above. Only non-default values are emitted, so what you copy is the minimum that reproduces the canvas.
      </p>
    </div>
  );
}

function StatesPanel({ spec, NS }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {spec.states.map(s => (
        <div key={s.label} style={{ display: "grid", gap: 6 }}>
          <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--dt-text-tertiary)" }}>{s.label}</span>
          <div style={{ padding: 12, borderRadius: "var(--dt-radius-container)", background: "var(--dt-surface-sunken)", border: "var(--dt-border-width-default) solid var(--dt-border-subtle)" }}>
            {spec.render(s.props, NS)}
          </div>
          {s.note && <span style={{ fontSize: 11, lineHeight: 1.55, color: "var(--dt-text-tertiary)", textWrap: "pretty" }}>{s.note}</span>}
        </div>
      ))}
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: "var(--dt-text-tertiary)", textWrap: "pretty" }}>
        Hover and focus are live — interact with the specimens above rather than reading a static picture of them.
      </p>
    </div>
  );
}

function TokensPanel({ tokens, overrides, setOverride, clear }) {
  const [q, setQ] = React.useState("");
  const list = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? tokens.filter(t => t.name.toLowerCase().includes(needle)) : tokens;
  }, [q, tokens]);
  const shown = list.slice(0, 120);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter tokens, e.g. surface or radius" style={inputCss} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--dt-text-tertiary)" }}>
          {list.length} of {tokens.length}{shown.length < list.length ? " · showing first 120" : ""}
        </span>
        {Object.keys(overrides).length > 0 && (
          <button onClick={clear} style={{
            appearance: "none", cursor: "pointer", padding: "4px 9px",
            borderRadius: "var(--dt-radius-control)", border: "var(--dt-border-width-default) solid var(--dt-border-default)",
            background: "var(--dt-surface-base)", color: "var(--dt-text-secondary)", font: "inherit", fontSize: 11,
          }}>Clear {Object.keys(overrides).length}</button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {shown.map(t => {
          const val = overrides[t.name] ?? t.value;
          const dirty = t.name in overrides;
          const swatch = /color|surface|text|border|accent/.test(t.name) && /^(oklch|#|rgb|hsl)/.test(val);
          return (
            <div key={t.name} style={{
              display: "grid", gridTemplateColumns: swatch ? "14px 1fr 96px" : "1fr 96px",
              gap: 8, alignItems: "center", padding: "3px 4px", borderRadius: 4,
              background: dirty ? "var(--dt-surface-selected)" : "transparent",
            }}>
              {swatch && <span style={{ width: 14, height: 14, borderRadius: 3, background: val, border: "1px solid var(--dt-border-subtle)" }} />}
              <code style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: 10.5, color: "var(--dt-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.name}>{t.name.replace("--dt-", "")}</code>
              <input value={val} onChange={e => setOverride(t.name, e.target.value)} style={{ ...inputCss, padding: "3px 5px", fontSize: 10.5, fontFamily: "var(--dt-font-family-mono)" }} />
            </div>
          );
        })}
      </div>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: "var(--dt-text-tertiary)", textWrap: "pretty" }}>
        Edits apply to the canvas only and reset on reload. To keep one, put it in <code>tokens/themes/</code>.
      </p>
    </div>
  );
}

function A11yPanel({ spec, values }) {
  const findings = spec.a11y.audit ? spec.a11y.audit(values) : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {findings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--dt-text-tertiary)" }}>This configuration</span>
          {findings.map((f, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, padding: "8px 10px", borderRadius: "var(--dt-radius-control)",
              background: f.ok ? "var(--dt-surface-success-subtle)" : "var(--dt-surface-danger-subtle)",
              border: "var(--dt-border-width-default) solid " + (f.ok ? "var(--dt-border-success)" : "var(--dt-border-danger)"),
            }}>
              <span aria-hidden="true" style={{ color: f.ok ? "var(--dt-text-success)" : "var(--dt-text-danger)", fontWeight: 600 }}>{f.ok ? "✓" : "!"}</span>
              <span style={{ fontSize: "var(--dt-text-body-sm-size)", lineHeight: 1.55, color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{f.text}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--dt-text-tertiary)" }}>Contract</span>
        <ul style={{ margin: 0, paddingLeft: "1.1em", display: "flex", flexDirection: "column", gap: 7 }}>
          {spec.a11y.notes.map((n, i) => (
            <li key={i} style={{ fontSize: "var(--dt-text-body-sm-size)", lineHeight: 1.6, color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{n}</li>
          ))}
        </ul>
      </div>
      {spec.a11y.keys && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--dt-text-tertiary)" }}>Keyboard</span>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {spec.a11y.keys.map(([k, d]) => (
                <tr key={k}>
                  <td style={{ padding: "4px 10px 4px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    <code style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: 11, background: "var(--dt-surface-sunken)", padding: "1px 5px", borderRadius: 3 }}>{k}</code>
                  </td>
                  <td style={{ padding: "4px 0", fontSize: "var(--dt-text-body-sm-size)", lineHeight: 1.55, color: "var(--dt-text-secondary)" }}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsagePanel({ spec }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "1.1em", display: "flex", flexDirection: "column", gap: 10 }}>
      {spec.usage.map((u, i) => (
        <li key={i} style={{ fontSize: "var(--dt-text-body-sm-size)", lineHeight: 1.6, color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{u}</li>
      ))}
    </ul>
  );
}

/* ---------- index ---------- */

function SidebarIndex({ current, groups }) {
  return (
    <nav aria-label="Components" style={{
      width: 208, flex: "none", overflowY: "auto",
      borderRight: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
      background: "var(--dt-surface-subtle)", padding: "16px 12px",
    }}>
      <span style={{ display: "block", fontFamily: "var(--dt-font-family-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--dt-text-tertiary)", padding: "0 8px 10px" }}>Playground</span>
      {groups.map(g => (
        <div key={g.group} style={{ marginBottom: 14 }}>
          <span style={{ display: "block", fontFamily: "var(--dt-font-family-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--dt-text-tertiary)", padding: "0 8px 5px" }}>{g.group}</span>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            {g.items.map(it => {
              const on = it.name === current;
              if (!it.href) {
                return (
                  <li key={it.name}>
                    <span title="Not built yet" style={{ display: "block", padding: "5px 8px", borderRadius: "var(--dt-radius-control)", fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-text-disabled)" }}>{it.name}</span>
                  </li>
                );
              }
              return (
                <li key={it.name}>
                  <a href={it.href} aria-current={on ? "page" : undefined} style={{
                    display: "block", padding: "5px 8px", borderRadius: "var(--dt-radius-control)",
                    textDecoration: "none", fontSize: "var(--dt-text-body-sm-size)",
                    background: on ? "var(--dt-surface-selected)" : "transparent",
                    color: on ? "var(--dt-text-on-selected)" : "var(--dt-text-secondary)",
                    fontWeight: on ? "var(--dt-font-weight-medium)" : "var(--dt-font-weight-regular)",
                  }}>{it.name}</a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ---------- shell ---------- */

function Playground({ spec, NS, groups }) {
  const defaults = React.useMemo(() => {
    const d = {};
    spec.props.forEach(p => { if (p.default !== undefined) d[p.name] = p.default; });
    return d;
  }, [spec]);

  const [values, setValues] = React.useState(defaults);
  const [tab, setTab] = React.useState("props");
  const [overrides, setOverrides] = React.useState({});
  const [ctx, setCtx] = React.useState("dt-context-product");
  const [dark, setDark] = React.useState(false);
  const canvas = React.useRef(null);
  const tokens = React.useMemo(readAllTokens, []);

  React.useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    for (const k in overrides) el.style.setProperty(k, overrides[k]);
  }, [overrides]);

  function setOverride(name, value) { setOverrides(o => ({ ...o, [name]: value })); }
  function clearOverrides() {
    const el = canvas.current;
    if (el) Object.keys(overrides).forEach(k => el.style.removeProperty(k));
    setOverrides({});
  }

  const code = spec.code(values, defaults);
  const TABS = [
    ["props", "Props"], ["code", "Code"], ["states", "States"],
    ["tokens", "Tokens"], ["a11y", "A11y"], ["usage", "Usage"],
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--dt-surface-base)" }}>
      <SidebarIndex current={spec.name} groups={groups} />

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "16px 24px", borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: 0, fontFamily: "var(--dt-text-heading-sm-family)", fontSize: "var(--dt-text-heading-sm-size)", fontWeight: "var(--dt-font-weight-semibold)", color: "var(--dt-text-primary)" }}>{spec.name}</h1>
            <p style={{ margin: "3px 0 0", maxWidth: "70ch", fontSize: "var(--dt-text-body-sm-size)", lineHeight: 1.55, color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{spec.summary}</p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={ctx} onChange={e => setCtx(e.target.value)} style={{ ...inputCss, width: "auto", fontSize: 12 }} aria-label="Context">
              <option value="dt-context-product">Product</option>
              <option value="dt-context-marketing">Marketing</option>
            </select>
            <button onClick={() => setDark(d => !d)} aria-pressed={dark} style={{
              appearance: "none", cursor: "pointer", padding: "6px 12px", borderRadius: "var(--dt-radius-control)",
              border: "var(--dt-border-width-default) solid var(--dt-border-default)",
              background: dark ? "var(--dt-surface-action)" : "var(--dt-surface-base)",
              color: dark ? "var(--dt-text-on-action)" : "var(--dt-text-secondary)", font: "inherit", fontSize: 12,
            }}>{dark ? "Dark" : "Light"}</button>
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <section aria-label="Canvas" style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 32, background: "var(--dt-surface-subtle)" }}>
            <div
              ref={canvas}
              className={ctx + (dark ? " dark" : "")}
              style={{
                minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center",
                padding: 40, borderRadius: "var(--dt-radius-container)",
                background: "var(--dt-surface-base)",
                border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
              }}
            >
              {spec.render(values, NS)}
            </div>
          </section>

          <aside aria-label="Inspector" style={{
            width: 360, flex: "none", display: "flex", flexDirection: "column",
            borderLeft: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
            background: "var(--dt-surface-base)",
          }}>
            <div role="tablist" aria-label="Inspector panels" style={{ display: "flex", gap: 2, padding: "0 10px", borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)", overflowX: "auto" }}>
              {TABS.map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{
                  appearance: "none", border: "none", background: "transparent", cursor: "pointer",
                  padding: "10px 8px", whiteSpace: "nowrap",
                  borderBottom: "2px solid " + (tab === id ? "var(--dt-border-selected)" : "transparent"),
                  fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
                  fontWeight: "var(--dt-font-weight-medium)",
                  color: tab === id ? "var(--dt-text-primary)" : "var(--dt-text-tertiary)",
                }}>{label}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {tab === "props" && <PropsPanel spec={spec} values={values} set={(k, v) => setValues(s => ({ ...s, [k]: v }))} reset={() => setValues(defaults)} />}
              {tab === "code" && <CodePanel code={code} />}
              {tab === "states" && <StatesPanel spec={spec} NS={NS} />}
              {tab === "tokens" && <TokensPanel tokens={tokens} overrides={overrides} setOverride={setOverride} clear={clearOverrides} />}
              {tab === "a11y" && <A11yPanel spec={spec} values={values} />}
              {tab === "usage" && <UsagePanel spec={spec} />}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ---------- boot ---------- */

PG.mount = function () {
  const NS_KEY = "BeamMobileDesignSystem_e33121";
  const TICK = 40, DEADLINE = 8000;
  let waited = 0;

  (function poll() {
    const ns = window[NS_KEY];
    const spec = window.DT_SPECS && window.DT_SPECS[window.DT_PLAYGROUND];
    const ready = ns && spec && spec.needs.every(n => ns[n]);
    if (ready) {
      ReactDOM.createRoot(document.getElementById("root")).render(
        <Playground spec={spec} NS={ns} groups={window.DT_INDEX || []} />
      );
      return;
    }
    waited += TICK;
    if (waited > DEADLINE) {
      const why = !ns
        ? "<code>_ds_bundle.js</code> did not load."
        : !spec
          ? "No spec is registered for <code>" + window.DT_PLAYGROUND + "</code> in <code>playground-specs.js</code>."
          : "The bundle is missing: <code>" + spec.needs.filter(n => !ns[n]).join(", ") + "</code>.";
      document.getElementById("root").innerHTML =
        '<div role="alert" style="max-width:62ch;margin:48px auto;padding:20px 24px;border:1px solid #d4d4d8;border-radius:8px;' +
        'font:14px/1.6 ui-sans-serif,system-ui,sans-serif;color:#3f3f46">' +
        '<strong style="display:block;margin-bottom:6px;color:#18181b">Playground could not start</strong>' + why + '</div>';
      return;
    }
    setTimeout(poll, TICK);
  })();
};

Object.assign(window, { DT_PG: PG, dtMountPlayground: PG.mount });
