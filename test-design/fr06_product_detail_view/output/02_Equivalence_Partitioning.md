# FR-06: Product Detail View (Mobile) - Equivalence Partitioning (Phase 2)

Source: `output/01_Requirements_Breakdown.md` (APPROVED, verdict INCOMPLETE -
REQ-01..REQ-22, TD-01..TD-08, CF-01..CF-02, OQ-01..OQ-08). Reference:
`references/equivalence_partitioning_heuristics.md` (Kaner & Bach Domain
Testing Method, guidelines a-e).

## 0. Scope Note

Per explicit instruction, this phase covers only:

- **REQ-10, REQ-11, REQ-12** (Quantity Input), and
- **REQ-05-REQ-09** (Detail Display fields: image, name, price, description,
  category).

**Out of scope for this phase, not partitioned here:** REQ-01-REQ-04 (API
Contract), REQ-13/REQ-14 (Add to Cart button & feedback), and REQ-15 (Test
Data Constraint). These are carried forward untouched and are not implied
to be complete or correct - they are simply not addressed in this pass.

**REQ-16-REQ-22 (§8 code observations) and CF-01/CF-02 are used only as
context** in this phase - as risk theories that justify a guideline-(e)
split, and as traceability caveats - never as a settled expected-output
class in their own right. Where a code observation suggests a possible
output, that possibility is recorded as a separate, explicitly-unconfirmed
class alongside (not instead of) the spec-mandated one, exactly as CF-01/
CF-02 themselves were carried in Phase 1.

## 1. Guideline Legend

| Letter | Shape | Used in this phase? |
| --- | --- | --- |
| (a) Range | A continuous/ordered numeric range with min (and max, if stated) | Used for Quantity's numeric magnitude: valid range is `1 <= x` with no stated upper bound (OQ-01) - a semi-open range, not a closed one. |
| (b) Number-of-values | A "1 to N items allowed" cardinality constraint | Not applicable - none of REQ-05-REQ-12 impose a count-of-items constraint. |
| (c) Discrete set, each handled differently | A set of values where the spec does NOT assert uniform handling | Not used as the primary shape for any single condition in this phase. The 5 display fields were already split into independently-testable REQs in Phase 1 (REQ-05-REQ-09) rather than treated as one discrete set here; each field's own Valid/Invalid split instead uses (d). |
| (d) "Must be X" | A binary satisfies-X / does-not-satisfy-X condition | Used for Quantity's integer/sign condition (paired with (a)) and for all 5 display fields' presence condition (has a value to display vs. does not). |
| (e) Risk-based refinement | Split a class further when a specific fault theory targets a subset of it | Used extensively - see each subsection below. Justified either by §6's mobile test dimensions (TD-01, TD-03, TD-06, TD-07) explicitly separating a concern, or by a plausible fault theory not excluded by the spec (e.g. a dangling category reference). |

## 2. Input Equivalence Classes

### 2.1 Quantity (REQ-10, REQ-11, REQ-12)

**Explicit empty/null decision (required by instruction, not skipped):**
REQ-11 states "Quantity MUST accept only **positive integers**." An empty
string does not satisfy "positive integer" under any plain reading of that
text - there is no number to be positive. So, reading the spec's own MUST
language directly (the same kind of direct textual entailment used for
every other REQ-derived class, not a new invented business rule), **empty
quantity is classified Invalid** at this input-partition level. This is a
decision about how REQ-11's stated text reads, made independently of what
the code actually does. REQ-17/CF-02 (code observation, unconfirmed -
`normalizeQuantity` silently defaults empty/invalid input to `1` instead of
rejecting it) is a *separate*, already-flagged conflict with this same
reading - it is not used here to override or soften this classification,
and it resurfaces below at the output level (EC-26) exactly as CF-02
already frames it.

| EC ID | Tag | Class Description | Valid/Invalid | REQ/OQ/TD Ref |
| --- | --- | --- | --- | --- |
| EC-01 | Input | Quantity typed as a normal positive integer (e.g. `1`, `2`, `5`, `100`) | Valid | REQ-11, REQ-12; no stated upper bound - OQ-01 |
| EC-02 | Input | Quantity typed with leading zeros, numerically a positive integer (e.g. `007`) - guideline (e) subclass of EC-01 | Valid | REQ-11; TD-01 ("leading zeros") risk |
| EC-03 | Input | Quantity = `0` | Invalid | REQ-12 (minimum is 1) |
| EC-04 | Input | Quantity is negative (e.g. `-5`) - kept separate from EC-03 per guideline (e): a naive falsy-check (`!quantity`) would correctly reject `0` but fail to reject `-5` (truthy), a distinct validation-logic risk from "below minimum" in general | Invalid | REQ-11; TD-01 ("minus sign") secondary context |
| EC-05 | Input | Quantity is non-integer / decimal (e.g. `1.5`) | Invalid | REQ-11; OQ-02 |
| EC-06 | Input | Quantity contains non-numeric characters (e.g. `abc`) - kept separate from EC-05 per guideline (e): a naive `isNaN(parseInt(x))` check would correctly reject `"abc"` but fail to reject `"1.5"` (`parseInt` truncates it to `1` and passes), a distinct parsing risk from "non-integer" in general | Invalid | REQ-11; TD-01 ("letters") secondary context |
| EC-07 | Input | Quantity field is empty / cleared - explicit decision above | Invalid | REQ-11; TD-03 |

Zero (EC-03), negative (EC-04), decimal (EC-05), and non-numeric (EC-06) are
kept as **four separate** invalid classes rather than one merged
"anything-but-a-positive-integer" class. Justification via the Core
Fault-Detection Principle: a plausible validation-logic fault would expose
some of these values but not others even with an otherwise-working check.
A naive falsy-check (`if (!quantity) reject`) correctly rejects `0`
(falsy in JS) but does **not** reject `-5` (truthy) - so EC-03 and EC-04
must stay separate, since a test case from one would not reliably detect
the same bug as a test case from the other. Similarly, a naive
`isNaN(parseInt(x))` check correctly rejects `"abc"` (parses to `NaN`) but
does **not** reject `"1.5"` (`parseInt` truncates it to `1`, a
seemingly-valid number) - so EC-05 and EC-06 must stay separate for the
same reason. §6 (TD-01)'s separate mention of "a decimal point," "a minus
sign," and "letters" is kept as secondary supporting context (it shows the
FR's own test-design section treats these as distinct concerns too), not
the primary justification - TD-01 is about keyboard/paste **input
capability** (can the character reach the field at all), which is a
different question from whether the **validation logic**, once a value is
entered, would treat it differently. Merging these classes would risk
hiding exactly the kind of partial-fix validation bug this technique
exists to catch.

### 2.2 Detail Display Fields - General Note (REQ-05-REQ-09)

**Valid/Invalid, for §2.2-§2.6, means "does this data state let the
corresponding REQ's display obligation be satisfied" (a value exists to
display vs. none exists) - not a business-rule judgment on the value
itself.** FR-06 does not constrain what these values may *contain* (unlike
Quantity, which REQ-11/REQ-12 explicitly constrain). A present-but-unusual
value (a broken image URL, an extremely long name, a price of `0`) is
therefore a **Valid** guideline-(e) subclass - the field has *something* to
display, even if handling that something correctly is a genuine risk. Only
an empty/null field, where there is nothing to display at all, is
classified Invalid relative to the REQ's MUST - using the same direct
textual-entailment reasoning as Quantity's empty-field decision above, not
an invented rule.

#### 2.2.1 Image (REQ-05)

| EC ID | Tag | Class Description | Valid/Invalid | REQ/TD Ref |
| --- | --- | --- | --- | --- |
| EC-08 | Input | `imageUrl` present, well-formed, reachable (normal load) | Valid | REQ-05 |
| EC-09 | Input | `imageUrl` present but unreachable/broken (dead link, malformed URL) - guideline (e) subclass; a load failure is a different runtime path than a normal load | Valid (has a value; the value just fails to resolve) | REQ-05; TD-06 |
| EC-10 | Input | `imageUrl` empty/null (no URL at all) - explicit empty/null decision, same reasoning as §2.1 | Invalid | REQ-05 |

#### 2.2.2 Name (REQ-06)

| EC ID | Tag | Class Description | Valid/Invalid | REQ/TD Ref |
| --- | --- | --- | --- | --- |
| EC-11 | Input | Name present, typical length | Valid | REQ-06 |
| EC-12 | Input | Name present, very long - guideline (e) subclass (truncation/overflow risk on a narrow screen) | Valid | REQ-06; TD-07 |
| EC-13 | Input | Name empty/null - explicit empty/null decision | Invalid | REQ-06 |

#### 2.2.3 Price (REQ-07)

| EC ID | Tag | Class Description | Valid/Invalid | REQ/OQ Ref |
| --- | --- | --- | --- | --- |
| EC-14 | Input | Price present, typical positive numeric value | Valid | REQ-07 |
| EC-15 | Input | Price = `0` - guideline (e) subclass; still a present value, no rule in FR-06 excludes it | Valid | REQ-07 |
| EC-16 | Input | Price present, very large magnitude - guideline (e) subclass (formatting/thousands-separator risk) | Valid | REQ-07; OQ-06 |
| EC-17 | Input | Price empty/null - explicit empty/null decision | Invalid | REQ-07 |

#### 2.2.4 Description (REQ-08)

| EC ID | Tag | Class Description | Valid/Invalid | REQ/TD Ref |
| --- | --- | --- | --- | --- |
| EC-18 | Input | Description present, typical length | Valid | REQ-08 |
| EC-19 | Input | Description present, very long - guideline (e) subclass (truncation/overflow risk) | Valid | REQ-08; TD-07 |
| EC-20 | Input | Description empty/null - explicit empty/null decision | Invalid | REQ-08 |

#### 2.2.5 Category (REQ-09)

| EC ID | Tag | Class Description | Valid/Invalid | REQ Ref |
| --- | --- | --- | --- | --- |
| EC-21 | Input | `category_id` present, resolves to an existing category | Valid | REQ-09 |
| EC-22 | Input | `category_id` present but does not resolve to any existing category (dangling reference) - guideline (e) subclass; a data-integrity edge case not excluded by FR-06 | Valid (has a value; the value just doesn't resolve) | REQ-09 |
| EC-23 | Input | `category_id` empty/null - explicit empty/null decision | Invalid | REQ-09 |

**Input classes total: EC-01-EC-23 (23 classes).**

## 3. Output Equivalence Classes

### 3.1 Quantity Field/Value Outcome (REQ-10, REQ-11, REQ-12)

**Scope caveat:** REQ-11's "MUST accept" language is most naturally
verified by observing what happens when Add to Cart is actually tapped
(REQ-13/REQ-14), which is out of scope for this phase per §0. The three
classes below describe the quantity *value's own* treatment (is it used
as-entered, rejected, or silently altered) - not what the Add-to-Cart
button/feedback itself does with it. A future phase pass covering
REQ-13/REQ-14 would need to connect these to actual button-press outcomes.

| EC ID | Tag | Class Description | Traces From | REQ/OQ/CF Ref |
| --- | --- | --- | --- | --- |
| EC-24 | Output | Quantity value is accepted as entered - treated as valid data, no error, no substitution | EC-01, EC-02 | REQ-11, REQ-12 |
| EC-25 | Output | Quantity value is rejected - a validation error is shown and/or the value is not accepted (spec-mandated reading of REQ-11 as an implied rejection rule) | EC-03, EC-04, EC-05, EC-06, EC-07 | REQ-11; CF-02 (spec side) |
| EC-26 | Output | **Code-observed, UNCONFIRMED, context only - not a settled expected-output class.** Quantity value is silently substituted with a default (`1`), with no error shown, per REQ-17's code observation | EC-03, EC-04, EC-05, EC-06, EC-07 | REQ-17, CF-02 (code side, unconfirmed) |

EC-25 and EC-26 trace from the **same five input classes** (EC-03-EC-07).
This dual-tracing is not an error - it *is* CF-02, made visible in
equivalence-class form: the spec (EC-25) and the code, as read but not yet
confirmed on-device (EC-26), predict two different outcomes for the same
inputs. Neither is treated here as the settled answer.

### 3.2 Image Display Outcome (REQ-05)

| EC ID | Tag | Class Description | Traces From | REQ/TD Ref |
| --- | --- | --- | --- | --- |
| EC-27 | Output | Image renders successfully on screen | EC-08 | REQ-05 |
| EC-28 | Output | Screen's handling of a broken/unreachable image - placeholder, blank space, or crash? Behavior not stated - unresolved (TD-06) | EC-09 | REQ-05; TD-06 |
| EC-29 | Output | Screen's handling when `imageUrl` is empty/null (no URL at all) - distinct from EC-28 (a URL that fails to load); not covered by TD-06's wording - **new gap, see OQ-09** | EC-10 | REQ-05; new OQ-09 |

### 3.3 Name Display Outcome (REQ-06)

| EC ID | Tag | Class Description | Traces From | REQ/TD Ref |
| --- | --- | --- | --- | --- |
| EC-30 | Output | Name renders successfully on screen | EC-11 | REQ-06 |
| EC-31 | Output | Screen's handling of a very long name - truncated, wrapped, overflow, or layout break? Behavior not stated - unresolved (TD-07) | EC-12 | REQ-06; TD-07 |
| EC-32 | Output | Screen's handling when name is empty/null - blank label, placeholder text, or omitted entirely? Not covered by any existing OQ/TD - **new gap, see OQ-10** | EC-13 | REQ-06; new OQ-10 |

### 3.4 Price Display Outcome (REQ-07)

| EC ID | Tag | Class Description | Traces From | REQ/OQ Ref |
| --- | --- | --- | --- | --- |
| EC-33 | Output | Price renders in the stated format (format itself unresolved - OQ-06) | EC-14 | REQ-07; OQ-06 |
| EC-34 | Output | Screen's display of a price of `0` - `"0 ₫"`, blank, or a special label? Not covered by OQ-06 (which concerns format generally, not the zero case) - **new gap, see OQ-11** | EC-15 | REQ-07; new OQ-11 |
| EC-35 | Output | Screen's display of a very large price value - does the thousands-separator/format hold up? A specific instance of OQ-06, not a new question | EC-16 | REQ-07; OQ-06 |

**Why EC-34 gets a new question (OQ-11) while EC-35 folds into the
existing one (OQ-06):** EC-35 is a pure formatting question - the same
"how is price displayed" question OQ-06 already asks, just at a larger
magnitude. EC-34 is different in kind, not just degree: whether `0` is
even a legitimate price at all is a boundary/business-rule question (is a
free product representable, and if so does the screen show `"0 ₫"` or a
distinct label like "Free"?), not a question of number formatting - so it
is not simply a large/small instance of OQ-06's concern and is kept as its
own question (OQ-11) instead of folded into it.
| EC-36 | Output | Screen's handling when price is empty/null - **new gap, see OQ-12** | EC-17 | REQ-07; new OQ-12 |

### 3.5 Description Display Outcome (REQ-08)

| EC ID | Tag | Class Description | Traces From | REQ/TD Ref |
| --- | --- | --- | --- | --- |
| EC-37 | Output | Description renders successfully on screen | EC-18 | REQ-08 |
| EC-38 | Output | Screen's handling of a very long description - unresolved (TD-07) | EC-19 | REQ-08; TD-07 |
| EC-39 | Output | Screen's handling when description is empty/null - **new gap, see OQ-13** | EC-20 | REQ-08; new OQ-13 |

### 3.6 Category Display Outcome (REQ-09)

**Carries the CF-01 caveat - read this before the table.** REQ-09 (§3.1)
states the screen MUST display category; EC-40 below is that
spec-mandated output class. But REQ-16/CF-01 (Phase 1 code observation,
**unconfirmed on-device**) found that `renderProductDetail()` currently
renders no line for `category`/`category_id` at all. That means EC-40 may
currently be **unreachable/dead** in the actual implementation - not
resolved here, carried forward as an explicit traceability flag (§4), not
silently dropped. If CF-01 is later confirmed on-device, a test case
targeting EC-40 would be *expected* to fail - that is the point of testing
it, not a flaw in this class's design.

| EC ID | Tag | Class Description | Traces From | REQ/CF/OQ Ref |
| --- | --- | --- | --- | --- |
| EC-40 | Output | Category value renders on screen (spec-mandated per REQ-09; **unconfirmed - see CF-01**, which suggests this output may not currently be produced by the app) | EC-21, EC-22 | REQ-09; CF-01 (unconfirmed conflict) |
| EC-41 | Output | Screen's handling when `category_id` is empty/null - **new gap, see OQ-14.** Possibly moot if CF-01 holds (nothing is rendered regardless of whether the id is null or valid) - noted, not assumed, same pattern as Phase 1's OQ-05 mootness note | EC-23 | REQ-09; new OQ-14; CF-01 |
| EC-42 | Output | Screen's handling of a dangling category reference, if category were rendered at all - **new gap, see OQ-15.** Also possibly moot if CF-01 holds | EC-22 | REQ-09; new OQ-15; CF-01 |

### 3.7 Quantity Leading-Zero Normalization (REQ-10 - new gap found during derivation)

| EC ID | Tag | Class Description | Traces From | REQ Ref |
| --- | --- | --- | --- | --- |
| EC-43 | Output | Whether a leading-zero-entered quantity (e.g. `007`) is normalized/stripped before being used/displayed (e.g. becomes `7`) or preserved literally as typed - not stated by FR-06 - **new gap, see OQ-16** | EC-02 | REQ-10; new OQ-16 |

**Output classes total: EC-24-EC-43 (20 classes). Grand total: 43 classes.**

## 4. Backward Traceability (Output → Input)

| Output EC | Input EC(s) It Traces To | Gap? |
| --- | --- | --- |
| EC-24 | EC-01, EC-02 | None |
| EC-25 | EC-03, EC-04, EC-05, EC-06, EC-07 | None |
| EC-26 | EC-03, EC-04, EC-05, EC-06, EC-07 | None structurally - but see CF-02: this and EC-25 make conflicting predictions from the same inputs, unresolved |
| EC-27 | EC-08 | None |
| EC-28 | EC-09 | None |
| EC-29 | EC-10 | None |
| EC-30 | EC-11 | None |
| EC-31 | EC-12 | None |
| EC-32 | EC-13 | None |
| EC-33 | EC-14 | None |
| EC-34 | EC-15 | None |
| EC-35 | EC-16 | None |
| EC-36 | EC-17 | None |
| EC-37 | EC-18 | None |
| EC-38 | EC-19 | None |
| EC-39 | EC-20 | None |
| EC-40 | EC-21, EC-22 | None structurally - but see CF-01: this output may be unreachable in the current implementation (unconfirmed) |
| EC-41 | EC-23 | None structurally - possibly moot per CF-01 (unconfirmed) |
| EC-42 | EC-22 | None structurally - possibly moot per CF-01 (unconfirmed) |
| EC-43 | EC-02 | None |

Every output class traces to at least one input class - no orphan output
identified (EC-40's CF-01 caveat is a *reachability* concern in the current
implementation, not a missing-input-class gap: the input data, `category_id`,
is fetched and available per REQ-02; it is the rendering logic that
allegedly never consumes it).

## 5. Open Questions

**Carried forward from Phase 1, unresolved, directly relevant to this
phase's classes:** OQ-01 (max quantity - bears on EC-01's unbounded upper
side), OQ-02 (decimal quantity - EC-05), OQ-06 (price/currency format -
EC-33, EC-35). **Carried forward from Phase 1, not directly touched by this
phase's classes** (they concern REQ-01-REQ-04/REQ-13, out of scope per §0):
OQ-03, OQ-04, OQ-05, OQ-07, OQ-08 - none are resolved or guessed at here.

**New Open Questions identified during class derivation** (numbered
continuing from Phase 1's OQ-08):

| ID | Question | Why It Matters | Evidence |
| --- | --- | --- | --- |
| OQ-09 | What does the screen show when `imageUrl` is empty/null (no URL supplied at all), as distinct from a URL that is present but fails to load (TD-06)? | Needed to define EC-29's expected output; a missing-URL precondition is a different code path than a load failure and TD-06's wording doesn't cover it. | Derived from EC-10/EC-29 (§2.2.1/§3.2) |
| OQ-10 | What does the screen show when the product name is empty/null - a blank label, placeholder text, or is the label omitted entirely? | Needed to define EC-32's expected output; FR-06 states name MUST be displayed but never addresses an empty underlying value. | Derived from EC-13/EC-32 (§2.2.2/§3.3) |
| OQ-11 | What does the screen show for a price of exactly `0` - `"0 ₫"`, blank, or a special label (e.g. "Free")? | Needed to define EC-34's expected output; distinct from OQ-06 (general format), since OQ-06 doesn't address the zero case specifically. | Derived from EC-15/EC-34 (§2.2.3/§3.4) |
| OQ-12 | What does the screen show when price is empty/null? | Needed to define EC-36's expected output. | Derived from EC-17/EC-36 (§2.2.3/§3.4) |
| OQ-13 | What does the screen show when description is empty/null - blank, placeholder, or omitted? | Needed to define EC-39's expected output. | Derived from EC-20/EC-39 (§2.2.4/§3.5) |
| OQ-14 | What does the screen show when `category_id` is empty/null? Is this question moot if CF-01 (category never rendered) holds? | Needed to define EC-41's expected output; also bears directly on whether CF-01, once confirmed, makes this question moot the same way OQ-05 became moot for Add-to-Cart in Phase 1. | Derived from EC-23/EC-41 (§2.2.5/§3.6); cross-ref CF-01 |
| OQ-15 | If category *were* rendered, what would the screen show for a dangling `category_id` (one that does not resolve to any existing category)? | Needed to define EC-42's expected output; a data-integrity edge case FR-06 does not address, and also possibly moot per CF-01. | Derived from EC-22/EC-42 (§2.2.5/§3.6); cross-ref CF-01 |
| OQ-16 | Is a leading-zero-entered quantity (e.g. `007`) normalized/stripped (e.g. to `7`) before being displayed or used, or preserved literally as typed? | Needed to define EC-43's expected output; not addressed anywhere in FR-06's text, only implied as a mobile-input risk by TD-01. | Derived from EC-02/EC-43 (§2.1/§3.7); cross-ref TD-01 |

## 6. Self-Check

Re-run after the 2026-07-07 Phase 2 self-critique fixes (P2-G01, P2-G02,
P2-G03 applied).

- [x] Every input and output class is tagged (`Input`/`Output` column
      present on every EC row) and traces to a Phase 1 REQ, TD, OQ, or CF
      reference - verified per row in §2 and §3.
- [x] All 5 Kaner guidelines (a-e) considered explicitly, including the two
      not used as a primary shape in this phase - (b) is stated inapplicable
      with a reason, (c) is stated as not used as a primary shape (already
      resolved at the REQ level in Phase 1), both in §1's legend. Guideline
      (e) is applied extensively and each use cites its risk justification
      (a TD reference or an unexcluded data-integrity scenario), not just
      asserted.
- [x] Explicit empty/null decision made for Quantity (REQ-11-based
      reasoning, not invented) and independently for each of the 5 display
      fields (§2.2's general note + each subsection), per the instruction
      not to skip this and per the heuristics doc's own "Forgetting the
      empty/null partition" warning.
- [x] Zero, negative, decimal, and non-numeric quantity kept as 4 separate
      invalid classes (EC-03-EC-06), not merged into one "any invalid
      value" bucket. **Corrected justification:** the
      primary justification is now the actual validation-logic risk - a
      naive falsy-check (`!quantity`) would reject `0` but not `-5`; a
      naive `isNaN(parseInt(x))` check would reject `"abc"` but not
      `"1.5"` (`parseInt` truncates it to `1`) - not TD-01's keyboard/
      paste-capability framing, which is a different question and is now
      kept only as secondary supporting context.
- [x] REQ-16-REQ-22/CF-01/CF-02 used only as context, never as a settled
      expected-output class: EC-26 (code-observed default-to-1 behavior)
      is explicitly labeled "UNCONFIRMED, context only," kept as a
      separate class from EC-25 (spec-mandated rejection) rather than
      replacing it; EC-40 (category output) carries the CF-01 caveat
      rather than being silently omitted or assumed unreachable.
      **Strengthened:** EC-40's own table row in §3.6 now
      states "unconfirmed - see CF-01" inline, matching §4's traceability
      row, rather than relying solely on the prose paragraph above the
      table to carry that caveat - the same inline-hedge fix already
      applied to Phase 1's CF-01/CF-02 rows (P1-G03) is now applied here
      too.
- [x] No table cell is empty without an explicit reasoned marker.
- [x] IDs are unique and consistently formatted: `EC-01`-`EC-43` sequential
      (Input EC-01-EC-23, Output EC-24-EC-43, no gaps); `OQ-09`-`OQ-16`
      continue Phase 1's `OQ-01`-`OQ-08` without renumbering or colliding.
- [x] Every output class traces back to at least one input class (§4); no
      orphan output identified. EC-40's CF-01 caveat is flagged as a
      reachability concern, not a missing-input-class gap (distinguished
      explicitly in §4's closing note).
- [x] No Open Question was resolved or guessed at - every class whose
      behavior depends on an unresolved question cites that question
      (§3, §5) rather than assuming an answer. 8 new questions (OQ-09-
      OQ-16) were added because class derivation surfaced gaps Phase 1 had
      not yet named; none were answered.
- [x] Where one edge case is folded into an existing Open Question and a
      similar-looking one gets a new one, that distinction is now stated
      explicitly rather than left for the reader to infer:
      §3.4 now explains inline why EC-34 (price = `0`) is a new question
      (OQ-11 - a boundary/business-rule question: is `0` a valid,
      displayable price at all, "0 ₫" vs. "Free") while EC-35 (a very
      large price) stays folded into the existing OQ-06 (a pure
      formatting question at larger magnitude, not a different kind of
      question).
- [x] Scope boundary (REQ-01-04, REQ-13-15 out of scope) is stated once in
      §0 and referenced again where it directly affects a class's
      definition (§3.1's caveat about REQ-11's "accept" language really
      being verifiable only via REQ-13/14's Add-to-Cart outcome).
- [ ] Every equivalence class has at least one covering test case - N/A for
      Phase 2 (test cases are designed in Phase 3).

## 7. Awaiting User Review

This is the Phase 2 artifact (Equivalence Partitioning) for FR-06: Product
Detail View (Mobile), scoped to Quantity (REQ-10-12) and Detail Display
(REQ-05-09) per instruction - 23 input classes (EC-01-EC-23), 20 output
classes (EC-24-EC-43), full backward traceability, and 8 new Open
Questions (OQ-09-OQ-16). Please review and reply "approved" (or similar)
to proceed to Phase 3 (Domain Test Design), or request specific revisions.
