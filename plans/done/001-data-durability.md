---
status: done   # todo | doing | done
created: 2026-07-22
---

# P1 — Data durability (export-all / import-all / write-failure guard / version footer)

Implements **workstream P1** of [docs/roadmap-0.1.0.md](../docs/roadmap-0.1.0.md).
Everything here is **additive and format-safe** — no taxonomy or lesson-format
change. Lesson format stays `version: 1`; this adds the *app* version `0.1.0`.

> **Adapted 2026-07-22 for the landing-page split.** After this plan was
> written, the front end was refactored: the old single landing page became a
> clean **Home splash** (`wjt.views.home`) plus a separate **Library screen**
> (`wjt.views.library`, at `#/library`). The lessons + examples grids now live on
> Library; the file-import handler moved into the Home view and already loops over
> multiple files and navigates to `#/library` on success. Line numbers and the
> `.btn-row`/`renderLessons()` anchors below have been re-pointed to the current
> code, and **Export all now lands on the Library screen** (that's where lessons
> are shown), not the Home splash. The DOM-check baseline is now **238** post-split.

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

**[js/app.js](../js/app.js)** — **Library view** (`wjt.views.library`), not the
Home splash. Add an "Export all" action to the "Your lessons" section header.
The section is currently a bare `<h2>` at [app.js:112-115](../js/app.js#L112-L115):

```html
<section data-role="my-lessons">
  <div class="section-head">
    <h2 class="section-title">Your lessons</h2>
    <button class="btn btn-sm" data-act="export-all" title="Download every lesson as one JSON">⬇ Export all</button>
  </div>
  <div class="lesson-grid" data-role="lessons"></div>
</section>
```

(If a `.section-head` flex row doesn't already exist, a one-line CSS rule —
`display:flex; align-items:center; justify-content:space-between; gap:12px;` —
keeps the title and button on one row. Reuse an existing pattern if there is one.)

Wire it inside `wjt.views.library`, alongside `renderLessons()` /
`renderExamples()` (before the `renderLessons(); renderExamples();` calls at
[app.js:199-200](../js/app.js#L199-L200)):

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

**[js/app.js](../js/app.js)** — the file-change handler now lives in the **Home
view** and already loops over multiple selected files
([app.js:72-96](../js/app.js#L72-L96)), calling `wjt.importLesson(data)` and
saving one lesson per file. Route each file's `reader.onload` through
`importBundle` instead, so any file may itself be a bundle *or* a single lesson.
The existing loop already navigates to `#/library` on success — keep that; just
make the per-file body count *lessons* rather than *files*:

```js
reader.onload = function () {
  try {
    var data = JSON.parse(reader.result);
    var result = wjt.importBundle(data);
    if (!result.lessons.length) throw new Error("No usable lessons in the file.");
    result.lessons.forEach(function (l) { wjt.store.save(l); });   // save() may throw — see Task C
    imported += result.lessons.length;
    wjt.toast("Imported " + result.lessons.length + " lesson" +
      (result.lessons.length === 1 ? "" : "s") +
      (result.warnings.length ? " (" + result.warnings.length + " warning(s) — see console)." : "."));
    result.warnings.forEach(function (w) { console.warn("[Sentence Forge import]", w); });
    // Existing behavior: surface the result on the Library screen.
    if (location.hash === "#/library") route();
    else location.hash = "#/library";
  } catch (e) {
    wjt.toast("Import failed: " + e.message, 5000);
  }
};
```

Note the Library view rebuilds its own grid on entry (it calls its local
`renderLessons()` at [app.js:199](../js/app.js#L199)), so navigating to
`#/library` — or `route()` when already there — is what refreshes the list; there
is no top-level `renderLessons()` to call from Home.

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

- **[js/editor.js:16](../js/editor.js#L16)** — the autosave `wjt.store.save(lesson)`
  inside `save()`. This is the important one: it's silent and frequent. Wrap it:
  `try { wjt.store.save(lesson); } catch (e) { wjt.toast(e.message, 6000); }`
- **[js/app.js:61](../js/app.js#L61)** — **New lesson** in the Home view
  (`wjt.store.save(wjt.store.create())` then `location.hash = "#/edit/…"`). Wrap
  in `try/catch` → `wjt.toast`, and don't navigate on failure.
- **[js/app.js:191](../js/app.js#L191)** — **load example** ("＋ Add to my
  lessons"), now inside the Library view's `renderExamples()`
  (`wjt.store.save(ex.build())` then navigate to present). Same treatment.
- Import (Task B) is already inside `try/catch` (per file, in the Home view).
- The first-run seed at [app.js:227-228](../js/app.js#L227-L228) can stay as-is
  (best-effort).

*Pure change — the try/catch doesn't touch the DOM, so store.js stays load-safe
and the smoke test's fake `localStorage` path (which succeeds) is unaffected.*

### Task D — Version string + footer

- **Single source of truth:** add `wjt.VERSION = "0.1.0";` at the top of the
  [js/app.js](../js/app.js) IIFE (just after `wjt.views = wjt.views || {};`).
- **[index.html](../index.html)** — add a footer after the `#toasts` div
  ([index.html:18](../index.html#L18)):
  `<footer class="appfoot"><span data-role="version"></span></footer>`
- **[js/app.js](../js/app.js)** boot (inside the `DOMContentLoaded` handler,
  ~[app.js:220-234](../js/app.js#L220-L234), e.g. after `applyTheme(...)`):
  `var vEl = document.querySelector('[data-role="version"]'); if (vEl) vEl.textContent = "v" + wjt.VERSION;`
  The footer is outside `#app`, so set it once at boot — it isn't re-rendered per route.
- **[css/styles.css](../css/styles.css)** — a small, muted, unobtrusive footer:

```css
.appfoot { text-align: center; padding: 24px 12px; color: var(--muted); font-size: 12px; }
```

(`--muted` is the existing muted-text token — confirmed in `:root`,
[styles.css:12](../css/styles.css#L12) / [:32](../css/styles.css#L32). Reuse it;
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
- Browser DOM check: the post-split baseline is **238 passed, 0 failed**. The
  global `<footer class="appfoot">` and the Library-view `Export all` button both
  change the DOM, so the pass **count will move** — that's expected here (unlike
  the usual "must stay 238"). Confirm 0 failed, sanity-check the new count, then
  update [docs/project/dom-structure.md](../docs/project/dom-structure.md): the
  footer under the **global** shell (after `#toasts`, outside `#app`) and the
  `Export all` button in the **Library** view's "Your lessons" section head. (The
  doc already documents separate Home and Library views.)
- Manual smoke in the app (open `index.html` directly — must work from `file://`):
  1. On **Library** (`#/library`), **Export all** downloads one JSON containing
     every lesson.
  2. Delete a lesson, then **Import JSON** from the Home splash → import lands you
     on Library, the lesson returns with a new id, and any lessons you kept are
     untouched (merge, no overwrite).
  3. A single-lesson file from the per-card ⬇ export still imports (backward compat).
  4. A multi-file selection (Import accepts `multiple`) — a bundle *and* a single
     lesson at once — imports both.
  5. Simulate a write failure (DevTools → fill storage, or block storage) →
     editing shows the "storage is full" toast instead of losing work silently.
  6. Footer shows **v0.1.0** on both Home and Library.
- Report results honestly, per [CLAUDE.md](../CLAUDE.md); a red check is not "done."

## Notes

- **Bundle shape** is `{ format: "sentence-forge-bundle", version: 1, exportedAt,
  lessons: [...] }`. `importBundle` also accepts a bare array and a single lesson
  so nothing that imports today breaks.
- Keep the ES5 house style: `var`, `function`, one IIFE per file, match the
  surrounding code.
- When finished: set `status: done` and `git mv plans/001-data-durability.md
  plans/done/` in the same commit as the work.
