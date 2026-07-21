# Lesson JSON — format specification

The lesson file is the only interface Grammar Lab exposes: it is what
**⬇ Export** writes, what **⬆ Import JSON** reads, what the samples in
[`samples/`](../../samples/) are, and what a custom GPT produces.

The authoritative implementation is `GL.importLesson` / `GL.exportLesson` in
[`js/store.js`](../../js/store.js). This document describes it; where the two
disagree, the code wins and this document is a bug.

- [Complete example](#complete-example)
- [Top level](#top-level)
- [Sentence objects](#sentence-objects)
- [Annotation objects](#annotation-objects)
- [What the importer skips vs. rejects](#what-the-importer-skips-vs-rejects)
- [Export differs from import](#export-differs-from-import)
- [Compatibility](#compatibility)

---

## Complete example

```json
{
  "format": "grammar-lab-lesson",
  "version": 1,
  "title": "The Fox and the River",
  "description": "A one-sentence starter labeled at every level.",
  "layers": ["pos", "part", "phrase", "clause"],
  "essentialOnly": false,
  "sentences": [
    {
      "text": "The curious fox darted across the frozen river.",
      "types": { "structure": "simple", "purpose": "declarative" },
      "annotations": [
        { "match": "fox", "label": "simple-subject" },
        { "match": "The curious fox", "label": "complete-subject", "note": "Ask: who is this sentence about?" },
        { "match": "across the frozen river", "label": "prepositional-phrase" },
        { "start": 0, "end": 46, "label": "independent-clause" }
      ]
    }
  ]
}
```

## Top level

| Field | Type | Required | Behavior |
|---|---|---|---|
| `format` | string | recommended | If present it **must** be `"grammar-lab-lesson"`, or the import is rejected outright. Absent is fine. |
| `version` | number | optional | Currently `1`. Not validated. |
| `title` | string | recommended | Defaults to `"Imported lesson"`. Coerced with `String()`. |
| `description` | string | optional | Shown on the lesson card. Defaults to `""`. |
| `layers` | string[] | optional | Which teaching levels the lesson uses: any of `pos`, `part`, `phrase`, `clause`. Unrecognized entries are dropped with a warning. An empty or absent array falls back to all four, and **any layer actually used by an annotation is added automatically** — so you can omit this entirely. |
| `essentialOnly` | boolean | optional | Default `false`. Strictly `=== true` to enable. Narrows the *editor palette* to Essential labels; never hides an existing annotation. |
| `sentences` | array | **required** | Must be an array or the import is rejected. Must yield at least one usable sentence. |

## Sentence objects

Each entry in `sentences` is either a **string** (treated as `text` with no
annotations) or an object:

| Field | Type | Required | Behavior |
|---|---|---|---|
| `text` | string | **yes** | The exact sentence, punctuation included. Trimmed. An empty result is skipped with a warning. |
| `types` | object | optional | `{ "structure": …, "purpose": … }`. Either key may be omitted. |
| `annotations` | array | optional | Defaults to empty. |

### `types` values

| Key | Valid values |
|---|---|
| `structure` | `simple` · `compound` · `complex` · `compound-complex` |
| `purpose` | `declarative` · `interrogative` · `imperative` · `exclamatory` |

An unknown value is skipped with a warning; the other axis still applies. These
are whole-sentence badges — **never** put them in `annotations`.

## Annotation objects

An annotation marks one span of the sentence and gives it one label.

| Field | Type | Required | Behavior |
|---|---|---|---|
| `label` | string | **yes** | A label id from [grammar-reference.md](../product/grammar-reference.md). Unknown ids are skipped with a warning. |
| `match` | string | one of | The **first occurrence** of this exact substring of `text` becomes the span. |
| `start` / `end` | number | one of | 0-based character offsets into `text`; `end` is **exclusive**. |
| `note` | string | optional | A teaching note. Surfaces in Present mode and in quiz feedback. |

**`match` wins.** If both `match` and `start`/`end` are present, `match` is
resolved and the offsets are overwritten. Use `start`/`end` only when the text
you want appears more than once and you need a later occurrence.

`match` is a plain `String.prototype.indexOf` — no normalization, no
case-folding, no smart-quote handling. `"don't"` will not find `"don’t"`.

### Spans snap outward to whole words

Whatever you supply, the stored span is expanded to cover **complete tokens**.
A token is whitespace-delimited and includes trailing punctuation, so `"river."`
is one token.

This means offsets don't have to be exact — `{"start": 6, "end": 11}` over
`"The curious fox"` snaps out to cover `curious fox`. It also means **you cannot
label part of a word**, and it's why the example above can write `"end": 46`
(stopping before the period) and still get the whole sentence.

Annotations may freely **overlap**, both within a layer and across layers. The
same words being a `noun`, a `noun-phrase`, and part of a `complete-subject` is
the normal case, not a conflict.

## What the importer skips vs. rejects

**Rejected** — the whole file fails with a message in a toast:

- Not a JSON object.
- `format` present and not `"grammar-lab-lesson"`.
- `sentences` missing or not an array.
- No usable sentences after processing.

**Skipped with a warning** — the rest of the file still imports, and the warning
goes to the browser console (`[Grammar Lab import]`) with a count in the toast:

- An unrecognized entry in `layers`.
- An empty sentence.
- An unknown `types` value.
- An annotation that isn't an object.
- An unknown `label` id.
- A `match` string not found in `text`.
- Non-numeric offsets, or `end <= start`.
- A span that covers no tokens.

The design bias is **partial success**: a teacher gets the 48 annotations that
worked rather than a rejected file, and finds the 2 that didn't in the console.

## Export differs from import

`GL.exportLesson` writes a strict subset:

- **Drops** `id`, `createdAt`, `updatedAt`, and each annotation's `id` — those
  are per-device and regenerated on import.
- **Always** writes `start`/`end`, never `match`. (`match` is an import-side
  convenience for hand-authoring.)
- **Omits** `note` when empty, `types` when empty, and `essentialOnly` unless
  it's `true` — so the defaults stay implicit and adding the field didn't change
  any existing file.

Round-tripping a lesson through export → import is lossless except for those ids
and, in the general case, a re-derived `layers` array.

## Compatibility

There is one version and no migration path yet. If the format ever changes
incompatibly, `version` is the hook — bump it, and have `importLesson` branch on
it. Until then, keep changes **additive and optional**, the way `types` and
`essentialOnly` were added: an old file must keep importing, and a file written
by a newer app should degrade to skipped-with-a-warning in an older one rather
than being rejected.
