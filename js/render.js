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
   *   reserve: ["pos","phrase",...] layers to lay out but keep hidden when not
   *                                 in `layers`, so toggling a layer reveals it
   *                                 in place instead of resizing the block
   *                                 (default: `layers`, i.e. no reservation),
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
    // Layers laid out but possibly hidden: their rows are built so the block
    // keeps a constant height as `layers` is toggled. Defaults to `layers`,
    // which reserves nothing and reproduces the legacy layout exactly.
    var reserve = opts.reserve || layers;
    // Visible layers are mutable: setLayers() updates this and patches the
    // existing DOM, so a caller (Present) can toggle a layer without a rebuild.
    // layout() reads it too, so a resize reflow reproduces the current state.
    var curLayers = layers.slice();
    function shown(layerId) { return curLayers.indexOf(layerId) !== -1; }
    var show = opts.showAnnotations !== false;
    var tokens = wjt.tokenize(sentence.text);
    var anns = (sentence.annotations || []).slice();

    var root = document.createElement("div");
    root.className = "gl-sentence" + (opts.size === "lg" ? " gl-size-lg" : "");

    // Empty sentence: nothing to lay out.
    if (!tokens.length) {
      return { root: root, grid: root, tokens: tokens, tokenEls: [], selection: null, setLayers: function () {} };
    }

    function annKey(a) { return a.id || (a.start + ":" + a.end + ":" + a.label); }

    /* --- precompute annotation ranges (global; independent of line breaks) --- *
     * Items are computed for every *reserved* layer; whether a layer is actually
     * shown is a per-item flag the layout turns into a `gl-hidden` class, so a
     * reserved-but-hidden layer still occupies its rows/lanes. */
    var posShown = show && shown("pos");
    var posItems = (show && reserve.indexOf("pos") !== -1
      ? anns.filter(function (a) { return wjt.layerOf(a.label) && wjt.layerOf(a.label).id === "pos"; })
      : [])
      .map(function (a) {
        var label = wjt.LABELS[a.label];
        if (!label) return null;
        var range = wjt.spanToTokens(tokens, a.start, a.end);
        return range ? { ann: a, range: range, label: label } : null;
      })
      .filter(Boolean);

    // One sorted item list per reserved bar layer, tagged with its layer id
    // (layout reads the live `shown` state to decide whether it's visible).
    var barLayers = show
      ? BAR_LAYERS
          .filter(function (layerId) { return reserve.indexOf(layerId) !== -1; })
          .map(function (layerId) {
            return {
              layerId: layerId,
              items: anns
                .map(function (a) {
                  var l = wjt.layerOf(a.label);
                  if (!l || l.id !== layerId) return null;
                  var range = wjt.spanToTokens(tokens, a.start, a.end);
                  return range ? { ann: a, range: range, label: wjt.LABELS[a.label] } : null;
                })
                .filter(Boolean)
                .sort(function (x, y) {
                  return x.range.first - y.range.first ||
                    (y.range.last - y.range.first) - (x.range.last - x.range.first);
                }),
            };
          })
      : [];

    /* --- token cells: built once, re-parented into their line-grid on reflow --- */
    var hlRange = opts.highlight ? wjt.spanToTokens(tokens, opts.highlight.start, opts.highlight.end) : null;
    var tokenEls = tokens.map(function (t) {
      var el = document.createElement("span");
      el.className = "gl-token";
      el.textContent = t.text;
      el.dataset.i = t.i;
      if (hlRange && t.i >= hlRange.first && t.i <= hlRange.last) {
        el.classList.add("is-hl");
        if (t.i === hlRange.first) el.classList.add("is-hl-first");
        if (t.i === hlRange.last) el.classList.add("is-hl-last");
      }
      return el;
    });

    // The part-of-speech underline is per token (global) — colour it once. The
    // token's transparent bottom border always reserves the space; only the
    // colour is withheld when the pos layer is reserved but hidden.
    if (posShown) {
      posItems.forEach(function (item) {
        for (var i = item.range.first; i <= item.range.last; i++) {
          tokenEls[i].classList.add("has-pos");
          tokenEls[i].style.setProperty("--c", item.label.color);
        }
      });
    }

    /* --- lay the sentence out across `lines` (each a global {first,last}) --- *
     * One .gl-grid per visual line, stacked vertically. Chips and bars are
     * clipped to each line; a span that crosses a break renders as one squared
     * segment per line. Rows and lanes are recomputed per line — the grids are
     * independent, so a lane number can't (and needn't) align across lines. */
    function clip(range, lineFirst, lineLast) {
      if (range.last < lineFirst || range.first > lineLast) return null;
      return { first: Math.max(range.first, lineFirst), last: Math.min(range.last, lineLast) };
    }
    function contClass(seg, range) {
      return (seg.first > range.first ? " is-cont-left" : "") +
        (seg.last < range.last ? " is-cont-right" : "");
    }

    function layout(lines) {
      root.innerHTML = "";
      lines.forEach(function (line) {
        var lineFirst = line.first, lineLast = line.last;
        function cols(seg) {
          return (seg.first - lineFirst + 1) + " / " + (seg.last - lineFirst + 2);
        }

        // Chips that touch this line, and the resulting row layout for it.
        var linePos = posItems
          .map(function (item) {
            var seg = clip(item.range, lineFirst, lineLast);
            return seg ? { item: item, seg: seg } : null;
          })
          .filter(Boolean);
        var anySubtype = linePos.some(function (p) { return p.item.label.parent; });
        var baseRow = anySubtype ? 1 : 0;                          // broad-class chips
        var specRow = linePos.length ? (anySubtype ? 2 : 1) : 0;   // specific chips
        var tokenRow = linePos.length ? (anySubtype ? 3 : 2) : 1;

        var grid = document.createElement("div");
        grid.className = "gl-grid" + (opts.interactive ? " is-interactive" : "");
        grid.style.gridTemplateColumns = "repeat(" + (lineLast - lineFirst + 1) + ", max-content)";

        for (var i = lineFirst; i <= lineLast; i++) {
          var el = tokenEls[i];
          el.style.gridRow = tokenRow;
          el.style.gridColumn = (i - lineFirst + 1) + "";
          grid.appendChild(el);
        }

        var posHide = shown("pos") ? "" : " gl-hidden";
        linePos.forEach(function (p) {
          var item = p.item, seg = p.seg, label = item.label, col = cols(seg);
          var cc = contClass(seg, item.range) + posHide;

          var parent = label.parent ? wjt.LABELS[label.parent] : null;
          if (parent) {
            var pchip = document.createElement("button");
            pchip.type = "button";
            pchip.className = "gl-chip gl-chip-parent" + cc;
            pchip.textContent = parent.abbr;
            pchip.title = parent.name + " (broad class of " + label.name + ")";
            pchip.style.gridRow = baseRow;
            pchip.style.gridColumn = col;
            pchip.style.setProperty("--c", label.color);
            pchip.dataset.ann = annKey(item.ann);
            pchip.dataset.layer = "pos";
            if (opts.onAnnClick) {
              // Third arg: explain the broad class, not the specific subtype.
              pchip.addEventListener("click", function (e) { e.stopPropagation(); opts.onAnnClick(item.ann, pchip, label.parent); });
            }
            grid.appendChild(pchip);
          }

          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "gl-chip" + cc;
          chip.textContent = label.abbr;
          chip.title = label.name + (item.ann.note ? " — " + item.ann.note : "");
          chip.style.gridRow = specRow;
          chip.style.gridColumn = col;
          chip.style.setProperty("--c", label.color);
          chip.dataset.ann = annKey(item.ann);
          chip.dataset.layer = "pos";
          if (opts.onAnnClick) {
            chip.addEventListener("click", function (e) { e.stopPropagation(); opts.onAnnClick(item.ann, chip); });
          }
          grid.appendChild(chip);
        });

        // Span bars: clip to the line, then pack lanes on the clipped ranges.
        var nextRow = tokenRow + 1;
        barLayers.forEach(function (bl) {
          var barHide = shown(bl.layerId) ? "" : " gl-hidden";
          var lineItems = bl.items
            .map(function (item) {
              var seg = clip(item.range, lineFirst, lineLast);
              return seg ? { item: item, seg: seg } : null;
            })
            .filter(Boolean);
          if (!lineItems.length) return;

          var laneEnds = [];
          lineItems.forEach(function (li) {
            var lane = -1;
            for (var k = 0; k < laneEnds.length; k++) {
              if (laneEnds[k] < li.seg.first) { lane = k; break; }
            }
            if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1); }
            laneEnds[lane] = li.seg.last;
            li.lane = lane;
          });

          lineItems.forEach(function (li) {
            var item = li.item, seg = li.seg, label = item.label;
            var cont = contClass(seg, item.range);
            var bar = document.createElement("button");
            bar.type = "button";
            bar.className = "gl-bar" + cont + barHide;
            bar.style.gridRow = (nextRow + li.lane) + "";
            bar.style.gridColumn = cols(seg);
            bar.style.setProperty("--c", label.color);
            bar.dataset.ann = annKey(item.ann);
            bar.dataset.layer = bl.layerId;
            // Label text on the true start segment only; continuations stay bare.
            bar.innerHTML = seg.first > item.range.first ? "" :
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

        root.appendChild(grid);
      });
    }

    /* --- decide line breaks by measuring the real, laid-out tokens --- *
     * Available width comes from the host (the container the caller inserts
     * `root` into), which is stable full-width; `root` itself shrinks to its
     * content in centered layouts like Present, so it can't be measured. */
    function computeLines() {
      var host = root.parentNode;
      var probe = host && host.nodeType === 1 ? host : root;
      var avail = probe.clientWidth;
      if (!avail) return null;
      var pcs = window.getComputedStyle(probe);
      avail -= (parseFloat(pcs.paddingLeft) || 0) + (parseFloat(pcs.paddingRight) || 0);
      var gap = 0;
      var g = root.querySelector(".gl-grid");
      if (g) {
        var gcs = window.getComputedStyle(g);
        gap = parseFloat(gcs.columnGap) || 0;
        avail -= (parseFloat(gcs.paddingLeft) || 0) + (parseFloat(gcs.paddingRight) || 0);
      }
      if (avail <= 0) return null;

      var lines = [];
      var start = 0, used = 0;
      for (var i = 0; i < tokenEls.length; i++) {
        var w = tokenEls[i].getBoundingClientRect().width;
        if (i > start && used + gap + w > avail) {
          lines.push({ first: start, last: i - 1 });
          start = i;
          used = w;
        } else {
          used += (i === start ? w : gap + w);
        }
      }
      lines.push({ first: start, last: tokenEls.length - 1 });
      return lines;
    }

    // Start as a single line — byte-for-byte the legacy layout, and the state
    // we measure from once the caller has inserted `root`.
    layout([{ first: 0, last: tokens.length - 1 }]);
    var lastKey = "0:" + (tokens.length - 1);

    var ro = null, pending = false;
    function reflow() {
      if (!root.isConnected) { if (ro) ro.disconnect(); return; }
      var lines = computeLines();
      if (!lines) return;
      var key = lines.map(function (l) { return l.first + ":" + l.last; }).join(",");
      if (key === lastKey) return;
      lastKey = key;
      layout(lines);
    }
    // Relayout on the next frame, not inside the observer callback: rebuilding
    // the grids changes `root`'s own size, and doing that synchronously trips
    // the "ResizeObserver loop" warning.
    function scheduleReflow() {
      if (pending) return;
      pending = true;
      var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
      raf(function () { pending = false; reflow(); });
    }
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleReflow);
      ro.observe(root);
    }

    var selection = opts.interactive
      ? wjt.attachSelection(root, tokenEls, opts.onSelect || function () {})
      : null;

    // Show/hide layers on the already-laid-out sentence. Toggling visibility
    // never changes token widths, so line breaks and every reserved row stay
    // put — no rebuild, no reflow, and no pop-in replay (the DOM is patched, not
    // recreated). layout() reads curLayers, so a later reflow keeps this state.
    function setLayers(next) {
      curLayers = (next || []).slice();
      tokenEls.forEach(function (el) {
        el.classList.remove("has-pos");
        el.style.removeProperty("--c");
      });
      if (show && shown("pos")) {
        posItems.forEach(function (item) {
          for (var i = item.range.first; i <= item.range.last; i++) {
            tokenEls[i].classList.add("has-pos");
            tokenEls[i].style.setProperty("--c", item.label.color);
          }
        });
      }
      var els = root.querySelectorAll("[data-layer]");
      for (var k = 0; k < els.length; k++) {
        els[k].classList.toggle("gl-hidden", !shown(els[k].dataset.layer));
      }
    }

    return { root: root, grid: root, tokens: tokens, tokenEls: tokenEls, selection: selection, setLayers: setLayers };
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
  wjt.attachSelection = function (container, tokenEls, onDone) {
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

    container.addEventListener("pointerdown", function (e) {
      var t = e.target.closest && e.target.closest(".gl-token");
      if (!t || e.button > 0) return;
      e.preventDefault();
      anchor = head = +t.dataset.i;
      paint();

      function move(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        var tk = el && el.closest && el.closest(".gl-token");
        // Scope to this sentence: its tokens now live in several line-grids,
        // so check ownership by containment rather than a single parent grid.
        if (tk && container.contains(tk)) { head = +tk.dataset.i; paint(); }
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
