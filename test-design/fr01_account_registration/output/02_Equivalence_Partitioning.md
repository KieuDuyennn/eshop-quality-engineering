# FR-01: Account Registration - Equivalence Partitioning (Phase 2)

Input artifact: `output/01_Requirements_Breakdown.md` (Phase 1, APPROVED).
Reference applied: `references/equivalence_partitioning_heuristics.md` (Kaner & Bach domain-testing method).

**Implementation grounding note:** the heuristics require cross-checking assumed
equivalence against the actual API/backend when it exists in the repository. This
repository contains only the FR documents and skill files - there is **no backend or
`/api/register` implementation present** to read. All classes below are therefore
derived from the FR prose and the Phase 1 breakdown only; any class whose boundary
depends on unobservable implementation behavior is flagged and linked to the relevant
Open Question rather than resolved by assumption.

Legend - **V/I**: `Valid` / `Invalid` / `Ambiguous` (validity unresolved, pending an
Open Question). Every class carries a stable `EC-xx` ID reused by Phases 3-4.

---

## 1. Input Equivalence Classes

Grouped by field. "Produces Output" links each input class forward to the Output
class (§2) it drives, giving bidirectional traceability.

### 1.1 Full Name (REQ-01)

| EC ID | V/I | Class Description | Representative Value | Source REQ | Produces Output | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-01 | Valid | Present, non-empty string | `name = "Nguyen Van A"` | REQ-01 | EC-27 | None |
| EC-02 | Invalid | Empty string value | `name = ""` | REQ-01 | EC-29 | May collapse with EC-03 - see OQ-12 |
| EC-03 | Invalid | Field absent from JSON payload | `name` key omitted | REQ-01 | EC-29 | May collapse with EC-02 - see OQ-12 |
| EC-04 | Ambiguous | Whitespace-only string | `name = "   "` | REQ-01 | EC-27 or EC-29 | Valid vs invalid unresolved - see OQ-04, OQ-10 |

### 1.2 Email (REQ-02, REQ-05, REQ-06)

The email field carries three independent conditions: **presence** (REQ-02),
**format** (REQ-05, a "must-be-X" condition), and **uniqueness** (REQ-06, a
"must-be-X" condition). The format invalid partition is split into sub-classes under
guideline (e): each malformation is caught by a distinct validation check and needs
its own representative.

| EC ID | V/I | Class Description | Representative Value | Source REQ | Produces Output | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-05 | Valid | Present, valid format, not yet registered (unique) | `email = "new.user@domain.com"` | REQ-02, REQ-05, REQ-06 | EC-27 | None |
| EC-06 | Invalid | Empty string value | `email = ""` | REQ-02 | EC-29 | May collapse with EC-07 - see OQ-12 |
| EC-07 | Invalid | Field absent from JSON payload | `email` key omitted | REQ-02 | EC-29 | May collapse with EC-06 - see OQ-12 |
| EC-08 | Invalid | Malformed - missing `@` separator | `email = "userdomain.com"` | REQ-05 | EC-30 | None |
| EC-09 | Invalid | Malformed - missing domain part | `email = "user@"` | REQ-05 | EC-30 | None |
| EC-10 | Invalid | Malformed - missing local part | `email = "@domain.com"` | REQ-05 | EC-30 | None |
| EC-11 | Ambiguous | Missing TLD | `email = "user@domain"` | REQ-05 | EC-30 or EC-27 | Accept/reject unresolved - see OQ-11 |
| EC-12 | Ambiguous | Subdomain and/or plus-addressing | `email = "user+tag@mail.domain.com"` | REQ-05 | EC-27 or EC-30 | Accept/reject unresolved - see OQ-11 |
| EC-13 | Invalid | Duplicate - exact match of an already-registered email | `email = "test@domain.com"` (pre-existing) | REQ-06 | EC-31 | None |
| EC-14 | Ambiguous | Duplicate differing only by letter case | `email = "Test@domain.com"` vs stored `test@domain.com` | REQ-06 | EC-31 or EC-27 | Case-sensitivity/normalization unresolved - see OQ-09 |

### 1.3 Password (REQ-03, REQ-07-REQ-12)

Presence (REQ-03) plus the five strength sub-rules (REQ-07-REQ-11), which REQ-12
requires to hold **simultaneously**. Each invalid class below isolates **exactly one**
violated rule (single-fault), so it can seed a dedicated Phase 3 test case without
combining two invalid conditions.

| EC ID | V/I | Class Description | Representative Value | Source REQ | Produces Output | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-15 | Valid | Meets all 5 rules: ≥8 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special from `@ $ ! % * ? &` | `password = "Password123!"` | REQ-07-REQ-12 | EC-27 | Valid side of the guideline (a) length RANGE (`len ≥ 8`), open-ended above; no stated maximum - see OQ-03 |
| EC-16 | Invalid | Empty string value | `password = ""` | REQ-03 | EC-29 | May collapse with EC-17 - see OQ-12 |
| EC-17 | Invalid | Field absent from JSON payload | `password` key omitted | REQ-03 | EC-29 | May collapse with EC-16 - see OQ-12 |
| EC-18 | Invalid | Too short - length 1-7 characters (`1 ≤ len ≤ 7`), all other rules met. REQ-07's minimum-length is a **guideline (a) RANGE** condition on measurable string length (not a number-of-values condition); the below-range invalid class is bounded at 1, and the valid side is EC-15 (`len ≥ 8`). | `password = "Pass1!"` (6 chars) | REQ-07 | EC-32 | Lower-bounded at 1 so it is disjoint from EC-16 (empty, `len = 0`) - no overlap |
| EC-19 | Invalid | No uppercase letter (all other rules met) | `password = "password123!"` | REQ-08 | EC-32 | None |
| EC-20 | Invalid | No lowercase letter (all other rules met) | `password = "PASSWORD123!"` | REQ-09 | EC-32 | None |
| EC-21 | Invalid | No digit (all other rules met) | `password = "Password!"` | REQ-10 | EC-32 | None |
| EC-22 | Invalid | No special character from the set (all other rules met) | `password = "Password123"` | REQ-11 | EC-32 | None |
| EC-23 | Ambiguous | Contains a special char **outside** the set `@ $ ! % * ? &` (e.g. `#`), all listed rules otherwise met | `password = "Password123#"` | REQ-11 | EC-27 or EC-32 | Exclusive-set vs ignore vs reject unresolved - see OQ-06 |

### 1.4 Confirm Password (REQ-04, REQ-13, REQ-14)

| EC ID | V/I | Class Description | Representative Value | Source REQ | Produces Output | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-24 | Valid | Exactly equals the Password value | `confirmPassword = "Password123!"` (= password) | REQ-13 | EC-27 | None |
| EC-25 | Invalid | Does not match the Password value | `confirmPassword = "Password124!"` (≠ password) | REQ-14 | EC-33 | None |
| EC-26 | Invalid | Empty string value | `confirmPassword = ""` | REQ-04 | EC-29 | May collapse with EC-34 - see OQ-12. Not exercisable via API - no `confirmPassword` in request body; see ASM-03, OQ-01 |
| EC-34 | Invalid | Field absent from payload | `confirmPassword` key omitted | REQ-04 | EC-29 | May collapse with EC-26 - see OQ-12. Not exercisable via API - see ASM-03, OQ-01. ID appended after the output block (EC-27..EC-33) to keep existing EC IDs stable - see numbering note below §2. |

---

## 2. Output Equivalence Classes

Derived per guideline (c) (distinct outcome states) and the "system message classes"
guidance. "Traces Back To" lists the input class(es) that can produce each output,
satisfying the backward-trace requirement.

| EC ID | Outcome Type | Class Description | Expected Result | Source REQ | Traces Back To (Input EC) | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| EC-27 | Success | Registration accepted | HTTP 200, body `{ message: "User registered successfully", id: <number> }` | REQ-16 | EC-01 ∧ EC-05 ∧ EC-15 ∧ EC-24 (all-valid combination) | Message-text vs numeric-`id` kept as one class per Phase 1 gap_notes deferral (item 2) |
| EC-28 | Success side-effect | Redirect to Login page | User navigated to Login page | REQ-15 | EC-01 ∧ EC-05 ∧ EC-15 ∧ EC-24 (same all-valid combination) | Not verifiable in API response body - see OQ-08 |
| EC-29 | Rejected | Missing **or** empty required field | Registration rejected with an appropriate error message | REQ-17 | EC-02, EC-03, EC-06, EC-07, EC-16, EC-17, EC-26, EC-34 | "Absent field" and "present-but-empty" are deliberately merged into this one output class pending OQ-12: the FR gives no basis to distinguish their responses, and with exact message/status unspecified (OQ-02) both currently yield identical expected results. Split into two output classes if OQ-12/OQ-02 resolve as distinguishable. Exact message/status code unspecified - see OQ-02 |
| EC-30 | Rejected | Invalid email format | Registration rejected with an appropriate error message | REQ-17 | EC-08, EC-09, EC-10 (ambiguously EC-11, EC-12) | Exact message/status code unspecified - see OQ-02 |
| EC-31 | Rejected | Duplicate email | Registration rejected with an appropriate error message | REQ-17 | EC-13 (ambiguously EC-14) | Exact message/status code unspecified - see OQ-02 |
| EC-32 | Rejected | Weak password | Registration rejected with an appropriate error message | REQ-17 | EC-18, EC-19, EC-20, EC-21, EC-22 (ambiguously EC-23) | Exact message/status code unspecified - see OQ-02 |
| EC-33 | Rejected | Password mismatch | Registration rejected with an appropriate error message | REQ-17 | EC-25 | Exact message/status code unspecified - see OQ-02 |

**Numbering note:** input classes occupy `EC-01..EC-26`; output classes occupy
`EC-27..EC-33`. EC-26 was split during revision (empty vs absent Confirm Password),
and the new input class was assigned `EC-34` - appended after the output block rather
than inserted at 27 - specifically to avoid renumbering every output class and every
cross-reference. So `EC-34` is an **input** class despite its position after the
outputs; this is a deliberate, explained ordering, not a gap.

**Deliberate exclusion - malformed / non-JSON request:** no output class is defined
for a structurally invalid request (invalid JSON, wrong `Content-Type`, non-object
body, extra/unknown fields). The FR specifies no behavior for such requests, so
defining one would mean inventing an unspecified response. This is excluded on
purpose and raised as OQ-13 (§4) rather than silently omitted.

---

## 3. Backward-Trace Verification

Per the reference: every output class must be reachable from at least one input class,
and every input class should map to an output class - otherwise flag a gap.

| Check | Result |
| --- | --- |
| Every output class (EC-27..EC-33) has ≥1 producing input class | Pass - see "Traces Back To" column; none orphaned. |
| Every input class (EC-01..EC-26, EC-34) maps to a producing output | Pass - see "Produces Output" column; ambiguous inputs (EC-04, EC-11, EC-12, EC-14, EC-23) map to an ambiguous outcome pending their Open Question. |
| Every REQ-17 rejection category has a distinct output class | Pass - 5 categories (missing field, invalid format, duplicate, weak password, mismatch) → EC-29..EC-33 respectively. |
| Success response fully covered | Partial - EC-27 covers `{message, id}` as one class; the message-vs-id split is deferred (Phase 1 gap_notes item 2), and EC-28 (redirect) is flagged non-verifiable via API (OQ-08). |

---

## 4. Open Questions Carried Into Phase 2

These Phase 1 Open Questions directly constrain the classes above; each remains
unresolved and blocks precise classification where flagged.

| ID (from Phase 1) | Impact on this phase |
| --- | --- |
| OQ-02 | All rejection output classes (EC-29..EC-33) can only assert "rejected with an appropriate message" - no exact text/status code. |
| OQ-03 | EC-15 (valid password) has no defined upper length bound; the valid class is open-ended upward. |
| OQ-04 / OQ-10 | EC-04 (whitespace-only name) cannot be classified Valid vs Invalid; also affects whether EC-02 semantics extend to blank-but-present values. |
| OQ-06 | EC-23 (out-of-set special char) cannot be classified Valid vs Invalid. |
| OQ-09 | EC-14 (case-variant duplicate email) cannot be classified Valid vs Invalid. |
| OQ-11 | EC-11 (missing TLD) and EC-12 (subdomain/plus-addressing) cannot be classified Valid vs Invalid. |
| OQ-12 | Whether "empty value" and "absent field" are one class or two - affects the EC-02/EC-03, EC-06/EC-07, EC-16/EC-17 pairs. |
| OQ-01 / ASM-03 | EC-26 (empty) and EC-34 (absent) Confirm Password are not exercisable at the API level; may be UI-only. |
| OQ-08 | EC-28 (redirect to Login) is not observable in the API response body. |
| OQ-07 | Multi-rule-violation inputs are deliberately excluded here (each invalid class isolates one fault); how simultaneous violations are reported remains open and will shape Phase 3 test selection. |

**New in Phase 2 - OQ-13:** Does `POST /api/register` validate request *structure*
(malformed JSON, wrong `Content-Type`, non-object body, unknown/extra fields), and if
so what does it return? The FR specifies no behavior for structurally invalid
requests. *Impact:* per the deliberate-exclusion note in §2, no output class is
defined for malformed requests; if this must be tested, a class and expected result
have to be added once the behavior is known.

---

## 5. Self-Check

- [x] Every equivalence class is traceable to the source requirement - each row cites its `REQ-xx` (which in turn trace to the FR in Phase 1).
- [x] No invented business rules - every class rests on an explicit REQ; all validity gaps are marked `Ambiguous` and linked to an existing Open Question rather than resolved by assumption. Implementation was unavailable to cross-check and this is stated, not silently assumed away. Malformed-request behavior is explicitly excluded (OQ-13), not invented.
- [ ] Every equivalence class has at least one covering test case - N/A for Phase 2 (test cases are produced in Phase 3); coverage is instead pre-verified via the §3 backward-trace.
- [x] IDs are unique and consistently formatted (`EC-01`..`EC-34`, zero-padded). EC-34 sits after the output block by design - see the §2 numbering note - so it is an explained ordering, not a gap.
- [x] No table cell is empty without an explicit marker - every cell populated; "None" used where no flag applies.
- [x] Terminology is consistent throughout - "field", "class", "requirement", "valid/invalid" used consistently; matches Phase 1 vocabulary.
- [x] Both INPUT and OUTPUT classes derived; outputs traced back to producing inputs (§2, §3).
- [x] Empty/null partition explicitly decided for every field - now consistently **split** into empty vs absent across all four fields (EC-02/03, EC-06/07, EC-16/17, EC-26/34) rather than merged for Confirm Password.
- [x] No overlapping partitions - **corrected this revision.** The prior version's "`< 8`" password class (EC-18) overlapped the empty class (EC-16, `len = 0`); EC-18 is now bounded `1 ≤ len ≤ 7`, disjoint from EC-16. Earlier self-check wrongly passed this line by only checking the upper edge at 8. Now genuinely non-overlapping at both edges.
- [ ] Success output fully partitioned - **Partial (carried forward, not resolved).** EC-27 still merges the message string and numeric `id` (deferred, gap_notes item 5), and EC-28 (redirect) is non-verifiable via the API body (OQ-08). Consistent with the "Partial" verdict in the §3 backward-trace.

---

## 6. Awaiting User Review

This is the Phase 2 artifact (Equivalence Partitioning) for FR-01: Account
Registration - 27 input classes (EC-01..EC-26 plus EC-34) and 7 output classes (EC-27..EC-33),
with forward/backward traceability. Reply "approved" to proceed to Phase 3 (Domain
Test Design), or request specific revisions. Note the five `Ambiguous` classes
(EC-04, EC-11, EC-12, EC-14, EC-23), the API-untestable Confirm Password classes
(EC-26, EC-34), and EC-28 remain blocked on the Open Questions in §4 - you may want
to resolve some before Phase 3 so those classes get concrete expected results.
