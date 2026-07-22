/* Sentence Forge — app shell: routing, library view, import, theme, toasts. */
(function () {
  "use strict";
  window.wjt = window.wjt || {};
  wjt.views = wjt.views || {};

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
      var lesson = wjt.store.save(wjt.store.create());
      location.hash = "#/edit/" + lesson.id;
    });

    view.querySelector('[data-act="library"]').addEventListener("click", function () {
      location.hash = "#/library";
    });

    view.querySelector('[data-act="import"]').addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      var files = Array.prototype.slice.call(fileInput.files || []);
      fileInput.value = "";
      var imported = 0;
      files.forEach(function (file) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(reader.result);
            var result = wjt.importLesson(data);
            wjt.store.save(result.lesson);
            imported++;
            wjt.toast("Imported “" + result.lesson.title + "”" +
              (result.warnings.length ? " with " + result.warnings.length + " warning(s) — see console." : "."));
            result.warnings.forEach(function (w) { console.warn("[Sentence Forge import]", w); });
            // The lessons grid lives on the Library screen — go show it there.
            if (location.hash === "#/library") route();
            else location.hash = "#/library";
          } catch (e) {
            wjt.toast("Import failed: " + e.message, 5000);
          }
        };
        reader.readAsText(file);
      });
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
      '  <h2 class="section-title">Your lessons</h2>' +
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
          if (!confirm("Delete “" + lesson.title + "”? This can’t be undone.")) return;
          wjt.store.remove(lesson.id);
          renderLessons();
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
          var lesson = wjt.store.save(ex.build());
          wjt.toast("Loaded “" + lesson.title + "”.");
          location.hash = "#/present/" + lesson.id;
        });
        examplesEl.appendChild(card);
      });
    }

    renderLessons();
    renderExamples();
  };

  /* ---------------- routing ---------------- */
  function route() {
    runCleanups();
    wjt.closePopover();
    var container = document.getElementById("app");
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/");
    window.scrollTo(0, 0);

    if (parts[0] === "edit" && parts[1]) return wjt.views.editor(container, parts[1]);
    if (parts[0] === "present" && parts[1]) return wjt.views.present(container, parts[1]);
    if (parts[0] === "quiz" && parts[1]) return wjt.views.quiz(container, parts[1]);
    if (parts[0] === "library") return wjt.views.library(container);
    return wjt.views.home(container);
  }

  /* ---------------- boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(localStorage.getItem("sentenceForge.theme") || "dark");
    document.getElementById("theme-toggle").addEventListener("click", function () {
      applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
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
