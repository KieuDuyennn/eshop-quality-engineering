// Guard e2e/automation/data/known_failures.json against stale entries.
// Usage:
//   node check-known-failures.mjs ids <known_failures.json> <playwright --list JSON>
// `ids`     every entry is complete and names a test that exists (a renamed or deleted
//           test would otherwise leave a stale entry behind).
import { readFileSync } from 'node:fs';

const [mode, knownPath, reportPath] = process.argv.slice(2);
const known = JSON.parse(readFileSync(knownPath, 'utf8')).cases;
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

function* allSpecs(suite) {
  yield* suite.specs ?? [];
  for (const child of suite.suites ?? []) yield* allSpecs(child);
}
const specs = report.suites.flatMap((suite) => [...allSpecs(suite)]);
// Same rule as fixtures/test-fixtures.ts: the tc_id is the first word of the title.
const idOf = (spec) => spec.title.split(' ')[0];

const problems = [];

if (mode === 'ids') {
  const ids = new Set(specs.map(idOf));
  for (const [id, entry] of Object.entries(known)) {
    if (!ids.has(id)) problems.push(`${id}: no test has this ID`);
    for (const field of ['bug', 'kind', 'issue']) {
      if (typeof entry[field] !== 'string' || !entry[field]) problems.push(`${id}: missing ${field}`);
    }
  }
  console.log(`Checked ${Object.keys(known).length} known-failure entries against ${ids.size} test IDs.`);
} else {
  console.error('Usage: node check-known-failures.mjs ids <known_failures.json> <report.json>');
  process.exit(2);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s) in known_failures.json:`);
  for (const problem of problems) console.log(`- ${problem}`);
  process.exitCode = 1;
}
