---
title: Sentence Forge — to-do
tags: [importer, matching, punctuation, docs, pilot-safe]
status: open
created: 2026-07-22
---

# To-do

## 1. Fold smart quotes in `match` lookup  — `[importer]` `[pilot-safe]`

**Problem.** `match` resolves via a literal `String.prototype.indexOf`
([js/store.js:161](js/store.js#L161)), so an author typing a straight quote in
`match` fails to find a passage that contains the curly variant. The annotation
is dropped with only a console warning.

**Fix.** Fold quote characters on *both sides of the comparison only* — never
rewrite the stored passage text. Curly↔straight is a 1-code-unit→1-code-unit
substitution, so resolved offsets are preserved and we still slice the untouched
text.

```js
function foldQuotes(s) {
  return s.replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"');
}
var at = foldQuotes(text).indexOf(foldQuotes(a.match));
```

- Additive / non-breaking: anything that matched before still matches.
- Keeps [js/store.js](js/store.js) DOM-free (pure string logic) — smoke test stays green.
- **Doc follow-up:** flip the gotcha note at
  [docs/project/lesson-json.md:96-97](docs/project/lesson-json.md#L96-L97) — it
  currently promises `don't` won't find `don't`.

## 2. Fold Unicode / non-breaking spaces in `match` lookup  — `[importer]` `[pilot-safe]`

NBSP (U+00A0), narrow NBSP (U+202F), thin space, and U+2000–U+200A → ASCII space,
same one-line touch point and same `foldQuotes`-style mechanism as item 1.

- **Offset-safe** (1 code unit → 1 code unit).
- Silent failure on pasted web/Word text; `tokenize`'s `\S+` already splits on
  these, so only the `match` lookup is affected.

Ships together with item 1.

## 3. Length-changing look-alikes (dashes, ellipsis)  — `[matching]` `[punctuation]` `[deferred]`

These **cannot** use the 1:1 fold — the substitution changes string length, so
resolved offsets would shift:

- **Ellipsis** `…` (U+2026, 1 char) vs `...` (3 chars).
- **Em/en dashes** `—`/`–` (1 char) vs a Word-autocorrected `--` (2 chars).
  (Single-char dash variants alone *are* foldable, but that doesn't cover the
  autocorrect case, which is the one that actually bites.)

**Path if we take it:** normalize a *search copy* of the text while building a
normalized→original offset map, instead of the naive fold. More code; probably
out of scope for a pilot bug fix — tracking here so it isn't lost.

## 4. Colons / semicolons — no action  — `[punctuation]` `[wontfix]`

No meaningful Unicode look-alike occurs in English classroom prose (fullwidth
`：`／Greek `;` variants don't appear). Recorded so it isn't re-investigated.

## Checks before landing any of the above
- `node tools/smoke-test.js` (also regenerates `samples/` — commit the result)
- `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
- Update [docs/project/lesson-json.md](docs/project/lesson-json.md) matching note.
