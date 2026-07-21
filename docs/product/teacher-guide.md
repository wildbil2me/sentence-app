# Grammar Lab — teacher guide

Everything you need to run a lesson. No account, nothing to install; if the page
opens, you're ready.

- [Getting started](#getting-started)
- [Building a lesson](#building-a-lesson--the--edit-mode)
- [Teaching with it](#teaching-with-it---present-mode)
- [Student practice](#student-practice---practice-mode)
- [Sharing lessons](#sharing-lessons)
- [Classroom recipes](#classroom-recipes)
- [Troubleshooting](#troubleshooting)

---

## Getting started

Open the app. On first run it seeds itself with **Sample: The Fox and the
River** — four sentences labeled at every level — so there's always something to
click.

The home page (the **library**) has three buttons and two lists:

- **＋ New lesson** — start from a blank passage.
- **⬆ Import JSON** — load a lesson file someone sent you (or that you generated;
  see [AI-assisted authoring](#ai-assisted-authoring)). You can select several
  files at once.
- **📚 Browse examples** — jumps to the built-in library.
- **Your lessons** — everything you've made, newest first. Each card has
  ▶ Present, 🎯 Practice, ✎ Edit, and small buttons to ⬇ export, ⧉ duplicate, and
  ✕ delete.
- **📚 Example library** — seven ready-made, fully labeled passages. **＋ Add to
  my lessons** drops an editable copy into your list; the original is never
  changed, so you can always take a fresh copy.

> **Where lessons live.** In this browser, on this computer — nowhere else. They
> survive closing the tab and restarting the machine, but *not* clearing site
> data, a different browser, or a school image that wipes profiles. **Export
> anything you'd be upset to lose.**

The ☀️ / 🌙 button in the top-right toggles dark and light. Dark is a better
projector; light prints and screenshots better.

## Building a lesson — the ✎ Edit mode

### 1. Paste the passage

Paste anything — a paragraph from the novel you're on, a student sentence
(anonymized), a quotation. Grammar Lab splits it into sentences, one card each.

The splitter is deliberately simple, so "Mr. Darcy" splits after "Mr." Fix any
bad split with the **⤵ Merge next** button on the card ("Join with the next
sentence"). You can also edit a sentence's text directly, or delete a sentence.

### 2. Choose your teaching levels

Four toggles at the top set which levels this lesson uses:

| Level | The unit | Example labels |
|---|---|---|
| **Parts of Speech** | one word | Noun, Verb, Proper Noun, Linking Verb |
| **Sentence Parts** | a functional group of words | Subject, Complete Predicate, Direct Object |
| **Phrases** | a phrase | Prepositional Phrase, Participial Phrase |
| **Clauses** | a clause | Independent Clause, Relative Clause |

Turn off the levels you aren't teaching and the palette shrinks to match. You
can turn one back on mid-unit without touching what's already labeled.

Below the toggles is **Essential only**. Grammar Lab has 87 labels; four of them
(Object Complement, Particle, Relative Adverb, Emphatic Pronoun) are marked
Advanced. The toggle hides those from the picker. It only narrows *the picker* —
anything already labeled keeps showing everywhere.

### 3. Label the words

**Drag across the words you want, or click a single word, then pick a label.**
Selection always snaps to whole words — a label can't cover half of one.

The palette groups labels by family. Click a base label (**Noun**) to apply it,
or open it to drill down to a specific type (**Proper Noun**, **Collective
Noun**). A subtype behaves exactly like its base — same color family, same quiz
treatment — so start broad and get specific as the unit progresses.

**Layers overlap on purpose.** The words *the frozen river* can be a
`determiner` + `adjective` + `noun` at the word level, a **noun phrase**, and
part of the **complete predicate**, all at once. Each level draws separately.

Click any label you've placed to **add a teaching note** or remove it. Notes are
where the lesson actually lives:

> *"Ask: who is this sentence about?"*
> *"It tells WHY she moved carefully."*
> *"Still ONE clause — a compound subject and predicate do not make a compound
> sentence."*

They surface in Present mode and again in quiz feedback, which means a note you
write once gets read at the two moments a student needs it.

### 4. Tag each sentence's type

Chips on each sentence card set two independent axes:

- **Structure** — simple · compound · complex · compound-complex
- **Purpose** — declarative · interrogative · imperative · exclamatory

Both are optional. Tagged sentences get badges in Present mode and become
"name that sentence" questions in Practice.

### AI-assisted authoring

To label a long passage quickly, use the prompt in
[custom-gpt-instructions.md](../custom-gpt-instructions.md) to set up a custom
GPT. Paste a passage, save what it returns as a `.json` file, and **⬆ Import
JSON**.

Treat its output as a **first draft you review**, not an answer key. It will
occasionally mislabel a gerund or draw a clause boundary one word wide — open the
lesson in Edit mode and fix it before class. (That review step is the point: it's
faster than labelling from scratch, and you stay the authority in the room.)

## Teaching with it — ▶ Present mode

One sentence at a time, sized for a projector. **Every level starts hidden.**

The teaching move is to build the sentence up:

1. Start bare. *"Read it. What's happening in this sentence?"*
2. Turn on **Parts of Speech**. Chips appear over each word.
3. Turn on **Sentence Parts**. Bars appear underneath. *"So where does the
   subject end?"*
4. Add **Phrases**, then **Clauses**, as the unit calls for.

**Click any label or badge** for a popover with its definition, a generic
example, and your note — that's your answer when a student asks "wait, what's a
predicate nominative again?" without you needing to remember the textbook wording.

**← / →** move between sentences, so you can drive the whole thing from a clicker
or the keyboard while facing the room.

Long sentences scroll sideways inside their card rather than wrapping, which
keeps every bar aligned under its words.

## Student practice — 🎯 Practice mode

Students pick what to practice — any combination of the labeling levels and/or
sentence types — and a question count. Questions are generated from the labels
already on the passage, so **practice is always about the sentences you just
taught**.

Three question types:

| Type | Looks like |
|---|---|
| **Identify** | *"What is the **highlighted** word?"* — multiple choice |
| **Select** | *"Select the direct object"* — drag across the words, press Check |
| **Classify** | *"What is the structure of this sentence?"* — multiple choice |

Wrong answers aren't random: distractors come from the same label family, so a
gerund's alternatives are other verbals, not "Interjection". Feedback is
immediate and includes your teaching note. The results screen ends with **"Worth
another look:"** — the specific labels that were missed.

Nothing is recorded. There is no score to collect, which makes this safe for
low-stakes practice: a student can fail a question with no consequence, which is
the only way they'll guess honestly.

## Sharing lessons

A lesson is a plain JSON file. **⬇** on any lesson card downloads it as
`your-lesson-title.grammar-lab.json`.

That file is how you:

- **Move a lesson between machines** — laptop to classroom desktop, home to
  school. Export, email/drive it, **⬆ Import JSON** on the other end.
- **Give students a lesson to practice on** — post the file to Google Classroom
  with a link to the app. They import it and go to Practice.
- **Hand a lesson to a colleague** — including a whole department's worth at
  once; import accepts multiple files in one go.
- **Back up your work** — see the warning about localStorage above.

Import is forgiving: anything it can't understand (an unknown label, a span that
matches nothing) is skipped with a warning in the browser console, and the rest
of the lesson still loads.

The format is documented for teachers in
[grammar-reference.md](grammar-reference.md) and precisely in
[project/lesson-json.md](../project/lesson-json.md).

## Classroom recipes

**Bell-ringer.** Present one sentence from last night's reading with all levels
off. Students name the subject and predicate on paper; reveal Sentence Parts to
check. Three minutes.

**Building a unit across a week.** Make one lesson from a passage and enable only
Parts of Speech on Monday. Add Sentence Parts on Tuesday, Phrases Wednesday,
Clauses Thursday. Same passage all week — the sentence gets familiar and the
structure gets visible.

**Their own writing.** Paste three anonymized sentences from student drafts.
Label the clause structure. Present it and ask which one is a run-on. (Grammar
Lab won't diagnose that for you — the point is that students diagnose it from the
clause bars.)

**Sub plans.** Export a lesson, leave the file and the app link. Practice mode
needs no teacher.

**Stations / centers.** Different lesson file at each station, all on Practice
with a 10-question count.

## Troubleshooting

**"My lessons disappeared."** Most likely a different browser, a different
profile, or cleared site data — lessons are stored per browser. This is why
exporting matters. If a district image resets machines nightly, treat exported
files as the real storage and re-import each time.

**"A sentence split in the wrong place."** Press **⤵ Merge next** on the card.
Abbreviations (Mr., Dr., St.) and initials are the usual cause.

**"I can't label part of a word."** Correct — spans always cover whole words,
punctuation included. This is what keeps the bars aligned under the text.

**"My import showed a warning."** The lesson still loaded; something in it was
skipped. Press F12 → Console for the specific line. Usually a `match` string that
doesn't appear in the sentence exactly, or a label id that's misspelled.

**"The quiz has no questions."** A lesson needs labels to generate from — check
that the levels you selected in the setup screen are actually annotated in the
lesson.

**"Nothing works / the page is blank."** Press F12 → Console and
[open an issue](https://github.com/YOUR-GITHUB-USERNAME/grammar-lab/issues/new?template=bug_report.yml) with what's in red,
your browser, and the lesson file if one's involved.
