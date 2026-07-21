/* Logic-layer smoke test for Sentence Forge (no DOM needed).
 * Run with: node tools/smoke-test.js
 * Also regenerates samples/sample-lesson.json from the in-app sample. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const storage = new Map();
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
  Date,
  Math,
  JSON,
  String,
  Array,
  Object,
  setTimeout,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const f of ["labels.js", "tokenize.js", "store.js", "examples.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), sandbox, { filename: f });
}
const wjt = sandbox.wjt;

let failures = 0;
function check(name, cond) {
  console.log((cond ? "  ok  " : " FAIL ") + name);
  if (!cond) failures++;
}

// --- tokenize / splitSentences ---
const sents = wjt.splitSentences('The fox ran. "Wait!" she said… Did it stop?\nNew line here');
check("splitSentences finds 5 sentences", sents.length === 5);
check("splitSentences keeps closing quote", sents[1] === '"Wait!"');

const toks = wjt.tokenize("The quick fox.");
check("tokenize: 3 tokens", toks.length === 3);
check("tokenize offsets", toks[2].start === 10 && toks[2].end === 14 && toks[2].text === "fox.");

const range = wjt.spanToTokens(toks, 5, 9); // "quick" exactly (chars 4..9)
check("spanToTokens snaps to token", range.first === 1 && range.last === 1);
const snap = wjt.spanToTokens(toks, 6, 11); // straddles quick+fox.
check("spanToTokens snaps outward", snap.first === 1 && snap.last === 2);
const span = wjt.tokensToSpan(toks, 1, 2);
check("tokensToSpan", span.start === 4 && span.end === 14);

// --- taxonomy sanity ---
const layerCounts = {};
for (const id of Object.keys(wjt.LABELS)) {
  const l = wjt.LABELS[id];
  check("label " + id + " has valid layer", !!wjt.LAYERS[l.layer]);
  layerCounts[l.layer] = (layerCounts[l.layer] || 0) + 1;
}
for (const layer of wjt.LAYER_ORDER) {
  check("layer " + layer + " has >= 4 labels (quiz distractors)", layerCounts[layer] >= 4);
}

// --- subtype (drill-down) taxonomy ---
for (const id of Object.keys(wjt.LABELS)) {
  const l = wjt.LABELS[id];
  if (!l.parent) continue;
  const p = wjt.LABELS[l.parent];
  check("subtype " + id + " has an existing parent", !!p);
  // Layer is always inherited. Color is inherited by default, but a subtype may
  // override it with its own shade (the subject/predicate/clause/phrase families
  // do, so their variants stay distinguishable in a rendered diagram).
  check("subtype " + id + " inherited layer, and has a color",
    !!l.layer && !!l.color && p && l.layer === p.layer);
  check("subtype " + id + " familyOf resolves to parent", wjt.familyOf(id) === l.parent);
  check("subtype " + id + " is not itself a parent (taxonomy stays one level deep)",
    wjt.childrenOf(id).length === 0);
}
// --- tier tagging (Tier 1e) ---
for (const id of Object.keys(wjt.LABELS)) {
  check("label " + id + " has a valid tier", wjt.TIERS.includes(wjt.LABELS[id].tier));
}
check("advanced labels are tagged advanced",
  ["object-complement", "particle", "relative-adverb", "emphatic-pronoun"]
    .every((id) => wjt.LABELS[id].tier === "advanced" && !wjt.isEssential(id)));
check("untagged labels default to essential",
  wjt.LABELS.noun.tier === "essential" && wjt.isEssential("gerund"));

// --- essential-only palette filter (Tier 1.5) ---
const posLabels = wjt.labelsForLayer("pos");
const posEssential = wjt.filterTier(posLabels, true);
check("filterTier drops advanced labels", posEssential.length < posLabels.length &&
  posEssential.every((id) => wjt.isEssential(id)) && !posEssential.includes("particle"));
check("filterTier is a pass-through when off", wjt.filterTier(posLabels, false) === posLabels);
check("every layer keeps labels under essential-only",
  wjt.LAYER_ORDER.every((layer) => wjt.filterTier(wjt.labelsForLayer(layer), true).length > 0));
check("every advanced label has an essential parent to hang under",
  Object.keys(wjt.LABELS).filter((id) => !wjt.isEssential(id))
    .every((id) => wjt.LABELS[id].parent && wjt.isEssential(wjt.LABELS[id].parent)));

// --- word-level verbals + POS gaps (Tier 1c/1d) ---
check("word-level verbals exist under verb",
  ["gerund", "participle", "infinitive"].every((id) => wjt.childrenOf("verb").includes(id)));
check("verbals are distinct from the verbal phrases",
  ["gerund-phrase", "participial-phrase", "infinitive-phrase"]
    .every((id) => wjt.LABELS[id].layer === "phrase") &&
  ["gerund", "participle", "infinitive"].every((id) => wjt.LABELS[id].layer === "pos"));
check("POS gaps filled",
  ["regular-verb", "irregular-verb", "particle"].every((id) => wjt.childrenOf("verb").includes(id)) &&
  wjt.childrenOf("adverb").includes("relative-adverb") &&
  wjt.childrenOf("pronoun").includes("emphatic-pronoun"));

check("articles exist under determiner",
  ["article", "definite-article", "indefinite-article"].every((id) => wjt.childrenOf("determiner").includes(id)));
check("noun/verb/pronoun/adjective/adverb have drill-down types",
  ["noun", "verb", "pronoun", "adjective", "adverb"].every((id) => wjt.childrenOf(id).length >= 4));
check("baseLabelsForLayer excludes subtypes",
  wjt.baseLabelsForLayer("pos").every((id) => !wjt.LABELS[id].parent) &&
  wjt.baseLabelsForLayer("pos").includes("noun"));

// --- consistent drill-down on every layer (Tier 2) ---
check("every layer advertises subtypes",
  wjt.LAYER_ORDER.every((layer) => wjt.layerHasSubtypes(layer)));
check("2a: subject family",
  ["simple-subject", "complete-subject", "compound-subject", "understood-subject"]
    .every((id) => wjt.childrenOf("subject").includes(id)));
check("2a: predicate family",
  ["simple-predicate", "complete-predicate", "compound-predicate"]
    .every((id) => wjt.childrenOf("predicate").includes(id)));
check("2a: parts layer reads as four families",
  wjt.baseLabelsForLayer("part").join(",") === "subject,predicate,object,complement,appositive");
check("2b: dependent-clause parents the three dependent subtypes",
  ["relative-clause", "adverbial-clause", "noun-clause"]
    .every((id) => wjt.childrenOf("dependent-clause").includes(id)) &&
  wjt.childrenOf("independent-clause").length === 0);
check("2c: verbal-phrase parents the three verbal phrases, others stay flat",
  ["gerund-phrase", "participial-phrase", "infinitive-phrase"]
    .every((id) => wjt.childrenOf("verbal-phrase").includes(id)) &&
  ["noun-phrase", "verb-phrase", "prepositional-phrase", "appositive-phrase", "absolute-phrase"]
    .every((id) => !wjt.LABELS[id].parent));
check("reparenting preserved every label id used by the samples",
  ["simple-subject", "complete-subject", "compound-subject", "simple-predicate",
   "complete-predicate", "compound-predicate", "relative-clause", "adverbial-clause",
   "noun-clause", "gerund-phrase", "participial-phrase", "infinitive-phrase"]
    .every((id) => !!wjt.LABELS[id]));

// --- sentence-type taxonomy ---
for (const cat of wjt.SENTENCE_TYPE_ORDER) {
  const c = wjt.SENTENCE_TYPES[cat];
  check("sentence type axis '" + cat + "' has options", !!c && Object.keys(c.options).length >= 2);
  for (const optId of Object.keys(c.options)) {
    const o = c.options[optId];
    check("type option " + cat + "." + optId + " has name/color/desc", !!(o.name && o.color && o.desc));
  }
}
check("sentenceTypeOption resolves", wjt.sentenceTypeOption("structure", "compound").name === "Compound");
check("isSentenceType rejects bad values",
  !wjt.isSentenceType("structure", "nope") && !wjt.isSentenceType("nope", "simple"));

// --- sample lesson integrity ---
let warned = false;
const origWarn = console.warn;
console.warn = (...a) => { warned = true; origWarn(...a); };
const sample = wjt.buildSampleLesson();
console.warn = origWarn;
check("sample lesson: no unmatched annotation text", !warned);
check("sample lesson: 4 sentences", sample.sentences.length === 4);
for (const s of sample.sentences) {
  for (const a of s.annotations) {
    const tokens = wjt.tokenize(s.text);
    const r = wjt.spanToTokens(tokens, a.start, a.end);
    const sp = wjt.tokensToSpan(tokens, r.first, r.last);
    check("sample ann on token boundaries: " + a.label + " '" + s.text.slice(a.start, a.end) + "'",
      sp.start === a.start && sp.end === a.end && !!wjt.LABELS[a.label]);
  }
  if (s.types) {
    for (const cat of Object.keys(s.types)) {
      check("sample sentence type valid: " + cat + "=" + s.types[cat], wjt.isSentenceType(cat, s.types[cat]));
    }
  }
}
check("sample lesson: every sentence carries a type", sample.sentences.every((s) => s.types && s.types.structure && s.types.purpose));

// --- export -> import round trip ---
const exported = wjt.exportLesson(sample);
const { lesson: reimported, warnings } = wjt.importLesson(exported);
check("round trip: no warnings", warnings.length === 0);
check("round trip: sentence count", reimported.sentences.length === sample.sentences.length);
check("round trip: annotation counts", reimported.sentences.every(
  (s, i) => s.annotations.length === sample.sentences[i].annotations.length));
check("round trip: offsets preserved", reimported.sentences.every(
  (s, i) => s.annotations.every((a, j) => {
    const o = sample.sentences[i].annotations[j];
    return a.start === o.start && a.end === o.end && a.label === o.label;
  })));
check("round trip: sentence types preserved", reimported.sentences.every(
  (s, i) => JSON.stringify(s.types || null) === JSON.stringify(sample.sentences[i].types || null)));

// --- essentialOnly round trip ---
check("new lessons default to the full palette", wjt.store.create("x").essentialOnly === false);
check("export omits essentialOnly when off", !("essentialOnly" in exported));
const essOn = wjt.exportLesson(Object.assign({}, sample, { essentialOnly: true }));
check("export writes essentialOnly when on", essOn.essentialOnly === true);
check("import restores essentialOnly", wjt.importLesson(essOn).lesson.essentialOnly === true);
check("import defaults essentialOnly to false", wjt.importLesson(exported).lesson.essentialOnly === false);

// --- import with "match" addressing + bad data ---
const handWritten = {
  format: "sentence-forge-lesson",
  title: "Hand written",
  sentences: [
    { text: "The dog barked loudly.", annotations: [
      { match: "dog", label: "noun" },
      { match: "barked loudly.", label: "predicate" },
      { match: "not present", label: "noun" },
      { start: 0, end: 3, label: "bogus-label" },
      { start: 900, end: 901, label: "verb" },
    ]},
    "A bare string sentence works too.",
  ],
};
const hw = wjt.importLesson(handWritten);
check("import: match addressing resolves", hw.lesson.sentences[0].annotations.length === 2);
check("import: match offsets correct",
  hw.lesson.sentences[0].annotations[0].start === 4 && hw.lesson.sentences[0].annotations[0].end === 7);
check("import: bad entries produce warnings", hw.warnings.length === 3);
check("import: bare string sentence accepted", hw.lesson.sentences[1].text === "A bare string sentence works too.");
check("import: layers inferred", hw.lesson.layers.includes("part"));

let threw = false;
try { wjt.importLesson({ title: "no sentences" }); } catch (e) { threw = true; }
check("import: missing sentences throws", threw);

// --- import sentence types (valid, partial, bogus) ---
const withTypes = wjt.importLesson({
  format: "sentence-forge-lesson",
  title: "Types",
  sentences: [
    { text: "The dog barked.", types: { structure: "simple", purpose: "declarative" } },
    { text: "Run fast!", types: { structure: "compound", purpose: "bogus" } },
    { text: "No types here." },
  ],
});
check("import: valid types kept", withTypes.lesson.sentences[0].types.purpose === "declarative");
check("import: partial types — good kept, bad dropped",
  withTypes.lesson.sentences[1].types.structure === "compound" && !withTypes.lesson.sentences[1].types.purpose);
check("import: bad type produces warning", withTypes.warnings.some((w) => /bogus/.test(w)));
check("import: sentence without types has none", !withTypes.lesson.sentences[2].types);

// --- store CRUD ---
const l1 = wjt.store.save(wjt.store.create("Test A"));
wjt.store.save(wjt.store.create("Test B"));
check("store: list has 2", wjt.store.list().length === 2);
check("store: get", wjt.store.get(l1.id).title === "Test A");
const dup = wjt.store.duplicate(l1.id);
check("store: duplicate", dup.title === "Test A (copy)" && wjt.store.list().length === 3);
wjt.store.remove(l1.id);
check("store: remove", wjt.store.list().length === 2 && !wjt.store.get(l1.id));

// --- write the sample JSON file for the samples/ folder ---
fs.mkdirSync(path.join(root, "samples"), { recursive: true });
fs.writeFileSync(
  path.join(root, "samples", "sample-lesson.json"),
  JSON.stringify(exported, null, 2) + "\n"
);
console.log("\nWrote samples/sample-lesson.json");

// --- validate every built-in example + emit its JSON ---
console.log("\n-- examples --");
wjt.EXAMPLES.forEach((ex) => {
  let warned = false;
  const w = console.warn;
  console.warn = (...a) => { warned = true; w(...a); };
  const lesson = ex.build();
  console.warn = w;
  check("example " + ex.id + ": no unmatched annotation text", !warned);
  check("example " + ex.id + ": has sentences", lesson.sentences.length > 0);

  let allOnBoundaries = true;
  let total = 0;
  let typesOk = true;
  lesson.sentences.forEach((s) => {
    const tokens = wjt.tokenize(s.text);
    s.annotations.forEach((a) => {
      total++;
      const r = wjt.spanToTokens(tokens, a.start, a.end);
      if (!r) { allOnBoundaries = false; return; }
      const sp = wjt.tokensToSpan(tokens, r.first, r.last);
      if (sp.start !== a.start || sp.end !== a.end || !wjt.LABELS[a.label]) allOnBoundaries = false;
    });
    if (s.types) Object.keys(s.types).forEach((cat) => {
      if (!wjt.isSentenceType(cat, s.types[cat])) typesOk = false;
    });
  });
  check("example " + ex.id + ": all " + total + " annotations valid & on boundaries", allOnBoundaries);
  check("example " + ex.id + ": sentence types valid", typesOk);

  const rt = wjt.importLesson(wjt.exportLesson(lesson));
  check("example " + ex.id + ": round-trips with no warnings", rt.warnings.length === 0);

  fs.writeFileSync(
    path.join(root, "samples", ex.id + ".sentence-forge.json"),
    JSON.stringify(wjt.exportLesson(lesson), null, 2) + "\n"
  );
  console.log("  wrote samples/" + ex.id + ".sentence-forge.json");
});

console.log(failures ? "\n" + failures + " FAILURE(S)" : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
