---
status: done   # todo | doing | done
created: 2026-07-22
---

# Finish 0.1.0 — P4 a11y sweep + roadmap close-out

Closes the last open items in [docs/roadmap-0.1.0.md](../docs/roadmap-0.1.0.md):
the two remaining **P4** boxes (keyboard/focus, ARIA), the **§5 Definition of
Done** (checkboxes + the "As built" section), and the decided-but-undone **Q3**
doc relabel. Everything here is additive and format-safe — no taxonomy or
lesson-format change, format stays `version: 1`.

Bundled as one order because finishing P4 is exactly what unblocks the DoD
checkboxes and the "As built" note; they share one browser DOM-check pass.

## Why

- **Keyboard/focus.** [`route()`](../js/app.js#L333-L346) replaces `#app`'s
  contents wholesale and `window.scrollTo(0,0)`, but never moves focus. After
  every navigation, focus falls back to `<body>`, so a keyboard or screen-reader
  user is dumped at the top of the document and must re-tab into the new view.
  This is the P4 "confirm focus lands somewhere sensible" gap.
- **ARIA.** 52 aria/role attributes already exist, but concentrated in the
  toggles and Present mode. No deliberate pass has been done on the two richest
  interactive surfaces — the editor's **label palette popover** and the **quiz**
  — where correct/selected state is currently conveyed by color/position alone.
- **Close-out.** The roadmap's §5 still has three unchecked boxes and an empty
  "As built" placeholder; Q3 (relabel "pilot/frozen" → "open alpha") is decided
  but the language still lives in [CLAUDE.md](../CLAUDE.md) and
  [pilot.md](../docs/product/pilot.md).

The good news: the app already contains the correct pattern to copy.
`wjt.confirmDialog` ([app.js:57](../js/app.js#L57), [app.js:62](../js/app.js#L62))
moves focus **in** on open and **restores** it on close, and the quiz already
`.focus()`es its Next button ([quiz.js:240](../js/quiz.js#L240)). Mirror those;
don't invent a new mechanism.

## Scope

Keep the ES5 house style (`var`, `function`, one IIFE). No new dependency, no
network, all relative paths. `store.js`/`labels.js`/`tokenize.js`/`examples.js`
stay DOM-free — **this work touches only `app.js`, `editor.js`, `quiz.js`,
`display.js`, `render.js`, CSS, and docs**, none of the four sandboxed files.

### Task A — Focus management on view swaps (P4, box 1)

**[js/app.js](../js/app.js) `route()` ([app.js:333](../js/app.js#L333)).** After
the view function has painted `#app`, move focus to the new view's primary
heading so AT and keyboard users start at the top of the *content*, not the page
chrome.

- Give each view's top-level heading a programmatic focus target. The least
  invasive route: after the `wjt.views.*` call in `route()`, find the first
  `h1`/`h2` inside `#app`, set `tabindex="-1"` on it if not already set, and
  `.focus({ preventScroll: true })` it. `route()` already `scrollTo(0,0)`s, so
  keep the scroll and suppress the focus-scroll to avoid a double jump.
- `route()` currently `return`s the view call directly
  ([app.js:341-345](../js/app.js#L341-L345)); refactor so the focus step runs
  after dispatch (e.g. drop the early `return`s into a `switch`/assignment, then
  do the focus move once at the end).
- Guard for "no heading found" (defensive; every view has one today) — fall back
  to focusing `#app` itself with `tabindex="-1"`.
- Add a **skip-to-content** affordance only if it's cheap: a visually-hidden
  "Skip to content" link as the first child of `body` in
  [index.html](../index.html) that targets `#app`. Nice-to-have; drop it if it
  complicates the focus move.

*Do not* trap focus in a whole view — this is about *landing* focus, not
trapping. Trapping is Task B, and only for the modal palette popover.

### Task B — ARIA on the palette popover + quiz (P4, box 2)

**Palette popover — [js/editor.js](../js/editor.js) `openPalette()`
([editor.js:367](../js/editor.js#L367)).** It builds a floating `div.palette` of
`.palette-label` buttons via `wjt.showPopover` and already has
dismiss-on-outside/Escape wiring ([editor.js:434-472](../js/editor.js#L434-L472)).
Make it a real modal picker:

- `role="dialog"` + `aria-modal="true"` + `aria-label` naming the target span
  (the `palette-target` text) on `div.palette`.
- Move focus to the first `.palette-label` when it opens; **trap** Tab within the
  popover while open; restore focus to the annotated span on close (mirror
  `confirmDialog`). The Escape/dismiss path already exists — hang the restore off
  it.
- The label buttons are grouped by layer ([editor.js:400](../js/editor.js#L400))
  — expose the groups with `role="group"` + `aria-label={layer name}` so a
  screen reader announces which layer a label belongs to.

**Quiz — [js/quiz.js](../js/quiz.js).**

- The feedback region ([quiz.js:216](../js/quiz.js#L216),
  `data-role="feedback"` `hidden`) is populated after each answer. Give it
  `role="status"` / `aria-live="polite"` so correct/incorrect + explanation is
  announced, not just shown.
- Correct/incorrect on the `.quiz-option` buttons ([quiz.js:256](../js/quiz.js#L256),
  [:285](../js/quiz.js#L285)) is color-only today. After answering, set
  `aria-pressed`/`aria-label` (e.g. append " — correct answer" / " — your
  choice, incorrect") so the outcome isn't lost without color. The buttons are
  already real `<button type=button>` — keep that.
- Wrap the answer options in `role="group"` + `aria-label` echoing the prompt.

**Present mode — [js/display.js](../js/display.js).** Already carries 12
aria/role refs incl. the Tier-A Key legend. **Audit only**; add label/`aria-live`
gaps if the slide-change announcement is missing, but don't rework it.

Keep additions to attributes and small helpers — no structural DOM rewrite.
Where a rendered element tree, class, or `data-*` changes, update
[dom-structure.md](../docs/project/dom-structure.md) in the same change (Task D).

### Task C — Close out the roadmap (§5 + Q3)

- **Tick §5** in [docs/roadmap-0.1.0.md](../docs/roadmap-0.1.0.md): P1–P4
  complete, "all checks green / DOM check honestly reported", and write the
  **"As built"** section (the house convention — note anything that diverged:
  the focus-landing approach chosen, any surface where ARIA was deliberately left
  minimal, and the DOM-check count delta).
- **Q3 relabel** (decided in §3, still open): replace the "pilot / frozen"
  framing with "open alpha" in **[CLAUDE.md](../CLAUDE.md)** ("## The pilot"
  section) and **[docs/product/pilot.md](../docs/product/pilot.md)**.
  **Verify first** — commit `6001ce5` did an "Alpha rebrand"; confirm what it
  already covered and only change what's still stale, so this doesn't re-do
  landed work.

### Task D — Verify + DOM map

- Run the full check bar (below). `smoke-test` regenerates `samples/` — commit
  any diff (should be none; no model change).
- Run the **browser DOM check** (see CLAUDE.md for the exact Edge headless
  invocation and the four silent-failure gotchas). Baseline is **245/0**; adding
  `role`/`aria-*`/`tabindex` attributes and a focus target **will move the pass
  count** — that's expected here. Confirm **0 failed**, sanity-check the new
  count, and update the baseline note in the roadmap.
- Update [dom-structure.md](../docs/project/dom-structure.md) for any changed
  element tree / attributes (palette popover dialog semantics, quiz option/
  feedback roles, any skip link).

## Out of scope (recorded, not forgotten)

- Full WCAG 2.1 AA conformance audit / contrast re-tuning — CVD work already
  shipped (Tiers A/B); a formal audit is a post-1.0 concern.
- Any taxonomy or lesson-format change (frozen for the pilot).
- The 0.2.0 student-as-creator pivot and a server/backend — explicitly §4
  out-of-scope for 0.1.0.
- Automated a11y testing (axe, etc.) — would need a dependency/build; violates
  the no-build constraint. Manual + DOM-check only.

## Done when

- `node tools/smoke-test.js` → **All checks passed** (and `samples/` committed if
  regenerated).
- `node tools/gen-docs.js --check`,
  `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`,
  `node tools/cvd-check.js --check`, and
  `node tools/cvd-check.js --palette=cbSafe --check` all pass.
- Browser DOM check: **0 failed**, count updated in the roadmap.
- **Keyboard walkthrough (open `index.html` from `file://`):** Tab from a cold
  load reaches the primary content; navigating Home → Library → editor →
  present → quiz lands focus on each view's heading (not `<body>`); the palette
  popover traps Tab, closes on Escape, and returns focus to the span; the quiz is
  fully operable by keyboard and a screen reader hears correct/incorrect without
  relying on color.
- roadmap-0.1.0.md §5 fully ticked with an "As built" section; Q3 language
  relabeled in CLAUDE.md + pilot.md.
- Report results honestly — a red check or a focus that lands on `<body>` is not
  "done."

## Notes

- **Copy, don't invent:** `wjt.confirmDialog` ([app.js:44-65](../js/app.js#L44-L65))
  is the reference for focus-in / trap / restore; the quiz Next-button `.focus()`
  ([quiz.js:240](../js/quiz.js#L240)) is the reference for post-render focus.
- `wjt.onViewCleanup` ([app.js:107](../js/app.js#L107)) runs on the next
  `route()` — use it to tear down any Tab-trap key handler the palette adds, so
  listeners don't leak across views.
- This may split naturally into two commits (A+B a11y code, C+D docs/close-out)
  or land as one — judgment call at commit time.
- When finished: set `status: done` and `git mv plans/004-finish-0.1.0-a11y-closeout.md
  plans/done/` in the same commit as the work.
