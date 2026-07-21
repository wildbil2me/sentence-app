/* Sentence Forge — shared sentence renderer + drag-selection.
 *
 * A sentence renders as one CSS grid with a column per token:
 *   row 1        part-of-speech chips (when the pos layer is visible)
 *   row 2        the tokens themselves
 *   rows 3+      span bars for sentence parts / phrases / clauses,
 *                one grid row per "lane" so overlapping spans stack.
 * Because bars and chips share the tokens' grid columns, everything
 * stays perfectly aligned at any font size.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};

  var BAR_LAYERS = ["part", "phrase", "clause"];

  /**
   * Render one sentence.
   * opts: {
   *   layers: ["pos","phrase",...]  visible layers (default: all),
   *   showAnnotations: true,        false = plain tokens only (quiz "find"),
   *   interactive: false,           enable drag selection,
   *   onSelect(range, evt),         drag finished ({first,last} token idxs),
   *   onAnnClick(ann, el),          an existing chip/bar was clicked,
   *   highlight: {start,end},       char span to spotlight (quiz questions),
   *   size: "md" | "lg"             lg = presentation scale
   * }
   * Returns { root, grid, tokens, tokenEls, selection }.
   */
  wjt.renderSentence = function (sentence, opts) {
    opts = opts || {};
    var layers = opts.layers || wjt.LAYER_ORDER;
    var show = opts.showAnnotations !== false;
    var tokens = wjt.tokenize(sentence.text);
    var anns = (sentence.annotations || []).slice();

    var root = document.createElement("div");
    root.className = "gl-sentence" + (opts.size === "lg" ? " gl-size-lg" : "");

    var grid = document.createElement("div");
    grid.className = "gl-grid" + (opts.interactive ? " is-interactive" : "");
    grid.style.gridTemplateColumns = "repeat(" + tokens.length + ", max-content)";
    root.appendChild(grid);

    /* --- work out rows ---
     * When any word is labeled with a drill-down subtype (e.g. Proper Noun),
     * the chips stack in two rows: the broad class on top, the specific type
     * just above the word. Otherwise a single chip row sits above the words. */
    var posAnns = show && layers.indexOf("pos") !== -1
      ? anns.filter(function (a) { return wjt.layerOf(a.label) && wjt.layerOf(a.label).id === "pos"; })
      : [];
    var anySubtype = posAnns.some(function (a) {
      return wjt.LABELS[a.label] && wjt.LABELS[a.label].parent;
    });
    var baseRow = anySubtype ? 1 : 0;                                  // broad-class chips
    var specRow = posAnns.length ? (anySubtype ? 2 : 1) : 0;           // specific chips (nearest word)
    var tokenRow = posAnns.length ? (anySubtype ? 3 : 2) : 1;

    /* --- token cells --- */
    var hlRange = opts.highlight ? wjt.spanToTokens(tokens, opts.highlight.start, opts.highlight.end) : null;
    var tokenEls = tokens.map(function (t) {
      var el = document.createElement("span");
      el.className = "gl-token";
      el.textContent = t.text;
      el.dataset.i = t.i;
      el.style.gridRow = tokenRow;
      el.style.gridColumn = (t.i + 1) + "";
      if (hlRange && t.i >= hlRange.first && t.i <= hlRange.last) {
        el.classList.add("is-hl");
        if (t.i === hlRange.first) el.classList.add("is-hl-first");
        if (t.i === hlRange.last) el.classList.add("is-hl-last");
      }
      grid.appendChild(el);
      return el;
    });

    /* --- part-of-speech chips + colored underlines --- */
    posAnns.forEach(function (a) {
      var label = wjt.LABELS[a.label];
      if (!label) return;
      var range = wjt.spanToTokens(tokens, a.start, a.end);
      if (!range) return;
      var col = (range.first + 1) + " / " + (range.last + 2);

      // Family chip (the parent's broad class), shown above a drilled-down type.
      var parent = label.parent ? wjt.LABELS[label.parent] : null;
      if (parent) {
        var pchip = document.createElement("button");
        pchip.type = "button";
        pchip.className = "gl-chip gl-chip-parent";
        pchip.textContent = parent.abbr;
        pchip.title = parent.name + " (broad class of " + label.name + ")";
        pchip.style.gridRow = baseRow;
        pchip.style.gridColumn = col;
        pchip.style.setProperty("--c", label.color);
        if (opts.onAnnClick) {
          // Third arg: explain the broad class, not the specific subtype.
          pchip.addEventListener("click", function (e) { e.stopPropagation(); opts.onAnnClick(a, pchip, label.parent); });
        }
        grid.appendChild(pchip);
      }

      // Specific chip (the label the teacher assigned), nearest the word.
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "gl-chip";
      chip.textContent = label.abbr;
      chip.title = label.name + (a.note ? " — " + a.note : "");
      chip.style.gridRow = specRow;
      chip.style.gridColumn = col;
      chip.style.setProperty("--c", label.color);
      if (opts.onAnnClick) {
        chip.addEventListener("click", function (e) { e.stopPropagation(); opts.onAnnClick(a, chip); });
      }
      grid.appendChild(chip);

      for (var i = range.first; i <= range.last; i++) {
        tokenEls[i].classList.add("has-pos");
        tokenEls[i].style.setProperty("--c", label.color);
      }
    });

    /* --- span bars, one block of lanes per layer --- */
    var nextRow = tokenRow + 1;
    if (show) {
      BAR_LAYERS.forEach(function (layerId) {
        if (layers.indexOf(layerId) === -1) return;
        var layerAnns = anns
          .map(function (a) {
            var l = wjt.layerOf(a.label);
            if (!l || l.id !== layerId) return null;
            var range = wjt.spanToTokens(tokens, a.start, a.end);
            return range ? { ann: a, range: range } : null;
          })
          .filter(Boolean)
          .sort(function (x, y) {
            return x.range.first - y.range.first ||
              (y.range.last - y.range.first) - (x.range.last - x.range.first);
          });
        if (!layerAnns.length) return;

        // Greedy lane packing: reuse a lane when the previous bar ended.
        var laneEnds = [];
        layerAnns.forEach(function (item) {
          var lane = -1;
          for (var li = 0; li < laneEnds.length; li++) {
            if (laneEnds[li] < item.range.first) { lane = li; break; }
          }
          if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1); }
          laneEnds[lane] = item.range.last;
          item.lane = lane;
        });

        layerAnns.forEach(function (item) {
          var label = wjt.LABELS[item.ann.label];
          var bar = document.createElement("button");
          bar.type = "button";
          bar.className = "gl-bar";
          bar.style.gridRow = (nextRow + item.lane) + "";
          bar.style.gridColumn = (item.range.first + 1) + " / " + (item.range.last + 2);
          bar.style.setProperty("--c", label.color);
          bar.innerHTML =
            '<span class="gl-bar-abbr">' + wjt.escapeHtml(label.abbr) + "</span>" +
            '<span class="gl-bar-name">' + wjt.escapeHtml(label.name) + "</span>" +
            (item.ann.note ? '<span class="gl-bar-note" title="Has a note">✎</span>' : "");
          bar.title = label.name + (item.ann.note ? " — " + item.ann.note : "");
          if (opts.onAnnClick) {
            bar.addEventListener("click", function (e) { e.stopPropagation(); opts.onAnnClick(item.ann, bar); });
          }
          grid.appendChild(bar);
        });
        nextRow += laneEnds.length;
      });
    }

    var selection = opts.interactive
      ? wjt.attachSelection(grid, tokenEls, opts.onSelect || function () {})
      : null;

    return { root: root, grid: grid, tokens: tokens, tokenEls: tokenEls, selection: selection };
  };

  /**
   * Render a sentence's type badges (structure / purpose) as a row of chips.
   * Returns a DOM element, or null if the sentence carries no types.
   * If `onClick` is given, each badge calls onClick(categoryId, optionId).
   */
  wjt.renderTypeBadges = function (sentence, onClick) {
    var types = sentence && sentence.types;
    if (!types) return null;
    var present = wjt.SENTENCE_TYPE_ORDER.filter(function (cat) { return types[cat]; });
    if (!present.length) return null;

    var row = document.createElement("div");
    row.className = "type-badges";
    present.forEach(function (cat) {
      var opt = wjt.sentenceTypeOption(cat, types[cat]);
      if (!opt) return;
      var el = document.createElement(onClick ? "button" : "span");
      el.className = "type-badge";
      el.style.setProperty("--c", opt.color);
      el.innerHTML =
        '<span class="type-badge-cat">' + wjt.escapeHtml(wjt.SENTENCE_TYPES[cat].name) + "</span>" +
        '<span class="type-badge-name">' + wjt.escapeHtml(opt.name) + "</span>";
      el.title = opt.desc;
      if (onClick) {
        el.type = "button";
        el.addEventListener("click", function (e) { e.stopPropagation(); onClick(cat, types[cat]); });
      }
      row.appendChild(el);
    });
    return row;
  };

  /**
   * Drag-to-select whole tokens inside one grid. Works with mouse and touch
   * (tokens set touch-action: none in CSS). Single click selects one token.
   * Returns { clear(), set(range), get() }.
   */
  wjt.attachSelection = function (grid, tokenEls, onDone) {
    var anchor = -1, head = -1;

    function paint() {
      var lo = Math.min(anchor, head), hi = Math.max(anchor, head);
      tokenEls.forEach(function (el, i) {
        var on = anchor > -1 && i >= lo && i <= hi;
        el.classList.toggle("is-sel", on);
        el.classList.toggle("is-sel-first", on && i === lo);
        el.classList.toggle("is-sel-last", on && i === hi);
      });
    }

    grid.addEventListener("pointerdown", function (e) {
      var t = e.target.closest && e.target.closest(".gl-token");
      if (!t || e.button > 0) return;
      e.preventDefault();
      anchor = head = +t.dataset.i;
      paint();

      function move(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        var tk = el && el.closest && el.closest(".gl-token");
        if (tk && tk.parentNode === grid) { head = +tk.dataset.i; paint(); }
      }
      function up(ev) {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (anchor > -1) {
          onDone({ first: Math.min(anchor, head), last: Math.max(anchor, head) }, ev);
        }
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });

    return {
      clear: function () { anchor = head = -1; paint(); },
      set: function (range) { anchor = range.first; head = range.last; paint(); },
      get: function () {
        return anchor === -1 ? null
          : { first: Math.min(anchor, head), last: Math.max(anchor, head) };
      },
    };
  };

  /* ------------------------------------------------------------------ *
   * Floating popover (label palette, annotation details) — one at a time.
   * ------------------------------------------------------------------ */
  var popEl = null;
  var popCleanup = null;

  wjt.closePopover = function () {
    if (popCleanup) { popCleanup(); popCleanup = null; }
    if (popEl) { popEl.remove(); popEl = null; }
  };

  /** Show `contentEl` in a popover anchored near DOMRect `rect`. */
  wjt.showPopover = function (rect, contentEl) {
    wjt.closePopover();
    popEl = document.createElement("div");
    popEl.className = "gl-popover";
    popEl.appendChild(contentEl);
    document.body.appendChild(popEl);

    var pw = popEl.offsetWidth, ph = popEl.offsetHeight;
    var x = rect.left + rect.width / 2 - pw / 2 + window.scrollX;
    var y = rect.bottom + 10 + window.scrollY;
    x = Math.max(8, Math.min(x, window.scrollX + document.documentElement.clientWidth - pw - 8));
    if (rect.bottom + ph + 20 > window.innerHeight && rect.top - ph - 10 > 0) {
      y = rect.top - ph - 10 + window.scrollY;
    }
    popEl.style.left = x + "px";
    popEl.style.top = y + "px";

    function onDown(e) { if (popEl && !popEl.contains(e.target)) wjt.closePopover(); }
    function onKey(e) { if (e.key === "Escape") wjt.closePopover(); }
    setTimeout(function () {
      document.addEventListener("pointerdown", onDown);
      document.addEventListener("keydown", onKey);
    }, 0);
    popCleanup = function () {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    return popEl;
  };
})();
