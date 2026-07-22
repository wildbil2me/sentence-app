---
status: todo   # todo | doing | done
created: 2026-07-22
---

# P1 — Data durability (export-all / import-all / write-failure guard / version footer)

Implements **workstream P1** of [docs/roadmap-0.1.0.md](../docs/roadmap-0.1.0.md).
Everything here is **additive and format-safe** — no taxonomy or lesson-format
change. Lesson format stays `version: 1`; this adds the *app* version `0.1.0`.

## Why

A lesson lives only in one browser's `localStorage`. There's no one-click way to
get *all* of it out, and `writeAll()` can fail silently. That fragility is the
main thing that makes the app read as a toy rather than a tool you'd trust with a
semester of prep — and a durable export is also the foundation the 0.2.0 sharing
work builds on.

## Scope

Four tasks, all client-side, no network. Keep [js/store.js](../js/store.js)
DOM-free **at load time** (the new data functions are pure; the DOM download
reuses the existing `wjt.downloadJson`, which is already in store.js —
[store.js:218](../js/store.js#L218) — and only touches the DOM when *called*).

### Task A — Export all lessons

**[js/store.js](../js/store.js)** — add a pure bundle builder near the other
export code (after `wjt.exportLesson`, ~line 216):

```js
/** One document holding every stored lesson (volatile ids dropped per lesson). */
wjt.exportAllLessons = function () {
  return {
    format: "sentence-forge-bundle",
    version: 1,
    exportedAt: new Date().toISOString(),
    lessons: wjt.store.list().map(wjt.exportLesson),
  };
};
```

**[js/app.js](../js/app.js)** — library hero. Add a button to the `.btn-row` at
[app.js:47-50](../js/app.js#L47-L50):

```html
<button class="btn btn-big" data-act="export-all">⬇ Export all</button>
```

Wire it near the other hero handlers (~line 150):

```js
view.querySelector('[data-act="export-all"]').addEventListener("click", function () {
  if (!wjt.store.list().length) { wjt.toast("No lessons to export."); return; }
  wjt.downloadJson(wjt.exportAllLessons(), "sentence-forge-lessons.json");
});
```

### Task B — Import all (merge, fresh ids)

**Decision (Q2): merge with fresh ids.** No "replace" mode. This is *free* —
`importLesson` already mints new ids via `create()`→`wjt.uid()`
([store.js:112](../js/store.js#L112)) and `save()` pushes when the id isn't found
([store.js:54-61](../js/store.js#L54-L61)), so imported lessons never overwrite
existing ones. That also means **no new destructive path** and no extra guard
needed (single-lesson delete is already `confirm()`-guarded at
[app.js:117](../js/app.js#L117)).

**[js/store.js](../js/store.js)** — add a pure normalizer that accepts a bundle,
a bare array, or a single lesson (backward-compatible with today's files):

```js
/** Normalize an uploaded doc (bundle | array | single lesson) into lessons. */
wjt.importBundle = function (data) {
  var docs;
  if (data && Array.isArray(data.lessons)) docs = data.lessons;   // { lessons: [...] }
  else if (Array.isArray(data)) docs = data;                       // bare array
  else docs = [data];                                              // single lesson (existing shape)

  var lessons = [], warnings = [], failed = 0;
  docs.forEach(function (d, i) {
    try {
      var r = wjt.importLesson(d);
      lessons.push(r.lesson);
      r.warnings.forEach(function (w) { warnings.push("Lesson " + (i + 1) + ": " + w); });
    } catch (e) {
      failed++;
      warnings.push("Lesson " + (i + 1) + " skipped: " + e.message);
    }
  });
  return { lessons: lessons, warnings: warnings, failed: failed };
};
```

**[js/app.js](../js/app.js)** — route the file-change handler
([app.js:157-177](../js/app.js#L157-L177)) through `importBundle` instead of
`importLesson`. Each file may now be a bundle *or* a single lesson:

```js
reader.onload = function () {
  try {
    var data = JSON.parse(reader.result);
    var result = wjt.importBundle(data);
    if (!result.lessons.length) throw new Error("No usable lessons in the file.");
    result.lessons.forEach(function (l) { wjt.store.save(l); });   // save() may throw — see Task C
    wjt.toast("Imported " + result.lessons.length + " lesson" +
      (result.lessons.length === 1 ? "" : "s") +
      (result.warnings.length ? " (" + result.warnings.length + " warning(s) — see console)." : "."));
    result.warnings.forEach(function (w) { console.warn("[Sentence Forge import]", w); });
    renderLessons();
  } catch (e) {
    wjt.toast("Import failed: " + e.message, 5000);
  }
};
```

### Task C — Guard the `localStorage` write failure

**[js/store.js:39-41](../js/store.js#L39-L41)** — `writeAll` currently calls
`setItem` bare; a full/disabled quota throws uncaught and work is lost silently.
Make it throw a readable, tagged error:

```js
function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    var err = new Error("Couldn’t save — browser storage is full or disabled. " +
      "Export your lessons to a file so you don’t lose work.");
    err.code = "STORAGE_WRITE_FAILED";
    throw err;
  }
}
```

Then handle it at the call sites that are currently unguarded:

- **[js/editor.js:16](../js/editor.js#L16)** — the autosave `wjt.store.save(lesson)`.
  This is the important one: it's silent and frequent. Wrap it:
  `try { wjt.store.save(lesson); } catch (e) { wjt.toast(e.message, 6000); }`
- **[js/app.js:137](../js/app.js#L137)** (load example) and
  **[js/app.js:146](../js/app.js#L146)** (new lesson) — wrap in `try/catch` →
  `wjt.toast`, and don't navigate on failure.
- Import (Task B) is already inside `try/catch`.
- The first-run seed at [app.js:212](../js/app.js#L212) can stay as-is (best-effort).

*Pure change — the try/catch doesn't touch the DOM, so store.js stays load-safe
and the smoke test's fake `localStorage` path (which succeeds) is unaffected.*

### Task D — Version string + footer

- **Single source of truth:** add `wjt.VERSION = "0.1.0";` at the top of the
  [js/app.js](../js/app.js) IIFE (just after `wjt.views = wjt.views || {};`).
- **[index.html](../index.html)** — add a footer after the `#toasts` div
  ([index.html:18](../index.html#L18)):
  `<footer class="appfoot"><span data-role="version"></span></footer>`
- **[js/app.js](../js/app.js)** boot (inside the `DOMContentLoaded` handler,
  ~line 204): `var vEl = document.querySelector('[data-role="version"]'); if (vEl) vEl.textContent = "v" + wjt.VERSION;`
- **[css/styles.css](../css/styles.css)** — a small, muted, unobtrusive footer:

```css
.appfoot { text-align: center; padding: 24px 12px; color: var(--muted); font-size: 12px; }
```

(Use the existing muted-text custom property name — check `:root` in styles.css;
don't invent a new token.)

## Out of scope (separate work orders)

- Import **replace** mode — merge only, by decision Q2.
- Autosave hardening / versioned backup snapshots — a later 0.1.0 item, not this
  order.
- Workstreams **P2** (land the render flash fix), **P3** (importer smart-quote /
  Unicode-space folding — see [to-do.md](../to-do.md)), **P4** (edge/a11y sweep).
- The **Q3 doc relabel** ("pilot/frozen" → "open alpha" in
  [CLAUDE.md](../CLAUDE.md) and [docs/product/pilot.md](../docs/product/pilot.md))
  — decided, but it's a docs-only change; do it as its own small order.

## Done when

- `node tools/smoke-test.js` → **All checks passed** (it exercises `store.save` at
  [smoke-test.js:279](../tools/smoke-test.js#L279); confirm the new functions load
  and it still regenerates `samples/` — **commit the regenerated samples**).
- `node tools/gen-docs.js --check` and
  `node tools/validate-lesson.js samples/*.json docs/custom-gpt-instructions.md`
  both pass.
- Browser DOM check reports **238 passed, 0 failed** (the footer + new library
  button change the DOM — if the count moves, investigate before landing, and
  update [docs/project/dom-structure.md](../docs/project/dom-structure.md) for the
  new `<footer class="appfoot">` and the `Export all` button).
- Manual smoke in the app (open `index.html` directly — must work from `file://`):
  1. **Export all** downloads one JSON containing every lesson.
  2. Delete a lesson, then **Import** that file → the lesson returns with a new
     id, and any lessons you kept are untouched (merge, no overwrite).
  3. A single-lesson file from the per-card ⬇ export still imports (backward compat).
  4. Simulate a write failure (DevTools → fill storage, or block storage) →
     editing shows the "storage is full" toast instead of losing work silently.
  5. Footer shows **v0.1.0**.
- Report results honestly, per [CLAUDE.md](../CLAUDE.md); a red check is not "done."

## Notes

- **Bundle shape** is `{ format: "sentence-forge-bundle", version: 1, exportedAt,
  lessons: [...] }`. `importBundle` also accepts a bare array and a single lesson
  so nothing that imports today breaks.
- Keep the ES5 house style: `var`, `function`, one IIFE per file, match the
  surrounding code.
- When finished: set `status: done` and `git mv plans/001-data-durability.md
  plans/done/` in the same commit as the work.
