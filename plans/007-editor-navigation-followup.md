---
status: todo   # todo | doing | done
created: 2026-07-22
---

# Editor: compact sticky toolbar + sentence navigator (UI-10 follow-up)

## Why

The UI audit's UI-10 noted that long lessons in the Editor become a sequence of
very tall cards, so authoring means a lot of scrolling with no quick way to jump
between sentences or reach the lesson actions. The presentation-UI remediation
([plans/005-presentation-ui-remediation.md](005-presentation-ui-remediation.md))
deferred this — it is a P2 polish item, never a `0.1.0` slide blocker — but it is
worth a small dedicated pass because it reduces friction for exactly the dense
lessons the product is built around.

## Scope

In [`js/editor.js`](../js/editor.js) and [`css/styles.css`](../css/styles.css):

- A compact **sticky lesson toolbar** (title/save state + Present/Quiz/Export)
  that stays reachable while scrolling a long lesson.
- A **sentence navigator** — jump to a sentence without scrolling the full list.
- Optional: per-layer preview toggles so the author can collapse a card's
  breakdown while editing others.

No data-model change: this is layout/navigation only. Keep the existing keyboard
selection, save-flash live region, and layer/tier toggles working. Match the ES5
house style and update the DOM map for any new structure.

Out of scope: taxonomy, label ids, lesson format, and the label palette
(that is [plans/006](006-palette-scale-followup.md)).

## Done when

- A long lesson keeps its primary actions and a sentence jump reachable without
  scrolling to the top; nothing regresses in the editor smoke/DOM checks.
- `node tools/smoke-test.js` and the browser DOM check report **0 failed**; the
  DOM map reflects any new sticky/navigator structure.

## Notes

- Split out of the 005 presentation-UI order (see its "Scope" and the audit's
  UI-10 "As remediated: Deferred" row).
