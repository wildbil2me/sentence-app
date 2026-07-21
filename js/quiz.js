/* Grammar Lab — Quiz mode: students practice on a lesson's annotations.
 * Two question types, generated from the teacher's labels:
 *   "mc"   — a span is highlighted; pick what it is (multiple choice)
 *   "find" — a label is named; drag-select the matching words
 */
(function () {
  "use strict";
  window.GL = window.GL || {};
  GL.views = GL.views || {};

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  GL.views.quiz = function (container, lessonId) {
    var lesson = GL.store.get(lessonId);
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
          var l = GL.layerOf(a.label);
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
    var availableTypes = GL.SENTENCE_TYPE_ORDER.filter(function (cat) {
      return sentencesWithType(cat).length > 0;
    });

    if (!availableLayers.length && !availableTypes.length) {
      view.innerHTML =
        '<div class="card empty-state"><div class="empty-emoji">🎯</div>' +
        "<h3>Nothing to quiz on yet</h3>" +
        "<p>This lesson has no labels. Ask your teacher to add some, or open the editor.</p>" +
        '<div class="btn-row btn-row-center"><a class="btn" href="#/">← Library</a>' +
        '<a class="btn btn-primary" href="#/edit/' + lesson.id + '">Open editor</a></div></div>';
      return;
    }

    /* -------- question generation -------- */
    function buildQuestions(layerIds, typeCats, count) {
      var pool = annsForLayers(layerIds).map(function (item) {
        var layer = GL.layerOf(item.ann.label);
        var type = Math.random() < 0.5 ? "mc" : "find";

        // Same-label spans in the sentence are all acceptable "find" answers.
        var tokens = GL.tokenize(item.sentence.text);
        var accept = (item.sentence.annotations || [])
          .filter(function (a) { return a.label === item.ann.label; })
          .map(function (a) { return GL.spanToTokens(tokens, a.start, a.end); })
          .filter(Boolean);

        // Distractors: prefer same-family labels (e.g. other noun types when the
        // answer is a proper noun), then labels used elsewhere in the lesson.
        var used = {};
        annsForLayers([layer.id]).forEach(function (x) { used[x.ann.label] = true; });
        var fam = GL.familyOf(item.ann.label);
        var candidates = GL.labelsForLayer(layer.id).filter(function (id) { return id !== item.ann.label; });
        candidates.sort(function (a, b) {
          var famA = GL.familyOf(a) === fam ? 1 : 0;
          var famB = GL.familyOf(b) === fam ? 1 : 0;
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
            options: shuffle(Object.keys(GL.SENTENCE_TYPES[cat].options)),
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
        '  <a class="btn btn-ghost" href="#/">← Library</a>' +
        '  <div class="present-title"><h2>🎯 Quiz: ' + GL.escapeHtml(lesson.title) + "</h2>" +
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
        return { kind: "layer", id: id, name: GL.LAYERS[id].name, count: annsForLayers([id]).length };
      }).concat(availableTypes.map(function (cat) {
        return { kind: "type", id: cat, name: GL.SENTENCE_TYPES[cat].name + " type", count: sentencesWithType(cat).length };
      }));

      function selectedCount() { return settings.layers.length + settings.types.length; }

      practice.forEach(function (p) {
        var arr = p.kind === "layer" ? settings.layers : settings.types;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pill pill-lg" + (arr.indexOf(p.id) !== -1 ? " is-on" : "");
        b.innerHTML = GL.escapeHtml(p.name) + ' <span class="pill-count">' + p.count + "</span>";
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
          '  <div class="quiz-count">Question ' + (qi + 1) + " of " + questions.length + "</div>" +
          '  <h3 class="quiz-prompt" data-role="prompt"></h3>' +
          '  <div class="quiz-stage" data-role="stage"></div>' +
          '  <div class="quiz-answers" data-role="answers"></div>' +
          '  <div class="quiz-feedback" data-role="feedback" hidden></div>' +
          "</section>";

        var promptEl = view.querySelector('[data-role="prompt"]');
        var stageEl = view.querySelector('[data-role="stage"]');
        var answersEl = view.querySelector('[data-role="answers"]');
        var feedbackEl = view.querySelector('[data-role="feedback"]');
        var label = q.ann ? GL.LABELS[q.ann.label] : null;

        function finishQuestion(isCorrect, detailHtml) {
          if (isCorrect) { correct++; streak++; }
          else { streak = 0; missed.push(q); }
          feedbackEl.hidden = false;
          feedbackEl.className = "quiz-feedback " + (isCorrect ? "is-right" : "is-wrong");
          feedbackEl.innerHTML =
            "<b>" + (isCorrect ? pickPraise() : "Not quite.") + "</b> " + detailHtml +
            (q.ann && q.ann.note ? '<p class="ann-note">📌 ' + GL.escapeHtml(q.ann.note) + "</p>" : "") +
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
            GL.escapeHtml(q.layer.unit) + "?";
          var r = GL.renderSentence(q.sentence, {
            showAnnotations: false,
            highlight: { start: q.ann.start, end: q.ann.end },
          });
          stageEl.appendChild(r.root);

          q.options.forEach(function (optId) {
            var opt = GL.LABELS[optId];
            var b = document.createElement("button");
            b.type = "button";
            b.className = "quiz-option";
            b.style.setProperty("--c", opt.color);
            b.textContent = opt.name;
            b.addEventListener("click", function () {
              answersEl.querySelectorAll(".quiz-option").forEach(function (o) { o.disabled = true; });
              var right = optId === q.ann.label;
              b.classList.add(right ? "is-right" : "is-wrong");
              if (!right) {
                answersEl.querySelectorAll(".quiz-option").forEach(function (o) {
                  if (o.textContent === label.name) o.classList.add("is-right");
                });
              }
              finishQuestion(right,
                "“" + GL.escapeHtml(GL.spanText(q.sentence.text, q.ann)) + "” is " +
                article(label.name) + " <b>" + GL.escapeHtml(label.name.toLowerCase()) + "</b>. " + label.desc);
            });
            answersEl.appendChild(b);
          });
        } else if (q.type === "sentence-type") {
          var category = GL.SENTENCE_TYPES[q.category];
          promptEl.innerHTML = GL.escapeHtml(category.question);
          var rt = GL.renderSentence(q.sentence, { showAnnotations: false });
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
              if (!right) {
                answersEl.querySelectorAll(".quiz-option").forEach(function (o) {
                  if (o.textContent === answerOpt.name) o.classList.add("is-right");
                });
              }
              finishQuestion(right,
                "This sentence is <b>" + GL.escapeHtml(answerOpt.name.toLowerCase()) + "</b> (" +
                GL.escapeHtml(category.name.toLowerCase()) + "). " + GL.escapeHtml(answerOpt.desc));
            });
            answersEl.appendChild(b);
          });
        } else {
          promptEl.innerHTML = "Select the " +
            '<span class="prompt-label" style="--c:' + label.color + '">' +
            GL.escapeHtml(label.name.toLowerCase()) + "</span> in this sentence.";
          var rf = GL.renderSentence(q.sentence, {
            showAnnotations: false,
            interactive: true,
          });
          stageEl.appendChild(rf.root);
          var tip = document.createElement("div");
          tip.className = "sentence-tip";
          tip.textContent = "Drag across the words (or click a single word), then press Check.";
          stageEl.appendChild(tip);

          answersEl.innerHTML =
            '<button class="btn btn-primary" data-act="check">Check ✓</button>' +
            '<button class="btn" data-act="clear">Clear</button>';
          answersEl.querySelector('[data-act="clear"]').addEventListener("click", function () {
            rf.selection.clear();
          });
          answersEl.querySelector('[data-act="check"]').addEventListener("click", function () {
            var sel = rf.selection.get();
            if (!sel) return GL.toast("Select some words first.");
            answersEl.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
            var right = q.accept.some(function (rge) {
              return rge.first === sel.first && rge.last === sel.last;
            });
            // Reveal the correct answer with a highlight.
            stageEl.innerHTML = "";
            var reveal = GL.renderSentence(q.sentence, {
              showAnnotations: false,
              highlight: { start: q.ann.start, end: q.ann.end },
            });
            stageEl.appendChild(reveal.root);
            finishQuestion(right,
              "The " + GL.escapeHtml(label.name.toLowerCase()) + " is “<b>" +
              GL.escapeHtml(GL.spanText(q.sentence.text, q.ann)) + "</b>”. " + label.desc);
          });
        }
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
          '    <a class="btn" href="#/">← Library</a>' +
          "  </div>" +
          "</section>";

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
              var opt = GL.SENTENCE_TYPES[q.category].options[q.answer];
              row.innerHTML =
                '<span class="swatch" style="--c:' + opt.color + '"></span>' +
                "<div><b>" + GL.escapeHtml(opt.name) + "</b> (" +
                GL.escapeHtml(GL.SENTENCE_TYPES[q.category].name.toLowerCase()) + ")" +
                '<div class="muted-note">' + GL.escapeHtml(q.sentence.text) + "</div></div>";
            } else {
              var label = GL.LABELS[q.ann.label];
              row.innerHTML =
                '<span class="swatch" style="--c:' + label.color + '"></span>' +
                "<div><b>" + GL.escapeHtml(label.name) + "</b>: “" +
                GL.escapeHtml(GL.spanText(q.sentence.text, q.ann)) + "”" +
                '<div class="muted-note">' + GL.escapeHtml(q.sentence.text) + "</div></div>";
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
