# Sentence Forge — product overview

**One sentence:** a teacher pastes any paragraph, labels its grammar once, and
gets both a projector-ready walkthrough and a self-checking student quiz out of
the same file.

---

## The problem

Sentence structure is taught with three tools that don't talk to each other:

1. **A textbook** with prepared example sentences that nobody in the room wrote
   and nobody cares about.
2. **A whiteboard**, where the teacher redraws the same underlines and arrows
   every period — and where the work disappears at the end of class.
3. **A worksheet**, which is the only part students actually practice on, and
   which is usually about *different* sentences than the ones just modeled.

The passage a class is actually reading — the Gatsby paragraph, the lab report,
the student's own draft — is the sentence a teacher most wants to break down,
and it is the one no textbook has an answer key for. Making one by hand costs an
evening. So the modeling happens on the board, the practice happens on generic
sentences, and the connection between them is left to the student.

## What Sentence Forge does

One artifact — a **lesson** — serves all three jobs.

| | |
|---|---|
| **✎ Edit** | Paste a paragraph. It splits into sentences. Drag across words and pick a label — parts of speech, sentence parts, phrases, clauses. Attach a teaching note to anything. |
| **▶ Present** | The same passage, projector-sized, one sentence at a time, with every layer hidden. Turn layers on one at a time to build the breakdown live. Click any label for its definition, an example, and your note. |
| **🎯 Practice** | Auto-generated questions from the labels already on the passage. "What is the highlighted word?" "Select the direct object." "What structure is this sentence?" Instant feedback, and a results screen naming what to review. |

Because Practice is generated from the annotations, **the quiz is always about
the exact sentences that were just taught** — there is no second authoring step,
and no drift between the model and the practice.

## Who it's for

- **Primary — the middle- and high-school English teacher** who teaches grammar
  inside literature rather than as a separate unit, and who wants today's
  passage broken down rather than the textbook's.
- **Also — students**, working alone in Practice mode on a lesson their teacher
  built or handed them as a file.
- **Also — anyone teaching ESL/EFL or writing support**, where the same
  passage often needs to be re-examined at several levels of granularity.

Assume a shared or locked-down school machine, an inconsistent browser, and a
teacher who has five minutes before the bell.

## Principles

These are the constraints that decide arguments about features.

1. **No account, no server, no setup.** Open a page and use it. Nothing to
   install, nothing to log into, nothing to provision through a district IT
   ticket. It works from a USB stick, offline, double-clicked.
2. **The teacher's judgment is the source of truth.** The app never guesses the
   grammar. There is no auto-parser, so there is nothing to argue with and
   nothing to quietly get wrong in front of a class. Every label on the screen
   is one a teacher put there.
3. **Author once, use three ways.** Any feature that makes a teacher label the
   same passage twice is the wrong feature.
4. **A lesson is a file.** Sharing a lesson means sending JSON — to a colleague,
   into a Google Classroom post, into a repository. No sharing infrastructure to
   build, and no lock-in: the format is documented and plain text.
5. **Match the textbook's vocabulary, not a linguist's.** Labels are named the
   way an English teacher names them ("predicate nominative", not "nominal
   complement"), and the ~87-label set can be trimmed to a classroom core with
   one toggle.
6. **Show structure by building it up.** Present mode starts with a bare
   sentence on purpose. Revealing layers in sequence *is* the lesson.

## Deliberate non-goals

Saying no to these keeps the app teachable in five minutes:

- **No automatic parsing or AI labelling inside the app.** (You can generate a
  lesson *outside* it — see [custom-gpt-instructions.md](../custom-gpt-instructions.md)
  — and import the result, which keeps the teacher in the reviewing seat.)
- **No gradebook, no rosters, no student accounts.** Practice mode scores a
  session and forgets it. Nothing to protect means no student-data obligations.
- **No punctuation, usage-error, verb-tense, or Reed–Kellogg-diagram layers.**
  Each breaks the core model — every annotation is a span over whole words — and
  each is documented as a sibling-app idea in [roadmap.md](../roadmap.md#tier-3--out-of-scope-for-this-app-documented-for-a-sibling-tool).
- **No collaborative editing or cloud sync.** Export/import is the sharing story.
- **No build step or framework.** See
  [project/architecture.md](../project/architecture.md); this is a product
  decision as much as a technical one, because it's what makes the app survive a
  school laptop.

## What's built today

- Four annotation layers with **87 labels**, every layer supporting drill-down
  from a base label (Noun) to a specific type (Collective Noun). Full inventory:
  [grammar-reference.md](grammar-reference.md).
- Whole-sentence **type badges** on two axes — structure (simple / compound /
  complex / compound-complex) and purpose (declarative / interrogative /
  imperative / exclamatory).
- An **"Essential only"** toggle that trims the palette to the classroom-core
  83 labels without hiding anything already placed.
- Three question types in Practice, with distractors drawn from the same label
  family so wrong answers are the ones worth ruling out.
- A **library of seven ready-made passages** — a starter demo plus Shakespeare,
  Fitzgerald, Shelley, and Stoker — each fully labeled and copyable.
- **Import / export JSON**, dark and light themes, keyboard navigation in
  Present mode.

## Where it's going next

The near-term plan is a **classroom pilot** rather than more features — see
[pilot.md](pilot.md). The taxonomy is deliberately frozen during the pilot
unless a teacher hits a real gap, because the open question is whether the
Edit → Present → Practice loop survives a live class period, not whether label
number 88 exists.
