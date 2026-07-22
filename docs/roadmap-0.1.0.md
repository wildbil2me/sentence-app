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

- [x] **Export all lessons** — one JSON containing every lesson, one click from
      the library view. *(`wjt.exportAllLessons()` + Library button — 8739107)*
- [x] **Import all** — accept that bundle back. **Open question Q2** below:
      merge vs. replace. *(`wjt.importBundle()` merges with fresh ids — 8739107)*
- [x] **Guard destructive actions** — confirm before delete/overwrite of a
      lesson; the current model is whole-list `writeAll()`, so a mistaken
      overwrite is unrecoverable. *(save sites guarded with a toast — 8739107)*
- [x] **Handle a `localStorage` write failure** — verify `store.writeAll()`
      behavior when quota is exceeded or storage is disabled; surface a toast
      rather than failing silently. *(`writeAll()` throws `STORAGE_WRITE_FAILED`,
      surfaced as a toast — 8739107)*

*Constraint check:* all client-side, no network, keeps [store.js](../js/store.js)
DOM-free (pure model/JSON work). ✎

### P2 — Land the in-flight rendering fix

There's uncommitted work already: the single-line-flash fix in
[render.js](../js/render.js) (microtask reflow before first paint) plus a
`justify-content` tweak in [styles.css](../css/styles.css). Close it out cleanly
before stacking more on top.

- [x] Verify with the real browser DOM check (healthy run = **238 passed, 0
      failed**) — the microtask path can't be confirmed by the smoke test.
      *(DOM check reported 238/0 at the time; now 245/0 after CVD work.)*
- [x] If the emitted element tree shifted, update
      [dom-structure.md](project/dom-structure.md) in the same change.
- [x] Commit. *(microtask reflow + `justify-content` landed in a614026;
      working tree is clean — no in-flight render work remains.)*

### P3 — Importer robustness *(already spec'd in [to-do.md](../to-do.md))*

Both items are additive/non-breaking and keep [store.js](../js/store.js) DOM-free.

- [x] **Fold smart quotes** in the `match` lookup (to-do item 1) — curly↔straight
      is a 1:1 substitution, so resolved offsets are preserved.
- [x] **Fold Unicode / non-breaking spaces** in the `match` lookup (to-do item 2)
      — ships with item 1.
- [x] **Doc follow-up:** flip the matching gotcha note in
      [lesson-json.md](project/lesson-json.md#L96-L97).
- [x] Leave to-do item 3 (length-changing dashes/ellipsis) **deferred** — it
      needs an offset map, out of scope for 0.1.0.

**As built** (2026-07-22, [plans/done/002-importer-fold.md](../plans/done/002-importer-fold.md)):
a module-local `foldForMatch()` in [store.js](../js/store.js) folds curly single/
double quotes and the Unicode-space family to ASCII, applied to **both sides** of
the `match` lookup only — the stored passage text, tokenizer input, and final
span all keep the untouched original, and every substitution is 1 code unit → 1,
so resolved offsets are preserved. `samples/` regenerated byte-identical,
confirming backward compatibility. Note: the touch point had drifted to
`store.js:168` (not the `store.js:161` cited in to-do.md/this roadmap's source
docs).

### P4 — Edge-case, error-state, and a11y sweep *(do last)*

The "feels unpolished" bucket. Lower risk, best done once the structural items
settle.

- [x] Empty states (no lessons, empty lesson, lesson with no annotations).
      *("No lessons yet" card in Library; empty-lesson card in the editor.)*
- [x] Malformed-import handling — a friendly error, never a silent drop or a
      thrown-and-blank screen. *(import wrapped in try/catch → "Import failed: …"
      toast; "No usable lessons in the file." when a bundle is empty.)*
- [x] Keyboard + focus management on view swaps (`#app` is replaced wholesale;
      confirm focus lands somewhere sensible). *(`route()` now lands focus on the
      new view's `h1`/`h2` — `#app` fallback for the editor; skip-to-content link
      added — [plans/done/004](../plans/done/004-finish-0.1.0-a11y-closeout.md).)*
- [x] ARIA on the interactive surfaces (palette, selection, quiz controls).
      *(Palette popover is now a real `role=dialog`/`aria-modal` modal with a Tab
      trap + focus restore and per-layer `role=group`s; quiz feedback is a
      `role=status` live region, options carry correct/incorrect in their
      accessible name, options wrapped in a labelled group; Present gained a
      slide-change live region.)*

---

## 2. Cross-cutting: checks before landing anything

Per [CLAUDE.md](../CLAUDE.md):

```bash
node tools/smoke-test.js         # logic layer; regenerates samples/ — commit the result
node tools/gen-docs.js --check   # CI form of the doc generator
node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md
node tools/cvd-check.js --check  # color-blind guard: no same-abbr pair collapses
node tools/cvd-check.js --palette=cbSafe --check  # opt-in CB palette: no within-set collapse
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

- [x] P1–P4 items above complete (or explicitly re-deferred with a note here).
- [x] All checks green; browser DOM check honestly reported (see "As built" —
      logic checks green; the live headless dump could not be captured in the
      dev environment, with the reason and the structural argument recorded).
- [x] `0.1.0` recorded wherever the app surfaces a version. **Decided: add a
      footer with the version string** (`wjt.VERSION`), part of P1 —
      [plans/done/001](../plans/done/001-data-durability.md) Task D.
- [x] An **"As built"** section added below, noting anything that diverged from
      this plan — per the house convention, the divergence notes are the valuable
      part.

## As built

_(2026-07-22, [plans/done/004-finish-0.1.0-a11y-closeout.md](../plans/done/004-finish-0.1.0-a11y-closeout.md))_

The P4 a11y sweep, the §5 close-out, and the Q3 relabel landed together, as the
plan anticipated. What diverged or is worth recording:

- **Focus-landing approach.** `route()` was refactored from a chain of early
  `return`s into an if/else dispatch followed by a single `focusView(container)`
  call. `focusView` focuses the first `h1`/`h2` in `#app` with
  `.focus({ preventScroll: true })` (the `scrollTo(0,0)` already ran), setting
  `tabindex="-1"` on it first. **The editor has no `h1`/`h2`** — its title is an
  `<input>`, not a heading — so it takes the documented `#app` fallback rather
  than a heading. Every other view (home `h1`, library/present/quiz `h2`) lands
  on its heading. The skip-to-content link was cheap, so it shipped.
- **Palette popover.** Made a real `role="dialog"` / `aria-modal="true"` picker
  with an `aria-label` naming the target span, per-layer `role="group"`s, a Tab
  trap over the `.palette-label` buttons, and focus-in / restore mirroring
  `wjt.confirmDialog`. Teardown hangs off both the existing dismiss
  `MutationObserver` **and** `wjt.onViewCleanup` (idempotent via a `torn` guard)
  so the trap handler can't leak across a view swap.
- **Quiz.** Feedback region is now `role="status"` + `aria-live="polite"`;
  answered options append " — correct answer" / " — your choice, incorrect" to
  their accessible name so the outcome survives without color; the answers
  container is a `role="group"` labelled from the prompt text.
- **Present mode was audit-only.** The one gap found was the missing
  slide-change announcement, filled with a single persistent `.sr-only`
  `aria-live` region (a sibling of the rebuilt stage) updated in `renderStage()`.
  No rework of the existing 12 aria/role refs.
- **DOM-check count — no delta, and here's why.** The plan expected the pass
  count to move. It doesn't: `tools/dom-check.html` loads only
  `labels/tokenize/store/examples/render/editor.js` — **not** `quiz.js`,
  `display.js`, or `app.js` — and its palette test rebuilds the groups inline
  rather than calling `openPalette`, so none of the changed runtime paths execute
  under it, and `render.js` was untouched. Baseline stays **245/0**. The live
  headless-Edge dump could not be captured in this dev session (an interactive
  Edge session was running, so `--headless --dump-dom` handed off to it and
  emitted an empty dump; killing the user's browser was not acceptable). All
  changed JS passed `node --check`; the logic/doc/CVD checks are green. **Re-run
  the browser DOM check on a machine with no live Edge session before tagging
  0.1.0** to confirm 245/0 empirically.
- **Q3 relabel.** Verified `6001ce5` ("Alpha rebrand") only touched the *UI*
  wordmark/badge, not the docs' freeze framing — so the doc relabel was still
  needed. `CLAUDE.md`'s "The pilot" → "Open alpha" and pilot.md's "What is
  deliberately frozen" → "What stays stable during the alpha" now frame the
  taxonomy/format as *kept additive during the alpha*, with the hard freeze
  reserved for 1.0.0 (the first-real-teacher line), matching §0.
