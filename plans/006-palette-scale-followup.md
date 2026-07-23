---
status: todo   # todo | doing | done
created: 2026-07-22
---

# Palette scale: make label picking fast at 87 labels (UI-6 follow-up)

## Why

The UI audit's UI-6 flagged that the open label palette is a tall vertical
catalogue: at 1366×768 only the Parts-of-Speech section is visible and the other
three layers require scrolling. The presentation-UI remediation
([plans/005-presentation-ui-remediation.md](005-presentation-ui-remediation.md))
deferred this because the palette is **already** grouped one level deep by layer
(`openPalette()` iterates `lesson.layers`, each an aria-group with a heading), so
the audit's core "layer-first" ask is largely met and it is not a `0.1.0` slide
blocker (see [plans/005](005-presentation-ui-remediation.md)). What remains is
authoring *speed*, which every downstream artifact (worksheets, slide export)
depends on.

## Scope

In [`js/editor.js`](../js/editor.js) `openPalette()` (the label list, ~lines
403–444, plus `labelButton()`):

- Reveal one layer's groups at a time — layer tabs or an accordion — instead of
  one continuous catalogue, so the picked word stays in view.
- Add an explicit **Close** button to the modal and to the Tab focus-trap order.
- Add a visible result/label count per layer.
- Optional, if cheap: a search box and a "recent / repeat-last label" affordance.

**Preserve** the completed a11y contract: `role="dialog"`, `aria-modal`, group
labels, the Tab trap, Escape/outside dismissal, and focus restoration
(`prevFocus`). Keep the parent/subtype grouping *inside* a layer and the two
per-layer layouts (subtype drill-down vs flat grid).

Out of scope: Study Focus (limiting a lesson's relevant layers) and any taxonomy,
label-id, or lesson-format change.

## Done when

- Opening the palette shows one layer's labels at a time with a clear way to
  switch layers; no full-catalogue scroll to reach Clauses.
- The modal has a labelled Close in the trap order; dialog semantics, Escape,
  outside-dismiss, and focus restore still pass the dom-check confirm/palette
  assertions.
- `node tools/smoke-test.js` and the browser DOM check report **0 failed**; the
  DOM map ([docs/project/dom-structure.md](../docs/project/dom-structure.md))
  reflects the new palette structure.

## Notes

- Split out of the 005 presentation-UI order (see its "Scope" and the audit's
  UI-6 "As remediated: Deferred" row).
