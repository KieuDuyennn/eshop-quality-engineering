# FR-11: Order History View (User) - Domain Test Cases (Phase 3)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED) and
`output/01_Requirements_Breakdown.md` (Phase 1, APPROVED).
Reference applied: `references/domain_test_heuristics.md` (Kaner & Bach domain-testing
selection rule).

**FR-11-specific mapping (per task instructions):** §2.3's Request-Outcome classes
(EC-16..EC-21) are **not** independent test targets - they are the *outcome* produced
by an input-side class (EC-01..EC-08) or by the empty-state data precondition (EC-15).
Every test case below drives an INPUT-side condition and observes the resulting
OUTPUT class; no test case exists solely "to cover EC-16..EC-21."

---

## 0. Design Decisions

**D-1 - Selection rule (applied strictly).**
- *Valid* classes are bundled into as few test cases as possible (multi-fault
  assumption).
- *Invalid* classes each get their own dedicated test case with every other
  condition held valid (single-fault isolation) - no test case combines two invalid
  conditions.

**D-2 - Test level.** FR-11 is a pure READ + authorization API feature (Phase 1 §0;
Phase 2 scope note) - there is no UI/form interface to split across, unlike FR-01.
Every test case below is a single HTTP request to one of the two documented
endpoints.

**D-3 - Expected-result fidelity.** The following Open Questions block a fully
concrete expected result and are referenced instead of guessed: OQ-05 (color),
OQ-06 (403 vs. 404 for ownership denial), OQ-07 (no-token vs. invalid-token response
shape), OQ-08 (Vietnamese label text), OQ-09 (success status code), OQ-10 (response
envelope shape), OQ-12 (whether nonexistent-id and owned-by-another responses are
identical), OQ-13 (malformed-id-format response), OQ-14 (empty-state response shape).
No HTTP status code, response body, or Vietnamese string is invented anywhere below.

**D-4 - Seed data & setup (from Phase 1 REQ-19/REQ-20).**

| Actor | Role | Setup mechanism |
| --- | --- | --- |
| `test@eshop.com` / `Test1234!` | Primary "own orders" actor - the requester under test in every TC below | `POST /api/checkout` creates an order under this account; `PUT /api/orders/:id/cancel` moves one of its orders to `canceled` |
| `admin@eshop.com` | "Other user" - data owner for cross-ownership TCs only (never the requester) | `POST /api/checkout` under this account creates an order that `test@eshop.com` must not be able to view. Per REQ-20, the password is inconsistent between sources (`Admin123!` vs. `admin123`) - both are tried during setup; whichever works is a setup note, not a formal assertion of either document being correct. |

**New in Phase 3 - OQ-15:** FR-11's own related-endpoints list (§2 of the input FR;
REQ-19) documents only two setup mechanisms: `POST /api/checkout` (creates an order)
and `PUT /api/orders/:id/cancel` (moves an order to `canceled`). No endpoint or
mechanism is documented anywhere in this project's FR-11 input for advancing an order
to `confirmed`, `shipping`, or `delivered` - those transitions belong to "the FR-10
state machine" (REQ-21, explicitly out of scope for FR-11). *Impact:* TC-01/TC-02
below cannot deliberately/confidently exercise EC-10, EC-11, EC-12 (confirmed,
shipping, delivered); this is recorded as an explicit setup dependency in §4, not
silently skipped or assumed reachable.

**Test Environment Note (not a spec ambiguity - a test-execution concern):** TC-08
(empty-state, §3) needs an account with **zero** orders. Both seed accounts named in
Phase 1 (`test@eshop.com`, `admin@eshop.com`) are used as checkout sources by other
TCs in this document. TC-08 therefore requires either a third, never-checked-out
account, or that TC-08 execute *before* any checkout runs on whichever account it
uses. This is flagged explicitly in TC-08's precondition rather than assumed away.

**D-5 - Common request procedure.** Every TC is: *send an HTTP `GET` request to the
stated endpoint, with the stated `Authorization` header (or its stated absence/
malformation), and observe the response.* No request body is sent (both endpoints are
`GET`).

---

## 1. Combined Valid Coverage

Two test cases, one per endpoint - per task instructions, EC-01 (auth+ownership) is
exercised once for each endpoint it applies to, since REQ-01 and REQ-02 are separate,
independently-testable requirements (Phase 1 split them specifically so a bug
affecting only one route's auth enforcement remains detectable). Status-value
assertions (EC-09..EC-13) are embedded here as instructed, not spun into separate
test cases - see §4 for exactly which status values are confidently reachable.

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition | Request | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Combined valid coverage | EC-01 (my-orders view), EC-13 | REQ-01, REQ-06, REQ-09-REQ-12, REQ-13, REQ-14, REQ-15 | `test@eshop.com` logged in (valid token). Two orders seeded under this account via `POST /api/checkout`: Order A left at whatever status checkout assigns by default (not confirmed by any REQ within FR-11's scope - see OQ-15); Order B additionally moved to `canceled` via `PUT /api/orders/:id/cancel`. Additionally, `admin@eshop.com` has at least one order seeded via its own `POST /api/checkout` (reusing the account/setup already defined in TC-03's precondition). | `GET /api/orders/my-orders` with `Authorization: Bearer <test@eshop.com token>` | Success (→ EC-16): both of `test@eshop.com`'s orders are returned, each showing Order ID, Order date, Total amount, and Current status (REQ-09-REQ-12). Order B's status is displayed as `canceled`, translated to Vietnamese and color-coded (REQ-13/REQ-14) - exact VN string/color unresolved (OQ-08/OQ-05). Order A's status is whatever checkout assigned - see §4 for why this cannot be asserted as a specific value. Exact HTTP status code unresolved (OQ-09); exact envelope shape unresolved (OQ-10). **The response's order list contains ONLY orders belonging to `test@eshop.com` - `admin@eshop.com`'s order MUST NOT appear anywhere in the returned list (REQ-06 negative check).** *This assertion closes the gap where a list-endpoint data leak (returning all users' orders) would previously have passed TC-01 undetected - see `gap_notes.md`, Phase 3 self-critique item 9.* |
| TC-02 | Combined valid coverage | EC-01 (detail view), EC-05, EC-13 | REQ-02, REQ-07, REQ-08, REQ-09-REQ-12, REQ-13, REQ-14, REQ-15 | Same account/setup as TC-01. The order id used is Order B (the one moved to `canceled`), owned by `test@eshop.com`. | `GET /api/orders/:id` with `id` = Order B's id, `Authorization: Bearer <test@eshop.com token>` | Success (→ EC-16): the single order is returned with Order ID, Order date, Total amount, and Current status = `canceled` (REQ-09-REQ-12), translated to Vietnamese and color-coded (REQ-13/REQ-14) - exact VN string/color unresolved (OQ-08/OQ-05). Exact HTTP status code unresolved (OQ-09); exact envelope shape unresolved (OQ-10). |

---

## 2. Isolated Invalid Probes

Each row varies exactly one condition; every other condition (token validity,
ownership, id format) is held at a valid/expected value. Every expected result stops
at the level of detail its blocking Open Question allows - no status code, body, or
string is invented.

**Design note on EC-03/EC-04's endpoint (D-2/D-6):** the task specifies exactly one
TC per class for EC-03 (no token) and EC-04 (invalid token). Both are run against
`GET /api/orders/my-orders` for consistency with TC-01. This means REQ-02's (detail
endpoint) auth enforcement is **not** independently re-verified by a dedicated
no-token/invalid-token probe in this phase, even though Phase 1 split REQ-01/REQ-02
specifically because a bug could affect only one route. This is a deliberate scope
trade-off per the task's "1 TC" instruction, flagged here rather than silently
assumed covered - a symmetric pair of TCs against `:id` could be added later if full
per-endpoint auth coverage is wanted.

| TC ID | Coverage Type | EC Covered | REQ(s) | Precondition | Request | Expected Result (→ output EC) | Single-Fault Isolation Reasoning |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-03 | Isolated invalid probe | EC-02 (§1.1) / EC-06 (§1.2) - one TC, same underlying condition | REQ-07, REQ-08 | `test@eshop.com` logged in (valid token). `admin@eshop.com` has at least one order seeded via its own `POST /api/checkout`. | `GET /api/orders/:id` with `id` = an order owned by `admin@eshop.com`, `Authorization: Bearer <test@eshop.com token>` | Request denied / order not returned (→ EC-17). Exact status code (403 vs. 404) unresolved - **OQ-06; this is an assertion gap to be filled in by execution, not a guess.** | Token is valid and belongs to an authenticated user (EC-01 holds) - the only deliberately wrong condition is that the requested id belongs to a different user. No other invalid condition is introduced. |
| TC-04 | Isolated invalid probe | EC-03 | REQ-16 | No setup beyond a syntactically well-formed request. | `GET /api/orders/my-orders` with the `Authorization` header **absent entirely** | Request rejected as unauthorized (→ EC-19). Exact status/body unresolved - OQ-07. | Every other condition that could be valid (a real endpoint, a well-formed request) is held normal - only the token itself is absent. Distinct from TC-05, where a token is present but wrong. |
| TC-05 | Isolated invalid probe | EC-04 | REQ-17 | No setup beyond a syntactically well-formed request. | `GET /api/orders/my-orders` with `Authorization: Bearer <garbage/expired/bad-signature token>` | Request rejected as unauthorized (→ EC-20). Exact status/body unresolved - OQ-07; possibly identical to TC-04's result, possibly not. | A token value **is** present (non-empty) but fails validation on content - distinct from TC-04's absent-token condition. No other condition (ownership, id format) is exercised. |
| TC-06 | Isolated invalid probe | EC-07 | Not stated by any REQ (OQ-12 gap) | `test@eshop.com` logged in (valid token). | `GET /api/orders/:id` with `id` = a large, clearly-unused integer not corresponding to any seeded order (e.g. `999999`) - chosen only as a concrete stand-in for "no such order exists," **not** a boundary/range probe (order id's numeric/ordered dimension is Phase 4's job per Phase 2 §1.2), `Authorization: Bearer <test@eshop.com token>` | Not found (→ EC-18). Exact status/body unresolved - OQ-12 (whether identical to TC-03's EC-17 result). **Kept as a separate TC from TC-03 per task instruction - not merged, even though both may turn out to return the same code.** | Token is valid; the id is well-formed (a valid integer). The only deliberately wrong condition is that no order anywhere has this id - distinct from TC-03 (an id that *does* exist, just owned by someone else) and from TC-07 (a malformed id). |
| TC-07 | Isolated invalid probe | EC-08 | Not stated by any REQ (new OQ-13) | `test@eshop.com` logged in (valid token). | `GET /api/orders/:id` with `id` = `"abc"` (non-integer format), `Authorization: Bearer <test@eshop.com token>` | Malformed-id error (→ EC-21). Exact status/body entirely unresolved - OQ-13. | Token is valid; only the id's **format** is deliberately wrong (not an integer at all) - distinct from TC-03 (existing-but-other's id) and TC-06 (well-formed-but-nonexistent id), which both use syntactically valid integers. |

---

## 3. Empty-State Test Case

EC-15 is a Valid (output) class, but its trigger (zero orders) is a **data
precondition**, not a request-input condition - it cannot share a precondition with
TC-01/TC-02 (which require seeded orders) or with any invalid probe above. It is
therefore its own "Combined valid coverage" case, trivially bundling exactly one
valid class, rather than an "Isolated invalid probe" (its underlying class is Valid,
not Invalid).

| TC ID | Coverage Type | EC Covered | REQ | Precondition | Request | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-08 | Combined valid coverage (singleton - separate precondition) | EC-15 | REQ-18 | A user account that has **never completed a checkout** (zero orders). Per the Test Environment Note in §0, this must be a third account or an account used *before* any checkout occurs elsewhere in this test suite - both named seed accounts (`test@eshop.com`, `admin@eshop.com`) are checkout sources for other TCs in this document. | `GET /api/orders/my-orders` with `Authorization: Bearer <zero-orders account token>` | An "appropriate empty state" is returned (→ EC-15). Exact shape (`[]` vs. a wrapped object vs. an explicit marker) unresolved - OQ-10, OQ-14. |

---

## 4. Status-Mapping Coverage (embedded assertions, not separate test cases)

Per task instructions, the five status classes (EC-09..EC-13) are OUTPUT classes
sampled from existing data, not independently-triggerable invalid probes - they are
covered as embedded assertions inside TC-01/TC-02, not as five additional "Isolated
invalid probe" TCs.

| EC | Status Value | Coverage | Notes |
| --- | --- | --- | --- |
| EC-13 | `canceled` | **Confidently covered** - TC-01 (Order B) and TC-02 (fetches Order B directly) | Reachable via the documented `PUT /api/orders/:id/cancel` setup endpoint (REQ-19); the only status besides checkout's default that FR-11's own setup mechanisms can deliberately produce. |
| EC-09 | `pending` | **Not deliberately covered** - may be *incidentally* observed as TC-01's Order A default status, but this cannot be asserted as guaranteed or deliberate | Whether a freshly-checked-out order defaults to `pending` is not stated anywhere in this project's FR-11 input; that default belongs to FR-10's state machine (out of scope). Grouped with OQ-15's setup-dependency note rather than claimed as covered. |
| EC-10 | `confirmed` | **Not covered - setup dependency** | No documented endpoint/mechanism advances an order to `confirmed` - see new OQ-15. |
| EC-11 | `shipping` | **Not covered - setup dependency** | Same as EC-10 - see OQ-15. |
| EC-12 | `delivered` | **Not covered - setup dependency** | Same as EC-10 - see OQ-15. |
| EC-14 | Out-of-set / anomaly value | **Not testable via normal input at all** | No valid request can make a correctly-functioning system produce this value - it would only ever appear as a symptom of a defect or an undocumented state. There is no domain test case for it; at best it could be checked via a static/regression check (e.g. a code-level assertion that the status column/enum only ever contains the five documented values), which is outside black-box domain testing's scope. Recorded here explicitly rather than silently dropped. |

---

## 5. Coverage & Traceability Matrix

| EC | Type | V/I | Covered/Produced By | Notes |
| --- | --- | --- | --- | --- |
| EC-01 | Input | Valid | TC-01 (my-orders), TC-02 (detail) | Exercised once per endpoint - see D-1/§1. TC-01 now also carries a genuine REQ-06 **negative** assertion (an `admin@eshop.com` order seeded alongside `test@eshop.com`'s, and asserted absent from the response), not just the positive "own orders returned" path - closes Phase 3 self-critique item 9. |
| EC-02 | Input | Invalid | TC-03 | Same underlying condition as EC-06 - one TC, not two |
| EC-03 | Input | Invalid | TC-04 | Representative endpoint: `my-orders` - see §2 design note |
| EC-04 | Input | Invalid | TC-05 | Representative endpoint: `my-orders` - see §2 design note |
| EC-05 | Input | Valid | TC-02 | - |
| EC-06 | Input | Invalid | TC-03 | Same underlying condition as EC-02 - one TC, not two |
| EC-07 | Input | Invalid | TC-06 | Kept distinct from EC-06/TC-03 per OQ-12 |
| EC-08 | Input | Invalid | TC-07 | Kept distinct from EC-06/EC-07 |
| EC-09 | Output | Valid | *Incidental only* - TC-01 (Order A, unconfirmed) | Not a deliberate/guaranteed test - see §4 |
| EC-10 | Output | Valid | *(none)* | Setup dependency - OQ-15 |
| EC-11 | Output | Valid | *(none)* | Setup dependency - OQ-15 |
| EC-12 | Output | Valid | *(none)* | Setup dependency - OQ-15 |
| EC-13 | Output | Valid | TC-01, TC-02 | Confidently covered - see §4 |
| EC-14 | Output | Invalid | *(none - not testable via normal input)* | Static/regression check at best - see §4 |
| EC-15 | Output | Valid | TC-08 | Own precondition (zero orders); see §3 |
| EC-16 | Output | Success | Produced by TC-01, TC-02 | Not an independent test target per task instructions |
| EC-17 | Output | Rejected/Denied | Produced by TC-03 | Not an independent test target |
| EC-18 | Output | Not Found | Produced by TC-06 | Not an independent test target |
| EC-19 | Output | Rejected/Unauthorized | Produced by TC-04 | Not an independent test target |
| EC-20 | Output | Rejected/Unauthorized | Produced by TC-05 | Not an independent test target |
| EC-21 | Output | Rejected/Error | Produced by TC-07 | Not an independent test target |

**Result:** all 8 input classes (EC-01..EC-08) and all 13 output classes
(EC-09..EC-21) are accounted for - 5 confidently/deliberately covered (EC-01, EC-05,
EC-13, EC-15, plus EC-16..EC-21 as produced outcomes), 1 incidentally-but-not-
guaranteed (EC-09), 3 explicit setup dependencies (EC-10, EC-11, EC-12 - OQ-15), and
1 explicitly not testable via normal input (EC-14). None are silently dropped.

---

## 6. Open Questions

Carried forward (unchanged - each still blocks a concrete expected result):

| ID | Bearing on Phase 3 |
| --- | --- |
| OQ-05 | TC-01/TC-02 cannot assert an expected color for any status. |
| OQ-06 | TC-03's expected result cannot state 403 vs. 404. |
| OQ-07 | TC-04/TC-05's expected results cannot state whether their responses are identical or distinct, nor their exact status/body. |
| OQ-08 | TC-01/TC-02 cannot assert an expected Vietnamese string for any status. |
| OQ-09 | TC-01/TC-02 cannot state an expected success HTTP status code. |
| OQ-10 | TC-01/TC-02/TC-08 cannot state an exact response envelope shape. |
| OQ-12 | TC-06's expected result cannot be confirmed as distinct from TC-03's. |
| OQ-13 | TC-07's expected result is entirely unresolved. |
| OQ-14 | TC-08's expected result cannot state an exact empty-state body shape. |

**New in Phase 3 - OQ-15:** see §0/D-4 above. No documented mechanism advances an
order to `confirmed`, `shipping`, or `delivered`; TC-01/TC-02 cannot deliberately
exercise EC-10/EC-11/EC-12 without further setup information (e.g. direct DB seeding,
an admin-side endpoint from a different FR, or clarification that these three states
are simply out of reach for black-box testing of FR-11 alone).

---

## 7. Self-Check

- [x] Every input equivalence class has at least one covering test case - EC-01..EC-08 all covered (§5); EC-16..EC-21 are correctly *not* given independent test cases per task instructions (they are outcomes, not targets).
- [x] Every output equivalence class is accounted for - EC-09..EC-21 all appear in §5, either as confidently covered (EC-13, EC-15..EC-21), incidental-only (EC-09), an explicit setup dependency (EC-10, EC-11, EC-12 - OQ-15), or explicitly not testable via normal input (EC-14) - none silently omitted.
- [x] Selection rule applied exactly - one "Combined valid coverage" case per endpoint (TC-01, TC-02) plus one singleton valid case with its own precondition (TC-08); every invalid class (EC-02/06, EC-03, EC-04, EC-07, EC-08) has its own dedicated, genuinely single-fault "Isolated invalid probe" - no test case combines two invalid conditions.
- [x] Every test case is labeled "Combined valid coverage" or "Isolated invalid probe" - TC-08 carries a parenthetical qualifier ("singleton - separate precondition") explaining *why* it's a standalone valid case rather than bundled with TC-01/TC-02, not a third canonical label.
- [x] Every TC traces to its EC(s) and REQ(s) - both columns present in every table; §5 gives the full EC→TC matrix in both directions (input classes → covering TC; output classes → producing TC). (Corrected 2026-07-06: TC-01/TC-02's own "EC(s) Covered" cells previously listed only EC-01/EC-05, omitting EC-13 even though §4/§5 already credited them with it - self-critique caught the split source of truth; both cells now explicitly include EC-13.)
- [x] Ownership restriction (REQ-06) is exercised with a genuine negative check on the list endpoint, not just a positive-path citation - **corrected 2026-07-06.** TC-01 previously cited REQ-06 without ever seeding a foreign-user order or asserting its absence, so a defect returning *all* users' orders on `GET /api/orders/my-orders` would have passed undetected (self-critique item 9). TC-01 now additionally seeds an `admin@eshop.com` order and asserts the returned list contains only `test@eshop.com`'s orders - extending the existing "Combined valid coverage" case rather than adding a new TC, since it reuses the same valid request and only adds an assertion.
- [x] No invented business rules or expected results - every expected result stops at the level its blocking Open Question allows (D-3); no status code, response body, or Vietnamese string is invented anywhere. EC-07/EC-08/EC-18/EC-21's total absence of a source REQ (Phase 2 finding, carried forward) is reflected honestly in TC-06/TC-07's REQ column ("Not stated by any REQ").
- [x] Single-fault isolation reasoning stated for every isolated invalid probe - TC-03, TC-04, TC-05, TC-06, TC-07 each explain in their own column exactly which one condition is wrong and why the others remain valid, including explicit cross-references distinguishing the three order-id invalid TCs (TC-03 existing-but-other's, TC-06 nonexistent, TC-07 malformed) from one another.
- [x] IDs unique and consistently formatted (`TC-01`..`TC-08`, zero-padded, no gaps).
- [x] No empty table cells - every cell populated; explicit markers ("Not stated by any REQ", "(none)") used where nothing applies.
- [x] Terminology consistent with Phases 1-2 ("class", "endpoint", "order id", "token", EC/REQ/TC IDs).
- [x] Scope trade-offs stated explicitly, not silently absorbed - the EC-03/EC-04 single-endpoint representative choice (§2 design note) and the empty-state account/sequencing dependency (§0 Test Environment Note) are both flagged as deliberate decisions with a stated rationale, not hidden gaps.

---

## 8. Awaiting User Review

This is the Phase 3 artifact (Domain Test Cases) for FR-11: Order History View - 2
combined-valid test cases (TC-01 `my-orders`, TC-02 `:id`), 5 isolated invalid probes
(TC-03..TC-07, one per invalid input class), and 1 standalone empty-state case
(TC-08). Status-value coverage is embedded in TC-01/TC-02 per instructions: `canceled`
(EC-13) is confidently covered via the documented cancel endpoint; `pending` (EC-09)
is at best incidentally observed; `confirmed`/`shipping`/`delivered` (EC-10/11/12)
are explicit, undisguised setup dependencies (new OQ-15); the out-of-set anomaly
class (EC-14) is explicitly not testable via normal input. Reply "approved" (or
similar) to proceed to Phase 4 (Boundary Value Analysis - which will finally address
order id's numeric/ordered dimension, deferred here per Phase 2), or request specific
revisions.
