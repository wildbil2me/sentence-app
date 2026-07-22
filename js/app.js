/* Sentence Forge — app shell: routing, library view, import, theme, toasts. */
(function () {
  "use strict";
  window.wjt = window.wjt || {};
  wjt.views = wjt.views || {};
  wjt.VERSION = "0.1.0";

  /* ---------------- toasts ---------------- */
  wjt.toast = function (msg, ms) {
    var host = document.getElementById("toasts");
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.classList.add("hide"); }, ms || 3200);
    setTimeout(function () { t.remove(); }, (ms || 3200) + 400);
  };

  /* ---------------- in-app confirm dialog ----------------
   * A centered modal with a dimmed backdrop — the app's own replacement for the
   * browser's confirm(). Callback-based (not a Promise) to match the ES5 flavor
   * here. opts: { message, confirmText, cancelText, danger, onConfirm }.
   * Closes on confirm, cancel, backdrop click, or Escape; restores focus on close. */
  wjt.confirmDialog = function (opts) {
    opts = opts || {};
    var prevFocus = document.activeElement;

    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    var modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    var msg = document.createElement("p");
    msg.className = "modal-msg";
    msg.textContent = opts.message || "Are you sure?";

    var row = document.createElement("div");
    row.className = "btn-row modal-actions";

    var cancel = document.createElement("button");
    cancel.className = "btn";
    cancel.textContent = opts.cancelText || "Cancel";

    var ok = document.createElement("button");
    ok.className = "btn btn-primary" + (opts.danger ? " btn-danger" : "");
    ok.textContent = opts.confirmText || "OK";

    row.appendChild(cancel);
    row.appendChild(ok);
    modal.appendChild(msg);
    modal.appendChild(row);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    ok.focus();

    function close() {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) { /* gone */ } }
    }
    function onKey(e) { if (e.key === "Escape") close(); }

    cancel.addEventListener("click", close);
    backdrop.addEventListener("pointerdown", function (e) { if (e.target === backdrop) close(); });
    ok.addEventListener("click", function () {
      close();
      if (opts.onConfirm) opts.onConfirm();
    });
    document.addEventListener("keydown", onKey);
  };

  /* ---------------- shared lesson import ----------------
   * Reads File objects (JSON), imports each via wjt.importBundle, saves the
   * lessons, toasts a summary, and routes to the Library. Shared by the Home
   * splash and the Library so both offer the same import. `onDone` (optional)
   * runs after a successful import — used by Library to re-render in place. */
  wjt.importLessonFiles = function (files, onDone) {
    Array.prototype.slice.call(files || []).forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var result = wjt.importBundle(data);
          if (!result.lessons.length) throw new Error("No usable lessons in the file.");
          result.lessons.forEach(function (l) { wjt.store.save(l); });
          wjt.toast("Imported " + result.lessons.length + " lesson" +
            (result.lessons.length === 1 ? "" : "s") +
            (result.warnings.length ? " (" + result.warnings.length + " warning(s) — see console)." : "."));
          result.warnings.forEach(function (w) { console.warn("[Sentence Forge import]", w); });
          if (onDone) onDone();
          // The lessons grid lives on the Library screen — go show it there.
          else if (location.hash === "#/library") route();
          else location.hash = "#/library";
        } catch (e) {
          wjt.toast("Import failed: " + e.message, 5000);
        }
      };
      reader.readAsText(file);
    });
  };

  /* ---------------- per-view cleanup ---------------- */
  var cleanups = [];
  wjt.onViewCleanup = function (fn) { cleanups.push(fn); };
  function runCleanups() {
    cleanups.splice(0).forEach(function (fn) {
      try { fn(); } catch (e) { /* view teardown must never break routing */ }
    });
  }

  /* ---------------- theme ---------------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sentenceForge.theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
  }

  /* ---------------- grammar palette (color-blind-friendly opt-in) ----------
   * Mirrors applyTheme, but grammar colors are DATA not CSS: wjt.applyPalette
   * rewrites label/type colors, and the change only appears once views
   * re-render (they re-read colors into inline `--c`). So callers pair this
   * with wjt.rerender(). The choice is a property of the viewer's eyes, so it
   * lives in localStorage beside the theme — never in the lesson JSON. */
  function applyPalette(name) {
    if (name !== "cbSafe") name = "default";
    wjt.applyPalette(name);
    localStorage.setItem("sentenceForge.palette", name);
    var btn = document.getElementById("palette-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", name === "cbSafe" ? "true" : "false");
      btn.title = name === "cbSafe"
        ? "Grammar colors: color-blind-friendly (click for default)"
        : "Grammar colors: default (click for color-blind-friendly)";
    }
  }

  /* ---------------- home (splash) view ---------------- */
  wjt.views.home = function (container) {
    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-home";
    container.appendChild(view);

    view.innerHTML =
      '<section class="hero">' +
      '  <h1>Sentence <span class="fx">Forge</span><span class="hero-alpha">Alpha</span></h1>' +
      "  <p>A workshop for the study of sentence structure.</p>" +
      '  <input type="file" accept=".json,application/json" data-role="file" hidden multiple />' +
      "</section>" +
      '<section class="blocks-demo" data-role="blocks-demo" aria-hidden="true">' +
      '  <p class="blocks-demo-cap">Label the same sentence at four layers — watch them stack:</p>' +
      '  <div class="blocks-demo-card card" data-role="blocks-demo-host"></div>' +
      "</section>" +
      '<div class="btn-row btn-row-center hero-actions">' +
      '  <button class="btn btn-primary btn-big" data-act="new">＋ New lesson</button>' +
      '  <button class="btn btn-big" data-act="import">⬆ Import JSON</button>' +
      '  <button class="btn btn-big" data-act="library">📚 Library</button>' +
      "</div>";

    var fileInput = view.querySelector('[data-role="file"]');

    view.querySelector('[data-act="new"]').addEventListener("click", function () {
      try {
        var lesson = wjt.store.save(wjt.store.create());
        location.hash = "#/edit/" + lesson.id;
      } catch (e) {
        wjt.toast(e.message, 6000);
      }
    });

    view.querySelector('[data-act="library"]').addEventListener("click", function () {
      location.hash = "#/library";
    });

    view.querySelector('[data-act="import"]').addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      wjt.importLessonFiles(fileInput.files);   // captures files synchronously
      fileInput.value = "";                      // safe to reset after the call
    });

    var demoHost = view.querySelector('[data-role="blocks-demo-host"]');
    if (demoHost && wjt.buildBlocksDemo) {
      wjt.onViewCleanup(wjt.buildBlocksDemo(demoHost));
    }
  };

  /* ---------------- library view (your lessons + examples) ---------------- */
  wjt.views.library = function (container) {
    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-library";
    container.appendChild(view);

    view.innerHTML =
      '<section data-role="my-lessons">' +
      '  <div class="section-head">' +
      '    <h2 class="section-title">Your lessons</h2>' +
      '    <span class="spacer"></span>' +
      '    <button class="btn btn-sm btn-primary" data-act="new" title="Start a new lesson">＋ New lesson</button>' +
      '    <button class="btn btn-sm" data-act="import" title="Import lessons from a JSON file">⬆ Import</button>' +
      '    <button class="btn btn-sm" data-act="export-all" title="Download every lesson as one JSON">⬇ Export all</button>' +
      '    <input type="file" accept=".json,application/json" data-role="file" hidden multiple />' +
      "  </div>" +
      '  <div class="lesson-grid" data-role="lessons"></div>' +
      "</section>" +
      '<section class="examples-block" data-role="examples-block">' +
      '  <h2 class="section-title">📚 Example library</h2>' +
      '  <p class="muted-note section-sub">Ready-made, fully labeled passages from literature. Loading one adds an editable copy to your lessons.</p>' +
      '  <div class="lesson-grid" data-role="examples"></div>' +
      "</section>";

    var lessonsEl = view.querySelector('[data-role="lessons"]');
    var examplesEl = view.querySelector('[data-role="examples"]');

    function renderLessons() {
      var lessons = wjt.store.list();
      lessonsEl.innerHTML = "";
      if (!lessons.length) {
        lessonsEl.innerHTML =
          '<div class="card empty-state"><svg class="empty-anvil" viewBox="0 0 24 24" aria-hidden="true">' +
          '<polygon points="1.5,8.5 8,6.5 21.5,6.5 21.5,10.5 8,10.5"/>' +
          '<polygon points="10,10.5 16,10.5 15,15 11,15"/>' +
          '<polygon points="5.5,19.5 20.5,19.5 17.5,15 8.5,15"/></svg>' +
          "<h3>No lessons yet</h3><p>Create one, import a JSON file, or load the sample to see how it works.</p></div>";
        return;
      }
      lessons.forEach(function (lesson) {
        var nAnn = lesson.sentences.reduce(function (n, s) { return n + (s.annotations || []).length; }, 0);
        var card = document.createElement("article");
        card.className = "card lesson-card";
        card.innerHTML =
          "<h3>" + wjt.escapeHtml(lesson.title) + "</h3>" +
          (lesson.description ? '<p class="lesson-desc">' + wjt.escapeHtml(lesson.description) + "</p>" : "") +
          '<div class="lesson-meta">' +
          "  <span>" + lesson.sentences.length + " sentence" + (lesson.sentences.length === 1 ? "" : "s") + "</span>" +
          "  <span>·</span><span>" + nAnn + " label" + (nAnn === 1 ? "" : "s") + "</span>" +
          "</div>" +
          '<div class="lesson-layers">' +
          lesson.layers.map(function (l) {
            return '<span class="mini-pill">' + wjt.escapeHtml(wjt.LAYERS[l] ? wjt.LAYERS[l].short : l) + "</span>";
          }).join("") +
          "</div>" +
          '<div class="btn-row lesson-actions">' +
          '  <a class="btn btn-primary" href="#/present/' + lesson.id + '">▶ Present</a>' +
          '  <a class="btn btn-accent" href="#/quiz/' + lesson.id + '">🎯 Practice</a>' +
          '  <a class="btn" href="#/edit/' + lesson.id + '">✎ Edit</a>' +
          '  <span class="spacer"></span>' +
          '  <button class="btn btn-sm" data-act="export" title="Download as JSON">⬇</button>' +
          '  <button class="btn btn-sm" data-act="dup" title="Duplicate">⧉</button>' +
          '  <button class="btn btn-sm btn-danger" data-act="del" title="Delete">✕</button>' +
          "</div>";
        card.querySelector('[data-act="export"]').addEventListener("click", function () {
          var name = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
          wjt.downloadJson(wjt.exportLesson(lesson), name + ".sentence-forge.json");
        });
        card.querySelector('[data-act="dup"]').addEventListener("click", function () {
          wjt.store.duplicate(lesson.id);
          renderLessons();
        });
        card.querySelector('[data-act="del"]').addEventListener("click", function () {
          wjt.confirmDialog({
            message: "Delete “" + lesson.title + "”? This can’t be undone.",
            confirmText: "Delete",
            danger: true,
            onConfirm: function () {
              wjt.store.remove(lesson.id);
              renderLessons();
            },
          });
        });
        lessonsEl.appendChild(card);
      });
    }

    function renderExamples() {
      examplesEl.innerHTML = "";
      (wjt.EXAMPLES || []).forEach(function (ex) {
        var card = document.createElement("article");
        card.className = "card example-card";
        card.innerHTML =
          "<h3>" + wjt.escapeHtml(ex.title) + "</h3>" +
          '<p class="lesson-desc">' + wjt.escapeHtml(ex.subtitle) + "</p>" +
          '<div class="btn-row lesson-actions">' +
          '  <button class="btn btn-primary" data-act="load">＋ Add to my lessons</button>' +
          "</div>";
        card.querySelector('[data-act="load"]').addEventListener("click", function () {
          try {
            var lesson = wjt.store.save(ex.build());
            wjt.toast("Loaded “" + lesson.title + "”.");
            location.hash = "#/present/" + lesson.id;
          } catch (e) {
            wjt.toast(e.message, 6000);
          }
        });
        examplesEl.appendChild(card);
      });
    }

    view.querySelector('[data-act="export-all"]').addEventListener("click", function () {
      if (!wjt.store.list().length) { wjt.toast("No lessons to export."); return; }
      wjt.downloadJson(wjt.exportAllLessons(), "sentence-forge-lessons.json");
    });

    view.querySelector('[data-act="new"]').addEventListener("click", function () {
      try {
        var lesson = wjt.store.save(wjt.store.create());
        location.hash = "#/edit/" + lesson.id;
      } catch (e) {
        wjt.toast(e.message, 6000);
      }
    });

    var fileInput = view.querySelector('[data-role="file"]');
    view.querySelector('[data-act="import"]').addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      wjt.importLessonFiles(fileInput.files, renderLessons);   // captures files synchronously
      fileInput.value = "";                                     // safe to reset after the call
    });

    renderLessons();
    renderExamples();
  };

  /* ---------------- routing ---------------- */
  // After a view swap, land focus on the new view's primary heading so keyboard
  // and screen-reader users start at the *content*, not the page chrome (`route()`
  // replaces #app wholesale, which otherwise drops focus back to <body>). Falls
  // back to #app itself for a view with no h1/h2 (the editor). scrollTo(0,0)
  // already ran, so suppress the focus-scroll to avoid a double jump.
  function focusView(container) {
    var target = container.querySelector("h1, h2") || container;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
  }

  function route() {
    runCleanups();
    wjt.closePopover();
    var container = document.getElementById("app");
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/");
    window.scrollTo(0, 0);

    if (parts[0] === "edit" && parts[1]) wjt.views.editor(container, parts[1]);
    else if (parts[0] === "present" && parts[1]) wjt.views.present(container, parts[1]);
    else if (parts[0] === "quiz" && parts[1]) wjt.views.quiz(container, parts[1]);
    else if (parts[0] === "library") wjt.views.library(container);
    else wjt.views.home(container);

    focusView(container);
  }

  // Full repaint of the current view — used by the palette toggle, since a
  // grammar-color change only takes effect when views re-read colors on render.
  // (Re-assigning the same location.hash would NOT fire hashchange.)
  wjt.rerender = route;

  /* ---------------- boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(localStorage.getItem("sentenceForge.theme") || "dark");
    document.getElementById("theme-toggle").addEventListener("click", function () {
      applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
    });

    // Apply the stored grammar palette BEFORE the first route() below so the
    // opening view paints in the chosen palette (no flash of default colors).
    applyPalette(localStorage.getItem("sentenceForge.palette") || "default");
    document.getElementById("palette-toggle").addEventListener("click", function () {
      applyPalette(wjt.activePalette === "cbSafe" ? "default" : "cbSafe");
      wjt.rerender();   // full repaint; Present resets to slide 1 (accepted trade-off)
    });

    var vEl = document.querySelector('[data-role="version"]');
    if (vEl) vEl.textContent = "v" + wjt.VERSION;

    // Prune empty + un-named drafts left behind by a hard refresh mid-edit (the
    // editor's discard-on-exit guard can't fire on a page reload). Runs before the
    // seed check so a lone abandoned draft never blocks re-seeding the sample.
    wjt.store.list().forEach(function (l) {
      var empty = !l.sentences.length;
      var unnamed = !(l.title || "").trim() || l.title === "Untitled lesson";
      if (empty && unnamed) wjt.store.remove(l.id);
    });

    // First run: seed the sample so the app never starts empty.
    if (!localStorage.getItem("sentenceForge.seeded") && !wjt.store.list().length) {
      wjt.store.save(wjt.buildSampleLesson());
      localStorage.setItem("sentenceForge.seeded", "1");
    }

    window.addEventListener("hashchange", route);
    route();
  });
})();
