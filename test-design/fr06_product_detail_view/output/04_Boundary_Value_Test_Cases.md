# FR-06: Product Detail View (Mobile) - Boundary Value Test Cases (Phase 4)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED -
EC-01..EC-43) and `output/03_Domain_Test_Cases.md` (Phase 3, APPROVED -
TC-01..TC-13).
Reference applied: `references/boundary_value_heuristics.md` (Kaner & Bach
domain-testing method).

> Note on filename: saved as `04_Boundary_Value_Test_Cases.md` (not
> `04_Boundary_Value_Analysis.md` as literally typed in the request),
> matching the artifact path declared in `state.json` and the convention
> used by every other project in this repo (same reasoning as the filename
> notes in `03_Domain_Test_Cases.md`).

---

## 0. Scope Determination - Which Dimensions Are Boundary-Sensitive

Every field from Phase 1-3 is evaluated below so the scope decision is
auditable - dimensions excluded are excluded by explicit, per-field
reasoning, not by a single blanket label applied to all of them.

**A note on precision, stated up front:** the instruction framed the 4
excluded display fields as "not ordered numeric domains." That is exactly
right for **category** (a genuinely unordered enumerated value) and
**image** (a reachability condition, not a scale), but **price** is in
fact numeric, and **name**/**description** do have an ordered *length*
dimension in principle. The real, more precise reason none of the 4 get a
generated boundary test case here is stated per-field below - mostly "no
stated or determinable threshold exists to bound," not "not ordered." The
*outcome* for 3 of the 4 fields (no BVA test cases for image, name,
description, category) matches the original instruction; **Price's
exclusion has since been reversed**.

| Dimension | REQ | Ordered domain? | BVA Applicable? | Reasoning |
| --- | --- | --- | --- | --- |
| **Quantity** | REQ-10, REQ-11, REQ-12 | Yes - integer, explicit stated minimum (`1`, REQ-12) | **Yes** | See §1. The only field in this FR with an explicitly *stated* numeric bound. |
| Image (`imageUrl`) | REQ-05 | No | **No** | Phase 2's classes for this field (EC-08/09/10) are a discrete reachability condition (reachable / broken-but-present / empty), not a point on any ordered scale - there is no length, count, or magnitude dimension to bound at all. |
| Name | REQ-06 | Length is ordered in principle | **No** | FR-06 states no minimum or maximum name length anywhere (Phase 1/2 only describe "very long" qualitatively, via TD-07/EC-12, with no numeric threshold). An open-ended bound with **no stated limit on either side** cannot have a boundary value computed at all - there is nothing to add/subtract a step from without fabricating a threshold FR-06 never gives. (No *implicit* floor/ceiling is plausible for a name's length the way a monetary floor of `0` is plausible for a price - there is no domain-semantics reason to assume any particular length threshold.) |
| **Price** | REQ-07 | Yes - numeric | **Yes (reversed - fixes P4-G02)** | See §2. Originally excluded here on "no stated threshold on either side." **That exclusion is reversed**, matching this same project's own prior FR-13 precedent (`fr13_dashboard/output/04_Boundary_Value_Test_Cases.md` §1): FR-13's `total_amount` also had no explicit stated minimum, yet that phase derived an **implicit floor of `0`** from monetary-domain semantics (an amount is not normally negative), generated real boundary test cases around it, and raised a new Open Question about reachability - rather than excluding the field outright. Price is structurally identical (a monetary value set by a *different* FR - product creation/admin CRUD - and merely displayed here, exactly as `total_amount` is set by checkout and merely aggregated/displayed by FR-13). Excluding one and not the other was an unjustified inconsistency, not a defensible field-specific distinction. |
| Description | REQ-08 | Length is ordered in principle | **No** | Same reasoning as Name - no stated length threshold anywhere in FR-06, and no plausible implicit floor/ceiling either. |
| Category (`category_id`) | REQ-09 | No (unordered enumerated value) | **No** | Per the reference's own "Boundaries on Enumerated/Discrete Values" section: for unordered enums, boundary analysis does not apply at all - Phase 2's equivalence classes (EC-21/22/23) already provide full coverage. This is the one exclusion that is genuinely "not an ordered domain," not just "no stated threshold." |

**Result: two boundary-sensitive dimensions carried forward - Quantity
(§1) and Price (§2). Image, Name, Description, and Category remain
excluded above with a stated, field-specific reason - not silently
skipped.**

---

## 1. Domain: Quantity - Minimum-Boundary Analysis (REQ-10, REQ-11, REQ-12)

**Fault theory this domain targets:** an inequality mis-specified at the
stated minimum - e.g. code checking `quantity > 1` instead of `quantity >=
1` (which would incorrectly reject the valid value `1`), or `quantity >=
0` instead of `>= 1` (which would incorrectly accept `0`). This is
specifically error type 2 from the reference (only detectable by testing
exactly at the boundary, not by an arbitrary interior value like the `5`
already used in Phase 3's TC-01) - plus error type 1 ("the program simply
doesn't like `0`"), which the same boundary value also happens to catch.

**Precision and step - stated explicitly before computing, per Phase 1's
OQ-07 instruction:** Quantity is constrained to integers (REQ-11, "MUST
accept only **positive integers**"). Precision = whole numbers only,
**step = 1**.

**Bound determination:** Minimum = **1**, explicitly stated (REQ-12: "The
minimum accepted quantity is 1") - not an implicit derivation, an actual
literal number in the FR. **Maximum: none stated anywhere (Phase 1's
OQ-01) - per the reference's rule ("if a bound is open-ended... only
generate boundaries for the side that has a stated limit - do not invent
the other bound"), no upper-boundary triplet is generated at all.** This
is not an oversight; it is stated again in §4 (Technique Limitations).

| Boundary Point | Value | Classification | EC / TC Ref | Already covered? |
| --- | --- | --- | --- | --- |
| min − step | `0` | Below the stated minimum (invalid) | EC-03 / TC-04 | **Yes - this boundary point is the exact same value Phase 3's TC-04 already tests.** No new test case generated; BVA-01 below documents the coincidence rather than duplicating it. |
| min | `1` | At the stated minimum (valid) | EC-01 | **No** - Phase 3's TC-01 used `5` as its representative valid quantity, never the literal boundary value `1`. New test case (BVA-02). |
| min + step | `2` | Just above the stated minimum (valid) | EC-01 | **No** - not previously tested at this exact value. New test case (BVA-03). |
| max − step / max / max + step | - | - | - | **Not generated - open-ended upper bound, per OQ-01 (§4).** |

**CF-02 applicability across these 3 points:** CF-02 (spec says reject
invalid quantity; code, unconfirmed, appears to silently default it to
`1`) is a conflict about **invalid** input handling only. It applies to
`min − step` (`0`, invalid) exactly as it did in TC-04. It does **not**
apply to `min` (`1`) or `min + step` (`2`) - both are valid inputs that
the spec and the code-observation agree should simply be accepted as
entered, so there is no competing prediction to carry for those two rows.

| BVA ID | Boundary Point | Value | EC / REQ | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| BVA-01 | min − step | `0` | EC-03, EC-25, EC-26 / REQ-11, REQ-12 | Fixture A (baseline product, per Phase 3 D-7/D-2's shared unconfirmed-login caveat) is the product being viewed. | Identical to TC-04: clear the Quantity field, enter `0`, tap Add to Cart. | **This is exactly TC-04, restated here as the boundary point it also happens to be - not a new test.** Two competing predictions (CF-02), carried forward unchanged: **Prediction A (EC-25, spec-mandated):** quantity `0` is rejected - a validation error is shown and/or Add to Cart does not proceed. **Prediction B (EC-26, code-observed, unconfirmed):** quantity `0` is silently replaced with `1`, no error shown. Record which is actually observed. **Evidentiary basis, stated explicitly:** this dual-prediction rests entirely on CF-02, which itself rests entirely on a static code read (Phase 1, REQ-16/REQ-17) - no test case in this project, including BVA-01, has actually been executed on a device yet. BVA-01's real execution would be among the first opportunities to confirm or contradict CF-02 directly, not a formality. |
| BVA-02 | min | `1` | EC-01, EC-24 / REQ-11, REQ-12 | Fixture A (baseline product) is the product being viewed. | 1. Clear the Quantity field. 2. Enter `1`. 3. Tap Add to Cart (per Phase 3 D-3 - solely to observe the quantity outcome). | Quantity `1` is accepted with no error (EC-24) - this is the exact minimum, not merely "a small valid number" (Phase 3's TC-01 used `5`); if the implementation incorrectly checks `quantity > 1` instead of `quantity >= 1`, this is the one value that would expose it, where `5` would not. **No CF-02/device-confirmation caveat applies here** - this assertion rests only on REQ-11/REQ-12's own spec text, with no code-observation basis to confirm or contradict. |
| BVA-03 | min + step | `2` | EC-01, EC-24 / REQ-11, REQ-12 | Fixture A (baseline product) is the product being viewed. | 1. Clear the Quantity field. 2. Enter `2`. 3. Tap Add to Cart (per Phase 3 D-3). | Quantity `2` is accepted with no error (EC-24) - completes the standard `min−step/min/min+step` triplet; confirms the value immediately above the boundary is not itself mishandled by an off-by-one elsewhere in the same check. **No CF-02/device-confirmation caveat applies here**, same reasoning as BVA-02. |

---

## 2. Domain: Price - Implicit Floor Boundary (REQ-07)

**Added to reverse the original exclusion - see §0's Price
row for the precedent this follows.**

**Fault theory this domain targets:** primarily error type 1 (a general
"the display/formatting logic doesn't handle a negative value" defect -
e.g. a crash, a mis-rendered sign, or a `Number(...).toLocaleString()`-style
call producing something unexpected for a negative input). This is
**not** the same kind of test as Quantity's - there is no *stated*
inequality in FR-06 to mis-specify (error type 2 does not apply the same
way), because the floor itself is implicit, not a literal FR quote.

**Bound determination - implicit, explicitly labeled as such:** FR-06
states no minimum price anywhere. A floor of **`0`** is nonetheless a
plausible, ordinary assumption from monetary-domain semantics (a price is
not normally negative) - **this is an inference, not a quote from FR-06,
and its correctness is not certain.** Whether a negative price is even a
reachable state for this display screen (e.g. via a data-entry error
somewhere in a different FR's product-creation flow) is genuinely
unknown - see new **OQ-19** (§5).

**Precision and step:** Price's exact precision is itself unresolved
(OQ-06 - integer VND vs. decimal currency, never resolved in Phase 1-3).
Rather than picking one hypothesis, the single new boundary case below
uses **step = 1** (the coarsest, currency-unit-level step already used as
the representative granularity for "very large price," EC-16, in Phase
2/3) - sufficient to test the qualitative question this case targets (does a
negative price break the display at all), without depending on which
OQ-06 hypothesis turns out to be correct. This is a narrower BVA pass than
Quantity's: only the one clearly-missing case (below the implicit floor)
is added here, not a full `min−step/min/min+step` triplet - `0` itself
(EC-15) and an ordinary positive price (EC-14) are already covered by
Phase 3's TC-02 and TC-01 respectively, and REQ-07 states no exact literal
threshold value the way REQ-12 does for Quantity, so there is no
equivalent "hit this exact number" boundary to add beyond the floor
itself.

| BVA ID | Boundary Point | Value | EC / REQ | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| BVA-04 | Implicit min − step | `-1` | REQ-07; new class, not in Phase 2 (see §4's carried-forward gap note) | A product record with `price = -1` is the product being viewed. **Reachability caveat, same pattern as new OQ-19:** may not be producible via any documented flow in this FR (FR-06 only displays existing data; whether a negative price can ever be *stored* is a different FR's concern) - if unreachable through the app/admin UI, this is a hypothetical probe via direct data seeding, not an end-to-end test, exactly as OQ-17 already flags for other atypical fixtures. | *If reachable:* the screen renders `-1` in whatever the stated price format turns out to be (per OQ-06) without crashing, showing `NaN`, or silently clamping to `0` - record what actually happens; none of these outcomes is assumed in advance. *Separately, unresolved (new OQ-19):* is a negative price even a state this screen should ever need to handle, or is it provably unreachable? Not graded either way here. |

---

## 3. Coverage & Traceability

**Test-case count, stated plainly:** Phase 4 adds **2**
genuinely new test cases (BVA-02, BVA-03) plus **1** more from this fix
pass (BVA-04) - **3 genuinely new test cases in total**. BVA-01 restates
TC-04 with **zero** new execution. **Project-wide distinct-execution
total: 13 (Phase 3) + 3 (Phase 4: BVA-02, BVA-03, BVA-04) = 16 distinct
executions - not 17** (BVA-01 does not add a 17th).

| BVA ID | Boundary Point | Covers (new vs. restates) | EC(s) / REQ | Notes |
| --- | --- | --- | --- | --- |
| BVA-01 | Quantity `0` (min − step) | Restates TC-04 exactly - zero new execution | EC-03, EC-25, EC-26 | Included so the boundary/domain-testing connection is explicit and auditable, not to inflate the count. |
| BVA-02 | Quantity `1` (min) | New | EC-01, EC-24 | First test of the literal boundary value; TC-01 tested `5` (an interior value), not `1`. |
| BVA-03 | Quantity `2` (min + step) | New | EC-01, EC-24 | Completes the standard triplet. |
| BVA-04 | Price `-1` (implicit min − step) | New | REQ-07 (no Phase 2 EC - see §4) | Reverses the original Price exclusion; see §2, §0. |

All other equivalence classes (EC-02, EC-04..EC-23 except as noted for
BVA-04, and all Output classes not tied to Quantity's minimum) remain
exactly as covered in Phase 3 - Phase 4 does not re-derive or re-test
them, per the reference's own scope (BVA applies only to the
boundary-sensitive dimensions identified in §0).

---

## 4. Technique Limitations (stated explicitly, per the reference)

- **No upper boundary exists in this test suite for Quantity.** OQ-01 (max
  quantity - capped by stock? a hard cap? unbounded?) remains unresolved
  from Phase 1 through this phase. Per the reference's explicit rule, an
  open-ended bound only gets boundaries generated for the side that has a
  stated limit - inventing a `max−step/max/max+step` triplet here would
  fabricate a threshold FR-06 never states. If OQ-01 is later resolved
  with a concrete maximum, an upper-boundary triplet should be added to
  §1 at that time - not done here.
- **Display fields (image, name, description, category) have no
  generated boundary test cases at all** - see §0's per-field reasoning.
  This is a scope limitation of this technique for these 4 fields, not an
  oversight: image and category have no ordered dimension at all; name
  and description have no stated threshold, and no plausible implicit
  floor/ceiling the way a monetary value has.
- **Price's implicit floor (§2, BVA-04) is an inference, not a stated FR
  rule, and its own uncertainty is carried into new OQ-19** - this is a
  weaker evidentiary basis than Quantity's boundary (§1), which rests on
  an explicit, literal FR statement (REQ-12). The two should not be read
  as equally certain.
- **Carried-forward gap, noted here rather than silently patched
  retroactively (per instruction):** no negative-price equivalence class
  exists anywhere in `02_Equivalence_Partitioning.md` (Phase 2's Price
  subsection, §2.2.3, has only EC-14 normal / EC-15 zero / EC-16 very
  large). BVA-04 (§2) is tested here without a corresponding Phase 2 EC
  ID to trace to - a genuine gap in Phase 2's own coverage, discovered
  during this Phase 4 self-critique, and recorded here for the record
  rather than retroactively edited into an already-approved Phase 2
  artifact.
- **General blind spots of domain testing + BVA (per the reference),
  applicable here as anywhere:** an interior-value defect unrelated to
  either boundary (e.g. a bug specific to quantity `7` or price `12345`
  for no boundary-related reason) would not be caught by this test suite
  at all. The actual implementation may also partition inputs differently
  than Phase 2's classes assume - REQ-16/REQ-17/CF-01/CF-02 already flag
  exactly this risk for Quantity and Category respectively, and remain
  unconfirmed on-device throughout this entire phase (see BVA-01's own
  evidentiary-basis note in §1 for how this applies concretely to one
  specific test case, not just in the abstract).
- **BVA-01 restating TC-04** means this phase does not increase quantity
  invalid-boundary coverage beyond what Phase 3 already had - it only
  makes explicit that TC-04's value happens to be the boundary point, and
  adds the two previously-untested interior/boundary values (`1`, `2`)
  that Phase 3 had not covered. See §3 for the full, corrected count.

## 5. Open Questions

All Open Questions referenced above (OQ-01, OQ-06, OQ-07, OQ-17) are
carried forward from Phase 1-3, unresolved, exactly as approved. CF-02 is
carried forward from Phase 1/3, unresolved, applied to BVA-01 exactly as
it was applied to TC-04.

One new Open Question was identified while adding Price's boundary case:

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-19 | Is a negative price a reachable, testable state for this display screen (e.g. via a data-entry error in a different FR's product-creation/admin-CRUD flow), and if so, what should the screen show? | Determines whether BVA-04 is an end-to-end test or a hypothetical/data-seeded probe only, and what its expected result actually is - neither is assumed here. | Derived while deriving Price's implicit floor (§2) during the P4-G02 fix pass |

## 6. Self-Check

Re-run after the 2026-07-07 Phase 4 self-critique fixes (P4-G01, P4-G02,
P4-G03 applied).

- [x] Precision/step stated explicitly before any boundary value was
      computed (§1: "Precision = whole numbers only, step = 1"; §2:
      "step = 1" for Price's floor, with the OQ-06 precision ambiguity
      disclosed rather than resolved), per the reference's requirement
      and Phase 1's OQ-07 instruction.
- [x] Only the side with a stated limit was generated for Quantity -
      minimum (`1`, REQ-12) produced a full `min−step/min/min+step`
      triplet (`0`/`1`/`2`); no maximum triplet was invented, since OQ-01
      states no maximum exists in the FR (§1, §4).
- [x] Display fields (image, name, description, category) remain
      explicitly excluded with per-field reasoning (§0), not silently
      skipped. **Price's exclusion is reversed:** §0/§2
      now derive an implicit `0` floor from monetary-domain semantics,
      explicitly labeled as an inference (not a literal FR quote),
      matching this project's own FR-13 precedent for an analogous
      unstated monetary field; a new BVA case (BVA-04) and a new Open
      Question (OQ-19) were added rather than silently excluding Price as
      before.
- [x] **Carried-forward Phase 2 gap disclosed, not silently patched:** §4 notes that no negative-price
      equivalence class exists anywhere in the approved
      `02_Equivalence_Partitioning.md`, discovered during this phase and
      recorded for the record rather than retroactively edited into an
      already-approved earlier artifact.
- [x] CF-02's dual-prediction handling is carried into the one Quantity
      boundary point where it actually applies (BVA-01, the invalid `0`
      case) and explicitly **not** applied to the two valid Quantity
      boundary points (`1`, `2`) or to Price's new boundary case (BVA-04,
      which has no CF-02 basis at all), with the reasoning for each
      stated rather than left for the reader to notice on their own.
- [x] **BVA-01's evidentiary basis explicitly tied to it by ID (fixes
      P4-G03):** §1's BVA-01 row now states plainly that its dual
      prediction rests entirely on CF-02, which itself rests entirely on
      a static code read with no device execution yet - not just a
      general remark in §4, but stated at the point of use. BVA-02/BVA-03
      each explicitly state the caveat does **not** apply to them
      (spec-only assertions, no code-observation basis) - this correct
      restraint from the prior draft is preserved, not accidentally
      extended to cases that don't need it.
- [x] No boundary point was fabricated for an unstated bound without
      disclosure - Quantity's upper bound (OQ-01) and the 4 remaining
      display fields' thresholds (§0) are all left ungenerated with a
      stated reason; Price's new floor (§2) is generated but explicitly
      labeled as an inference, not a stated fact, with its own new Open
      Question (OQ-19) carrying the uncertainty forward.
- [x] Every BVA case traces to its EC(s)/REQ(s)/TC (§1, §2, §3) - BVA-01's
      exact coincidence with TC-04 is stated plainly rather than presented
      as new coverage it isn't; BVA-04's lack of a Phase 2 EC is disclosed
      as a carried-forward gap (§4), not hidden.
- [x] **Project-wide test-case count stated explicitly and correctly:** §3 now states "13 (Phase 3) + 3 (Phase 4:
      BVA-02/03/04) = 16 distinct executions - not 17," pre-empting the
      skim-risk of overcounting BVA-01 as a distinct execution.
- [x] A "Technique Limitations" section is present and states the
      concrete gaps (no upper Quantity boundary; no display-field
      boundaries for 4 fields; Price's floor being an inference, not a
      fact; the carried-forward Phase 2 gap; general domain-testing/BVA
      blind spots) rather than claiming full coverage.
- [x] No table cell is empty without an explicit reasoned marker.
- [x] IDs are unique and consistently formatted (`BVA-01`..`BVA-04`,
      sequential, zero gaps; `OQ-19` continues Phase 3's `OQ-18` without
      renumbering or colliding).
- [x] Terminology consistent with Phases 1-3 ("class", "requirement",
      "boundary point", EC/REQ/OQ/TC/BVA IDs).

## 7. Awaiting User Review

This is the Phase 4 artifact (Boundary Value Test Cases) for FR-06:
Product Detail View (Mobile) - the final phase of the 4-phase workflow.
Two boundary-sensitive dimensions: Quantity (§1 - 3 boundary points,
`0`/`1`/`2`, of which `0` exactly restates Phase 3's TC-04 and `1`/`2` are
genuinely new - BVA-02, BVA-03) and Price (§2 - 1 new boundary point at an
implicit floor, `-1` - BVA-04, added this pass, with new Open Question
OQ-19 on its reachability). Project-wide distinct-execution total: 13
(Phase 3) + 3 (Phase 4) = 16, not 17 (§3). Image, Name, Description, and
Category remain explicitly excluded with per-field reasoning, and no
upper Quantity boundary was fabricated given OQ-01 remains unresolved.
Please review and reply "approved" (or similar) to complete FR-06's
4-phase Domain Testing + BVA workflow, or request specific revisions.
