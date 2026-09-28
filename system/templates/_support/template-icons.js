/* Template icons: the line icons the marketing and dashboard templates draw with.

   Dovetail ships no icon set (a product brings Lucide, Heroicons or its own), so
   these are demo chrome, not a component. They are drawn to the convention the
   system documents: a 24px grid, round caps and joins, no fill, and colour
   inherited from the text. They are stroked, so Configure's icon stroke and
   size controls move them with everything else. They are not copies of any
   library's glyphs.

   Load it after React, before the template renders:
     <script src="../system/templates/_support/template-icons.js"></script>

     const { Icon } = window.DovetailTemplateIcons;
     <Icon name="layers" />              20px, from --dt-size-icon-md
     <Icon name="play" size="lg" />      xs | sm | md | lg | xl

   It lives under templates/ because the design-system compiler sweeps every .js in the
   project into _ds_bundle.js, and templates/ is the one tree it skips. */
(function () {
  var PATHS = {
    arrowRight: ["M4.5 12h15", "m13.5 6 6 6-6 6"],
    plus: ["M12 5v14", "M5 12h14"],
    check: ["m5 12.5 4.5 4.5L19 7.5"],
    download: ["M12 3.5v11", "m7.5 10 4.5 4.5 4.5-4.5", "M4.5 20.5h15"],
    send: ["M20.5 3.5 10 14", "m20.5 3.5-6.5 17-4-6.5-6.5-4 17-6.5Z"],
    search: ["M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m20.5 20.5-5-5"],
    bell: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z", "M10 21h4"],
    clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7.5V12l3 2"],
    calendar: ["M5.5 4.5h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z", "M3.5 9.5h17", "M8 2.5v4", "M16 2.5v4"],
    book: ["M4 18.5A2.5 2.5 0 0 1 6.5 16H20", "M6.5 2.5H20v19H6.5A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2.5-2.5Z"],
    play: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M10 8.5v7l5.5-3.5-5.5-3.5Z"],
    sparkle: ["M12 3.5c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z", "M19 17.5v3", "M17.5 19h3"],
    layers: ["M12 3 3 7.5 12 12l9-4.5L12 3Z", "m3 16.5 9 4.5 9-4.5", "m3 12 9 4.5L21 12"],
    blocks: ["M4.5 3h4.5a1.5 1.5 0 0 1 1.5 1.5V9A1.5 1.5 0 0 1 9 10.5H4.5A1.5 1.5 0 0 1 3 9V4.5A1.5 1.5 0 0 1 4.5 3Z", "M15 3h4.5A1.5 1.5 0 0 1 21 4.5V9a1.5 1.5 0 0 1-1.5 1.5H15A1.5 1.5 0 0 1 13.5 9V4.5A1.5 1.5 0 0 1 15 3Z", "M4.5 13.5H9a1.5 1.5 0 0 1 1.5 1.5v4.5A1.5 1.5 0 0 1 9 21H4.5A1.5 1.5 0 0 1 3 19.5V15a1.5 1.5 0 0 1 1.5-1.5Z", "M17.25 13.5v7.5", "M13.5 17.25H21"],
    box: ["m20.5 7.5-8.5-4.5-8.5 4.5v9l8.5 4.5 8.5-4.5v-9Z", "m3.5 7.5 8.5 4.5 8.5-4.5", "M12 12v9"],
    shield: ["M12 21s7.5-3.5 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.5 12 21 12 21Z", "m9 12 2 2 4-4"],
    zap: ["M13 2.5 4 13.5h7l-1 8 9-11h-7l1-8Z"],
    palette: ["M12 21a9 9 0 1 1 9-9c0 2.5-2 3.5-3.5 3.5H15a2 2 0 0 0-1.5 3.3c.5.6.3 2.2-1.5 2.2Z", "M7.5 12h.01", "M9.5 7.5h.01", "M14.5 7.5h.01", "M16.5 12h.01"],
    grid: ["M3.5 3.5h7v7h-7z", "M13.5 3.5h7v7h-7z", "M3.5 13.5h7v7h-7z", "M13.5 13.5h7v7h-7z"],
    file: ["M13.5 2.5h-7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-11l-6-6Z", "M13.5 2.5v6h6", "M8.5 13h7", "M8.5 17h5"],
    users: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M2.5 20a6.5 6.5 0 0 1 13 0", "M16 4.3a3.5 3.5 0 0 1 0 6.4", "M18.5 14.5a6.5 6.5 0 0 1 3 5.5"],
    userPlus: ["M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M3 20a6.5 6.5 0 0 1 13 0", "M19 8v6", "M16 11h6"],
    plug: ["M9 2.5v5", "M15 2.5v5", "M6 7.5h12v3a6 6 0 0 1-12 0v-3Z", "M12 16.5v5"],
    card: ["M4.5 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z", "M2.5 10h19", "M6.5 15h4"],
    lock: ["M6.5 10.5h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z", "M8 10.5V7a4 4 0 0 1 8 0v3.5"],
    wallet: ["M4.5 5.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z", "M19.5 10h-4a2.5 2.5 0 0 0 0 5h4", "M15.5 12.5h.01", "M4.5 5.5 14 2.5l1 3"],
    trendUp: ["m3.5 17 6-6 4 4 7-7.5", "M15 7.5h5.5V13"],
    alert: ["M10.3 4 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z", "M12 9.5v4", "M12 17h.01"],
    image: ["M5 3.5h14A1.5 1.5 0 0 1 20.5 5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z", "M9 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", "m20.5 15-5-5-11 10.5"],
    film: ["M5 3.5h14A1.5 1.5 0 0 1 20.5 5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z", "M7.5 3.5v17", "M16.5 3.5v17", "M3.5 12h17", "M3.5 7.75h4", "M3.5 16.25h4", "M16.5 7.75h4", "M16.5 16.25h4"],
    pen: ["M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4.5 1.5L5 15 16.5 3.5Z", "m14.5 5.5 3 3"]
  };

  var SIZES = { xs: 1, sm: 1, md: 1, lg: 1, xl: 1 };

  /* Reads React at call time, so the file can load before or after it. */
  function Icon(props) {
    var h = window.React.createElement;
    var name = props.name;
    var size = SIZES[props.size] ? props.size : "md";
    var dim = "var(--dt-size-icon-" + size + ")";
    var d = PATHS[name] || [];
    return h(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.75",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": props.label ? undefined : "true",
        "aria-label": props.label,
        role: props.label ? "img" : undefined,
        focusable: "false",
        style: Object.assign({ width: dim, height: dim, flex: "none", display: "block" }, props.style)
      },
      d.map(function (p, i) { return h("path", { key: i, d: p }); })
    );
  }

  window.DovetailTemplateIcons = { Icon: Icon, names: Object.keys(PATHS) };
})();
