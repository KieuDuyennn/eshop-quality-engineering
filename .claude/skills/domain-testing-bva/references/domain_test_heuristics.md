# Domain Test Design Heuristics (Kaner & Bach Domain Testing Method)

Reference for Phase 3 (Domain Test Design). Load only when executing this phase.

## The Test-Case Selection Rule

This is a hard rule from the domain testing method, not a suggestion — apply it
exactly as stated:

- **For VALID equivalence classes**: combine as many valid classes as possible into
  as few test cases as possible, until every valid class has been covered at least
  once. This relies on the multi-fault assumption — combining valid inputs together
  in one test case is safe because the system is expected to handle each valid input
  correctly and independently, so a single combined test case can validate multiple
  valid classes at once.
- **For INVALID equivalence classes**: each test case must cover exactly ONE invalid
  class at a time — never combine two invalid conditions into a single test case.
  This is single-fault isolation: if the test fails, you must be able to tell which
  invalid condition caused the failure. If two invalid conditions were combined and
  the test fails, you cannot attribute the failure to either one with confidence.
  Continue until every invalid class has its own dedicated test case.

## State the Distinction Explicitly in the Artifact

Every test case in the output artifact must be labeled as one of:

- **"Combined valid coverage"** — a test case that bundles multiple valid classes
  together (per the valid-class rule above).
- **"Isolated invalid probe"** — a test case that exercises exactly one invalid
  class while every other input holds a valid value (per the invalid-class rule
  above).

Do not leave this unlabeled — a reader must be able to tell at a glance which rule
produced each test case.

## Writing Preconditions, Steps, and Expected Results

- **Preconditions**: state only what must be true before the test starts (e.g. "user
  is logged in", "cart is empty"). Derive from the FR or from Phase 1's atomic
  requirements — never invent setup steps not implied by the requirement.
- **Steps**: numbered, action-oriented, one user action per step (e.g. "Enter '15'
  into the Quantity field", "Click Submit"). Steps must be concrete enough that a
  human tester could execute them without additional interpretation.
- **Expected Result**: state the observable outcome only — what the system should
  show/do. If the FR doesn't specify the exact outcome for an invalid class (e.g. the
  exact error message text), write the expected behavior at the level of detail the
  FR supports (e.g. "system rejects the input and displays a validation error") and
  flag the missing specificity as an Open Question rather than inventing exact
  wording.

## Traceability

Every test case (`TC-xx`) must reference the equivalence class(es) it covers
(`EC-xx`) and, transitively, the atomic requirement (`REQ-xx`). Include both an
"Equivalence Class(es) Covered" column and a "Coverage Type" column
(Combined valid coverage / Isolated invalid probe) in the test case table.
