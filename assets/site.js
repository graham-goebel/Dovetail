/* Site chrome behaviour: the navigation drawer and the navigation filter.

   Theming (colour mode, context, and everything in the Configure sheet) lives in
   assets/theme.js, which owns the one piece of state both the site and the
   system's own theme runtime read. */

(function () {
  "use strict";

  var navToggle = document.getElementById("nav-toggle");
  var sidebar = document.getElementById("sidebar");

  /* The sections are open in the markup because on a wide screen the sidebar is
     always there and a reader scans it. On a phone the drawer is the whole
     screen, and seven open sections is a page of links to scroll past before
     reaching anything, so they start closed, except the one holding the page
     you are on. */
  var narrow = window.matchMedia("(max-width: 900px)");

  function collapseForWidth() {
    if (!sidebar) return;
    Array.prototype.forEach.call(sidebar.querySelectorAll(".nav-section"), function (section) {
      if (!narrow.matches) {
        section.open = true;
        return;
      }
      section.open = !!section.querySelector('[aria-current="page"]');
    });
  }

  collapseForWidth();
  if (narrow.addEventListener) narrow.addEventListener("change", collapseForWidth);
  else if (narrow.addListener) narrow.addListener(collapseForWidth);

  /* On a phone the drawer is a layer over the page, so the page behind it must
     not scroll and Escape has to be a way out. Widening the window puts the
     sidebar back where it always is, so the open state is dropped with it. */
  function setDrawer(open) {
    if (!sidebar || !navToggle) return;
    sidebar.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (navToggle && sidebar) {
    navToggle.addEventListener("click", function () {
      setDrawer(!sidebar.classList.contains("open"));
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !sidebar.classList.contains("open")) return;
      setDrawer(false);
      navToggle.focus();
    });

    var wide = window.matchMedia("(min-width: 901px)");
    var drop = function () {
      if (wide.matches) setDrawer(false);
    };
    if (wide.addEventListener) wide.addEventListener("change", drop);
    else if (wide.addListener) wide.addListener(drop);
  }

  /* --------------------------------------------------------------- copying */

  /* Every code block on the site gets a copy button, added here rather than
     emitted into the markup: the generator has three places that write a
     <pre>, the file viewer writes a fourth at runtime, and a button that does
     nothing without JavaScript has no business being in the HTML anyway. */
  function attachCopy(root) {
    var blocks = (root || document).querySelectorAll("pre.code");
    Array.prototype.forEach.call(blocks, function (pre) {
      if (pre.parentNode && pre.parentNode.classList.contains("code-wrap")) return;

      var wrap = document.createElement("div");
      wrap.className = "code-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      var button = document.createElement("button");
      button.type = "button";
      button.className = "copy-btn";
      button.textContent = "Copy";
      /* The label is the feedback, so it has to be announced when it changes. */
      button.setAttribute("aria-live", "polite");
      button.addEventListener("click", function () {
        var code = pre.querySelector("code");
        copy(code ? code.textContent : pre.textContent, function (ok) {
          button.textContent = ok ? "Copied" : "Press Ctrl+C";
          button.classList.toggle("is-done", ok);
          window.setTimeout(function () {
            button.textContent = "Copy";
            button.classList.remove("is-done");
          }, 1600);
        });
      });
      wrap.appendChild(button);
      openInBuilder(wrap, pre);
    });
  }

  /* A JSX example with components in it opens on a builder canvas, as a new
     frame beside whatever is there. The builder reads the JSX itself and says
     what it couldn't bring in. */
  function openInBuilder(wrap, pre) {
    if (pre.getAttribute("data-lang") !== "jsx" || pre.hasAttribute("data-source")) return;
    var code = pre.querySelector("code");
    var text = code ? code.textContent : pre.textContent;
    if (!/<[A-Z][\w.]*[\s/>]/.test(text)) return;
    var home = document.querySelector(".wordmark");
    var root = home ? home.getAttribute("href").replace(/index\.html$/, "") : "";
    var bytes = new TextEncoder().encode(text);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    var link = document.createElement("a");
    link.className = "copy-btn open-btn";
    link.href = root + "builder.html#jsx=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    link.textContent = "Open in builder";
    wrap.appendChild(link);
  }

  /* The async clipboard needs a secure context, which a site opened from a file
     or served over plain HTTP on a LAN is not. The old selection trick still
     works there, so it is the fallback rather than a failure. */
  function copy(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () {
          done(true);
        },
        function () {
          done(legacyCopy(text));
        }
      );
      return;
    }
    done(legacyCopy(text));
  }

  function legacyCopy(text) {
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    document.body.appendChild(field);
    field.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(field);
    return ok;
  }

  attachCopy(document);

  /* The file viewer's <pre> is a flex child of its panel, so wrapping it would
     break the layout. It gets a button in its header instead, off the same
     clipboard helper. */
  window.DovetailCopy = { attach: attachCopy, write: copy };

  /* Live cards are drawn at a fixed height for a desktop column. On a phone
     their grids stack and the content runs taller than the frame, which left
     a scrolling card inside a scrolling page. So each frame follows its
     card's content height instead, never shorter than the height it was
     drawn at. Cards are same-origin, so the frame can read its document.
     Content sized from the frame itself (100vh and the like) grows by the
     same step every time it is measured; after a few such steps the frame
     stops following it. */
  function fitFrame(iframe) {
    var box = iframe.parentNode;
    var base = parseFloat(box.style.height) || iframe.clientHeight;
    var cap = Math.max(base * 8, 2400);
    var observer = null;
    var lastStep = 0;
    var streak = 0;

    function measure() {
      var doc;
      try {
        doc = iframe.contentDocument;
      } catch (e) {
        return;
      }
      if (!doc || !doc.body) return;
      var body = doc.body;
      var root = doc.documentElement;
      var cs = doc.defaultView.getComputedStyle(body);
      var h = Math.ceil(Math.max(body.getBoundingClientRect().height, body.scrollHeight) + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0));
      /* Anything the body measure missed still shows as the document
         overflowing the frame. */
      if (root.scrollHeight > root.clientHeight) h = Math.max(h, root.scrollHeight);
      /* Worked in the card's own pixels; the box adds its border back. */
      var chrome = box.offsetHeight - iframe.offsetHeight;
      var want = Math.round(Math.max(base - chrome, Math.min(h, cap)));
      var current = iframe.offsetHeight;
      var step = want - current;
      if (Math.abs(step) < 2) return;
      if (step > 0 && Math.abs(step - lastStep) < 2) {
        streak += 1;
        if (streak >= 3) {
          if (observer) observer.disconnect();
          return;
        }
      } else {
        streak = 0;
      }
      lastStep = step;
      box.style.height = want + chrome + "px";
    }

    function attach() {
      var doc;
      try {
        doc = iframe.contentDocument;
      } catch (e) {
        return;
      }
      if (!doc || !doc.body || !doc.defaultView || !doc.defaultView.ResizeObserver) return;
      if (observer) observer.disconnect();
      streak = 0;
      lastStep = 0;
      observer = new doc.defaultView.ResizeObserver(measure);
      observer.observe(doc.body);
      observer.observe(doc.documentElement);
      measure();
    }

    iframe.addEventListener("load", attach);
    try {
      var doc = iframe.contentDocument;
      if (doc && doc.readyState === "complete" && doc.location.href !== "about:blank") attach();
    } catch (e) {
      /* Not readable: the frame keeps the height it was drawn at. */
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll(".frame > iframe"), fitFrame);

  /* The page menu: an ellipsis in the content column's top corner. The items
     are plain links and buttons, so Download and View work without script;
     this adds opening and closing, arrow keys, and the two copy actions. */
  /* Page actions: the ⋯ in the header opens a sheet of actions for this page
     (a bottom sheet on a phone, a small dialog on a wide screen). */
  var sheet = document.getElementById("page-sheet");
  if (sheet) {
    var sheetBtns = Array.prototype.slice.call(document.querySelectorAll(".page-actions-btn"));
    var panel = sheet.querySelector(".asheet");
    var status = sheet.querySelector(".page-actions-status");
    var items = Array.prototype.slice.call(sheet.querySelectorAll(".page-menu-item"));
    var statusTimer = 0;
    var closeTimer = 0;
    var opener = null;

    function say(text) {
      clearTimeout(statusTimer);
      status.textContent = text;
      statusTimer = setTimeout(function () {
        status.textContent = "";
      }, 1800);
    }

    function setSheet(open) {
      clearTimeout(closeTimer);
      if (open) {
        opener = document.activeElement;
        status.textContent = "";
        sheet.hidden = false;
        document.body.classList.add("asheet-open");
        items[0].focus({ preventScroll: true });
      } else {
        if (sheet.hidden) return;
        sheet.hidden = true;
        document.body.classList.remove("asheet-open");
        panel.style.transform = "";
        if (opener && opener.focus) opener.focus();
      }
      sheetBtns.forEach(function (b) { b.setAttribute("aria-expanded", String(open)); });
    }

    /* The same prompt tools/build-site.mjs writes (claudePrompt there); keep
       the two in step. */
    function claudePrompt(site, subject, title) {
      return [
        "I'm building with Dovetail, a white-label React design system: primitive tokens, semantic roles and components, rebranded by a theme file of token overrides.",
        "",
        "Read these first, in order:",
        "1. " + site + "llms.txt: the map of the docs, with raw Markdown links to every guide, token file and component (its .md guide, .d.ts props and .jsx source).",
        "2. " + subject + ': the "' + title + '" page I\'m looking at.',
        "3. " + site + "system/assets/notes/CLAUDE.from-standalone.md: the authoring rules. Follow them.",
        "",
        "When you write code:",
        "- Use Dovetail's components and --dt-* tokens. No literal colours, sizes, radii, shadows or durations.",
        "- Product code reads semantic (--dt-surface-*, --dt-text-*) or component tokens, never primitives (--dt-color-*).",
        "- Check every prop against the component's .d.ts, and follow the rules in its .md.",
        "- Rebrand by overriding tokens in a theme file, not by editing components.",
        "- Make it work at 390px, in dark mode (.dark) and with reduced motion.",
        "- If the docs don't cover something, say so rather than inventing an API or a token.",
        "",
        "My task: ",
      ].join("\n");
    }

    /* The Claude link is written for the published site. Served from anywhere
       else (a fork, a local server) it is rebuilt from the page's own address,
       so Claude reads the page you are actually looking at. */
    function claudeHref(link) {
      var md = link.getAttribute("data-md");
      var subject = md ? new URL(md, location.href).href : location.href.split("#")[0];
      var home = document.querySelector(".wordmark");
      var site = new URL(home ? home.getAttribute("href").replace(/index\.html$/, "") : "./", location.href).href;
      return "https://claude.ai/new?q=" + encodeURIComponent(claudePrompt(site, subject, link.getAttribute("data-title")));
    }

    sheetBtns.forEach(function (b) {
      b.addEventListener("click", function () { setSheet(sheet.hidden); });
    });
    sheet.querySelector("[data-sheet-close]").addEventListener("click", function () { setSheet(false); });
    sheet.addEventListener("click", function (e) { if (e.target === sheet) setSheet(false); });

    document.addEventListener("keydown", function (e) {
      if (sheet.hidden) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setSheet(false);
      } else if (e.key === "Tab") {
        var focusable = Array.prototype.slice.call(panel.querySelectorAll("a[href], button"));
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        var i = items.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });

    /* A drag down from the top of the sheet closes it, as the menu does. */
    (function () {
      var y0 = null, dy = 0, t0 = 0;
      panel.addEventListener("touchstart", function (e) {
        y0 = e.touches.length === 1 ? e.touches[0].clientY : null;
        dy = 0;
        t0 = Date.now();
      }, { passive: true });
      panel.addEventListener("touchmove", function (e) {
        if (y0 == null) return;
        dy = e.touches[0].clientY - y0;
        if (dy > 0) panel.style.transform = "translateY(" + dy + "px)";
      }, { passive: true });
      panel.addEventListener("touchend", function () {
        if (y0 == null) return;
        y0 = null;
        if (dy > Math.min(120, panel.offsetHeight * 0.3) || (dy / Math.max(1, Date.now() - t0) > 0.6 && dy > 30)) setSheet(false);
        else panel.style.transform = "";
      });
    })();

    items.forEach(function (item) {
      if (item.getAttribute("data-page-action") === "claude" && location.origin.indexOf("graham-goebel.github.io") === -1) {
        item.setAttribute("href", claudeHref(item));
      }
      item.addEventListener("click", function (e) {
        var action = item.getAttribute("data-page-action");
        /* A copy confirms in the sheet, then the sheet closes itself. */
        var done = function (text) {
          say(text);
          closeTimer = setTimeout(function () { setSheet(false); }, 900);
        };
        if (action === "copy-text") {
          e.preventDefault();
          copy(item.getAttribute("data-text"), function (ok) {
            done(ok ? item.getAttribute("data-done") || "Copied" : "Couldn't copy");
          });
        } else if (action === "copy-link") {
          e.preventDefault();
          copy(location.href.split("#")[0], function (ok) {
            done(ok ? "Link copied" : "Couldn't copy");
          });
        } else if (action === "copy-md") {
          e.preventDefault();
          say("Copying…");
          fetch(item.getAttribute("data-md"))
            .then(function (r) {
              if (!r.ok) throw new Error(r.status);
              return r.text();
            })
            .then(function (text) {
              copy(text, function (ok) {
                done(ok ? item.getAttribute("data-done") || "Markdown copied" : "Couldn't copy");
              });
            })
            .catch(function () {
              done("Couldn't load the file");
            });
        } else {
          setSheet(false);
        }
      });
    });
  }

  /* On this page: marks the section being read. A heading counts as current
     once it has scrolled into the top third of the viewport, and stays
     current until the next one does. */
  var toc = document.querySelector(".page-toc");
  if (toc) {
    var links = Array.prototype.slice.call(toc.querySelectorAll("a"));
    var targets = links
      .map(function (a) {
        return document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
      })
      .filter(Boolean);
    var queued = false;

    function mark() {
      queued = false;
      var current = targets[0];
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].getBoundingClientRect().top <= window.innerHeight * 0.33) current = targets[i];
        else break;
      }
      /* At the very bottom the last sections can never reach the top third. */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = targets[targets.length - 1];
      links.forEach(function (a) {
        if (current && a.getAttribute("href") === "#" + current.id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      /* Keep the marked link in view when the list itself scrolls. */
      var active = toc.querySelector('a[aria-current="true"]');
      if (active && (active.offsetTop < toc.scrollTop || active.offsetTop > toc.scrollTop + toc.clientHeight - active.offsetHeight)) {
        toc.scrollTop = active.offsetTop - toc.clientHeight / 2;
      }
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!queued) {
          queued = true;
          requestAnimationFrame(mark);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", mark);
    mark();
  }

  /* Phone header, after the folio: the title shrinks over the first 48px of
     scroll (--hc). */
  var appHead = document.getElementById("app-head");
  if (appHead) {
    var ticking = false;
    var onScroll = function () {
      appHead.style.setProperty("--hc", Math.min(1, Math.max(0, window.scrollY / 48)).toFixed(3));
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    onScroll();
  }

  /* Components index: chips filter the families. All shows every section;
     a family shows only its own. The choice rides in the hash (#forms), so a
     link to a family lands filtered. */
  var chipBar = document.querySelector(".filter-chips");
  if (chipBar) {
    var chips = Array.prototype.slice.call(chipBar.querySelectorAll("[data-filter]"));
    var groups = Array.prototype.slice.call(document.querySelectorAll("section.group[data-group]"));
    var applyFilter = function (id) {
      if (!chips.some(function (c) { return c.getAttribute("data-filter") === id; })) id = "all";
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === id)); });
      groups.forEach(function (g) { g.hidden = id !== "all" && g.getAttribute("data-group") !== id; });
    };
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var id = c.getAttribute("data-filter");
        applyFilter(id);
        history.replaceState(null, "", id === "all" ? location.pathname + location.search : "#" + id);
      });
    });
    applyFilter(location.hash.slice(1) || "all");
  }

  /* Home page template thumbnails: each frame renders its card at 1280px and
     is scaled to fit, so the thumbnail is the live page. */
  var thumbs = document.querySelectorAll(".home-thumb-frame");
  if (thumbs.length) {
    var fit = function () {
      Array.prototype.forEach.call(thumbs, function (frame) {
        frame.style.setProperty("--thumb-scale", String(frame.clientWidth / 1280));
      });
    };
    fit();
    window.addEventListener("resize", fit);
  }

  /* The closing section shows the illustration uploaded in Configure's Media
     tab, if there is one, in place of the sketch. */
  var art = document.querySelector("[data-home-illustration]");
  if (art) {
    var sketch = art.innerHTML;
    var showArt = function () {
      var src = "";
      try {
        src = (JSON.parse(localStorage.getItem("dovetail-docs-media")) || {}).illustration || "";
      } catch (e) {}
      art.innerHTML = src ? '<img alt="" src="' + src.replace(/"/g, "&quot;") + '">' : sketch;
    };
    showArt();
    window.addEventListener("storage", function (event) {
      if (event.key === "dovetail-docs-media") showArt();
    });
  }
})();
