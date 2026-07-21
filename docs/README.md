# Sentence Forge — documentation

Two audiences, two folders. If you are deciding *what* Sentence Forge should do,
start in **product**. If you are changing *how it works*, start in **project**.

## 📗 Product documentation — for teachers and decision-makers

| Document | What's in it |
|---|---|
| [product/overview.md](product/overview.md) | What Sentence Forge is, who it's for, the problem it solves, the principles behind it, and what it deliberately does **not** do. |
| [product/teacher-guide.md](product/teacher-guide.md) | How to actually use it: build a lesson, present it, run practice, share lessons between machines. |
| [product/grammar-reference.md](product/grammar-reference.md) | Every label the app supports, in teacher language, with the ids you'd write in a JSON file. |
| [product/pilot.md](product/pilot.md) | The classroom testing phase — what we're trying to learn, how to run a pilot lesson, how to report back. |

## 🔧 Project documentation — for anyone changing the code

| Document | What's in it |
|---|---|
| [project/architecture.md](project/architecture.md) | How the app is put together, the `wjt` namespace, the annotation model, and why there's no build step. |
| [project/lesson-json.md](project/lesson-json.md) | The lesson file format, precisely — every field, every rule the importer enforces. |
| [project/testing.md](project/testing.md) | The two check suites, how to run each, and what to do when one fails. |
| [project/deploying.md](project/deploying.md) | GitHub Pages setup, the two CI workflows, and the release checklist. |
| [project/taxonomy-workflow.md](project/taxonomy-workflow.md) | The exact sequence for adding or changing a grammar label without leaving docs stale. |

## 📐 Taxonomy design records

Living documents that predate the split above; both are about the label set
rather than the code.

- [coverage-brief.md](coverage-brief.md) — the authoritative inventory of every
  label, written for a reviewer hunting for gaps.
- [roadmap.md](roadmap.md) — the tiered expansion plan (Tiers 1, 1.5, and 2
  shipped; Tier 3 documented as out of scope and why).
- [tier1-remaining-plan.md](tier1-remaining-plan.md) — the working plan for the
  last of Tier 1, kept for the rationale it records.
- [reference/7-20-findings.md](reference/7-20-findings.md) — the external gap
  analysis the roadmap responds to.
- [coverage-labels.json](coverage-labels.json) · [coverage-labels.csv](coverage-labels.csv)
  — generated exports of the taxonomy. Don't hand-edit; regenerate them
  ([how](project/taxonomy-workflow.md)).

## 🤖 Authoring lessons with AI

- [custom-gpt-instructions.md](custom-gpt-instructions.md) — the full prompt for
  a custom GPT that turns a pasted passage into an importable lesson file.
