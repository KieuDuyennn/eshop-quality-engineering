# FR-11: Order History View (User) - Equivalence Partitioning (Phase 2)

Input artifact: `output/01_Requirements_Breakdown.md` (Phase 1, APPROVED).
Reference applied: `references/equivalence_partitioning_heuristics.md` (Kaner & Bach
domain-testing method).

**Implementation grounding note:** the heuristics require cross-checking assumed
equivalence against the actual API/backend when it exists in the repository. This
repository contains only the FR documents and skill files - there is **no backend or
`/api/orders/*` implementation present** to read (same situation as FR-01's Phase 2).
All classes below are derived from the FR prose and the Phase 1 breakdown only; any
class whose real behavior depends on unobservable implementation logic is flagged and
linked to the relevant Open Question rather than resolved by assumption.

**Scope note (per task instructions):** this FR is a READ + authorization feature, not
a form. Classes are grouped by **authorization state**, **order-id ownership**,
**status (output)**, and **empty-state (output)** - not by input field, unlike FR-01.
Order date (REQ-10) and Total amount (REQ-11) are **not partitioned in this phase**:
their format/domain is fully blocked by OQ-01 and OQ-02 respectively, and partitioning
them now would mean inventing an unresolved rule. They remain deferred until those
Open Questions are answered.

Legend - **V/I**: `Valid` / `Invalid`. Every class carries a stable `EC-xx` ID reused
by Phases 3-4.

---

## 1. Input Equivalence Classes

### 1.1 Authorization Classes (discrete - not a range)

These four request-context states are unordered/enumerated, not a numeric or ordered
domain - no boundary-value reasoning applies to them; that is reserved for Phase 4 and
only applies to the order-id domain (§1.2).

| EC ID | V/I | Applies To | Class Description | Source REQ | Empty/Null Decision | Produces Output | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EC-01 | Valid | Both endpoints | Valid Bearer token presented; for `GET /api/orders/:id`, the requested order also belongs to the requester (ownership satisfied) | REQ-01, REQ-02, REQ-06, REQ-08 (Global Precondition §0 of Phase 1 also applies) | N/A - a "valid token" is by definition present and non-empty; this class cannot be the empty/null case | EC-16 | None |
| EC-02 | Invalid | Detail endpoint only (`GET /api/orders/:id`) | Valid Bearer token presented, but the requested order id belongs to a different user | REQ-07, REQ-08 | N/A - token is present; ownership is a separate dimension from token presence/absence | EC-17 | Same underlying condition as EC-06 in §1.2 - detailed there from the order-id domain's point of view; not double-counted as a separate test target |
| EC-03 | Invalid | Both endpoints | No token supplied - `Authorization` header absent from the request | REQ-16 | **This class IS the mandatory empty/null case for the token input** - the header value is empty/absent | EC-19 | Response shape vs. EC-04 unresolved - see OQ-07 |
| EC-04 | Invalid | Both endpoints | Token supplied but invalid/malformed - e.g. a garbage string, an expired JWT, or one with a bad signature | REQ-17 | N/A - a value is present (non-empty); it fails validation on content, not on presence | EC-20 | Response shape vs. EC-03 unresolved - see OQ-07 |

### 1.2 Order-id Classes for `GET /api/orders/:id` (discrete)

Precondition: EC-01 (valid token) holds for every class below - this table isolates
the order-id dimension only. **Per task instructions, the ordered/numeric dimension of
Order id (magnitude, sign, and boundary values such as `0` or a negative id) is
deliberately NOT partitioned here - that is entirely Phase 4's job.** This phase
covers only (a) the discrete **ownership** dimension (who the id belongs to, three
distinct classes per OQ-12 - not merged) and (b) the **format/type** dimension
(whether the supplied value is even a valid integer at all), which is a guideline-(d)
"must-be-X" condition, orthogonal to ordering.

| EC ID | V/I | Class Description | Source REQ | Empty/Null Decision | Produces Output | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-05 | Valid | Order id owned by the requester | REQ-08 | N/A - id is present and well-formed | EC-16 | None |
| EC-06 | Invalid | Order id owned by another user (the order exists) | REQ-07, REQ-08 | N/A - id is present and well-formed | EC-17 | Same condition as EC-02 in §1.1. Response shape (403 vs. 404) unresolved - see OQ-06. Kept distinct from EC-07 per task instruction - see OQ-12 |
| EC-07 | Invalid | Order id does not exist at all (no order, for any user, has this id) | Not stated by any REQ - raised only as OQ-12 in Phase 1; no REQ asserts required behavior for this condition | N/A - id is present and well-formed; it simply matches no record | EC-18 | Whether this behaves the same as EC-06 or differently is explicitly unresolved - see OQ-12. Kept distinct from EC-06 per task instruction, not merged |
| EC-08 | Invalid | Order id supplied in a non-integer / malformed format (e.g. `"abc"`, `"1.5"`, an empty path segment) - a guideline-(d) "must-be-X" condition (X = valid integer), orthogonal to the ownership dimension above | §4 Inputs Summary of the input FR states the Order id type is "integer" (this class fulfils the Phase 1 `gap_notes.md` 2026-07-06 disposition: "order-id type will be captured in Phase 2 domain definition") | **This IS the empty/null case for the order-id format dimension** if the path segment is empty; also covers any non-numeric value | EC-21 | No REQ or Phase 1 OQ states expected behavior for a malformed id - new Open Question, see OQ-13 below |

---

## 2. Output Equivalence Classes

### 2.1 Status-Mapping Output Classes (guideline c)

Per guideline (c), each of the five status values is handled differently (a distinct
Vietnamese label + a distinct color per REQ-13/REQ-14) and gets its own class; a sixth
catch-all class covers any value outside the documented set. Status is OUTPUT-only for
these two GET endpoints (REQ-15's note) - there is no corresponding INPUT class for it;
these classes are sampled from an existing order's current status value at read time,
not driven by request parameters. **Neither the exact Vietnamese label text nor the
exact color is invented here** - both are left unresolved per OQ-08 and OQ-05
respectively.

| EC ID | Outcome Type | Class Description | Source REQ | Empty/Null Decision | Traces Back To | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-09 | Valid (output) | Displayed status = `pending` (Vietnamese label + color unspecified) | REQ-13, REQ-14, REQ-15 | N/A - REQ-12 requires status to always be displayed for a returned order; it is never null/empty | EC-16 (success response), assuming a seeded order in this status exists (REQ-19/REQ-20 setup) | VN label - OQ-08; color - OQ-05 |
| EC-10 | Valid (output) | Displayed status = `confirmed` | REQ-13, REQ-14, REQ-15 | N/A - same as EC-09 | EC-16 | VN label - OQ-08; color - OQ-05 |
| EC-11 | Valid (output) | Displayed status = `shipping` | REQ-13, REQ-14, REQ-15 | N/A - same as EC-09 | EC-16 | VN label - OQ-08; color - OQ-05 |
| EC-12 | Valid (output) | Displayed status = `delivered` | REQ-13, REQ-14, REQ-15 | N/A - same as EC-09 | EC-16 | VN label - OQ-08; color - OQ-05 |
| EC-13 | Valid (output) | Displayed status = `canceled` | REQ-13, REQ-14, REQ-15 | N/A - same as EC-09 | EC-16 | VN label - OQ-08; color - OQ-05. Reachable via REQ-19's `PUT /api/orders/:id/cancel` setup endpoint |
| EC-14 | Invalid (output) | A displayed status value outside the five-value set (guideline (c) invalid catch-all) - would indicate an undocumented state or a defect, since REQ-15 states the domain is "exactly five" values | REQ-15 | N/A - this is an anomaly/defect class, not a normal response; no empty/null dimension applies | Should be unreachable from any correctly-functioning input class - its presence would itself be a defect signal, not a normal response | Not linked to any Open Question; a sanity/regression class, not an ambiguity |

### 2.2 Empty-State Output Class

| EC ID | Outcome Type | Class Description | Source REQ | Empty/Null Decision | Traces Back To | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-15 | Valid (output) | `GET /api/orders/my-orders` for a user with zero orders returns an "appropriate empty state" | REQ-18 | **This IS the mandatory empty/null case for the returned orders collection itself** (the list, not a single field) | EC-01 (valid auth) **plus** an external data precondition - the account must actually have zero orders - which is test-data setup, not a request-input EC; flagged in §3 as a non-input-class trace | Exact shape (`[]` vs. a wrapped object vs. an explicit "no orders" marker) unresolved - see OQ-10 and new OQ-14 below |

### 2.3 Request-Outcome Output Classes

Added to satisfy the reference's mandatory input→output backward-trace requirement for
the §1.1/§1.2 input classes - not one of the four groups the task specified directly,
but required to close the loop rather than leave EC-02/03/04/06/07/08 without a traced
output.

| EC ID | Outcome Type | Class Description | Source REQ | Empty/Null Decision | Traces Back To (Input EC) | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-16 | Success | Order(s) returned - list (`my-orders`) or single detail (`:id`) - with all 4 required fields (REQ-09-REQ-12), status per EC-09..EC-13 | REQ-06, REQ-08, REQ-09-REQ-12 | N/A for a non-empty result; the zero-orders case is EC-15, not this class | EC-01 ∧ (for detail endpoint) EC-05 | Exact success status code unresolved - OQ-09; response envelope shape unresolved - OQ-10 |
| EC-17 | Rejected / Denied | Ownership violation - request for another user's order id denied / order not returned | REQ-07, REQ-08 | N/A - a denial/not-found response has no field-level empty/null dimension to decide | EC-02 (§1.1) / EC-06 (§1.2) - same input condition, two views | 403 vs. 404 unresolved - OQ-06 |
| EC-18 | Not Found | Requested order id does not exist for anyone | Not stated by any REQ (OQ-12 gap) | N/A - a denial/not-found response has no field-level empty/null dimension to decide | EC-07 | Whether identical to EC-17's response or distinct - OQ-12 |
| EC-19 | Rejected / Unauthorized | No token supplied | REQ-16 | N/A - an unauthorized rejection has no field-level empty/null dimension to decide | EC-03 | Status/body unresolved - OQ-07 |
| EC-20 | Rejected / Unauthorized | Invalid/malformed token supplied | REQ-17 | N/A - an unauthorized rejection has no field-level empty/null dimension to decide | EC-04 | Status/body unresolved - OQ-07; possibly identical to EC-19 - OQ-07 |
| EC-21 | Rejected / Error | Malformed order-id format supplied | Not stated by any REQ (new OQ-13) | N/A - a malformed-id error response has no field-level empty/null dimension to decide | EC-08 | Status/body entirely unresolved - new OQ-13; may or may not be merged with EC-18 ("not found") depending on backend routing/validation order - also noted in OQ-13 |

---

## 3. Backward-Trace Verification

Per the reference: every output class must be reachable from at least one input class
(or an explicitly flagged precondition), and every input class should map to an output
class - otherwise flag a gap.

| Check | Result |
| --- | --- |
| Every output class (EC-09..EC-21) has ≥1 producing input class or explicit precondition | Pass, with one flagged exception - EC-15 (empty state) traces to EC-01 only as an auth precondition; its actual trigger (zero orders) is a data-setup condition outside the EC-01..EC-08 request-input domain, not a request parameter - flagged, not silently treated as fully input-driven. EC-14 (out-of-set status) has no producing input class by design - it represents an anomaly/defect condition, consistent with guideline (c)'s invalid catch-all. |
| Every input class (EC-01..EC-08) maps to a producing output | Pass - see "Produces Output" column in §1.1/§1.2; none orphaned. |
| Both unauthorized conditions (REQ-16/REQ-17) have distinct output classes | Pass - EC-19 (no token) and EC-20 (invalid token), kept separate per task instruction; whether their actual responses differ is unresolved (OQ-07), not their input-side classification. |
| All four order-id conditions (EC-05/06/07/08) have distinct output classes | Pass - EC-16 (success), EC-17 (denial), EC-18 (not-found), EC-21 (malformed) respectively; EC-17/EC-18 not yet confirmed distinguishable - OQ-12. |
| Status output fully partitioned (5 values + catch-all) | Pass - EC-09..EC-14; VN label and color deliberately left unresolved per task instruction (OQ-08, OQ-05). |
| Empty-state output covered | Pass - EC-15; exact shape unresolved (OQ-10, new OQ-14). |

---

## 4. Open Questions Carried Into Phase 2

These Phase 1 Open Questions directly constrain the classes above; each remains
unresolved and blocks precise expected-result assertions where flagged.

| ID (from Phase 1) | Impact on this phase |
| --- | --- |
| OQ-05 | EC-09..EC-13 (and EC-14) cannot state an expected color; only "distinguishable from the others" can be asserted. |
| OQ-06 | EC-02/EC-06's produced output EC-17 cannot state an expected HTTP status code (403 vs. 404). |
| OQ-07 | EC-03/EC-04's produced outputs EC-19/EC-20 cannot state whether they are the same response or two distinct ones. |
| OQ-08 | EC-09..EC-13 cannot state an expected Vietnamese string; only "is translated to Vietnamese" can be asserted. |
| OQ-09 | EC-16 (success) cannot state an expected HTTP status code. |
| OQ-10 | EC-16 and EC-15 (empty state) cannot state an exact response envelope shape. |
| OQ-12 | EC-07/EC-18 cannot be confirmed as distinct from EC-06/EC-17 - kept separate per task instruction, but their expected results may turn out identical once resolved. |

**New in Phase 2 - OQ-13:** What does `GET /api/orders/:id` return when the supplied
id is not a valid integer at all (e.g. `"abc"`, `"1.5"`, an empty path segment)?
Neither the FR nor Phase 1 states this. *Impact:* EC-08/EC-21 have no expected result;
Phase 3/4 cannot assert a concrete outcome until this is answered (or an actual backend
implementation becomes readable in this repo - none exists today, the same grounding
gap noted in FR-01's Phase 2).

**New in Phase 2 - OQ-14:** For the empty-state response (EC-15), is it an empty array
`[]` inside whatever envelope the success case (EC-16) uses, or a distinct
marker/shape (e.g. `{ "orders": [], "message": "..." }`)? Not stated anywhere in the
FR. *Impact:* EC-15's expected result can only be asserted as "an empty state is
shown," not a concrete body.

---

## 5. Self-Check

- [x] Every equivalence class is traceable to the source requirement - each row cites its `REQ-xx`, or explicitly states "no REQ - OQ-xx gap" when none exists (EC-07, EC-08, EC-18, EC-21).
- [x] No invented business rules - the implementation-grounding note states no backend exists in this repo (same as FR-01); every validity/format gap is linked to an Open Question (existing or newly raised: OQ-13, OQ-14) rather than resolved by assumption.
- [ ] Every equivalence class has at least one covering test case - N/A for Phase 2 (test cases are produced in Phase 3); coverage is instead pre-verified via the §3 backward-trace.
- [x] IDs are unique and consistently formatted (`EC-01`..`EC-21`, zero-padded), grouped in the order the task requested (§1.1 Authorization, §1.2 Order-id, §2.1 Status, §2.2 Empty-state) plus §2.3 Request-Outcome outputs added to close the input→output loop - grouping rationale stated in each section header, not a chronological artifact.
- [x] No table cell is empty without an explicit marker - "N/A" used consistently for empty/null decisions where the condition doesn't apply, with a reason stated each time. (Corrected 2026-07-06: EC-14, EC-17, EC-18, EC-19, EC-20, EC-21 originally carried a bare "N/A" with no stated reason, which this bullet claimed didn't happen - self-critique caught the mismatch; each now states why no empty/null dimension applies.)
- [x] Terminology is consistent throughout - "class," "endpoint," "order id," "token" used consistently with Phase 1's vocabulary.
- [x] Both INPUT and OUTPUT classes derived - §1 (INPUT: EC-01..EC-08) and §2 (OUTPUT: EC-09..EC-21) - backward-traced in §3.
- [x] Empty/null explicitly decided for every class - EC-03 (no token) is itself the auth-token empty case; EC-08 covers the order-id format-empty/malformed case; EC-15 is the orders-list empty case; the status classes (EC-09..EC-13) are explicitly noted as never-null per REQ-12.
- [x] No overlapping partitions - EC-02 (§1.1) and EC-06 (§1.2) are explicitly cross-referenced as the same underlying condition (not double-counted as independent test targets); EC-03/EC-04 (absent vs. present-but-invalid token) and EC-05/06/07/08 (ownership vs. nonexistence vs. malformed format) are each mutually exclusive at this phase's level of resolution, with the ordered/numeric dimension of order id explicitly deferred to Phase 4 rather than partitioned here (avoiding a premature/overlapping range class).

---

## 6. Awaiting User Review

This is the Phase 2 artifact (Equivalence Partitioning) for FR-11: Order History View -
8 input classes (EC-01..EC-08, grouped as Authorization §1.1 and Order-id §1.2) and 13
output classes (EC-09..EC-21, grouped as Status-mapping §2.1, Empty-state §2.2, and
Request-Outcome §2.3), with forward/backward traceability. Order date and Total amount
remain unpartitioned pending OQ-01/OQ-02. Two new Open Questions were raised (OQ-13:
malformed order-id format behavior; OQ-14: exact empty-state response shape). Reply
"approved" (or similar) to proceed to Phase 3 (Domain Test Design), or request specific
revisions.
