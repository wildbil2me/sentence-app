---
status: doing   # todo | doing | done
created: 2026-07-22
---

# Presentation UI remediation — make Present behave like a slide deck

This is the standalone worker handoff for
[`docs/ui-audit-0.1.0.md`](../docs/ui-audit-0.1.0.md). A worker should be able to
start here without the conversation that produced the audit.

The release decision is simple: **do not tag `v0.1.0` until the P0 work and the
viewport acceptance matrix in this order pass.** The current roadmap says the
release is ready to tag; the later UI audit supersedes that claim.

> **Implementation status (2026-07-22).** Tasks A–F are implemented. The
> **automated** gate is green — all repo logic checks plus the browser DOM check
> (now driving the real Present/Quiz views, checks 9–10) report **0 failed** at
> 1280×720, 1366×768, 1920×1080, and 1024×768 in headless Edge. Per-item outcomes
> are in the audit's "As remediated" table
> ([docs/ui-audit-0.1.0.md](../docs/ui-audit-0.1.0.md)); UI-6/UI-10 are deferred to
> [plans/006](006-palette-scale-followup.md) / [plans/007](007-editor-navigation-followup.md).
> This order stays `doing` until the **manual** cross-browser matrix below
> (Firefox, Safari/iPad, Fullscreen, 125%/150% zoom, touch, light/CB-safe/reduced
> motion) is walked and recorded — that is the remaining gate before `done`.

## Table of contents

1. [Worker start here](#worker-start-here)
2. [Why this work exists](#why-this-work-exists)
3. [Scope and priority](#scope-and-priority)
4. [Required reading order](#required-reading-order)
5. [File-by-file reading map](#file-by-file-reading-map)
6. [Implementation order](#implementation-order)
7. [Design contract and fixed decisions](#design-contract-and-fixed-decisions)
8. [Verification matrix](#verification-matrix)
9. [Documentation and close-out](#documentation-and-close-out)
10. [Done when](#done-when)

## Worker start here

1. Set this file's `status` to `doing` before editing code.
2. Read the files in the [required reading order](#required-reading-order). Do
   not start by changing margins in CSS; the failure is an unbounded layout
   hierarchy, not a spacing defect.
3. Reproduce the failure with the built-in **Dracula — The Count Appears**
   lesson, sentence 2, all four layers shown, and Key open.
4. Take a baseline at 1280×720 and record:
   `document.documentElement.scrollHeight/clientHeight`, stage bounds, nav
   bounds, and whether Key/explanation is inside the viewport.
5. Implement Tasks A–F in order. Keep each task independently reviewable when
   practical.
6. Run the logic checks and the full browser matrix. A screenshot that looks
   plausible is not a substitute for the bounds assertions.
7. Update the DOM map and roadmap in the same change as the implementation.
8. Set this file to `done` and move it to `plans/done/` only after every required
   gate is green.

Repository rules remain binding: no build step, package, dependency, module,
network call, absolute shipped path, or taxonomy/lesson-format change. Preserve
the ES5 house style (`var`, `function`, one IIFE per file).

## Why this work exists

Present currently behaves as a vertically growing document. The real dense
fixture overflows at 1280×720, 1366×768, 1024×768, and even 1920×1080. Three
causes combine:

- Present uses `min-height` below global page chrome, so no ancestor actually
  bounds the flexible stage.
- hidden annotation layers use `visibility: hidden` and reserve their completed
  diagram height even in the clean sentence state;
- Key and explanation are siblings after the growing stage, so their buttons
  can look active while the result is below the viewport.

This is a `0.1.0` blocker because presenting annotated sentences is a core
teacher workflow. Study Focus, printable assignments, and PowerPoint/Slides
export all depend on first deciding how one sentence fits one screen.

## Scope and priority

### Release-blocking in this order

| Audit item | Required outcome |
|---|---|
| UI-1, P0 | Present owns a fixed available viewport; the page never scrolls at supported presentation sizes. |
| UI-2, P0 | The clean sentence does not reserve hidden annotation lanes. Progressive reveals remain stable after breakdown begins. |
| UI-3, P0 | Key and explanation open inside the viewport with correct focus entry/restore. |
| UI-4, P1 | Present uses the safe viewport width rather than a 1280px content cap. |
| UI-5, P1 | Programmatic route focus remains accessible without drawing a page-sized default outline. |
| UI-7, P1 | Every Practice question/result render establishes a sensible focus target. |
| UI-8, P1 | Short landscape and tablet/projector layouts have explicit policies. |

### Complete if they remain small; otherwise create follow-up orders

- UI-6: replace the 87-label continuous palette with a layer-first surface,
  then add search/recent/repeat-last only as separate post-0.1 work.
- UI-9: enlarge the sentence-dot **hit area** and improve accessible/current
  labels without making the visual dot large.
- UI-10: sticky Editor controls/sentence navigation are useful but do not block
  this release. Create a follow-up plan rather than expanding this work order.

### Explicitly out of scope

- Study Focus/mode selection, Question Sets, worksheets, printing, `.pptx`, and
  Google Slides export. They follow this foundation; they are not part of it.
- Taxonomy, label ids, lesson JSON, persistence, import/export, or sample content
  changes.
- A visual rebrand. Retain the current colors, cards, typography, and themes.
- Silent font scaling below the current projector floor. Present tokens currently
  bottom out at 24px; do not make dense content “fit” by making it unreadable.
- Rewriting the shared renderer solely for Present. Change it only if the caller
  cannot express the clean/breakdown phases through its existing options.

## Required reading order

Read in this order because later files assume the earlier constraints:

1. [`CLAUDE.md`](../CLAUDE.md) — read completely. It is the repository contract,
   especially `file://`, no dependencies, check commands, and DOM-map upkeep.
2. [`docs/ui-audit-0.1.0.md`](../docs/ui-audit-0.1.0.md) — read completely. Treat
   the findings and viewport matrix as the problem statement.
3. [`docs/project/architecture.md`](../docs/project/architecture.md) — read the
   constraints, file map, rendering, routing, and quiz sections; skim taxonomy.
4. [`docs/project/dom-structure.md`](../docs/project/dom-structure.md) — read the
   Sentence grid, popover, Present, and Quiz sections. This describes the
   generated DOM that the CSS depends on.
5. [`index.html`](../index.html), then [`css/styles.css`](../css/styles.css) —
   establish the page-height chain before reading view code.
6. [`js/display.js`](../js/display.js), then [`js/render.js`](../js/render.js) —
   follow one Present render from view construction through grid reservation and
   layer toggling.
7. [`js/app.js`](../js/app.js), [`js/editor.js`](../js/editor.js), and
   [`js/quiz.js`](../js/quiz.js) — only after the core Present flow is understood.
8. [`tools/dom-check.html`](../tools/dom-check.html),
   [`tools/dom-check-report.js`](../tools/dom-check-report.js), and
   [`docs/project/testing.md`](../docs/project/testing.md) — understand the real
   full-app harness and its PowerShell capture rules before adding checks.
9. [`docs/roadmap-0.1.0.md`](../docs/roadmap-0.1.0.md) — read its status, P4, DoD,
   and “As built” sections. They document already-landed accessibility work and
   contain the release-ready statement this audit supersedes.

## File-by-file reading map

“How to read” is intentionally specific. It keeps the worker in the relevant
code paths and prevents a UI fix from becoming a model rewrite.

| File | Why it matters | How to read it | Expected edit |
|---|---|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Non-negotiable architecture and checks. | Read top to bottom once. Re-read “Checks” before close-out. | Only if a hard-won test instruction changes. |
| [`docs/ui-audit-0.1.0.md`](../docs/ui-audit-0.1.0.md) | Source findings, evidence, and acceptance intent. | Read completely; use UI-1…UI-10 as traceability ids. Do not treat unverified Safari/Fullscreen states as passed. | Add an “As remediated” note only after verification; do not rewrite the original evidence. |
| [`docs/code-audit-0.1.0.md`](../docs/code-audit-0.1.0.md) | Broader release context. | Read the release blockers and simplification sections only. Its already-remediated code findings are not a second task list. | None unless the UI work changes one of its conclusions. |
| [`docs/roadmap-0.1.0.md`](../docs/roadmap-0.1.0.md) | Currently claims blockers are cleared. | Read lines around Status, P4, §5, and both “As built” notes. Preserve history; append a correction rather than deleting prior notes. | Mark UI remediation as the current gate, then record final evidence/counts. |
| [`docs/project/architecture.md`](../docs/project/architecture.md) | Explains load order, renderer, routes, and no-build limits. | Read constraints and the rendering/routing/quiz sections. Ignore stale line counts; names and responsibilities matter. | Only if responsibility or dependency direction changes. |
| [`docs/project/dom-structure.md`](../docs/project/dom-structure.md) | Canonical hand-maintained DOM map. | Read Sentence grid → popover → Present → Quiz. Compare it to the live DOM before editing. | Required for changed trees, classes, `data-*`, roles, or attributes; CSS-only changes need no DOM-map edit. |
| [`docs/project/testing.md`](../docs/project/testing.md) | Manual and browser check procedure. | Read DOM check, manual pass, and browser sections. The stable contract is **0 failed**, not an exact pass count. | Add the presentation viewport matrix if it becomes a lasting release check. |
| [`index.html`](../index.html) | The height chain begins at `html/body` and includes skip link, sticky topbar, `#app`, toast host, and footer. | Read the entire small file. Trace every body child and script load order. | Probably none; prefer route classes over moving global markup. |
| [`css/styles.css`](../css/styles.css) | Owns the unbounded shell and all presentation sizing. | First read root tokens and `html/body`; then `.topbar`, `#app`, `.appfoot`; then sentence-grid sizing/`.gl-hidden`; then the complete Present section; finally all media/reduced-motion rules. Search for every selector before changing it. | Yes: route shell, viewport grid, wide/short breakpoints, contained panel, focus treatment, hit areas. |
| [`js/display.js`](../js/display.js) | Constructs Present, owns state, calls the renderer, opens Key/explanation, handles navigation/fullscreen. | Read completely. Trace `renderStage()` → `renderSentence()` → `applyVisible()` and all paths that show/hide panels. Note cleanup listeners. | Yes: phase/reservation choice, panel placement/state/focus, shell class lifecycle, accessible nav labels if needed. |
| [`js/render.js`](../js/render.js) | Shared grid computes wrapping/lanes and implements reserved hidden rows. | Read `renderSentence()` from options through `layout()` and `setLayers()`; then read `ResizeObserver`. Read `attachSelection()` only to avoid regressing it. | Prefer none. If changed, prove Editor and Quiz still render/select correctly and update DOM map. |
| [`js/app.js`](../js/app.js) | Routing replaces `#app`; `focusView()` causes the intrusive fallback outline. Also owns cleanup registration. | Read `onViewCleanup`, `runCleanups`, `focusView`, and `route`; then inspect theme/palette boot code only for route-class interactions. | Yes: intentional programmatic-focus style/target and, if chosen, Present route class cleanup. |
| [`js/editor.js`](../js/editor.js) | The open palette is the UI-6 scaling problem. | Read editor header construction and `openPalette()` through its focus trap/MutationObserver cleanup. Preserve its dialog semantics, focus trap, and restore behavior from the completed a11y work. | Limited: layer-first palette navigation and explicit close, if kept in this order. |
| [`js/quiz.js`](../js/quiz.js) | `view.innerHTML` replacements remove the focused Next button between questions. | Read `renderSetup()`, `startQuiz()`, `renderQuestion()`, `finishQuestion()`, and `renderResults()` as one state machine. Do not alter question generation. | Yes: focus the new question/results heading with `preventScroll`; preserve live feedback. |
| [`js/examples.js`](../js/examples.js) | Holds the dense regression fixture. | Search for `buildDracula`; read that builder and registry entry only. Use it unchanged. | No. A layout that only passes after simplifying the fixture fails. |
| [`js/labels.js`](../js/labels.js) | Explains why the palette has 87 labels. | Do not read/edit the taxonomy for this task. Use its public helpers already consumed by Editor. | No. |
| [`js/tokenize.js`](../js/tokenize.js), [`js/store.js`](../js/store.js) | Logic/model layers protected from DOM access. | Do not inspect unless a failing existing test points there. | No. |
| [`tools/dom-check.html`](../tools/dom-check.html) | Full-app browser harness, despite older descriptions that called it renderer-only. | Read the top comment, script order, `check()`/`finish()`, and async runtime section. Add assertions through the real Present/Quiz views; do not duplicate their DOM construction. | Yes: bounds, overflow, clean/breakdown, panel, focus, nav labeling. |
| [`tools/dom-check-report.js`](../tools/dom-check-report.js) | Safely parses only `#result`. | Read completely; never grep the raw browser dump. | Usually no. |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Shows Linux Chrome invocation and permanent gates. | Read the `dom-check` job. Remember local Windows and CI URLs differ. | Only if the harness needs a stable `--window-size`; keep CI dependency-free. |
| [`plans/done/004-finish-0.1.0-a11y-closeout.md`](done/004-finish-0.1.0-a11y-closeout.md) | Records why route, palette, Quiz, and Present accessibility code exists. | Read Tasks A/B and Notes only. It is historical intent, not current source truth. | No. Do not undo its keyboard/focus/live-region remediation. |

Source-of-truth precedence when descriptions disagree:

1. current running behavior and current source;
2. `CLAUDE.md` hard constraints;
3. this order's fixed decisions and acceptance criteria;
4. the UI audit's evidence;
5. architecture/DOM/testing docs, which must be corrected if stale;
6. completed plans, which are historical.

## Implementation order

### Task A — Reproduce and correct release status

1. Set this plan to `doing`.
2. In `docs/roadmap-0.1.0.md`, append a dated note that the later UI audit
   supersedes “ready to tag”; do not erase the earlier close-out history.
3. Open `index.html` through `file://`, load the Dracula example, go to Present,
   choose sentence 2, show all layers, and open Key.
4. Record baseline viewport/bounds values at 1280×720. Confirm UI-1/UI-2/UI-3 in
   current code before changing it.

If the failure no longer reproduces, stop and document the source/commit that
already fixed it, then run the entire matrix rather than reimplementing it.

### Task B — Give Present a real viewport shell (UI-1, UI-4, UI-8)

Files: `css/styles.css`, `js/app.js` and/or `js/display.js`; possibly `index.html`.

- Add a route-scoped state (class or equivalent) that can style `html/body`,
  `#app`, topbar, and footer while Present is active. Remove it through existing
  view cleanup so other routes retain normal document scrolling.
- Make the presentation shell use the **available** dynamic viewport height and
  `overflow: hidden`. Account explicitly for retained topbar height; hide the
  general footer in Present.
- Remove Present's 1280px maximum and use a safe viewport inset.
- Make `.view-present` a bounded grid/flex column and give the stage row
  `minmax(0, 1fr)`/`min-height: 0`. The stage, not the page, owns any last-resort
  overflow.
- Add a short-landscape policy (`max-height: 800px`) and a projector/tablet
  policy (around `max-width: 1100px`). Keep the phone layout usable, but do not
  use its document-scroll fallback for the supported presentation matrix.
- Verify route-away cleanup, theme changes, resize, and Fullscreen API state.

Do not use fixed pixel arithmetic that assumes one browser chrome height. Prefer
CSS layout with `100dvh` and bounded flexible tracks; include a sensible `100vh`
fallback if needed.

### Task C — Separate clean sentence from breakdown (UI-2)

Files: `js/display.js`; touch `js/render.js` only if its current options cannot
express the policy.

Use the existing layer controls as the phase transition; do not add a new data
field or lesson mode:

- **Clean sentence:** when no layers are visible, render with no hidden lane
  reservation. Natural line spacing is more important than zero movement when
  leaving this phase.
- **Breakdown:** when the first layer becomes visible, establish the reserved
  diagram using the lesson's layers. Further reveal/hide actions inside the
  breakdown remain stable.
- “Hide all” returns to the clean sentence phase.

It is acceptable for the clean→breakdown transition to recompose the slide.
It is not acceptable for every individual layer reveal within breakdown to
jump unpredictably. Keep the current 24px minimum Present token size. If the
dense breakdown still cannot fit, provide an explicit, labelled Full size/
scroll or continuation state; never silently shrink below the floor.

### Task D — Put Key and explanations inside the slide (UI-3)

Files: `js/display.js`, `css/styles.css`, and `docs/project/dom-structure.md`.

- Move Key and explanation into one viewport-contained panel host: right drawer
  on wide viewports, bounded bottom sheet/overlay on short ones.
- Only one panel is active at a time. Opening an explanation may replace Key.
- Give the panel an accessible heading and explicit Close button.
- On open, focus the panel heading or Close button with `preventScroll`.
- On close, restore focus to the exact Key button, annotation, type badge, or
  note chip that opened it, when that node still exists.
- Escape closes the panel. Route change and sentence change close it safely.
- The panel may scroll internally, but its bounds and close control stay inside
  the viewport.

Update the DOM map in the same commit because this changes element ownership and
focus semantics.

### Task E — Close the related P1 interaction gaps

#### Programmatic view focus (UI-5)

Keep focus landing after route swaps. Add a real Editor heading (visually hidden
if appropriate) or an intentional programmatic target, and suppress the outline
only for `tabindex="-1"` programmatic headings/containers. **Do not remove
`:focus-visible` from buttons, links, tokens, palette options, or other controls.**

#### Practice focus (UI-7)

After `renderQuestion()` and `renderResults()` replace `view.innerHTML`, focus
the new prompt/results heading with `{ preventScroll: true }` and a safe fallback.
Preserve the existing feedback live region and Next-button focus while feedback
is visible.

#### Palette scale (UI-6, bounded version)

If kept in this order, make the first palette surface layer-first and reveal one
layer's parent/subtype groups at a time. Preserve `role=dialog`, `aria-modal`,
group labels, Tab trap, Escape/outside dismissal, and focus restoration. Add an
explicit Close button to the trap order. Search/recent/repeat-last are follow-up
features, not release scope.

#### Present navigation targets (UI-9)

Keep the visible dots small but give each button at least a 40×40 CSS hit area,
an accessible label, and `aria-current="true"` on the current sentence. Ensure
the larger targets do not create a new overflow problem.

### Task F — Add regression checks before polishing

Files: `tools/dom-check.html`, possibly `.github/workflows/ci.yml`, and
`docs/project/testing.md`.

Add checks against the actual app-generated Present/Quiz DOM for:

- no document vertical or horizontal overflow in Present;
- Present view, stage, nav, layer controls, and open panel within viewport bounds;
- clean state has no reserved `.gl-hidden` annotation rows;
- breakdown state renders the expected layers and remains bounded;
- Key and explanation are visible within the viewport when active;
- panel focus entry, Escape close, and focus restoration;
- every sentence dot has a label and the current one has `aria-current`;
- Practice question-to-question and results focus targets;
- route-away removes the Present shell state and restores ordinary page scroll.

The harness already loads `app.js`, `display.js`, and `quiz.js`; use those real
views. Do not add a second hand-built “Present fixture” that can drift away from
production. Use async frames/timeouts where ResizeObserver/layout must settle.
Continue to call the existing `finish()` exactly once.

If reliable viewport sizing cannot be created inside the existing DOM dump
harness, run it once per viewport with browser `--window-size` and document the
commands. Do not add a package or browser-test dependency.

## Design contract and fixed decisions

The implementation must uphold this invariant:

> At supported presentation sizes, the document itself never scrolls. Header,
> reveal controls, current slide, sentence navigation, and any open Key or
> explanation remain inside the viewport.

Conceptual layout:

```text
Present route shell: block-size: 100dvh; overflow: hidden
├─ retained global topbar (compact) or route-hidden topbar       auto
└─ #app / .view-present                                         minmax(0, 1fr)
   ├─ title + actions                                           auto
   ├─ reveal controls                                           auto
   ├─ stage + sentence navigation                               minmax(0, 1fr)
   └─ panel host (drawer/sheet overlay, internally bounded)     overlay
```

Fixed decisions for this order:

- Present may have different shell rules from authoring pages.
- The footer is hidden in Present.
- No visible layers means **clean sentence**; first reveal enters **breakdown**.
- Key/explanation is a drawer/sheet/overlay, never a normal-flow block below the
  stage.
- Use nearly all safe viewport width.
- 24px is the Present token readability floor for this pass.
- The page does not scroll in supported Present sizes. Any overflow fallback is
  explicit and stage/panel-local.
- Fullscreen and windowed Present share the same fit/content policy.
- Existing keyboard selection, palette modal semantics, Quiz feedback live
  region, and Present slide live region are regression-protected behavior.

If a fixed decision proves impossible, document measured evidence and obtain a
maintainer decision before substituting a materially different UX.

## Verification matrix

### Automated checks

Run all repository checks from `CLAUDE.md`:

```powershell
node tools/smoke-test.js
node tools/gen-docs.js --check
node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md docs/project/lesson-json.md
node tools/cvd-check.js --check
node tools/cvd-check.js --palette=cbSafe --check
```

Run `node --check` on every changed JavaScript file. `smoke-test.js` regenerates
`samples/`; inspect and commit only legitimate generated changes (none are
expected for this UI-only order).

Run the browser DOM check using the exact PowerShell `Start-Process -Wait
-RedirectStandardOutput` procedure in `CLAUDE.md`. Parse with
`tools/dom-check-report.js`; never grep the raw dump. The required result is
**0 failed**. Record the observed pass count without treating it as a fixed
contract.

### Required presentation sizes

Use the Dracula lesson, sentence 2, and test both the clean state and all layers
shown with Key/explanation:

| Viewport | Required | Notes |
|---|---|---|
| 1280×720 | Yes | Primary 720p projector gate. |
| 1366×768 | Yes | Common classroom laptop/projector gate. |
| 1920×1080 | Yes | Confirms wide space is actually used. |
| 1024×768 | Yes | Tablet/older projector landscape gate. |

At every size assert both
`scrollHeight <= clientHeight` and `scrollWidth <= clientWidth` on the document,
allowing at most a 1px rounding tolerance. Record panel/nav/stage bounding rects.

### Manual interaction/browser pass

- Current Edge or Chrome and Firefox on desktop.
- Safari on an iPad in landscape when available; record it as **not verified**,
  not passed, if hardware is unavailable.
- Windowed and Fullscreen API modes.
- 100%, 125%, and 150% browser zoom. At high zoom, an explicit bounded fallback
  is acceptable; disappearing controls/page scroll are not.
- Dark/light themes, default/CB-safe palettes, and reduced motion.
- Keyboard only: route entry, reveal controls, sentence navigation, Key,
  explanation open/close/restore, and Practice question transitions.
- Touch: sentence navigation, panel close, and palette choice where hardware is
  available.
- Route Present → Library → Editor and confirm normal page scrolling and footer
  return outside Present.

Also perform the full lesson loop in `docs/project/testing.md` to ensure the UI
shell work did not break Edit, Practice, export, or import.

## Documentation and close-out

In the implementation change:

1. Update `docs/project/dom-structure.md` for the panel host, focus attributes,
   sentence-dot attributes, Editor heading, palette structure, or Quiz heading
   changes.
2. Update `docs/project/testing.md` with any lasting viewport command/matrix and
   keep its description of the full-app DOM harness accurate.
3. Append **As remediated** to `docs/ui-audit-0.1.0.md`, mapping each UI id to:
   fixed, deferred with plan link, or intentionally accepted. Include browsers/
   sizes actually verified.
4. Update `docs/roadmap-0.1.0.md`: only restore “ready to tag” after all P0 gates,
   required desktop viewports, automated checks, and manual keyboard pass are
   complete. Preserve earlier As-built history and append the correction.
5. If UI-6 or UI-10 is deferred, create a small numbered follow-up work order;
   do not leave an unowned “later” bullet.
6. Set this plan to `done` and move it to `plans/done/` with the implementation.

## Done when

- Present has no page-level vertical or horizontal scrollbar at 1280×720,
  1366×768, 1920×1080, or 1024×768 in clean and dense breakdown states.
- Title/actions, reveal controls, stage, previous/next, and sentence selector are
  visible and operable throughout.
- The clean sentence has natural wrapping with no hidden annotation-lane gaps.
- Progressive layer reveals are stable after breakdown begins.
- Key and every explanation remain within the viewport, take focus on open,
  close with button/Escape, and restore focus to their trigger.
- Dense content stays at or above the 24px token floor or enters an explicit,
  bounded fallback state.
- Windowed/Fullscreen and supported responsive layouts follow the same policy.
- Programmatic route focus is useful but not visually page-sized; normal keyboard
  focus remains visible.
- Practice focuses each new prompt/results heading without losing feedback
  announcements.
- Sentence selectors have large hit targets, accessible labels, and current state.
- Required automated checks and browser DOM checks report green/0 failed.
- Manual matrix results are recorded honestly, including any unavailable Safari,
  Fullscreen, zoom, or touch checks.
- DOM/testing/audit/roadmap documentation matches the shipped behavior.
- No taxonomy, label id, lesson format, persistence, or sample-content change was
  introduced.

## Notes

- The dense example is a regression fixture, not an edge case to simplify.
- Prefer computed/bounds assertions over screenshots; use screenshots as review
  evidence, not the pass/fail oracle.
- If implementation needs to split because UI-6 or UI-10 expands, finish the P0
  presentation gate first and create numbered follow-up plans. Do not let Editor
  polish delay the slide contract.
- When complete: set `status: done` and move this file to
  `plans/done/005-presentation-ui-remediation.md` in the same commit.
