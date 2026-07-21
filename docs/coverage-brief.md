# Grammar Lab — Coverage Brief

**Purpose:** This document is a complete, authoritative inventory of the grammar
labels the app currently supports. It is written for a reviewer (human or AI)
whose job is to **find gaps** — categories a comprehensive English-grammar
curriculum would include that are missing, under-divided, or mislabeled here.

**Source of truth:** All labels live in a single file, [`js/labels.js`](../js/labels.js),
as the `GL.LABELS` object (span labels) and `GL.SENTENCE_TYPES` object
(whole-sentence badges). Nothing else defines the taxonomy; there is no
enable/disable flag, so every entry listed below is live and selectable.

## Structure of the taxonomy

Every label also carries a **tier** — `"essential"` or `"advanced"` — marking
whether it belongs to the classroom-core set. Four labels are currently Advanced
(`object-complement`, `particle`, `relative-adverb`, `emphatic-pronoun`); the
other 83 are Essential. Only Advanced labels are written out in `labels.js`; the
normalization pass gives children their parent's tier and defaults everything
else to Essential, so `GL.LABELS[id].tier` is always populated. A per-lesson
**"Essential only"** toggle narrows the editor palette to the Essential set;
it never hides an already-placed annotation, so **every label listed below is
live and selectable** with the toggle off (the default).

Labels are organized into **four layers**, ordered smallest unit → largest.
Every layer now uses the same **parent → child drill-down**: a base label (e.g.
`noun`, `subject`, `dependent-clause`) can be applied directly, or drilled down
to a subtype (e.g. `proper-noun`, `simple-subject`, `noun-clause`) that inherits
its layer — and its color, unless it sets a shade of its own so the variants of
a family stay distinguishable in a rendered diagram.

| Layer id | Name | Unit | Families (base labels with subtypes) |
|----------|------|------|--------------------------------------|
| `pos` | Parts of Speech | word | Noun, Verb, Adjective, Adverb, Pronoun, Conjunction, Determiner |
| `part` | Sentence Parts | group of words | Subject, Predicate, Object, Complement |
| `phrase` | Phrases | phrase | Verbal Phrase |
| `clause` | Clauses | clause | Dependent Clause |

Bases with no subtypes (Preposition, Interjection, Appositive, Noun Phrase,
Independent Clause, …) sit alongside the families as lone buttons — flat entries
are still normal, they just no longer make a whole *layer* flat.

Separately, `SENTENCE_TYPES` classifies a whole sentence on two axes
(Structure, Purpose) shown as badges — not span labels.

---

## Layer 1 — Parts of Speech (9 base, 45 subtypes = 54)

Advanced labels are marked ⚑.

- **Noun** — Common, Proper, Collective, Abstract, Concrete, Possessive
- **Verb** — Action, Linking, Helping (Auxiliary), Transitive, Intransitive, Modal, Regular, Irregular, Gerund, Participle, Infinitive, Particle ⚑
- **Adjective** — Descriptive, Proper, Demonstrative, Possessive, Quantity/Number, Comparative, Superlative
- **Adverb** — Manner, Time, Place, Frequency, Degree, Relative ⚑
- **Pronoun** — Personal, Possessive, Reflexive, Relative, Demonstrative, Interrogative, Indefinite, Emphatic ⚑
- **Preposition** — *(no subtypes)*
- **Conjunction** — Coordinating, Subordinating, Correlative
- **Determiner** — Article, Definite Article, Indefinite Article
- **Interjection** — *(no subtypes)*

Gerund, Participle, and Infinitive are the **word-level verbals** — the verb
form itself. They sit under Verb because that is how textbooks introduce them,
but each names the job it actually does (gerund → noun, participle → adjective,
infinitive → noun/adjective/adverb). They are distinct from the same-named
*phrases* in Layer 3, which cover the verbal plus its objects and modifiers.

## Layer 2 — Sentence Parts (5 base, 14 subtypes = 19)

- **Subject** — Simple, Complete, Compound, Understood
- **Predicate** — Simple, Complete, Compound
- **Object** — Direct Object, Indirect Object, Object of the Preposition
- **Complement** — Subject Complement (Predicate Nominative, Predicate Adjective), Object Complement ⚑
- **Appositive** — *(no subtypes)*

The Understood Subject is the unwritten "(you)" of an imperative; since it has no
tokens of its own, the label goes on the word it commands. Appositive is a flat
single-word part, distinct from the Appositive Phrase in Layer 3.

## Layer 3 — Phrases (6 base, 3 subtypes = 9)

- **Verbal Phrase** — Gerund, Infinitive, Participial
- Noun, Verb, Prepositional, Appositive, Absolute — *(no subtypes)*

Verbal Phrase groups the three phrases built on a verb form. Note the deliberate
asymmetry with Layer 1: the *word-level* verbals sit under **Verb**, not under a
`verbal` base — each grouping was chosen on its own merits, not for cross-layer
symmetry.

## Layer 4 — Clauses (2 base, 3 subtypes = 5)

- **Dependent Clause** — Relative (Adjective), Adverbial, Noun
- Independent Clause — *(stands alone, no subtypes)*

## Whole-sentence badges

- **Structure:** Simple, Compound, Complex, Compound-Complex
- **Purpose:** Declarative, Interrogative, Imperative, Exclamatory

**Totals:** 87 span labels across 4 layers (83 Essential, 4 Advanced) + 8
sentence-type badges.

---

## Known thin spots (starting points for the gap review)

These are already visible to us; the reviewer should confirm and extend, not
stop here.

- **Preposition** has no subtypes (e.g. simple vs. compound/phrasal; time/
  place/direction sub-classing exists for adverbs but not prepositions).
- **Interjection** has no subtypes.
- **Phrase and Clause layers are shallow** — one family each (Verbal Phrase,
  Dependent Clause) and the rest flat bases, versus seven families in the POS
  layer. Whether the remaining flat bases (e.g. Prepositional Phrase, Absolute
  Phrase) *want* subtypes is an open question for the reviewer. (They were
  entirely flat before Tier 2; see [`roadmap.md`](roadmap.md).)
- **Verb** has no coverage of tense/voice/mood or finite vs. non-finite.
  (Word-level gerund/participle/infinitive and regular vs. irregular were added
  in Tier 1c/1d; tense, aspect, voice, and mood are deliberately out of scope —
  see Tier 3c in [`roadmap.md`](roadmap.md).)
- No labels for **articles as their own POS** (they sit under Determiner) or
  **numerals** — reviewer should judge whether that matches the intended
  curriculum level.

## What "finding gaps" should mean here

1. Missing categories a standard K–12 / ESL grammar scope would expect.
2. Base parts of speech that should have subtypes but don't (and vice versa —
   over-granular entries).
3. Inconsistencies between layers (e.g. concepts present as a phrase but absent
   as a word-level or sentence-part label).
4. Overlaps or ambiguous boundaries between existing labels.

The reviewer does **not** need to read the whole codebase — `js/labels.js` is
the complete and only taxonomy definition.

---

## Appendix — machine-readable label list

For programmatic diffing, the full label set is exported alongside this brief,
generated directly from `js/labels.js` (not hand-transcribed):

- [`coverage-labels.json`](./coverage-labels.json) — every span label with
  `id`, `layer`, `parent`, `name`, `abbr`, `color`, `tier`; plus sentence-type
  badges and per-layer/per-tier counts.
- [`coverage-labels.csv`](./coverage-labels.csv) — the same span labels as a
  flat table (`layer,id,parent,name,abbr,color,tier`).
- [`product/grammar-reference.md`](./product/grammar-reference.md) — the same
  taxonomy written out for teachers, with every definition and example.

All three are generated from `js/labels.js`. Regenerate them with:

```
node tools/gen-docs.js          # write them
node tools/gen-docs.js --check  # CI form: fail if any is stale
```

(This replaces the `node -e '…'` one-liner these exports used to be built with.
The full change loop for a taxonomy edit is in
[`project/taxonomy-workflow.md`](./project/taxonomy-workflow.md).)

**Snapshot counts:** 87 span labels (POS 9 base + 45 subtypes; Parts 5 + 14;
Phrases 6 + 3; Clauses 2 + 3), of which 83 Essential / 4 Advanced, and 8
sentence-type badges.
