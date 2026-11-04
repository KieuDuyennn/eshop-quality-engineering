// Turn a Playwright JSON report into a Markdown summary for the GitHub job page.
// Usage: node e2e-summary.mjs <report.json> <browser>
import { readFileSync, existsSync } from 'node:fs';

const [reportPath, browser] = process.argv.slice(2);

if (!existsSync(reportPath)) {
  console.log(`### E2E - ${browser}\n\nNo JSON report found at \`${reportPath}\`; the run did not finish.`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const { stats } = report;

// Playwright counts a test.fail() case that did fail as "expected", the same as a
// pass, so the known-defect cases are split out by their `fail` annotation.
function* allTests(suite) {
  for (const spec of suite.specs ?? []) yield* spec.tests;
  for (const child of suite.suites ?? []) yield* allTests(child);
}
const tests = report.suites.flatMap((suite) => [...allTests(suite)]);
const isKnown = (t) => t.annotations.some((a) => a.type === 'fail');
const knownDefects = tests.filter((t) => isKnown(t) && t.status === 'expected').length;
// A known-defect case that passed is "unexpected": its defect looks fixed.
const fixed = tests.filter((t) => isKnown(t) && t.status === 'unexpected').length;
const newFailures = stats.unexpected - fixed;

const total = stats.expected + stats.unexpected + stats.flaky + stats.skipped;
const minutes = (stats.duration / 60000).toFixed(1);

console.log(`### E2E - ${browser}

| Total | Passed | Known defects | New failures | Defect fixed? | Flaky | Skipped | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ${total} | ${stats.expected - knownDefects} | ${knownDefects} | ${newFailures} | ${fixed} | ${stats.flaky} | ${stats.skipped} | ${minutes} min |

Known defects are cases listed in \`e2e/automation/data/known_failures.json\`; they fail as expected and do not fail the job.
A non-zero "Defect fixed?" means a listed case now passes: remove its entry.
Download the \`playwright-report-${browser}\` artifact for the full HTML report.`);
