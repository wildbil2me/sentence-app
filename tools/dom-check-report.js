/* Turn a headless browser dump of tools/dom-check.html into a pass/fail report.
 *
 *   <browser> --headless=new --dump-dom --user-data-dir=<temp> \
 *     "file:///C:/path/to/tools/dom-check.html" > dump.html
 *   node tools/dom-check-report.js dump.html      # or pipe it on stdin
 *
 * Why this exists: the dump contains dom-check.html's own inline <script>, and
 * that source text has the literal strings "PASS", "FAIL", and "FAILURE(S)" in
 * it. Grepping the raw dump therefore reports failures that aren't real. This
 * reads only the <pre id="result"> block the checks actually write into.
 *
 * Exits 1 on any FAIL line, or if the result block is missing/empty — an empty
 * dump (the classic symptom of a wrong file:// URL or a missing temporary
 * --user-data-dir) must not pass silently. */
"use strict";
const fs = require("fs");

const file = process.argv[2];
const html = file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8");

const match = html.match(/<pre id="result">([\s\S]*?)<\/pre>/);
if (!match) {
  console.error("No <pre id=\"result\"> in the dump — the page did not run.");
  console.error("Check the file:// URL (it needs a Windows-style drive, e.g.");
  console.error("file:///C:/dev/sentences/tools/dom-check.html) and that a");
  console.error("temporary --user-data-dir was passed.");
  process.exit(1);
}

const decode = (s) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&");

const lines = decode(match[1]).split("\n").map((l) => l.trim()).filter(Boolean);
const pass = lines.filter((l) => l.startsWith("PASS")).length;
const fails = lines.filter((l) => l.startsWith("FAIL"));

if (!lines.length) {
  console.error("The result block is empty — the checks did not finish.");
  process.exit(1);
}

fails.forEach((l) => console.log(l));
console.log("\n" + pass + " passed, " + fails.length + " failed.");
console.log(lines[lines.length - 1]);
process.exit(fails.length ? 1 : 0);
