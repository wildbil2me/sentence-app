/* Sentence Forge — Present mode: one sentence at a time, projector-friendly.
 * Layer chips toggle each level on/off so teachers can build the
 * breakdown up step by step; clicking any label explains it.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};
  wjt.views = wjt.views || {};

  wjt.views.present = function (container, lessonId) {
    var lesson = wjt.store.get(lessonId);
    if (!lesson) { location.hash = "#/"; return; }
    if (!lesson.sentences.length) {
      location.hash = "#/edit/" + lesson.id;
      wjt.toast("Add some sentences before presenting.");
      return;
    }

    var idx = 0;
    // Start with everything hidden so the teacher can reveal level by level.
    var visible = [];

    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-present";
    container.appendChild(view);

    view.innerHTML =
      '<header class="present-head">' +
      '  <a class="btn btn-ghost" href="#/">← Library</a>' +
      '  <div class="present-title">' +
      "    <h2>" + wjt.escapeHtml(lesson.title) + "</h2>" +
      (lesson.description ? '<p class="muted-note">' + wjt.escapeHtml(lesson.description) + "</p>" : "") +
      "  </div>" +
      '  <span class="spacer"></span>' +
      '  <a class="btn" href="#/edit/' + lesson.id + '">✎ Edit</a>' +
      '  <a class="btn" href="#/quiz/' + lesson.id + '">🎯 Quiz</a>' +
      '  <button class="btn" data-act="fullscreen" hidden></button>' +
      "</header>" +
      '<div class="present-controls">' +
      '  <div class="layer-chips" data-role="chips"></div>' +
      '  <span class="spacer"></span>' +
      '  <button class="btn btn-sm" data-act="all">Show all</button>' +
      '  <button class="btn btn-sm" data-act="none">Hide all</button>' +
      "</div>" +
      '<section class="card stage" data-role="stage"></section>' +
      '<aside class="explain card" data-role="explain" hidden></aside>' +
      '<footer class="present-nav">' +
      '  <button class="btn btn-big" data-act="prev">←</button>' +
      '  <div class="dots" data-role="dots"></div>' +
      '  <button class="btn btn-big" data-act="next">→</button>' +
      "</footer>";

    var chipsEl = view.querySelector('[data-role="chips"]');
    var stageEl = view.querySelector('[data-role="stage"]');
    var explainEl = view.querySelector('[data-role="explain"]');
    var dotsEl = view.querySelector('[data-role="dots"]');

    function layerCount(layerId) {
      var n = 0;
      lesson.sentences.forEach(function (s) {
        (s.annotations || []).forEach(function (a) {
          var l = wjt.layerOf(a.label);
          if (l && l.id === layerId) n++;
        });
      });
      return n;
    }

    function renderChips() {
      chipsEl.innerHTML = "";
      lesson.layers
        .slice()
        .sort(function (a, b) { return wjt.LAYERS[a].order - wjt.LAYERS[b].order; })
        .forEach(function (layerId) {
          var n = layerCount(layerId);
          var b = document.createElement("button");
          b.type = "button";
          var on = visible.indexOf(layerId) !== -1;
          b.className = "pill pill-lg" + (on ? " is-on" : "");
          b.innerHTML = wjt.escapeHtml(wjt.LAYERS[layerId].name) + ' <span class="pill-count">' + n + "</span>";
          b.addEventListener("click", function () {
            var i = visible.indexOf(layerId);
            if (i === -1) visible.push(layerId); else visible.splice(i, 1);
            renderChips();
            renderStage();
          });
          chipsEl.appendChild(b);
        });
    }

    function renderDots() {
      dotsEl.innerHTML = "";
      lesson.sentences.forEach(function (_, i) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "dot" + (i === idx ? " is-on" : "");
        d.title = "Sentence " + (i + 1);
        d.addEventListener("click", function () { idx = i; renderStage(); renderDots(); });
        dotsEl.appendChild(d);
      });
    }

    function hideExplain() { explainEl.hidden = true; }

    function showExplain(sentence, ann, labelId) {
      // labelId lets the broad-class (family) chip explain the parent instead
      // of the specific subtype the teacher assigned.
      labelId = labelId || ann.label;
      var label = wjt.LABELS[labelId];
      var isBase = labelId !== ann.label;
      explainEl.innerHTML =
        '<div class="ann-details-head">' +
        '  <span class="swatch" style="--c:' + label.color + '"></span>' +
        "  <b>" + wjt.escapeHtml(label.name) + "</b>" +
        '  <span class="muted-note">' + wjt.escapeHtml(wjt.layerOf(labelId).name) + "</span>" +
        '  <span class="spacer"></span>' +
        '  <button class="btn btn-sm" data-act="close">✕</button>' +
        "</div>" +
        '<div class="ann-details-quote">“' + wjt.escapeHtml(wjt.spanText(sentence.text, ann)) + "”</div>" +
        (isBase ? '<p class="muted-note">Broad class of “' + wjt.escapeHtml(wjt.LABELS[ann.label].name) + ".”</p>" : "") +
        '<p class="ann-details-desc">' + label.desc + "</p>" +
        '<p class="ann-details-example">Example: ' + label.example + "</p>" +
        (!isBase && ann.note ? '<p class="ann-note">📌 ' + wjt.escapeHtml(ann.note) + "</p>" : "");
      explainEl.hidden = false;
      explainEl.querySelector('[data-act="close"]').addEventListener("click", hideExplain);
    }

    function showTypeExplain(categoryId, optionId) {
      var category = wjt.SENTENCE_TYPES[categoryId];
      var opt = wjt.sentenceTypeOption(categoryId, optionId);
      if (!opt) return;
      explainEl.innerHTML =
        '<div class="ann-details-head">' +
        '  <span class="swatch" style="--c:' + opt.color + '"></span>' +
        "  <b>" + wjt.escapeHtml(opt.name) + "</b>" +
        '  <span class="muted-note">' + wjt.escapeHtml(category.name) + " · sentence type</span>" +
        '  <span class="spacer"></span>' +
        '  <button class="btn btn-sm" data-act="close">✕</button>' +
        "</div>" +
        '<p class="ann-details-desc">' + wjt.escapeHtml(opt.desc) + "</p>" +
        '<p class="ann-details-example">Example: <b>' + wjt.escapeHtml(opt.example) + "</b></p>";
      explainEl.hidden = false;
      explainEl.querySelector('[data-act="close"]').addEventListener("click", hideExplain);
    }

    function renderStage() {
      hideExplain();
      stageEl.innerHTML =
        '<div class="stage-counter">Sentence ' + (idx + 1) + " of " + lesson.sentences.length + "</div>";
      var sentence = lesson.sentences[idx];
      var r = wjt.renderSentence(sentence, {
        layers: visible,
        size: "lg",
        onAnnClick: function (ann, el, labelId) { showExplain(sentence, ann, labelId); },
      });
      stageEl.appendChild(r.root);
      var badges = wjt.renderTypeBadges(sentence, showTypeExplain);
      if (badges) stageEl.appendChild(badges);
      if (!visible.length) {
        var tip = document.createElement("div");
        tip.className = "stage-tip";
        tip.textContent = "Turn on a level above to reveal the breakdown.";
        stageEl.appendChild(tip);
      }
      renderDots();
    }

    function go(delta) {
      var next = idx + delta;
      if (next < 0 || next >= lesson.sentences.length) return;
      idx = next;
      renderStage();
    }

    view.querySelector('[data-act="prev"]').addEventListener("click", function () { go(-1); });
    view.querySelector('[data-act="next"]').addEventListener("click", function () { go(1); });
    view.querySelector('[data-act="all"]').addEventListener("click", function () {
      visible = lesson.layers.slice(); renderChips(); renderStage();
    });
    view.querySelector('[data-act="none"]').addEventListener("click", function () {
      visible = []; renderChips(); renderStage();
    });

    // Full screen — the Fullscreen API works from file:// and needs no network.
    // Unprefixed covers modern Edge/Chrome; the webkit fallback is cheap insurance.
    var fsBtn = view.querySelector('[data-act="fullscreen"]');
    var reqFs = view.requestFullscreen || view.webkitRequestFullscreen;
    var exitFs = document.exitFullscreen || document.webkitExitFullscreen;
    function fsActive() {
      return (document.fullscreenElement || document.webkitFullscreenElement) === view;
    }
    function syncFsBtn() {
      var on = fsActive();
      view.classList.toggle("is-fullscreen", on);
      fsBtn.textContent = on ? "🡼 Exit full screen" : "⛶ Full screen";
    }
    function toggleFullscreen() {
      if (fsActive()) { if (exitFs) exitFs.call(document); }
      else if (reqFs) { reqFs.call(view); }
    }
    if ((document.fullscreenEnabled || document.webkitFullscreenEnabled) && reqFs) {
      fsBtn.hidden = false;
      syncFsBtn();
      fsBtn.addEventListener("click", toggleFullscreen);
      document.addEventListener("fullscreenchange", syncFsBtn);
      document.addEventListener("webkitfullscreenchange", syncFsBtn);
    }

    function onKey(e) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if ((e.key === "f" || e.key === "F") && !fsBtn.hidden) toggleFullscreen();
    }
    document.addEventListener("keydown", onKey);
    wjt.onViewCleanup(function () {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", syncFsBtn);
      document.removeEventListener("webkitfullscreenchange", syncFsBtn);
      if (fsActive() && exitFs) exitFs.call(document);
    });

    renderChips();
    renderStage();
  };
})();
