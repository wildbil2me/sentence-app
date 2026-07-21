/* Grammar Lab — text utilities: sentence splitting and tokenization.
 * Annotations are stored as character offsets into a sentence's text;
 * tokens carry their offsets so the two can be mapped in both directions.
 */
(function () {
  "use strict";
  window.GL = window.GL || {};

  /**
   * Split a paragraph into sentence strings. Splits on ., !, ?, …
   * (keeping closing quotes/brackets with the sentence) and on newlines.
   * Naive on abbreviations — the editor lets teachers merge sentences.
   */
  GL.splitSentences = function (paragraph) {
    var out = [];
    String(paragraph).split(/\n+/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var matches = line.match(/[^.!?…]+[.!?…]+["'”’)\]]*|[^.!?…]+$/g);
      (matches || [line]).forEach(function (s) {
        s = s.trim();
        if (s) out.push(s);
      });
    });
    return out;
  };

  /**
   * Tokenize a sentence into whitespace-separated tokens.
   * Each token: { text, start, end, i } with end exclusive.
   */
  GL.tokenize = function (text) {
    var tokens = [];
    var re = /\S+/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length, i: tokens.length });
    }
    return tokens;
  };

  /**
   * Map a char-offset span to a token index range [first, last] (inclusive),
   * snapping outward to whole tokens. Returns null if it covers no token.
   */
  GL.spanToTokens = function (tokens, start, end) {
    var first = -1;
    var last = -1;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.end > start && t.start < end) {
        if (first === -1) first = i;
        last = i;
      }
    }
    return first === -1 ? null : { first: first, last: last };
  };

  /** Char offsets covering tokens [first..last]. */
  GL.tokensToSpan = function (tokens, first, last) {
    return { start: tokens[first].start, end: tokens[last].end };
  };

  /** Sentence text sliced for an annotation. */
  GL.spanText = function (text, ann) {
    return text.slice(ann.start, ann.end);
  };

  GL.uid = function () {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  GL.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
})();
