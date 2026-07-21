# Changing the taxonomy

Adding, renaming, reparenting, or retiring a grammar label. This is the most
common change to Sentence Forge and the one with the most places to keep in sync,
so it gets its own page.

The app is entirely data-driven off [`js/labels.js`](../../js/labels.js). Almost
every taxonomy change is **a data edit with no code change** — the palette,
renderer, quiz, and exports all derive from that one object. If you find yourself
editing `editor.js` to add a label, stop and re-read
[architecture.md](architecture.md#the-taxonomy).

## The loop

```bash
# 1. edit the data
$EDITOR js/labels.js

# 2. regenerate everything derived from it
node tools/gen-docs.js

# 3. run the logic checks (this also rewrites samples/)
node tools/smoke-test.js

# 4. check the rendering
start tools/dom-check.html      # or open it however you like
```

Then, by hand:

5. Update [`docs/coverage-brief.md`](../coverage-brief.md) — the per-layer lists
   and the counts in the layer table, the layer headings, and the **Totals** line.
6. Update the label list in
   [`docs/custom-gpt-instructions.md`](../custom-gpt-instructions.md) so
   generated lessons can use the new label.
7. Commit `samples/` along with everything else — the smoke test regenerates it,
   and CI fails if it's stale.

## Anatomy of a label

```js
"proper-noun": {
  parent: "noun",            // omit for a base label
  name: "Proper Noun",       // shown in the palette and in quiz options
  abbr: "prop",              // shown in the chip/bar when space is tight
  desc: "Names a specific person, place, or thing — always capitalized.",
  example: "<b>London</b> sits on the <b>Thames</b>.",
  tier: "advanced",          // omit for essential
  color: "#f5a623",          // omit to inherit the parent's
  layer: "pos",              // omit on a child to inherit the parent's
},
```

The **normalization pass at the bottom of `labels.js`** fills in `layer`,
`color`, and `tier` from the parent (defaulting `tier` to `"essential"`), so
`wjt.LABELS[id]` always has all three at read time. Only write them out when you
mean to override.

`desc` and `example` use `<b>` for emphasis because they render into the
in-app popover as HTML. `tools/gen-docs.js` converts those to markdown `**` for
the reference doc — so write `<b>`, not `**`.

## Rules the smoke test enforces

- **The tree is exactly one level deep.** A subtype's `parent` must be a base
  label. No grandchildren. If a concept genuinely nests three deep (predicate
  nominative *is a kind of* subject complement), file it as a sibling and explain
  the relationship in its `desc`.
- **Every Advanced label's parent is Essential**, so the Essential-only filter
  can't orphan a subtype.
- **A subtype inherits its parent's layer.** It may override its color.
- **Every label needs a valid tier.**

## Choosing a color

A label with a `parent` and no `color` inherits the parent's, which is usually
right — the family reads as one hue. Override it only when the variants need to
be **told apart inside a single diagram**: `simple-subject` vs.
`complete-subject` get their own shades of blue precisely because a teacher
points at the difference between them. The object subtypes share one green
because nobody diagrams a direct and an indirect object in contrast.

## Reparenting is free; renaming an id is not

Annotations store a **label id**. Changing `parent`, `name`, `abbr`, `color`, or
`desc` is safe — every saved lesson keeps working, and only the palette layout
and family grouping change. Both Tier 2 reparentings landed with zero migration
for exactly this reason.

**Renaming or removing an id is a breaking change.** Every lesson in every
teacher's browser that uses it will import with `Skipped unknown label "…"` and
silently lose those annotations. There is no server and no way to migrate them.
Don't rename ids. If a label is wrong, change its `name` and leave the id alone.

## Before you add a label

Check that it isn't already answered:

- [`coverage-brief.md`](../coverage-brief.md) — the complete inventory and the
  known thin spots.
- [`roadmap.md`](../roadmap.md) — what shipped, and the **Tier 3** section, which
  documents four whole categories (punctuation, usage errors, verb
  tense/aspect/voice/mood, Reed–Kellogg vocabulary) as deliberately out of scope
  because each breaks the "every annotation is a span over whole tokens" model.
  A request in one of those areas is a sibling-app idea, not a label.
- [`reference/7-20-findings.md`](../reference/7-20-findings.md) — the external
  gap analysis those decisions respond to.

Then ask the two product questions: does a teacher need to **point at** this on a
projector, and would a student be asked to **identify** it? If not, it may belong
in a `desc` rather than as a label of its own.
