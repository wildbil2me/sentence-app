# Contributing to Grammar Lab

Grammar Lab is a classroom tool built by a teacher. The most valuable
contribution is **telling us what happened when you used it with students** —
code is welcome, but it isn't the bottleneck.

## Ways to help, in order of usefulness

1. **Use it in a class and report back.** See
   [docs/product/pilot.md](docs/product/pilot.md) and file a
   [classroom feedback issue](https://github.com/YOUR-GITHUB-USERNAME/grammar-lab/issues/new?template=classroom_feedback.yml).
2. **Report a bug** with the lesson file attached —
   [bug report](https://github.com/YOUR-GITHUB-USERNAME/grammar-lab/issues/new?template=bug_report.yml).
3. **Tell us a label is named wrong** for your textbook. Cheap to fix, high
   value — [feature request](https://github.com/YOUR-GITHUB-USERNAME/grammar-lab/issues/new?template=feature_request.yml).
4. **Contribute an example lesson** — a well-labeled public-domain passage that
   other teachers can use (see [below](#contributing-an-example-lesson)).
5. **Fix something** in the code.

Never put student names or student work in an issue. Anonymize first.

## Setting up

There is nothing to install.

```bash
git clone <this repo>
cd sentences
# open index.html — double-click it, or:
python -m http.server 8000
```

Node (any recent version) is needed only to run the checks. There is no
`package.json`, no dependencies, and no build step — and
[that's on purpose](docs/project/architecture.md#the-five-constraints). Don't add
a bundler, a framework, or an npm dependency without opening an issue first; the
app has to keep running when a teacher double-clicks `index.html` on a locked-down
school laptop.

## Before you open a PR

```bash
node tools/smoke-test.js        # logic layer; ALSO regenerates samples/ — commit it
node tools/gen-docs.js --check  # generated docs match js/labels.js
node tools/validate-lesson.js samples/*.json   # lessons still import cleanly
start tools/dom-check.html      # rendering layer; needs a real browser
```

`tools/dom-check.html` writes PASS/FAIL lines into the page; a healthy run ends
with **ALL DOM CHECKS PASSED**. To run it headlessly (and read the result
correctly) see
[docs/project/testing.md](docs/project/testing.md#running-it-headlessly).

Then click through the app: Edit → Present → Practice on one lesson, and export →
import it. Details and the full manual pass are in
[docs/project/testing.md](docs/project/testing.md).

The PR template has the checklist. Keep PRs small and focused; a PR that fixes a
bug *and* renames things is two PRs.

## Where things live

| I want to… | Read |
|---|---|
| understand the code | [docs/project/architecture.md](docs/project/architecture.md) |
| add or change a grammar label | [docs/project/taxonomy-workflow.md](docs/project/taxonomy-workflow.md) |
| change the lesson file format | [docs/project/lesson-json.md](docs/project/lesson-json.md) |
| understand the checks | [docs/project/testing.md](docs/project/testing.md) |
| deploy | [docs/project/deploying.md](docs/project/deploying.md) |
| know what the product is for | [docs/product/overview.md](docs/product/overview.md) |

## Code conventions

Match what's there. Concretely:

- **One IIFE per file**, exporting onto the `GL` global. No modules.
- **`var`, `function`, and `"use strict"`.** The code is ES5-flavored on purpose
  — it's what runs everywhere without a transpiler. Don't mix in arrow functions
  and `const` in one file and not another.
- **Keep `labels.js`, `tokenize.js`, `store.js`, and `examples.js` DOM-free.**
  The smoke test runs them in a bare `vm` sandbox; touching `document` in any of
  the four breaks it.
- **Every path relative.** An absolute `/css/…` works locally and 404s under
  GitHub Pages' `/<repo>/` prefix.
- **No network calls, ever** — no CDN, no fonts, no analytics. See
  [SECURITY.md](SECURITY.md).
- **Escape anything from a lesson file** before it reaches `innerHTML`
  (`GL.escapeHtml`). Titles, notes, and sentence text all come from imported
  JSON.
- **Views clean up after themselves** via `GL.onViewCleanup(fn)` for any
  document-level listener or timer.
- Comments explain *why*, not *what*. The existing code is good about this;
  match it.

## Contributing an example lesson

Example lessons live in [`js/examples.js`](js/examples.js) as a `build()`
function, **not** as a file in `samples/` — the app can't `fetch()` local JSON
from `file://`, so examples have to be JavaScript. `samples/*.json` is
regenerated from them by the smoke test.

A good example passage is:

- **public domain** (the current set is Shakespeare, Fitzgerald, Shelley,
  Stoker);
- short — a paragraph, not a page;
- **classroom-appropriate**, and interesting enough to be worth reading twice;
- chosen because it *shows something* — an inverted subject, a cleft
  construction, an absolute phrase — not just because it's famous;
- labeled at every layer it supports, with teaching notes on the two or three
  labels a student would most likely miss, and a `types` tag on every sentence.

Follow the shape of an existing entry, add it to `GL.EXAMPLES`, run the smoke
test (which validates every annotation and generates the sample file), and commit
both.

## Deciding whether a feature belongs

Before proposing one, read the
[principles and non-goals](docs/product/overview.md#principles). Several whole
categories are documented as deliberately out of scope in
[docs/roadmap.md](docs/roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool)
— punctuation, usage errors, verb tense/voice/mood, and sentence diagramming —
because each breaks the model that every annotation is a span over whole words.
Those are sibling-app ideas. Proposing one anyway is fine; just make the case
against that reasoning rather than around it.

## Licensing

By contributing you agree your work is released under the [MIT License](LICENSE).
