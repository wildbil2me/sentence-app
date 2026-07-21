/* Validate lesson JSON against the real importer, outside the browser.
 *
 *   node tools/validate-lesson.js my-lesson.json           one file
 *   node tools/validate-lesson.js samples/*.json           several
 *   node tools/validate-lesson.js docs/custom-gpt-instructions.md
 *   node tools/validate-lesson.js --complete samples/*.json   strict coverage
 *
 * A .md argument is scanned for ```json fenced blocks that look like lessons —
 * that's how the documented examples are kept honest.
 *
 * With --complete, each lesson is additionally checked for full annotation
 * coverage (every word has a part of speech; every complete sentence has a
 * subject and predicate per clause) via tools/completeness.js.
 *
 * Exits non-zero if any file is rejected or produces an import warning, so it
 * doubles as a check on hand-written and AI-generated lessons before a teacher
 * ever imports one. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { checkLesson } = require("./completeness.js");

const root = path.join(__dirname, "..");
const store = new Map();
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  Date, Math, JSON, String, Array, Object, setTimeout,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ["labels.js", "tokenize.js", "store.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), sandbox, { filename: f });
}
const wjt = sandbox.wjt;

const args = process.argv.slice(2);
const strict = args.includes("--complete");
const files = args.filter((a) => a !== "--complete");
if (!files.length) {
  console.error("usage: node tools/validate-lesson.js [--complete] <file.json|file.md> [...]");
  process.exit(2);
}

let problems = 0;

/** One parsed candidate lesson → PASS/FAIL line. */
function validate(where, data) {
  let result;
  try {
    result = wjt.importLesson(data);
  } catch (e) {
    console.log(" REJECTED  " + where + " — " + e.message);
    problems++;
    return;
  }
  const anns = result.lesson.sentences.reduce((n, s) => n + s.annotations.length, 0);
  const summary = result.lesson.sentences.length + " sentences, " + anns + " annotations, layers: " +
    result.lesson.layers.join("/");
  if (result.warnings.length) {
    console.log(" WARNINGS  " + where + " — " + summary);
    result.warnings.forEach((w) => console.log("           · " + w));
    problems++;
  } else {
    console.log("     ok    " + where + " — " + summary);
  }
  if (strict) {
    const comp = checkLesson(result.lesson, wjt);
    comp.notes.forEach((n) => console.log("           ~ " + n));
    if (comp.errors.length) {
      console.log(" INCOMPLETE " + where);
      comp.errors.forEach((e) => console.log("           · " + e));
      problems++;
    }
  }
}

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");

  if (file.endsWith(".md")) {
    const blocks = [...raw.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
    let found = 0;
    blocks.forEach((block, i) => {
      let data;
      try { data = JSON.parse(block); } catch (e) { return; } // prose snippets / schema sketches
      if (!data || !Array.isArray(data.sentences)) return;    // not a whole lesson
      found++;
      validate(file + " (json block " + (i + 1) + ")", data);
    });
    if (!found) console.log("     --    " + file + " — no complete lesson examples found");
    continue;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.log(" UNPARSED  " + file + " — " + e.message);
    problems++;
    continue;
  }
  validate(file, data);
}

if (problems) {
  console.log("\n" + problems + " file(s) with problems.");
  process.exit(1);
}
console.log("\nAll lessons valid.");
