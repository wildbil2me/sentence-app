# Tier 1 completion plan — §1c, §1d, §1e

**Status:** ✅ done 2026-07-21 · **Date:** 2026-07-21
**Parent doc:** [`roadmap.md`](roadmap.md). §1a and §1b landed 2026-07-20.

This plan covers the three remaining Tier 1 items. All three touch
[`../js/labels.js`](../js/labels.js) only — no HTML, CSS, or engine changes.
They are batched into **one edit pass** because they modify overlapping regions
of the same object (§1c and §1d both add children of `verb`) and share the same
verification loop.

---

## §1c — Word-level verbals (layer `pos`, parent `verb`)

Three new children of `verb`, inheriting layer `pos` and color `#f4574d`.
Per the roadmap's Q1 decision, each `desc` must **name the function the verbal
performs**, so filing them under `verb` does not imply they act as verbs.

| id | Name | abbr | tier | `desc` must say |
|----|------|------|------|-----------------|
| `gerund` | Gerund | ger | essential | -ing verb form acting as a **noun** |
| `participle` | Participle | part. | essential | verb form acting as an **adjective** |
| `infinitive` | Infinitive | inf | essential | "to" + base verb acting as **noun/adjective/adverb** |

Placed at the end of the `verb` block so the existing six verb subtypes keep
their order.

## §1d — Small POS gaps

| id | parent | Name | abbr | tier |
|----|--------|------|------|------|
| `regular-verb` | verb | Regular Verb | reg | essential |
| `irregular-verb` | verb | Irregular Verb | irr | essential |
| `particle` | verb | Particle (phrasal verb) | prt | advanced |
| `relative-adverb` | adverb | Relative Adverb | rel | advanced |
| `emphatic-pronoun` | pronoun | Emphatic Pronoun | emph | advanced |

Each goes into its parent's existing block, keeping the file grouped by family.

## §1e — `tier` on every label

**Implementation choice (deviation from the roadmap's letter, not its intent).**
The roadmap says to write `tier` literally onto all ~85 entries. Instead:

- Write `tier: "advanced"` explicitly on the four Advanced labels
  (`object-complement`, `particle`, `relative-adverb`, `emphatic-pronoun`).
- Extend the existing inheritance pass so every label ends up with a `tier`:
  a child inherits its parent's tier if it has none, and anything still
  untagged defaults to `"essential"`.

Rationale: the pass already supplies `layer` and `color` defaults, so this
matches the file's own idiom; after load, `GL.LABELS[id].tier` is always
populated — which is the property Tier 1.5's palette filter and the exports
actually depend on. Writing `tier: "essential"` on 76 entries adds ~76 lines of
noise for identical runtime behavior. Inheriting from the parent is also the
behavior you want if a base label is ever marked Advanced.

The `tier` value **is** materialized in the machine-readable exports
(`coverage-labels.json` / `.csv`), so the "pure data" consumer still sees it
per-label — the export one-liner in [`coverage-brief.md`](coverage-brief.md)
gains a `tier` column.

---

## Verification loop

1. Edit `js/labels.js` (one pass, all three items).
2. Add `tier` to the export one-liner in `coverage-brief.md`; regenerate
   `coverage-labels.json` / `.csv`.
3. Extend `tools/smoke-test.js`: assert every label has a valid `tier`, and that
   the new verbal/POS-gap ids exist under the intended parents.
4. Run `node tools/smoke-test.js` (also regenerates `samples/sample-lesson.json`).
5. Update counts and label lists in `coverage-brief.md`; mark §1c/§1d/§1e
   complete in `roadmap.md`.

**Expected delta:** 77 → **85** span labels (+3 verbals, +5 POS gaps), 4 of them
tagged `advanced`. POS layer goes 9 base + 37 subtypes = 46 → 9 base + 45
subtypes = **54**.
