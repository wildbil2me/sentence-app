/* Grammar Lab — app shell: routing, library view, import, theme, toasts. */
(function () {
  "use strict";
  window.GL = window.GL || {};
  GL.views = GL.views || {};

  /* ---------------- toasts ---------------- */
  GL.toast = function (msg, ms) {
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
  GL.onViewCleanup = function (fn) { cleanups.push(fn); };
  function runCleanups() {
    cleanups.splice(0).forEach(function (fn) {
      try { fn(); } catch (e) { /* view teardown must never break routing */ }
    });
  }

  /* ---------------- theme ---------------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("grammarLab.theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
  }

  /* ---------------- library view ---------------- */
  GL.views.library = function (container) {
    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-library";
    container.appendChild(view);

    view.innerHTML =
      '<section class="hero">' +
      "  <h1>Grammar <span>Lab</span></h1>" +
      "  <p>Label the building blocks of any sentence — words, parts, phrases, and clauses —<br/>then present the breakdown to your class or let students quiz themselves.</p>" +
      '  <div class="btn-row btn-row-center">' +
      '    <button class="btn btn-primary btn-big" data-act="new">＋ New lesson</button>' +
      '    <button class="btn btn-big" data-act="import">⬆ Import JSON</button>' +
      '    <button class="btn btn-big" data-act="examples">📚 Browse examples</button>' +
      "  </div>" +
      '  <input type="file" accept=".json,application/json" data-role="file" hidden multiple />' +
      "</section>" +
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
    var fileInput = view.querySelector('[data-role="file"]');

    function renderLessons() {
      var lessons = GL.store.list();
      lessonsEl.innerHTML = "";
      if (!lessons.length) {
        lessonsEl.innerHTML =
          '<div class="card empty-state"><div class="empty-emoji">🧪</div>' +
          "<h3>No lessons yet</h3><p>Create one, import a JSON file, or load the sample to see how it works.</p></div>";
        return;
      }
      lessons.forEach(function (lesson) {
        var nAnn = lesson.sentences.reduce(function (n, s) { return n + (s.annotations || []).length; }, 0);
        var card = document.createElement("article");
        card.className = "card lesson-card";
        card.innerHTML =
          "<h3>" + GL.escapeHtml(lesson.title) + "</h3>" +
          (lesson.description ? '<p class="lesson-desc">' + GL.escapeHtml(lesson.description) + "</p>" : "") +
          '<div class="lesson-meta">' +
          "  <span>" + lesson.sentences.length + " sentence" + (lesson.sentences.length === 1 ? "" : "s") + "</span>" +
          "  <span>·</span><span>" + nAnn + " label" + (nAnn === 1 ? "" : "s") + "</span>" +
          "</div>" +
          '<div class="lesson-layers">' +
          lesson.layers.map(function (l) {
            return '<span class="mini-pill">' + GL.escapeHtml(GL.LAYERS[l] ? GL.LAYERS[l].short : l) + "</span>";
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
          GL.downloadJson(GL.exportLesson(lesson), name + ".grammar-lab.json");
        });
        card.querySelector('[data-act="dup"]').addEventListener("click", function () {
          GL.store.duplicate(lesson.id);
          renderLessons();
        });
        card.querySelector('[data-act="del"]').addEventListener("click", function () {
          if (!confirm("Delete “" + lesson.title + "”? This can’t be undone.")) return;
          GL.store.remove(lesson.id);
          renderLessons();
        });
        lessonsEl.appendChild(card);
      });
    }

    function renderExamples() {
      examplesEl.innerHTML = "";
      (GL.EXAMPLES || []).forEach(function (ex) {
        var card = document.createElement("article");
        card.className = "card example-card";
        card.innerHTML =
          "<h3>" + GL.escapeHtml(ex.title) + "</h3>" +
          '<p class="lesson-desc">' + GL.escapeHtml(ex.subtitle) + "</p>" +
          '<div class="btn-row lesson-actions">' +
          '  <button class="btn btn-primary" data-act="load">＋ Add to my lessons</button>' +
          "</div>";
        card.querySelector('[data-act="load"]').addEventListener("click", function () {
          var lesson = GL.store.save(ex.build());
          GL.toast("Loaded “" + lesson.title + "”.");
          location.hash = "#/present/" + lesson.id;
        });
        examplesEl.appendChild(card);
      });
    }

    view.querySelector('[data-act="new"]').addEventListener("click", function () {
      var lesson = GL.store.save(GL.store.create());
      location.hash = "#/edit/" + lesson.id;
    });

    view.querySelector('[data-act="examples"]').addEventListener("click", function () {
      view.querySelector('[data-role="examples-block"]').scrollIntoView({ behavior: "smooth", block: "start" });
    });

    view.querySelector('[data-act="import"]').addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      var files = Array.prototype.slice.call(fileInput.files || []);
      fileInput.value = "";
      files.forEach(function (file) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(reader.result);
            var result = GL.importLesson(data);
            GL.store.save(result.lesson);
            GL.toast("Imported “" + result.lesson.title + "”" +
              (result.warnings.length ? " with " + result.warnings.length + " warning(s) — see console." : "."));
            result.warnings.forEach(function (w) { console.warn("[Grammar Lab import]", w); });
            renderLessons();
          } catch (e) {
            GL.toast("Import failed: " + e.message, 5000);
          }
        };
        reader.readAsText(file);
      });
    });

    renderLessons();
    renderExamples();
  };

  /* ---------------- routing ---------------- */
  function route() {
    runCleanups();
    GL.closePopover();
    var container = document.getElementById("app");
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/");
    window.scrollTo(0, 0);

    if (parts[0] === "edit" && parts[1]) return GL.views.editor(container, parts[1]);
    if (parts[0] === "present" && parts[1]) return GL.views.present(container, parts[1]);
    if (parts[0] === "quiz" && parts[1]) return GL.views.quiz(container, parts[1]);
    return GL.views.library(container);
  }

  /* ---------------- boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(localStorage.getItem("grammarLab.theme") || "dark");
    document.getElementById("theme-toggle").addEventListener("click", function () {
      applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
    });

    // First run: seed the sample so the app never starts empty.
    if (!localStorage.getItem("grammarLab.seeded") && !GL.store.list().length) {
      GL.store.save(GL.buildSampleLesson());
      localStorage.setItem("grammarLab.seeded", "1");
    }

    window.addEventListener("hashchange", route);
    route();
  });
})();
