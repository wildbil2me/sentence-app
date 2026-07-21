/* Sentence Forge — lesson model, localStorage persistence, import/export.
 *
 * Lesson JSON format (also what teachers upload):
 * {
 *   "format": "sentence-forge-lesson",
 *   "version": 1,
 *   "title": "My Lesson",
 *   "description": "optional",
 *   "layers": ["pos", "part", "phrase", "clause"],   // which levels this lesson teaches
 *   "essentialOnly": true,                           // optional: hide Advanced labels from the editor palette
 *   "sentences": [
 *     {
 *       "text": "The curious fox darted across the frozen river.",
 *       "annotations": [
 *         { "start": 0, "end": 3, "label": "determiner", "note": "optional teaching note" }
 *       ]
 *     }
 *   ]
 * }
 * start/end are character offsets into the sentence text (end exclusive).
 * Offsets are snapped outward to whole words on import.
 */
(function () {
  "use strict";
  window.wjt = window.wjt || {};

  var KEY = "sentenceForge.lessons.v1";

  function readAll() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  wjt.store = {
    list: function () {
      return readAll().sort(function (a, b) {
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
    },

    get: function (id) {
      return readAll().find(function (l) { return l.id === id; }) || null;
    },

    save: function (lesson) {
      var list = readAll();
      lesson.updatedAt = new Date().toISOString();
      var i = list.findIndex(function (l) { return l.id === lesson.id; });
      if (i === -1) list.push(lesson); else list[i] = lesson;
      writeAll(list);
      return lesson;
    },

    remove: function (id) {
      writeAll(readAll().filter(function (l) { return l.id !== id; }));
    },

    create: function (title) {
      var now = new Date().toISOString();
      return {
        format: "sentence-forge-lesson",
        version: 1,
        id: wjt.uid(),
        title: title || "Untitled lesson",
        description: "",
        layers: ["pos", "part", "phrase", "clause"],
        essentialOnly: false,
        sentences: [],
        createdAt: now,
        updatedAt: now,
      };
    },

    duplicate: function (id) {
      var src = this.get(id);
      if (!src) return null;
      var copy = JSON.parse(JSON.stringify(src));
      copy.id = wjt.uid();
      copy.title = src.title + " (copy)";
      copy.createdAt = new Date().toISOString();
      return this.save(copy);
    },
  };

  /* ------------------------------------------------------------------ *
   * Import / export
   * ------------------------------------------------------------------ */

  /**
   * Validate + normalize an uploaded lesson object.
   * Returns { lesson, warnings } or throws Error with a readable message.
   */
  wjt.importLesson = function (data) {
    if (!data || typeof data !== "object") throw new Error("File is not a JSON object.");
    if (data.format && data.format !== "sentence-forge-lesson") {
      throw new Error('Unrecognized "format" — expected "sentence-forge-lesson".');
    }
    if (!Array.isArray(data.sentences)) {
      throw new Error('Missing "sentences" array.');
    }

    var warnings = [];
    var lesson = wjt.store.create(String(data.title || "Imported lesson"));
    lesson.description = String(data.description || "");

    if (Array.isArray(data.layers) && data.layers.length) {
      var layers = data.layers.filter(function (l) { return wjt.LAYERS[l]; });
      if (layers.length !== data.layers.length) warnings.push("Some layer names were unrecognized and skipped.");
      if (layers.length) lesson.layers = layers;
    }
    lesson.essentialOnly = data.essentialOnly === true;

    data.sentences.forEach(function (s, si) {
      var text = typeof s === "string" ? s : String(s && s.text || "");
      text = text.trim();
      if (!text) { warnings.push("Sentence " + (si + 1) + " is empty — skipped."); return; }

      var tokens = wjt.tokenize(text);
      var sentence = { text: text, annotations: [] };

      // Optional whole-sentence classification: { structure, purpose }.
      if (s && s.types && typeof s.types === "object") {
        var types = {};
        wjt.SENTENCE_TYPE_ORDER.forEach(function (cat) {
          var val = s.types[cat];
          if (val == null || val === "") return;
          if (wjt.isSentenceType(cat, val)) types[cat] = val;
          else warnings.push('Skipped unknown ' + cat + ' type "' + val + '" (sentence ' + (si + 1) + ").");
        });
        if (Object.keys(types).length) sentence.types = types;
      }

      var anns = (s && Array.isArray(s.annotations)) ? s.annotations : [];

      anns.forEach(function (a, ai) {
        var where = "sentence " + (si + 1) + ", annotation " + (ai + 1);
        if (!a || typeof a !== "object") { warnings.push("Skipped invalid annotation (" + where + ")."); return; }
        var label = String(a.label || "");
        if (!wjt.LABELS[label]) { warnings.push('Skipped unknown label "' + label + '" (' + where + ")."); return; }

        var start = a.start, end = a.end;
        // Alternative addressing: { "match": "the frozen river" } finds the
        // first occurrence of that text (handy when writing JSON by hand).
        if (typeof a.match === "string" && a.match) {
          var at = text.indexOf(a.match);
          if (at === -1) { warnings.push('Text "' + a.match + '" not found (' + where + ")."); return; }
          start = at; end = at + a.match.length;
        }
        if (typeof start !== "number" || typeof end !== "number" || end <= start) {
          warnings.push("Skipped annotation with bad offsets (" + where + ")."); return;
        }
        var range = wjt.spanToTokens(tokens, Math.max(0, start), Math.min(text.length, end));
        if (!range) { warnings.push("Annotation covers no words (" + where + ")."); return; }
        var span = wjt.tokensToSpan(tokens, range.first, range.last);

        var layerId = wjt.LABELS[label].layer;
        if (lesson.layers.indexOf(layerId) === -1) lesson.layers.push(layerId);

        sentence.annotations.push({
          id: wjt.uid(),
          start: span.start,
          end: span.end,
          label: label,
          note: a.note ? String(a.note) : "",
        });
      });

      lesson.sentences.push(sentence);
    });

    if (!lesson.sentences.length) throw new Error("No usable sentences found in the file.");
    return { lesson: lesson, warnings: warnings };
  };

  /** Serializable export copy (drops volatile ids). */
  wjt.exportLesson = function (lesson) {
    var doc = {
      format: "sentence-forge-lesson",
      version: 1,
      title: lesson.title,
      description: lesson.description || "",
      layers: lesson.layers.slice(),
      sentences: lesson.sentences.map(function (s) {
        var out = {
          text: s.text,
          annotations: s.annotations.map(function (a) {
            var ann = { start: a.start, end: a.end, label: a.label };
            if (a.note) ann.note = a.note;
            return ann;
          }),
        };
        if (s.types && Object.keys(s.types).length) out.types = s.types;
        return out;
      }),
    };
    // Only written when on, so the default (full palette) stays implicit.
    if (lesson.essentialOnly) doc.essentialOnly = true;
    return doc;
  };

  wjt.downloadJson = function (obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  };

  /* ------------------------------------------------------------------ *
   * Sample lesson — offsets computed by substring search so they are
   * always exact.
   * ------------------------------------------------------------------ */

  wjt.buildSampleLesson = function () {
    function sentence(text, specs, types) {
      var anns = [];
      specs.forEach(function (spec) {
        var match = spec[0], label = spec[1], note = spec[2];
        var nth = spec[3] || 1; // which occurrence of `match`
        var at = -1;
        for (var n = 0; n < nth; n++) at = text.indexOf(match, at + 1);
        if (at === -1) { if (window.console) console.warn("sample: no match for", match); return; }
        anns.push({ id: wjt.uid(), start: at, end: at + match.length, label: label, note: note || "" });
      });
      var s = { text: text, annotations: anns };
      if (types) s.types = types;
      return s;
    }

    var lesson = wjt.store.create("Sample: The Fox and the River");
    lesson.description = "A four-sentence demo annotated at every level — parts of speech, sentence parts (simple, complete, and compound subjects and predicates), phrases, clauses, and each sentence's type. Duplicate it, present it, or quiz on it.";
    lesson.sentences = [
      sentence("The curious fox darted across the frozen river.", [
        ["The", "determiner"],
        ["curious", "adjective"],
        ["fox", "noun"],
        ["darted", "verb"],
        ["across", "preposition"],
        ["the", "determiner"],
        ["frozen", "adjective"],
        ["river.", "noun"],
        ["The curious fox", "complete-subject", "The simple subject plus its modifiers."],
        ["fox", "simple-subject", "The one main noun the sentence is about."],
        ["darted across the frozen river.", "complete-predicate"],
        ["darted", "simple-predicate", "The verb by itself."],
        ["The curious fox", "noun-phrase"],
        ["across the frozen river.", "prepositional-phrase", "Acts as an adverb: it tells where the fox darted."],
        ["The curious fox darted across the frozen river.", "independent-clause", "A complete thought that stands on its own."],
      ], { structure: "simple", purpose: "declarative" }),
      sentence("Because the ice was thin, she moved carefully.", [
        ["Because", "conjunction", "A subordinating conjunction — it makes the clause dependent."],
        ["the", "determiner"],
        ["ice", "noun"],
        ["was", "verb"],
        ["thin,", "adjective"],
        ["she", "pronoun"],
        ["moved", "verb"],
        ["carefully.", "adverb"],
        ["she", "complete-subject", "Here the complete and simple subject are the same single word."],
        ["moved carefully.", "complete-predicate"],
        ["moved", "simple-predicate"],
        ["thin,", "complement", "A subject complement: it completes “the ice was…”"],
        ["Because the ice was thin,", "dependent-clause", "It has a subject and verb but can’t stand alone."],
        ["Because the ice was thin,", "adverbial-clause", "It tells WHY she moved carefully."],
        ["she moved carefully.", "independent-clause"],
      ], { structure: "complex", purpose: "declarative" }),
      sentence("Her paws, quick and silent, barely touched the icy surface.", [
        ["Her", "pronoun", "A possessive pronoun acting as a determiner."],
        ["paws,", "noun"],
        ["quick", "adjective"],
        ["and", "conjunction"],
        ["silent,", "adjective"],
        ["barely", "adverb"],
        ["touched", "verb"],
        ["the", "determiner"],
        ["icy", "adjective"],
        ["surface.", "noun"],
        ["Her paws, quick and silent,", "complete-subject"],
        ["paws,", "simple-subject"],
        ["barely touched the icy surface.", "complete-predicate"],
        ["touched", "simple-predicate"],
        ["the icy surface.", "direct-object", "It receives the action: what did the paws touch?"],
        ["Her paws,", "noun-phrase"],
        ["the icy surface.", "noun-phrase"],
        ["Her paws, quick and silent, barely touched the icy surface.", "independent-clause"],
      ], { structure: "simple", purpose: "declarative" }),
      sentence("The fox and the hare raced downhill and leaped over the log.", [
        ["The", "determiner"],
        ["fox", "noun"],
        ["and", "conjunction"],
        ["the", "determiner"],
        ["hare", "noun"],
        ["raced", "verb"],
        ["downhill", "adverb"],
        ["and", "conjunction", "", 2],
        ["leaped", "verb"],
        ["over", "preposition"],
        ["log.", "noun"],
        ["The fox and the hare", "compound-subject", "Two subjects, one verb — joined by “and.”"],
        ["fox", "simple-subject"],
        ["hare", "simple-subject"],
        ["raced downhill and leaped over the log.", "compound-predicate", "Two verbs, one subject — joined by “and.”"],
        ["raced", "simple-predicate"],
        ["leaped", "simple-predicate"],
        ["over the log.", "prepositional-phrase"],
        ["The fox and the hare raced downhill and leaped over the log.", "independent-clause", "Still ONE clause — a compound subject and predicate do not make a compound sentence."],
      ], { structure: "simple", purpose: "declarative" }),
    ];
    return lesson;
  };
})();
