# 🧪 Grammar Lab

**Paste a paragraph. Label its grammar once. Teach it and quiz on it.**

A classroom web app for the building blocks of a sentence. A teacher annotates
any passage — words, sentence parts, phrases, clauses — then **presents** the
breakdown on a projector and hands the *same* passage to students as a
self-checking **quiz**. Because the quiz is generated from the annotations,
practice is always about the sentences that were just taught.

No accounts, no server, no build step, no install. It's plain HTML, CSS, and
JavaScript, and it runs by double-clicking a file.

## Try it

▶ **[Open Grammar Lab](https://YOUR-GITHUB-USERNAME.github.io/grammar-lab/)**

Or run it locally — clone the repo and double-click `index.html`. Really; that's
the whole setup. To serve it instead:

```bash
python -m http.server 8000    # then http://localhost:8000
```

It ships with **Sample: The Fox and the River** already loaded and seven
ready-made literature passages (Shakespeare, Fitzgerald, Shelley, Stoker) in the
example library, so there's something to click immediately.

## The three modes

| | |
|---|---|
| **✎ Edit** | Paste a passage; it splits into sentences. Drag across words and pick a label from the palette — from a base label (*Noun*) down to a specific type (*Collective Noun*). Attach a teaching note to anything. Tag each sentence's structure and purpose. |
| **▶ Present** | Projector-sized, one sentence at a time, with every layer hidden. Reveal Parts of Speech, then Sentence Parts, then Phrases, then Clauses — building the breakdown live. Click any label for its definition, an example, and your note. Arrow keys navigate. |
| **🎯 Practice** | Auto-generated questions: *"What is the highlighted word?"*, *"Select the direct object"*, *"What is the structure of this sentence?"* Instant feedback, and a results screen naming what's worth reviewing. Nothing is recorded. |

**87 labels across four layers**, every one of them explained in-app; a
per-lesson **Essential only** toggle trims the palette to the classroom core.
Sentences also carry **type badges** on two axes — structure (simple / compound /
complex / compound-complex) and purpose (declarative / interrogative /
imperative / exclamatory).

## Sharing a lesson

A lesson is a plain JSON file. **⬇** exports one; **⬆ Import JSON** takes it
back — on another machine, from a colleague, or from a
[custom GPT that labels a passage for you](docs/custom-gpt-instructions.md).
Everything is stored in the browser's `localStorage`, so **export anything you'd
be upset to lose**.

## Documentation

Product and project docs are kept separate — [full index](docs/README.md).

**For teachers**

- [Product overview](docs/product/overview.md) — what it's for, the principles,
  and what it deliberately doesn't do
- [Teacher guide](docs/product/teacher-guide.md) — building, presenting, and
  practicing a lesson, plus classroom recipes and troubleshooting
- [Label reference](docs/product/grammar-reference.md) — every label, defined
- [Classroom pilot](docs/product/pilot.md) — the testing phase and how to report
  back

**For developers**

- [Architecture](docs/project/architecture.md) — how it's built, and the five
  constraints everything follows from
- [Lesson JSON spec](docs/project/lesson-json.md) · [Checks](docs/project/testing.md) ·
  [Deploying](docs/project/deploying.md) ·
  [Changing the taxonomy](docs/project/taxonomy-workflow.md)
- [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) ·
  [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Status

Feature-complete and heading into a **classroom pilot**. The taxonomy and the
lesson file format are frozen during it; bug reports and classroom feedback are
the most valuable thing you can send. See [the pilot plan](docs/product/pilot.md).

## Privacy

Nothing leaves the browser. No accounts, no analytics, no network requests of any
kind — the app makes none. No student data is collected, transmitted, or stored
off-device, and quiz results are never recorded. Details in
[SECURITY.md](SECURITY.md).

## Known limits

- Sentence splitting is deliberately simple, so "Mr." splits early — the
  editor's **⤵ Merge next** button fixes any bad split in one click.
- Long sentences scroll horizontally inside their card rather than wrapping;
  this is what keeps the label bars aligned under the words.
- Selection is whole-word: a label always covers complete words, punctuation
  included.
- Punctuation, run-ons and fragments, verb tense/voice/mood, and Reed–Kellogg
  diagramming are **out of scope by design** — each breaks the "every annotation
  is a span over whole words" model. The reasoning is written up in
  [docs/roadmap.md](docs/roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool).

## Development

```bash
node tools/smoke-test.js                       # logic layer (also regenerates samples/)
node tools/gen-docs.js --check                 # generated docs match js/labels.js
node tools/validate-lesson.js samples/*.json   # lessons import cleanly
open tools/dom-check.html                      # rendering layer; needs a browser
```

No dependencies, no `package.json`, nothing to install — Node is used only by
those tools. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Use it in your classroom, fork it for your department.
