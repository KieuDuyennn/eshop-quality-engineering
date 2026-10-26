# FR-13: Admin Dashboard - Equivalence Partitioning (Phase 2)

Source: `output/01_Requirements_Breakdown.md` (APPROVED - REQ-01..REQ-15,
OQ-01..OQ-13). Reference: `references/equivalence_partitioning_heuristics.md`
(Kaner & Bach Domain Testing Method, guidelines a-e).

## 0. Global Precondition (carried forward from Phase 1 §0)

REQ-04 through REQ-07 (dashboard content) all assume the actor already
satisfies REQ-08/09/10 (admin access granted - EC-04 below). This is not
re-stated per class; every content-related output class (EC-15..EC-22)
implicitly requires EC-04 as a precondition, exactly as Phase 1 documented.

## 1. Guideline Legend

| Letter | Shape | Applies in this FR? |
| --- | --- | --- |
| (a) Range | A continuous/ordered numeric range with min/max | Not applied in Phase 2 - the revenue value and order count are numeric outputs, but per special instruction 1 this phase partitions the *status enum that drives them*, not the number line. Guideline (a) is reserved for Phase 4 (BVA) once the actual numbers are in scope. |
| (b) Number-of-values | A "1 to N items allowed" cardinality constraint | Not applicable - FR-13 has no stated cardinality limit anywhere (order count is an unbounded count, not a bounded list-size input). |
| (c) Discrete set, each handled differently | A set of values where the spec does NOT assert uniform handling | Used for Access Control (§2.1/§3.1) - the FR never claims the 3 denial paths produce identical output (OQ-08, OQ-13 explicitly leave this open), so each stays its own class per the Core Fault-Detection Principle. |
| (d) "Must be X" | A binary satisfies-X / does-not-satisfy-X condition | Used for Revenue Membership (§2.2/§3.2) - REQ-06 explicitly asserts uniform handling ("Specified As Equivalent") for the 4 non-delivered statuses, so guideline (d) collapses them to one excluded class by default. |
| (e) Risk-based refinement | Split a class further when a specific fault theory targets a subset of it | Used twice: (1) to split the (d)-derived excluded class - OQ-05 specifically singles out `canceled` orders as the one nonzero-`total_amount` case that must not leak into revenue, so `canceled` gets its own class instead of staying merged with pending/confirmed/shipping; (2) to split the zero-orders-at-all empty-state output by field (EC-20 revenue / EC-21 order count) - a plausible SQL-level risk (`SUM()` over an empty group commonly returns `NULL` while `COUNT()` returns `0`) means a bug could break one field's zero-display without breaking the other (Phase 2 self-critique finding P2-G01). |

## 2. Input Equivalence Classes

### 2.1 Access Control (REQ-08, REQ-09, REQ-10)

Guideline (c) - kept as 3 separate discrete denied classes plus 1 valid
class, per special instruction 2 and Phase 1's own atomicity split. Not
guideline (d), because guideline (d) would collapse all 3 denials into one
"invalid" class - but OQ-08/OQ-13 leave open whether the 3 denials actually
produce different responses, and collapsing them here would hide that
question rather than test it.

| EC ID | Tag | Class Description | Valid/Invalid | Empty/Null Applicable | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-01 | Input | No token provided in the request | Invalid | This class *is* the "absent" condition - no further null case within it. | REQ-08 |
| EC-02 | Input | Invalid/malformed token provided (present but not a valid JWT) | Invalid | N/A - token is present but malformed; distinct from EC-01's absence. | REQ-09 |
| EC-03 | Input | Valid JWT provided, but `role != 'admin'` (e.g. `role = 'user'`) | Invalid | N/A - token and role are both present and well-formed. | REQ-10 |
| EC-04 | Input | Valid JWT provided, `role = 'admin'` | Valid | N/A - the satisfied case. | REQ-08, REQ-09, REQ-10 (precondition for REQ-04..REQ-07) |

### 2.2 Order Status - Revenue Membership (REQ-05, REQ-06)

Guideline (d), refined by (e). Input here is the status of a given order at
the time the dashboard aggregates revenue - a test-setup precondition
established via `PUT /api/admin/orders/:id/status` (REQ-13), not a
user-submitted field of FR-13 itself.

| EC ID | Tag | Class Description | Valid/Invalid | Empty/Null Applicable | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-05 | Input | Order status = `delivered` | Valid (satisfies the revenue-inclusion condition) | N/A - status is always set once an order exists. | REQ-05 |
| EC-06 | Input | Order status = `canceled` | Invalid (does not satisfy inclusion) - split out from EC-07 per guideline (e), risk-flagged by OQ-05 as the one non-delivered status with a nonzero `total_amount` that must not leak into revenue | N/A | REQ-06, OQ-05 |
| EC-07 | Input | Order status = `pending`, `confirmed`, or `shipping` (combined - REQ-06 asserts identical handling for all three, and no risk theory in the FR distinguishes them from each other) | Invalid (does not satisfy inclusion) | N/A | REQ-06 |

**Valid/Invalid note:** "Valid/Invalid" in this subsection means "matches /
does not match the revenue-inclusion condition (`status = 'delivered'`)" -
not a data-quality judgment on the order itself.

### 2.3 Order Set Scope - Order Count (REQ-07)

| EC ID | Tag | Class Description | Valid/Invalid | Empty/Null Applicable | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-08 | Input | The complete set of orders in the system across all 5 statuses, at dashboard-load time | N/A - a data-set precondition, not a validity dimension | The zero-orders case is EC-09 below, not this class | REQ-07 (scope of which subset counts is undetermined - see OQ-02) |

Per special instruction 5, EC-08 is deliberately left un-resolved as to
*which* subset of this set actually feeds "total number of orders" - that
depends entirely on OQ-02, which is not guessed here.

### 2.4 Empty-State Preconditions (OQ-03, OQ-04)

Guideline (d) - two distinct "must have at least one X" conditions, kept
separate per special instruction 4 (do not merge "no orders at all" with
"orders exist but none delivered").

| EC ID | Tag | Class Description | Valid/Invalid | Empty/Null Applicable | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-09 | Input | Zero orders exist in the system at all (no status has any orders) | N/A - a legitimate reachable system state, not an erroneous input | This class **is** the empty/null system-state itself | REQ-07, OQ-03 |
| EC-10 | Input | Orders exist (at least one, of any status) but zero of them have `status = delivered` | N/A - a legitimate reachable system state | This class **is** the "empty delivered subset" state | REQ-05, REQ-06, OQ-04 |

## 3. Output Equivalence Classes

### 3.1 Access Control Outcomes (REQ-08, REQ-09, REQ-10)

| EC ID | Tag | Class Description | Empty/Null Applicable | Traces From | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-11 | Output | "Access denied" response for a no-token request | N/A | EC-01 | REQ-08; response shape unresolved - OQ-08, OQ-13 |
| EC-12 | Output | "Access denied" response for an invalid/malformed-token request | N/A | EC-02 | REQ-09; response shape unresolved - OQ-08, OQ-13 (OQ-13 specifically asks whether this equals EC-11's response) |
| EC-13 | Output | "Access denied" response for a valid-token/non-admin-role request | N/A | EC-03 | REQ-10; response shape unresolved - OQ-08 |
| EC-14 | Output | "Access granted" response - dashboard data returned | N/A | EC-04 | REQ-08, REQ-09, REQ-10; success status/body unresolved - OQ-10, OQ-11 |

### 3.2 Revenue Membership Outcomes (REQ-05, REQ-06)

| EC ID | Tag | Class Description | Empty/Null Applicable | Traces From | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-15 | Output | Order **included** in the revenue sum | N/A | EC-05 (+ EC-04 precondition) | REQ-05 |
| EC-16 | Output | Order **excluded** from the revenue sum - `canceled` case | N/A | EC-06 (+ EC-04 precondition) | REQ-06, OQ-05 |
| EC-17 | Output | Order **excluded** from the revenue sum - `pending`/`confirmed`/`shipping` case | N/A | EC-07 (+ EC-04 precondition) | REQ-06 |

Per special instruction 1, EC-15/16/17 partition the **status enum**, not
the `total_amount` number line - they answer "does this order count toward
the sum," not "what does the sum equal."

### 3.3 Revenue Value Output (REQ-04)

| EC ID | Tag | Class Description | Empty/Null Applicable | Traces From | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-18 | Output | The displayed total revenue **value** (the numeric aggregate itself, distinct from the membership question in §3.2) - a guideline-(a)-shaped numeric output, but its actual range/boundaries are explicitly deferred to Phase 4 | The zero-delivered-orders case is EC-22 below, not this class | EC-05 (one or more included orders) + EC-04 | REQ-04, REQ-05; format/precision unresolved - OQ-07 (currency/rounding), OQ-09 (integer vs. decimal); trustworthiness of the underlying `total_amount` unresolved - OQ-06 |

### 3.4 Order Count Output (REQ-07)

| EC ID | Tag | Class Description | Empty/Null Applicable | Traces From | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-19 | Output | The displayed total order count **value** - guideline-(a)-shaped numeric output, actual range deferred to Phase 4 | The zero-orders-at-all case is EC-21 below, not this class | EC-08 (+ EC-04 precondition) | REQ-07; scope of which orders are counted unresolved - OQ-02 (see also new OQ-14, §5) |

### 3.5 Empty-State Outputs (OQ-03, OQ-04)

Guideline (e) risk-based refinement: the zero-orders-at-all empty state was originally modeled as one
combined output class covering both revenue and order count, on the
reasoning that OQ-03 asks about "the dashboard" holistically without
distinguishing fields. That combined the display of two independently
stated requirements (REQ-04 revenue, REQ-07 order count) into one EC - the
same kind of merge the access-control and revenue-membership subsections
above deliberately avoid. A plausible SQL-level risk theory makes the split
concrete: `SUM()` over an empty group commonly returns `NULL`, while
`COUNT()` over the same empty group correctly returns `0` - a bug could
break the revenue field's zero-display while the count field's stays
correct, or vice versa, and a combined class could not isolate which. Split
into EC-20 (revenue) and EC-21 (order count) accordingly, both tracing to
the same input precondition (EC-09). Sequential integers were used for the
split (EC-20/EC-21) rather than EC-20a/EC-20b, consistent with how this
project already renumbered REQ-08's split in Phase 1 (REQ-08/REQ-09, not
REQ-08a/REQ-08b) - this pushes the old EC-21 (revenue's zero-delivered case)
down to EC-22.

| EC ID | Tag | Class Description | Empty/Null Applicable | Traces From | REQ/OQ Ref |
| --- | --- | --- | --- | --- | --- |
| EC-20 | Output | Dashboard's displayed **revenue** when zero orders exist at all | This class **is** the empty-display output for revenue | EC-09 (+ EC-04 precondition) | REQ-04, OQ-03 |
| EC-21 | Output | Dashboard's displayed **order count** when zero orders exist at all | This class **is** the empty-display output for order count | EC-09 (+ EC-04 precondition) | REQ-07, OQ-03 |
| EC-22 | Output | Dashboard's displayed revenue when orders exist but zero are `delivered` (`0`, or empty/undefined - not resolved here) | This class **is** the empty-delivered-subset display output | EC-10 (+ EC-04 precondition) | REQ-04, REQ-05, OQ-04 |

**Symmetry re-check (does EC-22 need the same field split against order
count?):** Not merged the way old EC-20 was - EC-22 has always been
revenue-only, with no order-count sibling for the EC-10 precondition. This
asymmetry (EC-09 now has 2 field-scoped output twins; EC-10 has only 1) is
intentional, not an oversight: whether order count needs its own zero-value
display under EC-10 depends entirely on how OQ-02 resolves (if the counted
scope ends up delivered-only, EC-10 would drive a zero order-count display
that isn't modeled yet; if the scope includes non-delivered orders, EC-10
never produces a zero count and no such class is needed). That dependency
is exactly what OQ-14 (§5, reworded below) already discloses - so EC-22 is
left as-is rather than speculatively split before OQ-02 is answered.

## 4. Backward Traceability (Output → Input)

| Output EC | Input EC(s) It Traces To | Gap? |
| --- | --- | --- |
| EC-11 | EC-01 | None |
| EC-12 | EC-02 | None |
| EC-13 | EC-03 | None |
| EC-14 | EC-04 | None |
| EC-15 | EC-05 (+ EC-04) | None |
| EC-16 | EC-06 (+ EC-04) | None |
| EC-17 | EC-07 (+ EC-04) | None |
| EC-18 | EC-05 (+ EC-04) | None - but see OQ-07/OQ-09/OQ-06 for what the traced value actually equals |
| EC-19 | EC-08 (+ EC-04) | None structurally, but the exact input subset feeding this output is undetermined until OQ-02 resolves (not a missing-input-class gap - the input set EC-08 exists, its filter function does not) |
| EC-20 | EC-09 (+ EC-04) | None |
| EC-21 | EC-09 (+ EC-04) | None |
| EC-22 | EC-10 (+ EC-04) | None |

Every output class traces to at least one input class - no orphan output
behavior identified.

## 5. Open Questions

All Open Questions referenced above (OQ-02, OQ-03, OQ-04, OQ-05, OQ-06,
OQ-07, OQ-08, OQ-09, OQ-10, OQ-11, OQ-13) are carried forward from Phase 1,
unresolved, exactly as approved - none are answered or guessed at in this
phase.

One new Open Question was identified during class derivation:

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-14 | If OQ-02 resolves such that "total number of orders" counts only a status-restricted subset (e.g. delivered-only), does order count need its own dedicated output class for the "orders exist but none delivered" precondition (EC-10) - analogous to EC-22 (revenue's zero-delivered display) - rather than staying fully covered by EC-21 (order count's zero-orders-at-all display)? | EC-19 (the general order-count output) currently traces its empty case only to EC-09/EC-21 (zero-orders-at-all). If OQ-02 resolves toward a restricted scope, EC-10 (orders exist, none delivered) could ALSO drive a zero order-count display that is not yet modeled anywhere - a gap symmetrical to the one the EC-20/EC-21 split just closed for revenue. This is not resolved now - it is flagged so Phase 3/4 don't silently miss it once OQ-02 is answered. | Derived while tracing EC-19's empty-state dependency (§3.4) against §2.4's two distinct empty preconditions; re-examined after the EC-20/EC-21 split (Phase 2 self-critique P2-G01) sharpened the comparison |

## 6. Self-Check

Re-run after the 2026-07-06 Phase 2 self-critique fixes (P2-G01, P2-G02
applied).

- [x] Every input and output class is tagged (`Input`/`Output` column present
      on every EC row) and traces to a Phase 1 REQ or OQ - verified per row
      in §2 and §3's REQ/OQ Ref columns.
- [x] All 5 Kaner guidelines (a-e) considered explicitly, including the two
      that ended up not driving any class in this FR - guideline (a) is
      deliberately deferred to Phase 4 (not skipped silently) and guideline
      (b) is stated as inapplicable with a reason, both in §1's legend.
      Guideline (e) is now applied twice (EC-06/EC-07 split; EC-20/EC-21
      split) and §1's legend states both uses.
- [x] Access control kept as 3 separate discrete denied classes (EC-01/02/03)
      plus 1 valid class (EC-04), per special instruction 2 - not recombined.
- [x] Revenue partitioned as an output-membership problem on the status enum
      (EC-15/16/17), not as a `total_amount` range - per special
      instruction 1. Inclusion (EC-15) and exclusion (EC-16/17) are two
      distinct classes, never merged into one.
- [x] Order id / order count: no boundary/range language used anywhere in
      this phase (EC-08/EC-19 describe the data set and its output value
      without numeric boundaries) - that is explicitly deferred to Phase 4,
      per special instruction 3.
- [x] Two distinct empty-state input classes exist (EC-09 zero-orders-total;
      EC-10 zero-delivered-among-existing), per special instruction 4 - not
      merged. **Corrected claim:** their output twins are
      no longer symmetrical 1:1, and that asymmetry is now stated rather
      than hidden. EC-09 has **two** field-scoped twins (EC-20 revenue,
      EC-21 order count) after the self-critique found the original single
      combined EC-20 bundled two independently-stated requirements
      (REQ-04, REQ-07) under one class. EC-10 still has **one** twin
      (EC-22, revenue only); §3.5's symmetry re-check explains this is a
      disclosed, OQ-02-dependent gap (see OQ-14), not an inconsistency -
      the previous self-check's claim of clean "each with its own output
      twin" symmetry was itself part of what P2-G01 flagged as misleading,
      and is not repeated here.
- [x] No Open Question was resolved or guessed - every class whose behavior
      depends on an unresolved OQ states the class and cites the OQ (e.g.
      EC-18 cites OQ-07/OQ-09/OQ-06; EC-19 cites OQ-02) rather than assuming
      an answer, per special instruction 5. OQ-14 was reworded (not
      resolved) to stay accurate after the EC-20/EC-21 split.
- [x] Every output class traces back to at least one input class (§4); no
      orphan output identified. EC-20 and EC-21 both trace to EC-09 (+
      EC-04), matching how the split was specified. One legitimate
      scope-dependency (EC-19/EC-22 on OQ-02) is disclosed rather than
      hidden, tracked via OQ-14.
- [x] No table cell is empty without an explicit reasoned marker - every
      "N/A" in the Empty/Null Applicable and Valid/Invalid columns states
      *why*, not a bare dash.
- [x] IDs are unique and consistently formatted (`EC-01`..`EC-22`, sequential,
      Input classes EC-01..EC-10 before Output classes EC-11..EC-22, zero
      gaps). **Renumbering approach (per P2-G01 fix):** sequential integers
      were used for the split (new EC-20, EC-21) rather than EC-20a/EC-20b,
      pushing the former EC-21 (revenue's zero-delivered case) down to
      EC-22 - chosen for consistency with this project's own Phase 1
      precedent (REQ-08's split became REQ-08/REQ-09, not REQ-08a/REQ-08b).
      Every reference to the old EC-20/EC-21 numbering was checked and
      updated: §0 precondition range, §1 legend, §3.3 EC-18's Empty/Null
      cell (EC-21→EC-22), §3.4 EC-19's Empty/Null cell (EC-20→EC-21), §4
      backward traceability, §5 OQ-14, and §7's counts.
- [x] §2's four subsection tables now all label their citation column
      "REQ/OQ Ref", matching §3 - fixes P2-G02 (the header previously read
      "REQ Ref" despite several rows already citing OQs).
- [ ] Every equivalence class has at least one covering test case - N/A for
      Phase 2 (test cases are designed in Phase 3).

## 7. Awaiting User Review

This is the Phase 2 artifact (Equivalence Partitioning) for FR-13: Admin
Dashboard - 10 input classes (EC-01..EC-10) and 12 output classes
(EC-11..EC-22), full backward traceability, and one new Open Question
(OQ-14). Please review and reply "approved" (or similar) to proceed to
Phase 3 (Domain Test Design), or request specific revisions.
