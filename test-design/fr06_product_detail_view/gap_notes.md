# Gap Notes - fr06_product_detail_view

## 2026-07-06 - Phase 1 self-critique (per user checklist)

Re-reading `output/01_Requirements_Breakdown.md` against
`input/Functional_Requirement.md`, not re-asserting the artifact's own
Section 7 Self-Check. Findings only - nothing fixed yet. Each finding
tagged `[P1-Gxx]` with evidence and an honest severity call.

### 1. REQ-15 classification - is "Functional Requirement" the right bucket?

- **[P1-G01] real gap.** REQ-15's statement - "For the primary/valid-case
  scenario, the product id path parameter MUST refer to an existing
  product" - is not a behavior the mobile app performs or enforces. It
  originates from §4's "Inputs Summary (**for test design**)" table, i.e.
  it describes a constraint on which *test data* to select to exercise the
  valid-id path, not a MUST-behavior like REQ-05-REQ-14 (e.g. "the screen
  MUST display X," "quantity MUST accept only positive integers" - things
  the running app actually does or is required to do). Grouping REQ-15
  under AREA-05 "Test Setup Data" is correct and consistent with its real
  nature, but labeling it "Functional Requirement" in the same
  Classification column as REQ-05-REQ-14 is internally inconsistent: a
  reader scanning the Classification column alone cannot distinguish "the
  system must behave this way" from "testers must pick this kind of
  input." Evidence: REQ-15 row vs. §4 Inputs Summary table heading ("for
  test design") vs. REQ-05-REQ-14 rows (genuine system-behavior MUSTs).
  Severity: real gap, not a nitpick - the classification scheme is meant
  to let Phase 2/3 trust the column at a glance, and this row breaks that.
  Not fixed here per instruction; candidate fix directions (not applied):
  either introduce a distinct classification value (e.g. "Test Data
  Constraint") or move REQ-15's content into a note under AREA-05 instead
  of the REQ-xx/Classification table.

### 2. Any hands-on/device observation anywhere in the artifact?

- **[P1-G02] real gap, most significant finding of this pass.** End-to-end
  re-read of `01_Requirements_Breakdown.md` confirms: **no**, there is no
  observation anywhere in the artifact that came from actually running the
  Expo app on a device/emulator. Every behavioral claim traces to exactly
  one of two sources: (a) direct quotes/citations of the spec text (§1-§5,
  §7), or (b) REQ-16-REQ-22, all explicitly tagged `source: code, not
  spec`, and all of them - including CF-01 and CF-02, the two candidate
  findings - are derived purely from reading `frontend-mobile/App.js` as
  pasted into this session (`repomix-output.md`), not from launching the
  app. I am stating this plainly rather than rounding it up: reading
  source code and running the app are different evidence sources, and
  this artifact currently rests entirely on the former for every §8-derived
  claim. This matters most for CF-01 (category never rendered) and CF-02
  (invalid quantity silently coerced) - exactly the two places a live
  device check could confirm, contradict, or complicate the code-reading
  conclusion (e.g. if the running app is built from a newer/different
  `App.js` than the pasted snapshot, a caching layer masks the behavior,
  or iOS/Android render the same code differently). Side factual note,
  not part of the gap itself: an earlier version of the input file (read
  earlier in this session, before the user replaced it with the current
  8-section version) contained a "Section 0 - VERIFY FIRST" checklist
  instructing exactly this kind of hands-on check; the current
  authoritative 8-section input file no longer contains that section. That
  removal doesn't manufacture the gap, but it does mean nothing in the
  *current* input explicitly re-requests a device check either - so this
  gap won't self-resolve on the next read of the input as it stands.
  Evidence: full-text re-read of `01_Requirements_Breakdown.md` - every
  REQ-16-REQ-22 row and both CF rows cite `§8.x` (i.e. code), never a
  device observation; no other section of the artifact introduces one.
  Severity: real gap, high - it doesn't make REQ-16-REQ-22 or CF-01/CF-02
  wrong, but it means their evidentiary basis is one source, not two, and
  the artifact doesn't flag this limitation as prominently as it flags
  "not spec."

### 3. Does any REQ/OQ/CF wording drift toward treating the code as more authoritative/settled than it should be?

- **[P1-G03] real gap, moderate.** The CF-01 and CF-02 table rows in
  Section 4 state the code side as flat, unqualified fact within the cell
  itself - e.g. CF-01: "category is **never rendered** anywhere on the
  mobile detail screen"; CF-02: "invalid input ... **is never rejected** -
  it is silently coerced to quantity = 1." Neither cell restates, in the
  cell text itself, that this is a static-code-reading conclusion, not a
  confirmed running-app behavior. The mitigating factor is real but
  partial: Section 4's own header ("Candidate Findings - Spec vs. Observed
  Code (**Unconfirmed**, Not Adjudicated Here)") and its intro paragraph do
  carry the caveat at the section level, and REQ-16/REQ-17 (which the CF
  rows reference) are individually tagged `source: code, not spec`. So the
  caveat exists, but only by cross-reference - a reader who reads the CF
  table in isolation, without also holding the section header and REQ-16/
  REQ-17's own phrasing in mind, could come away treating "category is
  never rendered" as a settled fact rather than "per the pasted source
  snapshot, unconfirmed on-device" (this is the same underlying limitation
  as P1-G02, showing up as a wording-precision issue here). Evidence: CF
  table row text in Section 4 vs. Section 4's own header/intro.
- **[P1-G04] nitpick, for contrast.** By comparison, the Section 3 TD table
  (TD-01, TD-03, TD-04, TD-05) is consistently *more* hedged than the CF
  table or CF-referencing OQ rows - e.g. TD-05: "Code suggests yes; **not
  yet confirmed by running the app**," TD-01: "still needs **hands-on
  confirmation** on both iOS and Android." This is good practice, but its
  absence from the CF table (P1-G03) means the artifact is internally
  inconsistent in how firmly it states code-derived claims: cautious in
  Section 3, flatter in Section 4 for the two most consequential findings.
  Not itself a factual error, just a consistency issue worth naming since
  it compounds P1-G03.
- **OQ table check (no new gap found here):** OQ-02 and OQ-04, which both
  reference §8 code facts, explicitly hedge correctly - OQ-02: "this is a
  candidate finding (CF-02), not **a confirmed answer** to 'how it *should*
  be rejected'"; OQ-04: "that describes only the mobile client's reaction
  ... so the underlying question **is still open**." These are not
  drifting toward treating code as settled. OQ-05's phrasing ("REQ-18/§8.3
  **shows this question is moot** for the mobile Add-to-Cart action
  specifically") is a closer call - it states a firm conclusion ("moot")
  rather than "conditionally moot per this static snapshot" - but this
  phrasing is inherited near-verbatim from the input's own §8.3 text ("The
  'guest cart allowed?' open question **is moot** for this specific action
  on mobile"), so it is not overreach introduced by the artifact beyond
  what the input itself already asserts. Flagged here for completeness,
  not logged as a separate `[P1-Gxx]`, since the artifact did not amplify
  the input's own certainty.

## 2026-07-06 - Fix pass (P1-G01, P1-G03, P1-G04)

P1-G01 fixed: REQ-15 reclassified to a new "Test Data Constraint" value,
with a preamble note in Section 2 explaining the scheme. P1-G03/P1-G04
fixed via wording only (CF-01/CF-02 now say "source: static code read;
not yet confirmed by running the app," matching the TD table's hedge
style) - no device data was invented. P1-G02 (no hands-on device
observation exists) remains open by the user's explicit instruction;
device verification is deferred to before Phase 5 is reached (note: this
skill's workflow has only 4 phases, so in practice this means before the
artifact is treated as fully confirmed / before any later phase leans on
CF-01 or CF-02 being settled).

## Summary

Four items logged: `[P1-G01]` real gap (REQ-15 classification
inconsistency), `[P1-G02]` real gap, high severity (no hands-on/device
observation anywhere in the artifact - every §8 claim is code-reading
only), `[P1-G03]` real gap, moderate (CF table states code-side facts
without an inline unconfirmed-on-device qualifier, relying on
cross-reference), `[P1-G04]` nitpick (TD table hedges more consistently
than the CF table, worth aligning). No edits made to
`01_Requirements_Breakdown.md` in this pass - awaiting the user's decision
on which to fix.

## 2026-07-06 - Phase 2 self-critique (per user checklist)

Re-reading `output/02_Equivalence_Partitioning.md` against its own cited
sources, not re-asserting Section 6 (Self-Check). Findings only - nothing
fixed yet. Each finding tagged `[P2-Gxx]` with evidence and an honest
severity call.

### 1. EC-03 (qty=0) vs EC-04 (negative) - real distinct fault theories, or over-split?

- **[P2-G01] real gap, moderate - right outcome, weaker-than-claimed
  justification.** The artifact justifies keeping EC-03 (zero) and EC-04
  (negative) as separate classes by citing TD-01: "TD-01 treats 'a minus
  sign' as its own distinct mobile-input concern, not identical to 'below
  minimum.'" Re-reading TD-01's actual text (§6 of the input FR): it asks
  "does the quantity field bring up a number pad? Can the user still
  paste letters, a decimal point, a minus sign, or leading zeros?" - this
  is a question about **input capability** (can this character even reach
  the field via keyboard/paste), not about whether the **validation logic**
  treats the resulting value differently once entered. Citing TD-01 as the
  justification therefore doesn't actually establish what guideline (e)
  and the Core Fault-Detection Principle require: a plausible fault theory
  under which some test cases in a merged class would detect an error and
  others wouldn't. A stronger, correct justification does exist but was
  not the one written down: a naive falsy-check implementation
  (`if (!quantity) reject`) would correctly reject `0` (falsy in JS) but
  fail to reject `-5` (truthy) - a real, well-known class of validation
  bug that would NOT be caught by testing only one of {0, -5}. The same
  reasoning applies to EC-05 (decimal) vs. EC-06 (non-numeric): the
  artifact cites TD-01 again, but the stronger justification is a
  `parseInt`-truncation risk (`parseInt("1.5", 10)` returns `1`, a
  seemingly-valid number, while `parseInt("abc", 10)` returns `NaN` - a
  naive `isNaN(parsed)` check would catch "abc" but not "1.5"). **Net
  verdict: the 4-way split itself is still defensible - I would not
  recommend merging these classes - but the artifact's stated rationale
  conflates "can this be typed on this platform's keyboard" with "would a
  plausible validation bug distinguish these values," and only the latter
  is what the guideline actually requires.** Evidence: §2.1 EC-03/EC-04/
  EC-05/EC-06 rows and the paragraph below the table, vs. TD-01's actual
  wording in `input/Functional_Requirement.md` §6.

### 2. Are any of OQ-09-OQ-16 actually answerable from REQ-05-REQ-09's text, or over-raised as "new"?

- Re-checked REQ-05 ("MUST display... image"), REQ-06 ("...name"), REQ-07
  ("...price"), REQ-08 ("...description"), REQ-09 ("...category") verbatim
  against OQ-09 (image empty/null), OQ-10 (name empty/null), OQ-12 (price
  empty/null), OQ-13 (description empty/null), OQ-14 (category_id
  empty/null), OQ-15 (dangling category ref). **None of these five REQ
  statements say anything about fallback/empty-underlying-value behavior**
  - each is a bare "MUST display X" with no stated exception. So none of
  OQ-09/10/12/13/14/15 are secretly answerable from REQ-05-REQ-09's text;
  no over-raised new question found on this specific check.
- **[P2-G02] real gap, moderate - found instead an internal inconsistency
  in how "new vs. folded into an existing OQ" was decided.** EC-35 (a
  very large price) was explicitly folded into the *existing* OQ-06
  ("a specific instance of OQ-06, not a new question"), but EC-34 (price
  = `0`) was given a brand-new OQ-11, with the artifact's own reasoning
  being "distinct from OQ-06 (which concerns format generally, not the
  zero case specifically)." Both EC-34 and EC-35 are, on their face,
  specific input values feeding the *same* unresolved "what does the
  price look like on screen" question (OQ-06). The artifact draws a line
  between them (arguing zero is a "special-case/business-logic" question,
  e.g. could show "Free" instead of a formatted number, while large-value
  is "purely formatting") but never states this distinction explicitly
  where a reader would need it (at EC-34/EC-35 themselves) - it only shows
  up as an asymmetric outcome. A reader comparing the two side by side
  would reasonably ask why one got a new OQ number and the other didn't.
  This doesn't mean OQ-11 is wrong to exist (the "Free" label possibility
  is a genuine, distinct concern from formatting), but the artifact should
  have named that distinction explicitly rather than leaving it to be
  inferred from the difference in treatment. Evidence: §3.4 EC-34 vs.
  EC-35 rows and §5's OQ-11 vs. OQ-06 cross-reference wording.
- Also note, outside the scope of this check but relevant context: OQ-16
  (leading-zero normalization) was derived from REQ-10 (Quantity), not
  from REQ-05-REQ-09 - the user's check 2 was scoped to REQ-05-09's text,
  so OQ-16 wasn't re-verified against that specific scope here. Sanity-
  checked anyway against REQ-10/REQ-11's own text ("There MUST be a
  Quantity input field"; "MUST accept only positive integers") - neither
  says anything about display/storage normalization, so OQ-16 also does
  not appear to be secretly answerable from its own source REQs.

### 3. EC-40 (category output) - does "spec-mandated" read as decided rather than open?

- **[P2-G03] real gap, moderate - repeats a milder version of Phase 1's
  P1-G03 pattern.** §3.6's table row reads: "Category value renders on
  screen (spec-mandated per REQ-09 - see caveat above)." The word
  "spec-mandated" is a confident-sounding label, and the actual hedge (the
  CF-01 unreachability concern) lives in the prose paragraph *above* the
  table, not inline in the row itself - a reader who scans the table
  without re-reading the preceding paragraph could reasonably read this as
  "this is what happens," not "this is what the spec says should happen,
  and a separate unconfirmed code observation suggests it might not."
  This is the same class of issue P1-G03 already caught and partially
  fixed in Phase 1 (CF-01/CF-02 stating code-side facts without an inline
  qualifier, relying on the section header) - it resurfaces here in a
  different spot (an Output EC row leaning on a prose caveat instead of a
  section header) despite having been identified as a pattern to avoid.
  Compounding evidence: the **Backward Traceability table's** EC-40 row
  (§4) *is* hedged correctly inline - "None structurally - but see CF-01:
  this output may be unreachable in the current implementation
  (unconfirmed)" - so the document is internally inconsistent about
  where/whether to repeat the hedge, exactly mirroring Phase 1's P1-G04
  finding (TD table hedged consistently; CF table didn't). Evidence: §3.6
  EC-40 row text vs. §3.6's own prose caveat immediately above it vs. §4's
  EC-40 row (correctly hedged).

## Summary (Phase 2 pass)

Three items logged: `[P2-G01]` real gap, moderate (EC-03/04/05/06 split
outcome is defensible, but the stated TD-01-based justification conflates
keyboard-input-capability with validation-logic risk; a stronger
falsy-check/parseInt-truncation justification exists but wasn't written
down), `[P2-G02]` real gap, moderate (OQ-11 vs. OQ-06/EC-35 asymmetry:
zero-price was split into a new OQ while large-price was folded into the
existing one, without the artifact ever stating why zero is categorically
different), `[P2-G03]` real gap, moderate (EC-40's "spec-mandated" label
risks reading as settled since its hedge lives in prose above the table,
not inline - the same pattern Phase 1's P1-G03 already caught elsewhere,
and inconsistent with §4's own correctly-hedged EC-40 row). No over-raised
"new OQ" was found on direct re-check against REQ-05-REQ-09's text (check
2's original question). No edits made to `02_Equivalence_Partitioning.md`
in this pass - awaiting the user's decision on which to fix.

## 2026-07-07 - Fix pass (P2-G01, P2-G02, P2-G03)

All three fixed via wording only, no classes added/removed/merged. P2-G01:
§2.1's EC-04/EC-06 rows and the paragraph below the table now lead with
the actual validation-logic risk (naive `!quantity` falsy-check misses
`-5`; naive `isNaN(parseInt(x))` misses `"1.5"`), with TD-01 kept only as
secondary supporting context. P2-G02: added an explicit "why EC-34 gets a
new question while EC-35 doesn't" note under §3.4's table, distinguishing
zero-price as a boundary/business-rule question from large-price as a
pure formatting question. P2-G03: EC-40's own row in §3.6 now carries
"unconfirmed - see CF-01" inline, matching §4's traceability row instead
of relying solely on the prose paragraph above the table.

## 2026-07-07 - Phase 3 self-critique (per user checklist)

Re-reading `output/03_Domain_Test_Cases.md` against its own cited sources
and against Phase 1/2, not re-asserting Section 6 (Self-Check). Findings
only - nothing fixed yet. Each finding tagged `[P3-Gxx]` with evidence and
an honest severity call.

### 1. TC-02 bundles 6 edge-but-valid subclasses - does this undercut single-fault isolation?

- **[P3-G01] real gap, moderate-to-high.** TC-02 bundles broken image
  (EC-09), very long name (EC-12), price = `0` (EC-15), very long
  description (EC-19), dangling category (EC-22), and leading-zero
  quantity (EC-02) into **one** fixture and one test case, with 6
  separately-labeled expected-result assertions (a)-(f). As **coverage**,
  this is technically fine - the "combined valid coverage" rule only
  formally mandates single-fault isolation for *invalid* classes, and each
  EC does get its own labeled assertion. But the rule's own stated
  justification for combining valid classes is that "the system is
  expected to handle each valid input correctly and independently" - and
  I never actually checked whether these 6 conditions ARE independent of
  each other. They are 6 *elevated-risk* conditions (each individually
  flagged by a distinct risk theory - TD-06, TD-07 twice, OQ-11, OQ-15,
  OQ-16), not 6 *ordinary* valid values, and they all live on the same
  rendered screen simultaneously. A plausible fault theory says otherwise:
  if the screen fails to render at all (e.g. a crash from an interaction
  between a broken-image fallback and a long-text layout reflow - a real
  category of UI bug), TC-02 as designed gives **no way to attribute the
  failure to any one of the 6 conditions** - exactly the attribution
  problem single-fault isolation exists to prevent, just not one the
  guideline technically forces me to avoid here. Contrast with how a prior
  project's Phase 3 (FR-13, `gap_notes.md` pattern) handled a similar
  bundling decision: it explicitly stated when a combined test case could
  *not* isolate a specific fault (TC-01's non-crediting note for
  EC-16/EC-17) rather than silently assuming full attribution was
  possible. TC-02 has no equivalent caveat. Evidence: §1 TC-02's row and
  its 6-item Fixture B (§0 D-7) vs. the domain-test-heuristics.md
  rationale for combined valid coverage ("the system is expected to
  handle each valid input correctly and independently"). Not fixed here;
  candidate directions (not applied): split Fixture B's 6 conditions
  across 2-3 fixtures with fewer simultaneous edge conditions each, or add
  an explicit caveat that a total-failure/crash result on TC-02 would
  require a follow-up per-field isolated retest to attribute.

### 2. D-2's "no authentication precondition is required" - stated fact, or inference from silence?

- **[P3-G02] real gap, high severity - the most serious finding of this
  pass.** D-2 states: "No authentication precondition is required to view
  this screen - REQ-01/REQ-02 state no auth requirement for product
  detail retrieval." Re-reading REQ-01 and REQ-02's actual text (Phase 1,
  approved): REQ-01 - "Product detail is retrieved via `GET
  /api/products/:id` (path param `id`)"; REQ-02 - "A successful (200 OK)
  product detail response returns the object `{ id, name, price,
  description, imageUrl, category_id }`." **Neither statement mentions
  authentication at all, in either direction.** They are silent on the
  question, not assertive that no auth is required. By contrast, REQ-03
  (Add to Cart) *does* explicitly state an auth requirement
  ("...requiring header `Authorization: Bearer <token>`") - showing the
  Phase 1 artifact clearly does state auth requirements where the FR
  actually specifies them, and does not do so for REQ-01/REQ-02 because
  the FR never says either way for this endpoint. Treating that silence as
  "no requirement" and presenting it as if REQ-01/REQ-02 assert it is
  exactly the kind of invented-from-silence conclusion the project's own
  integrity rule prohibits (never invent unstated behavior - flag as an
  Open Question instead). This is not a cosmetic wording issue: if product
  detail retrieval actually *does* require auth in the running app
  (genuinely unknown either way), every test case in this artifact
  (TC-01..TC-13) is designed with no login step in its precondition, and
  all 13 could fail for a reason entirely unrelated to what each is
  supposed to be testing, with no warning built into the artifact that
  this is even a live possibility. Evidence: `01_Requirements_Breakdown.md`
  REQ-01/REQ-02 exact text vs. `03_Domain_Test_Cases.md` §0 D-2's claim.
  Not fixed here; candidate direction (not applied): reword D-2 to state
  plainly that REQ-01/REQ-02 are silent on authentication (not that they
  assert its absence), and raise a new Open Question - "does viewing the
  product detail screen require the user to be logged in?" - rather than
  assuming no login step is needed in every TC's precondition.

### 3. OQ-17 (test-data feasibility) - new gap, or Phase 1's OQ-08 re-raised as if new?

- Re-checked Phase 1's OQ-08 verbatim: "Test data: use seeded products
  from `GET /api/products`; note one valid product id and one plausibly
  non-existent id (e.g. `999999`) for the invalid case." OQ-08's scope is
  specifically about **which product id** to use - the existence
  dimension (valid vs. non-existent id), sourced from the already-seeded
  catalog. OQ-17 asks something different: whether a mechanism exists to
  **create/engineer atypical field-level states** within a product record
  (a broken `imageUrl`, an empty description, a dangling `category_id`,
  an excessively long name) - none of which the seeded catalog is stated
  to contain, and none of which OQ-08 addresses (OQ-08 assumes picking
  *among* seeded products, not modifying/constructing one). **Verdict:
  OQ-17 is not a duplicate of OQ-08 - it is a genuinely distinct
  concern.**
- **[P3-G03] real gap, low-to-moderate - the distinction is real but was
  never stated.** Even though OQ-17 is genuinely new, `03_Domain_Test_
  Cases.md` never explains *why* it isn't just OQ-08 restated - a reader
  who remembers OQ-08 covers "test data" could reasonably wonder whether
  OQ-17 is redundant with it, exactly the same category of gap Phase 2's
  P2-G02 already caught once (two similar-looking things treated
  differently with no stated reason why). Evidence: §0's OQ-17 entry in
  `03_Domain_Test_Cases.md` vs. Phase 1's OQ-08 text in
  `01_Requirements_Breakdown.md` - no cross-reference or disambiguation
  exists between them anywhere in the Phase 3 artifact.

## Summary (Phase 3 pass)

Three items logged: `[P3-G01]` real gap, moderate-to-high (TC-02's 6-way
bundle of independent elevated-risk edge conditions is valid as coverage
but would leave a total-failure result unattributable to any one field -
the same attribution concern single-fault isolation exists to prevent,
just not one the letter of the rule forces here), `[P3-G02]` real gap,
high severity - the most serious of the three (D-2 presents an inference
from REQ-01/REQ-02's silence on authentication as if it were a stated
fact; all 13 TCs currently assume no login precondition with no flag that
this is unconfirmed), `[P3-G03]` real gap, low-to-moderate (OQ-17 is
genuinely distinct from Phase 1's OQ-08, verified by re-reading both
verbatim, but the artifact never states why, risking the same
unexplained-distinction pattern P2-G02 already caught once). No edits made
to `03_Domain_Test_Cases.md` in this pass - awaiting the user's decision
on which to fix.

## 2026-07-07 - Fix pass (P3-G01, P3-G02, P3-G03)

All three fixed. P3-G02 (priority): D-2 reworded to state plainly that
REQ-01/REQ-02 are silent on authentication, not that they assert its
absence; added new OQ-18 ("is login required to view product detail?")
and a shared precondition caveat in D-2 covering all of TC-01-TC-13,
stating the no-login assumption is unconfirmed. P3-G01: added an explicit
attribution caveat after TC-02's row stating a whole-screen/compound
failure could not be attributed to one of its 6 bundled conditions, and
that isolating such a failure would need follow-up single-field probes -
framed as an accepted trade-off, not a design flaw. P3-G03: added an
explicit note distinguishing OQ-17 (can atypical field values be
engineered at all) from Phase 1's OQ-08 (which product id to pick from
the seeded catalog), plus a parallel note distinguishing new OQ-18 from
OQ-05 (Add to Cart's login question, a different endpoint/action). No
EC/TC IDs, scope, or classes changed.

## 2026-07-07 - Phase 4 self-critique (per user checklist)

Re-reading `output/04_Boundary_Value_Test_Cases.md` against Phase 1-3 and
against how a prior project in this repo (FR-13) handled an analogous
situation, not re-asserting Section 5 (Self-Check). Findings only -
nothing fixed yet. Each finding tagged `[P4-Gxx]` with evidence and an
honest severity call.

### 1. BVA-01 restates TC-04 with zero new execution - count-inflation risk?

- **[P4-G01] real gap, moderate.** The artifact's prose is not hiding the
  fact: BVA-01's row explicitly says "This is exactly TC-04, restated here
  as the boundary point it also happens to be - not a new test," §2's
  traceability table has a "Covers (new vs. restates)" column that
  correctly says "Restates TC-04 exactly," and §6's closing summary
  correctly parses out "1 (`0`) exactly restates... 2 (`1`, `2`) are
  genuinely new." So nothing is factually wrong or concealed. But the
  artifact **never computes or states the actual project-wide distinct-
  execution total** anywhere (13 Phase-3 TCs + 2 genuinely new Phase-4
  cases = 15 distinct executions across the whole suite, not 16, and not
  "13 + 3"). Giving BVA-01 a first-class sequential ID (`BVA-01`) in the
  exact same table format and ID scheme as the two genuinely-new cases
  (`BVA-02`, `BVA-03`) creates a structural signal - "3 sequential IDs" -
  that competes with the prose explaining otherwise. A reader who skims
  ID counts (a common shortcut, and exactly the failure mode the user's
  question describes: "someone skimming just the Phase 4 summary, not
  the detailed table") could reasonably come away thinking Phase 4 added
  3 new test cases, or that the project now has 16 total, when the
  correct figures are 2 new / 15 total. Evidence: §1 BVA-01's row prose
  (correct) vs. the absence, anywhere in the document, of an explicit
  "net new test cases added by Phase 4: 2 (BVA-01 = TC-04, not new)" or
  "project-wide total: 15" summary statement that would pre-empt the
  miscount regardless of how carefully (or not) the reader reads. Not
  fixed here; candidate direction (not applied): add a one-line, highly
  visible statement of the net-new and running-total counts, likely in
  §6 or as its own line at the top of §2.

### 2. Price excluded from BVA - silently, or should an implicit floor (like FR-13's precedent) have been raised as a new OQ?

- **[P4-G02] real gap, moderate-to-high - the most significant finding of
  this pass.** §0 excluded Price from BVA on the reasoning "FR-06 states
  no minimum or maximum price anywhere... with no stated threshold on
  either side, generating a boundary here would fabricate a limit the FR
  never states." Re-checking this against how **this same repository's
  own prior project (FR-13) handled an directly analogous monetary
  field**: FR-13's `total_amount` also had no explicit stated minimum
  anywhere in that FR's text, yet FR-13's Phase 4 did NOT exclude it -
  it derived an **implicit floor of `0`** from "monetary-domain semantics
  (an order amount is not normally negative)," explicitly labeled that
  derivation as implicit/uncertain (not a literal FR quote), **generated
  actual boundary test cases at and around that implicit floor** (a
  negative value, zero, and just-above-zero), and raised a **new Open
  Question** (that project's OQ-16) asking whether a negative value is
  even reachable in practice - rather than silently declining to test the
  field at all. FR-06's Price field never received this same treatment.
  Checking whether "no stated threshold" was actually the whole story:
  Phase 1/2/3 established EC-14 (normal positive price), EC-15 (price =
  `0`, valid), EC-16 (very large price, valid) - **no equivalence class
  for a negative price exists anywhere in Phases 1-3**, and this Phase 4
  pass did not flag that absence either. The "read-only display field"
  distinction I considered while re-examining this (Price is set by a
  different FR - product creation/admin CRUD - not validated by FR-06
  itself) does not actually distinguish it from FR-13's `total_amount`,
  which is likewise set by a *different* FR (checkout) and merely
  displayed/aggregated by FR-13 - the same structural relationship.
  **Verdict: this exclusion is inconsistent with this project's own
  established precedent for handling an unstated-but-plausible monetary
  floor, and was not adequately justified as a deliberate divergence.**
  Evidence: `04_Boundary_Value_Test_Cases.md` §0's Price row vs.
  `fr13_dashboard/output/04_Boundary_Value_Test_Cases.md` §1's identical
  reasoning pattern for `total_amount`; `02_Equivalence_Partitioning.md`
  §2.2.3 (EC-14/15/16, no negative-price class). Not fixed here; candidate
  direction (not applied): either derive the same implicit `0` floor for
  Price (with the same explicit "not a literal FR quote" labeling) and
  generate boundary cases at/around it, or at minimum raise a new Open
  Question asking whether a negative price is a reachable, testable state
  for this display screen and what should happen if so.

### 3. Does P1-G02 (no device verification anywhere) still apply here, or has the caveat been lost?

- **Not lost - re-verified, and this is stronger in Phase 4 than in Phase
  3.** §3 (Technique Limitations) states: "REQ-16/REQ-17/CF-01/CF-02
  already flag exactly this risk for Quantity and Category respectively,
  and remain unconfirmed on-device throughout this entire phase." This is
  a real, standalone restatement of the underlying P1-G02 concern, and
  Phase 4 is actually the *first* phase in this project to give it a
  dedicated section (Phase 3 only carried the "record which is observed"
  language contextually inside TC-04-TC-08's rows, without a standalone
  acknowledgment section - Phase 4's Technique Limitations section is a
  heuristics-mandated structure Phase 3 never had). So the caveat has not
  faded out over the course of the project - if anything, Phase 4
  surfaces it more explicitly than Phase 3 did.
- **[P4-G03] real gap, low-to-moderate - a smaller, distinct issue found
  instead.** §3's restatement is generic/abstract ("Quantity and
  Category," not "BVA-01 specifically") rather than explicitly tied to
  BVA-01 by ID. A reader has to infer the connection (BVA-01 uses CF-02 →
  CF-02 is one of the flagged-as-unconfirmed items → therefore BVA-01
  inherits this limitation) rather than having it spelled out the way
  BVA-01's own row already spells out the CF-02 dual-prediction directly.
  A stronger version would state, at or near BVA-01 itself: "BVA-01's
  dual-prediction rests entirely on CF-02, which itself rests entirely on
  a static code read (Phase 1, REQ-16/REQ-17) - no test case in this
  project, including BVA-01, has actually been executed on a device yet;
  BVA-01's real execution would be among the first opportunities to
  confirm or contradict CF-02 directly." Also worth stating as a
  **correct, non-gap observation**: BVA-02 and BVA-03 do *not* need this
  caveat at all (they assert only what REQ-11/REQ-12's own spec text
  states, with no code-observation basis), and the artifact does not
  mistakenly over-apply the caveat to them either - a correct restraint,
  not an oversight.

## Summary (Phase 4 pass)

Two real gaps and one non-finding logged. `[P4-G01]` real gap, moderate
(BVA-01's restatement of TC-04 is stated accurately in prose, but no
project-wide "net new: 2, running total: 15" figure is ever stated, and
giving BVA-01 a first-class sequential ID alongside the two genuinely-new
cases creates a structural skim-risk of overcounting to 3 new / 16
total). `[P4-G02]` real gap, moderate-to-high, the most significant of
this pass (Price was excluded from BVA as having "no stated threshold,"
but this project's own prior FR-13 precedent handled an analogous
monetary field by deriving an implicit `0` floor, generating real
boundary cases, and raising a new Open Question about reachability -
Price got none of that, and no negative-price equivalence class exists
anywhere in Phases 1-3 either). `[P4-G03]` real gap, low-to-moderate (the
underlying P1-G02 concern is genuinely restated in §3, not lost - but the
restatement is generic rather than tied to BVA-01 by ID). No edits made
to `04_Boundary_Value_Test_Cases.md` in this pass - awaiting the user's
decision on which to fix.

## 2026-07-07 - Fix pass (P4-G01, P4-G02, P4-G03)

All three fixed. P4-G02 (priority): reversed Price's exclusion, deriving
an implicit `0` floor from monetary-domain semantics (explicitly labeled
as an inference, not an FR quote) matching FR-13's own precedent; added
new §2 "Domain: Price" with one new boundary case (BVA-04, price = `-1`)
and new OQ-19 on reachability; disclosed in §4 that no negative-price
equivalence class exists in the already-approved `02_Equivalence_
Partitioning.md`, without retroactively editing that artifact. P4-G01:
added an explicit project-wide count statement in §3 ("13 + 3 = 16, not
17") pre-empting the BVA-01 overcounting risk. P4-G03: added a sentence to
BVA-01's own row tying its dual-prediction explicitly to CF-02/no-device-
execution-yet, and explicit "no caveat needed" notes to BVA-02/BVA-03.
Quantity's BVA-01/02/03 test content and the Image/Name/Description/
Category exclusions were not changed.
