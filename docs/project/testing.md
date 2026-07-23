# Checks

There is no test framework. There are two check suites and a doc generator, all
runnable in under a second, and all wired into CI.

| Command | Covers | Needs |
|---|---|---|
| `node tools/smoke-test.js` | the logic layer — tokenizing, taxonomy invariants, import/export round trips, every built-in example | Node |
| `node tools/gen-docs.js --check` | the generated docs still match `js/labels.js` | Node |
| `node tools/validate-lesson.js <files>` | any lesson JSON, against the real importer | Node |
| `tools/dom-check.html` | the rendering layer — chips, bars, colors, the palette | a real browser |

Run them before opening a PR. Then click through the app, because none of this
covers "is it usable".

---

## `node tools/smoke-test.js`

The main suite. It `vm.runInContext`s `labels.js`, `tokenize.js`, `store.js`, and
`examples.js` into a sandbox with a fake `localStorage`, so it exercises the real
code with no DOM. It prints one `ok` / `FAIL` line per assertion and exits
non-zero on any failure.

What it asserts:

- **Tokenizing** — sentence splitting, token offsets, and that `spanToTokens`
  snaps outward and `tokensToSpan` round-trips.
- **Taxonomy invariants** — every label has a valid layer and tier; every subtype
  inherits its parent's layer; the tree is exactly one level deep; every Advanced
  label has an Essential parent; every layer advertises subtypes.
- **Import/export** — round trips, `match` addressing, and that malformed input
  is skipped rather than thrown.
- **Every built-in example** — that all its annotation text is findable, that
  every span lands on a token boundary, that its sentence types are valid, and
  that it round-trips through export → import **with zero warnings**.
- **Every built-in example is complete** — every word has a part of speech,
  every clause carries a subject and a predicate, and clause spans cover the
  sentence. This runs through [`tools/completeness.js`](../../tools/completeness.js)
  and **fails the suite** on a gap. Sentences with no `types` badge are treated
  as intentional fragments and exempted from the clause/subject/predicate rules.
  The standard is specified in [lesson-json.md](lesson-json.md#completeness).

> ⚠️ **It also writes files.** The suite regenerates every file in `samples/`
> from `js/examples.js`. That's the point — the samples are a rendering of the
> examples, not a separate copy — but it means a taxonomy change shows up as a
> dirty working tree. **Commit the regenerated samples**; CI fails if `samples/`
> differs after the run.

Keeping this suite possible is a constraint on the code: `labels.js`,
`tokenize.js`, `store.js`, and `examples.js` must stay **DOM-free**. Reaching for
`document` in any of them breaks the smoke test.

## `node tools/gen-docs.js`

Regenerates the three derived documents:

- `docs/coverage-labels.json`
- `docs/coverage-labels.csv`
- `docs/product/grammar-reference.md`

Run it plain to write them; run it with `--check` to fail instead of writing
(that's what CI does). If `--check` reports STALE, run it without the flag and
commit the result.

## `node tools/validate-lesson.js <files>`

Runs any lesson file through the **real** `wjt.importLesson`, outside the browser,
and fails on a rejection *or* on any import warning:

```bash
node tools/validate-lesson.js samples/*.json
node tools/validate-lesson.js ~/Downloads/gpt-output.json
node tools/validate-lesson.js docs/custom-gpt-instructions.md
```

A `.md` argument is scanned for ` ```json ` blocks that parse as complete lessons,
which is how the worked examples in the docs are kept from rotting. Schema
sketches with placeholders are fenced as ` ```jsonc ` so they're skipped.

It's also the fastest way to check AI-generated output before importing it — an
unresolved `match` string shows up here as a named warning instead of as a
silently missing label in class. CI runs it over `samples/` plus both documents
that contain worked examples.

### `--complete` — strict coverage

Add `--complete` to also hold each lesson to the [completeness
standard](lesson-json.md#completeness): a part of speech on every word, and a
subject and predicate in every clause of every badged sentence, with clause spans
covering the sentence. This is the same check `smoke-test.js` runs on the
built-ins, exposed for hand-authored or AI-generated files:

```bash
node tools/validate-lesson.js --complete ~/Downloads/gpt-output.json
```

Fragments (sentences with no `types` badge) are reported as notes and exempted
from the clause and subject/predicate rules. Without the flag, `validate-lesson.js`
only checks that the file imports cleanly — completeness is opt-in here, so a
teacher's partial lesson isn't force-failed.

## `tools/dom-check.html`

The rendering layer needs a browser. Open the file directly and read the
PASS/FAIL lines it writes into `#result`:

- every label renders its chip or bar, in its own color;
- every built-in example renders all of its annotations;
- the palette builds for all four layers, in both tier modes.

### Running it headlessly

Use **PowerShell `Start-Process`**, which waits for the browser child and
captures its stdout. A plain `>` redirect from Git Bash returns a **zero-byte
dump** for this GUI-subsystem process — the msedge launcher detaches from the
redirected pipe:

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

`--window-size=1280,720` gives the presentation checks (9–10) a real 720p
projector viewport to assert the slide-shell bounds against; without it headless
defaults to 800×600 and that gate is meaningless. Spot-check the rest of the
presentation matrix by re-running with `--window-size=1366,768`, `1920,1080`, and
`1024,768` — the required contract is **0 failed** at each.

Things that will waste your afternoon if you don't know them:

- **Use Start-Process, not a shell `>` redirect.** The Bash-tool redirect that
  used to be documented here now yields an empty dump; Start-Process waits for
  the real child and captures it.
- **The URL needs a Windows-style drive** — `file:///C:/dev/…`, not
  `file:///c/dev/…`. The Git-Bash-style path silently loads a browser error page.
- **The temporary `--user-data-dir` is required.** Without it the dump comes back
  empty.

`tools/dom-check-report.js` parses the `<pre id="result">` block and exits
non-zero on any FAIL, on a missing block, or on an empty one — so a dump that
never ran can't pass silently. **Don't grep the raw dump**: it contains
`dom-check.html`'s own inline script, and that source has the literal strings
`PASS`, `FAIL`, and `FAILURE(S)` in it, so a naive grep reports failures that
aren't there. CI runs the Chrome equivalent through the same script.

The harness now boots the **full app** (`app.js`/`display.js`/`quiz.js`) against
the real page chrome, so it also covers boot, the storage guards, keyboard token
selection, and the confirm-dialog a11y. It also drives the real **Present** and
**Quiz** views to assert the slide-shell contract (checks 9–10): no document
overflow, stage/nav/controls/panel within the viewport, the clean phase reserving
no hidden lanes, the Key panel opening in-viewport with focus + Escape restore,
labelled sentence dots, and Practice question focus. (Those checks disable CSS
animations via a test-only `<style>` so bounds are measured settled, and wait a
tick for the renderer's reflow.) A healthy run reports **0 failed** and ends with
`ALL DOM CHECKS PASSED`. The pass *count* is an implementation detail that grows
as checks are added — don't hard-code it into a green/red judgment.

## Manual pass

Neither suite can tell you the app is *usable*. Before merging anything that
touches a view, walk one lesson through the whole loop:

1. **Library** — the lesson card shows the right sentence and label counts.
2. **✎ Edit** — drag a span, apply a base label, drill down to a subtype, add a
   note, remove a label. Toggle a teaching level off and back on. Toggle
   **Essential only** and confirm an already-placed Advanced label still renders.
3. **▶ Present** — all levels start hidden and the clean sentence wraps with no
   blank annotation gaps; the first level reveal enters the breakdown; ← / → (or
   ↑ / ↓) move between sentences; clicking a label opens the Key/explanation
   **panel** (drawer on wide screens, bottom sheet on narrow), which takes focus,
   closes on ✕ / Escape, and restores focus to what opened it. The page itself
   must **not** scroll — verify at 1280×720, 1366×768, 1920×1080, and 1024×768, in
   both the clean and all-layers-plus-Key states, windowed and in Fullscreen.
4. **🎯 Practice** — run a short quiz; check that a *select* question accepts the
   span you'd expect, and that feedback shows your note.
5. **⬇ Export → ⬆ Import** the lesson and confirm it comes back identical, with
   no console warnings.

Do step 5 in **both** a served page and a `file://` page. Running from
`file://` is a hard requirement (see
[architecture.md](architecture.md#the-five-constraints)) and it is the mode most
likely to break silently.

## Browsers to check

Chrome/Edge and Firefox on desktop, plus Safari on an iPad if you can — student
devices are the least-tested surface, and drag-selection is the feature most
likely to behave differently on touch.
