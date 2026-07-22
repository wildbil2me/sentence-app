/* Sentence Forge — teacher editor view. */
(function () {
  "use strict";
  window.wjt = window.wjt || {};
  wjt.views = wjt.views || {};

  wjt.views.editor = function (container, lessonId) {
    var lesson = wjt.store.get(lessonId);
    if (!lesson) {
      location.hash = "#/";
      return;
    }

    // A brand-new lesson is persisted the instant "New lesson" is clicked so the
    // editor can load it by id. If the teacher navigates away without ever giving
    // it a title or a sentence, discard it so empty "Untitled lesson" drafts never
    // clutter the Library. (Both conditions required, per the to-do.)
    wjt.onViewCleanup(function () {
      var empty = !lesson.sentences.length;
      var unnamed = !lesson.title.trim() || lesson.title === "Untitled lesson";
      if (empty && unnamed) wjt.store.remove(lesson.id);
    });

    var savedFlash = null;
    function save() {
      try { wjt.store.save(lesson); } catch (e) { wjt.toast(e.message, 6000); return; }
      if (savedFlash) {
        savedFlash.classList.remove("show");
        void savedFlash.offsetWidth; // restart the animation
        savedFlash.classList.add("show");
      }
    }

    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-editor";
    container.appendChild(view);

    /* ---------------- header ---------------- */
    var header = document.createElement("header");
    header.className = "editor-head card";
    header.innerHTML =
      '<div class="editor-head-top">' +
      '  <a class="btn btn-ghost" href="#/library">← Library</a>' +
      '  <span class="saved-flash" aria-live="polite">Saved ✓</span>' +
      '  <span class="spacer"></span>' +
      '  <a class="btn" href="#/present/' + lesson.id + '">▶ Present</a>' +
      '  <a class="btn" href="#/quiz/' + lesson.id + '">🎯 Quiz</a>' +
      '  <button class="btn" data-act="export">⬇ Export JSON</button>' +
      "</div>" +
      '<input class="title-input" data-role="title" maxlength="80" placeholder="Lesson title" />' +
      '<input class="desc-input" data-role="desc" maxlength="240" placeholder="Description (optional) — what does this lesson teach?" />' +
      '<div class="layer-toggles" data-role="layers"></div>' +
      '<div class="layer-toggles" data-role="palette-tier"></div>';
    view.appendChild(header);

    savedFlash = header.querySelector(".saved-flash");

    var titleInput = header.querySelector('[data-role="title"]');
    titleInput.value = lesson.title;
    titleInput.addEventListener("change", function () {
      lesson.title = titleInput.value.trim() || "Untitled lesson";
      titleInput.value = lesson.title;
      save();
    });

    var descInput = header.querySelector('[data-role="desc"]');
    descInput.value = lesson.description || "";
    descInput.addEventListener("change", function () {
      lesson.description = descInput.value.trim();
      save();
    });

    header.querySelector('[data-act="export"]').addEventListener("click", function () {
      var name = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson";
      wjt.downloadJson(wjt.exportLesson(lesson), name + ".sentence-forge.json");
      wjt.toast("Exported “" + lesson.title + "” as JSON.");
    });

    var layerBox = header.querySelector('[data-role="layers"]');
    function renderLayerToggles() {
      layerBox.innerHTML = '<span class="layer-toggles-label">Teaching levels:</span>';
      wjt.LAYER_ORDER.forEach(function (layerId) {
        var layer = wjt.LAYERS[layerId];
        var on = lesson.layers.indexOf(layerId) !== -1;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pill" + (on ? " is-on" : "");
        b.textContent = layer.name;
        b.title = layer.hint;
        b.addEventListener("click", function () {
          var i = lesson.layers.indexOf(layerId);
          if (i === -1) lesson.layers.push(layerId);
          else if (lesson.layers.length > 1) lesson.layers.splice(i, 1);
          else return wjt.toast("Keep at least one level on.");
          save();
          renderLayerToggles();
          renderSentences();
        });
        layerBox.appendChild(b);
      });
    }
    renderLayerToggles();

    /* Palette size: Essential-only hides the Advanced labels from the picker.
     * Already-placed Advanced annotations stay — only the palette narrows. */
    var tierBox = header.querySelector('[data-role="palette-tier"]');
    function renderTierToggle() {
      tierBox.innerHTML = '<span class="layer-toggles-label">Palette:</span>';
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (lesson.essentialOnly ? " is-on" : "");
      b.textContent = "Essential only";
      b.title = "Hide advanced labels from the label picker. Labels you have already placed stay put.";
      b.addEventListener("click", function () {
        lesson.essentialOnly = !lesson.essentialOnly;
        save();
        renderTierToggle();
      });
      tierBox.appendChild(b);
    }
    renderTierToggle();

    /* ---------------- hint strip ---------------- */
    var hint = document.createElement("div");
    hint.className = "hint-strip";
    hint.innerHTML = "✏️ <b>Drag across words</b> (or click one word), then pick a label. Click any label to add a teaching note or remove it. Tag each sentence's <b>type</b> with the chips on its card.";
    view.appendChild(hint);

    /* ---------------- sentences ---------------- */
    var listEl = document.createElement("div");
    listEl.className = "sentence-list";
    view.appendChild(listEl);

    function annCount(s) { return (s.annotations || []).length; }

    function renderSentences() {
      wjt.closePopover();
      listEl.innerHTML = "";

      if (!lesson.sentences.length) {
        var empty = document.createElement("div");
        empty.className = "card empty-state";
        empty.innerHTML =
          '<div class="empty-emoji">📝</div>' +
          "<h3>Start with your text</h3>" +
          "<p>Paste a paragraph below — Sentence Forge will split it into sentences you can label.</p>";
        listEl.appendChild(empty);
      }

      lesson.sentences.forEach(function (s, idx) {
        listEl.appendChild(sentenceCard(s, idx));
      });

      listEl.appendChild(addTextCard());
    }

    function sentenceCard(s, idx) {
      var card = document.createElement("section");
      card.className = "card sentence-card";

      var head = document.createElement("div");
      head.className = "sentence-card-head";
      head.innerHTML =
        '<span class="sentence-num">Sentence ' + (idx + 1) + "</span>" +
        '<span class="sentence-meta">' + annCount(s) + " label" + (annCount(s) === 1 ? "" : "s") + "</span>" +
        '<span class="spacer"></span>' +
        '<button class="btn btn-sm" data-act="edit" title="Edit the sentence text">✎ Text</button>' +
        (idx < lesson.sentences.length - 1
          ? '<button class="btn btn-sm" data-act="merge" title="Join with the next sentence">⤵ Merge next</button>'
          : "") +
        '<button class="btn btn-sm btn-danger" data-act="del" title="Delete this sentence">✕</button>';
      card.appendChild(head);

      var typeBar = document.createElement("div");
      typeBar.className = "type-picker";
      card.appendChild(typeBar);

      function renderTypePicker() {
        typeBar.innerHTML = "";
        wjt.SENTENCE_TYPE_ORDER.forEach(function (cat) {
          var category = wjt.SENTENCE_TYPES[cat];
          var row = document.createElement("div");
          row.className = "type-picker-row";
          row.innerHTML =
            '<span class="type-picker-label" title="' + wjt.escapeHtml(category.hint) + '">' +
            wjt.escapeHtml(category.name) + "</span>";
          Object.keys(category.options).forEach(function (optId) {
            var opt = category.options[optId];
            var on = s.types && s.types[cat] === optId;
            var b = document.createElement("button");
            b.type = "button";
            b.className = "pill type-pill" + (on ? " is-on" : "");
            b.style.setProperty("--c", opt.color);
            b.textContent = opt.name;
            b.title = opt.desc;
            b.addEventListener("click", function () {
              s.types = s.types || {};
              if (s.types[cat] === optId) delete s.types[cat];
              else s.types[cat] = optId;
              if (!Object.keys(s.types).length) delete s.types;
              save();
              renderTypePicker();
            });
            row.appendChild(b);
          });
          typeBar.appendChild(row);
        });
      }
      renderTypePicker();

      var noteRow = document.createElement("div");
      noteRow.className = "sentence-note-edit";
      var noteInput = document.createElement("input");
      noteInput.type = "text";
      noteInput.className = "sentence-notes-input";
      noteInput.placeholder = "Optional note about this sentence — special handling, etc.";
      noteInput.value = s.notes || "";
      noteInput.addEventListener("input", function () {
        var v = noteInput.value.trim();
        if (v) s.notes = v;
        else delete s.notes;
        save();
      });
      noteRow.innerHTML =
        '<span class="type-picker-label" title="A short note shown in Present mode and Practice">Note</span>';
      noteRow.appendChild(noteInput);
      card.appendChild(noteRow);

      var body = document.createElement("div");
      body.className = "sentence-card-body";
      card.appendChild(body);

      function renderGrid() {
        body.innerHTML = "";
        var r = wjt.renderSentence(s, {
          layers: lesson.layers,
          interactive: true,
          onSelect: function (range) {
            var span = wjt.tokensToSpan(r.tokens, range.first, range.last);
            var rectEl = r.tokenEls[range.last];
            openPalette(s, span, rectEl.getBoundingClientRect(), function changed() {
              r.selection.clear();
              refreshCard();
            }, function cancelled() {
              r.selection.clear();
            });
          },
          onAnnClick: function (ann, el) {
            openAnnDetails(s, ann, el.getBoundingClientRect(), refreshCard);
          },
        });
        body.appendChild(r.root);
        if (!annCount(s)) {
          var tip = document.createElement("div");
          tip.className = "sentence-tip";
          tip.textContent = "Drag across words to add your first label.";
          body.appendChild(tip);
        }
      }

      function refreshCard() {
        head.querySelector(".sentence-meta").textContent =
          annCount(s) + " label" + (annCount(s) === 1 ? "" : "s");
        renderGrid();
        save();
      }

      head.querySelector('[data-act="edit"]').addEventListener("click", function () {
        openTextEditor();
      });
      var mergeBtn = head.querySelector('[data-act="merge"]');
      if (mergeBtn) {
        mergeBtn.addEventListener("click", function () {
          var next = lesson.sentences[idx + 1];
          var offset = s.text.length + 1;
          s.text = s.text + " " + next.text;
          (next.annotations || []).forEach(function (a) {
            s.annotations.push({
              id: wjt.uid(), start: a.start + offset, end: a.end + offset,
              label: a.label, note: a.note || "",
            });
          });
          lesson.sentences.splice(idx + 1, 1);
          save();
          renderSentences();
        });
      }
      head.querySelector('[data-act="del"]').addEventListener("click", function () {
        function doDelete() {
          lesson.sentences.splice(idx, 1);
          save();
          renderSentences();
        }
        if (!annCount(s)) return doDelete();
        wjt.confirmDialog({
          message: "Delete this sentence and its " + annCount(s) + " labels?",
          confirmText: "Delete",
          danger: true,
          onConfirm: doDelete,
        });
      });

      function openTextEditor() {
        body.innerHTML = "";
        var ta = document.createElement("textarea");
        ta.className = "text-edit";
        ta.value = s.text;
        ta.rows = 2;
        var row = document.createElement("div");
        row.className = "btn-row";
        row.innerHTML =
          '<button class="btn btn-primary" data-act="ok">Save text</button>' +
          '<button class="btn" data-act="cancel">Cancel</button>' +
          '<span class="muted-note">Changing the words clears this sentence’s labels.</span>';
        body.appendChild(ta);
        body.appendChild(row);
        ta.focus();

        row.querySelector('[data-act="cancel"]').addEventListener("click", renderGrid);
        row.querySelector('[data-act="ok"]').addEventListener("click", function () {
          var text = ta.value.trim();
          if (!text) return wjt.toast("Sentence text can’t be empty.");
          if (text === s.text) return renderGrid();
          function applyText() {
            var parts = wjt.splitSentences(text);
            var replacements = parts.map(function (p) { return { text: p, annotations: [] }; });
            lesson.sentences.splice.apply(lesson.sentences, [idx, 1].concat(replacements));
            save();
            renderSentences();
          }
          if (!annCount(s)) return applyText();
          wjt.confirmDialog({
            message: "This clears the sentence’s " + annCount(s) + " labels. Continue?",
            confirmText: "Continue",
            onConfirm: applyText,
          });
        });
      }

      renderGrid();
      return card;
    }

    function addTextCard() {
      var card = document.createElement("section");
      card.className = "card add-text-card";
      card.innerHTML =
        '<h3>' + (lesson.sentences.length ? "Add more text" : "Your paragraph") + "</h3>" +
        '<textarea class="text-edit" rows="3" placeholder="Type or paste one or more sentences…"></textarea>' +
        '<div class="btn-row"><button class="btn btn-primary">＋ Add sentences</button></div>';
      var ta = card.querySelector("textarea");
      card.querySelector("button").addEventListener("click", function () {
        var parts = wjt.splitSentences(ta.value);
        if (!parts.length) return wjt.toast("Nothing to add yet — paste some text first.");
        parts.forEach(function (p) { lesson.sentences.push({ text: p, annotations: [] }); });
        ta.value = "";
        save();
        renderSentences();
        wjt.toast("Added " + parts.length + " sentence" + (parts.length === 1 ? "" : "s") + ". Check the split — you can merge or edit any of them.");
      });
      return card;
    }

    /* ---------------- popovers ---------------- */

    function openPalette(sentence, span, rect, onChanged, onCancel) {
      var box = document.createElement("div");
      box.className = "palette";
      var quoted = wjt.spanText(sentence.text, span);
      if (quoted.length > 44) quoted = quoted.slice(0, 42) + "…";
      // Modal label picker: name the target span so a screen reader announces
      // what is being labelled when focus lands inside.
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-label", "Choose a label for “" + quoted + "”");
      box.innerHTML = '<div class="palette-target">“' + wjt.escapeHtml(quoted) + "”</div>";

      function labelButton(labelId, isSub) {
        var label = wjt.LABELS[labelId];
        var b = document.createElement("button");
        b.type = "button";
        b.className = "palette-label" + (isSub ? " palette-label-sub" : "");
        b.style.setProperty("--c", label.color);
        b.innerHTML = "<b>" + wjt.escapeHtml(label.abbr) + "</b> " + wjt.escapeHtml(label.name);
        b.title = label.desc;
        b.addEventListener("click", function () {
          sentence.annotations.push({
            id: wjt.uid(), start: span.start, end: span.end, label: labelId, note: "",
          });
          wjt.closePopover();
          onChanged();
        });
        return b;
      }

      // Essential-only narrows the picker; it never touches saved annotations.
      var essentialOnly = !!lesson.essentialOnly;

      lesson.layers
        .slice()
        .sort(function (a, b) { return wjt.LAYERS[a].order - wjt.LAYERS[b].order; })
        .forEach(function (layerId) {
          var group = document.createElement("div");
          group.className = "palette-group";
          // Expose the layer grouping so a screen reader announces which layer a
          // label belongs to when moving between the grouped buttons.
          group.setAttribute("role", "group");
          group.setAttribute("aria-label", wjt.LAYERS[layerId].name);
          group.innerHTML = '<div class="palette-group-name">' + wjt.LAYERS[layerId].name + "</div>";
          var shown = 0;

          if (wjt.layerHasSubtypes(layerId)) {
            // Drill-down layout: each base label, then its subtypes indented.
            var stack = document.createElement("div");
            stack.className = "palette-grid palette-grid-stacked";
            wjt.baseLabelsForLayer(layerId).forEach(function (baseId) {
              var children = wjt.filterTier(wjt.childrenOf(baseId), essentialOnly);
              // An Advanced base still shows if it heads Essential children —
              // otherwise they would be orphaned under no umbrella.
              if (essentialOnly && !wjt.isEssential(baseId) && !children.length) return;
              var sub = document.createElement("div");
              sub.className = "palette-subgroup";
              sub.appendChild(labelButton(baseId, false));
              children.forEach(function (cid) { sub.appendChild(labelButton(cid, true)); });
              stack.appendChild(sub);
              shown++;
            });
            group.appendChild(stack);
          } else {
            var grid = document.createElement("div");
            grid.className = "palette-grid";
            wjt.filterTier(wjt.labelsForLayer(layerId), essentialOnly).forEach(function (labelId) {
              grid.appendChild(labelButton(labelId, false));
              shown++;
            });
            group.appendChild(grid);
          }

          if (shown) box.appendChild(group);
        });

      var prevFocus = document.activeElement;
      var pop = wjt.showPopover(rect, box);

      // Modal picker: land focus on the first label, trap Tab within the popover
      // while open, and restore focus on close — mirrors wjt.confirmDialog. The
      // Escape/outside-click dismiss is already wired by wjt.showPopover; the
      // MutationObserver below hangs the restore off any close path.
      var firstLabel = box.querySelector(".palette-label");
      if (firstLabel) firstLabel.focus();

      function trapTab(e) {
        if (e.key !== "Tab") return;
        var f = box.querySelectorAll(".palette-label");
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      document.addEventListener("keydown", trapTab);

      var torn = false;
      function teardown() {
        if (torn) return;
        torn = true;
        document.removeEventListener("keydown", trapTab);
        if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) { /* gone */ } }
      }
      // Drop the trap handler if the view is swapped while the popover is open.
      wjt.onViewCleanup(teardown);

      // If the popover is dismissed without choosing, clear the selection.
      var obs = new MutationObserver(function () {
        if (!document.body.contains(pop)) { obs.disconnect(); teardown(); onCancel && onCancel(); }
      });
      obs.observe(document.body, { childList: true });
    }

    function openAnnDetails(sentence, ann, rect, onChanged) {
      var label = wjt.LABELS[ann.label];
      var box = document.createElement("div");
      box.className = "ann-details";
      box.innerHTML =
        '<div class="ann-details-head">' +
        '  <span class="swatch" style="--c:' + label.color + '"></span>' +
        "  <b>" + wjt.escapeHtml(label.name) + "</b>" +
        '  <span class="muted-note">' + wjt.escapeHtml(wjt.layerOf(ann.label).name) + "</span>" +
        "</div>" +
        '<div class="ann-details-quote">“' + wjt.escapeHtml(wjt.spanText(sentence.text, ann)) + "”</div>" +
        '<p class="ann-details-desc">' + label.desc + "</p>" +
        '<textarea class="text-edit" rows="2" placeholder="Teaching note (shown in Present mode and quiz feedback)…"></textarea>' +
        '<div class="btn-row">' +
        '  <button class="btn btn-primary" data-act="note">Save note</button>' +
        '  <button class="btn btn-danger" data-act="del">Remove label</button>' +
        "</div>";
      var ta = box.querySelector("textarea");
      ta.value = ann.note || "";
      box.querySelector('[data-act="note"]').addEventListener("click", function () {
        ann.note = ta.value.trim();
        wjt.closePopover();
        onChanged();
      });
      box.querySelector('[data-act="del"]').addEventListener("click", function () {
        var i = sentence.annotations.indexOf(ann);
        if (i !== -1) sentence.annotations.splice(i, 1);
        wjt.closePopover();
        onChanged();
      });
      wjt.showPopover(rect, box);
    }

    renderSentences();
  };
})();
