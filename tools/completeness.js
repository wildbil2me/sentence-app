/* Sentence Forge — lesson completeness checker (Node, DOM-free).
 *
 * Enforces that every COMPLETE sentence is fully labelled at all four layers.
 * A sentence is "complete" when it carries a `types` badge (structure/purpose);
 * a sentence with no badge is treated as an intentional fragment (e.g. a line of
 * verse) and is exempt from the clause/subject/predicate rules — but it still
 * must be fully labelled at the part-of-speech layer.
 *
 * Rules:
 *   1. POS coverage (all sentences) — every word-bearing token is covered by at
 *      least one `pos`-layer annotation. Pure-punctuation tokens are exempt.
 *   2. Clause coverage (badged only) — the sentence has at least one
 *      `clause`-layer span, and the clause spans together cover every token
 *      except pure punctuation and interjections. (A coordinating conjunction
 *      that joins two clauses is absorbed into the adjacent clause span, the
 *      convention used throughout the examples, so it counts as covered.)
 *   3. Per-clause subject + predicate (badged only) — every clause-layer span
 *      contains at least one `subject`-family span AND one `predicate`-family
 *      span. Imperatives satisfy the subject rule via `understood-subject`.
 *
 * Usage: const { checkLesson } = require("./completeness.js");
 *        const { errors, notes } = checkLesson(lesson, wjt);
 * `wjt` must expose LABELS, layerOf, familyOf, tokenize, spanToTokens. */
"use strict";

/* Curated, genuine exceptions: sentences that legitimately break a rule and
 * should NOT fail the build. Keyed by lesson title + exact sentence text + the
 * rule id ("pos-coverage" | "clause-coverage" | "subject" | "predicate").
 * Keep this list tiny and each entry justified — it exists so a real oddity
 * never forces a change to the frozen lesson format. */
var EXCEPTIONS = [
  // { title: "...", text: "...", rule: "subject", why: "..." },
];

function isExcepted(title, text, rule) {
  return EXCEPTIONS.some(function (e) {
    return e.title === title && e.text === text && e.rule === rule;
  });
}

function shorten(t) {
  t = String(t);
  return t.length > 50 ? t.slice(0, 47) + "…" : t;
}

/** Layer id an annotation belongs to, or null. */
function layerIdOf(a, wjt) {
  var l = a && a.label ? wjt.layerOf(a.label) : null;
  return l ? l.id : null;
}

/** Set (by token index) of tokens covered by any annotation on a given layer. */
function layerCoverage(anns, tokens, wjt, layerId) {
  var covered = {};
  anns.forEach(function (a) {
    if (layerIdOf(a, wjt) !== layerId) return;
    var r = wjt.spanToTokens(tokens, a.start, a.end);
    if (!r) return;
    for (var i = r.first; i <= r.last; i++) covered[i] = true;
  });
  return covered;
}

/** Set (by token index) of tokens covered by any annotation in a given family. */
function familyCoverage(anns, tokens, wjt, familyId) {
  var covered = {};
  anns.forEach(function (a) {
    if (!wjt.LABELS[a.label]) return;
    if (wjt.familyOf(a.label) !== familyId) return;
    var r = wjt.spanToTokens(tokens, a.start, a.end);
    if (!r) return;
    for (var i = r.first; i <= r.last; i++) covered[i] = true;
  });
  return covered;
}

/** Token ranges {first,last} of every annotation in a given part-layer family. */
function familyRanges(anns, tokens, wjt, familyId) {
  var out = [];
  anns.forEach(function (a) {
    if (!wjt.LABELS[a.label]) return;
    if (wjt.familyOf(a.label) !== familyId) return;
    var r = wjt.spanToTokens(tokens, a.start, a.end);
    if (r) out.push(r);
  });
  return out;
}

/** True when token range `inner` sits inside token range `outer`. */
function within(inner, outer) {
  return inner.first >= outer.first && inner.last <= outer.last;
}

function checkLesson(lesson, wjt) {
  var errors = [];
  var notes = [];
  var title = (lesson && lesson.title) || "(untitled)";
  var sentences = (lesson && lesson.sentences) || [];

  sentences.forEach(function (s, si) {
    var text = typeof s === "string" ? s : (s && s.text) || "";
    var anns = (s && s.annotations) || [];
    var tokens = wjt.tokenize(text);
    var badged = !!(s && s.types && (s.types.structure || s.types.purpose));
    var where = title + " / s" + (si + 1) + " \"" + shorten(text) + "\"";

    // Rule 1 — POS coverage (applies to every sentence, fragments included).
    if (!isExcepted(title, text, "pos-coverage")) {
      var posCovered = layerCoverage(anns, tokens, wjt, "pos");
      tokens.forEach(function (t, ti) {
        if (!/[A-Za-z0-9]/.test(t.text)) return; // pure-punctuation token: exempt
        if (!posCovered[ti]) {
          errors.push(where + " — pos: token \"" + t.text + "\" has no part-of-speech label");
        }
      });
    }

    if (!badged) {
      notes.push(where + " — no type badge; treated as a fragment (clause/subject/predicate checks skipped)");
      return;
    }

    // Rule 2 — clause coverage.
    var clauseRanges = [];
    anns.forEach(function (a) {
      if (layerIdOf(a, wjt) !== "clause") return;
      var r = wjt.spanToTokens(tokens, a.start, a.end);
      if (r) clauseRanges.push(r);
    });
    if (clauseRanges.length === 0) {
      if (!isExcepted(title, text, "clause-coverage")) {
        errors.push(where + " — clause: sentence has no clause-layer span");
      }
    } else if (!isExcepted(title, text, "clause-coverage")) {
      var covered = {};
      clauseRanges.forEach(function (r) {
        for (var i = r.first; i <= r.last; i++) covered[i] = true;
      });
      // Interjections sit outside the clause structure (e.g. a leading "Wow,").
      var interjCovered = familyCoverage(anns, tokens, wjt, "interjection");
      var uncovered = [];
      tokens.forEach(function (t, ti) {
        if (covered[ti]) return;
        if (!/[A-Za-z0-9]/.test(t.text)) return; // pure punctuation
        if (interjCovered[ti]) return;           // interjection
        uncovered.push(t.text);
      });
      if (uncovered.length) {
        errors.push(where + " — clause: tokens outside any clause span: " + uncovered.join(" "));
      }
    }

    // Rule 3 — subject + predicate, per clause (or sentence-wide if no clause).
    var subjRanges = familyRanges(anns, tokens, wjt, "subject");
    var predRanges = familyRanges(anns, tokens, wjt, "predicate");
    var needSubj = !isExcepted(title, text, "subject");
    var needPred = !isExcepted(title, text, "predicate");

    if (clauseRanges.length) {
      clauseRanges.forEach(function (c) {
        var clauseText = text.slice(tokens[c.first].start, tokens[c.last].end);
        if (needSubj && !subjRanges.some(function (r) { return within(r, c); })) {
          errors.push(where + " — part: clause \"" + shorten(clauseText) + "\" has no subject-family span");
        }
        if (needPred && !predRanges.some(function (r) { return within(r, c); })) {
          errors.push(where + " — part: clause \"" + shorten(clauseText) + "\" has no predicate-family span");
        }
      });
    } else {
      if (needSubj && !subjRanges.length) {
        errors.push(where + " — part: sentence has no subject-family span");
      }
      if (needPred && !predRanges.length) {
        errors.push(where + " — part: sentence has no predicate-family span");
      }
    }
  });

  return { errors: errors, notes: notes };
}

module.exports = { checkLesson: checkLesson };
