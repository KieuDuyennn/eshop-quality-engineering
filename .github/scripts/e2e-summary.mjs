// Turn a Playwright JSON report into a Markdown summary for the GitHub job page.
// Usage: node e2e-summary.mjs <report.json> <browser>
import { readFileSync, existsSync } from 'node:fs';

const [reportPath, browser] = process.argv.slice(2);

if (!existsSync(reportPath)) {
  console.log(`### E2E - ${browser}\n\nNo JSON report found at \`${reportPath}\`; the run did not finish.`);
  process.exit(0);
}

const { stats } = JSON.parse(readFileSync(reportPath, 'utf8'));
const total = stats.expected + stats.unexpected + stats.flaky + stats.skipped;
const minutes = (stats.duration / 60000).toFixed(1);

console.log(`### E2E - ${browser}

| Total | Passed | Failed | Flaky | Skipped | Duration |
| --- | --- | --- | --- | --- | --- |
| ${total} | ${stats.expected} | ${stats.unexpected} | ${stats.flaky} | ${stats.skipped} | ${minutes} min |

Failures are expected while known SUT defects are open; this job does not gate the pipeline yet.
Download the \`playwright-report-${browser}\` artifact for the full HTML report.`);
