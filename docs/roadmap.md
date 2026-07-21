# Sentence Forge — Coverage Expansion Roadmap

**Status:** Tiers 1, 1.5, and 2 shipped; Tier 3 parked as out of scope ·
**Date:** 2026-07-20 (last updated 2026-07-21)
**Source:** gap analysis in [`reference/7-20-findings.md`](reference/7-20-findings.md),
reconciled against the live taxonomy in [`../js/labels.js`](../js/labels.js).

This roadmap plans **Tier 1** (new labels, no architecture change) and **Tier 2**
(consistent drill-down for the non-POS layers). **Tier 3** — punctuation, usage
errors, and verb grammatical dimensions — is documented at the end as
**out of scope for this app** and parked for a possible sibling tool.

---

## 0. What the findings got right, and one correction

The research is strong and standards-grounded (Common Core 9–10 / 11–12, Texas
TEKS, NCTE *Grammar Alive!*, MLA/Chicago). But it reviewed the **coverage brief**,
not the app, and the brief's word "flat" misled it. The findings' two highest
"Essential" recommendations — *split phrases into subtypes* and *split clauses
into subtypes* — describe work that **is already done at the label level**:

- **Phrases** already exist: noun, verb, prepositional, gerund, infinitive,
  participial, appositive, absolute ([`labels.js:341`](../js/labels.js#L341)).
- **Clauses** already exist: independent, dependent, relative, adverbial, noun
  ([`labels.js:383`](../js/labels.js#L383)).
- **Compound subject / compound predicate** already exist
  ([`labels.js:299`](../js/labels.js#L299), [`labels.js:319`](../js/labels.js#L319)).

"Flat" in the brief meant *these labels have no parent/child grouping*, **not**
*they are missing*. So those items are re-scoped from "add labels" (Tier 1) to
"add grouping" (Tier 2).

### Key architectural fact

The drill-down mechanism is **already layer-agnostic**. The editor palette
([`editor.js:337`](../js/editor.js#L337)) renders the stacked parent→child layout
for *any* layer where `wjt.layerHasSubtypes()` is true. Adding `parent:` keys to
part/phrase/clause labels lights up that layout with **no engine changes**.

Two consequences to keep in mind:

- The moment a layer gains its first subtype, its palette flips from a flat grid
  to the stacked layout. Bases with no children still render fine (a lone base
  button). So introducing complement subtypes (Tier 1) will restyle the whole
  Sentence-Parts palette into subgroups — expected, not a regression.
- The two-row "broad class + specific" **chip** display in
  [`render.js:78`](../js/render.js#L78) is **POS-only**. Parts/phrases/clauses
  render as span **bars**, which show the chosen label. Subtyping those layers
  improves the palette grouping and quiz distractor quality (`wjt.familyOf`,
  [`quiz.js:79`](../js/quiz.js#L79)) but does **not** add a second visual row to
  the bars. That is acceptable and intended.

---

## Tier 1 — New labels (no architecture change)

Pure additions to `wjt.LABELS`. The app is fully data-driven off that object, so
each row below is a data entry plus a one-line `desc`/`example`, following the
existing style. Priorities (**Essential** / **Advanced**) are the findings' own.

### 1a. Complement subtypes — the most-cited gap ✅ **Completed 2026-07-20**

`complement` ([`labels.js:334`](../js/labels.js#L334)) is one undivided label.
Subdivide it, using the existing parent/child mechanism (children inherit
complement's layer `part` and color `#c084fc`):

| id | parent | Name | abbr | Priority |
|----|--------|------|------|----------|
| `subject-complement` | complement | Subject Complement | SC | Essential |
| `predicate-nominative` | complement | Predicate Nominative | PN | Essential |
| `predicate-adjective` | complement | Predicate Adjective | PA | Essential |
| `object-complement` | complement | Object Complement | OC | Advanced |

> Note: `predicate-nominative` and `predicate-adjective` are the two kinds of
> `subject-complement`. The taxonomy stays one level deep (all four are children
> of `complement`), matching the current single-level POS pattern; the
> desc text should explain that a predicate nominative/adjective *is* a subject
> complement, so teachers understand the overlap.

### 1b. Missing sentence parts (Layer `part`) ✅ **Completed 2026-07-20**

**Decision (Q2):** group the objects under a new `object` base. Introducing that
base and the new object type together here is cleaner than adding a flat label
now and reparenting later — the mechanism is identical and reparenting preserves
ids, so there is no migration cost either way. This pulls a little of the Tier 2
grouping forward, which is fine.

New `object` base (its own color in the greens family, e.g. `#34d399`) with the
two existing object labels reparented under it, plus the new one:

| id | parent | Name | abbr | Priority | Note |
|----|--------|------|------|----------|------|
| `object` | — | Object | Obj | Essential | New base; parents the three object types. |
| `direct-object` | object | Direct Object | DO | Essential | **Reparent** existing ([`labels.js:324`](../js/labels.js#L324)). |
| `indirect-object` | object | Indirect Object | IO | Essential | **Reparent** existing ([`labels.js:329`](../js/labels.js#L329)). |
| `object-of-preposition` | object | Object of the Preposition | OP | Essential | New; the noun governed by a preposition. |

Plus one flat base (no natural parent):

| id | Name | abbr | Priority | Note |
|----|------|------|----------|------|
| `appositive` | Appositive | Appos | Essential | Single-word / short appositive as a *part*; distinct from the existing `appositive-phrase`. |

`understood-subject` ("(You)" in imperatives) is deferred into Tier 2, where it
becomes a child of `subject` alongside simple/complete/compound.

> Reparenting `direct-object` / `indirect-object` reassigns them from their
> current standalone greens (`#34d399`, `#86efac`) to inherit the `object` base
> color. Decide in coding whether to keep the base color or override each child
> back to its current shade for continuity in existing lessons.

### 1c. Verbals as word-level POS (Layer `pos`, parent `verb`) ✅ **Completed 2026-07-21**

Currently gerund/participle/infinitive exist **only as phrases**; the words
themselves cannot be tagged. Add word-level forms as children of `verb`
(inherit color `#f4574d`):

| id | Name | abbr | Priority |
|----|------|------|----------|
| `gerund` | Gerund | ger | Essential |
| `participle` | Participle | part. | Essential |
| `infinitive` | Infinitive | inf | Essential |

> **Decision (Q1): children of `verb`.** Verbals straddle word classes — a gerund
> functions as a noun, a participle as an adjective, an infinitive variously — but
> filing them under `verb` matches how textbooks introduce them ("verb forms") and
> keeps the color family intact. To offset the risk of implying they *act* as
> verbs, each `desc` must name the function it performs (e.g. "an -ing verb form
> acting as a noun"). Note the deliberate asymmetry with §2c: word-level verbals
> live under `verb`, but *phrase*-level verbals get their own `verbal-phrase` base
> — each grouping is chosen on its own merits, not for cross-layer symmetry.

### 1d. Small POS gaps ✅ **Completed 2026-07-21**

Children of their base part of speech; **Advanced** unless noted:

| id | parent | Name | abbr | Priority |
|----|--------|------|------|----------|
| `regular-verb` | verb | Regular Verb | reg | Essential |
| `irregular-verb` | verb | Irregular Verb | irr | Essential |
| `relative-adverb` | adverb | Relative Adverb | rel | Advanced |
| `emphatic-pronoun` | pronoun | Emphatic Pronoun | emph | Advanced |
| `particle` | verb | Particle (phrasal verb) | prt | Advanced |

> `particle` under `verb` (the *up* in "look up") is the least settled choice; it
> is not a preposition even though it looks like one. Marked Advanced so it can be
> omitted from an initial classroom set.

### 1e. Tag every label with a tier (Q5) ✅ **Completed 2026-07-21**

**Decision (Q5): tag tiers now, build the filter later.** Add a `tier` field
(`"essential"` | `"advanced"`) to **every** entry in `wjt.LABELS` — not just the
new ones — as pure data. This is cheap, unblocks nothing, and lets a later
follow-up ([Tier 1.5](#tier-15--essential-only-palette-filter--shipped)) hide Advanced
labels without re-touching the taxonomy. Default any untagged label to
`essential` in the inheritance pass so partial data never hides a label.

The Advanced set from the findings is small: `object-complement`, `particle`,
`relative-adverb`, `emphatic-pronoun`, plus the diagramming/verb-dimension items
that Tier 3 excludes entirely. Everything else is Essential.

> **As built (2026-07-21):** only those four labels carry a literal
> `tier: "advanced"`. The normalization pass then gives every label a `tier` —
> a child inherits its parent's, and anything untagged defaults to
> `"essential"` — so `wjt.LABELS[id].tier` is always populated for the Tier 1.5
> filter, and `wjt.isEssential(id)` is available as a helper. This matches how
> the file already defaults `layer` and `color`, instead of repeating
> `tier: "essential"` on 81 entries. The **exports** do materialize the tier
> per-label (`coverage-labels.json` / `.csv` gained a `tier` column), so the
> "pure data" consumer sees it explicitly. Rationale in
> [`tier1-remaining-plan.md`](tier1-remaining-plan.md).

### Tier 1 mechanics (do this per batch)

1. Edit [`../js/labels.js`](../js/labels.js) only.
2. Regenerate the derived docs with `node tools/gen-docs.js`.
3. Run `node tools/smoke-test.js` (also regenerates `samples/sample-lesson.json`).
4. Update the counts and label lists in [`coverage-brief.md`](coverage-brief.md).

> The full, current version of this loop — including the hand-maintained docs
> step 4 doesn't cover — is
> [`project/taxonomy-workflow.md`](project/taxonomy-workflow.md).

**Tier 1 delta:** +4 complement subtypes, +1 `object` base, +1 object-of-prep,
+1 appositive, +3 verbals, +5 POS gaps = **15 new labels**, taxonomy 70 → **85**
span labels (plus `direct-object`/`indirect-object` reparented, and a `tier`
field on all). No JS logic, HTML, or CSS changes required for the labels
themselves; the `tier` **filter UI** is the separate Tier 1.5 below.

### ✅ Tier 1 complete — 2026-07-21

All five items (1a–1e) have landed. Verified: `node tools/smoke-test.js` passes
(now asserting every label has a valid tier and that the verbals/POS gaps hang
off the intended parents), exports regenerated at **85 span labels — 81
Essential, 4 Advanced** (POS 9 base + 45 subtypes = 54; Parts 18; Phrases 8;
Clauses 5), and all sample lessons still round-trip with no warnings.
Next up: **Tier 1.5** (the Essential-only palette filter, now unblocked by the
`tier` data) or **Tier 2** — the two are independent. *(Both have since
shipped; only Tier 3, deliberately out of scope, remains.)*

---

## Tier 2 — Consistent drill-down for the non-POS layers

Goal: give Sentence Parts, Phrases, and Clauses the same parent→child grouping
the POS layer has, so the palette reads as organized families and the quiz can
generate "same-family" distractors. **No engine code changes** (see §0); this is
taxonomy design plus adding `parent:` keys to *existing* labels.

### 2a. Sentence Parts — regroup existing families ✅ **Completed 2026-07-21**

Today `subject` and its variants are four separate flat labels. Make the umbrella
the parent:

| becomes child of | existing labels |
|------------------|-----------------|
| `subject` | `simple-subject`, `complete-subject`, `compound-subject`, **`understood-subject`** (new, from 1b) |
| `predicate` | `simple-predicate`, `complete-predicate`, `compound-predicate` |

Objects and complements are handled in Tier 1: `complement` gains its four
children (§1a) and the `object` base is created with direct/indirect/
object-of-preposition under it (§1b, Q2 decided). So after Tier 1 + this step,
the Sentence-Parts layer reads as four clean families — **subject, predicate,
object, complement** — each with its variants nested.

> **Migration risk:** existing annotations store a `label` id. Reparenting keeps
> ids unchanged (e.g. `simple-subject` stays `simple-subject`), so **saved
> lessons and samples keep working** — only the palette layout and `familyOf`
> grouping change. No data migration needed. Verify with the sample lessons after
> the change.

### 2b. Clauses — introduce a dependent-clause parent ✅ **Completed 2026-07-21**

The cleanest tree, well supported by Common Core's own list:

| parent | children |
|--------|----------|
| `independent-clause` | *(stands alone, no children)* |
| `dependent-clause` | `relative-clause`, `adverbial-clause`, `noun-clause` |

Reparent the three existing dependent subtypes under `dependent-clause`. Same
zero-migration property as 2a (ids unchanged).

### 2c. Phrases — group the verbal phrases (Q3 decided) ✅ **Completed 2026-07-21**

**Decision (Q3): group verbal phrases, leave the rest flat.** Introduce a
`verbal-phrase` base parenting the three existing verbal phrases; the other five
stay flat as bases:

| parent | children |
|--------|----------|
| `verbal-phrase` (new base) | `gerund-phrase`, `participial-phrase`, `infinitive-phrase` |
| *flat bases* | `noun-phrase`, `verb-phrase`, `prepositional-phrase`, `appositive-phrase`, `absolute-phrase` |

Reparenting the three keeps their ids, so existing lessons/samples are unaffected
(same zero-migration property as 2a/2b). `verbal-phrase` needs its own color and
a short `desc` ("a phrase built on a verb form — gerund, participle, or
infinitive"). This is the phrase-layer parallel to the word-level verbals in §1c,
though note the two are grouped differently by design (§1c files word verbals
under `verb`, not a `verbal` base).

### Tier 2 mechanics

Same loop as Tier 1 (edit `labels.js`, regenerate exports, smoke test, refresh
the brief), plus:

- After reparenting, **load each sample in `samples/`** and confirm annotations
  still render (ids are preserved, so this is a spot-check, not a migration).
- Update [`coverage-brief.md`](coverage-brief.md) to describe parts/phrases/
  clauses as drill-down layers, removing the "entirely flat" language that caused
  the original misread.

### ✅ Tier 2 complete — 2026-07-21

All three items (2a–2c) landed, and — as §0 predicted — **no engine code
changed**: the edits are `parent:` keys plus two new base labels in
[`labels.js`](../js/labels.js). Every layer now returns true from
`wjt.layerHasSubtypes()`, so all four palettes render the stacked
parent→child layout.

**Delta:** +2 labels (`understood-subject` under `subject`, `verbal-phrase`
parenting the three verbal phrases), 10 existing labels reparented, taxonomy
85 → **87** span labels (83 Essential, 4 Advanced). Layer shape is now POS
9 base + 45 subtypes; Parts 5 + 14; Phrases 6 + 3; Clauses 2 + 3.

**As built — two notes:**

- **Subtypes keep their own colors.** Unlike the §1b object reparenting (which
  let the children inherit the base green), the subject/predicate/clause/phrase
  variants kept their existing distinct shades. They read as one hue family
  already, and collapsing them would make e.g. simple vs. complete subject
  indistinguishable in a rendered diagram — the exact contrast a teacher is
  pointing at. The smoke test was relaxed accordingly: a subtype must inherit
  its parent's **layer** and have *a* color, but may override the color.
- **`understood-subject` has no tokens to span.** The "(you)" of an imperative
  isn't written, so the label's `desc` directs the teacher to mark the word it
  commands and name the missing subject. This is the one Tier 2 label that
  stretches the span model; it stops short of Tier 3b's problems because it
  still resolves to a real token span.

**Verified:** `node tools/smoke-test.js` passes (new assertions cover each of
2a/2b/2c, that every layer advertises subtypes, and that the taxonomy stays one
level deep), exports regenerated, and all sample lessons round-trip with no
warnings — ids were preserved by every reparenting, so no data migration was
needed.

---

## Tier 1.5 — Essential-only palette filter ✅ shipped

The one item in this roadmap that needed **real UI code** (everything else is
data). It consumes the `tier` field added in §1e to keep the ~85-label palette
manageable in the classroom.

As built:

- **`lesson.essentialOnly`** (boolean, default `false`) sits beside `lesson.layers`
  in the lesson model ([`store.js`](../js/store.js)) — same persistence, and
  import/export carries it (written to JSON only when on, so the default stays
  implicit and existing lessons/samples are byte-identical).
- **Toggle:** an "Essential only" pill in the editor header, directly below the
  teaching-level toggles ([`editor.js`](../js/editor.js)).
- **Filtering:** `wjt.filterTier(ids, essentialOnly)` in [`labels.js`](../js/labels.js)
  narrows `wjt.labelsForLayer` / `wjt.childrenOf` output where the palette is built.
  An Advanced *base* label still renders if it heads Essential children (none do
  today — the smoke test asserts every Advanced label has an Essential parent),
  and a layer group that filters down to nothing is dropped entirely.
- **Edge case honored:** already-placed Advanced annotations stay visible in the
  editor, Present mode, and quizzes. `render.js` and `quiz.js` were not touched.

---

## Tier 3 — Out of scope for this app (documented for a sibling tool)

Each Tier 3 area breaks a core assumption of Sentence Forge — that every annotation
is a **span over whole tokens**. They are worth building, but as a **separate
app**, not by bending this one's model. Captured here so the need isn't lost.

### 3a. Punctuation layer (comma, semicolon, colon, dash, parentheses, apostrophe, hyphen)
- **Why it doesn't fit:** these annotate marks *between/around* tokens, not the
  tokens themselves. The current model snaps every span to whole-token
  boundaries ([tokenizer + `spanToTokens`]). Punctuation needs a different
  addressing scheme (inter-token positions, or the punctuation character as its
  own selectable unit).
- **Sibling-app need:** a punctuation-aware annotation surface where the unit of
  selection can be a single mark and the "reason" (e.g. sets off a nonrestrictive
  clause) links to a clause span.

### 3b. Usage / sentence-boundary errors (fragment, run-on, comma splice, misplaced & dangling modifier, parallel structure)
- **Why it doesn't fit:** these are **whole-sentence or cross-span diagnostics**,
  not structural spans. They behave like the existing `SENTENCE_TYPES` badges,
  not like span labels. Modeling them as spans would misrepresent them.
- **Sibling-app need:** an "error/diagnostic" axis (a third badge family beside
  Structure and Purpose), plus, for modifier errors, the ability to point at the
  *misattached* relationship between two spans.

### 3c. Verb grammatical dimensions (tense, aspect, voice, mood)
- **Why it doesn't fit:** these are **orthogonal dimensions** of one verb, not a
  span type. Encoding them as POS subtypes explodes combinatorially
  (tense × aspect × voice × mood). Sentence Forge assigns one label per span.
- **Sibling-app need:** a per-verb property panel (multiple independent
  dimensions on a single annotation), which is a different data model than
  "one label id per span."

### 3d. Reed–Kellogg diagramming vocabulary
- **Why it doesn't fit:** describes a *diagram notation* (baseline, pedestal,
  diagonal modifier line), not a property of the sentence text. NCTE itself
  frames diagramming as an optional means, not an end.
- **Sibling-app need:** a diagramming tool, a fundamentally different renderer.

---

## Resolved decisions

Settled 2026-07-20; folded into the tiers above.

| # | Question | Decision | Where |
|---|----------|----------|-------|
| Q1 | Verbals as `verb` children vs. standalone `verbal` base | **Children of `verb`** — textbook "verb forms" framing; each `desc` names its function to offset the risk. | §1c |
| Q2 | Group the objects under a parent? | **Yes — new `object` base** parents direct/indirect/object-of-preposition; parts layer reads as subject/predicate/object/complement. | §1b, §2a |
| Q3 | Phrase grouping | **Group verbal phrases only** under a `verbal-phrase` base; other five stay flat. | §2c |
| Q4 | Abbreviation uniqueness | **Not a constraint** — abbrs already repeat across families (`prop`, `dem`, `poss`) and are disambiguated by color/position. Just pick legible ones when coding. | — |
| Q5 | Ship Advanced labels vs. gate them | **Tag `tier` on every label now** (data); build an Essential-only palette filter as Tier 1.5. | §1e, Tier 1.5 |

No open questions remain. §1a and §1b landed 2026-07-20; §1c, §1d, and §1e
landed 2026-07-21, completing Tier 1.
