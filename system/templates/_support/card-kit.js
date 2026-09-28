/* GENERATED from card-kit.jsx by tools/build-bundle.mjs. Edit the .jsx and rebuild.
   Card kit: the shared chrome for @dsCard component pages (Shelf, PropTable,
   Guidance, Specimen, PageHead), as globals the cards call. */
/* Card kit — shared chrome for @dsCard component pages: Shelf, PropTable,
   Guidance, Specimen and PageHead, as globals the cards call.

   This is the source. tools/build-bundle.mjs compiles it to card-kit.js, which
   every card loads with a plain <script src>; edit this file, then run
   `npm run build`. Not a design-system component: it lives outside
   system/components, so it never enters the bundle. */

function Shelf({
  name,
  summary,
  children,
  props: propList = [],
  guidance = [],
  status = "Stable"
}) {
  const [tab, setTab] = React.useState("preview");
  const tabBtn = on => ({
    appearance: "none",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "var(--dt-space-inset-2xs, 4px) 0",
    marginRight: "var(--dt-space-inline-md)",
    fontFamily: "var(--dt-text-label-sm-family)",
    fontSize: "var(--dt-text-label-sm-size)",
    fontWeight: "var(--dt-font-weight-medium)",
    color: on ? "var(--dt-text-primary)" : "var(--dt-text-tertiary)",
    borderBottom: "2px solid " + (on ? "var(--dt-border-selected)" : "transparent")
  });
  return /*#__PURE__*/React.createElement("section", {
    style: {
      border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
      borderRadius: "var(--dt-radius-container)",
      background: "var(--dt-surface-base)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: "var(--dt-space-inset-md) var(--dt-space-inset-md) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "var(--dt-space-inline-sm)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--dt-text-heading-xs-family)",
      fontSize: "var(--dt-text-heading-xs-size)",
      fontWeight: "var(--dt-font-weight-semibold)",
      color: "var(--dt-text-primary)"
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--dt-font-family-mono)",
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--dt-text-tertiary)",
      border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
      borderRadius: "var(--dt-radius-pill)",
      padding: "1px 7px"
    }
  }, status)), summary && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--dt-space-stack-2xs) 0 0",
      maxWidth: "70ch",
      textWrap: "pretty",
      fontFamily: "var(--dt-text-body-sm-family)",
      fontSize: "var(--dt-text-body-sm-size)",
      lineHeight: "var(--dt-text-body-sm-line)",
      color: "var(--dt-text-secondary)"
    }
  }, summary), /*#__PURE__*/React.createElement("nav", {
    style: {
      marginTop: "var(--dt-space-stack-sm)",
      borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: tabBtn(tab === "preview"),
    onClick: () => setTab("preview")
  }, "Preview"), propList.length > 0 && /*#__PURE__*/React.createElement("button", {
    style: tabBtn(tab === "props"),
    onClick: () => setTab("props")
  }, "Props"), guidance.length > 0 && /*#__PURE__*/React.createElement("button", {
    style: tabBtn(tab === "usage"),
    onClick: () => setTab("usage")
  }, "Usage"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--dt-space-inset-md)"
    }
  }, tab === "preview" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--dt-space-stack-lg)"
    }
  }, children), tab === "props" && /*#__PURE__*/React.createElement(PropTable, {
    rows: propList
  }), tab === "usage" && /*#__PURE__*/React.createElement(Guidance, {
    items: guidance
  })));
}
function PropTable({
  rows = []
}) {
  const th = {
    textAlign: "left",
    padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm) var(--dt-space-inset-xs) 0",
    fontFamily: "var(--dt-text-label-sm-family)",
    fontSize: "var(--dt-text-label-sm-size)",
    fontWeight: "var(--dt-font-weight-medium)",
    color: "var(--dt-text-secondary)",
    borderBottom: "var(--dt-border-width-default) solid var(--dt-border-default)",
    whiteSpace: "nowrap"
  };
  const td = {
    padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm) var(--dt-space-inset-xs) 0",
    borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
    fontFamily: "var(--dt-text-body-sm-family)",
    fontSize: "var(--dt-text-body-sm-size)",
    color: "var(--dt-text-secondary)",
    verticalAlign: "top"
  };
  const mono = {
    fontFamily: "var(--dt-font-family-mono)",
    fontSize: "12px",
    color: "var(--dt-text-primary)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "prop-table",
    style: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 520
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Prop"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Type"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Default"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      width: "45%"
    }
  }, "Notes"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.name
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      ...mono,
      whiteSpace: "nowrap"
    }
  }, r.name, r.required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--dt-text-danger)"
    }
  }, "*")), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      ...mono,
      color: "var(--dt-text-secondary)"
    }
  }, r.type), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      ...mono,
      color: "var(--dt-text-tertiary)"
    }
  }, r.default ?? "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textWrap: "pretty"
    }
  }, r.notes))))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--dt-space-stack-xs) 0 0",
      fontFamily: "var(--dt-text-body-xs-family)",
      fontSize: "var(--dt-text-body-xs-size)",
      color: "var(--dt-text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--dt-text-danger)"
    }
  }, "*"), " required"));
}
function Guidance({
  items = []
}) {
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: "1.1em",
      display: "flex",
      flexDirection: "column",
      gap: "var(--dt-space-stack-xs)",
      maxWidth: "72ch"
    }
  }, items.map((g, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      fontFamily: "var(--dt-text-body-sm-family)",
      fontSize: "var(--dt-text-body-sm-size)",
      lineHeight: "var(--dt-text-body-sm-line)",
      color: "var(--dt-text-secondary)",
      textWrap: "pretty"
    }
  }, g)));
}
function Specimen({
  label,
  children,
  bg
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--dt-space-stack-2xs)"
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--dt-font-family-mono)",
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--dt-text-tertiary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--dt-space-inset-md)",
      borderRadius: "var(--dt-radius-container)",
      background: bg || "var(--dt-surface-subtle)",
      border: "var(--dt-border-width-default) solid var(--dt-border-subtle)"
    }
  }, children));
}
function PageHead({
  title,
  subtitle
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--dt-space-stack-2xs)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--dt-text-heading-md-family)",
      fontSize: "var(--dt-text-heading-md-size)",
      fontWeight: "var(--dt-font-weight-semibold)",
      letterSpacing: "var(--dt-text-heading-md-tracking)",
      color: "var(--dt-text-primary)"
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: "72ch",
      textWrap: "pretty",
      fontFamily: "var(--dt-text-body-md-family)",
      fontSize: "var(--dt-text-body-md-size)",
      lineHeight: "var(--dt-text-body-md-line)",
      color: "var(--dt-text-secondary)"
    }
  }, subtitle));
}

/* dsReady — mounts once the design-system bundle actually carries the components the
   page needs.

   Two failure modes this exists to survive. A browser holding a stale _ds_bundle.js
   defines the namespace without the newer exports; rendering then produces undefined
   elements and React empties the container. A bundle mid-recompile 404s outright and the
   namespace never appears at all.

   So: poll, refetch past the cache once, and give up out loud. A page that cannot mount
   says why on screen — never a white rectangle. */
function dsReady(required, done) {
  var NS_KEY = "BeamMobileDesignSystem_e33121";
  var REFETCH_AT = 1200,
    DEADLINE = 8000,
    TICK = 40;
  var waited = 0,
    refetched = false;
  function missing() {
    var ns = window[NS_KEY];
    if (!ns) return required.slice();
    var out = [];
    for (var i = 0; i < required.length; i++) if (!ns[required[i]]) out.push(required[i]);
    return out;
  }
  function refetch() {
    var base = document.querySelector('script[src$="_ds_bundle.js"]');
    var s = document.createElement("script");
    s.src = (base ? base.getAttribute("src") : "_ds_bundle.js") + "?cb=" + Date.now();
    document.head.appendChild(s);
  }
  (function poll() {
    var gaps = missing();
    if (gaps.length === 0 && window.PageHead) return done(window[NS_KEY]);
    waited += TICK;
    if (waited > REFETCH_AT && !refetched) {
      refetched = true;
      refetch();
    }
    if (waited > DEADLINE) return fail(gaps);
    setTimeout(poll, TICK);
  })();
  function fail(gaps) {
    var root = document.getElementById("root");
    if (!root) return;
    var noNs = !window[NS_KEY];
    root.innerHTML = '<div role="alert" style="max-width:62ch;margin:48px auto;padding:20px 24px;' + 'border:1px solid #d4d4d8;border-radius:8px;background:#fff;' + 'font:14px/1.6 ui-sans-serif,system-ui,sans-serif;color:#3f3f46">' + '<strong style="display:block;margin-bottom:6px;color:#18181b">This card could not load the design system</strong>' + (noNs ? '<code>_ds_bundle.js</code> did not load. It is regenerated whenever components change — reload in a moment.' : 'The loaded bundle is missing: <code>' + gaps.join(", ") + '</code>. This is usually a cached copy — hard reload to clear it.') + '</div>';
  }
}
Object.assign(window, {
  Shelf,
  PropTable,
  Guidance,
  Specimen,
  PageHead,
  dsReady
});
