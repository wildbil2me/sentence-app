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
      '  <a class="btn btn-ghost" href="#/library">← Library</a>' +
      '  <div class="present-title">' +
      "    <h2>" + wjt.escapeHtml(lesson.title) + "</h2>" +
      (lesson.description ? '<p class="muted-note">' + wjt.escapeHtml(lesson.description) + "</p>" : "") +
      "  </div>" +
      '  <div class="present-actions">' +
      '    <a class="btn" href="#/edit/' + lesson.id + '">✎ Edit</a>' +
      '    <a class="btn" href="#/quiz/' + lesson.id + '">🎯 Quiz</a>' +
      '    <button class="btn" data-act="fullscreen" hidden></button>' +
      "  </div>" +
      "</header>" +
      '<div class="present-controls">' +
      '  <div class="layer-chips" data-role="chips"></div>' +
      '  <span class="spacer"></span>' +
      '  <button class="btn btn-sm" data-act="all">Show all</button>' +
      '  <button class="btn btn-sm" data-act="none">Hide all</button>' +
      '  <button class="btn btn-sm" data-act="key" aria-pressed="false">🔑 Key</button>' +
      "</div>" +
      '<div class="present-main">' +
      // The stage is the scroll container for a breakdown taller than the slide,
      // so it is focusable and labelled — otherwise the overflow is mouse-only.
      '  <section class="card stage" data-role="stage" tabindex="0" role="group"' +
      '           aria-label="Sentence breakdown"></section>' +
      // Key and every explanation share this one bounded, in-viewport panel: a
      // drawer pinned open beside the stage on wide screens (idle state = this
      // sentence's badges and the reveal tip), an on-demand bottom sheet on
      // narrow ones. The counter strip above the heading survives either state.
      '  <aside class="present-panel card" data-role="panel" hidden aria-labelledby="present-panel-title">' +
      '    <div class="present-slide-meta" data-role="slide-meta"></div>' +
      '    <div class="present-panel-head">' +
      '      <h3 class="present-panel-title" id="present-panel-title" data-role="panel-title" tabindex="-1"></h3>' +
      '      <button class="btn btn-sm" data-act="panel-close" aria-label="Close panel">✕</button>' +
      "    </div>" +
      '    <div class="present-panel-body" data-role="panel-body"></div>' +
      "  </aside>" +
      '  <nav class="present-nav">' +
      '    <button class="btn btn-big" data-act="prev" title="Previous sentence">↑</button>' +
      '    <div class="dots" data-role="dots"></div>' +
      '    <button class="btn btn-big" data-act="next" title="Next sentence">↓</button>' +
      "  </nav>" +
      "</div>" +
      // Persistent live region (outside the rebuilt stage) so paging to a new
      // sentence is announced to a screen reader, not just shown on screen.
      '<div class="sr-only" data-role="slide-live" aria-live="polite"></div>';

    var chipsEl = view.querySelector('[data-role="chips"]');
    var stageEl = view.querySelector('[data-role="stage"]');
    var dotsEl = view.querySelector('[data-role="dots"]');
    var liveEl = view.querySelector('[data-role="slide-live"]');
    var keyBtn = view.querySelector('[data-act="key"]');
    var panelEl = view.querySelector('[data-role="panel"]');
    var panelTitleEl = view.querySelector('[data-role="panel-title"]');
    var panelBodyEl = view.querySelector('[data-role="panel-body"]');
    var panelMetaEl = view.querySelector('[data-role="slide-meta"]');
    var panelCloseBtn = view.querySelector('[data-act="panel-close"]');

    // Key and every explanation share one bounded, in-viewport panel — only one
    // is active at a time. panelMode tracks which ("key" | "explain" | null);
    // panelTrigger is the control focus returns to when the panel closes.
    var panelMode = null;
    var panelTrigger = null;

    // Wide screens keep the drawer pinned open — idle it shows a hint instead of
    // vanishing. That stops the stage from re-wrapping the sentence every time a
    // label is clicked, and gives the explanations a permanent home to land in.
    // Below the drawer breakpoint the panel is an overlay bottom sheet, so it
    // still opens on demand: pinning it there would cover half the slide.
    var pinnedMq = window.matchMedia("(min-width: 1025px)");
    function isPinned() { return pinnedMq.matches; }

    // The current rendered sentence. A layer toggle patches it in place (see
    // applyVisible) instead of rebuilding.
    var stageRender = null;

    // The slide's own information — which sentence this is, its type badges and
    // teaching-note chip, and the "turn on a level" tip. These are LONG-LIVED
    // nodes, refilled per sentence rather than rebuilt, because placeSlideInfo()
    // moves them between two homes: the pinned drawer (so the stage is nothing
    // but the sentence) and the stage itself (below the drawer breakpoint the
    // panel is an on-demand sheet that is hidden while idle — info parked there
    // would simply vanish).
    var counterEl = document.createElement("div");
    counterEl.className = "slide-counter";
    var slideInfoEl = document.createElement("div");
    slideInfoEl.className = "slide-info";
    var tipEl = document.createElement("div");
    tipEl.className = "slide-tip";
    // No "above": the tip sits beside the chips in the drawer, below them in the
    // stage. Direction-free wording reads right in both homes.
    tipEl.textContent = "Turn on a level to reveal the breakdown.";

    function annsInLayer(annotations, layerId) {
      var n = 0;
      (annotations || []).forEach(function (a) {
        var l = wjt.layerOf(a.label);
        if (l && l.id === layerId) n++;
      });
      return n;
    }

    // Passage total for a layer: the y in the "x / y" chip count.
    function layerCount(layerId) {
      var n = 0;
      lesson.sentences.forEach(function (s) { n += annsInLayer(s.annotations, layerId); });
      return n;
    }

    // Count for the sentence currently on screen: the x in "x / y". This is why
    // renderStage re-runs renderChips — x changes as you page through sentences.
    function renderChips() {
      chipsEl.innerHTML = "";
      var current = lesson.sentences[idx];
      lesson.layers
        .slice()
        .sort(function (a, b) { return wjt.LAYERS[a].order - wjt.LAYERS[b].order; })
        .forEach(function (layerId) {
          var here = annsInLayer(current.annotations, layerId);
          var total = layerCount(layerId);
          var b = document.createElement("button");
          b.type = "button";
          var on = visible.indexOf(layerId) !== -1;
          b.className = "pill pill-lg" + (on ? " is-on" : "");
          b.dataset.layer = layerId;
          b.innerHTML = wjt.escapeHtml(wjt.LAYERS[layerId].name) +
            ' <span class="pill-count">' + here + " / " + total + "</span>";
          b.title = here + " on screen · " + total + " in this passage";
          b.addEventListener("click", function () {
            var next = visible.slice();
            var i = next.indexOf(layerId);
            if (i === -1) next.push(layerId); else next.splice(i, 1);
            setVisible(next);
          });
          chipsEl.appendChild(b);
        });
    }

    function renderDots() {
      dotsEl.innerHTML = "";
      var total = lesson.sentences.length;
      lesson.sentences.forEach(function (_, i) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "dot" + (i === idx ? " is-on" : "");
        d.title = "Sentence " + (i + 1);
        // The visible dot is tiny; a real label + current state carry the meaning
        // for screen readers and keyboard users (the 40px hit area is CSS).
        d.setAttribute("aria-label", "Sentence " + (i + 1) + " of " + total);
        if (i === idx) d.setAttribute("aria-current", "true");
        d.addEventListener("click", function () { idx = i; renderStage(); renderDots(); });
        dotsEl.appendChild(d);
      });
    }

    // "Open" means the panel is showing real content — the pinned drawer's idle
    // hint doesn't count, so Escape falls through to the paging keys.
    function panelIsOpen() { return panelMode !== null; }

    function syncKeyBtn() {
      var on = panelMode === "key";
      keyBtn.setAttribute("aria-pressed", on ? "true" : "false");
      keyBtn.classList.toggle("is-on", on);
    }

    // Open the shared panel. `content` is an HTML string or a DOM node; `trigger`
    // is the control focus returns to on close. Focus lands on the panel heading
    // with preventScroll so opening never jumps the slide.
    function openPanel(mode, title, content, trigger) {
      panelMode = mode;
      panelTrigger = trigger || null;
      panelTitleEl.textContent = title;
      panelBodyEl.innerHTML = "";
      if (typeof content === "string") panelBodyEl.innerHTML = content;
      else if (content) panelBodyEl.appendChild(content);
      panelEl.hidden = false;
      syncKeyBtn();
      try { panelTitleEl.focus({ preventScroll: true }); }
      catch (e) { panelTitleEl.focus(); }
    }

    // The pinned drawer's idle state: this sentence's badges and tip, plus the
    // hint. Never takes focus itself — the first render must not pull focus off
    // the page, and a close only ever hands focus back to its trigger.
    function showSlideInfo() {
      panelMode = null;
      panelTitleEl.textContent = "Label details";
      panelBodyEl.innerHTML = "";
      panelBodyEl.appendChild(slideInfoEl);
      var hint = document.createElement("p");
      hint.className = "muted-note";
      hint.textContent = "Click a label to see more.";
      panelBodyEl.appendChild(hint);
      panelEl.hidden = false;
      syncKeyBtn();
    }

    // Put the counter and the info block in the home the current breakpoint
    // wants. Pinned: the counter is a permanent strip above the panel heading
    // (so it survives an open explanation) and the info block is the idle body.
    // Unpinned: both live in the stage, counter first and info last, with the
    // sentence between them. Called after every render and on every breakpoint
    // change, so a mid-lesson resize relocates them instead of losing them.
    function placeSlideInfo() {
      if (isPinned()) {
        panelMetaEl.appendChild(counterEl);
        // slideInfoEl is placed by showSlideInfo(); while Key or an explanation
        // owns the body it is detached — including when the breakpoint changes
        // with content open, or it would linger in the stage.
        if (panelMode === null) showSlideInfo();
        else if (slideInfoEl.parentNode) slideInfoEl.parentNode.removeChild(slideInfoEl);
      } else {
        stageEl.insertBefore(counterEl, stageEl.firstChild);
        stageEl.appendChild(slideInfoEl);
      }
    }

    // Dismiss whatever the panel is showing: back to the slide info where the
    // drawer is pinned, hidden where it's an overlay sheet. With restoreFocus, focus returns
    // to the trigger when it is still on screen; sentence/route changes pass false
    // because the trigger is being torn down.
    function closePanel(restoreFocus) {
      var t = panelTrigger;
      var wasOpen = panelMode !== null;
      if (isPinned()) showSlideInfo();
      else {
        panelEl.hidden = true;
        panelMode = null;
        syncKeyBtn();
      }
      panelTrigger = null;
      if (wasOpen && restoreFocus && t && view.contains(t)) {
        try { t.focus({ preventScroll: true }); } catch (e) { /* trigger gone */ }
      }
    }

    // Keep the panel's chrome in step with the breakpoint. The ✕ is pointless on
    // a pinned drawer (there is nothing to close it to but the slide info it
    // already falls back to), and a focusable control that does nothing is worse
    // than absent — so it's hidden, not just unstyled.
    function syncPinned() {
      panelCloseBtn.hidden = isPinned();
      placeSlideInfo();                    // counter/badges move to this breakpoint's home
      if (panelMode !== null) return;      // real content stays put either way
      if (!isPinned()) panelEl.hidden = true;
    }

    // The Key legend for the current sentence + visible layers, or a hint when
    // nothing in the shown layers is annotated here yet.
    function keyContent() {
      var content = wjt.renderLegend(lesson.sentences[idx], visible);
      if (content) return content;
      var msg = document.createElement("p");
      msg.className = "muted-note";
      msg.textContent = visible.length
        ? "No labels from the shown levels appear in this sentence."
        : "Turn on a level to see its key.";
      return msg;
    }

    function toggleKey() {
      if (panelMode === "key") { closePanel(true); return; }
      openPanel("key", "Key", keyContent(), keyBtn);
    }

    // Keep the open Key panel in step with the layer toggles, without moving focus.
    function refreshKeyPanel() {
      if (panelMode !== "key") return;
      panelBodyEl.innerHTML = "";
      panelBodyEl.appendChild(keyContent());
    }

    function showExplain(sentence, ann, labelId, trigger) {
      // labelId lets the broad-class (family) chip explain the parent instead
      // of the specific subtype the teacher assigned.
      labelId = labelId || ann.label;
      var label = wjt.LABELS[labelId];
      var isBase = labelId !== ann.label;
      var html =
        '<p class="ann-details-sub">' +
        '<span class="swatch" style="--c:' + label.color + '"></span>' +
        '<span class="muted-note">' + wjt.escapeHtml(wjt.layerOf(labelId).name) + "</span></p>" +
        '<div class="ann-details-quote">“' + wjt.escapeHtml(wjt.spanText(sentence.text, ann)) + "”</div>" +
        (isBase ? '<p class="muted-note">Broad class of “' + wjt.escapeHtml(wjt.LABELS[ann.label].name) + ".”</p>" : "") +
        '<p class="ann-details-desc">' + label.desc + "</p>" +
        '<p class="ann-details-example">Example: ' + label.example + "</p>" +
        (!isBase && ann.note ? '<p class="ann-note">📌 ' + wjt.escapeHtml(ann.note) + "</p>" : "");
      openPanel("explain", label.name, html, trigger || document.activeElement);
    }

    function showNoteExplain(sentence) {
      var html =
        '<div class="ann-details-quote">“' + wjt.escapeHtml(sentence.text) + "”</div>" +
        '<p class="ann-note">📌 ' + wjt.escapeHtml(sentence.notes) + "</p>";
      openPanel("explain", "Teaching note", html, document.activeElement);
    }

    function showTypeExplain(categoryId, optionId) {
      var category = wjt.SENTENCE_TYPES[categoryId];
      var opt = wjt.sentenceTypeOption(categoryId, optionId);
      if (!opt) return;
      var html =
        '<p class="ann-details-sub">' +
        '<span class="swatch" style="--c:' + opt.color + '"></span>' +
        '<span class="muted-note">' + wjt.escapeHtml(category.name) + " · sentence type</span></p>" +
        '<p class="ann-details-desc">' + wjt.escapeHtml(opt.desc) + "</p>" +
        '<p class="ann-details-example">Example: <b>' + wjt.escapeHtml(opt.example) + "</b></p>";
      openPanel("explain", opt.name, html, document.activeElement);
    }

    // A layer toggle within breakdown flips visibility on the already-laid-out
    // sentence: patch the render, the pills' on-state, the tip, and (if open) the
    // Key panel. No rebuild — so no flash and no vertical shift.
    function applyVisible() {
      if (stageRender) stageRender.setLayers(visible);
      var pills = chipsEl.querySelectorAll(".pill[data-layer]");
      for (var i = 0; i < pills.length; i++) {
        pills[i].classList.toggle("is-on", visible.indexOf(pills[i].dataset.layer) !== -1);
      }
      tipEl.hidden = visible.length > 0;
      refreshKeyPanel();
    }

    // Apply a new visible-layer set. Crossing the clean<->breakdown boundary
    // (no layers <-> some layers) changes what the renderer reserves, so it needs
    // a full rebuild; a toggle within breakdown is a cheap in-place patch.
    function setVisible(next) {
      var wasClean = visible.length === 0;
      visible = next;
      if (wasClean !== (visible.length === 0)) renderStage();
      else applyVisible();
    }

    function renderStage() {
      // An explanation is about the annotation just clicked; paging away destroys
      // it, so close it (no focus restore — its trigger is gone). A Key panel is
      // about the sentence as a whole, so it stays open and is refreshed below.
      if (panelMode === "explain") closePanel(false);
      renderChips();
      // Safe to clear: counterEl and slideInfoEl are long-lived nodes held above,
      // so this detaches them rather than destroying them, and placeSlideInfo()
      // at the end puts them back in whichever home the breakpoint wants.
      stageEl.innerHTML = "";
      counterEl.textContent = "Sentence " + (idx + 1) + " of " + lesson.sentences.length;
      var sentence = lesson.sentences[idx];
      if (liveEl) {
        liveEl.textContent = "Sentence " + (idx + 1) + " of " +
          lesson.sentences.length + ": " + sentence.text;
      }
      var r = wjt.renderSentence(sentence, {
        layers: visible,
        // Clean sentence (no layers shown) reserves nothing, so it wraps
        // naturally with no hidden annotation lanes. Once the first layer is on
        // we reserve every layer this lesson teaches, so further reveals/hides
        // slot into a stable diagram instead of resizing the block.
        reserve: visible.length ? lesson.layers : visible,
        size: "lg",
        onAnnClick: function (ann, el, labelId) { showExplain(sentence, ann, labelId, el); },
      });
      stageRender = r;
      // r.root's parent must stay the stage itself: the renderer measures
      // root.parentNode.clientWidth to decide line breaks, so a shrink-to-fit
      // wrapper here would hand it a bogus available width.
      stageEl.appendChild(r.root);
      // Refill the slide-info block for this sentence. Type badges and the note
      // chip share one row; clicking any of them opens the explain card. The note
      // stays a chip, not a printed line, so long teaching notes don't push the
      // layout around. The tip is a persistent child so a layer toggle can
      // show/hide it (applyVisible) without rebuilding anything.
      slideInfoEl.innerHTML = "";
      var badges = wjt.renderTypeBadges(sentence, showTypeExplain);
      var noteChip = wjt.renderSentenceNote(sentence, function () { showNoteExplain(sentence); });
      if (badges || noteChip) {
        var row = badges || document.createElement("div");
        if (!badges) row.className = "type-badges";
        if (noteChip) row.appendChild(noteChip);
        slideInfoEl.appendChild(row);
      }
      tipEl.hidden = visible.length > 0;
      slideInfoEl.appendChild(tipEl);
      placeSlideInfo();
      refreshKeyPanel();
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
      setVisible(lesson.layers.slice());
    });
    view.querySelector('[data-act="none"]').addEventListener("click", function () {
      setVisible([]);
    });
    keyBtn.addEventListener("click", toggleKey);
    view.querySelector('[data-act="panel-close"]').addEventListener("click", function () {
      closePanel(true);
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
      // Escape closes the Key/explanation panel first and restores focus to its
      // trigger (before any Fullscreen-exit the browser might also do).
      if (e.key === "Escape" && panelIsOpen()) { closePanel(true); e.preventDefault(); return; }
      // The stage is the scroll container for a breakdown taller than the slide.
      // While it holds focus itself, Up/Down scroll it natively instead of paging
      // — otherwise the overflow would be mouse-only. Measured at keypress time,
      // so there's no layout-timing guesswork. Deliberately `=== stageEl`, not
      // `contains`: tabbing to a label inside the stage still pages the lesson.
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") &&
          document.activeElement === stageEl &&
          stageEl.scrollHeight > stageEl.clientHeight + 1) return;
      // The switcher reads top-to-bottom now, so Up/Down page too, alongside
      // the original Left/Right. preventDefault keeps Up/Down from scrolling the
      // page out from under a presenter mid-lesson.
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { go(-1); e.preventDefault(); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { go(1); e.preventDefault(); }
      if ((e.key === "f" || e.key === "F") && !fsBtn.hidden) toggleFullscreen();
    }
    document.addEventListener("keydown", onKey);
    // Crossing the drawer breakpoint mid-lesson (a projector switch, a resize)
    // has to settle the panel, or an idle drawer would linger as a bottom sheet
    // covering the slide — or vanish from a layout that reserves room for it.
    if (pinnedMq.addEventListener) pinnedMq.addEventListener("change", syncPinned);
    wjt.onViewCleanup(function () {
      document.removeEventListener("keydown", onKey);
      if (pinnedMq.removeEventListener) pinnedMq.removeEventListener("change", syncPinned);
      document.removeEventListener("fullscreenchange", syncFsBtn);
      document.removeEventListener("webkitfullscreenchange", syncFsBtn);
      if (fsActive() && exitFs) exitFs.call(document);
    });

    syncPinned();
    renderStage();
  };
})();
