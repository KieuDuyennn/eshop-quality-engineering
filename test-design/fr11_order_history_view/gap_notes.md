# Gap Notes - fr11_order_history_view

## 2026-07-06 - Phase 1 self-critique (per user checklist)

Re-reading `output/01_Requirements_Breakdown.md` against
`input/Functional_Requirement.md` before approval. Findings only - nothing
fixed yet.

### 1. Coverage - §3, §4, §5 sentence-by-sentence

**§3.1** (2 sentences)
- PASS - "A user MUST be able to view only their own orders." → REQ-05.
- PASS - "A user MUST NOT be able to view another user's orders." → REQ-06.

**§3.2** (intro + 4 fields)
- PASS - Order ID → REQ-08; Order date → REQ-09; Total amount → REQ-10;
  Current status → REQ-11.

**§3.3** (3 sentences)
- PASS - Vietnamese translation → REQ-12.
- PASS - Color distinction → REQ-13.
- PASS - Five status values → REQ-14; "(from the FR-10 state machine)" clause
  → REQ-19 (Observation).

**§4 Inputs Summary** (3 table rows)
- Row "Authenticated user (JWT token) | token | Required; identifies whose
  orders are returned":
  - "Required" - loosely backed by REQ-01, but REQ-01's Source Reference cites
    only §2, not this §4 row.
  - **GAP** - the clause "identifies whose orders are returned" has no REQ
    citing it. REQ-05 covers the ownership *outcome* ("view only their own
    orders") but its Source Reference cites only §3.1. The specific idea in
    §4 - that the token is *how* whose-orders-to-return gets determined - is
    never explicitly traced to any REQ.
- Row "Order id ... | integer | Must belong to the requesting user":
  - PASS for the constraint → REQ-07.
  - **GAP (minor)** - the "integer" type descriptor itself is not captured in
    any REQ or Observation. Nothing currently records that Order id is
    integer-typed, which Phase 2/4 will need for domain/BVA design (e.g.
    non-numeric id, negative id, id `0`).
- Row "Order status ... | enum | One of: ...":
  - PASS → REQ-14. (See Item 6 - this row's own "Inputs Summary" label
    conflicts with status actually being an output.)

**§5 Expected Outputs** (4 bullets)
- PASS - bullet 1 (own orders list w/ 4 fields, VN + color) → REQ-08..REQ-13.
- PASS - bullet 2 (another user's order id denied) → REQ-07.
- PASS - bullet 3 (no/invalid token rejected) → REQ-15.
- PASS - bullet 4 (empty state) → REQ-16.

**Verdict: GAP** - 1 clause in §4 row 1 uncited; 1 minor type descriptor in §4
row 2 uncited. All sentences in §3 and §5 are fully covered.

### 2. Open Questions

- Input §7 has exactly 8 bullets; breakdown maps OQ-01..OQ-08 to them 1:1 in
  the same order. **PASS** - no §7 bullet is missing from the breakdown.
- Hidden-assumption scan across REQ-01..REQ-19: none assign a color, an HTTP
  status code, or a sort order. REQ-13 requires color distinction without
  naming a color (left to OQ-05); REQ-07/REQ-15 require denial/rejection
  without naming a status code (left to OQ-06/OQ-07); no REQ states a sort
  order. **PASS** - no REQ found that smuggles in an unstated concrete value.
- **GAP** - the input file's header/overview block (lines 1-5: "Pool B -
  Shopping Cart and Checkout (per HW02 group assignment)" and "Source of
  truth: ... README.md, Section 5, FR-11") is not decomposed into any REQ,
  Observation, or OQ at all - it was skipped entirely in Phase 1. "Pool B -
  Shopping Cart and Checkout" is a non-obvious pool assignment for a
  read-only order-history-viewing feature, and nothing in the artifact flags
  this for a cross-check against README §5's actual FR-11 framing.

### 3. Atomicity

- **GAP** - REQ-01 folds two independently-testable assertions ("list
  endpoint requires auth" AND "detail endpoint requires auth") into one REQ.
  A bug that adds auth middleware to one route but not the other would not be
  distinguishable at the requirement level.
- **GAP** - REQ-15 folds two failure conditions ("no token" and "invalid
  token") **and** both endpoints into a single REQ ("If no token or an
  invalid token is provided to either endpoint, the request MUST be
  rejected"). This is inconsistent with OQ-07, which already suspects "no
  token" and "invalid token" may produce *different* response shapes - if
  they can differ, they arguably should not share one REQ.
- **GAP** - REQ-07 folds a precondition ("order id MUST belong to the
  requesting user") and its consequence ("if it belongs to a different user,
  MUST be denied / not returned") into a single REQ. This repo's own prior
  Phase 1 artifact (`projects/fr01_account_registration/output/01_Requirements_Breakdown.md`,
  REQ-13 vs. REQ-14) split an analogous precondition/consequence pair into
  two separate REQs - REQ-07 is inconsistent with that established pattern.
- **GAP (minor)** - REQ-18 (Observation) bundles the seed-account credentials
  with the admin-password source-inconsistency note in one row. Not a
  correctness risk since it's an Observation, not an FR, but still two
  distinct facts in one row.
- PASS - REQ-08..REQ-11 (one field each), REQ-12/REQ-13 (Vietnamese kept
  separate from color, matching the checklist's own example), and REQ-14
  (single enumeration fact) are each atomic.

### 4. Classification

- PASS - admin password mismatch (README `Admin123!` vs. setup_guide.md
  `admin123`) is classified Observation → REQ-18. Not asserted as FR.
- PASS - the client-supplied `total_amount` / FR-08 recompute contradiction
  is captured only as an Open Question → OQ-02, never asserted as FR. REQ-10
  only requires *displaying* the field; it does not assert the value's
  trustworthiness or how it's computed.
- **GAP** - same finding as Item 2's last bullet: the "Pool B -
  Shopping Cart and Checkout" vs. "README.md, Section 5, FR-11" framing is
  never classified as an Observation or raised as an OQ; it is simply absent
  from the artifact.

### 5. Scope (FR-08 / FR-10 / FR-02 leakage)

- PASS - FR-02 (authentication mechanics) is confined to the Global
  Precondition (§0), not restated as a REQ; REQ-01/REQ-15 only assert that
  FR-11's own endpoints require/reject on the token, not how FR-02 issues or
  validates it.
- PASS - FR-10 (state-machine origin of the 5 statuses) is confined to
  REQ-19, explicitly classified Observation and explicitly noted as "an
  external requirement not included in this FR-11 input file."
- PASS - FR-08 (recompute-total-amount rule) is confined to OQ-02, never
  asserted as fact in any REQ.
- **No leakage found** for this item.

### 6. Status recorded as displayed OUTPUT, not user input?

- **GAP** - §4's table is titled "Inputs Summary" and lists "Order status
  (value being displayed) | enum | ..." as a row, even though status is not
  actually submittable by the client to either GET endpoint - it is a
  stored/output value. REQ-14's Source Reference cites "§4 Inputs Summary -
  Order status enum" without flagging this label conflict. Functionally,
  REQ-11/REQ-12/REQ-13/REQ-14 are grouped under AREA-04 "Displayed Fields" /
  AREA-05 "Status Presentation" (an output-oriented framing), so the
  *classification* is effectively correct in practice - but the artifact
  never explicitly states "status is a display-only output for these two
  endpoints, not a user-supplied input." This risks Phase 2 mistakenly
  deriving input-side invalid equivalence classes for status (e.g., "invalid
  status value submitted") that don't apply to read-only GET endpoints with
  no status parameter.

## Summary

8 findings total: 2 coverage gaps (Item 1), 1 header/metadata gap (raised
under both Item 2 and Item 4 - same underlying issue), 4 atomicity gaps
(3 substantive: REQ-01, REQ-07, REQ-15; 1 minor: REQ-18), and 1
output-vs-input labeling gap (Item 6, re: REQ-14). Item 5 (scope leakage) had
no findings - fully PASS. Nothing in `01_Requirements_Breakdown.md` has been
changed as a result of this review.

## 2026-07-06 - Disposition of Phase 1 self-critique

Reviewed with the user. Per user decision:

**APPLIED:**
- Atomicity finding on old REQ-01 (auth requirement combining both endpoints)
  - split into new REQ-01 (`GET /api/orders/my-orders`) and REQ-02
  (`GET /api/orders/:id`), each requiring auth independently. All downstream
  REQ IDs renumbered.
- Atomicity finding on old REQ-15 (no-token/invalid-token combined) - split
  into new REQ-16 (no token) and REQ-17 (invalid token). OQ-07 left
  unresolved as-is (still an open question on whether the response *shape*
  differs), only its REQ cross-reference was updated.
- Status output-vs-input labeling gap (Item 6) - new REQ-15 (the five-value
  status enum REQ) now carries an explicit note: "status is a displayed
  output value for these two GET endpoints, not a user-submitted input
  parameter."
- Pool B / README §5 categorization gap (Items 2 and 4) - added as a new
  Observation, REQ-22 under a new AREA-09 (Documentation Metadata), noting
  the mismatch has no test-design impact and is flagged for TA
  clarification.

**DEFERRED (style/low-impact):**
- REQ-07's (now REQ-08) precondition+consequence bundling - left as one REQ;
  order-id ownership precondition and its denial consequence are two sides
  of the same rule and splitting them was judged lower-value than the other
  atomicity fixes.
- §4's "integer" type descriptor for Order id - not promoted to its own
  REQ/Observation; will be captured directly as part of the input's type
  definition when Order id's domain is defined in Phase 2.
- §4 row 1's uncited "identifies whose orders are returned" clause - left
  without a dedicated citation; considered adequately implied by REQ-06
  (own-orders-only) and not worth a separate REQ.
- REQ-18's (now REQ-20) bundling of seed-account credentials with the
  admin-password inconsistency note - left as one Observation row; low
  impact since it's not classified as an FR.

No other sections of `01_Requirements_Breakdown.md` were touched.

## 2026-07-06 - Phase 2 self-critique (per user checklist)

Re-reading `output/02_Equivalence_Partitioning.md` against the task instructions
and `01_Requirements_Breakdown.md` before approval. Findings only - nothing
fixed yet.

### 1. Partitioned by field (FR-01 style) anywhere instead of by
   authorization/ownership/status/empty-state?

- PASS for the four requested groups - EC-01..EC-04 (Authorization), EC-05..EC-07
  (order-id ownership), EC-09..EC-14 (status), EC-15 (empty-state) are all
  partitioned by authorization/ownership/status/empty-state, not by "field" the
  way FR-01 partitioned by Full Name/Email/Password/Confirm Password. Order date
  (REQ-10) and Total amount (REQ-11) were explicitly left unpartitioned (see the
  "Scope note" at the top of the artifact) rather than given FR-01-style field
  sub-classes.
- **GAP** - **EC-08** ("Order id supplied in a non-integer / malformed format")
  is a self-initiated addition, not one of the 3 order-id classes the task
  specified. Structurally it is exactly the FR-01 pattern applied to a path
  parameter instead of a form field: a guideline-(d) "must-be-X" format
  validation (X = valid integer), the same shape as FR-01's email-format
  sub-classes. Even though Order id is a path parameter rather than a form
  field, and even though its purpose (closing the Phase 1 `gap_notes.md`
  integer-type deferral) is legitimate, this arguably reintroduces the exact
  "partition by field/format" pattern the task said not to replicate - it was
  added on my own initiative, not requested.

### 2. All 4 authorization classes present as discrete classes, not ranges?

- PASS - EC-01 (valid token + own resource, both endpoints), EC-02 (valid token +
  another user's resource, detail endpoint only), EC-03 (no token), EC-04
  (invalid/malformed token) are four separate rows in §1.1, each described in
  purely discrete/enumerated terms (no "≥", "≤", "range," or ordering language
  anywhere in their descriptions). The §1.1 preamble explicitly states "no
  boundary-value reasoning applies to them."

### 3. Are the 3 order-id classes (own / other's-existing / non-existent) kept
   separate, not merged into 2?

- PASS - EC-05 (owned by requester), EC-06 (owned by another user, existing),
  EC-07 (does not exist at all) are three separate rows in §1.2. EC-06's Flag
  cell states "Kept distinct from EC-07 per task instruction - see OQ-12";
  EC-07's Flag cell states "Kept distinct from EC-06 per task instruction, not
  merged." The §3 Backward-Trace table also keeps their corresponding outputs
  separate (EC-17 for EC-06, EC-18 for EC-07), noting only that "EC-17/EC-18 not
  yet confirmed distinguishable - OQ-12" as an open question, not a merge.

### 4. All 5 status ECs exist, each tagged OUTPUT, no invented Vietnamese text
   or color value?

- PASS - EC-09 (`pending`), EC-10 (`confirmed`), EC-11 (`shipping`), EC-12
  (`delivered`), EC-13 (`canceled`) are five separate rows in §2.1, each tagged
  via the "Outcome Type" column as "Valid (output)" and via the section heading
  "Status-Mapping Output Classes." No Vietnamese string or color value is stated
  in any of the five rows - each Flag cell instead cites "VN label - OQ-08;
  color - OQ-05," leaving both unresolved as instructed.
- Note (not a gap): a sixth class, EC-14, was added for values outside the
  5-value set (guideline (c)'s mandatory invalid catch-all) - not explicitly
  requested, but required by the reference heuristic for a "set of discrete
  values" partition; noted for visibility, not as a violation.

### 5. Is empty-state its own EC, not folded into "no orders = invalid input"?

- PASS - EC-15 sits in its own subsection (§2.2 "Empty-State Output Class"),
  tagged "Valid (output)" in the Outcome Type column, entirely separate from the
  INPUT authorization/ownership classes (EC-01..EC-08). It is not framed as an
  invalid input condition anywhere; its Traces Back To cell explicitly
  distinguishes it from a request-input EC: "EC-01 (valid auth) plus an external
  data precondition ... which is test-data setup, not a request-input EC."

### 6. Any EC assigning boundary/range treatment to something outside the
   order-id integer domain (smuggled-in BVA for status/auth)?

- PASS - no EC outside §1.2 uses ordering/boundary language. EC-01..EC-04
  (authorization) and EC-09..EC-21 (status/empty-state/outcome) are all
  described in purely discrete/categorical terms. Within §1.2, EC-08 (format
  validity) uses example values (`"abc"`, `"1.5"`, empty path segment) to
  illustrate non-integer input, but these are format-violation examples, not
  ordered boundary values (no `0`, negative value, or magnitude is used as a
  class boundary) - the §1.2 preamble explicitly excludes "magnitude, sign, and
  boundary values such as `0` or a negative id" from this phase. See Item 1,
  however, for the separate finding that EC-08 itself may not have belonged in
  this phase at all.

### 7. Every EC traces to a REQ-xx from Phase 1 - list any that doesn't.

- **GAP** - four classes do not trace to any Phase 1 REQ:
  - **EC-07** ("order id does not exist at all") - Source REQ cell reads "Not
    stated by any REQ - raised only as OQ-12 in Phase 1."
  - **EC-08** (malformed order-id format) - Source REQ cell cites the raw input
    FR's §4 table directly ("§4 Inputs Summary of the input FR states the Order
    id type is 'integer'"), not a Phase 1 REQ-xx.
  - **EC-18** (Not Found output) - Source REQ cell reads "Not stated by any REQ
    (OQ-12 gap)."
  - **EC-21** (malformed-id-format output) - Source REQ cell reads "Not stated
    by any REQ (new OQ-13)."
  This was already self-disclosed in the artifact's own Self-Check line 1
  ("...or explicitly states 'no REQ - OQ-xx gap' when none exists (EC-07, EC-08,
  EC-18, EC-21)"), so it is not a hidden gap - but per a strict reading of
  "every EC traces to a REQ-xx," these four do not, and are listed here as
  requested.

### 8. Empty/null decision made explicitly for every applicable class, not
   skipped?

- PASS (with a documented exception below) - EC-01 through EC-13, EC-15, and
  EC-16 each carry a substantive Empty/Null Decision with a stated reason (e.g.
  EC-03: "This class IS the mandatory empty/null case for the token input - the
  header value is empty/absent"; EC-08: "This IS the empty/null case for the
  order-id format dimension if the path segment is empty..."; EC-15: "This IS
  the mandatory empty/null case for the returned orders collection itself...").
- **GAP** - six classes carry a bare **"N/A"** with no stated reasoning:
  **EC-14**, **EC-17**, **EC-18**, **EC-19**, **EC-20**, **EC-21** (the status
  catch-all row in §2.1, and five of the six rows in §2.3's Request-Outcome
  table). This contradicts the artifact's own Self-Check claim (bullet 5):
  "'N/A' used consistently for empty/null decisions where the condition doesn't
  apply, with a reason stated each time" - for these six rows, no reason is
  actually stated, just the bare marker.

## Summary (Phase 2 self-critique)

8 checks run: 5 clean PASS (items 2, 3, 4, 5, 6), 3 GAPs (item 1: EC-08 may
reintroduce FR-01-style field/format partitioning beyond the requested 3
order-id classes; item 7: EC-07/EC-08/EC-18/EC-21 don't trace to any Phase 1
REQ - already self-disclosed in-artifact but listed here per the explicit
request; item 8: EC-14/EC-17/EC-18/EC-19/EC-20/EC-21 have bare "N/A" empty/null
cells with no stated reason, contradicting the artifact's own Self-Check
claim). No edits made to `02_Equivalence_Partitioning.md`.

## 2026-07-06 - Disposition of Phase 2 self-critique

Reviewed with the user. Of the 3 findings, only Item 8 was applied.

**APPLIED:**
- Item 8 (bare "N/A" empty/null cells) - added a short stated reason to each of
  EC-14, EC-17, EC-18, EC-19, EC-20, EC-21 in `02_Equivalence_Partitioning.md`
  §2.1/§2.3 (e.g. EC-14: "this is an anomaly/defect class, not a normal
  response; no empty/null dimension applies"; EC-17/18: "a denial/not-found
  response has no field-level empty/null dimension to decide"; EC-19/20: "an
  unauthorized rejection has no field-level empty/null dimension to decide";
  EC-21: "a malformed-id error response has no field-level empty/null
  dimension to decide"). Self-Check bullet 5 updated to note the correction.

**REJECTED (reviewed and kept as-is):**
- Item 1 (EC-08 field/format partitioning concern) - rejected. EC-08 fills a
  gap Phase 1 explicitly deferred to this phase (the `01_Requirements_Breakdown.md`
  gap_notes disposition: "order-id type will be captured in Phase 2 domain
  definition"), not a regression back to FR-01's per-field partitioning
  pattern. EC-08 and its missing-REQ-trace note are unchanged.
- Item 7 (EC-07/EC-08/EC-18/EC-21 missing REQ traces) - rejected. These are
  already transparently self-disclosed in the artifact's own Self-Check
  (bullet 1: "...or explicitly states 'no REQ - OQ-xx gap' when none exists"),
  not hidden assumptions, so no change was made.

No other sections of `02_Equivalence_Partitioning.md` were touched.

## 2026-07-06 - Phase 3 self-critique (per user checklist)

Re-reading `output/03_Domain_Test_Cases.md` against the task instructions and
`02_Equivalence_Partitioning.md` before approval. Findings only - nothing
fixed yet.

### 1. Are EC-16..EC-21 treated only as expected results, never a separate
   TC target?

- PASS - TC-01..TC-08's "EC(s) Covered"/"EC Covered" columns list only
  input-side classes (EC-01, EC-02/06, EC-03, EC-04, EC-05, EC-07, EC-08) or
  the empty-state data precondition (EC-15). EC-16..EC-21 appear only inside
  "Expected Result" cells as arrows (e.g. TC-01: "Success (→ EC-16)"; TC-03:
  "→ EC-17"; TC-06: "→ EC-18"; TC-04: "→ EC-19"; TC-05: "→ EC-20"; TC-07: "→
  EC-21"). No TC's own coverage column names EC-16..EC-21 as what it's
  testing, and no TC exists whose only purpose is to re-assert one of those
  six outcomes without a distinct input-side trigger - each of TC-01
  through TC-07 drives a different input condition.

### 2. Does the valid-coverage TC actually attempt multiple status values,
   and is anything claimed "covered" without real evidence?

- PASS (with a disclosed coverage limitation) - TC-01/TC-02 concretely seed
  only 2 of the 5 status values: Order B is moved to `canceled` via the
  documented `PUT /api/orders/:id/cancel` endpoint (§4: "EC-13 | `canceled` |
  **Confidently covered**"), and Order A is left at checkout's default
  (unconfirmed) status. Nothing is claimed as covered without evidence: §4
  explicitly marks EC-09 (`pending`) "**Not deliberately covered** - may be
  *incidentally* observed... cannot be asserted as guaranteed or deliberate,"
  and EC-10/EC-11/EC-12 (confirmed/shipping/delivered) as "**Not covered -
  setup dependency**" tied to new OQ-15. So only 2 of 5 status values are
  actually attempted by TC-01/TC-02, and this limitation is disclosed
  in-artifact (§4, §5, §8) rather than glossed over as full coverage.

### 3. Is EC-14 explicitly marked untestable via normal input, not silently
   dropped?

- PASS - §4's EC-14 row states "**Not testable via normal input at all**...
  There is no domain test case for it; at best it could be checked via a
  static/regression check... Recorded here explicitly rather than silently
  dropped." §5's matrix repeats this: "EC-14 | ... | *(none - not testable
  via normal input)* | Static/regression check at best."

### 4. Each invalid TC - exactly one fault? Any TC combining two invalid
   conditions?

- PASS - TC-03 (ownership violation only; token itself valid), TC-04 (token
  absent only; request otherwise well-formed), TC-05 (token present but
  invalid only; no other condition varied), TC-06 (id nonexistent only;
  token valid, id well-formed), TC-07 (id format malformed only; token
  valid) each carry a "Single-Fault Isolation Reasoning" cell stating
  exactly which one condition is wrong and confirming the others are held
  valid. No TC's precondition/request combines two invalid conditions (e.g.
  no TC pairs "no token" with "nonexistent id," or "invalid token" with
  "ownership violation").

### 5. Are EC-06 (other user's real id) and EC-07 (nonexistent id) still
   two separate TCs?

- PASS - TC-03 covers EC-02/EC-06 (existing order owned by `admin@eshop.com`,
  requested by `test@eshop.com`) and TC-06 covers EC-07 (id `999999`, not
  owned by anyone). TC-06's Expected Result cell states explicitly: "**Kept
  as a separate TC from TC-03 per task instruction - not merged, even though
  both may turn out to return the same code**." Two distinct TC rows, two
  distinct EC citations.

### 6. Any TC that assumes an unresolved OQ's answer instead of citing the
   OQ?

- PASS - scanned every Expected Result cell (TC-01..TC-08) for an invented
  status code, response body, or Vietnamese string: none found. TC-01/TC-02
  reference OQ-08/OQ-05 (VN label/color) and OQ-09/OQ-10 (status
  code/envelope) instead of stating a value; TC-03 references OQ-06 (403 vs.
  404) instead of picking one; TC-04/TC-05 reference OQ-07 without presuming
  whether their responses are identical; TC-06 references OQ-12 without
  presuming identity with TC-03; TC-07 references OQ-13; TC-08 references
  OQ-10/OQ-14. The label "Not found (→ EC-18)" on TC-06 reuses Phase 2's own
  Outcome Type name for EC-18 verbatim (`02_Equivalence_Partitioning.md`
  §2.3) - it is inherited terminology, not an invented HTTP status number.

### 7. Does every TC state its data-setup precondition explicitly?

- PASS - every TC's Precondition cell is populated, including the two
  "nothing extra" cases which are stated as such rather than left blank:
  TC-04 and TC-05 both read "No setup beyond a syntactically well-formed
  request." TC-01/TC-02 spell out the two-order seed with specific setup
  endpoints; TC-03 spells out the `admin@eshop.com` order seed; TC-06/TC-07
  state "`test@eshop.com` logged in (valid token)"; TC-08 spells out the
  zero-orders account requirement and cross-references the §0 Test
  Environment Note.

### 8. Every TC traces to an EC-xx from Phase 2 - list any that doesn't.

- PASS, no TC is fully untraceable - every TC's own coverage column cites at
  least one Phase 2 EC (TC-01: EC-01; TC-02: EC-01, EC-05; TC-03: EC-02/EC-06;
  TC-04: EC-03; TC-05: EC-04; TC-06: EC-07; TC-07: EC-08; TC-08: EC-15).
- **GAP (minor, internal-consistency)** - TC-01's and TC-02's own §1
  "EC(s) Covered" cells list only **EC-01** (and **EC-05** for TC-02) - they
  do **not** also list **EC-13** (`canceled`), even though §4's status table
  and §5's coverage matrix both credit TC-01/TC-02 with confidently covering
  EC-13 ("EC-13 | Output | Valid | TC-01, TC-02 | Confidently covered"). A
  reader who only checks §1's table (without cross-referencing §4/§5) would
  miss that these two TCs also exercise EC-13. Not a "doesn't trace at all"
  failure - the trace exists, just split across sections rather than
  consolidated in each TC's own row.

### 9. NEW - Ownership isolation for `GET /api/orders/my-orders` (REQ-06):
   does any TC seed an order under a different account and confirm it's
   ABSENT from `test@eshop.com`'s `/my-orders` response?

- **GAP** - no such check exists anywhere in the document. TC-01's REQ
  column lists **REQ-06** ("A user MUST be able to view only their own
  orders") among the requirements it covers, but TC-01's Precondition only
  seeds orders under `test@eshop.com` (no order is ever seeded under
  `admin@eshop.com` for TC-01), and its Expected Result only makes
  **positive** assertions - that `test@eshop.com`'s own 2 orders are
  returned with the right fields. It never asserts a **negative**: that
  `admin@eshop.com`'s (or any other user's) orders are *excluded* from that
  same response.
  - TC-03 *does* seed an order under `admin@eshop.com` and does check an
    ownership violation - but only against `GET /api/orders/:id` (the detail
    endpoint), never against `GET /api/orders/my-orders` (the list
    endpoint). It cannot substitute for a list-endpoint leak check.
  - Concretely: a defect that made `GET /api/orders/my-orders` return **all**
    users' orders (ignoring the ownership filter on the list endpoint
    entirely) would currently pass every TC in this document undetected -
    TC-01 doesn't check for extra/foreign orders in the response, and no
    other TC calls the list endpoint at all under a cross-user setup.
  - This can be closed either way: (a) **add an assertion to TC-01** -
    additionally seed one order under `admin@eshop.com` before TC-01's
    `GET /api/orders/my-orders` call, and assert the returned list contains
    *only* `test@eshop.com`'s 2 orders (i.e., `admin@eshop.com`'s order is
    absent) - this stays a "Combined valid coverage" case since it's still
    exercising valid auth/ownership, just with a completed REQ-06 assertion;
    or (b) **add a new dedicated TC** paralleling TC-03 but against the list
    endpoint. Recorded as an open implementation choice, not resolved here.

## Summary (Phase 3 self-critique)

9 checks run: 7 clean PASS (items 1, 2, 3, 4, 5, 6, 7), 1 minor
internal-consistency GAP (item 8: TC-01/TC-02's own EC(s)-Covered cells omit
EC-13, which §4/§5 credit them with - the trace exists but is split across
sections), and 1 substantive GAP (item 9: `GET /api/orders/my-orders`'s
ownership filter - REQ-06 - is claimed as covered by TC-01 but never
actually exercised with a negative/exclusion check; a full-leak defect on
the list endpoint would go undetected by the current test suite). No edits
made to `03_Domain_Test_Cases.md`.

## 2026-07-06 - Disposition of Phase 3 self-critique

Reviewed with the user. Both findings were applied.

**APPLIED:**
- Item 8 (EC-13 trace omitted from TC-01/TC-02's own coverage cells) -
  TC-01's "EC(s) Covered" cell now reads "EC-01 (my-orders view), EC-13";
  TC-02's now reads "EC-01 (detail view), EC-05, EC-13" - matching what §4
  and §5 already credited both TCs with.
- Item 9 (no REQ-06 negative/exclusion check for `GET /api/orders/my-orders`)
  - TC-01 extended (not a new TC): its precondition now also seeds an order
  under `admin@eshop.com` (reusing TC-03's account/setup), and its Expected
  Result now asserts the returned list contains only `test@eshop.com`'s
  orders - `admin@eshop.com`'s order must not appear. §5's EC-01 row updated
  to note this genuine negative assertion. Applied by extending the existing
  "Combined valid coverage" case rather than adding a dedicated TC, since it
  reuses the same valid request and only adds an assertion - consistent with
  bundling multiple checks into the fewest test cases (D-1).
- Self-Check (§7) updated with two corrected bullets documenting both fixes.

No other sections of `03_Domain_Test_Cases.md` were touched.

## 2026-07-06 - Phase 4 self-critique (per user checklist)

Re-reading `output/04_Boundary_Value_Test_Cases.md` against the task
instructions and `02_Equivalence_Partitioning.md`/`03_Domain_Test_Cases.md`
before approval. Findings only - nothing fixed yet.

### 1. Is BVA applied ONLY to order id? Flag any boundary reasoning
   smuggled in for status, auth, or empty-state.

- PASS - all three generated test cases (BVA-01: `id = -1`, BVA-02:
  `id = 0`, BVA-03: `id = 1`) sit under §1 "Order Id - Numeric/Ordered
  Boundary" and target only the order-id path parameter. §0's scope table
  marks Authorization state, Order id ownership routing, Order id format
  validity, Status enum, Empty-state, Order date, and Total amount all
  "**No**" for BVA Applicable, each with a stated reason (e.g. status enum:
  "For unordered enums... boundary analysis does not apply"). §2/§3 discuss
  *why* those dimensions are excluded but propose no boundary values for any
  of them - no smuggled-in boundary reasoning found anywhere outside §1.

### 2. Is the min/step reasoning stated explicitly BEFORE the boundary
   values, not just asserted?

- PASS - §1 opens with "**Precision and step (stated before computing, per
  skill requirement):** Order id is declared type integer... precision = 1
  (whole integer), step = 1," followed by the "Bound determination" 
  discussion (raising OQ-16) and the two-hypothesis table, and only *then*
  the BVA-01/BVA-02/BVA-03 table. The derivation precedes every value in
  the document's reading order - no boundary value appears before its
  precision/step justification.

### 3. Does any BVA test case duplicate TC-06 or TC-07 from Phase 3?

- PASS - BVA-01/02/03 use `-1`, `0`, `1` respectively; none is `999999`
  (TC-06) or `"abc"` (TC-07). Each BVA row has its own "Distinction from
  Phase 3" cell (e.g. BVA-01: "Distinct from TC-06 (`999999`, a large
  arbitrary unused id - no sign involved) and TC-07 (`"abc"`, a non-integer
  format violation - no numeric value involved at all)"), and a
  "Non-duplication note" precedes the table making the same point once for
  all three rows.

### 4. Is `id = 0` handled explicitly - decided as valid, invalid, or an
   open question, not silently assumed either way?

- PASS - BVA-02's row states: "**Conditional, pending OQ-16 and OQ-17:** if
  ids are 0-indexed and order `0` genuinely exists and belongs to
  `test@eshop.com`, expect success... if it exists and belongs to someone
  else, expect denial... if no order has id `0`... expect not-found... If a
  distinct sign/range check treats `0` as out-of-range regardless of any
  matching record, that is a different, undocumented rejection." This is
  explicitly branched across all plausible outcomes and tied to two named
  Open Questions (new OQ-16, new OQ-17) - not silently assumed valid or
  invalid.

### 5. Is there a "Technique Limitations" note explaining why BVA is thin
   here?

- PASS - §3 "Technique Limitations" contains 5 bullets, including the
  FR-specific point (not present in FR-01's version) that "only one
  genuinely ordered/numeric input dimension exists in this entire FR" and
  that "order id is system-generated, not user-typed - a distinct blind
  spot from FR-01's fields," explaining why BVA-01/02/03 carry conditional
  rather than concrete expected results.

### 6. Every BVA test case traces to EC-05..EC-08 (or a new OQ) from Phase
   2 - list any that doesn't.

- **GAP** - the BVA-01/02/03 table (§1) has **no dedicated "EC Covered" or
  "REQ" column at all** - its header is "BVA ID | Boundary Point |
  Precondition | Request | Expected Result | Distinction from Phase 3."
  Compare this to Phase 3's TC tables, which all had explicit "EC(s)
  Covered" and "REQ(s)" columns.
  - Traceability to Phase 2's **input**-side classes (EC-05 owned, EC-06
    other's, EC-07 nonexistent - the very classes these boundary ids would
    route into) is **never named anywhere** in §1 - only the **output**-side
    classes are mentioned, and only inside prose inside the Expected Result
    cells (e.g. BVA-01: "falls through to 'not found' (→ EC-18)"; BVA-02:
    "expect success (→ EC-16)... expect denial (→ EC-17)... expect
    not-found (→ EC-18)").
  - **Self-Check bullet 3 overclaims:** it states "§1's table cites REQ-08
    (order id) throughout" - but the literal string "REQ-08" does not
    appear anywhere in the BVA-01/02/03 table rows (Precondition, Request,
    and Expected Result cells for all three rows were checked; none
    contains "REQ-08" or any other REQ-xx citation).
  - All three rows **do** trace to the new Open Questions (OQ-16, OQ-17)
    explicitly, and to EC-16/17/18 narratively - so nothing is *completely*
    untraceable - but the specific claim in Self-Check bullet 3 about
    REQ-08 citation is not accurate as written, and there is no EC column
    tying each row back to EC-05/06/07 (the input-side Phase 2 classes the
    task's check 6 specifically names).

### 7. No invented status code, response body, or boundary ceiling not
   supported by the FR?

- PASS - every Expected Result cell in BVA-01/02/03 is stated conditionally
  ("Conditional, pending OQ-..."); no HTTP status code or response body is
  asserted as fact anywhere. The "Maximum - not generated" paragraph in §1
  explicitly declines to invent a ceiling: "Inventing a specific large
  number as a 'maximum-representable-integer' boundary would fabricate a
  ceiling not evidenced anywhere - excluded per the skill's explicit
  instruction not to invent the unstated side of an open-ended bound."

## Summary (Phase 4 self-critique)

7 checks run: 6 clean PASS (items 1, 2, 3, 4, 5, 7), 1 GAP (item 6: the
BVA-01/02/03 table has no dedicated EC/REQ traceability column - Phase 2's
input-side classes EC-05/06/07 are never explicitly named anywhere in §1,
and Self-Check bullet 3's claim that "§1's table cites REQ-08... throughout"
does not match the actual table content, which contains no REQ-xx citation
at all). No edits made to `04_Boundary_Value_Test_Cases.md`.

## 2026-07-06 - Disposition of Phase 4 self-critique

Reviewed with the user. Item 6 was applied.

**APPLIED:**
- Item 6 (missing EC/REQ column, plus a Self-Check overclaim) - added an
  explicit "EC / REQ" column to the BVA-01/02/03 table (§1), between
  "Boundary Point" and "Precondition," naming EC-05/EC-06/EC-07 (the input
  classes each boundary id routes into, pending real DB state) and REQ-08
  for all three rows. Corrected Self-Check bullet 3 to accurately describe
  the new column rather than repeat the prior overclaim that the table
  "cites REQ-08... throughout" before that citation actually existed.

No other sections of `04_Boundary_Value_Test_Cases.md` were touched.
