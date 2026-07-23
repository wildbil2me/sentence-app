# UI audit: presentation readiness before 0.1.0+

**Audit date:** 2026-07-22  
**Scope:** Library, Editor, label palette, Present, and Practice, with emphasis on
whether Present behaves like a slide deck under realistic annotation density.  
**Verdict:** **The visual system is coherent, but Present is not yet a dependable
slide surface.** Its current layout is a vertically growing web page. Fixing that
should be a `0.1.0` release gate, before Study Focus, worksheets, or presentation
exports are added.

## Method and test matrix

The audit used the real application modules and the built-in Dracula lesson: two
long, complex sentences with 73 annotations across all four layers. The denser
second sentence has 24 parts-of-speech annotations, 11 sentence-part annotations,
4 phrases, and 3 clauses. This is a valid stress case, not pathological data: the
product explicitly teaches overlapping grammatical layers.

Captured in Edge from `file://` with isolated storage:

| Surface/state | Viewports |
|---|---|
| Present, all layers hidden | 1366×768 |
| Present, dense second sentence, all layers shown + Key on | 1280×720, 1366×768, 1920×1080, 1024×768 |
| Present, explanation requested | 1366×768 |
| Editor, dense lesson | 1366×768 |
| Editor, full label palette open | 1366×768 |
| Practice setup and live question | 1366×768 |
| Library | 1366×768 |

The preferred interactive browser connection was unavailable in the workspace
sandbox, so actual Fullscreen API behavior, Firefox, Safari/iPad, touch gestures,
and the light theme were not visually verified. Those remain part of the proposed
acceptance matrix.

## What is already working

- The visual language is consistent across modes: cards, pills, annotation
  colors, typography, and primary actions feel like one product.
- The token renderer wraps at word boundaries and preserves readable annotation
  alignment. Dense diagrams remain understandable when their rows are visible.
- Practice setup is clear and fits comfortably at 1366×768. A live “find” question
  also fits without crowding.
- The recently added keyboard selection path is present in the live UI: tokens
  use roving focus, arrow navigation, Shift+Arrow selection, and Enter/Space to
  commit ([`render.js:665`](../js/render.js#L665)).
- The Editor clearly exposes sentence structure, purpose, note, sentence actions,
  and annotation layers in one card.
- The 1024-pixel-wide Present header still keeps its primary actions available.

These are strong foundations. The principal problem is containment, not a need
for a new visual identity.

## Findings at a glance

| ID | Severity | Finding |
|---|---|---|
| UI-1 | **P0** | Present has no fixed viewport contract; the document scrolls vertically at every tested size, including 1920×1080 |
| UI-2 | **P0** | Hidden layers reserve their full final height, producing large blank gaps and overflow before anything is revealed |
| UI-3 | **P0** | Key and explanation content is appended below the growing stage, so an active control can appear to do nothing |
| UI-4 | **P1** | Present is capped at 1280px, wasting large displays and forcing additional line wraps and vertical growth |
| UI-5 | **P1** | Programmatic route focus draws intrusive browser outlines, including a near-page-sized outline in Editor |
| UI-6 | **P1** | The label palette is a 87-label vertical catalogue; at 1366×768 only the POS section is initially visible |
| UI-7 | **P1** | Practice transitions replace focused DOM without establishing a new focus target |
| UI-8 | **P1** | Responsive Present has only a phone breakpoint; projector/tablet widths receive the same desktop layout |
| UI-9 | **P2** | Present sentence dots and several icon-only actions have small or weakly explained targets |
| UI-10 | **P2** | Long Editor lessons lack a compact sticky authoring toolbar or sentence navigator |

## Detailed findings

### UI-1 — Present is a document, not a slide

Every Present capture showed a page-level vertical scrollbar. The bottom of the
dense sentence was below the viewport at 1280×720, 1366×768, 1024×768, **and
1920×1080**. The 1920×1080 result is especially decisive: this is not merely a
small-screen breakpoint problem.

The CSS explains the behavior:

- `#app` retains normal document padding and Present only changes its maximum
  width and bottom padding ([`styles.css:171`](../css/styles.css#L171),
  [`styles.css:894`](../css/styles.css#L894)).
- `.view-present` uses `min-height`, not a height constrained by the available
  viewport ([`styles.css:896`](../css/styles.css#L896)). It can therefore grow to
  its contents.
- `.present-main` and `.stage` are flexible, but there is no bounded ancestor
  height for them to shrink within ([`styles.css:923`](../css/styles.css#L923)).
- `.stage { overflow: auto }` cannot take ownership of overflow while its flex
  ancestors are free to expand ([`styles.css:925`](../css/styles.css#L925)).
- The global top bar, `#app` padding, Present minimum height, and footer all add
  to the document height.

This should be treated as a layout architecture bug. Adjusting a few margins will
only move the threshold to the next complex sentence.

### UI-2 — Stability is purchased with unusable blank space

Present builds every layer's rows even when all layers are hidden. The hidden
elements use `visibility: hidden`, so their grid tracks remain
([`render.js:78`](../js/render.js#L78), [`styles.css:619`](../css/styles.css#L619)).

That prevents annotations from shifting when a layer is revealed, but the clean
initial sentence is laid out as if the complete diagram were already visible.
In the 1366×768 capture, two wrapped lines of plain text were separated by roughly
the height of every hidden annotation lane. The second line landed close to the
bottom of the viewport, before a single layer was turned on.

The no-shift goal is sensible, but reserving the final diagram inside the clean
sentence slide is the wrong tradeoff. Use distinct presentation phases:

1. a naturally wrapped **Sentence** slide with no reserved annotation rows;
2. a **Breakdown** slide that establishes the diagram layout;
3. progressive layer reveals inside that bounded diagram layout.

Study Focus will also help by reserving only the lesson's intended layers, but it
will not replace the need for a viewport policy.

### UI-3 — Key and explanation are outside the visible interaction

The Key and explanation `<aside>` are siblings placed after `.present-main`
([`display.js:48`](../js/display.js#L48)). Because the stage grows with the dense
diagram, both panels land below it. With Key visibly active, no legend appeared
inside the viewport. Requesting an annotation explanation likewise produced no
visible panel in the captured slide.

This is a direct-control failure: the button state changes, but the result may be
offscreen. A presenter should never need to hunt down the page for an explanation.

Make these viewport-contained surfaces:

- a right-side drawer on wide displays;
- a bounded bottom sheet on shorter displays;
- or an overlay card anchored inside the stage.

Opening one should move focus to its heading/close control and closing it should
restore focus to the triggering annotation.

### UI-4 — Large projectors are artificially narrowed

Present increases `#app` from 1060px to only 1280px
([`styles.css:894`](../css/styles.css#L894)). At 1920×1080, hundreds of horizontal
pixels remain unused while the sentence wraps into additional vertical lines.
Those extra lines multiply phrase/clause continuations and annotation lanes.

Present should use nearly the full safe viewport width, with a modest edge inset.
Authoring pages can keep their readable content maximum; a projection surface has
different requirements.

### UI-5 — Route focus is visually overpowering

After each route, the app focuses the first `h1`/`h2`; Editor falls back to
focusing the entire `#app` container ([`app.js:386`](../js/app.js#L386)). Default
browser focus styling produced:

- a strong rectangular outline around Present and Practice titles;
- a tight outline around the Library section heading;
- a large outline around almost the entire Editor application.

Moving focus after a view swap is correct for assistive technology. The visual
treatment needs to be intentional. Give each view a real, possibly visually
hidden, primary heading and style the programmatic `tabindex="-1"` focus target
without the giant default outline. Do not remove visible focus from controls
reached through keyboard navigation.

### UI-6 — The palette does not scale to the taxonomy

The open palette occupied most of the viewport height. Parts of Speech alone
filled the initial view; Sentence Parts, Phrases, and Clauses required scrolling
through the same long panel. The selected word remained behind the palette, but
the choice surface dominated the authoring context.

Recommended progression:

1. Study Focus limits the relevant layers for a lesson.
2. Use layer tabs or a layer-first step instead of one continuous catalogue.
3. Add search, recent labels, and “repeat last label.”
4. Keep the existing parent/subtype grouping inside the selected layer.
5. Add an explicit close control and visible result count.

This is the highest-value Editor improvement before worksheets or slide export,
because every downstream artifact depends on efficient lesson authoring.

### UI-7 — Practice needs focus management inside the view

`route()` focuses the setup heading, but starting a quiz and advancing questions
replace `view.innerHTML` without another route. `renderQuestion()` and
`renderResults()` do not establish a new entry focus target
([`quiz.js:195`](../js/quiz.js#L195), [`quiz.js:360`](../js/quiz.js#L360)). The Next
button is focused when feedback appears, which is good, but clicking it removes
that focused element during the next render.

After every question/result render, focus the question heading or results heading
with `preventScroll`, and announce the new question count. This also makes the UI
feel more stable for keyboard users.

### UI-8 — Responsive strategy skips classroom widths

The only Present-specific breakpoint is `max-width: 640px`, where the app
deliberately returns to document scrolling ([`styles.css:1147`](../css/styles.css#L1147)).
There are no dedicated rules for 720p projectors, 1024px tablets, or short
landscape viewports—the most important presentation environments.

Add breakpoints based on both width and height, for example:

- short landscape: `max-height: 800px`;
- tablet/projector: `max-width: 1100px`;
- phone authoring: the existing narrow layout.

Prefer container/available-stage measurements over a large set of device-specific
exceptions.

### UI-9 and UI-10 — Secondary polish

- Sentence dots are visually 11×11px ([`styles.css:996`](../css/styles.css#L996)).
  Preserve the small dot but give each button a substantially larger hit target
  and an explicit accessible label/current state.
- Library export/duplicate/delete and some close actions rely heavily on symbols.
  A labelled overflow menu would be clearer on touch devices.
- Long Editor lessons become a sequence of very tall cards. A compact sticky
  lesson toolbar, sentence navigator, and per-layer preview controls would reduce
  repeated scrolling without changing the data model.

## Proposed Present-mode contract

Present should have a testable invariant:

> At supported presentation sizes, the document itself never scrolls. Header,
> controls, current slide, navigation, and any open Key/explanation remain inside
> the viewport.

Suggested structure:

```text
presentation shell: height: 100dvh; overflow: hidden
├─ compact title/actions row                       auto
├─ reveal controls                                auto
├─ stage + navigation                             minmax(0, 1fr)
└─ bounded drawer/overlay host                    auto or overlay
```

Implementation direction:

- Add a route-level Present class to `body`/`html` and make the Present `#app`
  fill the remaining viewport below any retained top bar.
- Hide the general footer in Present and decide whether the general top bar is
  useful teaching chrome or should collapse into the presentation header.
- Remove the 1280px cap for Present; use viewport-relative side insets.
- Give `.view-present` an explicit available height and `.present-main` a
  `minmax(0, 1fr)` track so `.stage` can actually own overflow.
- Treat internal scrolling as a last-resort **Full size** option, not the default.
- Implement a fit policy: wrap → reduce diagram gaps/padding → scale to a defined
  projector-readable minimum → split into continuation slides or warn the author.
- Do not silently reduce text below the chosen readability floor.

## Release acceptance criteria

Before calling the presentation UI complete:

1. At 1280×720, 1366×768, 1920×1080, and 1024×768, Present has no page-level
   vertical or horizontal scrollbar.
2. Previous/next controls and layer controls remain visible at every point.
3. The clean sentence state uses natural line spacing, not hidden-lane gaps.
4. Key and every explanation open inside the viewport and receive/restores focus.
5. Dense built-in examples either fit above the readability floor or enter an
   explicit continuation/overflow state.
6. Windowed and Fullscreen modes obey the same content policy.
7. Repeat in current Edge/Chrome and Firefox, plus Safari on an iPad in landscape.
8. Repeat at 100%, 125%, and 150% browser zoom and with reduced motion enabled.
9. Add browser checks for document overflow, stage bounds, focus targets, and
   panel visibility; screenshot comparison alone is not sufficient.

## Recommended sequence after this audit

1. Finish the data-safety remediation already underway.
2. Rebuild Present around the viewport contract above.
3. Fix route/question focus treatment and palette scale.
4. Run the release acceptance matrix and tag `0.1.0` only when it passes.
5. Add Study Focus—the first feature that improves both authoring and
   presentation density.
6. Build one curated Question Set model and use it for interactive Practice and
   printable assignments.
7. Add `.pptx` export after the in-app presentation layout is stable; otherwise
   the export will encode unresolved slide-composition decisions.

The complex examples should remain in the test set. They are doing exactly what
good fixtures should do: exposing that the current layout succeeds as a document
renderer but not yet as a slide engine.

## As remediated (2026-07-22)

Implemented per [plans/005-presentation-ui-remediation.md](../plans/005-presentation-ui-remediation.md).
The original evidence above is preserved unchanged.

| ID | Status | Notes |
|---|---|---|
| UI-1 | **Fixed** — but see [revision 2](#as-built-revision-2-2026-07-22--ui-1s-hard-lock-is-superseded) and [revision 3](#as-built-revision-3-2026-07-23--the-stage-owns-the-scroll-again) | Present is a `100dvh` grid shell (`auto auto minmax(0,1fr)`) that route-scopes via `:has(.view-present)`, hides the topbar/footer, and locks `html`/`body` to `overflow:hidden`. The stage owns any overflow; the page never scrolls. **Superseded (rev 2):** the hard lock trapped long sentences in an inner stage scroller and masked a wrapping bug, so the page scrolled instead. **Revised again (rev 3):** with the wrapping bug fixed at its source, the scroll moved back into `.stage` — but bounded per-card and gutter-reserved, not a `body` lock. |
| UI-2 | **Fixed** | Clean phase reserves nothing (`reserve: visible`) → natural wrap, no hidden lanes; the first reveal enters breakdown (`reserve: lesson.layers`). The 0↔N crossing rebuilds; reveals within breakdown stay in-place. |
| UI-3 | **Fixed** — extended in [revision 3](#as-built-revision-3-2026-07-23--the-stage-owns-the-scroll-again) | Key and explanations share one bounded, in-viewport `.present-panel` (drawer ≥1025px, bottom sheet ≤1024px). Opens with focus on its heading, closes on ✕ / Escape / sentence / route change, restores focus to the trigger. **Rev 3:** the ≥1025px drawer is now pinned open on an idle hint rather than appearing and disappearing. |
| UI-4 | **Fixed** | 1280px cap removed; Present uses `padding: 18px clamp(16px,3vw,48px)`. |
| UI-5 | **Fixed** | Editor gained a visually hidden `h1`; programmatic `tabindex="-1"` focus loses only its default outline (`:not(:focus-visible)`), control focus rings intact. |
| UI-6 | **Deferred** | The palette is already layer-grouped one level deep; tabs/search/recent/repeat-last are a follow-up order ([plans/006](../plans/006-palette-scale-followup.md)), not a release blocker. |
| UI-7 | **Fixed** | `renderQuestion()`/`renderResults()` focus the new heading with `preventScroll`; the question count is announced via `aria-describedby`. Existing Next-button focus + feedback live region preserved. |
| UI-8 | **Fixed** | Added `max-height:800px` (short landscape) and `max-width:1100px` (tablet/projector) policies; the panel switches to a bottom sheet ≤1024px; the phone `≤640px` path still document-scrolls. |
| UI-9 | **Fixed** | Sentence dots keep the 11px visual (a pseudo-element) but carry a 40×40 hit target, `aria-label`, and `aria-current`. |
| UI-10 | **Deferred** | Sticky Editor toolbar / sentence navigator is a follow-up order ([plans/007](../plans/007-editor-navigation-followup.md)); never a P0/P1 blocker. |

**Verified.** Automated: all repo logic checks + the browser DOM check (checks
9–10 drive the real Present/Quiz views) report **0 failed** at 1280×720, 1366×768,
1920×1080, and 1024×768 in headless Edge. **Not yet verified** (manual pass still
owed before tagging `0.1.0`): Firefox, Safari/iPad landscape, Fullscreen API,
125%/150% zoom, touch, and light theme / CB-safe palette / reduced-motion sweeps.

### As built, revision 2 (2026-07-22) — UI-1's hard lock is superseded

The UI-1 fix above locked the page outright, so a breakdown taller than the
viewport had nowhere to go but `.stage`'s own scrollbar. In use that read as
broken: long sentences got trapped in an inner scroller. Worse, the lock hid a
real wrapping bug — `computeLines()` decided line breaks from **token widths
alone**, but a span bar carries its label's full *name* and the grid's
`max-content` columns grow to fit it, so a line the estimate thought fit rendered
past the edge and scrolled **sideways in silence** (`.gl-grid` hides its
scrollbar). Long sentences ran off instead of spilling over.

Superseding decision (maintainer, 2026-07-22): **a slide that fits still never
scrolls; a long one spills onto more lines and then scrolls the _page_.** The
inner stage scroller is gone.

| Change | Where |
|---|---|
| Wrapping is a two-stage fit: estimate from token widths, then lay out and **measure**, re-breaking any `.gl-grid` that still overflows. Each pass settles the leftmost bad line and re-flows the rest, so leftover tokens rejoin the next line instead of being orphaned. | `js/render.js` (`layoutFitted`/`refineOverflow`) |
| Shell is `min-height:100dvh` with a `minmax(min-content,1fr)` stage row: fits → fills and centres, nothing to scroll; taller → the **page** scrolls. `.stage` is `overflow:visible`. | `css/styles.css` |
| Explicit `minmax(0,1fr)` **column** + `min-width:0` on `.present-main`. Without them a non-scrolling stage reports the whole unwrapped sentence as its min-content width, widening the shell and handing the renderer a bogus available width — nothing would ever wrap. | `css/styles.css` |
| `.present-nav` is absolutely positioned within `.present-main`. The rail is one dot per sentence, so it is intrinsically taller than the slide on a long lesson; out of the height math, only the **stage** decides whether the page grows. | `css/styles.css` |
| Fullscreen keeps `100dvh` but uses `overflow:auto` so a too-tall breakdown can't be clipped. | `css/styles.css` |

**Regression guard.** `tools/dom-check.html` gained a *wrap stress* fixture (short
tokens under wide `Prepositional Phrase` bars) asserting no multi-token line
overflows, plus a check that the stage never becomes its own scroll container.
Confirmed to have teeth: with the fit refinement disabled it fails at 115px
overflow. **285 passed, 0 failed** at all four matrix sizes. The manual
cross-browser pass above is still owed.

### As built, revision 3 (2026-07-23) — the stage owns the scroll again

Revision 2 gave the page back its scrollbar for two reasons. One was taste (an
inner scroller read as "trapping" long sentences); the other was a real bug —
`computeLines()` estimated line breaks from token widths alone, so lines ran off
sideways *inside* the scroller, in silence. **The second reason is gone:** the
renderer now lays out and measures (`layoutFitted`/`refineOverflow`), and the
wrap-stress check measures `.gl-grid` overflow directly, so it keeps its teeth
whether or not `.stage` scrolls.

That leaves the taste call, and in use the page-scroll model has its own cost: a
long breakdown scrolls the *chrome* away — the layer chips, the Key drawer and
the sentence rail all leave the screen exactly when a teacher is mid-reveal.

Decision (maintainer, 2026-07-23): **the stage card scrolls, the page never
does** — but bounded per-card, not by locking `body`, and with the gutter
reserved so the renderer can't be lied to about its width.

| Change | Where |
|---|---|
| Shell is `height:100dvh; overflow:hidden` with a `minmax(0,1fr)` stage row, so the row is bounded by what's left under the header/controls. Fits → still centred like a slide (`justify-content: safe center`); taller → `.stage` scrolls (`overflow:auto`) and the chrome stays put. | `css/styles.css` |
| `.stage { scrollbar-gutter: stable }`. Load-bearing, not cosmetic: `computeLines()` measures the stage's `clientWidth`, so a scrollbar that appears only *after* layout would make every line ~15px too wide. | `css/styles.css` |
| Fullscreen matches the windowed model (`overflow:hidden`, stage scrolls). | `css/styles.css` |
| The ≥1025px drawer is **pinned open**: idle it shows `Label details` over the slide's own info (see the follow-up below) + "Click a label to see more." (`showSlideInfo()`); `closePanel()` returns it there instead of hiding, and the ✕ is hidden because there is nothing to close *to*. Breakpoint state lives in `pinnedMq`/`isPinned()`/`syncPinned()`, re-settled on `change`. ≤1024px keeps the on-demand bottom sheet — pinning an overlay would cover half the slide. | `js/display.js` |
| Side effect worth having: because the drawer is always in flow, the stage width no longer changes when a label is clicked, so the sentence never re-wraps mid-lesson (measured: 735.0px before and after opening the Key at 1280×720). | — |
| `.present-nav` width is pinned (`--nav-w: 48px`) and `.present-main`'s reserved `padding-right` is `calc(var(--nav-w) + 16px)`, so the panel→rail gutter equals the stage→panel flex `gap`. Measured 16.00 / 16.00 at 1280×720 and 1920×1080 (it was ~10px against 16px). | `css/styles.css` |
| **Bug found while verifying:** `.btn`'s own `display` beats the UA's `[hidden]{display:none}`, so a script-hidden button still painted — the drawer's ✕ did, and so would `⛶ Full screen` on a browser without the Fullscreen API. Added `.btn[hidden]{display:none}` (the same reason `.present-panel[hidden]` already existed). | `css/styles.css` |

**Regression guard.** The old "stage never becomes its own scroll container"
check is inverted — the stage must stay *within the viewport* while
`noDocScroll()` still passes, which is the new contract. The panel checks now
assert its resting state for the breakpoint (hint-visible vs hidden), that it
takes no focus on first render, and that the ✕'s *computed display* matches
(the `hidden` property alone couldn't see the bug above). **288 passed, 0
failed** at 1280×720, 1024×768, 1366×768 and 1920×1080.

**Not verified headlessly:** headless Edge draws zero-width overlay scrollbars
(measured: reserved gutter 2px = the borders only, with `scrollbar-gutter`
computing as `stable`), so the space-taking-scrollbar path — the one
`scrollbar-gutter` exists for — needs the manual desktop-browser pass that is
already owed above.

#### Driving the real screen (2026-07-23) — three of rev 3's own bugs, and the aside earns its keep

Rev 3 was verified by checks that passed while the screen was wrong. Presenting
with it found four things; all are folded into rev 3 rather than a rev 4, since it
had not shipped.

| Found | Cause | Fix |
|---|---|---|
| **The stage never scrolled at all.** A breakdown taller than the slide was clipped by the shell's `overflow:hidden` with no way to reach it — the exact failure the revision existed to prevent. | Source order, not a missing rule. The shell sets `.stage{overflow:auto}` inside `@media (min-width:641px)`; the base `.stage` rule *later in the file* still ended `overflow:visible`. A media query adds no specificity, so the later rule won at every desktop size. | `overflow` removed from the base rule; the phone's `visible` model declared in the `<=640px` block where it belongs. |
| **↓ Next was clipped off the bottom of the rail** on any lesson with enough dots to outgrow it — the presenter's main control, gone. | `.present-nav` itself was the scroller, so the buttons scrolled with the dots. | Only `.dots` scrolls (`flex:1 1 auto; min-height:0; overflow-y:auto`); Prev/Next are `flex:none` at the rail's ends. Declared on the *base* `.dots` rule — putting it in the shell block hit the same source-order trap, and did, once. |
| **The rail arrows sat against the left edge** of their track. | Rev 3's own `.present-nav .btn-big{width:100%}`. `.btn` is an inline-flex box that never sets `justify-content`, which is invisible until a button is stretched. | `justify-content:center` on the rail buttons. |
| The stage was a mouse-only scroller (WCAG 2.1.1), because ↑/↓ are captured for paging. | — | `.stage` is `tabindex="0" role="group"` with a focus ring; `onKey()` lets ↑/↓ through to native scrolling while the stage *itself* holds focus and actually overflows. `=== stageEl`, not `contains`, so tabbing to a label inside it still pages. |

**And the drawer earned its keep.** With the drawer pinned open it was idling on a
one-line hint while the stage — the thing a projector should maximise — spent three
bands of vertical room on chrome. "Sentence i of N", the type badges + 📌 note chip,
and the reveal tip moved into the aside: the counter as a permanent strip above the
heading (so it survives an open explanation), the badges and tip as the drawer's
idle body, replaced when a label is clicked. Below 1025px, where the panel is a
sheet that is `hidden` while idle, they stay in the stage — `placeSlideInfo()` moves
one set of long-lived nodes between the two homes on the `pinnedMq` change. The
stage now holds the sentence and nothing else.

**Regression guards, this time with teeth.** Verified by reintroducing each bug and
watching the check go red: the stage's computed `overflow-y` matches the
breakpoint, and a stage capped to 90px must actually take a `scrollTop` (the old
`inViewport(stage)` check passed straight through the clipping bug); Prev and Next
must each sit fully inside the rail's bounds; the rail buttons' computed
`justify-content`; `stage.tabIndex`; and that the slide info is in exactly one
home for the breakpoint — drawer or stage, never both, checked at rest and after a
dismiss. **297 passed, 0 failed** at 1280×720, 1024×768, 1366×768 and 1920×1080,
plus a screenshot pass at 1440×900 (pinned) and 900×700 (unpinned).
