/* The phone menu, after the progressive menu sheet on Graham's folio.

   A floating pill holds search, Configure and the menu button. The menu sheet
   grows out of the menu button: sections as big links, and a section with
   pages under it pushes a layer ("Menu / Components / Actions") that slides
   in from the right. Back and close sit in a footer, close exactly where the
   menu button was, so the button that opened the menu also shuts it. A swipe
   down closes, a swipe right goes back. Search stretches the pill into a
   field along the bottom with results above it.

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
  var searchBtn = fab.querySelector("[data-fab-search]");
  var input = document.getElementById("fab-q");

  var ICONS = {
    next: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
    back: '<path d="M19.5 12h-15"/><path d="m10.5 6-6 6 6 6"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
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

  function mrow(item) {
    var on = here(item.u);
    return '<a class="mrow" href="' + esc(ROOT + item.u) + '"' + (on ? ' aria-current="page"' : "") + '><span class="t"><b>' + esc(item.t) + "</b>" +
      (item.d ? "<small>" + esc(item.d) + "</small>" : "") + "</span>" + ic("next") + "</a>";
  }

  function pageHtml(p) {
    var body = "";
    if (p.kind === "menu") {
      body = '<nav class="big-links" aria-label="Sections">' + NAV.tree.map(function (s) {
        var label = '<span class="bl-t"><span class="lbl">' + esc(s.t) + "</span><small>" + esc(s.d) + "</small></span>";
        if (s.u) return '<a class="big-link" href="' + esc(ROOT + s.u) + '"' + (here(s.u) ? ' aria-current="page"' : "") + ">" + label + "</a>";
        return '<button type="button" class="big-link" data-sec="' + s.id + '">' + label + ic("next") + "</button>";
      }).join("") + "</nav>" +
        '<nav class="sub-links" aria-label="More">' + NAV.extras.map(function (x) {
          return '<a class="sub-link" href="' + esc(ROOT + x.u) + '">' + esc(x.t) + "</a>";
        }).join("") + "</nav>";
    } else if (p.kind === "section") {
      var s = section(p.id);
      body = s.items
        ? '<div class="mlist">' + s.items.map(mrow).join("") + "</div>"
        : '<div class="mlist">' + s.groups.map(function (g) {
            return '<button type="button" class="mrow" data-group="' + g.id + '"><span class="t"><b>' + esc(g.t) + "</b><small>" + esc(g.d) + "</small></span>" + ic("next") + "</button>";
          }).join("") + "</div>";
    } else {
      var grp = section(p.sec).groups.filter(function (g) { return g.id === p.id; })[0];
      body = '<div class="mlist">' + grp.items.map(mrow).join("") + "</div>";
    }
    return '<div class="mp-head"><p class="crumb">' + crumbs() + "</p></div>" +
      '<div class="mp-body">' + body + "</div>" +
      '<div class="mfoot">' + (stack.length > 1 ? '<button type="button" class="msh-x" data-back aria-label="Back">' + ic("back") + "</button>" : "<span></span>") +
      '<button type="button" class="msh-x" data-close aria-label="Close menu">' + ic("x") + "</button></div>";
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
    if (stack.length < 2) return close();
    stack.pop();
    render(-1);
  }

  function inset(r, b, round) {
    return "inset(" + (r.top - b.top) + "px " + (b.right - r.right) + "px " + (b.bottom - r.bottom) + "px " + (r.left - b.left) + "px round " + round + ")";
  }

  function open() {
    if (!bg.hidden) return;
    closeSearch();
    stack = [{ kind: "menu" }];
    render(0);
    bg.hidden = false;
    bg.classList.remove("closing");
    document.body.classList.add("msheet-open");
    if (reduce) return;
    /* The sheet grows out of the menu button. */
    var c = menuBtn.getBoundingClientRect();
    var b = box.getBoundingClientRect();
    fab.classList.add("gone");
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
    if (!bg.hidden) { e.preventDefault(); close(); }
    else if (fab.classList.contains("searching")) closeSearch();
  });
  phone.addEventListener && phone.addEventListener("change", function () { if (!phone.matches) { finish(); closeSearch(); } });

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

  var qScrim = document.createElement("div");
  qScrim.className = "q-scrim";
  qScrim.hidden = true;
  var qRes = document.createElement("div");
  qRes.className = "q-res";
  qRes.hidden = true;
  qRes.setAttribute("role", "listbox");
  qRes.setAttribute("aria-label", "Search results");
  document.body.appendChild(qScrim);
  document.body.appendChild(qRes);

  function results() {
    var words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var hits = INDEX.filter(function (it) {
      var text = (it.t + " " + it.s + " " + it.d).toLowerCase();
      return words.every(function (w) { return text.indexOf(w) >= 0; });
    });
    if (words.length) {
      var q = words.join(" ");
      hits.sort(function (a, b) {
        var ai = a.t.toLowerCase().indexOf(q), bi = b.t.toLowerCase().indexOf(q);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
    }
    var block = function (kind, label, limit) {
      var rows = hits.filter(function (h) { return h.k === kind; }).slice(0, limit);
      return rows.length
        ? '<p class="q-h">' + label + "</p>" + rows.map(function (h) {
            return '<a class="q-row" role="option" href="' + esc(ROOT + h.u) + '"><span class="t"><b>' + esc(h.t) + "</b><small>" + esc(h.s) + "</small></span>" + ic("next") + "</a>";
          }).join("")
        : "";
    };
    qRes.innerHTML = hits.length
      ? block("component", "Components", words.length ? 40 : 12) + block("page", "Pages", words.length ? 20 : 0)
      : '<p class="q-none">Nothing matches “' + esc(input.value.trim()) + "”.</p>";
  }

  function openSearch() {
    if (fab.classList.contains("searching")) return;
    fab.classList.add("searching");
    qScrim.hidden = false;
    qRes.hidden = false;
    results();
    input.focus({ preventScroll: true });
  }

  function closeSearch() {
    if (!fab.classList.contains("searching")) return;
    fab.classList.remove("searching");
    qScrim.hidden = true;
    qRes.hidden = true;
    input.value = "";
    input.blur();
  }

  searchBtn.addEventListener("click", openSearch);
  fab.querySelector(".fab-q-close").addEventListener("click", function (e) {
    e.preventDefault();
    closeSearch();
  });
  qScrim.addEventListener("click", closeSearch);
  input.addEventListener("input", results);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var first = qRes.querySelector(".q-row");
      if (first) location.href = first.href;
    }
  });

  /* Keep the pill above the on-screen keyboard. */
  if (window.visualViewport) {
    var kb = function () {
      document.documentElement.style.setProperty("--kb", Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop) + "px");
    };
    visualViewport.addEventListener("resize", kb);
    visualViewport.addEventListener("scroll", kb);
  }

  window.DovetailMenu = { open: open, close: close, search: openSearch };
})();
