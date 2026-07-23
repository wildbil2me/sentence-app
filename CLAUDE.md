# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**Sentence Forge** — a build-free vanilla-JS web app where teachers annotate a
paragraph with grammar labels at four layers, then present it or quiz students on
it. ~3,300 lines of JS in nine files, no dependencies, no framework, no build
step, no server.

Start with [docs/project/architecture.md](docs/project/architecture.md). It is
current and it explains the constraints below in detail.

## Hard constraints — don't violate these without asking

1. **No build step, no bundler, no npm dependency, no `package.json`.** Classic
   `<script>` tags under a `wjt` global namespace.
2. **No ES modules.** The app must run from `file://` when a teacher
   double-clicks `index.html` on a school machine; modules are CORS-blocked
   there. Same reason there is **no `fetch()` of local files** — example lessons
   live in `js/examples.js` as JavaScript, not in `samples/` as JSON.
3. **No network calls of any kind** — no CDN, no fonts, no analytics.
4. **Keep `js/labels.js`, `js/tokenize.js`, `js/store.js`, `js/examples.js`
   DOM-free.** `tools/smoke-test.js` runs them in a bare `vm` sandbox; a
   `document` reference in any of the four breaks it.
5. **Every path relative.** Absolute paths 404 under GitHub Pages' `/<repo>/`.
6. **Never rename or remove a label id.** Annotations store ids; a rename
   silently destroys annotations in every teacher's browser, and there's no
   server to migrate. Change `name`, keep the id.
7. **Match the surrounding style**: `var`, `function`, `"use strict"`, one IIFE
   per file. The code is ES5-flavored on purpose.

## Checks — run these, don't skip them

```bash
node tools/smoke-test.js        # logic layer. ALSO REGENERATES samples/ — commit the result
node tools/gen-docs.js          # regenerates coverage-labels.* + product/grammar-reference.md
node tools/gen-docs.js --check  # CI form: fails instead of writing

# any lesson JSON, through the real importer; also scans .md for ```json examples
node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md

node tools/cvd-check.js         # color-blind screen: pairs that collapse under CVD (report)
node tools/cvd-check.js --check # CI form: fails only if a same-abbr pair in one layer collapses
node tools/cvd-check.js --palette=cbSafe --check  # opt-in CB palette gate: fails if ANY
                                #   within-layer/axis pair collapses (report: drop --check)
```

**`tools/dom-check.html`** covers rendering *and* the app runtime (it now boots
the full app — `app.js`/`display.js`/`quiz.js` — against the real page chrome)
and needs a real browser. Run it from **PowerShell**, which waits for the child
process and captures its stdout — the Git-Bash `>` redirect returns an **empty
dump** for this GUI-subsystem process (so does a bare PowerShell pipe):

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$udd  = Join-Path $env:TEMP ("edge-udd-" + [guid]::NewGuid())
$dump = Join-Path $env:TEMP ("dom-" + [guid]::NewGuid() + ".html")
Start-Process -FilePath $edge -Wait -NoNewWindow -RedirectStandardOutput $dump `
  -ArgumentList "--headless=new","--disable-gpu","--no-sandbox",`
  "--virtual-time-budget=8000","--window-size=1280,720","--dump-dom","--user-data-dir=$udd",`
  "file:///C:/dev/sentences/tools/dom-check.html"
node tools/dom-check-report.js $dump
```

Hard-won details, all of which produce a *silent* wrong answer:

- Use **`Start-Process -Wait -RedirectStandardOutput`** (PowerShell). A plain `>`
  from the Bash tool — the method that used to be documented here — now yields a
  zero-byte dump, because msedge detaches from the redirected pipe. Start-Process
  waits for the real child and captures it.
- The URL needs a **Windows-style drive** (`file:///C:/dev/…`). A Git-Bash path
  (`file:///c/dev/…`) loads a browser error page and dumps 300KB of nothing.
- The temporary **`--user-data-dir` is required** or the dump is empty.
- **Never grep the raw dump for `FAIL`.** It contains `dom-check.html`'s own
  inline script, which has the literal strings `PASS`/`FAIL` in it. Use
  `tools/dom-check-report.js`, which reads only the `<pre id="result">` block.

A healthy run reports **0 failed** (the stable contract). The pass *count* is an
implementation detail — it grows as checks are added (currently 282).

Report results honestly. If a check fails, say so with the output; don't
summarize a red run as done.

## Taxonomy changes

`js/labels.js` is the single source of truth for all 87 labels, and the app is
fully data-driven off it — a new label is almost always a **data edit with no
code change**. If you're editing `editor.js` to add a label, you've taken a wrong
turn.

The full loop is [docs/project/taxonomy-workflow.md](docs/project/taxonomy-workflow.md).
Short version: edit `labels.js` → `node tools/gen-docs.js` →
`node tools/smoke-test.js` → then **by hand** update
[docs/coverage-brief.md](docs/coverage-brief.md) (counts and per-layer lists) and
the label list in
[docs/custom-gpt-instructions.md](docs/custom-gpt-instructions.md). Leaving those
two stale is the recurring failure mode in this repo.

Invariants the smoke test enforces: the tree is exactly **one level deep**, a
subtype inherits its parent's layer, and every Advanced label has an Essential
parent.

## Documentation layout

Product and project docs are **separate on purpose** — don't merge them or
cross-post content:

- `docs/product/` — for teachers and product decisions (overview, teacher guide,
  generated label reference, pilot plan).
- `docs/project/` — for whoever changes the code (architecture, lesson-json spec,
  testing, deploying, taxonomy workflow).
- `docs/coverage-brief.md`, `docs/roadmap.md` — taxonomy design records.
- `README.md` — the repo front page. Keep it short and link out; the detail lives
  in `docs/`.

**Generated files — never hand-edit:** `docs/coverage-labels.json`,
`docs/coverage-labels.csv`, `docs/product/grammar-reference.md`, and everything
in `samples/`. Regenerate them.

**Keep the DOM map current.** [docs/project/dom-structure.md](docs/project/dom-structure.md)
is a hand-maintained map of the HTML each view generates. If you change the
rendered structure — the sentence-grid renderer in `js/render.js`, or any view's
element tree, class names, or `data-*`/`--c` conventions — update that doc in the
same change. Nothing regenerates or checks it, so stale is the default failure
mode. Wording/CSS-only tweaks don't count; structural changes do.

## Working style that has worked here

- **Plan in the roadmap before building.** [docs/roadmap.md](docs/roadmap.md) is
  the model: tiered scope, open questions written as numbered Q's with an
  explicit decision and rationale, and an **"As built"** note added afterward
  when the implementation diverged from the plan or revealed something. Keep
  that convention — the divergence notes are the valuable part.
- **Say when scope is wrong.** The roadmap's §0 exists because an external
  analysis recommended work that was already done; correcting the premise was
  worth more than executing the request. Do that.
- **Out-of-scope is a real answer.** Tier 3 documents four whole categories that
  were declined *with reasons* rather than bent into the model. Prefer that to
  a compromise that breaks "every annotation is a span over whole tokens."
- **Verify before claiming.** Run the checks and open the app; don't infer that a
  rendering change worked.
- **Reparenting is free; renaming ids is not.** Both Tier 2 reparentings shipped
  with zero data migration because ids were preserved. Preserve that property.

## Open alpha

The app is in **open alpha** (`0.x`): usable and heading into classroom testing
on GitHub Pages ([docs/product/pilot.md](docs/product/pilot.md)), but not yet
committed to format stability. The hard freeze becomes a promise at **1.0.0 —
the first real teacher** ([docs/roadmap-0.1.0.md](docs/roadmap-0.1.0.md) §0);
until then format changes are still cheap.

Even so, keep the **taxonomy and lesson format additive** during the alpha —
change them only for a real, blocking gap found in a real lesson. A format break
silently destroys prep work that exists only in a teacher's browser and in the
JSON they've exported, and keeps the author's own sample lessons round-tripping.
Bug fixes, wording, and accessibility are always in scope.
