# FR-11: Order History View (User) - Boundary Value Test Cases (Phase 4)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED),
`output/03_Domain_Test_Cases.md` (Phase 3, APPROVED).
Reference applied: `references/boundary_value_heuristics.md` (Kaner & Bach domain-testing
method).

**Continuity note:** per Phase 2's §1.2 preamble and Phase 3's design notes, order
id's numeric/ordered dimension (magnitude, sign) was **deliberately deferred** to this
phase - everything else in this FR was explicitly classified as discrete/enumerated
in Phase 2, with no ordered domain for boundary analysis to apply to. This is why
this artifact is much thinner than FR-01's - see §3 (Technique Limitations) for why
that is a correct scope outcome, not an incomplete one.

---

## 0. Scope Determination - Which Dimensions Are Boundary-Sensitive

Every input/output dimension from Phase 1/2 is evaluated below so the scope decision
is auditable - dimensions excluded are excluded by explicit reasoning, not omission.

| Dimension | REQ | Phase 2 EC(s) | Ordered range? | BVA Applicable? | Reasoning |
| --- | --- | --- | --- | --- | --- |
| Authorization state (valid / no-token / invalid-token) | REQ-01, REQ-02, REQ-16, REQ-17 | EC-01, EC-03, EC-04 | No (discrete) | **No** | Unordered/enumerated states. Phase 2 §1.1 states explicitly: "no boundary-value reasoning applies to them." Already fully covered by Phase 3 TC-01, TC-02, TC-04, TC-05. |
| Order id - ownership routing (owned / other's / nonexistent) | REQ-07, REQ-08 | EC-05, EC-06, EC-07 | No (discrete/categorical outcome) | **No** | This is *which bucket a given id falls into*, not an ordered numeric range - categorical routing, already fully covered by Phase 3 TC-02, TC-03, TC-06. |
| Order id - format/type validity (integer vs. non-integer) | - (§4 of the input FR; no REQ) | EC-08 | No (guideline-(d) "must-be-X") | **No** | "Is this string even a parseable integer" is a discrete must-be-X condition, not an ordered range. Already fully covered by Phase 3 TC-07. This phase concerns a different question: *given* a well-formed integer, where does its valid range begin? |
| **Order id - numeric/ordered dimension (magnitude, sign)** | REQ-08 (type descriptor only) | EC-05, EC-06, EC-07 (as routing targets) | **Yes** | **Yes** | The sole genuinely ordered/numeric domain in this FR - explicitly deferred here by Phase 2 §1.2 ("the ordered/numeric dimension of Order id... is deliberately NOT partitioned here - that is entirely Phase 4's job"). See §1. |
| Status enum (5 values) | REQ-13, REQ-14, REQ-15 | EC-09-EC-14 | No (unordered enum, guideline (c)) | **No** | Per the skill: "For unordered enums... boundary analysis does not apply." Already fully covered by Phase 2/3 (§2.1/§4 of those artifacts). |
| Empty-state (order count = 0) | REQ-18 | EC-15 | No (binary data-state precondition) | **No** | Zero-vs-nonzero could in principle be seen as an ordered count, but the FR states no pagination/result-limit threshold at all (Phase 1 OQ-04, still unresolved) - there is no stated numeric threshold to bound. Already covered by Phase 3 TC-08. |
| Order date | REQ-09/REQ-10 (display only) | Not partitioned in Phase 2 (blocked by OQ-01) | Unknown | **No** | Phase 2 deliberately did not partition this field (format/timezone/locale unresolved, OQ-01) - there is no Phase 2 domain to derive a boundary from. Not newly invented here. |
| Total amount | REQ-11 (display only) | Not partitioned in Phase 2 (blocked by OQ-02) | Unknown | **No** | Same reasoning as Order date - blocked by OQ-02 (whether the value is even trustworthy/recomputed), no Phase 2 domain to bound. |
| Output/outcome classes (EC-16-EC-21) | - | EC-16-EC-21 | No | **No** | Discrete outcome states (success / one of several rejection categories) - this FR has no computed numeric output (e.g. no balance, no price) for BVA to apply to. |

**Result: exactly one boundary-sensitive dimension carried forward - Order id's
numeric/ordered domain (§1).** Every other dimension is excluded above with a stated
reason; §2 collects these as a single audit point (non-fabrication log).

---

## 1. Order Id - Numeric/Ordered Boundary (`GET /api/orders/:id`)

**Precision and step (stated before computing, per skill requirement):** Order id is
declared type **integer** (input FR §4 Inputs Summary; carried into Phase 2 as
EC-08's source). An integer has no sub-unit - **precision = 1 (whole integer)**,
**step = 1**.

**Bound determination - minimum is UNRESOLVED, not assumed.** Neither the input FR,
nor Phase 1, nor Phase 2 states whether valid order ids begin at `0` or at `1` (or use
some other convention entirely, e.g. non-sequential positive integers). This is
raised as a new Open Question rather than guessed:

**New in Phase 4 - OQ-16:** What is the theoretical minimum valid order id - do ids
start at `0` or `1` (standard SQL auto-increment convention), or some other scheme?
Not stated anywhere in this project's FR-11 input, Phase 1, or Phase 2.

Because the exact minimum is unresolved, the standard `min − step / min / min + step`
formula cannot be mechanically applied to a single known `min`. Instead, two
candidate hypotheses are both covered by the **same** three representative values:

| Hypothesis | `min − step` | `min` | `min + step` |
| --- | --- | --- | --- |
| A - 0-indexed (`min = 0`) | `-1` (invalid) | `0` (boundary) | `1` (valid interior) |
| B - 1-indexed (`min = 1`) | `0` (invalid, one below min) | `1` (boundary) | *(2 - not tested; see below)* |

Testing `{-1, 0, 1}` exercises the critical edge under **both** hypotheses at once -
`-1` is invalid under either reading, `0` is the disputed boundary under Hypothesis A
and clearly-invalid-but-informative under Hypothesis B, and `1` is the disputed
boundary under Hypothesis B and an ordinary valid interior point under Hypothesis A.
No `min + step` point beyond `1` is generated for Hypothesis B (i.e. `2`) - the task
scope names exactly `{0, 1, -1}` as the candidate set, and a fourth confirmatory
point adds little once OQ-16 is resolved and the true hypothesis is known.

**Maximum - not generated, no ceiling stated or implied.** No business rule or
data-type ceiling for order id is stated anywhere (the FR only says "integer," with
no bit-width/precision given, e.g. INT vs. BIGINT). Inventing a specific large number
as a "maximum-representable-integer" boundary would fabricate a ceiling not
evidenced anywhere - excluded per the skill's explicit instruction not to invent the
unstated side of an open-ended bound. (Phase 3's TC-06, `id = 999999`, already serves
its own distinct purpose - a large, arbitrary, unused id for *existence*-checking -
and is not a data-type-overflow probe; see the non-duplication note below.)

**New in Phase 4 - OQ-17:** Does `GET /api/orders/:id` apply any explicit
validation/range check on the sign of a syntactically-valid integer id (e.g.
rejecting negative or zero ids outright with a distinct error before any
lookup), or does it simply attempt a normal ownership/existence lookup for
**any** integer value (in which case a negative or zero id that matches no
record would just fall through to the same "not found" path, EC-18, as any
other nonexistent id)? Not stated anywhere in the FR.

**Practical caveat (stated once, applies to all three cases below):** unlike FR-01's
Password/Full Name (values a tester chooses and submits), order id is a
**system-generated** value - the tester cannot force an order to actually *have* id
`0`, `1`, or `-1`; these are simply the id **values requested** in the URL path,
regardless of what (if anything) really has that id in the database at execution
time. The concrete ownership/existence outcome for any of the three values below
therefore depends on unknown/unstated database state (auto-increment starting
point, prior test runs, other seed data) - this cannot be predicted from the FR
alone. What each test case **can** assert is that the value is routed through the
system's normal id-handling logic consistently (yielding whichever of
success/EC-16, denial/EC-17, or not-found/EC-18 the real data dictates) **unless** a
distinct sign/range check exists (OQ-17), which would be new, previously
undocumented behavior - not assumed in either direction.

**Non-duplication note:** none of BVA-01/02/03 below duplicate Phase 3. TC-06
(`id = 999999`) targets an arbitrary **large** well-formed integer chosen only to
guarantee "no matching record" for an *existence* probe, far from any numeric edge.
TC-07 (`id = "abc"`) targets a **non-integer string**, a format violation (EC-08), not
a well-formed integer at all. BVA-01/02/03 are specifically small, well-formed
integers **at the domain's own theoretical edge** - a distinct purpose from either.

| BVA ID | Boundary Point | EC / REQ | Precondition | Request | Expected Result | Distinction from Phase 3 |
| --- | --- | --- | --- | --- | --- | --- |
| BVA-01 | `-1` (invalid under both hypotheses - one step below the lower candidate minimum) | EC-05/EC-06/EC-07 (routing outcome depends on real DB state - see practical caveat); REQ-08 (order id) | `test@eshop.com` logged in (valid token). No specific order needs to exist at id `-1` (see practical caveat above). | `GET /api/orders/-1` with `Authorization: Bearer <test@eshop.com token>` | **Conditional, pending OQ-17:** if no distinct sign check exists, this falls through to "not found" (→ EC-18), the same treatment as any nonexistent well-formed id. If a distinct sign/range check exists, the rejection is a **different, currently undocumented** response - its shape is not asserted here. Either way, exact status/body also depends on the already-unresolved OQ-06/OQ-12/OQ-13 family. This is the error-type-2-relevant case: a check mis-specified as `id < 0` vs. `id <= 0` would only be distinguishable by testing exactly at `0` and `-1` together (see BVA-02). | Distinct from TC-06 (`999999`, a large arbitrary unused id - no sign involved) and TC-07 (`"abc"`, a non-integer format violation - no numeric value involved at all). |
| BVA-02 | `0` (the disputed boundary - Hypothesis A's `min`, Hypothesis B's `min − step`) | EC-05/EC-06/EC-07 (routing outcome depends on real DB state - see practical caveat); REQ-08 (order id) | Same as BVA-01. | `GET /api/orders/0` with `Authorization: Bearer <test@eshop.com token>` | **Conditional, pending OQ-16 and OQ-17:** if ids are 0-indexed and order `0` genuinely exists and belongs to `test@eshop.com`, expect success (→ EC-16); if it exists and belongs to someone else, expect denial (→ EC-17); if no order has id `0` (the common case under most real auto-increment schemes), expect not-found (→ EC-18). If a distinct sign/range check treats `0` as out-of-range regardless of any matching record, that is a different, undocumented rejection (OQ-17). This is the single most direct probe for OQ-16 itself. | Distinct from TC-06/TC-07 for the same reasons as BVA-01 - `0` is a well-formed integer at the domain's own disputed floor, not an arbitrary large id or a format violation. |
| BVA-03 | `1` (the disputed boundary - Hypothesis B's `min`, Hypothesis A's `min + step`) | EC-05/EC-06/EC-07 (routing outcome depends on real DB state - see practical caveat); REQ-08 (order id) | Same as BVA-01. | `GET /api/orders/1` with `Authorization: Bearer <test@eshop.com token>` | **Conditional, pending OQ-16:** same three-way branch as BVA-02 (success / denial / not-found, per whatever the real database state at id `1` is), but under the far more common "1-indexed" convention this is the actual theoretical minimum itself - the single highest-value representative for confirming the floor is inclusive once OQ-16 resolves toward Hypothesis B. | Distinct from TC-06/TC-07 for the same reasons as BVA-01/BVA-02. |

---

## 2. Boundaries Not Generated (Explicit Non-Fabrication Log)

Per the skill's instruction not to invent bounds that aren't stated, the following
are recorded as deliberate exclusions (summarized from §0, restated here for a
single audit point):

- **Order id - maximum / data-type ceiling:** no business-rule maximum and no
  data-type bit-width (INT vs. BIGINT vs. arbitrary precision) is stated anywhere.
  No `max − step / max / max + step` values are generated. Not tracked as a new Open
  Question - there is not even an implied ceiling to question, unlike order id's
  minimum (which at least has two plausible, nameable conventions).
- **Authorization state, status enum:** unordered/discrete - boundary analysis does
  not apply per the skill's explicit guidance on unordered enums.
- **Order id ownership routing (owned/other's/nonexistent) and format validity
  (integer/non-integer):** both are categorical/must-be-X conditions, already fully
  covered by Phase 3 (TC-02/03/06 and TC-07 respectively) - not ordered ranges.
- **Empty-state (order count):** no pagination/result-limit threshold is stated
  (Phase 1 OQ-04, still open) - nothing to bound.
- **Order date, Total amount:** neither was partitioned in Phase 2 (blocked by OQ-01,
  OQ-02) - there is no Phase 2 domain to derive a boundary from in this phase.
- **Output/outcome classes:** discrete outcome states; no numeric output range
  exists in this FR for BVA to apply to.

---

## 3. Technique Limitations (stated per skill requirement)

Boundary Value Analysis is a narrow, targeted technique, and this FR exercises very
little of it - this is a correct scope outcome, not incomplete coverage:

- **Only one genuinely ordered/numeric input dimension exists in this entire FR** -
  order id. Every other dimension (authorization state, status enum, ownership
  routing, id format validity, empty-state) is discrete/categorical, correctly
  excluded per Phase 2's own classification and the skill's explicit guidance that
  boundary analysis does not apply to unordered enums/discrete conditions. A reader
  expecting an FR-01-sized boundary artifact should not read this thinness as an
  oversight.
- **Order id is system-generated, not user-typed - a distinct blind spot from
  FR-01's fields.** FR-01's Password/Full Name boundaries could deterministically
  force an exact string length; here, the tester can only choose the id **value
  requested**, not what (if anything) actually has that id in the database. BVA-01,
  BVA-02, and BVA-03 therefore have conditional, not concrete, expected results -
  their real outcome depends on unstated database seeding conventions (OQ-16,
  OQ-17), not just on the FR's stated rules. This is a fundamentally different kind
  of gap than FR-01's "exact message text unspecified" (OQ-02-style) gaps - it's an
  inability to even control the precondition, not just an inability to assert the
  exact response.
- **Interior errors are not covered.** An order id far from any boundary, mishandled
  for reasons unrelated to range checks, would not be caught by this focused
  selection - Phase 3's TC-02/TC-03/TC-06/TC-07 already provide this FR's
  interior-value coverage for the ownership/format dimensions.
- **No backend implementation exists in this repository to cross-check** the real
  id-validation logic (the same grounding gap noted in every prior phase of this
  project). If a backend becomes available, OQ-16/OQ-17 could likely be answered
  directly by reading the id-validation code rather than needing test execution at
  all.
- **Over-reliance on the same three representative values.** If this suite is
  rerun repeatedly for regression testing, `-1`/`0`/`1` will always be probed and
  no other small values (e.g. `2`, `3`) ever will be - for this FR the risk is low,
  since order id has no composition sub-rules the way FR-01's Password did, but it
  is still worth noting per the skill's general guidance on this blind spot.

---

## 4. Open Questions Relevant to This Phase

| ID | Bearing on Phase 4 |
| --- | --- |
| OQ-06 | BVA-01/02/03's expected results (if routed to ownership denial) cannot state 403 vs. 404. |
| OQ-07 | Not directly triggered by these BVA cases (auth is held valid throughout), carried forward for completeness. |
| OQ-09 | BVA-01/02/03's expected results (if routed to success) cannot state an expected HTTP status code. |
| OQ-10 | Same cases cannot state an exact response envelope shape. |
| OQ-12 | BVA-01/02/03's expected results (if routed to not-found) cannot be confirmed as distinct from the ownership-denial branch. |
| OQ-13 | Carried forward - still governs EC-08/TC-07's own expected result, not directly re-triggered here since BVA-01/02/03 are all well-formed integers. |

**New in Phase 4 - OQ-16:** What is the theoretical minimum valid order id (0-indexed
vs. 1-indexed vs. other)? See §1. Directly blocks a concrete expected result for
BVA-02/BVA-03.

**New in Phase 4 - OQ-17:** Does the system apply a distinct sign/range validation
to order id, separate from the ownership/existence lookup? See §1. Directly blocks a
concrete expected result for all three BVA cases (BVA-01/02/03).

---

## 5. Self-Check

- [x] Precision and step stated explicitly, before computing values - "Order id is declared type integer... precision = 1 (whole integer), step = 1" (§1), stated before any boundary value is proposed.
- [x] `min − step / min / min + step` addressed - because the exact `min` is genuinely unresolved (not merely open-ended upward like FR-01's fields), both candidate hypotheses are shown explicitly in a table (§1) and covered by the same three representative values (`-1`, `0`, `1`) rather than silently picking one hypothesis. The maximum side is explicitly **not** fabricated - no stated or implied ceiling exists (§1, §2).
- [x] Every BVA test case traces to its dimension and REQ - **corrected 2026-07-06.** The table previously had no dedicated EC/REQ column at all, and this bullet wrongly claimed "§1's table cites REQ-08... throughout" when the literal string didn't appear anywhere in it (self-critique item 6). §1's table now has an explicit "EC / REQ" column naming EC-05/EC-06/EC-07 (the input classes each boundary id routes into, pending real DB state) and REQ-08 for all three rows, and each row's "Distinction from Phase 3" column separately cites the TC it must not be confused with.
- [x] No new equivalence classes invented to justify additional boundary cases - BVA-01/02/03 route to the **existing** Phase 2 output classes (EC-16/EC-17/EC-18) rather than inventing a new class for "negative/zero id" pre-emptively; if OQ-17 resolves toward "yes, a distinct sign check exists," a new Phase 2 equivalence class would need to be added retroactively - that is noted as a possible future revision trigger, not something this phase invents now.
- [x] Boundary points already exercised by Phase 3 are cross-referenced, not duplicated - the "Non-duplication note" and each row's "Distinction from Phase 3" column explicitly separate BVA-01/02/03 from TC-06 (`999999`, large-arbitrary) and TC-07 (`"abc"`, format violation).
- [x] Every boundary test case isolates exactly one condition - token/auth is held valid throughout (`test@eshop.com` logged in) in all three cases; only the requested order id value varies. Unlike FR-01's Password boundaries, order id has no composition sub-rules to entangle with, so no isolation caveat is needed here.
- [x] IDs unique and consistently formatted (`BVA-01`..`BVA-03`, zero-padded, no gaps).
- [x] No empty table cells - every cell populated; explicit reasoning given wherever a value is not generated (§0, §2).
- [x] Terminology consistent with Phases 1-3 ("class", "endpoint", "order id", "token", EC/REQ/TC/BVA IDs).
- [x] Technique Limitations stated explicitly (§3), as required by the skill, including the FR-specific point that order id is system-generated rather than user-typed - a distinct blind spot from FR-01's string-length boundaries.
- [x] Every excluded dimension has a stated reason (§0, §2) - nothing is silently out of scope; the thinness of this artifact relative to FR-01 is explained (§3), not left as an unexplained asymmetry.
- [x] No HTTP status code, response body, or behavior invented anywhere - every expected result in §1 is stated conditionally, branching only on Open Questions (existing: OQ-06, OQ-09, OQ-10, OQ-12, OQ-13; new: OQ-16, OQ-17), never asserting a specific outcome as fact.

---

## 6. Awaiting User Review

This is the Phase 4 artifact (Boundary Value Test Cases) for FR-11: Order History
View - 3 new boundary test cases (BVA-01: `id = -1`, BVA-02: `id = 0`, BVA-03:
`id = 1`), all targeting order id's numeric/ordered dimension, the only
boundary-sensitive dimension this FR has (§0). Two new Open Questions were raised:
OQ-16 (theoretical minimum order id - 0-indexed vs. 1-indexed vs. other) and OQ-17
(whether a distinct sign/range validation exists separate from the normal
ownership/existence lookup). Because order id is system-generated rather than
user-typed, all three test cases carry conditional (not concrete) expected results
that depend on unstated database conventions, not just on the FR's stated rules -
this is flagged explicitly in §1/§3 rather than glossed over. All other
dimensions from Phases 1-3 are explicitly out of BVA scope with a stated reason
(§0/§2), and this thinness relative to FR-01's artifact is explained in §3. This
also closes out the four-phase Domain Testing + BVA workflow for FR-11. Reply
"approved" (or similar) to complete the workflow, or request specific revisions.
