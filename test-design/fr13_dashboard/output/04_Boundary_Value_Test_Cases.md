# FR-13: Admin Dashboard - Boundary Value Test Cases (Phase 4)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED -
EC-01..EC-22) and `output/03_Domain_Test_Cases.md` (Phase 3, APPROVED -
TC-01..TC-08).
Reference applied: `references/boundary_value_heuristics.md` (Kaner & Bach
domain-testing method).

> Note on filename: saved as `04_Boundary_Value_Test_Cases.md` (not
> `04_BVA.md` as literally typed in the request), matching the artifact path
> declared in `state.json` and the convention used by FR-01/FR-11 - same
> reasoning as the filename note in `03_Domain_Test_Cases.md`.

---

## 0. Scope Determination - Which Dimensions Are Boundary-Sensitive

Every field/dimension from Phase 2/3 is evaluated below so the scope decision
is auditable - dimensions excluded are excluded by explicit reasoning, not
omission (per special instruction 3).

| Dimension | REQ | Phase 2/3 Ref | Ordered range? | BVA Applicable? | Reasoning |
| --- | --- | --- | --- | --- | --- |
| **`total_amount` per order** (feeds the revenue SUM) | REQ-05, REQ-06 | EC-05, EC-06, EC-07, EC-15, EC-16, EC-17, EC-18 | Yes - numeric, but precision **unresolved** (OQ-09) and no stated min/max | **Yes** | See §1. Precision must be stated for both OQ-09 candidates before any value is computed - not guessed. |
| **Count of `delivered` orders** (feeds how many rows the SUM aggregates; this is a distinct, narrower concept from "total order count" (EC-19) - see the scope caveat in §2) | REQ-05, REQ-07 | EC-09, EC-10, EC-19, EC-20, EC-21, EC-22; TC-01, TC-05, TC-06, TC-07, TC-08 | Yes - a count, unambiguously integer, min = 0 for *delivered-order count specifically* (already established by EC-10's empty-state framing) | **Yes** | See §2. A genuinely different domain from `total_amount` - this is about **how many** qualifying rows exist, not the value of any one row. Per special instruction 2, these are kept as two distinct domains, not conflated. **This domain's `min = 0` is EC-10 (delivered-count = 0), not EC-09 (zero orders at all) - the two are only the same boundary if OQ-02 resolves toward a delivered-only total-order-count scope; see §2's explicit caveat and OQ-14.** |
| Order status (`pending`/`confirmed`/`shipping`/`delivered`/`canceled`) | REQ-05, REQ-06 | EC-05, EC-06, EC-07 | No (unordered discrete set) | **No - explicit exclusion, per special instruction 3** | Already fully covered by Phase 2 (guideline (c)/(d)+(e)) and Phase 3 (TC-01, TC-05, TC-06). Restated here so the exclusion reads as deliberate, not an oversight. |
| Role (`admin` / non-admin) | REQ-08, REQ-09, REQ-10 | EC-01, EC-02, EC-03, EC-04 | No (unordered discrete) | **No - explicit exclusion, per special instruction 3** | A role is not an ordered domain; "admin vs. not admin" has no intermediate values to bound. Already fully covered by Phase 2/3 (TC-02/03/04). |
| Token presence/validity (no token / invalid / valid) | REQ-08, REQ-09 | EC-01, EC-02 | No (discrete) | **No** | Same reasoning as role - a discrete condition, not an ordered range. |
| Order id | - | - | N/A | **No - nothing to exclude** | Unlike FR-11, FR-13's dashboard surface (`GET /api/admin/orders`) takes no order-id parameter at all - there is no order-id **input** dimension in this FR for BVA to apply to or exclude. Stated explicitly per special instruction 3 rather than left unaddressed. |
| Access-control output classes (EC-11..EC-14) | REQ-08, REQ-09, REQ-10 | EC-11, EC-12, EC-13, EC-14 | No (discrete outcome states) | **No** | Denied/granted are discrete outcomes, not points on an ordered scale. |
| Revenue **value**/order-count **value** as *displayed numbers* | REQ-04, REQ-07 | EC-18, EC-19, EC-20, EC-21, EC-22 | These are the *outputs* of the two domains above, not separate domains | **Covered via §1/§2** | The displayed revenue and count numbers are exactly what §1/§2's boundary values produce as expected results - not an independent third dimension. |

**Result: exactly two boundary-sensitive dimensions carried forward -
`total_amount` per order (§1) and count of `delivered` orders (§2).**
Everything else is excluded above with a stated reason (§3 collects these as
a single non-fabrication log).

---

## 1. Domain (a): `total_amount` per Order - Revenue-Sum Precision Boundary

**Fault theory this domain targets: rounding/precision errors in the SUM
arithmetic** (error types 1-3 from the reference - a value handled
incorrectly regardless of position, an inequality mis-specified exactly at a
threshold, or a mistyped constant) - **not** aggregation-over-many-rows,
which is domain (b)'s concern (§2). Per special instruction 2, these are
kept strictly separate.

**Precision and step - stated before computing (per skill requirement), and
left genuinely undetermined per OQ-09, not guessed:**

| Hypothesis | Precision | Step | Rationale |
| --- | --- | --- | --- |
| A - Integer VND | Whole units, no decimals | **1** | OQ-09 candidate: "an integer (VND, no decimals)" |
| B - Decimal currency | 2 decimal places | **0.01** | OQ-09 candidate: "a decimal value" |

Both hypotheses are carried through this entire section side by side - the
artifact does not pick one, per special instruction 1.

**Bound determination:** FR-13 states no explicit minimum or maximum for
`total_amount` anywhere (Phase 1 §4 Inputs Summary lists it only as `number`).
Unlike a stated numeric floor, a lower bound of **0** here is an *implicit
derivation* from monetary-domain semantics (an order amount is not normally
negative) - analogous to FR-01's "Full Name must not be empty → implicit
`minLen = 1`" derivation, and flagged the same way: **not** a literal number
written in FR-13, and its correctness is not certain (see new **OQ-16**
below on whether checkout can even produce a negative amount). No maximum is
stated at all - open-ended, not fabricated; flagged as new **OQ-17**.

| Boundary Point | Value (Hyp. A - integer) | Value (Hyp. B - decimal) | Classification | EC | Reachability |
| --- | --- | --- | --- | --- | --- |
| min − step | `-1` | `-0.01` | Below the implied floor | EC-05/EC-15 (if `delivered`) | **Conditional - see new OQ-16.** Whether a negative `total_amount` can ever reach a `delivered` order at all is a checkout/FR-08 question, not an FR-13 one; included here because *if* such a row exists, FR-13's SUM behavior on it is still worth checking. |
| min | `0` | `0` (same value - precision-invariant) | At the implied floor | EC-05/EC-15 | Reachable via checkout with a fully-discounted/free item - more clearly in-scope than the negative case. |
| min + step | `1` | `0.01` | Just above the floor | EC-05/EC-15 | Reachable via ordinary checkout (REQ-15, OQ-06). |
| max − step / max / max + step | - | - | - | - | **Not generated - open-ended upper bound, new OQ-17.** |

| BVA ID | Boundary Point | Value | EC / REQ | Precondition (order data setup) | Expected Result |
| --- | --- | --- | --- | --- | --- |
| BVA-01 | min − step (Hyp. A) | `total_amount = -1` | EC-05, EC-15, EC-18 / REQ-05 | One `delivered` order with `total_amount = -1`. **Reachability caveat (new OQ-16):** may not be producible via any documented flow if checkout rejects negative amounts - if unreachable, this row is a hypothetical probe (e.g. via direct data seeding), not an end-to-end test. | *If reachable:* displayed revenue reflects `-1` correctly summed (not clamped to 0, not causing an error) - per OQ-07/OQ-09, to be confirmed once precision is known. This is the error-type-2 case for a floor mis-specified as `>= 0` (which would incorrectly exclude a legitimately negative row, if one is possible) vs. `> -1`. |
| BVA-02 | min (both hypotheses) | `total_amount = 0` | EC-05, EC-15, EC-18 / REQ-05 | One `delivered` order with `total_amount = 0`. | **(a) Checkable assertion:** displayed revenue = `0`, reflecting this one `delivered` order's amount being correctly summed rather than dropped or erroring. Per OQ-07/OQ-09 for exact display format. **(b) Separate, unresolved observation (not a pass/fail criterion):** this scenario looks the same (`revenue = 0`) as the *no-delivered-orders* empty state (EC-22/TC-08). **OQ-18** asks whether the dashboard needs to (or even can) distinguish "one delivered order worth 0" from "zero delivered orders" - left open here, not graded either way. |
| BVA-03 | min + step (Hyp. A) | `total_amount = 1` | EC-05, EC-15, EC-18 / REQ-05 | One `delivered` order with `total_amount = 1`. | Displayed revenue = `1` (VND, if Hyp. A holds) - confirms the smallest positive integer unit is not truncated/rounded away. Per OQ-09 to confirm which hypothesis is real. |
| BVA-04 | min − step (Hyp. B) | `total_amount = -0.01` | EC-05, EC-15, EC-18 / REQ-05 | One `delivered` order with `total_amount = -0.01`. Same reachability caveat as BVA-01 (new OQ-16). | *If reachable:* displayed revenue reflects `-0.01` correctly (not rounded to `0` or `-1`) - a step-size-mis-specification check specific to the decimal hypothesis. Per OQ-07/OQ-09. |
| BVA-05 | min + step (Hyp. B) | `total_amount = 0.01` | EC-05, EC-15, EC-18 / REQ-05 | One `delivered` order with `total_amount = 0.01`. | Displayed revenue = `0.01` (if Hyp. B holds) - confirms the smallest decimal unit is not rounded down to `0` (a classic floating-point/rounding fault this exact value is designed to catch). Per OQ-09. |

---

## 2. Domain (b): Count of `delivered` Orders - SUM Aggregation Boundary

**Fault theory this domain targets: aggregation-over-N-rows errors** (e.g. a
`SUM`/`COUNT` implementation that only reads the first matching row, stops
early, or double-counts) - **distinct from domain (a)'s** rounding/precision
concern, per special instruction 2.

**Precision and step:** a count of orders is unambiguously a whole number -
**no OQ-09-style ambiguity here.** Precision = integer, **step = 1**.

**Bound determination:** Minimum = **0** - already established by Phase 2's
EC-09/EC-10 (empty-state input classes) and exercised by Phase 3's TC-07/
TC-08. Maximum: no cap on the number of delivered orders is stated anywhere
in FR-13 - open-ended, not fabricated (already covered by existing **OQ-12**,
pagination, rather than a new OQ).

**Scope caveat:** the `min = 0`
boundary below is **EC-10** (orders exist, zero `delivered`) - this is
correct and unambiguous for "count of `delivered` orders" specifically,
regardless of how OQ-02 resolves. It is **not** automatically the same as
the zero-boundary of the *total order count* (EC-19). If OQ-02 resolves
toward counting **all** orders regardless of status, EC-10's scenario still
has at least one (non-`delivered`) order present, so total order count
would be nonzero there - the total-count zero-boundary would instead be
**EC-09/TC-07** ("zero orders at all"). The two only coincide as the same
boundary if OQ-02 resolves toward a **delivered-only** total-order-count
scope. This is exactly what existing **OQ-14** (carried forward, Phase 2/3)
already asks - see §5. The table below is scoped to "count of `delivered`
orders" only; it does not claim to resolve `total order count`'s own
boundary.

| Boundary Point | Value | Classification | EC / TC | Already covered? |
| --- | --- | --- | --- | --- |
| min − step | `-1` delivered orders | Structurally impossible | - | **Not independently testable** - a count cannot be negative; included only to complete the formula (same treatment as FR-11's order-id lower-bound precedent). No test case generated. |
| min | `0` delivered orders | Valid (edge case) | EC-10, EC-22 / **TC-08** | **Yes - already covered.** TC-08's precondition is exactly "orders exist, zero `delivered`." No new case generated; cross-referenced only. (TC-07's stronger "zero orders at all" - EC-09 - is a related but distinct, more extreme edge, already covered separately; it is also the *total order count*'s own zero-boundary if OQ-02 resolves toward an all-statuses scope, per the caveat above.) |
| min + step | `1` delivered order | Valid (interior) | EC-05, EC-15 / **TC-01, TC-05, TC-06** | **Yes - already covered.** All three existing test cases use exactly one `delivered` reference order. No new case generated. |
| "many" (N ≥ 2) | `3` delivered orders | Valid (interior, aggregation-focused) | EC-05, EC-15, EC-18, EC-19 / **new BVA-06** | **No - genuine gap.** No existing TC exercises more than one `delivered` order at once, so multi-row aggregation has never actually been tested. |
| max − step / max / max + step | - | - | - | **Not generated - open-ended upper bound, OQ-12 (pagination).** |

| BVA ID | Boundary Point | Precondition (order data setup) | Expected Result |
| --- | --- | --- | --- |
| BVA-06 | "many" (3 delivered orders) | Three `delivered` orders with distinct, known amounts (e.g. `100`, `200`, `300` - Phase 3 D-5-style illustrative values, precision per OQ-09) and no other statuses present (kept minimal so this probe isolates the aggregation-count fault, not a mix with exclusion logic already covered by TC-05/TC-06). **Why 3, not the minimum-sufficient 2:** N=3 also rules out an off-by-one/hard-bounded-to-2 aggregation bug (e.g. a loop or query limit that happens to process exactly 2 rows correctly by coincidence) that an N=2 case alone could not distinguish from genuine N-row aggregation. | Displayed revenue = `600` (the sum of all three, not just the first or last) - this is the case that would catch a "only sums one row" or "stops after the first match" bug that BVA-02/03/05 (single-order cases) and TC-01/05/06 (also single-`delivered`-order cases) structurally cannot catch, since none of them ever present the SUM with more than one term to aggregate. If OQ-02 later resolves toward a delivered-only order-count scope, this same data set also exercises the order-count output (EC-19) at `3` - noted, not asserted as confirmed, since OQ-02 remains open. |

---

## 3. Boundaries Not Generated (Explicit Non-Fabrication Log)

Per the skill's instruction not to invent bounds that aren't stated, the
following are recorded as deliberate exclusions (summarized from §0):

- **`total_amount` maximum:** no maximum stated anywhere in FR-13. No
  `max − step / max / max + step` values generated. Flagged as new **OQ-17**,
  not silently absent.
- **Count of `delivered` orders - maximum:** no cap stated. No max-side
  boundary generated. Already tracked by existing **OQ-12** (pagination) -
  not duplicated as a new OQ, since OQ-12 already captures exactly this
  "what happens with many orders" concern from the retrieval side.
- **Order status, role, token validity:** unordered/discrete conditions -
  boundary analysis does not apply, per the skill's explicit guidance and
  special instruction 3. Already fully covered by Phase 2/3.
- **Order id:** not applicable - FR-13 has no order-id input dimension at
  all (§0), unlike FR-11. Nothing was excluded because nothing exists to
  exclude; stated for completeness only.
- **Count of `delivered` orders - min − step (`-1`):** structurally
  impossible, not independently testable - included in §2's table only to
  complete the formula, per the skill's standard technique.

---

## 4. Technique Limitations (stated per skill requirement)

- **Interior errors are not covered.** A `total_amount` or delivered-order
  count handled incorrectly for reasons unrelated to a boundary (e.g. a
  currency-conversion bug that only appears above 1,000,000) will not be
  caught by this boundary-focused selection - Phase 3's TC-01/05/06
  representative values (`100`, `50`) are the only interior-value coverage
  this suite has for domain (a); BVA-06's `3`-order case is the only
  interior coverage beyond `0`/`1` for domain (b).
- **The real domain may not match the spec.** No backend implementation
  exists in this repository to cross-check (as already noted in Phase 2) -
  if the real system enforces a minimum/maximum `total_amount`, or a
  pagination limit on delivered-order count, that isn't stated in FR-13, the
  boundaries computed here could be incomplete. This is precisely why OQ-16,
  OQ-17, and existing OQ-12 matter before this suite is executed as-is.
- **Both `total_amount` precision hypotheses cannot both be "the" boundary.**
  §1 deliberately carries two parallel boundary sets (Hyp. A integer, Hyp. B
  decimal) because OQ-09 is unresolved. Once OQ-09 resolves, roughly half of
  §1's test cases (BVA-01/03 or BVA-04/05, whichever hypothesis is wrong)
  will turn out to be testing a precision that doesn't exist in the real
  system - this is a deliberate, disclosed redundancy, not an oversight.
- **Negative-`total_amount` reachability is genuinely unknown.** BVA-01 and
  BVA-04 may not be executable via any documented flow at all if checkout
  validation (FR-08, out of this FR's scope) rejects negative amounts before
  an order can ever reach `delivered` status. They are included because *if*
  such a row can exist (e.g. via the tampering concern already flagged as
  OQ-06), FR-13's own SUM behavior on it is still worth verifying
  independently - but their executability is conditional, not guaranteed.
- **Single-fault isolation across domains (a) and (b) is deliberate, not
  automatic.** §1 and §2 are kept as separate, non-overlapping data setups
  specifically so a failure can be attributed to precision/rounding (a) or
  to aggregation-over-N-rows (b), not both at once - a reviewer combining
  BVA-06's 3-order setup with BVA-01/04/05's extreme amounts in a single
  ad hoc test would lose that attribution.

---

## 5. Open Questions Relevant to This Phase

Carried forward (unchanged from Phase 1/2/3 - none resolved here):

| ID | Bearing on Phase 4 |
| --- | --- |
| OQ-09 | Directly governs §1's entire structure: because integer-vs-decimal precision is unresolved, every `total_amount` boundary value is computed twice (Hyp. A / Hyp. B) rather than once. |
| OQ-07 | Currency/rounding format is still unresolved - every BVA-01..05 expected result is qualified "per OQ-07/OQ-09" rather than asserting an exact displayed string. |
| OQ-06 | The negative-`total_amount` reachability question (BVA-01/BVA-04) ties directly to OQ-06's client-supplied-`total_amount` concern - if that tampering vector is real, it is one plausible way a negative or otherwise-unexpected amount could reach a `delivered` order. |
| OQ-02 | BVA-06's data set would also exercise the order-count output (EC-19) at `3` if OQ-02 resolves toward a delivered-only scope - noted in BVA-06's row, not assumed. |
| OQ-12 | Governs why no max-side boundary is generated for domain (b) (§2, §3) - an unstated pagination limit is the same underlying concern as "how many delivered orders can this endpoint actually report." |
| OQ-14 | **(Added - fixes P4-G05.)** Whether order count needs its own dedicated empty-state output class for the "orders exist, none delivered" precondition (EC-10), or stays covered by the general order-count output (EC-19), depending on how OQ-02 resolves. This is the exact question §2's new scope caveat references: it determines whether EC-10 is ever a valid stand-in for *total* order count's zero-boundary, or only for "count of `delivered` orders" specifically. |
| OQ-15 | **(Added - fixes P4-G05.)** Whether the order dataset can be reset/isolated for a test run, or always reflects cumulative history. Directly bears on whether §2's `min = 0` boundary (TC-08) and its cross-referenced sibling TC-07 (EC-09, "zero orders at all") are actually executable as written in a persistent, shared test environment. |

**New in Phase 4:**

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-16 | Can checkout (`POST /api/checkout`) ever produce a negative `total_amount` on a resulting order, or is a negative value rejected/impossible before an order is created at all? | Determines whether BVA-01/BVA-04 (the `min − step` boundary under both precision hypotheses) are executable via any documented flow, or are purely hypothetical unless direct data seeding is available. | Derived while determining §1's implicit floor - FR-13 itself states no minimum, and no other Phase 1 artifact addresses whether checkout enforces one. |
| OQ-17 | Is there any stated or intended maximum `total_amount` per order? | FR-13 states no maximum at all; without this, §1's max-side boundary cannot be generated (per the skill's explicit "do not invent the other bound" rule) - flagged rather than silently left out. | §1's bound-determination step found no stated ceiling anywhere in Phase 1's input FR. |
| OQ-18 | Can the dashboard distinguish "one `delivered` order with `total_amount = 0`" from "zero `delivered` orders" (EC-22) in its displayed revenue, or do both scenarios necessarily look identical (`0`, or empty/undefined per OQ-04)? | BVA-02 (`total_amount = 0`) and TC-08/EC-22 (zero delivered orders) could be indistinguishable at the display layer even though they are different underlying states - worth knowing whether that ambiguity is expected or itself a gap. | Derived while writing BVA-02's expected result (§1) |

---

## 6. Self-Check

Re-run after the 2026-07-06 Phase 4 self-critique fixes (P4-G01..P4-G05
applied).

- [x] Precision and step stated explicitly, before computing values, for
      both boundary-sensitive domains - domain (a) states both OQ-09
      hypotheses (integer step `1`, decimal step `0.01`) side by side rather
      than picking one (§1); domain (b) states its unambiguous integer step
      `1` (§2).
- [x] `min − step / min / min + step` computed for both domains; `max −
      step / max / max + step` explicitly **not** fabricated for either -
      domain (a)'s ceiling is open-ended (OQ-17), domain (b)'s is
      open-ended (existing OQ-12) - both stated at the point of omission
      (§1, §2), not silently absent.
- [x] The two ordered domains (`total_amount` per order vs. count of
      `delivered` orders) are kept strictly separate per special
      instruction 2 - different fault theories stated explicitly in each
      section's opening line (§1: rounding/precision; §2:
      aggregation-over-N-rows), and no test case's data setup mixes an
      extreme `total_amount` value with a multi-order aggregation scenario
      (flagged explicitly in §4). **Corrected:** domain (b)'s
      `min = 0` boundary is now explicitly scoped to "count of `delivered`
      orders" only (§0, §2) - it no longer implies this is automatically
      also *total order count*'s zero-boundary. A new scope caveat in §2
      states that EC-10 is the correct zero-boundary for delivered-count
      regardless of OQ-02, but EC-09/TC-07 would be the correct
      zero-boundary for *total* order count if OQ-02 resolves toward an
      all-statuses scope - cross-referenced to OQ-14.
- [x] Enums (status, role, token validity) are explicitly excluded from BVA
      with a stated reason (§0), not silently skipped, per special
      instruction 3. Order id is separately noted as not applicable at all
      to this FR (no such input dimension exists here), also stated rather
      than left unaddressed.
- [x] Every BVA test case traces to its EC(s)/REQ(s), and boundary points
      already exercised by Phase 3 are cross-referenced rather than
      duplicated - domain (b)'s `min` (TC-08) and `min + step` (TC-01, TC-05,
      TC-06) reuse existing test cases; only the genuinely new points
      (domain (a)'s five values, domain (b)'s "many" case) get new BVA IDs.
      **Corrected:** BVA-06's choice of `3` (rather than the
      minimum-sufficient `2`) is now justified inline - it rules out an
      off-by-one/hard-bounded-to-2 aggregation bug that N=2 alone could not
      distinguish from genuine N-row aggregation.
- [x] No Open Question was resolved or guessed - OQ-09's two hypotheses are
      both carried through §1 rather than one being picked; OQ-02's
      dependency is noted on BVA-06 without assuming an answer; three new
      Open Questions (OQ-16, OQ-17, OQ-18) were raised rather than silently
      assumed away, per special instruction 4. **Corrected:**
      these are now sequential and gapless - the first draft skipped OQ-16
      entirely (jumped straight to OQ-17/18/19) with no documented reason;
      re-verified via `grep` that the full OQ sequence in this document is
      now OQ-02, OQ-04, OQ-06, OQ-07, OQ-09, OQ-12, OQ-14, OQ-15, OQ-16,
      OQ-17, OQ-18 - no gaps, no stale references to the old OQ-17/18/19
      meanings remain anywhere (including the `§7` shorthand summary, which
      used a two-digit-shorthand format `OQ-17/18/19` that a plain
      find-and-replace on `OQ-XX` patterns would have missed - checked and
      fixed by hand). **Corrected:** OQ-14 and OQ-15
      (Phase 2/3) were missing from §5's carried-forward list despite being
      directly relevant to this document's own content - both now added
      with a stated bearing on Phase 4.
- [x] Every expected result states an actual pass/fail criterion, not just an
      instruction to observe or an ambiguous claim. **Corrected (fixes
      P4-G04):** BVA-02's expected result previously fused a checkable
      assertion ("revenue reflects 0") with an explicitly-unresolved
      question (distinguishability from the empty state) in one confusing
      sentence. It now states the checkable assertion - (a), revenue = `0`
      - as the pass/fail criterion, and the distinguishability question -
      (b), OQ-18 - as a separately labeled, explicitly-not-graded
      observation.
- [x] Technique Limitations stated explicitly (§4), including the two
      FR-13-specific caveats (dual-hypothesis redundancy for `total_amount`
      precision; negative-amount reachability uncertainty) alongside the
      generic ones (interior errors, real-domain-vs-spec mismatch).
- [x] Every excluded dimension has a stated reason (§0, §3) - nothing is
      silently out of scope.
- [x] IDs unique and consistently formatted (`BVA-01`..`BVA-06`, zero-padded,
      no gaps; `OQ-16`..`OQ-18` new, `OQ-01`..`OQ-15` carried forward,
      gapless as a combined sequence) - re-verified this revision, not just
      the BVA IDs as the first draft's self-check did.
- [x] No empty table cells - every cell populated; "-" used only where a
      value legitimately does not apply (e.g. the max-side columns).
- [x] Terminology consistent with Phases 1-3 ("class", "requirement",
      "endpoint", EC/REQ/OQ/TC/BVA IDs).

## 7. Awaiting User Review

This is the Phase 4 artifact (Boundary Value Test Cases) for FR-13: Admin
Dashboard - 6 new boundary test cases (BVA-01..BVA-06) across the two
boundary-sensitive domains identified in this FR: `total_amount` per order
(§1, precision unresolved per OQ-09 - both integer and decimal hypotheses
carried through in parallel) and count of `delivered` orders (§2, testing
SUM aggregation over multiple rows for the first time in this project - a
genuine coverage gap Phase 3 never exercised). Three boundary points already
covered by Phase 3 (TC-01/05/06, TC-08) are cross-referenced, not duplicated.
Enums (status, role, token validity) and order id are explicitly confirmed
out of scope, not silently skipped. Three new Open Questions raised
(OQ-16/17/18). This completes the four-phase Domain Testing + BVA workflow
for FR-13 pending your review. Reply "approved" to close it out, or request
specific revisions.
