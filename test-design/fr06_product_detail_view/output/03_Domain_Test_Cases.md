# FR-06: Product Detail View (Mobile) - Domain Test Cases (Phase 3)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED -
EC-01..EC-43) and `output/01_Requirements_Breakdown.md` (Phase 1, APPROVED -
REQ-01..REQ-22, TD-01..TD-08, CF-01..CF-02, OQ-01..OQ-16 as carried into
Phase 2).
Reference applied: `references/domain_test_heuristics.md` (Kaner & Bach
domain-testing selection rule).

> Note on filename: saved as `03_Domain_Test_Cases.md` (not
> `03_Domain_Test_Design.md` as literally typed in the request), matching
> the artifact path already declared in `state.json` and the naming
> convention used by every other project in this repo (FR-01, FR-11, FR-13).

## 0. Design Decisions

**D-1 - Selection rule (applied strictly).**
- *Valid* input classes are bundled into as few test cases as possible
  (multi-fault assumption) → "Combined valid coverage" cases.
- *Invalid* input classes each get their own dedicated test case with
  every other input held at a valid/baseline value (single-fault
  isolation) → "Isolated invalid probe" cases. No test case combines two
  invalid conditions.

**D-2 - Test level.** These are UI-level test cases on the mobile Product
Detail screen, backed by product records retrieved via
`GET /api/products/:id` (REQ-01/REQ-02). **REQ-01/REQ-02 are silent on
authentication - they neither require nor exclude it** (unlike REQ-03,
Add to Cart, which explicitly states "requiring header `Authorization:
Bearer <token>`"). Whether viewing product detail requires a logged-in
session is therefore unconfirmed, not settled by these two REQs - see new
**OQ-18** (§5). **Every test case in this document (TC-01-TC-13) assumes
no login step is needed as a precondition, purely to make the test cases
executable; this assumption is unconfirmed and not asserted as fact.** If
OQ-18 resolves toward "login required," every TC below would need a login
step added to its precondition before it could run as written.

**D-3 - Scope boundary (carried from Phase 2 §0).** REQ-01-REQ-04,
REQ-13/REQ-14, and REQ-15 remain out of scope - not tested here. Where a
test case must tap "Add to Cart" as the *only available mechanism* to
observe Quantity's own accept/reject/default outcome (EC-24/EC-25/EC-26 -
there is no separate inline field-validation signal described anywhere in
Phase 1/2), that tap is used **solely** to observe the quantity value's
fate, not to assert anything about the Add to Cart button's existence or
its visual feedback (REQ-13/REQ-14) - those remain unassessed here.

**D-4 - Expected-result fidelity.** Where Phase 1/2 already flagged the
exact display behavior as an unresolved Open Question, the expected result
is stated at the level the FR supports and tagged "per OQ-XX, to be
confirmed" - never guessed.

**D-5 - CF-02 dual-prediction handling (Quantity invalid probes).** Per
explicit instruction, every isolated invalid-quantity probe (TC-04-TC-08)
states **both** competing predictions from Phase 2 and instructs the
tester to record which is actually observed, rather than asserting one:
- **Prediction A (spec-mandated, EC-25):** the value is rejected - a
  validation error is shown and/or Add to Cart does not proceed with the
  invalid value.
- **Prediction B (code-observed, unconfirmed, EC-26):** the value is
  silently substituted with `1`, no error shown, and Add to Cart proceeds
  using quantity `1`.
Whichever is actually observed is itself the confirmation (or
contradiction) of CF-02 - it is not assumed in either direction here.

**D-6 - EC-40 (category output) is tested normally, not skipped.** Per
explicit instruction, TC-01 asserts category display exactly as REQ-09
requires, carrying the CF-01 caveat inline. If category does not appear,
that is the **expected way this test would fail if CF-01 holds** - not a
flaw in the test's design, and not skipped in anticipation of that
outcome.

**D-7 - Baseline/edge product fixtures.** Each display field (image, name,
price, description, category) can hold only one value per product record
at a time, so covering every field's valid subclasses requires multiple
product-record fixtures, not one. Values below are **illustrative
representative values**, not a resolution of any format/threshold Open
Question (OQ-06, OQ-11, etc.) - Phase 4 (BVA) is where exact boundaries
are analyzed.

| Fixture | Image (`imageUrl`) | Name | Price | Description | Category (`category_id`) |
| --- | --- | --- | --- | --- | --- |
| **A - Baseline (all normal)** | Reachable, normal image (EC-08) | Normal length, e.g. `"Wireless Mouse M1"` (EC-11) | Normal positive value, e.g. `30000000` (EC-14) | Normal length paragraph (EC-18) | Resolves to an existing category (EC-21) |
| **B - Edge-value (all unusual-but-valid)** | Present but unreachable, e.g. `https://invalid.example/dead-404.jpg` (EC-09) | Very long, e.g. an illustrative ~300-character name (EC-12) | `0` (EC-15) | Very long, e.g. an illustrative multi-paragraph description (EC-19) | Present but dangling - an id not resolving to any existing category, e.g. `9999` (EC-22) |
| **C - Large-price only** | Reachable, normal image (reuses EC-08) | Normal length (reuses EC-11) | Very large, e.g. `999999999999` (EC-16) | Normal length (reuses EC-18) | Resolves to an existing category (reuses EC-21) |
| **D - Image empty** | Empty/null (EC-10) | Normal (baseline) | Normal (baseline) | Normal (baseline) | Normal (baseline) |
| **E - Name empty** | Normal (baseline) | Empty/null (EC-13) | Normal (baseline) | Normal (baseline) | Normal (baseline) |
| **F - Price empty** | Normal (baseline) | Normal (baseline) | Empty/null (EC-17) | Normal (baseline) | Normal (baseline) |
| **G - Description empty** | Normal (baseline) | Normal (baseline) | Normal (baseline) | Empty/null (EC-20) | Normal (baseline) |
| **H - Category empty** | Normal (baseline) | Normal (baseline) | Normal (baseline) | Normal (baseline) | Empty/null (EC-23) |

Fixture C's non-price fields reuse Fixture A's already-covered valid
subclasses (EC-08, EC-11, EC-18, EC-21) - this is *not* re-credited as
fresh coverage in §4's matrix, exactly as Fixture A already covers them.

**New Open Question surfaced while designing these fixtures:**

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-17 | Is there a confirmed mechanism to create/seed a product record in an atypical state (empty description/name/price/image, a dangling `category_id`, a broken `imageUrl`) for testing - via the Admin product-management UI, direct database seeding, or neither? | Fixtures B, D-H all require product records the seeded default catalog (per Phase 1 OQ-08 test-data guidance) does not naturally contain. If no such mechanism is confirmed to exist in the test environment, these test cases may be undesignable-as-written and would need a different setup approach. Not resolved here. | Derived while writing D-7 (§0) - no product-creation/seeding mechanism for atypical field states is described anywhere in the Phase 1 input FR |

---

## 1. Combined Valid Coverage

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Combined valid coverage | EC-01, EC-08, EC-11, EC-14, EC-18, EC-21 (inputs); EC-24, EC-27, EC-30, EC-33, EC-37, EC-40 (outputs) | REQ-10, REQ-11, REQ-12, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09 | Fixture A (baseline, all-normal product, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture A. 2. Observe the rendered image, name, price, description, and category. 3. Enter `5` into the Quantity field (EC-01). 4. Tap Add to Cart (per D-3 - solely to observe the quantity outcome). | (a) Image renders successfully (EC-27). (b) Name renders successfully (EC-30). (c) Price renders in the stated format - exact format per OQ-06, to be confirmed (EC-33). (d) Description renders successfully (EC-37). (e) **Category value renders on screen (EC-40) - spec-mandated per REQ-09.** Per D-6/CF-01: if category does **not** appear, that failure is the expected confirmation of CF-01, not a test-design flaw; record the actual observation either way. (f) Quantity `5` is accepted with no error (EC-24). |
| TC-02 | Combined valid coverage | EC-02, EC-09, EC-12, EC-15, EC-19, EC-22 (inputs); EC-28, EC-31, EC-34, EC-38, EC-42, EC-43 (outputs) | REQ-10, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09 | Fixture B (edge-value product, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture B. 2. Observe the rendered image, name, price, description, and category. 3. Enter `007` into the Quantity field (EC-02). 4. Tap Add to Cart (per D-3). | (a) Broken/unreachable image handling - placeholder, blank, or crash? Per TD-06, to be confirmed (EC-28). (b) Very long name handling - truncated, wrapped, overflow, or layout break? Per TD-07, to be confirmed (EC-31). (c) Price of `0` display - `"0 ₫"`, blank, or a special label? Per OQ-11, to be confirmed (EC-34). (d) Very long description handling - per TD-07, to be confirmed (EC-38). (e) Dangling category reference display, if category renders at all - per OQ-15, to be confirmed; also possibly moot if CF-01 holds (EC-42). (f) Whether `007` is normalized to `7` or preserved literally - per OQ-16, to be confirmed (EC-43). |
| TC-03 | Combined valid coverage | EC-16 (input; EC-08/11/18/21 reused, not newly credited); EC-35 (output) | REQ-07 | Fixture C (large-price product, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture C. 2. Observe the rendered price specifically. | Very large price value renders - does the thousands-separator/format hold up without overflow or wrapping? Per OQ-06, to be confirmed (EC-35). Image/name/description/category are present and expected to render normally (re-confirms Fixture A's already-covered classes; not a substitute for TC-01's isolating credit). |

**Attribution caveat for TC-02 (accepted trade-off, stated explicitly):**
TC-02 bundles 6 independent elevated-risk conditions (broken image, very
long name, price `0`, very long description, dangling category, and a
leading-zero quantity) into one fixture, each with its own labeled
assertion (a)-(f). If the screen fails as a *whole* - e.g. a crash or a
completely blank render - this single test case **cannot** attribute that
compound failure to any one of the 6 conditions; only a failure isolated
to one specific assertion (e.g. just the image area not loading, with
everything else rendering normally) is individually attributable as
designed. Isolating which field caused a compound/whole-screen failure
would require follow-up single-field probes (each varying only one of
these 6 conditions against Fixture A's baseline, the same pattern already
used for TC-09-TC-13). This is an accepted trade-off of combined-valid
coverage for these six specific conditions, not a design flaw - but it is
stated here rather than left implicit.

---

## 2. Isolated Invalid Probes - Quantity (EC-03, EC-04, EC-05, EC-06, EC-07)

Per D-5: each probe states both CF-02 predictions and records which is
observed, rather than assuming the spec's reading. Every other field holds
Fixture A's baseline valid values; only the Quantity value varies.

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-04 | Isolated invalid probe | EC-03, EC-25, EC-26 | REQ-11, REQ-12 | Fixture A (baseline product) is the product being viewed. | 1. Clear the Quantity field. 2. Enter `0`. 3. Tap Add to Cart. | Two competing predictions (CF-02) - record which is actually observed, do not assume either: **Prediction A (EC-25, spec-mandated):** the value is rejected - a validation error is shown and/or Add to Cart does not proceed with quantity `0`. **Prediction B (EC-26, code-observed, unconfirmed):** the value is silently replaced with `1`, no error shown, Add to Cart proceeds with quantity `1`. |
| TC-05 | Isolated invalid probe | EC-04, EC-25, EC-26 | REQ-11 | Fixture A (baseline product) is the product being viewed. | 1. Clear the Quantity field. 2. Enter `-5`. 3. Tap Add to Cart. | Same two competing predictions as TC-04, applied to `-5` instead of `0` - record which is actually observed. |
| TC-06 | Isolated invalid probe | EC-05, EC-25, EC-26 | REQ-11 | Fixture A (baseline product) is the product being viewed. | 1. Clear the Quantity field. 2. Enter `1.5`. 3. Tap Add to Cart. | Same two competing predictions as TC-04, applied to `1.5` - record which is actually observed. Also bears on OQ-02 (decimal quantity handling). |
| TC-07 | Isolated invalid probe | EC-06, EC-25, EC-26 | REQ-11 | Fixture A (baseline product) is the product being viewed. | 1. Clear the Quantity field. 2. Enter `abc`. 3. Tap Add to Cart. | Same two competing predictions as TC-04, applied to `abc` - record which is actually observed. |
| TC-08 | Isolated invalid probe | EC-07, EC-25, EC-26 | REQ-11 | Fixture A (baseline product) is the product being viewed. | 1. Clear the Quantity field, leaving it empty. 2. Tap Add to Cart. | Same two competing predictions as TC-04, applied to an empty field - record which is actually observed. Also bears on TD-03 (empty quantity field). |

---

## 3. Isolated Invalid Probes - Display Fields (EC-10, EC-13, EC-17, EC-20, EC-23)

Each probe holds every other field at Fixture A's baseline and Quantity at
a valid value (`1`, not itself under test); only the one field named is
empty/null.

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-09 | Isolated invalid probe | EC-10, EC-29 | REQ-05 | Fixture D (image empty, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture D. 2. Observe the image area specifically. | Screen's handling when `imageUrl` is empty/null (no URL at all), distinct from a URL that is present but fails to load (TC-02(a)) - per OQ-09, to be confirmed. |
| TC-10 | Isolated invalid probe | EC-13, EC-32 | REQ-06 | Fixture E (name empty, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture E. 2. Observe the name area specifically. | Screen's handling when name is empty/null - blank label, placeholder text, or omitted entirely? Per OQ-10, to be confirmed. |
| TC-11 | Isolated invalid probe | EC-17, EC-36 | REQ-07 | Fixture F (price empty, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture F. 2. Observe the price area specifically. | Screen's handling when price is empty/null - per OQ-12, to be confirmed. |
| TC-12 | Isolated invalid probe | EC-20, EC-39 | REQ-08 | Fixture G (description empty, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture G. 2. Observe the description area specifically. | Screen's handling when description is empty/null - per OQ-13, to be confirmed. |
| TC-13 | Isolated invalid probe | EC-23, EC-41 | REQ-09 | Fixture H (category empty, D-7) is the product being viewed. | 1. Open the product detail screen for Fixture H. 2. Observe the category area specifically. | Screen's handling when `category_id` is empty/null - per OQ-14, to be confirmed. Possibly moot if CF-01 holds (nothing is rendered for category regardless of whether the id is null or valid) - noted, not assumed. |

---

## 4. Coverage & Traceability Matrix

Every Phase 2 equivalence class (EC-01..EC-43) mapped to its covering test
case(s).

| EC ID | Tag | Covered By | Notes |
| --- | --- | --- | --- |
| EC-01 | Input | TC-01 | - |
| EC-02 | Input | TC-02 | - |
| EC-03 | Input | TC-04 | - |
| EC-04 | Input | TC-05 | - |
| EC-05 | Input | TC-06 | Also bears on OQ-02 |
| EC-06 | Input | TC-07 | - |
| EC-07 | Input | TC-08 | Also bears on TD-03 |
| EC-08 | Input | TC-01 | Reused (not re-credited) in TC-03's fixture |
| EC-09 | Input | TC-02 | - |
| EC-10 | Input | TC-09 | - |
| EC-11 | Input | TC-01 | Reused (not re-credited) in TC-03's fixture |
| EC-12 | Input | TC-02 | - |
| EC-13 | Input | TC-10 | - |
| EC-14 | Input | TC-01 | - |
| EC-15 | Input | TC-02 | - |
| EC-16 | Input | TC-03 | - |
| EC-17 | Input | TC-11 | - |
| EC-18 | Input | TC-01 | Reused (not re-credited) in TC-03's fixture |
| EC-19 | Input | TC-02 | - |
| EC-20 | Input | TC-12 | - |
| EC-21 | Input | TC-01 | Reused (not re-credited) in TC-03's fixture |
| EC-22 | Input | TC-02 | - |
| EC-23 | Input | TC-13 | - |
| EC-24 | Output | TC-01 | - |
| EC-25 | Output | TC-04, TC-05, TC-06, TC-07, TC-08 | Spec-mandated prediction (CF-02, D-5) |
| EC-26 | Output | TC-04, TC-05, TC-06, TC-07, TC-08 | Code-observed, unconfirmed prediction (CF-02, D-5) |
| EC-27 | Output | TC-01 | - |
| EC-28 | Output | TC-02 | Unresolved - TD-06 |
| EC-29 | Output | TC-09 | Unresolved - new OQ-09 |
| EC-30 | Output | TC-01 | - |
| EC-31 | Output | TC-02 | Unresolved - TD-07 |
| EC-32 | Output | TC-10 | Unresolved - new OQ-10 |
| EC-33 | Output | TC-01 | Unresolved - OQ-06 |
| EC-34 | Output | TC-02 | Unresolved - new OQ-11 |
| EC-35 | Output | TC-03 | Unresolved - OQ-06 (large-value instance) |
| EC-36 | Output | TC-11 | Unresolved - new OQ-12 |
| EC-37 | Output | TC-01 | - |
| EC-38 | Output | TC-02 | Unresolved - TD-07 |
| EC-39 | Output | TC-12 | Unresolved - new OQ-13 |
| EC-40 | Output | TC-01 | Spec-mandated per REQ-09; unconfirmed - CF-01 (D-6) |
| EC-41 | Output | TC-13 | Unresolved - new OQ-14; possibly moot per CF-01 |
| EC-42 | Output | TC-02 | Unresolved - new OQ-15; possibly moot per CF-01 |
| EC-43 | Output | TC-02 | Unresolved - new OQ-16 |

**Result:** all 23 input classes and all 20 output classes (EC-01..EC-43)
are covered by TC-01..TC-13 - no orphan class, no deferral needed.

---

## 5. Open Questions

All Open Questions referenced above (OQ-01, OQ-02, OQ-06, OQ-09, OQ-10,
OQ-11, OQ-12, OQ-13, OQ-14, OQ-15, OQ-16, plus TD-03, TD-06, TD-07 and
CF-01/CF-02) are carried forward from Phase 1/2, unresolved, exactly as
approved - none are answered or guessed at in this phase; every TC's
expected result that depends on one is explicitly tagged "per OQ-XX, to be
confirmed" (or "per TD-XX"/"per CF-XX") rather than assuming an answer.
OQ-03, OQ-04, OQ-05, OQ-07, OQ-08 remain carried forward, untouched (they
concern REQ-01-04/REQ-13, out of scope per §0/D-3).

Two new Open Questions were identified during this phase:

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-17 | Is there a confirmed mechanism to create/seed a product record in an atypical state (empty description/name/price/image, a dangling `category_id`, a broken `imageUrl`) for testing - via the Admin product-management UI, direct database seeding, or neither? | Fixtures B, D-H (D-7) all require product records the seeded default catalog (per Phase 1 OQ-08) does not naturally contain. Not resolved here. | Derived while writing D-7 (§0) |
| OQ-18 | Does **viewing** the product detail screen (`GET /api/products/:id`) require a logged-in session, or is it guest-accessible? | REQ-01/REQ-02 are silent on authentication for this specific retrieval (D-2) - unlike REQ-03 (Add to Cart), which explicitly requires a Bearer token. Every TC in this document assumes no login precondition is needed; if that assumption is wrong, all of TC-01-TC-13 would need a login step added before they could run as written. | Derived while writing D-2 (§0) after re-checking REQ-01/REQ-02's exact text |

**OQ-17 is not a duplicate of Phase 1's OQ-08.** OQ-08 concerns *which
product id* to pick from the already-seeded catalog (the existence
dimension - valid vs. non-existent id). OQ-17 concerns something
different: whether atypical *field-value* states (a broken image, an
empty description, a dangling category reference) can be engineered at
all within a product record, which OQ-08 never addresses (it assumes
selecting *among* seeded products, not modifying or constructing one).

**OQ-18 is distinct from Phase 1's OQ-05.** OQ-05 asks whether the
**Add to Cart action** requires login (a `POST /api/cart` concern, out of
scope per D-3). OQ-18 asks whether merely **viewing** the product detail
screen (`GET /api/products/:id`) requires login - a different endpoint and
a different action; resolving one does not resolve the other.

## 6. Self-Check

Re-run after the 2026-07-07 Phase 3 self-critique fixes (P3-G01, P3-G02,
P3-G03 applied).

- [x] Every equivalence class (EC-01..EC-43) has at least one covering test
      case - verified in §4's matrix; no deferral needed.
- [x] Selection rule applied exactly (D-1): all 13 valid input classes
      bundled into the minimum 3 combined-valid cases the mutually-exclusive
      field values allow (TC-01/02/03 - 3 cases driven by Price's 3
      mutually-exclusive subclasses, the largest field-cardinality
      constraint); all 10 invalid input classes each get their own
      dedicated, single-fault isolated probe (TC-04..TC-13) - no TC combines
      two invalid conditions.
- [x] Every test case is labeled "Combined valid coverage" or "Isolated
      invalid probe" - no third label needed.
- [x] Every isolated invalid probe (TC-04..TC-13) holds every other
      condition at Fixture A's baseline valid value and varies exactly
      one - re-verified per row: TC-04..08 vary only the Quantity value
      against Fixture A; TC-09..13 vary only one display field (via
      Fixture D-H) against Fixture A's baseline for every other field, with
      Quantity held at a valid, non-tested value.
- [x] **Combined-valid attribution risk stated, not left implicit (fixes
      P3-G01).** TC-02 bundles 6 independent elevated-risk conditions in
      one fixture; a caveat now follows §1's table stating explicitly that
      a whole-screen/compound failure could not be attributed to any one
      of the 6 from TC-02 alone, and that isolating such a failure would
      require follow-up single-field probes - an accepted trade-off, now
      disclosed rather than assumed away.
- [x] **Authentication precondition stated accurately, not inferred from
      silence.** D-2 now states plainly that REQ-01/REQ-02
      are silent on authentication (neither requiring nor excluding it),
      contrasted explicitly with REQ-03's stated Bearer-token requirement.
      New OQ-18 captures the unresolved question; D-2 also states, as a
      single shared caveat covering every TC in this document, that the
      no-login precondition used throughout TC-01-TC-13 is an unconfirmed
      assumption made for executability, not an asserted fact.
- [x] Quantity's CF-02 conflict (EC-25/EC-26) is captured against **both**
      competing predictions explicitly in every one of TC-04..TC-08, per
      D-5 - neither prediction is assumed; the tester records which is
      actually observed.
- [x] EC-40 (category output) is tested normally per spec (REQ-09) in
      TC-01, not skipped or hedged into non-existence - per D-6, a failure
      to render category is explicitly framed as confirming CF-01, not as
      a flaw in the test.
- [x] No Open Question was resolved or guessed - every TC expected result
      that touches an unresolved OQ/TD/CF states "per OQ-XX"/"per TD-XX"/
      "per CF-XX, to be confirmed" (§5); two new questions (OQ-17, OQ-18)
      were added because this phase surfaced gaps Phase 1/2 had not named,
      and neither is resolved here either. **Distinctness now stated
      explicitly:** §5 explains why OQ-17 (can atypical
      field values be engineered at all) is not a duplicate of Phase 1's
      OQ-08 (which product id to pick from the seeded catalog), and why
      new OQ-18 (login required to view detail?) is not a duplicate of
      OQ-05 (login required for Add to Cart?) - different endpoints,
      different actions.
- [x] Output classes (EC-24..EC-43) are not separately-executed test
      cases - each is mapped, in §4, to the input-class TC(s) whose
      expected-result section describes it.
- [x] Every TC traces to its EC(s) and REQ(s) - both present in every
      table; §4 gives the full EC→TC matrix with no orphans.
- [x] Fixture reuse (EC-08/11/18/21 reused in Fixture C, TC-03) is stated
      explicitly as reuse, not double-credited as fresh coverage in §4 -
      avoiding the exact kind of crediting ambiguity a prior project's
      Phase 3 self-critique (P3-G01) had to fix after the fact.
- [x] No table cell is empty without an explicit reasoned marker.
- [x] IDs are unique and consistently formatted (`TC-01`..`TC-13`,
      sequential, zero gaps; `OQ-17`/`OQ-18` continue Phase 2's `OQ-16`
      without renumbering or colliding).
- [x] Terminology consistent with Phases 1-2 ("class", "requirement",
      "field", EC/REQ/OQ/TC/TD/CF IDs).

## 7. Awaiting User Review

This is the Phase 3 artifact (Domain Test Cases) for FR-06: Product Detail
View (Mobile) - 3 combined-valid cases (TC-01..TC-03, covering all 13 valid
input classes via 3 product fixtures driven by Price's mutually-exclusive
states), 10 isolated invalid probes (TC-04..TC-13 - 5 for Quantity with
explicit dual CF-02 predictions, 5 for the display fields' empty/null
states), full EC-01..EC-43 coverage, and two new Open Questions (OQ-17, on
test-data-creation feasibility; OQ-18, on whether viewing product detail
requires login). Please review and reply "approved" (or similar) to
proceed to Phase 4 (Boundary Value Analysis), or request specific
revisions.
