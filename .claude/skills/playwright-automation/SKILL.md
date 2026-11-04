---
name: playwright-automation
description: Generate, review and run data-driven Playwright test suites across three browsers for one feature at a time. Use when converting designed test cases into automation scripts, when adding cases to an existing spec, or when preparing the multi-browser HTML reports. Enforces external data files, three distinct assertion patterns, and a human review gate before any run.
---

# Data-driven multi-browser automation

Convert a feature's designed test cases into a Playwright suite that runs on three
browser engines and produces attributable HTML reports.

## Invocation contract

Establish these inputs before generation: feature ID/name, requirement and prior-design
paths, application/API URLs actually needed by the feature, spec path, external-data path,
browser projects, and report destination. Discover missing values from the
project and label the run `BLOCKED` if an authoritative value cannot be established; do
not silently substitute EShop-specific defaults.

Use only these workflow states:

- `BLOCKED` — an input, environment dependency, or oracle is unresolved.
- `READY_FOR_REVIEW` — artifacts exist and static validation passed; execution is forbidden.
- `APPROVED_TO_RUN` — the human's approval is quoted in the run manifest.
- `COMPLETE` — three-browser evidence exists and every failure is classified. Red product
  findings may still be complete.

## When to use

- Converting designed test cases (for example the `domain-testing-bva` output in `test-design/`) into `.spec.ts` files.
- Extending an existing spec with more cases.
- Preparing the 3-feature × 3-browser run matrix and its reports.

## Non-negotiables

1. **No inline test data.** Cases come from `automation/data/*.csv` or `*.json` via
   `automation/utils/data-loader.ts`. If a case array appears inside a spec, the work is wrong.
2. **Three distinct assertion patterns**, not three spellings of one: UI state,
   API/contract, data integrity. See `automation/utils/assertions.ts`.
3. **Stop for human review** after generating each spec, before it is ever run.
4. **Never edit generated evidence** — HTML reports, JSON results, run summaries.
   If a number is wrong, re-run; do not fix the file.
5. **Never weaken an assertion to make a suite green.** A failing assertion is a
   finding until a human decides otherwise.
6. **Keep evidence authorities separate.** The requirement/API contract defines expected
   behaviour. Source and the live DOM define reachability, routes, locators and observed
   behaviour. Never derive an oracle from the current build. Record disagreements as a
   product defect or an open requirement question instead of calibrating a test to pass.
7. **No assertion-free branch.** Branch-specific required fields must be validated at
   collection time. A missing optional value must never silently skip the only meaningful
   assertion in a case.
8. **Preserve downstream evidence.** When a status failure would prevent mutation,
   disclosure or persistence checks, collect the downstream fact first and use a soft
   status assertion. Soft does not mean ignored: the test remains red.

## Workflow — one feature at a time

### Step 0 — Stand the environment up, and prove it
Nothing below is meaningful against an app that is not running. Do this first, every
time — it is short, and skipping it costs an hour of misdiagnosed failures.

- Start only the tiers the selected feature needs. Note each actual port from its own
  output, not from memory. Read URLs from project configuration, then confirm each with a
  request.
- Check `node_modules` exists in each front-end you will drive; a fresh clone has none.
- Check the browser binaries are installed — all three engines, not just the default.
- Confirm each page object targets the correct application origin rather than assuming
  one `baseURL` represents a multi-application SUT. A wrong origin often makes every case
  fail identically and can be mistaken for a broken suite.

→ Record the verified ports somewhere the suite reads them (`.env.example`), so the
next feature does not rediscover them.

### Step 1 — Read the feature, and read the page that implements it
Load the FR text and the prior design artifact for this feature only — **then open the
SUT source for the screen itself** and read it.

This step is where the highest-value findings come from, and reading the document alone
cannot produce them. Two real examples from this project:

- A prior artifact recorded "this feature has no web UI" because it searched for a
  route by name. The feature was in fact rendered inside another route's page. Every
  downstream case had been designed at the wrong layer.
- A registration page printed "password must contain a special character" while the
  regex it actually enforced *excluded* special characters and *required* whitespace.
  The mismatch is invisible from the outside until you hit exactly the right input.

From the source, extract before writing any case: the fields that actually exist, the
literal user-visible strings, the client-side validation, and how errors are rendered
(one shared element, or one per field).

→ Stop. Get approval on the behaviour list and on any correction to a prior document.

### Step 2 — Derive the cases
Turn each behaviour into concrete cases: positive, negative, edge. Aim past the
minimum (12) — the marginal case is where defects live. Record each with a stable
`tc_id` traceable to the design artifact.

Prefer cases that close a gap the prior artifact *itself* recorded as uncovered; those
are traceable derivations. Cases invented to reach a round number are padding, and ten
variants that all fail for one root cause are one case, not ten. When a cluster of
cases will fail together, add one **diagnostic** case whose input isolates the shared
cause — it turns a wall of red into a single readable finding.

→ Stop. Get approval on the case list.

### Step 3 — Verify selectors against the live SUT
Before the data file, not after: the DOM decides which cases can exist at all. A field
the design assumed is present may simply not be there, and those cases have to move to
the "not automatable" list rather than be written and thrown away.

Write a throwaway probe script — not a spec, not evidence — that loads the page and,
for each candidate locator, prints `count()`. Require exactly 1 for a single control at
the moment it is used; require the data-derived cardinality for collections; allow 0 only
when verifying an explicit empty/absent state. Also probe the
locators you expect to **fail** and keep those numbers: they are the written
justification for dropping to CSS. A useful probe reports:

- each proposed locator → count, and the tag/type it resolved to
- `getByLabel` / `getByRole` alternatives → their counts, to prove they were tried
- a fill smoke test, to prove the getters address different elements
- a structural count (e.g. total inputs in the form) that confirms what is *absent*

Selector priority: `getByRole`/`getByLabel` → `getByTestId` → `getByText` → CSS/XPath;
any CSS/XPath carries a comment saying why nothing better existed. Delete the probe
afterwards and fold what it proved into the page object's doc comment.

Watch for values the browser supplies rather than the app — native constraint
validation messages differ per engine, so assert on the boolean state, not the string.

→ Stop. Get approval on the locator set and on any case the DOM has invalidated.

### Step 4 — Write the data file
Emit an external CSV or JSON file, one row per case, with typed columns that distinguish
setup, input, action, and expectation. Empty string is a legitimate input — never coerce
it away. Remove invented UI-input columns, but retain setup, API and integrity-oracle
columns even when they do not correspond to a visible field.
→ Stop. Get approval on the data file.

### Step 5 — Write the page object, then the spec
Page object holds locators and actions; the spec holds cases and assertions. The
spec iterates the loaded data and imports `test` from `automation/fixtures/test-fixtures.ts`.

Validate the entire dataset at module load: unique `tc_id`, declared case count, enums,
finite numeric values, non-empty arrays, and branch-specific required fields. Aggregate
all data errors in one failure so the human can repair the file in one pass.
→ Stop. Present the spec for human review; do not run it.

### Step 6 — Human review pass
The reviewer looks for: fragile selectors, assertions that check existence rather
than meaning, missing edge cases, `waitForTimeout`, and data that collides across
repeated runs. Every correction gets a row in the AI review log (an `AI_Review_Gap_Analysis.md`)
with **what** was wrong and **why** the AI missed it.

Run static gates and attach their output to the review:

```powershell
npx tsc --noEmit
npx playwright test <spec-path> --list
```

Quote the human's approval in the feature run manifest. Without that quote, remain
`READY_FOR_REVIEW`.

### Step 7 — Run all three browsers
```powershell
foreach ($project in 'chromium','firefox','webkit') {
  npx playwright test <spec-path> --project=$project
}
```

Run `npx playwright test` without a spec path only when the whole suite is intentionally
in scope. Each run writes `e2e/playwright-report/<feature>/<browser>/index.html`, stamped
with the feature, browser and an ISO start timestamp.

After execution, run `scripts/validate-feature.ps1` with explicit spec, data and JSON
report paths. Treat warnings as human-review items and failures as `BLOCKED`.

### Step 8 — Triage failures
For each failure, decide: test defect (fix the test, log the correction) or product
defect (write it up in the bug report, file a GitHub Issue with a screenshot, and add the
case to `e2e/automation/data/known_failures.json` so CI tracks it as a known failure).
Never let a third category — "made it pass" — exist.

## Output contract: Feature Run Manifest

Return one manifest per feature containing:

- discovered inputs and their source paths;
- case count and unique `tc_id` count;
- exact static-validation commands and exit codes;
- the human approval quote and time observed;
- for every browser: command, start ISO time, exit code, pass/fail/skip counts, HTML and
  JSON paths;
- every red case's disposition: test defect, product defect, or open requirement question;
- non-automatable cases and reasons;
- validator output and final workflow state.

Checkboxes may be ticked only when the manifest contains a path, command or quoted decision
that proves the item.

## Output checklist per feature

- [ ] environment verified: all tiers up, ports confirmed, `baseURL` on the front-end
- [ ] page source read; any disagreement with the design artifact recorded as a correction
- [ ] ≥ 12 cases, all sourced from an external data file
- [ ] ≥ 3 distinct assertion patterns across the suite
- [ ] every locator verified against the live SUT, with the rejected alternatives' counts kept
- [ ] 3 browser combinations, with every HTML entry point stamped with feature, browser + ISO time
- [ ] every AI correction logged with its cause
- [ ] non-automatable cases listed with reasons
- [ ] feature run manifest and `validate-feature.ps1` output preserved

## Pitfalls this workflow was rewritten to avoid

Each line below cost real time on this project before it became a rule.

| Symptom | Actual cause |
|---|---|
| Every case fails identically, instantly | `baseURL` pointed at the API port, not the front-end |
| Locator matches nothing despite a visible label | `<label>` has no `htmlFor` and the input no `id` — `getByLabel` cannot bind them |
| Locator is ambiguous with no accessible name | several inputs share a role; `getByRole` alone cannot separate them |
| Cases written for a field that does not exist | data file was authored before the DOM was inspected |
| A dozen red cases, one real bug | a shared client-side gate rejected them all before they reached what they tested |
| Assertion passes on one engine, fails on another | the expected string was supplied by the browser, not the app |
| Feature "has no UI" | the search was for a route name, not for the rendered feature |
