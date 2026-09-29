/* The phone menu, after the progressive menu sheet on Graham's folio.

   A floating pill holds Configure and the menu button. The menu sheet grows
   out of the menu button: sections as big links, and a section with pages
   under it pushes a layer ("Menu / Components") that slides in from the
   right; Components filters its list with Gainer-style chips. Back, search
   and close sit in a footer, close exactly where the menu button was, so the
   button that opened the menu also shuts it. Search turns the footer into a
   field fixed to the sheet, with results in the sheet above it. A swipe down
   closes, a swipe right goes back.

   The tree is window.DovetailNav, generated with the search index by
   tools/build-site.mjs. On a wide screen none of this shows: the header and
   the sidebar do these jobs there. */

(function () {
  "use strict";

  var NAV = window.DovetailNav;
  var INDEX = window.DovetailSearch || [];
  var fab = document.getElementById("fab");
  if (!NAV || !fab) return;

  var phone = window.matchMedia("(max-width: 900px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = "cubic-bezier(.2,.85,.25,1)";
  var home = document.querySelector(".wordmark");
  var ROOT = home ? home.getAttribute("href").replace(/index\.html$/, "") : "";
  var menuBtn = fab.querySelector("[data-fab-menu]");
  var menuFilter = "all";
  var searching = false;

  var ICONS = {
    next: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
    back: '<path d="M19.5 12h-15"/><path d="m10.5 6-6 6 6 6"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    search: '<path d="M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"/><path d="m20.5 20.5-5-5"/>',
  };
  function ic(name) {
    return '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + "</svg>";
  }
  function esc(text) {
    return String(text == null ? "" : text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function here(u) {
    try {
      return new URL(ROOT + u, location.href).pathname === location.pathname;
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------ Configure joins the pill */

  /* On a phone the Configure button sits in the pill between search and
     menu; on a wide screen it goes back to its own corner. */
  function placeConfigure() {
    var btn = document.querySelector(".configure-open-btn");
    var bar = document.querySelector(".configure-bar");
    if (!btn || !bar) return;
    if (phone.matches) {
      if (btn.parentNode !== fab) {
        btn.classList.add("fab-btn");
        fab.insertBefore(btn, menuBtn);
      }
    } else if (btn.parentNode !== bar) {
      btn.classList.remove("fab-btn");
      bar.appendChild(btn);
    }
  }
  /* theme.js builds the button and loads after this file, so wait for it. */
  placeConfigure();
  document.addEventListener("DOMContentLoaded", placeConfigure);
  window.addEventListener("load", placeConfigure);
  if (phone.addEventListener) phone.addEventListener("change", placeConfigure);

  /* ------------------------------------------------------------- the sheet */

  var bg = document.createElement("div");
  bg.className = "msheet-bg";
  bg.hidden = true;
  bg.innerHTML = '<div class="msheet" role="dialog" aria-modal="true" aria-label="Menu"></div>';
  document.body.appendChild(bg);
  var box = bg.firstChild;
  var stack = [];

  function section(id) {
    return NAV.tree.filter(function (s) { return s.id === id; })[0];
  }

  function crumbs() {
    var names = stack.map(function (p) {
      if (p.kind === "menu") return "Menu";
      if (p.kind === "section") return section(p.id).t;
      return section(p.sec).groups.filter(function (g) { return g.id === p.id; })[0].t;
    });
    return names.map(function (n, i) {
      return i === names.length - 1
        ? '<span class="crumb-cur">' + esc(n) + "</span>"
        : '<button type="button" class="crumb-up" data-depth="' + i + '">' + esc(n) + '</button><span class="sep" aria-hidden="true">/</span>';
    }).join("");
  }

  /* "Open in Claude" for the page you're on: the page menu's own link, which
     already carries this page's address and its Markdown when it has one. */
  var CLAUDE_MARK = '<svg class="claude-mark" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M13.2 12H22.5M12.96 12.72l5.59 4.21M12.6 13.04l4.1 7.1M11.85 13.19l-1.13 9.23M11.4 13.04l-3.5 6.06M10.9 12.47l-7.55 3.2M10.8 12H1.5M11.04 11.28L5.45 7.07M11.4 10.96L7.3 3.86M12.15 10.81l1.13-9.23M12.6 10.96l3.5-6.06M13.1 11.53l7.55-3.2"/></svg>';
  function claudeChip() {
    var own = document.querySelector('[data-page-action="claude"]');
    var href = own ? own.getAttribute("href") : "https://claude.ai/new?q=" + encodeURIComponent("Read " + location.href + " and help me use it.");
    return '<a class="sub-link sub-link-claude" href="' + esc(href) + '" target="_blank" rel="noopener">' + CLAUDE_MARK + "Open in Claude</a>";
  }

  function mrow(item) {
    var on = here(item.u);
    return '<a class="mrow" href="' + esc(ROOT + item.u) + '"' + (on ? ' aria-current="page"' : "") + '><span class="t"><b>' + esc(item.t) + "</b>" +
      (item.d ? "<small>" + esc(item.d) + "</small>" : "") + "</span>" + ic("next") + "</a>";
  }

  function pageHtml(p) {
    var body = "";
    if (p.kind === "menu") {
      body = '<nav class="big-links" aria-label="Sections">' + NAV.tree.map(function (s) {
        var label = '<span class="bl-t"><span class="lbl">' + esc(s.t) + "</span></span>";
        if (s.u) return '<a class="big-link" href="' + esc(ROOT + s.u) + '"' + (here(s.u) ? ' aria-current="page"' : "") + ">" + label + "</a>";
        return '<button type="button" class="big-link" data-sec="' + s.id + '">' + label + ic("next") + "</button>";
      }).join("") + "</nav>" +
        '<nav class="sub-links" aria-label="More">' + NAV.extras.map(function (x) {
          return '<a class="sub-link" href="' + esc(ROOT + x.u) + '">' + esc(x.t) + "</a>";
        }).join("") + claudeChip() + "</nav>";
    } else if (p.kind === "section") {
      var s = section(p.id);
      body = s.items
        ? '<div class="mlist">' + s.items.map(mrow).join("") + "</div>"
        : chipsHtml(s) + '<div class="mlist" id="mlist">' + filtered(s).map(mrow).join("") + "</div>";
    } else {
      var grp = section(p.sec).groups.filter(function (g) { return g.id === p.id; })[0];
      body = '<div class="mlist">' + grp.items.map(mrow).join("") + "</div>";
    }
    return '<div class="mp-head"><p class="crumb">' + crumbs() + "</p></div>" +
      '<div class="mp-body">' + body + "</div>" +
      footHtml();
  }

  /* Back on the left when there is somewhere to go back to, and search in
     the middle; without a back arrow, search takes the left. Close is always
     on the right, where the menu button was. */
  function footHtml() {
    var back = stack.length > 1 ? '<button type="button" class="msh-x" data-back aria-label="Back">' + ic("back") + "</button>" : "";
    var find = '<button type="button" class="msh-x" data-find aria-label="Search components and pages">' + ic("search") + "</button>";
    return '<div class="mfoot">' +
      '<span class="mf-l">' + (back || find) + "</span>" +
      '<span class="mf-c">' + (back ? find : "") + "</span>" +
      '<span class="mf-r"><button type="button" class="msh-x" data-close aria-label="Close menu">' + ic("x") + "</button></span></div>";
  }

  /* Components: a chip per family above one list, like Gainer's filters. */
  function chipsHtml(s) {
    var all = s.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
    var chip = function (id, label, n) {
      return '<button type="button" class="pan-opt" data-chip="' + id + '" aria-pressed="' + (menuFilter === id) + '">' + esc(label) + '<span class="n">' + n + "</span></button>";
    };
    return '<div class="mchips" role="toolbar" aria-label="Filter by family">' + chip("all", "All", all) +
      s.groups.map(function (g) { return chip(g.id, g.t, g.items.length); }).join("") + "</div>";
  }

  function filtered(s) {
    return s.groups.reduce(function (out, g) {
      return menuFilter === "all" || menuFilter === g.id ? out.concat(g.items) : out;
    }, []);
  }

  function render(dir) {
    box.innerHTML = pageHtml(stack[stack.length - 1]);
    box.scrollTop = 0;
    box.querySelectorAll("[data-sec]").forEach(function (b) {
      b.onclick = function () { push({ kind: "section", id: b.getAttribute("data-sec") }); };
    });
    box.querySelectorAll("[data-group]").forEach(function (b) {
      b.onclick = function () { push({ kind: "group", sec: stack[stack.length - 1].id, id: b.getAttribute("data-group") }); };
    });
    box.querySelectorAll("[data-depth]").forEach(function (b) {
      b.onclick = function () {
        stack = stack.slice(0, Number(b.getAttribute("data-depth")) + 1);
        render(-1);
      };
    });
    box.querySelectorAll("[data-chip]").forEach(function (b) {
      b.onclick = function () {
        menuFilter = b.getAttribute("data-chip");
        var s = section("components");
        box.querySelectorAll("[data-chip]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
        var list = box.querySelector("#mlist");
        list.innerHTML = filtered(s).map(mrow).join("");
        if (!reduce) list.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      };
    });
    var find = box.querySelector("[data-find]");
    if (find) find.onclick = enterSearch;
    var back = box.querySelector("[data-back]");
    if (back) back.onclick = pop;
    box.querySelector("[data-close]").onclick = function () { close(); };
    if (dir && !reduce) {
      box.classList.remove("snext", "sprev");
      void box.offsetWidth;
      box.classList.add(dir > 0 ? "snext" : "sprev");
      clearTimeout(box._nv);
      box._nv = setTimeout(function () { box.classList.remove("snext", "sprev"); }, 420);
    }
    var focus = box.querySelector("[data-back]") || box.querySelector(".big-link, .mrow");
    if (focus && !window.matchMedia("(pointer: coarse)").matches) focus.focus({ preventScroll: true });
  }

  function push(p) {
    stack.push(p);
    render(1);
  }

  function pop() {
    if (searching) return exitSearch();
    if (stack.length < 2) return close();
    stack.pop();
    render(-1);
  }

  function inset(r, b, round) {
    return "inset(" + (r.top - b.top) + "px " + (b.right - r.right) + "px " + (b.bottom - r.bottom) + "px " + (r.left - b.left) + "px round " + round + ")";
  }

  function open() {
    if (!bg.hidden) return;
    searching = false;
    box.classList.remove("is-searching");
    stack = [{ kind: "menu" }];
    render(0);
    bg.hidden = false;
    bg.classList.remove("closing");
    document.body.classList.add("msheet-open");
    /* The pill hides while the sheet is up; its close sits where the menu
       button was. */
    fab.classList.add("gone");
    if (reduce) return;
    /* The sheet grows out of the menu button. */
    var c = menuBtn.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    bg.classList.add("morph");
    box.animate([{ clipPath: inset(c, b, c.height / 2 + "px") }, { clipPath: inset(b, b, "24px") }], { duration: 500, easing: EASE });
    bg.animate([{ backgroundColor: "rgba(0,0,0,0)" }, { backgroundColor: "rgba(0,0,0,.38)" }], { duration: 400, easing: "ease-out" });
    setTimeout(function () { bg.classList.remove("morph"); }, 560);
  }

  function finish() {
    bg.hidden = true;
    bg.classList.remove("closing", "morphout");
    box.style.transform = "";
    box.getAnimations().concat(bg.getAnimations()).forEach(function (a) { a.cancel(); });
    document.body.classList.remove("msheet-open");
    fab.classList.remove("gone");
    stack = [];
  }

  /* plain: a swipe already moved the sheet away, so it just goes. */
  function close(plain) {
    if (bg.hidden || bg.classList.contains("morphout")) return;
    if (reduce) return finish();
    if (plain) {
      bg.classList.add("closing");
      setTimeout(finish, 260);
      return;
    }
    /* It shrinks back into the menu button. */
    fab.classList.remove("gone");
    var c = menuBtn.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    var o = { duration: 440, easing: EASE, fill: "forwards" };
    bg.classList.add("morphout");
    box.animate([{ clipPath: inset(b, b, "24px") }, { clipPath: inset(c, b, c.height / 2 + "px") }], o);
    bg.animate([{ backgroundColor: "rgba(0,0,0,.38)" }, { backgroundColor: "rgba(0,0,0,0)" }], o);
    setTimeout(finish, o.duration);
  }

  menuBtn.addEventListener("click", open);
  bg.addEventListener("click", function (e) { if (e.target === bg) close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (bg.hidden) return;
    e.preventDefault();
    if (searching) exitSearch();
    else close();
  });
  phone.addEventListener && phone.addEventListener("change", function () { if (!phone.matches) finish(); });

  /* Touch: drag down from the top to close, drag right in a layer to go back. */
  (function swipe() {
    var y0 = null, x0 = 0, dy = 0, dx = 0, t0 = 0, drag = null;
    box.addEventListener("touchstart", function (e) {
      y0 = null;
      if (e.touches.length !== 1) return;
      y0 = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      t0 = Date.now();
      dy = dx = 0;
      drag = null;
    }, { passive: true });
    box.addEventListener("touchmove", function (e) {
      if (y0 == null) return;
      var t = e.touches[0];
      dy = t.clientY - y0;
      dx = t.clientX - x0;
      if (!drag) {
        if (box.scrollTop <= 0 && dy > 8 && dy > Math.abs(dx)) drag = "y";
        else if (dx > 10 && dx > Math.abs(dy) * 1.3 && stack.length > 1) drag = "x";
        else {
          if (dy < -6 || Math.abs(dx) > 14) y0 = null;
          return;
        }
      }
      e.preventDefault();
      if (drag === "y") box.style.transform = "translateY(" + Math.max(0, dy) + "px)";
      else {
        box.style.setProperty("--sx", Math.max(0, dx) + "px");
        box.classList.add("hdrag");
      }
    }, { passive: false });
    function end() {
      if (y0 == null || !drag) { y0 = null; return; }
      var ms = Math.max(1, Date.now() - t0);
      var dir = drag;
      y0 = null;
      drag = null;
      if (dir === "x") {
        box.classList.remove("hdrag");
        box.style.removeProperty("--sx");
        if (dx > Math.min(110, box.offsetWidth * 0.28) || (dx / ms > 0.5 && dx > 40)) pop();
        return;
      }
      if (dy > Math.min(140, box.offsetHeight * 0.3) || (dy / ms > 0.6 && dy > 30)) {
        box.style.transition = "transform .24s ease-in";
        box.style.transform = "translateY(100%)";
        setTimeout(function () { box.style.transition = ""; close(true); }, 240);
      } else {
        box.style.transition = "transform .2s ease";
        box.style.transform = "";
        setTimeout(function () { box.style.transition = ""; }, 220);
      }
    }
    box.addEventListener("touchend", end);
    box.addEventListener("touchcancel", end);
  })();

  /* ------------------------------------------------------------- search */

  /* The footer becomes a search field fixed to the bottom of the sheet, and
     the sheet's body shows the results. Closing the field puts the page
     that was showing back. */
  function resultsHtml(q) {
    var words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var hits = INDEX.filter(function (it) {
      var text = (it.t + " " + it.s + " " + it.d).toLowerCase();
      return words.every(function (w) { return text.indexOf(w) >= 0; });
    });
    if (words.length) {
      var whole = words.join(" ");
      hits.sort(function (a, b) {
        var ai = a.t.toLowerCase().indexOf(whole), bi = b.t.toLowerCase().indexOf(whole);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
    }
    var block = function (kind, label, limit) {
      var rows = hits.filter(function (h) { return h.k === kind; }).slice(0, limit);
      return rows.length ? '<p class="q-h">' + label + "</p>" + rows.map(function (h) {
        return '<a class="mrow" href="' + esc(ROOT + h.u) + '"' + (here(h.u) ? ' aria-current="page"' : "") + '><span class="t"><b>' + esc(h.t) + "</b><small>" + esc(h.s) + "</small></span>" + ic("next") + "</a>";
      }).join("") : "";
    };
    return hits.length
      ? block("component", "Components", words.length ? 40 : 66) + block("page", "Pages", words.length ? 20 : 0)
      : '<p class="q-none">Nothing matches “' + esc(q.trim()) + "”.</p>";
  }

  function enterSearch() {
    searching = true;
    box.classList.add("is-searching");
    box.querySelector(".mp-head").innerHTML = '<p class="crumb"><span class="crumb-cur">Search</span></p>';
    var body = box.querySelector(".mp-body");
    body.innerHTML = resultsHtml("");
    box.querySelector(".mfoot").outerHTML =
      '<div class="mfoot msearch"><label class="ms-field">' + ic("search") +
      '<input type="search" placeholder="Search components and pages" aria-label="Search components and pages" autocomplete="off" enterkeyhint="search">' +
      '<button type="button" class="ms-close" aria-label="Close search">' + ic("x") + "</button></label></div>";
    var input = box.querySelector(".msearch input");
    input.addEventListener("input", function () {
      body.innerHTML = resultsHtml(input.value);
      box.scrollTop = 0;
    });
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var first = body.querySelector(".mrow");
      if (first) location.href = first.href;
    });
    box.querySelector(".ms-close").onclick = function (e) {
      e.preventDefault();
      exitSearch();
    };
    box.scrollTop = 0;
    if (!reduce) box.querySelector(".msearch").animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: EASE });
    input.focus({ preventScroll: true });
  }

  function exitSearch() {
    searching = false;
    box.classList.remove("is-searching");
    render(0);
  }

  /* Keep the pill above the on-screen keyboard. */
  if (window.visualViewport) {
    var kb = function () {
      document.documentElement.style.setProperty("--kb", Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop) + "px");
    };
    visualViewport.addEventListener("resize", kb);
    visualViewport.addEventListener("scroll", kb);
  }

  window.DovetailMenu = { open: open, close: close, search: function () { open(); enterSearch(); } };
})();
