# FR-13: Admin Dashboard - Domain Test Cases (Phase 3)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED -
EC-01..EC-22) and `output/01_Requirements_Breakdown.md` (Phase 1, APPROVED -
REQ-01..REQ-15, OQ-01..OQ-13).
Reference applied: `references/domain_test_heuristics.md` (Kaner & Bach
domain-testing selection rule).

> Note on filename: the output file is saved as `03_Domain_Test_Cases.md`
> (not `03_Domain_Test_Design.md` as literally typed in the request), matching
> the artifact path already declared in `state.json` and the naming
> convention used by every other project in this repo (FR-01, FR-11).

## 0. Design Decisions

**D-1 - Selection rule (applied strictly).**
- *Valid* classes are bundled into as few test cases as possible (multi-fault
  assumption) → "Combined valid coverage" cases.
- *Invalid* classes each get their own dedicated test case with every other
  condition held at a valid/baseline value (single-fault isolation) →
  "Isolated invalid probe" cases. No test case combines two invalid
  conditions.

**D-2 - Test level.** FR-13 has no UI/form dimension (unlike FR-01) - every
test case is API-level. Per OQ-01, no dedicated dashboard endpoint/route is
confirmed to exist; every TC below targets `GET /api/admin/orders` as the
assumed data source for dashboard content (§2 of the input FR), consistent
with Phase 1/2. **If a dedicated dashboard endpoint is later confirmed, these
TCs should be re-pointed to it - that decision is not made here.**

**D-3 - Expected-result fidelity.** Where Phase 1/2 already flagged the exact
value/shape as an unresolved Open Question, the expected result is stated at
the level the FR supports and tagged "per OQ-XX, to be confirmed" - never
guessed. This applies to: denied-access response shape (OQ-08, OQ-13),
successful-access status/body (OQ-10, OQ-11), revenue format/precision
(OQ-07, OQ-09), revenue trustworthiness (OQ-06), order-count scope (OQ-02),
and both empty-state display values (OQ-03, OQ-04).

**D-4 - Baseline test accounts and setup mechanism:**

| Actor | Credentials | Class |
| --- | --- | --- |
| Admin | `admin@eshop.com` - password inconsistent between sources (README: `Admin123!`, setup_guide: `admin123` - REQ-14); every TC requiring admin login attempts both and records which succeeds | EC-04 |
| Non-admin user | `test@eshop.com` / `Test1234!` | EC-03 |
| No credentials | *(no Authorization header sent)* | EC-01 |
| Malformed credentials | A syntactically invalid/corrupted bearer token (e.g. a truncated or resigned JWT) | EC-02 |

Order status for test data is set via `PUT /api/admin/orders/:id/status`
(REQ-13) - this endpoint is test-setup machinery, not itself under test here.
Base URL: `http://localhost:3000` (REQ-03).

**D-5 - Reference order-amount values** (used so revenue assertions are
concrete without resolving OQ-07/OQ-09): a "delivered" reference order uses
`total_amount = 100`; a "canceled"/"pending"/"confirmed"/"shipping" reference
order (when needed as a decoy) uses `total_amount = 50`. These are
placeholder representative values, not a resolution of OQ-09 (integer vs.
decimal) or OQ-07 (currency/rounding) - any concrete currency/format
assumption in an assertion is explicitly marked "illustrative."

**D-6 - Empty-state assertions are recorded as distinct, independently
gradable sub-assertions, not one combined verdict** (per special instruction
3). TC-07 (zero orders at all) checks the revenue field and the order-count
field as two separately labeled assertions, each tied to its own output
class (EC-20, EC-21 respectively). This is a deliberate design choice
carried over from the Phase 2 self-critique (P2-G01): a plausible fault
theory (SQL `SUM()` over an empty group returning `NULL` while `COUNT()`
returns `0`) means one field could break while the other stays correct, and
a single combined pass/fail verdict would hide which.

**D-7 - Classifying TC-07/TC-08's coverage type.** EC-09 and EC-10 (the two
empty-state input classes) are tagged `N/A` for Valid/Invalid in Phase 2
("a legitimate reachable system state, not an erroneous input"), not
"Invalid." Since they are not error conditions, they are treated under the
**"Combined valid coverage"** label rather than "Isolated invalid probe" -
each TC still targets exactly one edge-case precondition (not a bundle of
unrelated valid classes for efficiency), which is stated explicitly per TC
so the label isn't misread as claiming multi-class bundling that isn't
there.

**Precondition common to every TC:** the actor has already authenticated
(where applicable) and holds whatever token/role that TC requires; order
data is set up as stated per TC via REQ-13's mechanism before the dashboard
request is sent.

---

## 1. Combined Valid Coverage

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition (order data setup) | Request | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Combined valid coverage | EC-04, EC-05, EC-08, EC-14, EC-15, EC-18, EC-19 | REQ-01, REQ-04, REQ-05, REQ-07, REQ-08, REQ-09, REQ-10 | A mixed, nonzero order set exists: at least one `delivered` order (`total_amount = 100`, D-5) plus at least one order of each other status (`pending`, `confirmed`, `shipping`, `canceled`), each with a nonzero `total_amount`, so the full status enum (EC-08) and the delivered-inclusion condition (EC-05) are both represented. Per OQ-12 (pagination, see §6): if the endpoint paginates/limits results, confirm all 5 orders are actually returned before evaluating (b)/(c) below - an unnoticed page limit would silently invalidate both assertions. | Authenticate as admin (D-4); send `GET /api/admin/orders` with the resulting valid admin JWT. | (a) Request succeeds - access granted (EC-14); exact status code/body shape per OQ-10/OQ-11, to be confirmed. (b) Displayed revenue value reflects the sum of `total_amount` for `delivered` orders only, i.e. includes the `100` from the delivered order and excludes the other statuses' amounts (EC-05 inclusion → EC-15/EC-18); exact numeric format/precision per OQ-07/OQ-09, to be confirmed. (c) Displayed order count value: two candidate values are possible depending on OQ-02's unresolved scope - **`5`** (if the count includes all orders regardless of status) or **`1`** (if the count is restricted to `delivered` orders only). Record which of the two (if either) the system actually returns; that observation is itself evidence toward resolving OQ-02, not an assumption of it. |

TC-01 bundles all classes tagged `Valid` (or non-erroneous, per D-7's
distinction) that can be validated together safely under the multi-fault
assumption: correct admin access, correct delivered-order inclusion, and a
representative full-status data set for the order-count output - one
request, three independently-recorded expected-result assertions ((a), (b),
(c)), matching D-6's "distinct assertions, not one combined verdict"
principle even here.

**Why TC-01 is not credited for EC-16/EC-17 in §5:** TC-01's
precondition includes one order of every non-delivered status (`pending`,
`confirmed`, `shipping`, `canceled`), and assertion (b) does state that
their amounts must be excluded - so TC-01 *does* touch the same ground as
EC-16 (canceled excluded) and EC-17 (pending/confirmed/shipping excluded).
It is deliberately not credited as *the* covering TC for either, because all
four non-delivered statuses coexist here with only "a nonzero
`total_amount`" each - not individually known, distinguishable values. If
(b) fails, there is no way to attribute the failure to *which* specific
non-delivered status leaked into the sum. That single-fault attribution is
exactly what TC-05 (canceled, isolated with a known decoy amount) and TC-06
(pending/confirmed/shipping, isolated the same way) are for. TC-01's
exclusion check is a real but non-isolating sanity check, not a substitute
for TC-05/TC-06 - hence §5 credits only TC-05/TC-06 for EC-16/EC-17, while
TC-01 remains credited only for EC-05/EC-15/EC-18/EC-19 (the classes it
*can* isolate).

---

## 2. Isolated Invalid Probes - Access Control (EC-01, EC-02, EC-03)

Per special instruction 1: exactly 3 separate isolated probes, never merged.
Each holds the order-data precondition irrelevant (any data set is fine,
since the request should be denied before revenue/count logic runs) and
varies only the credential condition.

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition | Request | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-02 | Isolated invalid probe | EC-01, EC-11 | REQ-08 | Order data irrelevant to this probe (any state). | Send `GET /api/admin/orders` with **no** `Authorization` header. | Request denied (EC-11) - not a success response. Exact status code/body per OQ-08/OQ-13, to be confirmed. |
| TC-03 | Isolated invalid probe | EC-02, EC-12 | REQ-09 | Order data irrelevant to this probe (any state). | Send `GET /api/admin/orders` with `Authorization: Bearer <malformed/invalid token>` (D-4). | Request denied (EC-12) - not a success response. Exact status code/body per OQ-08/OQ-13, to be confirmed; OQ-13 specifically asks whether this response equals TC-02's - do not assume it does or doesn't. |
| TC-04 | Isolated invalid probe | EC-03, EC-13 | REQ-10 | Order data irrelevant to this probe (any state). | Authenticate as the non-admin user (D-4); send `GET /api/admin/orders` with the resulting valid, non-admin JWT. | Request denied (EC-13) - not a success response. Exact status code (401 vs. 403) per OQ-08, to be confirmed. |

Each of TC-02/03/04 varies exactly one access-control condition while the
other two access-control classes do not apply simultaneously (a request has
exactly one of: no token / invalid token / valid-non-admin token / valid-admin
token) - so single-fault isolation is structural here, not just a design
choice.

---

## 3. Isolated Invalid Probes - Revenue Exclusion (EC-06, EC-07)

Per special instruction 2, these describe **test-data setup conditions**
(order status before dashboard load), not request inputs. Each probe holds
a known-good delivered "reference" order constant (D-5, `total_amount = 100`)
so the assertion isolates exactly one exclusion condition: if revenue comes
out as anything other than `100`, the deviation is unambiguously attributable
to the order status under test, not to the reference order.

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition (order data setup) | Request | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-05 | Isolated invalid probe | EC-06, EC-16 | REQ-06, OQ-05 | One `delivered` reference order (`total_amount = 100`) **plus** one `canceled` order (`total_amount = 50`) - the risk-flagged case (OQ-05): a canceled order still carries a nonzero `total_amount` that must not leak into revenue. Per OQ-12 (pagination, §6): confirm both orders are actually returned by the endpoint before evaluating the result - with only 2 orders this is unlikely to hit a page limit, but is worth a sanity check the first time this probe is run. | Authenticate as admin (D-4); send `GET /api/admin/orders`. | Displayed revenue = `100` only - the canceled order's `50` must NOT be added (would otherwise read `150`). This also re-confirms the reference delivered order's correct inclusion (EC-05/EC-15/EC-18). Exact numeric format per OQ-07/OQ-09, to be confirmed. |
| TC-06 | Isolated invalid probe | EC-07, EC-17 | REQ-06 | One `delivered` reference order (`total_amount = 100`) **plus** one order each in `pending`, `confirmed`, and `shipping` status (each `total_amount = 50`), and **no** `canceled` order in this data set (kept separate from TC-05 so this probe is about the pending/confirmed/shipping group specifically, not conflated with the canceled risk case). Per OQ-12 (pagination, §6): confirm all 4 orders are actually returned by the endpoint before evaluating the result. | Authenticate as admin (D-4); send `GET /api/admin/orders`. | Displayed revenue = `100` only - none of the pending/confirmed/shipping amounts are added. Re-confirms the reference delivered order's inclusion (EC-05/EC-15/EC-18). Exact numeric format per OQ-07/OQ-09, to be confirmed. |

---

## 4. Combined Valid Coverage - Empty-State Edge Cases (EC-09, EC-10)

Per special instruction 3 and D-6/D-7 above - each precondition gets its own
TC, and where more than one output field is asserted (TC-07), the assertions
are recorded distinctly rather than combined into one verdict.

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition (order data setup) | Request | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-07 | Combined valid coverage (edge-case system state - D-7) | EC-09, EC-20, EC-21 | REQ-04, REQ-07, OQ-03 | Zero orders exist in the system at all (no status has any orders). See new OQ-15 on whether this precondition is reliably achievable/resettable in the test environment. | Authenticate as admin (D-4); send `GET /api/admin/orders`. | Two **independently recorded** assertions (D-6, not one combined verdict): (a) **Revenue assertion (EC-20):** displayed revenue value under zero-orders-at-all - exact value (`0`? blank? absent field?) per OQ-03, to be confirmed; record pass/fail for this alone. (b) **Order-count assertion (EC-21):** displayed order-count value under zero-orders-at-all - exact value per OQ-03, to be confirmed; record pass/fail for this alone, independent of (a). |
| TC-08 | Combined valid coverage (edge-case system state - D-7) | EC-10, EC-22 | REQ-04, REQ-05, OQ-04 | Orders exist (at least one, e.g. one `pending` order, `total_amount = 50`) but zero of them have `status = delivered`. | Authenticate as admin (D-4); send `GET /api/admin/orders`. | Revenue assertion (EC-22): displayed revenue value = `0`, or empty/undefined - not resolved here, per OQ-04, to be confirmed. **Order-count is deliberately not asserted here as a distinct edge-case value** - no output class currently models "order count under EC-10" separately from the general EC-19 case (see OQ-14, carried forward); once OQ-02 resolves, this TC may need an added order-count assertion analogous to TC-07(b). |

---

## 5. Coverage & Traceability Matrix

Every Phase 2 equivalence class (EC-01..EC-22) mapped to its covering test
case(s).

| EC ID | Tag | Covered By | Notes |
| --- | --- | --- | --- |
| EC-01 | Input | TC-02 | - |
| EC-02 | Input | TC-03 | - |
| EC-03 | Input | TC-04 | - |
| EC-04 | Input | TC-01 (primary, dedicated assertion) | Also required as a shared precondition by TC-05, TC-06, TC-07, TC-08 (they cannot run without it), consistent with Phase 1/2's "precondition, not restated per row" treatment - not re-credited as fresh coverage there. |
| EC-05 | Input | TC-01, TC-05, TC-06 | TC-05/TC-06 each include the same reference delivered order and explicitly assert its correct inclusion as part of isolating the exclusion fault. |
| EC-06 | Input | TC-05 | Risk-flagged per OQ-05, per special instruction 2 |
| EC-07 | Input | TC-06 | - |
| EC-08 | Input | TC-01 | Full-status data set |
| EC-09 | Input | TC-07 | - |
| EC-10 | Input | TC-08 | - |
| EC-11 | Output | TC-02 | Response shape unresolved - OQ-08, OQ-13 |
| EC-12 | Output | TC-03 | Response shape unresolved - OQ-08, OQ-13 |
| EC-13 | Output | TC-04 | Response shape unresolved - OQ-08 |
| EC-14 | Output | TC-01 | Success status/body unresolved - OQ-10, OQ-11 |
| EC-15 | Output | TC-01, TC-05, TC-06 | - |
| EC-16 | Output | TC-05 | - |
| EC-17 | Output | TC-06 | - |
| EC-18 | Output | TC-01, TC-05, TC-06 | Format/precision unresolved - OQ-07, OQ-09; trustworthiness - OQ-06 |
| EC-19 | Output | TC-01 | Scope unresolved - OQ-02 (see also OQ-14) |
| EC-20 | Output | TC-07 | Value unresolved - OQ-03 |
| EC-21 | Output | TC-07 | Value unresolved - OQ-03 |
| EC-22 | Output | TC-08 | Value unresolved - OQ-04 |

**Result:** all 10 input classes and all 12 output classes (EC-01..EC-22) are
covered by TC-01..TC-08 - no orphan class, no deferral needed.

---

## 6. Open Questions

All Open Questions referenced above (OQ-01, OQ-02, OQ-03, OQ-04, OQ-05,
OQ-06, OQ-07, OQ-08, OQ-09, OQ-10, OQ-11, OQ-12, OQ-13, OQ-14) are carried
forward from Phase 1/2, unresolved, exactly as approved - none are answered
or guessed at in this phase; every TC's expected result that depends on one
is explicitly tagged "per OQ-XX, to be confirmed" rather than assuming an
answer.

**OQ-12 (pagination)** is now explicitly referenced at every TC where it is
relevant: TC-01's precondition (5 orders - the largest data
set in this phase, so the most exposed to a page-limit truncation), and
TC-05/TC-06's preconditions (2 and 4 orders respectively - less exposed but
still worth a first-run sanity check). If `GET /api/admin/orders` silently
paginates or limits results, any of these TCs' revenue/count assertions
could be wrong in a live run without an obvious cause - this is not
resolved here, only flagged at the point of use.

One new Open Question was identified while designing TC-07:

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-15 | Is there a way to reset/isolate the order dataset for a test run (e.g. a per-run tenant, or a reset/seed mechanism), or does `GET /api/admin/orders` always reflect the system's entire cumulative order history across all test runs and users? | EC-09 ("zero orders exist in the system at all") is only actually executable if the test environment can be brought to a genuinely empty state. If orders persist indefinitely across test runs with no reset mechanism, TC-07 may be unexecutable as written in a shared environment, and would need a different precondition (e.g. a fresh/dedicated tenant) to be run at all. | Derived while writing TC-07's precondition (§4) - no reset/seed mechanism for orders is documented anywhere in the Phase 1 input FR |

---

## 7. Self-Check

Re-run after the 2026-07-06 Phase 3 self-critique fixes (P3-G01, P3-G03,
P3-G05 applied; P3-G02, P3-G04 left as-is per the user's instruction - see
`gap_notes.md`).

- [x] Every equivalence class (EC-01..EC-22) has at least one covering test
      case - verified in §5's matrix; no deferral needed (contrast with
      FR-01, which had one documented deferral - FR-13 has none).
- [x] Selection rule applied exactly (D-1): valid/non-erroneous classes
      bundled into the minimum number of cases (TC-01 for the main valid
      access-control + revenue-inclusion + full-data-set path; TC-07/TC-08
      for the two edge-case system states, each isolating exactly one
      precondition as stated in D-7); every invalid class gets its own
      dedicated, genuinely single-fault probe (TC-02..TC-06) - no TC
      combines two invalid conditions. **Corrected claim:**
      TC-01 does touch the same ground as EC-16/EC-17 (its precondition
      includes all 4 non-delivered statuses and its own assertion (b)
      checks their exclusion), but a note directly under TC-01's table now
      explains why that is a non-isolating sanity check, not a substitute
      for TC-05/TC-06 - so TC-01's text no longer reads as contradicting
      §5's crediting decision.
- [x] Every test case is labeled "Combined valid coverage" or "Isolated
      invalid probe" - no third label was needed this phase (unlike FR-01's
      TC-10 exception). TC-07/TC-08's classification under "Combined valid
      coverage" is explained in D-7 rather than asserted silently, since
      EC-09/EC-10 are `N/A`-tagged (not cleanly Valid) in Phase 2.
- [x] Every isolated invalid probe (TC-02..TC-06) holds every other condition
      at a valid/baseline value and varies exactly one - re-verified per
      row: TC-02/03/04 vary only the credential condition against an
      irrelevant order-data backdrop; TC-05/06 vary only the order-status
      composition against a constant, valid admin-access precondition and a
      constant reference delivered order (D-5), so a revenue deviation is
      attributable to exactly one status condition.
- [x] No Open Question was resolved or guessed - every TC expected result
      that touches an unresolved OQ states "per OQ-XX, to be confirmed"
      (per special instruction 5); §6 carries forward all of Phase 1/2's
      OQs plus new OQ-15. **Corrected omission:** OQ-12
      (pagination) was missing from both the artifact's body and §6's
      carried-forward list despite being directly relevant to every
      multi-order TC - it is now referenced in TC-01/TC-05/TC-06's
      preconditions and added to §6's list, still unresolved, not guessed.
- [x] Empty-state classes (EC-09/EC-10) each have their own dedicated TC
      (TC-07, TC-08), and TC-07's two output assertions (EC-20 revenue,
      EC-21 count) are recorded as **distinct, independently gradable**
      sub-assertions rather than one combined pass/fail verdict (D-6) - per
      special instruction 3, directly carrying forward the Phase 2
      self-critique's P2-G01 reasoning into how this TC is actually graded.
- [x] Output classes (EC-11..EC-22) are not separately-executed test cases -
      each is mapped, in §5, to the input-class TC(s) whose expected-result
      section describes it (per special instruction 4).
- [x] Every TC traces to its EC(s) and REQ(s) - both present in every table;
      §5 gives the full EC→TC matrix with no orphans.
- [x] Every expected result that is checkable states an actual pass/fail
      criterion (not just an instruction to observe). **Corrected (fixes
      P3-G03):** TC-01(c)'s order-count assertion previously said only
      "record the actual value observed" with no candidate to check
      against. It now enumerates the two values TC-01's own 5-order,
      1-delivered data set makes computable under the two OQ-02 scope
      candidates (`5` for all-statuses, `1` for delivered-only), and states
      that whichever value appears is itself evidence toward OQ-02 -
      genuinely checkable without resolving the OQ. TC-02/03's status-code
      assertions were left as-is (P3-G04, a lower-severity, separate
      nitpick the user asked to leave for this pass) and TC-08's deferred
      count assertion was left as-is (P3-G02, also left for this pass).
- [x] No table cell is empty without an explicit reasoned marker.
- [x] IDs are unique and consistently formatted (`TC-01`..`TC-08`, sequential,
      zero gaps).
- [x] Terminology consistent with Phases 1-2 ("class", "requirement",
      "endpoint", EC/REQ/OQ/TC IDs).

## 8. Awaiting User Review

This is the Phase 3 artifact (Domain Test Cases) for FR-13: Admin Dashboard -
1 combined-valid case for the main access + revenue-inclusion + full-data-set
path (TC-01), 5 isolated invalid probes (TC-02..TC-06 - 3 for access control,
2 for revenue exclusion), and 2 combined-valid edge-case cases for the two
empty-state preconditions (TC-07, TC-08), with full EC-01..EC-22 coverage and
one new Open Question (OQ-15, on test-environment resettability). Please
review and reply "approved" (or similar) to proceed to Phase 4 (Boundary
Value Analysis), or request specific revisions.
