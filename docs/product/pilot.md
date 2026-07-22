# Classroom pilot

Sentence Forge is feature-complete enough to teach with and has never been used in
a live class period. The pilot exists to fix that before more gets built on top
of assumptions.

- [What we're trying to learn](#what-were-trying-to-learn)
- [What stays stable during the alpha](#what-stays-stable-during-the-alpha)
- [Running a pilot lesson](#running-a-pilot-lesson)
- [How to report back](#how-to-report-back)
- [What we'll do with it](#what-well-do-with-it)
- [Known rough edges](#known-rough-edges-report-these-anyway)

---

## What we're trying to learn

In priority order. The first question is worth more than the rest combined.

### 1. Does the Edit → Present → Practice loop survive a real class period?

The whole design bets that authoring once is worth it because the same work
drives instruction *and* practice. That bet is untested. The failure mode to
watch for is a teacher who annotates a passage, presents it, and then never
opens Practice — which would mean the quiz isn't earning its complexity.

### 2. How long does labelling a passage actually take?

If a paragraph takes forty minutes, nobody does it twice, and the answer is
better AI-assisted authoring rather than a better editor. If it takes six, the
editor is fine. **Time yourself once** — that single number changes the roadmap
more than any opinion.

### 3. Do the labels match how teachers actually teach?

87 labels, named from a general English-teacher vocabulary. Every school uses a
different textbook. We expect to hear that something is named wrong, that a
distinction we drew is one nobody makes, or that a distinction teachers *do* make
is missing. Naming feedback is cheap to act on and high value.

### 4. Where do students get stuck — as opposed to teachers?

Drag-selection on a touch device, reading the bars in Present mode, and knowing
what a *select* question wants are the three we suspect. We suspect wrong
regularly.

### 5. Does the data model hold up in a school environment?

localStorage on shared, re-imaged, or roaming-profile machines is the biggest
technical risk in the product. If lessons vanish overnight on a cart of
Chromebooks, export/import is not a sufficient sharing story and that's a
significant finding.

## What stays stable during the alpha

The app is in **open alpha** — usable, single-user, not yet committed to format
stability. That commitment becomes a promise at **1.0.0**, the first-real-teacher
line (see [roadmap-0.1.0.md](../roadmap-0.1.0.md) §0). Until then these are kept
deliberately stable anyway, because a break costs real prep work today:

**The taxonomy.** 87 labels across four layers, plus the sentence-type badges.
No new labels during the alpha unless a teacher hits a real, blocking gap in a
real lesson — and then it goes in as a
[feature request](https://github.com/wildbil2me/sentence-app/issues/new?template=feature_request.yml) with the
lesson attached, not as a speculative addition. Adding label 88 is the easiest
way to feel productive while learning nothing.

**The lesson format.** Breaking it now would destroy prep work that exists only
in a teacher's browser and in files they exported. Changes must stay additive;
see [lesson-json.md](../project/lesson-json.md#compatibility).

**The three modes.** No fourth mode, no gradebook, no accounts. See the
[non-goals](overview.md#deliberate-non-goals).

Bug fixes, wording, and accessibility are always in scope.

## Running a pilot lesson

The minimum useful pilot is **one class period**. A week is better.

**Before class**

1. Open the app and take five minutes with the built-in **Sample: The Fox and
   the River** to see the shape of a finished lesson.
2. Build your own from a passage you're already teaching — not a demo sentence.
   The whole point is real material.
3. **Export it** (⬇ on the lesson card). Do this before class, every time.
   Lessons live in one browser and nowhere else.
4. If you're presenting from a different machine than you authored on, import the
   file there and check that it renders before the room fills up.

**In class**

5. Present with all levels off and build up. Resist showing the finished
   breakdown first.
6. If you have time, put students in Practice on the same lesson. Even five
   minutes tells us whether question 1 above is a yes.

**After class**

7. Write it down while it's fresh, and file it (below). Fifteen minutes of
   notes from one real period is worth more than any amount of speculation.

## How to report back

Three channels, in descending order of usefulness:

| | When | Where |
|---|---|---|
| 🍎 **Classroom feedback** | You taught with it | [Classroom feedback issue](https://github.com/wildbil2me/sentence-app/issues/new?template=classroom_feedback.yml) |
| 🐛 **Bug report** | Something behaved wrong | [Bug report issue](https://github.com/wildbil2me/sentence-app/issues/new?template=bug_report.yml) |
| ✨ **Feature request** | Something's missing | [Feature request issue](https://github.com/wildbil2me/sentence-app/issues/new?template=feature_request.yml) |

**Attach the lesson file.** Export it and paste the JSON into the issue. Most
reports are unreproducible without it, and a real lesson is also the most useful
artifact we can get — it shows how the labels are actually being used.

**Never include student names or student work in an issue.** Anonymize a student
sentence before pasting it. See [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md).

Partial feedback is welcome. "I opened it, didn't understand what to do first,
and closed it" is a complete and extremely useful report.

## What we'll do with it

- **Bugs** get fixed and deployed to the live site; there are no releases to wait
  for.
- **Naming and wording** changes are cheap — a `name` or `desc` edit in
  `labels.js` — and will usually land the same week.
- **New labels** are batched, not applied one at a time, and go through
  [taxonomy-workflow.md](../project/taxonomy-workflow.md).
- **Structural findings** (question 1 or 5 coming back badly) get written up in
  [roadmap.md](../roadmap.md) before anything is built, the way Tier 3 was.

## Known rough edges (report these anyway)

Documented isn't the same as acceptable — if one of these actually bit you in
class, that's exactly what the pilot is for. Say so.

- **Sentence splitting breaks on abbreviations.** "Mr. Darcy" splits after "Mr."
  The fix is the **⤵ Merge next** button, one click.
- **Long sentences scroll sideways** inside their card instead of wrapping.
  Intentional — it's what keeps the label bars aligned under the words — but it's
  awkward on a narrow screen.
- **Selection is whole-word only.** A label can't cover part of a word, and
  punctuation goes with the word it's attached to.
- **No punctuation, run-on/fragment, or verb-tense labels.** Deliberate; see
  [roadmap Tier 3](../roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool).
- **Lessons are per-browser.** Export is the backup, and the only way to move one.
- **Touch devices are the least-tested surface.** Drag-to-select on an iPad is
  the single most likely thing to be broken.
