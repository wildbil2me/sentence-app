# Sentence Forge color style guide

This guide records the colors currently used by Sentence Forge, what they mean,
and which values sibling apps should share. It describes the implementation as
of July 2026; it is not a proposal for a new palette.

There are two separate systems:

1. **Interface colors** are semantic CSS custom properties with light and dark
   values. They describe a job such as page background, primary action, or
   error state.
2. **Grammar colors** identify a grammatical concept. They are data in
   `js/labels.js`, are the same in both themes, and flow into components through
   the local `--c` custom property.

Keep that distinction in sibling apps. A noun's amber is content data, not the
general warning or success color, even if the same hex happens to appear in
another UI role.

## Interface palette

The canonical values are the two themed `:root` blocks at the top of
`css/styles.css`.

| Token | Dark | Light | Primary function |
|---|---:|---:|---|
| `--bg` | `#0e1016` | `#f4f5fa` | Page and full-screen backdrop. |
| `--bg-soft` | `#141826` | `#eceef6` | Recessed areas: hints, text editors, and quiz stages. |
| `--card` | `#191e2e` | `#ffffff` | Raised surfaces: cards, menus, toasts, and score-ring centers. |
| `--card-2` | `#1f2537` | `#f6f7fc` | Secondary controls and surfaces: buttons, pills, options, and progress tracks. |
| `--line` | `#2b3149` | `#dcdfeb` | Quiet borders, dividers, and inactive control outlines. |
| `--text` | `#edeff7` | `#1c2133` | Primary text and icons. |
| `--muted` | `#9aa3bd` | `#5d6478` | Supporting copy, metadata, captions, inactive states, and secondary labels. |
| `--accent` | `#7c6cf6` | `#5b4bd6` | Brand purple and primary interaction: focus, selection, active controls, and primary progress. |
| `--accent-soft` | `rgba(124, 108, 246, 0.16)` | `rgba(91, 75, 214, 0.12)` | Low-emphasis accent fill, selection fill, and accent glow. |
| `--accent-2` | `#2dd4bf` | `#0d9488` | Secondary teal accent, accent-outline buttons, and the second endpoint of primary gradients. |
| `--danger` | `#f4574d` | `#d43a31` | Destructive affordances, incorrect answers, and error feedback. |
| `--ok` | `#34d399` | `#0e9f6e` | Save confirmation, correct answers, and quiz score. |
| `--hl` | `rgba(255, 214, 79, 0.22)` | `rgba(255, 200, 40, 0.35)` | Background behind the word span currently being called out. |
| `--hl-line` | `#ffd64f` | `#d99c00` | Edge and pulse for the highlighted word span. |
| `--chip-text` | `#10131c` | `#16191f` | Dark foreground on solid grammar-color chips. It does not invert with the theme. |
| `--shadow` | `rgba(0, 0, 0, 0.35)` | `rgba(30, 35, 60, 0.12)` | Color component of the standard raised-surface shadow. |

### How interface colors combine

- Primary buttons and quiz progress use a purple-to-teal gradient from
  `--accent` to `--accent-2`.
- The page has a soft purple wash from `--accent-soft` plus a fixed teal wash,
  `rgba(45, 212, 191, 0.08)`. The latter is atmosphere, not a semantic token.
- Grammar-colored bars, badges, palette options, and feedback states use
  `color-mix()` to tint the current surface. Consumers should mix a grammar or
  status color into their own theme surface rather than copying the resulting
  dark-theme color.
- The top bar mixes `--bg` with transparency so content can show through its
  blur. Transparent values are compositing instructions, not palette entries.

### Brand palette

The theme-independent `:root` block in `css/styles.css` defines the forge-heat
identity used by the top-bar wordmark and the library hero.

| Token | Value | Primary function |
|---|---|---|
| `--forge-gradient` | `#b31217` → `#ff4e00` → `#ff9a00` → `#ffd400` → `#ff9a00` → `#ff4e00` → `#b31217` | Glowing-metal gradient on “Forge” in the brand and animated hero text. |
| `--forge-solid` | `#ff7a1a` | Solid brand orange for the anvil and Alpha badge. |

These are recognizable product identity colors, but they do not communicate an
interaction or status. A sibling app may reuse them to show family branding
without replacing its semantic primary-action color.

## Grammar palette

`js/labels.js` is the source of truth. Renderers set a component-local `--c` to
the label's `color`; CSS then uses it for underlines, chips, bars, swatches, and
quiz choices. A subtype inherits its parent's color unless it declares an
override.

Color reinforces a written abbreviation or name and a component shape; it is
never the only label. Preserve that redundancy in sibling apps.

### Parts of speech

All subtypes inherit the base color in this layer.

| Concept | Color | Primary function |
|---|---:|---|
| Noun | `#f5a623` | Nouns and every noun subtype; also noun phrases and noun clauses. |
| Verb | `#f4574d` | Verbs and every verb subtype; also verb phrases. |
| Adjective | `#4d9df4` | Adjectives and every adjective subtype; also infinitive phrases. |
| Adverb | `#a06bf5` | Adverbs and every adverb subtype; also gerund phrases and relative clauses. |
| Pronoun | `#f57f2c` | Pronouns and every pronoun subtype; also dependent clauses. |
| Preposition | `#1fbfa5` | Prepositions; also prepositional phrases and adverbial clauses. |
| Conjunction | `#ef5da8` | Conjunctions and their subtypes; also participial phrases. |
| Determiner | `#8fc93a` | Determiners and article subtypes. |
| Interjection | `#e3c229` | Interjections; also absolute phrases. |

Grammar colors are not globally unique. Several related constructions repeat a
base color across layers, while a few unrelated concepts also share a value;
always read color together with the written label and its layer.

### Sentence parts

| Concept | Color | Primary function |
|---|---:|---|
| Subject | `#38bdf8` | Broad subject label. |
| Simple subject | `#0ea5e9` | Simple-subject subtype. |
| Complete subject | `#7dd3fc` | Complete-subject subtype. |
| Compound subject | `#2563eb` | Compound-subject subtype. |
| Understood subject | `#bae6fd` | Implied “you” in a command. |
| Predicate | `#fb7185` | Broad predicate label. |
| Simple predicate | `#f43f5e` | Simple-predicate subtype. |
| Complete predicate | `#fda4af` | Complete-predicate subtype. |
| Compound predicate | `#e11d48` | Compound-predicate subtype. |
| Object | `#34d399` | Object and all object subtypes. |
| Complement | `#c084fc` | Complement and all complement subtypes. |
| Appositive | `#fbbf24` | Single-word appositive. |

Subject and predicate subtypes use light/dark variants to distinguish closely
related spans that can coexist in one sentence. Object and complement subtypes
inherit their family color instead.

### Phrases

| Concept | Color | Primary function |
|---|---:|---|
| Noun phrase | `#f5a623` | Noun phrase spans. |
| Verb phrase | `#f4574d` | Verb phrase spans. |
| Prepositional phrase | `#1fbfa5` | Prepositional phrase spans. |
| Verbal phrase | `#8b5cf6` | Broad verbal-phrase label. |
| Gerund phrase | `#a06bf5` | Gerund-phrase subtype. |
| Infinitive phrase | `#4d9df4` | Infinitive-phrase subtype. |
| Participial phrase | `#ef5da8` | Participial-phrase subtype. |
| Appositive phrase | `#2fbf6b` | Appositive phrase spans. |
| Absolute phrase | `#e3c229` | Absolute phrase spans. |

### Clauses

| Concept | Color | Primary function |
|---|---:|---|
| Independent clause | `#38bdf8` | Independent-clause spans. |
| Dependent clause | `#f57f2c` | Broad dependent-clause label. |
| Relative (adjective) clause | `#a06bf5` | Relative-clause subtype. |
| Adverbial clause | `#1fbfa5` | Adverbial-clause subtype. |
| Noun clause | `#f5a623` | Noun-clause subtype. |

## Sentence-type palette

Sentence types classify the whole sentence and are independent of span labels.
Their canonical values also live in `js/labels.js`.

| Axis | Type | Color | Primary function |
|---|---|---:|---|
| Structure | Simple | `#22c55e` | Simple-sentence badge and answer option. |
| Structure | Compound | `#3b82f6` | Compound-sentence badge and answer option. |
| Structure | Complex | `#a855f7` | Complex-sentence badge and answer option. |
| Structure | Compound-complex | `#ec4899` | Compound-complex badge and answer option. |
| Purpose | Declarative | `#0ea5e9` | Declarative-sentence badge and answer option. |
| Purpose | Interrogative | `#f59e0b` | Interrogative-sentence badge and answer option. |
| Purpose | Imperative | `#14b8a6` | Imperative-sentence badge and answer option. |
| Purpose | Exclamatory | `#ef4444` | Exclamatory-sentence badge and answer option. |

## Fixed and decorative colors

These values appear in the site but should not become general-purpose semantic
tokens:

| Value(s) | Use |
|---|---|
| `#f5a623` | Quiz streak counter. This is a decorative reuse of noun amber, not a taxonomy meaning. |
| `#ffffff` | Text on primary/accent count controls and the demo pointer fill. |
| `#10131c` | Demo pointer outline; matches the dark chip-foreground family. |
| `rgba(0, 0, 0, 0.4)` | Demo pointer drop shadow. |
| `#7c6cf6` | Static favicon fill, matching the dark-theme accent. |

The embedded Ko-fi image carries Ko-fi's own brand colors. Treat it as a
third-party asset, not part of the Sentence Forge palette.

## Handoff rules for sibling apps

1. Copy **roles**, not selectors. A sibling app may have different component
   names, but `background`, `surface`, `text`, `muted`, `border`, `primary`,
   `secondary`, `success`, `danger`, and `highlight` should retain these jobs.
2. Keep light and dark values paired. Do not use a dark-theme surface value in
   both modes.
3. Read grammar and sentence-type colors from shared taxonomy data when
   possible. Do not duplicate those values in component CSS.
4. Pass a content color through a local property such as `--c`, then derive
   subtle fills and borders against the current surface. Solid grammar chips
   use `--chip-text`; tinted bars use normal `--text`.
5. Never communicate grammar, correctness, or selection by color alone. Pair it
   with text, abbreviation, border treatment, shape, or iconography.
6. Treat the forge-heat gradient, page washes, confetti, and Ko-fi artwork as
   product decoration. They are optional and should not drive shared app
   semantics.

When this guide and the implementation disagree, `css/styles.css` is canonical
for interface colors and `js/labels.js` is canonical for grammar and
sentence-type colors. Update this guide whenever either palette changes.
