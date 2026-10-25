# EShop Quality Engineering

End-to-end and performance test suites for the EShop web application, with the system under test included so everything runs locally.

## What's inside

| Folder | Contents |
| --- | --- |
| `e2e/` | Playwright + TypeScript suite built on the Page Object Model, with data-driven test data (CSV/JSON), running on Chromium, Firefox and WebKit. Test data is set up through the API. Features covered: account registration (FR-01), order history (FR-11) and admin dashboard (FR-13). |
| `performance/` | k6 baseline and spike scenarios against the backend API, with SLO targets of p95 < 500 ms and error rate < 1%. Also includes one AI-drafted scenario (`k6/realistic-shopping.ai.js`) that was audited and refined. |
| `sut/` | The EShop app under test: `backend/` (Express + SQLite), `frontend-web/` (customer site) and `frontend-admin/` (admin dashboard). |

## Provenance

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

## Roadmap

- CI pipeline with GitHub Actions (in progress)
