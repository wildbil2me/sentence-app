/* Sentence Forge — Quiz mode: students practice on a lesson's annotations.
 * Two question types, generated from the teacher's labels:
 *   "mc"   — a span is highlighted; pick what it is (multiple choice)
 *   "find" — a label is named; drag-select the matching words
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};
  wjt.views = wjt.views || {};

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  wjt.views.quiz = function (container, lessonId) {
    var lesson = wjt.store.get(lessonId);
    if (!lesson) { location.hash = "#/"; return; }

    container.innerHTML = "";
    var view = document.createElement("div");
    view.className = "view view-quiz";
    container.appendChild(view);

    /* -------- what's quizzable -------- */
    function annsForLayers(layerIds) {
      var out = [];
      lesson.sentences.forEach(function (s) {
        (s.annotations || []).forEach(function (a) {
          var l = wjt.layerOf(a.label);
          if (l && layerIds.indexOf(l.id) !== -1) out.push({ sentence: s, ann: a });
        });
      });
      return out;
    }

    var availableLayers = lesson.layers.filter(function (id) {
      return annsForLayers([id]).length > 0;
    });

    /* -------- sentence types are quizzable too -------- */
    function sentencesWithType(cat) {
      return lesson.sentences.filter(function (s) { return s.types && s.types[cat]; });
    }
    var availableTypes = wjt.SENTENCE_TYPE_ORDER.filter(function (cat) {
      return sentencesWithType(cat).length > 0;
    });

    if (!availableLayers.length && !availableTypes.length) {
      view.innerHTML =
        '<div class="card empty-state"><div class="empty-emoji">🎯</div>' +
        "<h3>Nothing to quiz on yet</h3>" +
        "<p>This lesson has no labels. Ask your teacher to add some, or open the editor.</p>" +
        '<div class="btn-row btn-row-center"><a class="btn" href="#/library">← Library</a>' +
        '<a class="btn btn-primary" href="#/edit/' + lesson.id + '">Open editor</a></div></div>';
      return;
    }

    /* -------- question generation -------- */
    function buildQuestions(layerIds, typeCats, count) {
      var pool = annsForLayers(layerIds).map(function (item) {
        var layer = wjt.layerOf(item.ann.label);
        var type = Math.random() < 0.5 ? "mc" : "find";

        // Same-label spans in the sentence are all acceptable "find" answers.
        var tokens = wjt.tokenize(item.sentence.text);
        var accept = (item.sentence.annotations || [])
          .filter(function (a) { return a.label === item.ann.label; })
          .map(function (a) { return wjt.spanToTokens(tokens, a.start, a.end); })
          .filter(Boolean);

        // Distractors: prefer same-family labels (e.g. other noun types when the
        // answer is a proper noun), then labels used elsewhere in the lesson.
        var used = {};
        annsForLayers([layer.id]).forEach(function (x) { used[x.ann.label] = true; });
        var fam = wjt.familyOf(item.ann.label);
        var candidates = wjt.labelsForLayer(layer.id).filter(function (id) { return id !== item.ann.label; });
        candidates.sort(function (a, b) {
          var famA = wjt.familyOf(a) === fam ? 1 : 0;
          var famB = wjt.familyOf(b) === fam ? 1 : 0;
          if (famB !== famA) return famB - famA;
          return (used[b] ? 1 : 0) - (used[a] ? 1 : 0);
        });
        var options = shuffle([item.ann.label].concat(candidates.slice(0, 3)));

        return {
          type: type,
          sentence: item.sentence,
          ann: item.ann,
          layer: layer,
          accept: accept,
          options: options,
        };
      });

      // Sentence-type questions: name the structure / purpose of a whole sentence.
      (typeCats || []).forEach(function (cat) {
        sentencesWithType(cat).forEach(function (s) {
          pool.push({
            type: "sentence-type",
            sentence: s,
            category: cat,
            answer: s.types[cat],
            options: shuffle(Object.keys(wjt.SENTENCE_TYPES[cat].options)),
          });
        });
      });

      shuffle(pool);
      return count === "all" ? pool : pool.slice(0, Math.min(pool.length, +count));
    }

    /* -------- setup screen -------- */
    var settings = { layers: availableLayers.slice(), types: availableTypes.slice(), count: "10" };

    function renderSetup() {
      view.innerHTML =
        '<header class="present-head">' +
        '  <a class="btn btn-ghost" href="#/library">← Library</a>' +
        '  <div class="present-title"><h2>🎯 Quiz: ' + wjt.escapeHtml(lesson.title) + "</h2>" +
        '  <p class="muted-note">Practice on your own — answers get instant feedback.</p></div>' +
        "</header>" +
        '<section class="card quiz-setup">' +
        "  <h3>What do you want to practice?</h3>" +
        '  <div class="layer-chips" data-role="layers"></div>' +
        "  <h3>How many questions?</h3>" +
        '  <div class="layer-chips" data-role="count"></div>' +
        '  <div class="btn-row"><button class="btn btn-primary btn-big" data-act="start">Start quiz →</button>' +
        '  <span class="muted-note" data-role="poolinfo"></span></div>' +
        "</section>";

      var layersEl = view.querySelector('[data-role="layers"]');
      var countEl = view.querySelector('[data-role="count"]');
      var infoEl = view.querySelector('[data-role="poolinfo"]');

      function typePoolSize() {
        return settings.types.reduce(function (sum, cat) { return sum + sentencesWithType(cat).length; }, 0);
      }

      function updateInfo() {
        var n = annsForLayers(settings.layers).length + typePoolSize();
        infoEl.textContent = n + " question" + (n === 1 ? "" : "s") + " available";
      }

      // One chip per practice category: each labelling layer, then each
      // sentence-type axis that this lesson actually uses.
      var practice = availableLayers.map(function (id) {
        return { kind: "layer", id: id, name: wjt.LAYERS[id].name, count: annsForLayers([id]).length };
      }).concat(availableTypes.map(function (cat) {
        return { kind: "type", id: cat, name: wjt.SENTENCE_TYPES[cat].name + " type", count: sentencesWithType(cat).length };
      }));

      function selectedCount() { return settings.layers.length + settings.types.length; }

      practice.forEach(function (p) {
        var arr = p.kind === "layer" ? settings.layers : settings.types;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pill pill-lg" + (arr.indexOf(p.id) !== -1 ? " is-on" : "");
        b.innerHTML = wjt.escapeHtml(p.name) + ' <span class="pill-count">' + p.count + "</span>";
        b.addEventListener("click", function () {
          var i = arr.indexOf(p.id);
          if (i === -1) arr.push(p.id);
          else if (selectedCount() > 1) arr.splice(i, 1);
          else return;
          b.classList.toggle("is-on");
          updateInfo();
        });
        layersEl.appendChild(b);
      });

      ["5", "10", "20", "all"].forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pill pill-lg" + (settings.count === c ? " is-on" : "");
        b.textContent = c === "all" ? "All" : c;
        b.addEventListener("click", function () {
          settings.count = c;
          countEl.querySelectorAll(".pill").forEach(function (p) { p.classList.remove("is-on"); });
          b.classList.add("is-on");
        });
        countEl.appendChild(b);
      });

      updateInfo();
      view.querySelector('[data-act="start"]').addEventListener("click", function () {
        startQuiz(buildQuestions(settings.layers, settings.types, settings.count));
      });
    }

    /* -------- play screen -------- */
    function startQuiz(questions) {
      var qi = 0;
      var correct = 0;
      var streak = 0;
      var missed = [];

      function renderQuestion() {
        var q = questions[qi];
        view.innerHTML =
          '<header class="quiz-head">' +
          '  <a class="btn btn-ghost btn-sm" href="#/">✕</a>' +
          '  <div class="quiz-progress"><div class="quiz-progress-fill" style="width:' +
          Math.round((qi / questions.length) * 100) + '%"></div></div>' +
          '  <span class="quiz-score">' + correct + " ✓</span>" +
          (streak >= 2 ? '<span class="quiz-streak">🔥 ' + streak + "</span>" : "") +
          "</header>" +
          '<section class="card quiz-card">' +
          '  <div class="quiz-count" id="quiz-count">Question ' + (qi + 1) + " of " + questions.length + "</div>" +
          '  <h3 class="quiz-prompt" data-role="prompt" aria-describedby="quiz-count"></h3>' +
          '  <div class="quiz-stage" data-role="stage"></div>' +
          '  <div class="quiz-answers" data-role="answers" role="group"></div>' +
          '  <div class="quiz-feedback" data-role="feedback" role="status" aria-live="polite" hidden></div>' +
          "</section>";

        var promptEl = view.querySelector('[data-role="prompt"]');
        var stageEl = view.querySelector('[data-role="stage"]');
        var answersEl = view.querySelector('[data-role="answers"]');
        var feedbackEl = view.querySelector('[data-role="feedback"]');
        var label = q.ann ? wjt.LABELS[q.ann.label] : null;

        function finishQuestion(isCorrect, detailHtml) {
          if (isCorrect) { correct++; streak++; }
          else { streak = 0; missed.push(q); }
          feedbackEl.hidden = false;
          feedbackEl.className = "quiz-feedback " + (isCorrect ? "is-right" : "is-wrong");
          feedbackEl.innerHTML =
            "<b>" + (isCorrect ? pickPraise() : "Not quite.") + "</b> " + detailHtml +
            (q.ann && q.ann.note ? '<p class="ann-note">📌 ' + wjt.escapeHtml(q.ann.note) + "</p>" : "") +
            '<div class="btn-row"><button class="btn btn-primary" data-act="next">' +
            (qi + 1 < questions.length ? "Next →" : "See results →") + "</button></div>";
          feedbackEl.querySelector('[data-act="next"]').addEventListener("click", function () {
            qi++;
            if (qi < questions.length) renderQuestion();
            else renderResults();
          });
          feedbackEl.querySelector('[data-act="next"]').focus();
        }

        if (q.type === "mc") {
          promptEl.innerHTML = "What is the <mark>highlighted</mark> " +
            wjt.escapeHtml(q.layer.unit) + "?";
          var r = wjt.renderSentence(q.sentence, {
            showAnnotations: false,
            highlight: { start: q.ann.start, end: q.ann.end },
          });
          stageEl.appendChild(r.root);

          q.options.forEach(function (optId) {
            var opt = wjt.LABELS[optId];
            var b = document.createElement("button");
            b.type = "button";
            b.className = "quiz-option";
            b.style.setProperty("--c", opt.color);
            b.textContent = opt.name;
            b.addEventListener("click", function () {
              answersEl.querySelectorAll(".quiz-option").forEach(function (o) { o.disabled = true; });
              var right = optId === q.ann.label;
              b.classList.add(right ? "is-right" : "is-wrong");
              // Carry correct/incorrect in the accessible name too — color alone
              // doesn't reach a screen reader.
              b.setAttribute("aria-label", opt.name + (right ? " — correct answer" : " — your choice, incorrect"));
              if (!right) {
                answersEl.querySelectorAll(".quiz-option").forEach(function (o) {
                  if (o.textContent === label.name) {
                    o.classList.add("is-right");
                    o.setAttribute("aria-label", label.name + " — correct answer");
                  }
                });
              }
              finishQuestion(right,
                "“" + wjt.escapeHtml(wjt.spanText(q.sentence.text, q.ann)) + "” is " +
                article(label.name) + " <b>" + wjt.escapeHtml(label.name.toLowerCase()) + "</b>. " + label.desc);
            });
            answersEl.appendChild(b);
          });
        } else if (q.type === "sentence-type") {
          var category = wjt.SENTENCE_TYPES[q.category];
          promptEl.innerHTML = wjt.escapeHtml(category.question);
          var rt = wjt.renderSentence(q.sentence, { showAnnotations: false });
          stageEl.appendChild(rt.root);

          var answerOpt = category.options[q.answer];
          q.options.forEach(function (optId) {
            var opt = category.options[optId];
            var b = document.createElement("button");
            b.type = "button";
            b.className = "quiz-option";
            b.style.setProperty("--c", opt.color);
            b.textContent = opt.name;
            b.addEventListener("click", function () {
              answersEl.querySelectorAll(".quiz-option").forEach(function (o) { o.disabled = true; });
              var right = optId === q.answer;
              b.classList.add(right ? "is-right" : "is-wrong");
              b.setAttribute("aria-label", opt.name + (right ? " — correct answer" : " — your choice, incorrect"));
              if (!right) {
                answersEl.querySelectorAll(".quiz-option").forEach(function (o) {
                  if (o.textContent === answerOpt.name) {
                    o.classList.add("is-right");
                    o.setAttribute("aria-label", answerOpt.name + " — correct answer");
                  }
                });
              }
              finishQuestion(right,
                "This sentence is <b>" + wjt.escapeHtml(answerOpt.name.toLowerCase()) + "</b> (" +
                wjt.escapeHtml(category.name.toLowerCase()) + "). " + wjt.escapeHtml(answerOpt.desc) +
                (q.sentence.notes ? ' <span class="quiz-note">' + wjt.escapeHtml(q.sentence.notes) + "</span>" : ""));
            });
            answersEl.appendChild(b);
          });
        } else {
          promptEl.innerHTML = "Select the " +
            '<span class="prompt-label" style="--c:' + label.color + '">' +
            wjt.escapeHtml(label.name.toLowerCase()) + "</span> in this sentence.";
          var rf = wjt.renderSentence(q.sentence, {
            showAnnotations: false,
            interactive: true,
          });
          stageEl.appendChild(rf.root);
          var tip = document.createElement("div");
          tip.className = "sentence-tip";
          tip.textContent = "Drag across the words (or click one; or Tab to a word and use Shift+Arrow), then press Check.";
          stageEl.appendChild(tip);

          answersEl.innerHTML =
            '<button class="btn btn-primary" data-act="check">Check ✓</button>' +
            '<button class="btn" data-act="clear">Clear</button>';
          answersEl.querySelector('[data-act="clear"]').addEventListener("click", function () {
            rf.selection.clear();
          });
          answersEl.querySelector('[data-act="check"]').addEventListener("click", function () {
            var sel = rf.selection.get();
            if (!sel) return wjt.toast("Select some words first.");
            answersEl.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
            var right = q.accept.some(function (rge) {
              return rge.first === sel.first && rge.last === sel.last;
            });
            // Reveal the correct answer with a highlight.
            stageEl.innerHTML = "";
            var reveal = wjt.renderSentence(q.sentence, {
              showAnnotations: false,
              highlight: { start: q.ann.start, end: q.ann.end },
            });
            stageEl.appendChild(reveal.root);
            finishQuestion(right,
              "The " + wjt.escapeHtml(label.name.toLowerCase()) + " is “<b>" +
              wjt.escapeHtml(wjt.spanText(q.sentence.text, q.ann)) + "</b>”. " + label.desc);
          });
        }

        // Name the answer group after the (now-populated) prompt so a screen
        // reader announces what the options belong to.
        answersEl.setAttribute("aria-label", promptEl.textContent);

        // Each question replaces view.innerHTML, which drops focus to <body>.
        // Land it on the new question heading (which describes itself with the
        // "Question N of M" count) so keyboard/AT users restart at the top.
        // preventScroll keeps the card from jumping.
        promptEl.setAttribute("tabindex", "-1");
        try { promptEl.focus({ preventScroll: true }); } catch (e) { promptEl.focus(); }
      }

      /* -------- results -------- */
      function renderResults() {
        var pct = Math.round((correct / questions.length) * 100);
        var msg = pct === 100 ? "Perfect score! 🏆"
          : pct >= 80 ? "Excellent work! 🌟"
          : pct >= 60 ? "Nice job — keep practicing! 💪"
          : "Good try — review and go again! 📚";

        view.innerHTML =
          '<section class="card quiz-results">' +
          '  <div class="score-ring" style="--pct:' + pct + '"><span>' + pct + "%</span></div>" +
          "  <h2>" + msg + "</h2>" +
          '  <p class="muted-note">' + correct + " of " + questions.length + " correct</p>" +
          '  <div data-role="missed"></div>' +
          '  <div class="btn-row btn-row-center">' +
          '    <button class="btn btn-primary btn-big" data-act="retry">↻ Try again</button>' +
          '    <button class="btn" data-act="setup">Change setup</button>' +
          '    <a class="btn" href="#/library">← Library</a>' +
          "  </div>" +
          "</section>";

        // The innerHTML swap drops focus to <body>; move it to the results
        // heading so keyboard/AT users are told the outcome and land on the
        // retry/setup actions next. preventScroll avoids a jump.
        var resultsHeading = view.querySelector("h2");
        if (resultsHeading) {
          resultsHeading.setAttribute("tabindex", "-1");
          try { resultsHeading.focus({ preventScroll: true }); } catch (e) { resultsHeading.focus(); }
        }

        if (pct >= 80) burstConfetti(view);

        if (missed.length) {
          var box = view.querySelector('[data-role="missed"]');
          var h = document.createElement("h3");
          h.textContent = "Worth another look:";
          box.appendChild(h);
          missed.forEach(function (q) {
            var row = document.createElement("div");
            row.className = "missed-row";
            if (q.type === "sentence-type") {
              var opt = wjt.SENTENCE_TYPES[q.category].options[q.answer];
              row.innerHTML =
                '<span class="swatch" style="--c:' + opt.color + '"></span>' +
                "<div><b>" + wjt.escapeHtml(opt.name) + "</b> (" +
                wjt.escapeHtml(wjt.SENTENCE_TYPES[q.category].name.toLowerCase()) + ")" +
                '<div class="muted-note">' + wjt.escapeHtml(q.sentence.text) + "</div></div>";
            } else {
              var label = wjt.LABELS[q.ann.label];
              row.innerHTML =
                '<span class="swatch" style="--c:' + label.color + '"></span>' +
                "<div><b>" + wjt.escapeHtml(label.name) + "</b>: “" +
                wjt.escapeHtml(wjt.spanText(q.sentence.text, q.ann)) + "”" +
                '<div class="muted-note">' + wjt.escapeHtml(q.sentence.text) + "</div></div>";
            }
            box.appendChild(row);
          });
        }

        view.querySelector('[data-act="retry"]').addEventListener("click", function () {
          startQuiz(buildQuestions(settings.layers, settings.types, settings.count));
        });
        view.querySelector('[data-act="setup"]').addEventListener("click", renderSetup);
      }

      renderQuestion();
    }

    function pickPraise() {
      var praise = ["Correct!", "Nailed it!", "Exactly right!", "Yes!", "Great eye!"];
      return praise[Math.floor(Math.random() * praise.length)];
    }

    function article(word) {
      return /^[aeiou]/i.test(word) ? "an" : "a";
    }

    function burstConfetti(host) {
      var wrap = document.createElement("div");
      wrap.className = "confetti";
      var emoji = ["🎉", "✨", "⭐", "🎊", "💫"];
      for (var i = 0; i < 26; i++) {
        var s = document.createElement("span");
        s.textContent = emoji[i % emoji.length];
        s.style.left = Math.random() * 100 + "%";
        s.style.animationDelay = Math.random() * 0.8 + "s";
        s.style.fontSize = 14 + Math.random() * 18 + "px";
        wrap.appendChild(s);
      }
      host.appendChild(wrap);
      setTimeout(function () { wrap.remove(); }, 4000);
    }

    renderSetup();
  };
})();
