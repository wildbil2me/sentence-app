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

  // Width a classic scrollbar occupies, measured once. The wrap logic ignores
  // available-width changes smaller than this so a scrollbar toggling on and off
  // can't re-wrap the grid — see reflow() below. 0 on overlay-scrollbar platforms.
  var _scrollbarPx = null;
  function scrollbarWidth() {
    if (_scrollbarPx !== null) return _scrollbarPx;
    _scrollbarPx = 17; // reasonable default if we can't measure (e.g. no body yet)
    try {
      var probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll";
      document.body.appendChild(probe);
      _scrollbarPx = probe.offsetWidth - probe.clientWidth;
      document.body.removeChild(probe);
    } catch (e) { /* keep the default */ }
    return _scrollbarPx;
  }

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

    /* --- refine the break points by real geometry --- *
     * computeLines() sizes breaks from token widths alone, but a span bar's
     * label can force the columns it covers wider than those tokens, so a line
     * it believes fits can render past the container edge (and then scroll
     * sideways under .gl-grid's overflow-x). Rather than predict grid track
     * growth, lay the line out and measure: if a .gl-grid overflows its box,
     * break it after the last token whose right edge is still inside the box, so
     * the sentence spills onto another line instead of running off. A one-token
     * line can't wrap — it's left to ellipsize its bar label. */
    function refineOverflow(lines) {
      var grids = root.getElementsByClassName("gl-grid");
      if (grids.length !== lines.length) return null;
      var lastToken = lines[lines.length - 1].last;
      for (var gi = 0; gi < grids.length; gi++) {
        var grid = grids[gi], line = lines[gi];
        if (grid.scrollWidth - grid.clientWidth <= 1 || line.last <= line.first) continue;

        var limit = grid.getBoundingClientRect().right -
          (parseFloat(window.getComputedStyle(grid).paddingRight) || 0);
        var splitAt = line.first;   // at least one token stays on this line
        for (var i = line.first; i <= line.last; i++) {
          if (tokenEls[i].getBoundingClientRect().right <= limit + 0.5) splitAt = i;
          else break;
        }
        if (splitAt >= line.last) continue;   // can't split further

        /* Fix the first overflowing line and re-flow everything after it as one
         * trailing line, which the next pass breaks the same way. Splitting in
         * place instead would orphan the tokens that didn't fit onto a line of
         * their own — "clad" stranded above "in black from head to foot." —
         * because they could never rejoin the line that follows. Left to right,
         * one line settled per pass, this is a greedy fill on real geometry. */
        return lines.slice(0, gi).concat([
          { first: line.first, last: splitAt },
          { first: splitAt + 1, last: lastToken },
        ]);
      }
      return null;
    }

    // Lay out `lines`, then re-break until no line overflows. Bounded: each pass
    // settles the leftmost still-overflowing line, so the settled prefix grows
    // every pass and there can't be more lines than tokens. Returns the lines
    // actually laid out.
    function layoutFitted(lines) {
      layout(lines);
      for (var pass = 0; pass < tokens.length; pass++) {
        var refined = refineOverflow(lines);
        if (!refined) break;
        lines = refined;
        layout(lines);
      }
      return lines;
    }

    // Start as a single line — byte-for-byte the legacy layout, and the state
    // we measure from once the caller has inserted `root`.
    layout([{ first: 0, last: tokens.length - 1 }]);
    var lastKey = "0:" + (tokens.length - 1);

    var ro = null, pending = false;
    // Re-wrap only when the available width really moves. As the grid collapses it
    // grows taller, a scrollbar appears and steals a scrollbar's width, the last
    // word no longer fits and drops to the next row, the grid shrinks, the
    // scrollbar disappears, the width returns — and the word flashes between two
    // rows forever. Ignoring width changes up to a scrollbar's width (plus a small
    // margin) breaks that loop: the scrollbar toggling no longer re-wraps, and
    // shrinking the window snaps between layouts instead of jittering. A genuine
    // resize moves well past the threshold and still re-wraps.
    var hysteresis = Math.max(scrollbarWidth(), 16) + 8;
    var laidOutAvail = null;
    function reflow() {
      if (!root.isConnected) { if (ro) ro.disconnect(); return; }
      var host = root.parentNode;
      var probe = host && host.nodeType === 1 ? host : root;
      var avail = probe.clientWidth;
      if (!avail) return;
      if (laidOutAvail !== null && Math.abs(avail - laidOutAvail) < hysteresis) return;
      var lines = computeLines();
      if (!lines) return;
      laidOutAvail = avail;
      var key = lines.map(function (l) { return l.first + ":" + l.last; }).join(",");
      if (key === lastKey) return;
      lastKey = key;
      // Lay out the token-width estimate, then refine to the real fit. lastKey
      // stays the raw estimate's key so the width short-circuit above keeps
      // working — refineOverflow is deterministic for a given estimate.
      layoutFitted(lines);
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

    // Kill the initial single-line flash. `layout()` above laid every token on
    // one line — the state we can measure from, but wrong for any sentence that
    // wraps. Waiting for the ResizeObserver's first callback re-wraps a frame too
    // late: the single-line version is painted first, then snaps into place.
    // A microtask drains after this task (so the caller has already inserted
    // `root` and it's measurable) but *before* the first paint, so the wrapped
    // layout is the first thing shown. If root isn't connected yet, the
    // ResizeObserver still catches it — same as before, flash and all.
    if (typeof Promise !== "undefined") {
      Promise.resolve().then(function () {
        if (root.isConnected && laidOutAvail === null) reflow();
      });
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
   * Self-playing "how the blocks work" demo for the library banner.
   *
   * Reuses the real renderer: one short sentence, fully annotated across all
   * four layers, revealed one layer at a time (Words → Parts → Phrases →
   * Clauses) on a loop. Because it drives `renderSentence` + `setLayers`, the
   * demo shows exactly what a teacher builds — it isn't a separate mock-up.
   *
   * Returns a cleanup function; the caller must run it on view teardown so the
   * timers stop when the user leaves the library.
   */
  wjt.buildBlocksDemo = function (host) {
    host.innerHTML = "";
    var DEMO = {
      text: "The curious fox darted across the frozen river.",
      annotations: [
        // Words
        { start: 0, end: 3, label: "determiner" },
        { start: 4, end: 11, label: "adjective" },
        { start: 12, end: 15, label: "noun" },
        { start: 16, end: 22, label: "verb" },
        { start: 23, end: 29, label: "preposition" },
        { start: 30, end: 33, label: "determiner" },
        { start: 34, end: 40, label: "adjective" },
        { start: 41, end: 47, label: "noun" },
        // Parts
        { start: 0, end: 15, label: "subject" },
        { start: 16, end: 47, label: "predicate" },
        // Phrases
        { start: 0, end: 15, label: "noun-phrase" },
        { start: 23, end: 47, label: "prepositional-phrase" },
        // Clauses
        { start: 0, end: 47, label: "independent-clause" },
      ],
    };

    var stage = document.createElement("div");
    stage.className = "blocks-demo-stage";
    host.appendChild(stage);

    var api = wjt.renderSentence(DEMO, {
      layers: [],                    // start bare; reveal progressively
      reserve: wjt.LAYER_ORDER,      // reserve every layer's height up front
    });
    stage.appendChild(api.root);

    // Step legend: one pill per layer, lit as its layer is revealed.
    var steps = document.createElement("div");
    steps.className = "blocks-demo-steps";
    var pills = wjt.LAYER_ORDER.map(function (id, i) {
      if (i) {
        var arrow = document.createElement("span");
        arrow.className = "blocks-demo-arrow";
        arrow.textContent = "→";
        steps.appendChild(arrow);
      }
      var pill = document.createElement("span");
      pill.className = "blocks-demo-pill";
      pill.textContent = wjt.LAYERS[id].short;
      steps.appendChild(pill);
      return pill;
    });
    host.appendChild(steps);

    function lightPills(n) {
      pills.forEach(function (p, i) { p.classList.toggle("is-on", i < n); });
    }

    // Replay the shared pop-in on the layer just revealed, so each new layer
    // animates in rather than blinking on. Restarting the CSS animation is a
    // remove-then-force-reflow-then-restore of the inline `animation`.
    function popLayer(layerId) {
      var els = api.root.querySelectorAll('[data-layer="' + layerId + '"]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      }
    }

    // Reduced motion: show the finished breakdown, no loop.
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      api.setLayers(wjt.LAYER_ORDER);
      lightPills(wjt.LAYER_ORDER.length);
      return function () {};
    }

    // Fake pointer that walks the step pills and "clicks" each one as its
    // layer reveals — a silent walkthrough of the build order.
    var cursor = document.createElement("div");
    cursor.className = "blocks-demo-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22">' +
      '<path d="M5 2.5 L5 19 L9.2 14.8 L12 21 L14.7 19.9 L11.9 13.9 L18 13.9 Z"/></svg>';
    host.appendChild(cursor);

    function moveCursorTo(pill, instant) {
      var hr = host.getBoundingClientRect();
      var pr = pill.getBoundingClientRect();
      var x = pr.left - hr.left + pr.width / 2;
      var y = pr.top - hr.top + pr.height / 2;
      if (instant) cursor.style.transition = "none";
      cursor.style.transform = "translate(" + x + "px," + y + "px)";
      if (instant) { void cursor.offsetWidth; cursor.style.transition = ""; }
    }
    // Restart a one-shot animation by clearing + reflowing + re-adding the class.
    function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

    moveCursorTo(pills[0], true);   // start over the first pill, no glide

    var timers = [];
    var stopped = false;
    function after(ms, fn) { timers.push(setTimeout(fn, ms)); }

    function cycle() {
      if (stopped) return;
      timers = [];
      api.setLayers([]);
      lightPills(0);
      moveCursorTo(pills[0]);       // glide back to the start for the loop
      wjt.LAYER_ORDER.forEach(function (id, i) {
        var revealAt = 700 + i * 1200;
        // Arrive at the pill a beat before its layer appears.
        after(Math.max(0, revealAt - 380), function () { moveCursorTo(pills[i]); });
        after(revealAt, function () {
          restart(cursor, "is-tap");
          restart(pills[i], "is-tap");
          api.setLayers(wjt.LAYER_ORDER.slice(0, i + 1));
          popLayer(id);
          lightPills(i + 1);
        });
      });
      // Hold the finished breakdown, then start over.
      after(700 + wjt.LAYER_ORDER.length * 1200 + 2200, cycle);
    }
    cycle();

    return function () {
      stopped = true;
      timers.forEach(clearTimeout);
      timers = [];
    };
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
   * Legend for one sentence: per shown layer (in LAYER_ORDER), the distinct
   * labels actually annotated in that sentence, each as swatch · abbr · name.
   * Returns a DOM element, or null if nothing is shown/annotated.
   */
  wjt.renderLegend = function (sentence, layers) {
    var anns = (sentence && sentence.annotations) || [];
    var wrap = document.createElement("div");
    var any = false;
    wjt.LAYER_ORDER.forEach(function (layerId) {
      if (layers.indexOf(layerId) === -1) return;
      // Distinct labels annotated in this sentence at this layer, first-appearance
      // order, de-duped by label id.
      var seen = {};
      var labelIds = [];
      anns.forEach(function (a) {
        var l = wjt.layerOf(a.label);
        if (!l || l.id !== layerId) return;
        if (seen[a.label]) return;
        seen[a.label] = true;
        labelIds.push(a.label);
      });
      if (!labelIds.length) return;
      any = true;
      var group = document.createElement("div");
      group.className = "legend-group";
      var heading = document.createElement("div");
      heading.className = "legend-layer";
      heading.textContent = wjt.LAYERS[layerId].name;
      group.appendChild(heading);
      var items = document.createElement("div");
      items.className = "legend-items";
      labelIds.forEach(function (id) {
        var label = wjt.LABELS[id];
        var item = document.createElement("span");
        item.className = "legend-item";
        item.innerHTML =
          '<span class="swatch" style="--c:' + label.color + '"></span>' +
          "<b>" + wjt.escapeHtml(label.abbr) + "</b> " +
          wjt.escapeHtml(label.name);
        items.appendChild(item);
      });
      group.appendChild(items);
      wrap.appendChild(group);
    });
    return any ? wrap : null;
  };

  /**
   * Render a sentence's free-text note.
   * Returns a DOM element, or null if the sentence carries no note.
   * With `onClick`, returns a compact chip (styled like a type badge) that
   * calls onClick() — the full note lives in the explain card, not on the
   * stage. Without it, falls back to the inline muted line.
   */
  wjt.renderSentenceNote = function (sentence, onClick) {
    var note = sentence && sentence.notes;
    if (!note) return null;
    if (onClick) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "type-badge type-badge-note";
      btn.style.setProperty("--c", "var(--accent)");
      btn.innerHTML =
        '<span class="type-badge-cat">Note</span>' +
        '<span class="type-badge-name">📌</span>';
      btn.title = note;
      btn.addEventListener("click", function (e) { e.stopPropagation(); onClick(); });
      return btn;
    }
    var el = document.createElement("div");
    el.className = "sentence-note";
    el.innerHTML =
      '<span class="sentence-note-tag">Note</span> ' + wjt.escapeHtml(note);
    return el;
  };

  /**
   * Drag-to-select whole tokens inside one grid. Works with mouse and touch
   * (tokens set touch-action: none in CSS). Single click selects one token.
   * Also fully keyboard-operable (audit P0-3): tokens are focusable with a
   * roving tabindex; Arrow moves focus, Shift+Arrow extends a selection from the
   * focused word, Enter/Space commits, Escape clears. Keyboard and pointer feed
   * the SAME onDone, so there is one commit path.
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

    // Make each word a focusable button with a roving tabindex — only one token
    // is in the Tab order at a time, and Arrow keys move focus between them
    // (the ARIA pattern for a composite widget). The token nodes persist across
    // reflow (they're re-parented, not rebuilt), so these attributes stick.
    tokenEls.forEach(function (el, i) {
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", i === 0 ? "0" : "-1");
    });
    function focusToken(i) {
      if (i < 0 || i >= tokenEls.length) return;
      tokenEls.forEach(function (el, j) { el.setAttribute("tabindex", j === i ? "0" : "-1"); });
      tokenEls[i].focus();
    }

    container.addEventListener("keydown", function (e) {
      var t = e.target.closest && e.target.closest(".gl-token");
      if (!t || !container.contains(t)) return;
      var i = +t.dataset.i;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var dir = e.key === "ArrowRight" ? 1 : -1;
        if (e.shiftKey) {
          // Extend the selection from the focused word.
          if (anchor === -1) { anchor = i; head = i; }
          head = Math.max(0, Math.min(tokenEls.length - 1, head + dir));
          paint();
          focusToken(head);
        } else {
          focusToken(i + dir);   // plain arrow just moves focus
        }
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (anchor === -1) { anchor = head = i; paint(); }   // no extension → this word
        onDone({ first: Math.min(anchor, head), last: Math.max(anchor, head) }, e);
      } else if (e.key === "Escape") {
        if (anchor > -1) { anchor = head = -1; paint(); e.preventDefault(); }
      }
    });

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
