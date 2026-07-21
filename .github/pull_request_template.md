<!-- Keep this short. Delete sections that don't apply. -->

## What this changes

<!-- One or two sentences. Link the issue if there is one: Fixes #12 -->

## Checks

- [ ] `node tools/smoke-test.js` passes
- [ ] `samples/` re-committed if the smoke test regenerated anything
- [ ] `tools/dom-check.html` opened in a browser (only if rendering, labels, or CSS changed)
- [ ] Clicked through Edit → Present → Practice on at least one lesson

## If the taxonomy changed

Label changes touch five places that must stay in sync — see
[docs/project/taxonomy-workflow.md](../docs/project/taxonomy-workflow.md).

- [ ] `js/labels.js` edited
- [ ] `node tools/gen-docs.js` run (regenerates `coverage-labels.*` and
      `product/grammar-reference.md`)
- [ ] `docs/coverage-brief.md` counts and per-layer lists updated by hand
- [ ] `docs/custom-gpt-instructions.md` label list updated by hand

## Notes for the reviewer

<!-- Anything non-obvious: a decision you made, a tradeoff, something you're unsure about. -->
