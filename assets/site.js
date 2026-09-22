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
    });
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

  /* Filtering hides links, not sections: an empty section says the filter
     matched nothing there, which is information. */
  var filter = document.getElementById("nav-search");
  if (filter && sidebar) {
    filter.addEventListener("input", function () {
      var q = filter.value.trim().toLowerCase();
      Array.prototype.forEach.call(sidebar.querySelectorAll("li"), function (li) {
        if (li.classList.contains("nav-group")) return;
        var link = li.querySelector("a");
        if (!link) return;
        li.hidden = q ? link.textContent.toLowerCase().indexOf(q) === -1 : false;
      });
      if (q) {
        Array.prototype.forEach.call(sidebar.querySelectorAll(".nav-section"), function (section) {
          section.open = true;
        });
      }
    });
  }
})();
