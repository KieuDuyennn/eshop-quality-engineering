# EShop Quality Engineering

Test design, end-to-end and performance test suites for the EShop web application, with the system under test included so everything runs locally.

## What's inside

| Folder | Contents |
| --- | --- |
| `e2e/` | Playwright + TypeScript suite built on the Page Object Model, with data-driven test data (CSV/JSON), running on Chromium, Firefox and WebKit. Test data is set up through the API. Features covered: account registration (FR-01), order history (FR-11) and admin dashboard (FR-13). |
| `performance/` | k6 baseline and spike scenarios against the backend API, with SLO targets of p95 < 500 ms and error rate < 1%. Also includes one AI-drafted scenario (`k6/realistic-shopping.ai.js`) that was audited and refined. |
| `test-design/` | Black-box test design for four features (FR-01, FR-06, FR-11, FR-13): requirements breakdown, equivalence partitioning, domain test cases, boundary value analysis and gap notes. The FR-01, FR-11 and FR-13 designs are the basis of the `e2e/` suite. |
| `sut/` | The EShop app under test: `backend/` (Express + SQLite), `frontend-web/` (customer site) and `frontend-admin/` (admin dashboard). |
| `.claude/skills/` | The two AI agent skills used to produce `test-design/` and `e2e/`: `domain-testing-bva` (test case design) and `playwright-automation` (test data and scripts). See [AI-assisted test design](#ai-assisted-test-design). |

> **Note:** the SUT intentionally contains insecure code (for example, a hardcoded JWT secret in `sut/backend/server.js`). It is a test target, not production code.

## AI-assisted test design

The test cases and test data were drafted with Claude Code, using two skills I wrote for this ([`.claude/skills/`](.claude/skills/README.md)). Each skill makes the AI follow a fixed workflow and stop for my approval at every step, so it drafts and I review:

- **`domain-testing-bva`**: requirement → atomic requirements → equivalence classes → domain test cases → boundary values. It flags anything the requirement does not state as an open question, and checks classes against the backend source.
- **`playwright-automation`**: designed cases → selectors verified on the live app → external CSV/JSON data → page objects and specs → three-browser run → failure triage.

The review is documented: an [AI review log](https://github.com/KieuDuyennn/software__testing/blob/main/HW04/docs/test-plan/AI_Review_Gap_Analysis.md) records 39 corrections to AI-generated scripts and data, and each `test-design/` feature has `gap_notes.md` with my critique of every AI-drafted phase.

## Results

- **139 data-driven cases**: FR-01 has 43, FR-11 has 46 and FR-13 has 50.
- **417 executions** across 3 browsers (Chromium, Firefox, WebKit).
- **46 confirmed defects** across the three features (FR-01: 23, FR-11: 17, FR-13: 6); the 23 FR-01 defects trace back to 5 shared root causes.
- Example defects:
  - The registration API accepts requests with missing required fields and still creates accounts.
  - Checkout stores `total_amount` as sent by the client, without recalculating it on the server.
  - Order cancellation has a race condition: concurrent cancel requests for the same order are all accepted.

Original reports: [main report](https://github.com/KieuDuyennn/software__testing/blob/main/HW04/docs/01_Main_Report.md), [bug report](https://github.com/KieuDuyennn/software__testing/blob/main/HW04/docs/02_Bug_Report.md) and [HTML/JSON run reports](https://github.com/KieuDuyennn/software__testing/tree/main/HW04/reports/final) in `software__testing/HW04`.

Defects found after the move to this repo are tracked in this repo's [Issues](https://github.com/KieuDuyennn/eshop-quality-engineering/issues?q=is%3Aissue%20label%3Abug).

## Provenance

- **test-design**: my individual coursework, at https://github.com/KieuDuyennn/software__testing/tree/main/HW02
- **e2e**: my individual coursework, at https://github.com/KieuDuyennn/software__testing/tree/main/HW04
- **performance**: a team project where I was the coordinator, at https://github.com/KieuDuyennn/performance_testing
- **SUT**: https://github.com/ttbhanh/eshop-sut. The copy here comes from the team project and adds a `LOADTEST=1` switch that bypasses the backend rate limiter during load tests.

## How to run locally

Prerequisites: Node.js and npm. You also need [k6](https://k6.io/) for the performance tests and a bash shell for the runner scripts.

### 1. Start the system under test

```bash
# Backend API on http://localhost:3000
# The database is recreated and seeded on every start.
cd sut/backend
npm install
node server.js                 # for e2e tests
LOADTEST=1 node server.js      # for performance tests (disables the rate limiter)

# Customer web app on http://localhost:5173
cd sut/frontend-web
npm install
npm run dev

# Admin app on http://localhost:5174
cd sut/frontend-admin
npm install
npm run dev
```

### 2. Run the Playwright suite

```bash
cd e2e
npm ci
npx playwright install
cp .env.example .env           # then fill in the accounts (and SUT_JWT_SECRET; see the comments in the file)

npx playwright test                                    # all features, all browsers
npm run test:fr01 -- --project=chromium                # one feature, one browser
```

HTML reports are written to `e2e/playwright-report/`.

### 3. Run the k6 scenarios

```bash
# with the backend started using LOADTEST=1
BASE_URL=http://localhost:3000 ./performance/scripts/run-baseline.sh
BASE_URL=http://localhost:3000 ./performance/scripts/run-spike.sh
```

Summaries are exported to `performance/reports/results/`.

## Known defects

Many e2e tests fail on purpose: they expose real bugs in the SUT rather than being adjusted to pass. The defects are documented in the [bug report](https://github.com/KieuDuyennn/software__testing/blob/main/HW04/docs/02_Bug_Report.md).

Each of these cases is listed in [`e2e/automation/data/known_failures.json`](e2e/automation/data/known_failures.json) with its bug ID and issue link, and is marked with `test.fail()` by a shared fixture. A run therefore passes while those defects are open and fails when:

- any other case fails (a new regression),
- a listed case starts passing (its defect was fixed; remove the entry), or
- a listed case fails for a different reason than the one recorded in its `expect_error` (for example a broken selector), so a test problem cannot hide behind a known defect.

The `checks` workflow also fails if an entry names a test ID that no longer exists, so a renamed or deleted case cannot leave a stale entry behind.

## CI

GitHub Actions runs three workflows:

- **checks** (every push and pull request): type-checks the e2e suite, loads the Playwright config, and starts the backend to confirm it answers.
- **e2e** (pushes and pull requests to `main`, or manual): starts the full SUT and runs every case on Chromium, Firefox and WebKit in the official Playwright container. Each browser job publishes a results table to the job summary and uploads the HTML report and SUT logs as artifacts.
- **perf** (daily, manual, and pull requests that change `sut/backend/` or `performance/`): starts the backend with `LOADTEST=1` and runs the k6 smoke test ([`performance/k6/smoke.js`](performance/k6/smoke.js), 5 VUs for 30 s). Its thresholds fail the job when p95 latency reaches 500 ms or the error rate reaches 1%. The k6 summary is uploaded as an artifact.

## Other work

- [GUI and usability testing](https://github.com/KieuDuyennn/software__testing/tree/main/HW03): manual GUI and usability testing of a support-request flow on a different system (EMS), with defect reports and screenshot evidence. It is not included here because it targets another SUT.

## Roadmap

- Standalone API test suite
