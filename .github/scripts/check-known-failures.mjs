// Guard e2e/automation/data/known_failures.json against the two ways test.fail() can lie.
// Usage:
//   node check-known-failures.mjs ids     <known_failures.json> <playwright --list JSON>
//   node check-known-failures.mjs reasons <known_failures.json> <playwright run JSON>
// `ids`     every entry is complete and names a test that exists (a renamed or deleted
//           test would otherwise leave a stale entry behind).
// `reasons` every listed case that failed as expected failed with its recorded message
//           (a broken selector or setup step would otherwise count as the known defect).
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
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

const problems = [];

if (mode === 'ids') {
  const ids = new Set(specs.map(idOf));
  for (const [id, entry] of Object.entries(known)) {
    if (!ids.has(id)) problems.push(`${id}: no test has this ID`);
    for (const field of ['bug', 'kind', 'issue']) {
      if (typeof entry[field] !== 'string' || !entry[field]) problems.push(`${id}: missing ${field}`);
    }
    const signature = entry.expect_error;
    if (!Array.isArray(signature) || !signature.length || signature.some((s) => typeof s !== 'string' || !s)) {
      problems.push(`${id}: expect_error must be a non-empty list of non-empty strings`);
    }
  }
  console.log(`Checked ${Object.keys(known).length} known-failure entries against ${ids.size} test IDs.`);
} else if (mode === 'reasons') {
  let checked = 0;
  for (const spec of specs) {
    const entry = known[idOf(spec)];
    if (!entry) continue;
    for (const test of spec.tests) {
      // Only an expected failure can hide a wrong reason; an unexpected pass already fails the job.
      if (test.status !== 'expected') continue;
      checked++;
      const messages = test.results
        .flatMap((result) => result.errors ?? [])
        .map((error) => stripAnsi(error.message ?? ''));
      const matched = messages.some((message) => entry.expect_error.every((part) => message.includes(part)));
      if (!matched) {
        const actual = messages[0]?.split('\n').find((line) => line.trim()) ?? '(no error recorded)';
        problems.push(
          `${idOf(spec)} [${test.projectName}]: failed, but not with ${JSON.stringify(entry.expect_error)}; ` +
          `first error was: ${actual.trim()}`,
        );
      }
    }
  }
  console.log(`Checked the failure reason of ${checked} expected failures.`);
} else {
  console.error('Usage: node check-known-failures.mjs <ids|reasons> <known_failures.json> <report.json>');
  process.exit(2);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s) in known_failures.json:`);
  for (const problem of problems) console.log(`- ${problem}`);
  process.exitCode = 1;
}
