# Architecture

Grammar Lab is ~3,300 lines of plain ES5-flavored JavaScript in nine files, no
dependencies, no build step. This document explains the shape of it and the
handful of decisions that everything else follows from.

- [The five constraints](#the-five-constraints)
- [File map](#file-map)
- [The `GL` namespace](#the-gl-namespace)
- [The data model](#the-data-model)
- [The annotation model](#the-annotation-model-char-offsets-snapped-to-tokens)
- [The taxonomy](#the-taxonomy)
- [Rendering](#rendering-one-css-grid-per-sentence)
- [Routing and views](#routing-and-views)
- [Quiz generation](#quiz-generation)
- [Where docs must stay in sync](#the-taxonomy-is-documented-in-five-places)

---

## The five constraints

Everything below is downstream of these. Change one only with a deliberate
decision, because each has load-bearing consequences.

1. **It must run from `file://`.** A teacher double-clicks `index.html` off a USB
   stick on a locked-down school machine. This is why there are **no ES modules**
   (`file://` blocks them under CORS), no bundler, and no `fetch()` of local JSON
   — the example lessons are *built in JavaScript* (`js/examples.js`) rather than
   loaded from `samples/`.
2. **No dependencies and no build.** `<script>` tags in `index.html`, loaded in
   order. Node is used only to run the checks in `tools/`; there is no
   `package.json` because there is nothing to install.
3. **No network access, ever.** No analytics, no CDN, no fonts, no telemetry. The
   only `http` string in the whole app is the SVG namespace in the favicon data
   URI. See [SECURITY.md](../../SECURITY.md) for why this matters more than usual.
4. **Every annotation is a span over whole tokens.** This is the single most
   load-bearing model decision — it's why punctuation, usage errors, and verb
   tense are out of scope
   ([roadmap Tier 3](../roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool)).
5. **The taxonomy is data.** `js/labels.js` is the only place a grammar label is
   defined. Adding a label is a data edit; the palette, the renderer, the quiz,
   and the exports all derive from it.

## File map

Load order matters — each file only depends on the ones above it.

| File | Lines | Responsibility |
|---|---:|---|
| `index.html` | 29 | The whole app shell: nav, `#app` mount, `#toasts`, nine script tags. |
| `css/styles.css` | — | Design system, both themes, driven by CSS custom properties on `:root[data-theme]`. |
| `js/labels.js` | 640 | **The taxonomy.** `GL.LAYERS`, `GL.LABELS`, `GL.SENTENCE_TYPES`, and the helpers over them. Zero DOM. |
| `js/tokenize.js` | 78 | Sentence splitting, tokenizing, and span↔token conversion. Zero DOM. |
| `js/store.js` | 324 | Lesson model, `localStorage` persistence, JSON import/export, the built-in sample lesson. Nearly zero DOM. |
| `js/examples.js` | 636 | The seven example lessons, each as a `build()` that returns a lesson object. |
| `js/render.js` | 307 | The shared sentence renderer: one grid per sentence, POS chips above, span bars below. Plus the label popover. |
| `js/editor.js` | 434 | ✎ Edit view — selection, the drill-down palette, notes, sentence type chips, merge/delete. |
| `js/display.js` | 194 | ▶ Present view — one sentence at a time, layer toggles, keyboard nav. |
| `js/quiz.js` | 430 | 🎯 Practice view — question generation, distractor choice, scoring, results. |
| `js/app.js` | 207 | Hash routing, the library view, import, theme, toasts, first-run seeding. |

`tools/` is **not shipped** — it holds the two check suites, the doc generator,
and a lesson validator. `samples/` is documentation and hand-off material, not app input:
the app never reads it (see constraint 1), and `tools/smoke-test.js` regenerates
it from `js/examples.js`.

## The `GL` namespace

Every file is an IIFE that hangs its exports on one global:

```js
(function () {
  "use strict";
  window.GL = window.GL || {};
  GL.somethingNew = function () { /* … */ };
})();
```

Views register themselves as `GL.views.<name>` and take `(container, lessonId)`.
There is no module system and no dependency injection — the load order in
`index.html` *is* the dependency graph.

This is also what makes the headless checks possible: `tools/smoke-test.js`
`vm.runInContext`s `labels.js`, `tokenize.js`, `store.js`, and `examples.js` into
a sandbox with a fake `localStorage` and gets the whole logic layer with no DOM.
**Keep DOM access out of those four files** or you break the smoke test.

## The data model

A lesson, as stored in `localStorage` under `grammarLab.lessons.v1`:

```js
{
  format: "grammar-lab-lesson", version: 1,
  id: "…", title: "…", description: "…",
  layers: ["pos", "part", "phrase", "clause"],  // which levels this lesson teaches
  essentialOnly: false,                         // narrows the editor palette only
  sentences: [{
    text: "The curious fox darted across the frozen river.",
    types: { structure: "simple", purpose: "declarative" },   // optional
    annotations: [
      { id: "…", start: 0, end: 15, label: "complete-subject", note: "…" }
    ]
  }],
  createdAt: "…", updatedAt: "…"
}
```

The **export** form drops `id`, `createdAt`, `updatedAt`, and per-annotation
`id`s, and only writes `essentialOnly` when it's `true` — so the default stays
implicit and existing files stay byte-identical when the field is added. The
**import** form additionally accepts `{ "match": "text" }` in place of
`start`/`end`. Full spec: [lesson-json.md](lesson-json.md).

Persistence is deliberately whole-list: `readAll()` → mutate → `writeAll()`.
At classroom scale (tens of lessons) that's fine and it removes a whole class of
partial-write bugs.

## The annotation model: char offsets snapped to tokens

An annotation is `{ start, end, label }` where `start`/`end` are **character
offsets into that sentence's `text`**, `end` exclusive.

The invariant: **stored offsets always sit on token boundaries.** Nothing in the
app ever stores a span that cuts a word in half. Two functions in `tokenize.js`
enforce it, and every entry point runs the pair:

```js
var range = GL.spanToTokens(tokens, start, end);   // snaps OUTWARD to whole tokens
var span  = GL.tokensToSpan(tokens, range.first, range.last);
```

Editor selection, JSON import, and `match` resolution all funnel through those
two. The payoff is that the renderer can assume a span covers whole grid columns,
which is what keeps every bar aligned under its words.

A "token" is whitespace-delimited and **includes its trailing punctuation** —
`"river."` is one token. That's why annotations in the samples often end with a
period.

**Sentence splitting is deliberately naive** (`GL.splitSentences`). It splits on
`.?!…` plus optional closing quote, and on newlines. "Mr. Darcy" splits early;
the editor's **⤵ Merge next** button is the intended fix rather than a smarter
regex, because a regex that handles abbreviations still fails on the next case
and costs a class period when it does.

## The taxonomy

`js/labels.js` holds three data structures plus a normalization pass:

- **`GL.LAYERS`** — four teaching levels, each with `name`, `short`, `unit`,
  `order`, `hint`.
- **`GL.LABELS`** — 87 span labels keyed by id: `{ layer, parent, name, abbr,
  color, desc, example, tier }`.
- **`GL.SENTENCE_TYPES`** — two axes (structure, purpose) of whole-sentence
  badges. These are *not* span labels and never appear in `annotations`.

The **normalization pass at the bottom of the file** is where inheritance
happens. A child inherits its parent's `layer` and `tier`, and its `color` unless
it sets its own. Anything untagged defaults to `tier: "essential"`. So
`GL.LABELS[id].layer`, `.color`, and `.tier` are *always* populated at read time
and no consumer needs to walk the parent chain.

Two rules the smoke test enforces:

- **The tree is exactly one level deep.** A subtype's parent is always a base.
  No grandchildren. (`predicate-nominative` is conceptually a kind of
  `subject-complement` but is filed as a sibling under `complement` to keep this
  true — see [roadmap §1a](../roadmap.md#1a-complement-subtypes--the-most-cited-gap--completed-2026-07-20).)
- **Every Advanced label's parent is Essential**, so the Essential-only filter
  can never orphan a subtype.

The drill-down palette is **layer-agnostic**: `editor.js` renders the stacked
parent→child layout for any layer where `GL.layerHasSubtypes()` is true. Adding a
`parent:` key is all it takes to restructure a palette — no engine change. (All
four layers use it today.)

Colors do double duty: `GL.familyOf()` groups by base label, and `quiz.js` prefers
same-family distractors, so wrong answers come from the same color family a
student is looking at.

## Rendering: one CSS grid per sentence

`render.js` builds **one CSS grid per sentence, one column per token**:

- **Above** the words: POS chips, in a two-row arrangement when a token carries
  both a broad class and a specific subtype (this two-row treatment is
  **POS-only**).
- **The words** themselves, one per column.
- **Below**: span bars for the part / phrase / clause layers, packed **greedily
  into lanes** so overlapping spans stack instead of colliding.

Consequence: **long sentences scroll horizontally inside their card** rather than
wrapping. That is intentional — wrapping would break the column alignment the
whole visual depends on. Don't "fix" it without replacing the grid model.

The same renderer serves Edit, Present, and Practice, which is why a label looks
identical in all three.

## Routing and views

`app.js` owns a hash router with four routes:

| Hash | View |
|---|---|
| `#/` (anything else) | `GL.views.library` |
| `#/edit/<id>` | `GL.views.editor` |
| `#/present/<id>` | `GL.views.present` |
| `#/quiz/<id>` | `GL.views.quiz` |

Each view **replaces `#app` wholesale**. Any view that attaches a document-level
listener or a timer must register teardown with `GL.onViewCleanup(fn)`; the
router runs those before rendering the next view, and swallows exceptions from
them so a broken teardown can never wedge navigation.

Hash routing (not the History API) is another `file://` consequence — there's no
server to rewrite paths.

## Quiz generation

`quiz.js` generates questions *from the annotations already present*, which is
why authoring a lesson is the only authoring step. Three generators:

| Type | Prompt | Answer mechanism |
|---|---|---|
| Identify | "What is the **highlighted** word/phrase?" | multiple choice |
| Select | "Select the direct object" | drag across the words, press Check |
| Classify | "What is the structure/purpose of this sentence?" | multiple choice |

Distractors always come from the **answer's own layer**, ranked by
`GL.familyOf()` match first and "already used elsewhere in this lesson" second —
so a gerund's alternatives are other verbals rather than "Interjection", and a
student can't rule an option out just because it's exotic. For a *select*
question, **every same-label span in the sentence is an acceptable answer**, so a
sentence with two prepositional phrases doesn't punish picking the other one. A
teaching `note` is surfaced in the feedback for a missed question, which is why
notes are worth writing.

Nothing is persisted. There's no attempt log, no score history, and deliberately
no way to reconstruct an individual student's answers.

## The taxonomy is documented in five places

Adding or renaming a label touches more than `labels.js`. Three of the five are
**generated** — run `node tools/gen-docs.js` and they're correct by construction:

| Place | How it's maintained |
|---|---|
| `js/labels.js` | The source of truth. Hand-edited. |
| `docs/coverage-labels.{json,csv}` | **Generated** by `tools/gen-docs.js`. |
| `docs/product/grammar-reference.md` | **Generated** by `tools/gen-docs.js`. |
| `docs/coverage-brief.md` | Hand-maintained — counts and per-layer lists. |
| `docs/custom-gpt-instructions.md` | Hand-maintained — the label list in the prompt. |

CI fails if the generated three are stale. The last two are on you; the
step-by-step is in [taxonomy-workflow.md](taxonomy-workflow.md).
