/* Solace — a single "Today" screen, composed from Dovetail.

   A test of how close the system gets to a native mobile app's look without a single
   bespoke component library: the controls are Dovetail's (IconButton, Button, Tag,
   Drawer, List, Progress, Toast), and the rest — the painted sea, the glass rings, the
   day timeline — is layout and tokens in theme.css. Written with React.createElement so
   the page runs with no build step, like every other example here. */
(function () {
  var NS = window.BeamMobileDesignSystem_e33121;
  var h = React.createElement;
  var F = React.Fragment;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback;

  var reduceMotion = (function () {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  })();

  /* ----------------------------------------------------------------- icons
     Drawn on the 24px grid the system documents: round caps, inherited colour. */
  function svg(paths, size, extra) {
    return h("svg", Object.assign({
      width: size || 22, height: size || 22, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round",
      "aria-hidden": "true", focusable: "false"
    }, extra || {}), paths.map(function (d, i) { return h("path", { key: i, d: d }); }));
  }
  var I = {
    menu: function () { return svg(["M4 7h16", "M4 12h16", "M4 17h16"], 26); },
    share: function () { return svg(["M12 15V3", "m7 8 5-5 5 5", "M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"], 24); },
    ring: function () {
      return h("svg", { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": "true" },
        h("circle", { cx: 12, cy: 12, r: 9 }), h("circle", { cx: 12, cy: 12, r: 4.5 }));
    },
    sprout: function () { return svg(["M12 20v-8", "M12 12c0-4 3-6 7-6 0 4-3 6-7 6Z", "M12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5Z"], 18); },
    moon: function () { return svg(["M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"], 18); },
    crown: function () { return svg(["M4 17h16", "M5 17 4 8l5 4 3-6 3 6 5-4-1 9"], 18); },
    sun: function () { return svg(["M12 3v2", "M12 19v2", "m5.6 5.6 1.4 1.4", "m17 17 1.4 1.4", "M3 12h2", "M19 12h2", "m5.6 18.4 1.4-1.4", "M17 7l1.4-1.4", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"], 18); },
    heart: function () { return svg(["M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"], 18); },
    bed: function (s) { return svg(["M3 18V6", "M3 14h18v4", "M21 14v-3a3 3 0 0 0-3-3h-7v6", "M7 11h.01"], s || 16); },
    close: function () { return svg(["M6 6l12 12", "M18 6 6 18"], 22); },
    info: function () {
      return h("svg", { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", "aria-hidden": "true" },
        h("circle", { cx: 12, cy: 12, r: 9 }), h("path", { d: "M12 11v5" }), h("path", { d: "M12 8h.01" }));
    },
    check: function () { return svg(["m5 12 5 5 9-10"], 20); },
    waves: function () { return svg(["M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0", "M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"], 22); },
    plus: function (s) { return svg(["M12 5v14", "M5 12h14"], s || 20); },
    sparkPlus: function () { return svg(["M11 7v10", "M6 12h10", "M18 3v4", "M16 5h4"], 28); },
    today: function () { return svg(["M12 3v2", "M12 19v2", "m5.6 5.6 1.4 1.4", "m17 17 1.4 1.4", "M3 12h2", "M19 12h2", "m5.6 18.4 1.4-1.4", "M17 7l1.4-1.4", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"], 24); },
    leaf: function () { return svg(["M5 19c0-8 5-14 14-14 0 9-6 14-14 14Z", "M5 19 14 10"], 24); },
    tree: function () { return svg(["M12 21v-7", "M8 14a5 5 0 1 1 8 0", "M9 9a3 3 0 0 1 6 0"], 24); }
  };

  /* ----------------------------------------------------------------- data */

  var SCORES = [
    { id: "readiness", label: "Readiness", value: 81, icon: I.sprout,
      summary: "Well recovered. A good day for a harder session.",
      contributors: [["Resting heart rate", 88], ["HRV balance", 74], ["Body temperature", 92], ["Recovery index", 69], ["Previous day activity", 81]] },
    { id: "sleep", label: "Sleep", value: 79, icon: I.moon,
      summary: "7h 12m, with more deep sleep than your average.",
      contributors: [["Total sleep", 76], ["Efficiency", 88], ["Restfulness", 71], ["REM sleep", 64], ["Deep sleep", 90], ["Timing", 82]] },
    { id: "activity", label: "Activity", value: 98, icon: I.crown,
      summary: "You met your goal before noon, and kept moving.",
      contributors: [["Stay active", 95], ["Move every hour", 100], ["Meet daily targets", 98], ["Training frequency", 96], ["Recovery time", 92]] },
    { id: "cycle", label: "Cycle day", value: 29, icon: I.sun, unit: "day",
      summary: "Late luteal phase. Temperature trending down.",
      contributors: [] },
    { id: "heart", label: "Heart rate", value: 58, icon: I.heart, unit: "bpm",
      summary: "Resting heart rate, lowest in the last hour of sleep.",
      contributors: [] }
  ];

  var TAGS = ["Work", "Meeting", "Commute", "Caffeine", "Exercise", "Social", "Screen time", "Travel", "Family", "Other"];

  /* The day runs 7:01 to midnight; everything on the timeline is placed on that span. */
  var DAY_START = 7 + 1 / 60, DAY_END = 24;
  function pos(hour) { return ((hour - DAY_START) / (DAY_END - DAY_START)) * 100; }
  var NOW = 14 + 50 / 60, STRESS = [13.75, 14.75];

  /* ----------------------------------------------------------------- the sea
     SVG turbulence stretched wide and tinted slate: a procedural stand-in for a
     photograph, so the example ships no borrowed imagery. The base frequency drifts
     very slowly, which reads as the swell moving; reduced motion drops the animate. */
  function Sea() {
    return h("div", { className: "sl-sea", "aria-hidden": "true" },
      h("svg", { viewBox: "0 0 430 560", preserveAspectRatio: "xMidYMid slice" },
        h("defs", null,
          h("filter", { id: "sl-swell", x: 0, y: 0, width: "100%", height: "100%" },
            h("feTurbulence", { type: "fractalNoise", baseFrequency: "0.005 0.03", numOctaves: 5, seed: 11, result: "n" },
              reduceMotion ? null : h("animate", { attributeName: "baseFrequency", dur: "30s", values: "0.005 0.03;0.0058 0.034;0.005 0.03", repeatCount: "indefinite" })),
            /* Luminance of the noise drives brightness, so peaks read as lit crests and
               troughs as dark water, rather than the noise only fading a flat tint. */
            h("feColorMatrix", { in: "n", type: "matrix",
              values: "0.85 0 0 0 0.04  0.85 0 0 0 0.06  0.85 0 0 0 0.09  0 0 0 0 1" }),
            h("feComponentTransfer", null,
              h("feFuncR", { type: "linear", slope: 2.4, intercept: -0.72 }),
              h("feFuncG", { type: "linear", slope: 2.4, intercept: -0.70 }),
              h("feFuncB", { type: "linear", slope: 2.3, intercept: -0.64 }))
          ),
          h("linearGradient", { id: "sl-depth", x1: 0, y1: 0, x2: 0, y2: 1 },
            h("stop", { offset: 0, stopColor: "#5c6878" }),
            h("stop", { offset: 0.55, stopColor: "#2c3542" }),
            h("stop", { offset: 1, stopColor: "#161b22" }))
        ),
        h("rect", { width: 430, height: 560, fill: "url(#sl-depth)" }),
        h("rect", { width: 430, height: 560, filter: "url(#sl-swell)", opacity: 0.55, style: { mixBlendMode: "screen" } })
      )
    );
  }

  /* ----------------------------------------------------------------- pieces */

  function ScoreRing(props) {
    var s = props.score;
    var r = 38.5, c = 2 * Math.PI * r;
    var pct = s.unit ? 1 : s.value / 100;
    return h("button", { type: "button", className: "sl-score", onClick: function () { props.onOpen(s); },
      "aria-label": s.label + " " + s.value + (s.unit ? " " + s.unit : "") },
      h("span", { className: "sl-ring" },
        s.unit ? null : h("svg", { className: "sl-arc", width: 80, height: 80, viewBox: "0 0 80 80", "aria-hidden": "true" },
          h("circle", { cx: 40, cy: 40, r: r, fill: "none", stroke: "currentColor", strokeOpacity: 0.55, strokeWidth: 1.5,
            strokeDasharray: (c * pct).toFixed(1) + " " + c.toFixed(1), strokeLinecap: "round" })),
        s.icon(),
        h("span", { className: "sl-ring-value" }, s.value)
      ),
      h("span", { className: "sl-score-label" }, s.label)
    );
  }

  function NapCard(props) {
    var st = useState("idle"); /* idle -> confirmed -> gone */
    var state = st[0], set = st[1];
    function confirm() {
      set("confirmed");
      props.notify("Nap added", "1h 30m counted toward today's sleep.");
      setTimeout(function () { set("gone"); }, reduceMotion ? 0 : 900);
    }
    function dismiss() { set("gone"); props.notify("Nap dismissed", null); }
    var gone = state === "gone";
    return h(F, null,
      h("div", { className: "sl-row", style: { opacity: gone ? 0 : 1, transition: "opacity 300ms" }, "aria-hidden": gone },
        h("span", { className: "sl-chip" }, "Nap detected"),
        h(NS.IconButton, { label: "About nap detection", variant: "ghost", size: "md", onClick: props.onInfo }, I.info())
      ),
      h("section", { className: "sl-glass", "data-gone": gone ? "true" : "false", "aria-label": "Detected nap", "aria-hidden": gone },
        h("div", { className: "sl-row" },
          h(NS.Inline, { gap: "sm", align: "center" },
            h("span", { className: "sl-badge-icon" }, I.bed(16)),
            h("span", { className: "sl-title" }, "Nap")),
          h(NS.IconButton, { label: "Dismiss nap", variant: "ghost", size: "md", onClick: dismiss, tabIndex: gone ? -1 : 0 }, I.close())
        ),
        h("div", { className: "sl-meta" },
          h("span", null, "1:07 PM"),
          h(NS.Inline, { gap: "2xs", align: "center" }, I.bed(18), h("span", null, "1h 30m"))
        ),
        h(NS.Button, { variant: "secondary", size: "lg", fullWidth: true, onClick: confirm, disabled: state !== "idle", tabIndex: gone ? -1 : 0,
          iconStart: I.check() }, state === "confirmed" ? "Confirmed" : "Confirm")
      )
    );
  }

  function Timeline(props) {
    var sel = props.selected;
    return h("div", { className: "sl-timeline" },
      h("div", { className: "sl-window", style: { paddingLeft: "calc(" + pos(STRESS[0]) + "% - 3.5rem)" } }, "1:45 PM–2:45 PM"),
      h("div", { className: "sl-track" },
        h("span", { className: "sl-past", style: { width: "calc(" + pos(NOW) + "% - 6px)" } }),
        h("span", { className: "sl-future", style: { width: "calc(" + (100 - pos(NOW)) + "% - 6px)" } }),
        h("button", {
          type: "button", className: "sl-block", "aria-pressed": sel,
          "aria-label": "Stress from 1:45 PM to 2:45 PM. Add a tag.",
          style: { left: pos(STRESS[0]) + "%", width: (pos(STRESS[1]) - pos(STRESS[0])) + "%" },
          onClick: props.onTag
        }),
        h("span", { className: "sl-now", style: { left: pos(NOW) + "%" }, "aria-hidden": "true" })
      ),
      h("div", { className: "sl-ticks", "aria-hidden": "true" },
        h("span", { style: { left: 0 } }, "7:01 am"),
        h("span", { style: { left: pos(12) + "%" } }, "12 pm"),
        h("span", { style: { left: pos(NOW) + "%" } }, "Now"),
        h("span", { style: { left: pos(18) + "%" } }, "6 pm"),
        h("span", { style: { left: "100%" } }, "12 am")
      )
    );
  }

  /* ----------------------------------------------------------------- app */

  function App() {
    var tab = useState("today");
    var detail = useState(null);
    var tagOpen = useState(false);
    var addOpen = useState(false);
    var infoOpen = useState(false);
    var chosen = useState([]);
    var draft = useState([]);
    var toasts = useState([]);

    var notify = useCallback(function (title, body) {
      var id = Date.now() + Math.random();
      toasts[1](function (l) { return l.concat([{ id: id, title: title, body: body }]); });
      setTimeout(function () { toasts[1](function (l) { return l.filter(function (t) { return t.id !== id; }); }); }, 3000);
    }, []);

    function openTags() { draft[1](chosen[0].slice()); tagOpen[1](true); }
    function toggleDraft(t) {
      draft[1](function (d) { return d.indexOf(t) === -1 ? d.concat([t]) : d.filter(function (x) { return x !== t; }); });
    }
    function saveTags() {
      chosen[1](draft[0]);
      tagOpen[1](false);
      if (draft[0].length) notify(draft[0].length === 1 ? "Tag added" : draft[0].length + " tags added", draft[0].join(", "));
    }

    var s = detail[0];

    return h("div", { className: "sl-app" },
      h(Sea),

      h("header", { className: "sl-top" },
        h("div", null, h(NS.IconButton, { label: "Menu", variant: "ghost", size: "lg", onClick: function () { notify("Menu", "Profile, settings and help live here."); } }, I.menu())),
        h("span", { className: "sl-wordmark", "aria-label": "Solace" }, "Solace"),
        h("div", null,
          h(NS.IconButton, { label: "Share today", variant: "ghost", size: "lg", onClick: function () { notify("Share", "A summary card of today is ready."); } }, I.share()),
          h(NS.IconButton, { label: "Ring status", variant: "ghost", size: "lg", onClick: function () { notify("Ring connected", "Battery 100%. Last sync 2 minutes ago."); } }, I.ring())
        )
      ),

      h("main", null,
        h("nav", { className: "sl-scores", "aria-label": "Today's scores" },
          SCORES.map(function (sc) { return h(ScoreRing, { key: sc.id, score: sc, onOpen: detail[1] }); })
        ),

        h("div", { className: "sl-body" },
          h(NapCard, { notify: notify, onInfo: function () { infoOpen[1](true); } })
        ),

        h("section", { className: "sl-insight", "aria-labelledby": "sl-stress" },
          h("span", { className: "sl-insight-icon" }, I.waves()),
          h("span", { className: "sl-eyebrow", id: "sl-stress" }, "Daytime stress"),
          h("h1", { className: "sl-headline" }, "Your body experienced a continuous period of stress"),
          h("p", { className: "sl-question" }, "What was happening at the time?"),
          h(Timeline, { selected: tagOpen[0], onTag: openTags }),
          chosen[0].length ? h("div", { className: "sl-tags", "aria-label": "Tags" },
            chosen[0].map(function (t) { return h(NS.Tag, { key: t, onRemove: function () { chosen[1](chosen[0].filter(function (x) { return x !== t; })); } }, t); })
          ) : null,
          h("div", { style: { paddingBlock: "var(--dt-space-stack-lg) var(--dt-space-stack-2xl)" } },
            h(NS.Button, { variant: "secondary", size: "lg", iconStart: I.plus(20), onClick: openTags },
              chosen[0].length ? "Edit tags" : "Add a tag"))
        )
      ),

      h("footer", { className: "sl-tabbar" },
        h("nav", { className: "sl-tabs", "aria-label": "Sections" },
          [["today", "Today", I.today], ["vitals", "Vitals", I.leaf], ["health", "My Health", I.tree]].map(function (t) {
            return h("button", { key: t[0], type: "button", className: "sl-tab",
              "aria-current": tab[0] === t[0] ? "page" : undefined,
              onClick: function () { tab[1](t[0]); if (t[0] !== "today") notify(t[1], "This example builds the Today screen only."); } },
              t[2](), t[1]);
          })
        ),
        h("button", { type: "button", className: "sl-fab", "aria-label": "Add", onClick: function () { addOpen[1](true); } }, I.sparkPlus())
      ),

      /* Score detail: a bottom sheet with each contributor as a Progress bar. */
      h(NS.Drawer, { open: !!s, onClose: function () { detail[1](null); }, side: "bottom", title: s ? s.label : "", label: s ? s.label + " details" : "Score details" },
        s ? h(NS.Stack, { gap: "lg", style: { paddingBottom: "var(--dt-space-stack-lg)" } },
          h("div", { className: "sl-sheet-score" }, h("strong", null, s.value), s.unit ? h("span", null, s.unit) : null),
          h("p", { style: { margin: 0, color: "var(--dt-text-secondary)" } }, s.summary),
          s.contributors.length ? h(NS.Stack, { gap: "md" },
            h("span", { className: "sl-eyebrow" }, "Contributors"),
            s.contributors.map(function (c) { return h(NS.Progress, { key: c[0], label: c[0], value: c[1], showValue: true, size: "sm" }); })
          ) : null
        ) : null
      ),

      /* Tag picker: multi-select chips, saved together. */
      h(NS.Drawer, { open: tagOpen[0], onClose: function () { tagOpen[1](false); }, side: "bottom", title: "What was happening?", label: "Tag this stress period",
        footer: h(NS.Button, { fullWidth: true, size: "lg", onClick: saveTags }, draft[0].length ? "Save " + draft[0].length + (draft[0].length === 1 ? " tag" : " tags") : "Save") },
        h(NS.Stack, { gap: "md", style: { paddingBottom: "var(--dt-space-stack-md)" } },
          h("p", { style: { margin: 0, color: "var(--dt-text-secondary)" } }, "1:45 PM–2:45 PM. Tags help spot what tends to come before stress."),
          h(NS.Inline, { gap: "xs", wrap: true },
            TAGS.map(function (t) {
              return h(NS.Tag, { key: t, selected: draft[0].indexOf(t) !== -1, onClick: function () { toggleDraft(t); },
                role: "checkbox", "aria-checked": draft[0].indexOf(t) !== -1, tabIndex: 0,
                onKeyDown: function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleDraft(t); } } }, t);
            })
          )
        )
      ),

      /* The add sheet behind the floating button. */
      h(NS.Drawer, { open: addOpen[0], onClose: function () { addOpen[1](false); }, side: "bottom", title: "Add", label: "Add something" },
        h(NS.List, { label: "Add options", divided: true, interactive: true, items: [
          { id: "tag", title: "Add a tag", description: "Mark what you did or how you felt", onClick: function () { addOpen[1](false); openTags(); } },
          { id: "activity", title: "Add an activity", description: "Log a workout the ring missed", onClick: function () { addOpen[1](false); notify("Activity", "Workout logging would open here."); } },
          { id: "rest", title: "Start a rest session", description: "Two minutes of guided breathing", onClick: function () { addOpen[1](false); notify("Rest session", "Breathing session would start here."); } }
        ] })
      ),

      h(NS.Drawer, { open: infoOpen[0], onClose: function () { infoOpen[1](false); }, side: "bottom", title: "Nap detection", label: "About nap detection" },
        h("p", { style: { margin: "0 0 var(--dt-space-stack-lg)", color: "var(--dt-text-secondary)" } },
          "When your heart rate and movement settle for more than 15 minutes during the day, it is flagged as a possible nap. Confirm it to count it toward your sleep, or dismiss it.")
      ),

      h(NS.ToastRegion, { placement: "top-center", label: "Notifications" },
        toasts[0].map(function (t) {
          return h(NS.Toast, { key: t.id, tone: "neutral", title: t.title,
            onDismiss: function () { toasts[1](function (l) { return l.filter(function (x) { return x.id !== t.id; }); }); } }, t.body);
        })
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
