# Sentence Forge — Road to 0.1.0 (Polish Pass)

**Status:** Planned · **Date:** 2026-07-22
**Scope:** Harden the current proof of concept into a coherent, trustworthy
`0.1.0`. Additive and format-safe throughout — no taxonomy or lesson-format
changes. The student-as-creator pivot is deliberately *out* of this milestone
(see [§4](#4-explicitly-out-of-scope-for-010)).

This is the **product / release** roadmap. The taxonomy coverage roadmap
(Tiers 1–3) lives separately in [roadmap.md](roadmap.md) and is unaffected by
this pass.

---

## 0. What `0.1.0` means

The version number encodes *where the app is*, not just a count.

| Version | Meaning | State |
|---|---|---|
| **0.1.0** | Polished proof of concept. This pass. | Open alpha, single user, format changes still cheap. |
| **0.2.0+** | Student-as-creator: students *build, tag, and share* sentences. | The pivot we pinned; a new front door on the existing engine. |
| **1.0.0** | Handed to the first real teacher. | **Format-stability becomes a promise; the freeze becomes real.** Safe to depend on for a semester. |

`0.x` is the honest label for "usable, not yet committed to stability" — which
is exactly open alpha. The load-bearing line isn't *now*; it's **1.0.0 = first
external teacher**, and every breaking change belongs on this side of it.

> **App version vs. lesson-format version.** `0.1.0` is the *app* version. The
> **lesson format stays `version: 1`** ([store.js](../js/store.js)) — nothing in
> this pass changes the on-disk shape. Don't bump the format version; that's a
> 0.2.0-era decision tied to the pivot.

### The bar for 0.1.0

Everything in §1 is **additive and format-safe** on purpose. Even in open alpha
that matters: it keeps the author's own sample lessons round-tripping, and it
means none of this work has to be redone or migrated when real data appears.

---

## 1. Workstreams (in priority order)

### P1 — Data durability *(the biggest "toy" tell; do it first)*

The single thing that most separates "sketchpad" from "tool I trust." Today a
lesson lives only in one browser's `localStorage`; there's no one-click way to
get all of it out, and destructive actions aren't guarded. This is also the
foundation the 0.2.0 sharing work builds on.

- [ ] **Export all lessons** — one JSON containing every lesson, one click from
      the library view.
- [ ] **Import all** — accept that bundle back. **Open question Q2** below:
      merge vs. replace.
- [ ] **Guard destructive actions** — confirm before delete/overwrite of a
      lesson; the current model is whole-list `writeAll()`, so a mistaken
      overwrite is unrecoverable.
- [ ] **Handle a `localStorage` write failure** — verify `store.writeAll()`
      behavior when quota is exceeded or storage is disabled; surface a toast
      rather than failing silently.

*Constraint check:* all client-side, no network, keeps [store.js](../js/store.js)
DOM-free (pure model/JSON work). ✎

### P2 — Land the in-flight rendering fix

There's uncommitted work already: the single-line-flash fix in
[render.js](../js/render.js) (microtask reflow before first paint) plus a
`justify-content` tweak in [styles.css](../css/styles.css). Close it out cleanly
before stacking more on top.

- [ ] Verify with the real browser DOM check (healthy run = **238 passed, 0
      failed**) — the microtask path can't be confirmed by the smoke test.
- [ ] If the emitted element tree shifted, update
      [dom-structure.md](project/dom-structure.md) in the same change.
- [ ] Commit.

### P3 — Importer robustness *(already spec'd in [to-do.md](../to-do.md))*

Both items are additive/non-breaking and keep [store.js](../js/store.js) DOM-free.

- [ ] **Fold smart quotes** in the `match` lookup (to-do item 1) — curly↔straight
      is a 1:1 substitution, so resolved offsets are preserved.
- [ ] **Fold Unicode / non-breaking spaces** in the `match` lookup (to-do item 2)
      — ships with item 1.
- [ ] **Doc follow-up:** flip the matching gotcha note in
      [lesson-json.md](project/lesson-json.md#L96-L97).
- [ ] Leave to-do item 3 (length-changing dashes/ellipsis) **deferred** — it
      needs an offset map, out of scope for 0.1.0.

### P4 — Edge-case, error-state, and a11y sweep *(do last)*

The "feels unpolished" bucket. Lower risk, best done once the structural items
settle.

- [ ] Empty states (no lessons, empty lesson, lesson with no annotations).
- [ ] Malformed-import handling — a friendly error, never a silent drop or a
      thrown-and-blank screen.
- [ ] Keyboard + focus management on view swaps (`#app` is replaced wholesale;
      confirm focus lands somewhere sensible).
- [ ] ARIA on the interactive surfaces (palette, selection, quiz controls).

---

## 2. Cross-cutting: checks before landing anything

Per [CLAUDE.md](../CLAUDE.md):

```bash
node tools/smoke-test.js         # logic layer; regenerates samples/ — commit the result
node tools/gen-docs.js --check   # CI form of the doc generator
node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md
```

Plus the browser DOM check (P2) for anything touching [render.js](../js/render.js).
Report results honestly — a red run is not "done."

---

## 3. Open questions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | Target version for the polish pass? | **`0.1.0`.** | Encodes open-alpha honestly; reserves `1.0.0` for the first-real-teacher / format-stable line. |
| Q2 | "Import all" — merge into existing lessons or replace the whole list? | **Decided: merge with fresh ids.** | `importLesson` already mints new ids, so merge is non-destructive *and* free — no id collisions, no "replace" path to guard. See [plans/001](../plans/001-data-durability.md) Task B. |
| Q3 | Fold the stale "pilot/frozen" language now? | **Decided: relabel to "open alpha" now.** | [CLAUDE.md](../CLAUDE.md) "The pilot" and [pilot.md](product/pilot.md) assert a freeze that protects nobody yet. Docs-only change; its own small work order. |
| Q4 | Promote a general `docs/roadmap.md` and rename the taxonomy one? | **Deferred.** | Would touch CLAUDE.md references; not worth it mid-polish. This file is `roadmap-0.1.0.md` for now. |

---

## 4. Explicitly out of scope for 0.1.0

Parked deliberately, not forgotten:

- **Student-as-creator pivot** (build / tag / share) → **0.2.0**. The engine
  (annotation model, renderer, taxonomy) already supports the *tagging* half;
  what's missing is a feedback model and a sharing seam. The design fork —
  students tag *teacher-provided* sentences (auto-checkable) vs. *their own*
  (needs review) — is unresolved and gates that work.
- **A server / backend** (shared libraries, identity, saved results) → the
  **1.0.0** path. This is where "no network, ever" ([SECURITY.md](../SECURITY.md))
  gets revisited, and it's driven by real demand, not a hunch.
- **Taxonomy Tier 3** (punctuation, usage errors, verb dimensions, diagramming)
  — remains a *sibling-tool* concern per [roadmap.md](roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool).

---

## 5. Definition of done for 0.1.0

- [ ] P1–P4 items above complete (or explicitly re-deferred with a note here).
- [ ] All checks green, browser DOM check at 238/0, honestly reported.
- [ ] `0.1.0` recorded wherever the app surfaces a version. **Decided: add a
      footer with the version string** (`wjt.VERSION`), part of P1 —
      [plans/001](../plans/001-data-durability.md) Task D.
- [ ] An **"As built"** section added below, noting anything that diverged from
      this plan — per the house convention, the divergence notes are the valuable
      part.

## As built

_(added when the work lands)_
