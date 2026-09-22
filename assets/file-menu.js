/* The files menu on a component card: read the guide, the typed contract or the
   source without leaving the index.

   The three files are already served — the site publishes `system/` at the paths
   the system was authored with — so this fetches the real file rather than a
   copy of it. Nothing here can show something the repository does not hold.

   The menu renders into a layer on <body> rather than inside the card, because
   on a narrow screen the card sits in a horizontal scroller and anything drawn
   inside it would be clipped by the overflow. */

(function () {
  "use strict";

  var buttons = document.querySelectorAll(".tile-menu-btn");
  if (!buttons.length) return;

  var FILES = [
    { key: "md", label: "Guide", suffix: ".md", note: "When to reach for it, and the rules the types cannot carry" },
    { key: "types", label: "Props", suffix: ".d.ts", note: "The typed contract" },
    { key: "source", label: "Source", suffix: ".jsx", note: "React only, no dependencies, every value a token" },
  ];

  var menu = null;
  var openButton = null;
  var lastFocus = null;
  var cache = {};

  /* ------------------------------------------------------------- the menu */

  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    if (openButton) openButton.setAttribute("aria-expanded", "false");
    openButton = null;
  }

  function openMenu(button) {
    var wasOpen = openButton === button;
    closeMenu();
    if (wasOpen) return;

    var name = button.getAttribute("data-component");
    var available = FILES.filter(function (f) {
      return button.getAttribute("data-" + f.key);
    });
    if (!available.length) return;

    menu = document.createElement("div");
    menu.className = "file-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Files for " + name);

    available.forEach(function (file) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "file-menu-item";
      item.setAttribute("role", "menuitem");
      item.innerHTML =
        '<span class="file-menu-label">' + escapeHtml(file.label) + "</span>" +
        '<code class="file-menu-name">' + escapeHtml(name + file.suffix) + "</code>";
      item.addEventListener("click", function () {
        var href = button.getAttribute("data-" + file.key);
        closeMenu();
        openViewer(name, button, file.key, href);
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    place(menu, button);
    button.setAttribute("aria-expanded", "true");
    openButton = button;
    menu.querySelector(".file-menu-item").focus();
  }

  /* Anchored to the button in viewport coordinates, flipped when it would run
     off the bottom or the right. */
  function place(node, button) {
    var r = button.getBoundingClientRect();
    var w = node.offsetWidth;
    var h = node.offsetHeight;
    var gap = 6;
    var left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    var top = r.bottom + gap + h > window.innerHeight ? r.top - h - gap : r.bottom + gap;
    node.style.left = Math.round(left) + "px";
    node.style.top = Math.round(Math.max(8, top)) + "px";
  }

  Array.prototype.forEach.call(buttons, function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openMenu(button);
    });
  });

  document.addEventListener("mousedown", function (event) {
    if (!menu) return;
    if (menu.contains(event.target) || (openButton && openButton.contains(event.target))) return;
    closeMenu();
  });

  /* Scrolling moves the button, and on a phone a tap on a card inside the
     horizontal scroller often scrolls it a little. Closing on scroll would make
     the menu unopenable there, so it follows the button instead, and only
     closes once the button has left the viewport. */
  function reposition() {
    if (!menu || !openButton) return;
    var r = openButton.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) {
      return closeMenu();
    }
    place(menu, openButton);
  }

  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);

  /* ----------------------------------------------------------- the viewer */

  var viewer = null;
  var viewerName = null;
  var viewerButton = null;

  function openViewer(name, button, key, href) {
    lastFocus = document.activeElement;
    viewerName = name;
    viewerButton = button;
    if (!viewer) buildViewer();
    viewer.hidden = false;
    document.body.classList.add("file-viewer-open");
    show(key, href);
  }

  function closeViewer() {
    if (!viewer) return;
    viewer.hidden = true;
    document.body.classList.remove("file-viewer-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function buildViewer() {
    viewer = document.createElement("div");
    viewer.className = "file-viewer";
    viewer.hidden = true;
    viewer.innerHTML =
      '<div class="file-viewer-scrim" data-close></div>' +
      '<div class="file-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="file-viewer-title">' +
      '  <header class="file-viewer-head">' +
      '    <div><h2 id="file-viewer-title"></h2><p class="file-viewer-note"></p></div>' +
      '    <button type="button" class="file-viewer-close" aria-label="Close" data-close>&times;</button>' +
      "  </header>" +
      '  <div class="file-viewer-tabs" role="tablist"></div>' +
      '  <pre class="file-viewer-body"><code></code></pre>' +
      '  <footer class="file-viewer-foot">' +
      '    <a class="file-viewer-link" data-page>Open the component page</a>' +
      '    <a class="file-viewer-link" data-raw target="_blank" rel="noopener">View the raw file</a>' +
      "  </footer>" +
      "</div>";

    Array.prototype.forEach.call(viewer.querySelectorAll("[data-close]"), function (el) {
      el.addEventListener("click", closeViewer);
    });
    document.body.appendChild(viewer);
  }

  function show(key, href) {
    var file = FILES.filter(function (f) { return f.key === key; })[0];
    var code = viewer.querySelector(".file-viewer-body code");

    viewer.querySelector("#file-viewer-title").textContent = viewerName + file.suffix;
    viewer.querySelector(".file-viewer-note").textContent = file.note;
    viewer.querySelector("[data-page]").setAttribute("href", viewerName + ".html");
    viewer.querySelector("[data-raw]").setAttribute("href", href);

    var tabs = viewer.querySelector(".file-viewer-tabs");
    tabs.textContent = "";
    FILES.forEach(function (f) {
      var target = viewerButton.getAttribute("data-" + f.key);
      if (!target) return;
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "file-viewer-tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(f.key === key));
      tab.textContent = f.label;
      tab.addEventListener("click", function () { show(f.key, target); });
      tabs.appendChild(tab);
    });

    var selected = tabs.querySelector('[aria-selected="true"]');
    if (selected) selected.focus();

    if (cache[href] !== undefined) {
      code.textContent = cache[href];
      return;
    }

    code.textContent = "Loading " + viewerName + file.suffix + "…";
    fetch(href)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        cache[href] = text;
        code.textContent = text;
      })
      .catch(function (err) {
        /* Say which file and why, so the reader can go and fetch it themselves. */
        code.textContent = "Could not read " + href + " (" + err.message + ").";
      });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (menu) return closeMenu();
    if (viewer && !viewer.hidden) closeViewer();
  });

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
