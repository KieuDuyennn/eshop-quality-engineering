# FR-01: Account Registration - Domain Test Cases (Phase 3)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED) and
`output/01_Requirements_Breakdown.md` (Phase 1, APPROVED).
Reference applied: `references/domain_test_heuristics.md` (Kaner & Bach domain-testing
selection rule).

## 0. Design Decisions

**D-1 - Selection rule (applied strictly).**
- *Valid* classes are bundled into as few test cases as possible (multi-fault
  assumption) → a single "Combined valid coverage" case.
- *Invalid* classes each get their own dedicated test case with every other field
  held at a valid value (single-fault isolation) → "Isolated invalid probe" cases.
  No test case combines two invalid conditions.

**D-2 - Test level.** The FR spans two interfaces: the registration **form (UI)** and
the **API** (`POST /api/register`). Confirm Password (REQ-04/13/14) and the
post-registration redirect (REQ-15) exist **only at the UI/form level** - they are not
present/observable in the documented API body/response (per ASM-02/ASM-03, OQ-01,
OQ-08). Conversely, the "absent field" classes (EC-03, EC-07, EC-17, EC-34) are
JSON-payload-shape concepts a form submission cannot reproduce (a rendered form field
cannot be *omitted*, only left blank). Therefore:
- Primary level is the **UI registration form**, where all four fields and the
  redirect are present and observable.
- The "absent field" probes are tagged **API-level** (omit the key in the POST body);
  the redirect assertion does not apply to them.
- This is an explicit consequence of OQ-01/OQ-12, not a new assumption.
- **The valid-coverage case is split across both interfaces (TC-01a/TC-01b, §1):** a
  single UI-level test cannot observe the API's `{message, id}` response body, so
  asserting REQ-16 requires a dedicated API-level valid case in addition to the
  UI-level one that asserts the redirect (REQ-15). Neither interface alone can verify
  both success-side output classes.

**D-3 - Expected-result fidelity (OQ-02).** For *rejections*, the FR specifies no exact
message text or status code, so expected results are stated only as "registration is
rejected with a validation error for <category>" - no invented wording/codes (flagged
to OQ-02). For *success*, REQ-16 **does** specify the response
(`{ message: "User registered successfully", id: <number> }`) and REQ-15 the redirect,
so those are asserted concretely.

**D-4 - Baseline valid values** (used for every field NOT under test in an isolated
probe, so exactly one condition varies):

| Field | Baseline valid value | Class |
| --- | --- | --- |
| Full Name | `Nguyen Van A` | EC-01 |
| Email | `new.user@domain.com` (unique) | EC-05 |
| Password | `Password123!` | EC-15 |
| Confirm Password | **Equal to whatever value Password holds in that test case** (not a fixed constant) | EC-24 |

Confirm Password is defined relationally, not as a fixed value: when Password is at
its baseline (`Password123!`), Confirm is also `Password123!` (EC-24, matches). When a
test case deviates Password to probe a password-strength or presence class (EC-16,
EC-18-EC-23), Confirm must be set to that **same deviated value**, so Confirm still
matches Password and only the one intended condition is invalid. Fixing Confirm to a
constant `Password123!` while Password varies would silently introduce a second
invalid condition (EC-25, mismatch) into what is meant to be a single-fault probe -
this was caught and corrected during self-critique (see `gap_notes.md`, Phase 3
self-critique finding 1).

**D-5 - Common procedure** (referenced by every UI-level TC; only the field under test
deviates from the D-4 baseline):
1. Open the registration form.
2. Enter the Full Name value.
3. Enter the Email value.
4. Enter the Password value.
5. Enter the Confirm Password value (equal to whatever Password value step 4 used -
   see D-4).
6. Click **Register** to submit.

For **API-level** TCs, replace steps 1-6 with: *send `POST /api/register` with a JSON
body containing the specified fields (the field under test omitted as stated).*

**Precondition (all TCs unless overridden):** no account currently exists for the
email being submitted. Duplicate-email TCs override this with a stated existing
account.

---

## 1. Combined Valid Coverage

The valid-coverage case is split across the two interfaces (D-2) because a single
level cannot observe both success-side output classes: the UI form cannot inspect the
raw API response body (EC-27), and asserting the redirect (EC-28) is only meaningful
at the UI. Both TC-01a and TC-01b use the same D-4 baseline values, so each still
bundles all four valid input classes into one case (D-1 valid rule) - the split is
purely to make each asserted output observable at the interface that actually exposes
it, not a re-split of the valid classes themselves.

| TC ID | Coverage Type | EC(s) Covered | REQ(s) | Level | Input (deviations from D-4 baseline) | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01a | Combined valid coverage | EC-01, EC-05, EC-15, EC-24 → EC-28 | REQ-01, REQ-05, REQ-06, REQ-07-REQ-12, REQ-13, REQ-15 | UI form | None - all four fields at their baseline valid values; submit via D-5 steps 1-6 | Account is created; user is redirected to the Login page (REQ-15, EC-28). |
| TC-01b | Combined valid coverage | EC-01, EC-05, EC-15, EC-24 → EC-27 | REQ-01, REQ-05, REQ-06, REQ-07-REQ-12, REQ-13, REQ-16 | API | None - `POST /api/register` body built from the same baseline values (`name`, `email`, `password`; no `confirmPassword` field per OQ-01) | HTTP 200, response body `{ message: "User registered successfully", id: <number> }` (REQ-16, EC-27). |

TC-01a and TC-01b together cover all four valid input classes (D-1 valid rule) and
both success-side output classes (EC-27 at the API level, EC-28 at the UI level) -
each output asserted at the interface where it is actually observable.

---

## 2. Isolated Invalid Probes (definite)

Each row varies exactly one field to its invalid value; all other fields stay at the
D-4 baseline. Expected results for rejections are at the OQ-02 level (D-3).
**Exception: TC-10** is a *combined* probe, not an isolated one - see its row below
and §5 for why it is explicitly exempt from the single-fault rule.

| TC ID | Coverage Type | EC Covered | REQ | Level | Input (deviation from baseline) | Expected Result (→ output EC) |
| --- | --- | --- | --- | --- | --- | --- |
| TC-02 | Isolated invalid probe | EC-02 | REQ-01 | UI form | Full Name = `""` (left blank) | Registration rejected with a "missing/empty required field" validation error (→ EC-29). Exact text/code unspecified - OQ-02. |
| TC-03 | Isolated invalid probe | EC-03 | REQ-01 | API | `name` key omitted from JSON body | Registration rejected with a "missing required field" validation error (→ EC-29). OQ-02. |
| TC-04 | Isolated invalid probe | EC-06 | REQ-02 | UI form | Email = `""` (left blank) | Registration rejected with a "missing/empty required field" validation error (→ EC-29). OQ-02. |
| TC-05 | Isolated invalid probe | EC-07 | REQ-02 | API | `email` key omitted from JSON body | Registration rejected with a "missing required field" validation error (→ EC-29). OQ-02. |
| TC-06 | Isolated invalid probe | EC-08 | REQ-05 | UI form | Email = `userdomain.com` (no `@`) | Registration rejected with an "invalid email format" validation error (→ EC-30). OQ-02. |
| TC-07 | Isolated invalid probe | EC-09 | REQ-05 | UI form | Email = `user@` (no domain) | Registration rejected with an "invalid email format" validation error (→ EC-30). OQ-02. |
| TC-08 | Isolated invalid probe | EC-10 | REQ-05 | UI form | Email = `@domain.com` (no local part) | Registration rejected with an "invalid email format" validation error (→ EC-30). OQ-02. |
| TC-09 | Isolated invalid probe | EC-13 | REQ-06 | UI form | Email = `test@domain.com` - **precondition:** an account with `test@domain.com` already exists | Registration rejected with a "duplicate email" validation error (→ EC-31). OQ-02. |
| TC-10 | **Combined probe (EC-16 + EC-26 - shared root cause)** - not an Isolated invalid probe | EC-16, EC-26 | REQ-03, REQ-04 | UI form | Password = `""` (left blank); Confirm Password = `""` (left blank). Both fields blank as a result of **one** action - submitting the form with the whole password section empty - not two independently chosen invalid values. | **This TC is exempt from the single-fault isolation rule because EC-16 and EC-26 share one root cause, not two unrelated ones.** Registration rejected. The response must show **both** validation signals: a password-required indication (REQ-03) **and** a confirm-password-required indication (REQ-04) (→ EC-29 for each). If the system surfaces only one of the two signals, that is a **candidate defect** in its own right - do not assume which one it will show; see new **OQ-14**. Exact text/code unspecified - OQ-02. |
| TC-11 | Isolated invalid probe | EC-17 | REQ-03 | API | `password` key omitted from JSON body | Registration rejected with a "missing required field" validation error (→ EC-29). OQ-02. |
| TC-12 | Isolated invalid probe | EC-18 | REQ-07 | UI form | Password = `Pass1!` (6 chars, `1 ≤ len ≤ 7`; upper+lower+digit+special all present); Confirm Password = `Pass1!` (same value, per D-4 - matches, so no mismatch fault rides along) | Registration rejected with a "weak password" validation error (→ EC-32). OQ-02. |
| TC-13 | Isolated invalid probe | EC-19 | REQ-08 | UI form | Password = `password123!` (no uppercase); Confirm Password = `password123!` (same value, per D-4) | Registration rejected with a "weak password" validation error (→ EC-32). OQ-02. |
| TC-14 | Isolated invalid probe | EC-20 | REQ-09 | UI form | Password = `PASSWORD123!` (no lowercase); Confirm Password = `PASSWORD123!` (same value, per D-4) | Registration rejected with a "weak password" validation error (→ EC-32). OQ-02. |
| TC-15 | Isolated invalid probe | EC-21 | REQ-10 | UI form | Password = `Password!` (no digit); Confirm Password = `Password!` (same value, per D-4) | Registration rejected with a "weak password" validation error (→ EC-32). OQ-02. |
| TC-16 | Isolated invalid probe | EC-22 | REQ-11 | UI form | Password = `Password123` (no special char from the set); Confirm Password = `Password123` (same value, per D-4) | Registration rejected with a "weak password" validation error (→ EC-32). OQ-02. |
| TC-17 | Isolated invalid probe | EC-25 | REQ-13, REQ-14 | UI form | Confirm Password = `Password124!` (≠ Password `Password123!`) | Registration rejected with a "password mismatch" validation error (→ EC-33). OQ-02. UI-level only - the documented API body has no `confirmPassword` field (OQ-01). |

Each *isolated* probe (all rows above except TC-10) holds four of the five
conditions valid and violates exactly one, so a failure is unambiguously
attributable (D-1 invalid rule). **TC-10 is deliberately excluded from that claim**
- it is a combined probe for EC-16 + EC-26, exempted because both share a single
root cause (submitting the form with both password fields blank), not because
isolation was attempted and failed. See TC-10's row and `gap_notes.md`.

---

## 3. Conditional Probes - Ambiguous Classes (EC-04, EC-11, EC-12, EC-14, EC-23)

These classes have unresolved Valid/Invalid status (blocked on Open Questions), so a
definite expected result cannot be asserted. **Decision: keep each as an isolated
probe now, but with a conditional expected result keyed to its Open Question** (rather
than dropping it or guessing). Each isolates exactly one ambiguous condition against
the D-4 baseline, so it is ready to run the moment its OQ is answered.

| TC ID | Coverage Type | EC Covered | REQ | Level | Input (deviation from baseline) | Conditional Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-18 | Isolated invalid probe (conditional - OQ-04/OQ-10) | EC-04 | REQ-01 | UI form | Full Name = `"   "` (whitespace only) | If whitespace-only is treated as empty/invalid → rejected as missing/empty required field (→ EC-29). If treated as a valid non-empty name → success (→ EC-27). Cannot assert until OQ-04/OQ-10 resolves. |
| TC-19 | Isolated invalid probe (conditional - OQ-11) | EC-11 | REQ-05 | UI form | Email = `user@domain` (no TLD) | If a TLD is required → rejected as invalid email format (→ EC-30). If accepted → success (→ EC-27). Pending OQ-11. |
| TC-20 | Isolated invalid probe (conditional - OQ-11) | EC-12 | REQ-05 | UI form | Email = `user+tag@mail.domain.com` (subdomain + plus-addressing) | If subdomain/plus-addressing is accepted → success (→ EC-27). If rejected → invalid email format (→ EC-30). Pending OQ-11. |
| TC-21 | Isolated invalid probe (conditional - OQ-09) | EC-14 | REQ-06 | UI form | Email = `Test@domain.com` - **precondition:** an account with lowercase `test@domain.com` already exists | If uniqueness is case-insensitive/normalized → rejected as duplicate email (→ EC-31). If case-sensitive → success (→ EC-27). Pending OQ-09. |
| TC-22 | Isolated invalid probe (conditional - OQ-06) | EC-23 | REQ-11 | UI form | Password = `Password123#` (`#` is outside the set `@ $ ! % * ? &`; all listed rules otherwise met); Confirm Password = `Password123#` (same value, per D-4) | If the set is exclusive/`#` rejected → weak password (→ EC-32). If `#` is tolerated/ignored → success (→ EC-27). Pending OQ-06. |

---

## 4. Confirm Password - Special Handling (EC-26, EC-34)

Both are Invalid classes flagged in Phase 2 as not exercisable via the documented API
body (no `confirmPassword` field; ASM-03, OQ-01). Explicit decision per class:

| EC | Decision | Rationale | Handling |
| --- | --- | --- | --- |
| EC-26 (Confirm Password empty) | **Conditional TC - UI-level only** (TC-23 below) | At the UI/form level the field is rendered and can be left blank, so the condition *is* reachable at that level; it is only unreachable through the documented API payload. | Executable now at the UI form; not reproducible via `POST /api/register` until OQ-01 clarifies whether the API carries a `confirmPassword` field. |
| EC-34 (Confirm Password field absent) | **Deferred - no executable TC** | "Absent field" is a payload-shape concept. The UI form always renders the field (cannot omit it), and the documented API body has no `confirmPassword` key to omit either - so the condition is unreachable at **both** documented interfaces. | Deferred pending OQ-01; if the API is found to accept a `confirmPassword` field, add an API-level isolated invalid probe then. Not silently dropped - recorded here. |

| TC ID | Coverage Type | EC Covered | REQ | Level | Input (deviation from baseline) | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC-23 | Isolated invalid probe (UI-level only) | EC-26 | REQ-04, REQ-13 | UI form | Confirm Password = `""` (left blank) | Registration rejected with a validation error (→ EC-29 / EC-33 - see §5 mapping for EC-26). Exact text/code unspecified - OQ-02. Executable at UI level only (OQ-01). |

---

## 5. Coverage & Traceability Matrix

Every Phase 2 equivalence class mapped to its covering test case (or explicit
deferral). This is the Phase 3 coverage guarantee.

| EC | V/I | Covered By | Notes |
| --- | --- | --- | --- |
| EC-01 | Valid | TC-01a, TC-01b | Bundled at both interfaces |
| EC-02 | Invalid | TC-02 | - |
| EC-03 | Invalid | TC-03 | API-level |
| EC-04 | Ambiguous | TC-18 | Conditional (OQ-04/OQ-10) |
| EC-05 | Valid | TC-01a, TC-01b | Bundled at both interfaces |
| EC-06 | Invalid | TC-04 | - |
| EC-07 | Invalid | TC-05 | API-level |
| EC-08 | Invalid | TC-06 | - |
| EC-09 | Invalid | TC-07 | - |
| EC-10 | Invalid | TC-08 | - |
| EC-11 | Ambiguous | TC-19 | Conditional (OQ-11) |
| EC-12 | Ambiguous | TC-20 | Conditional (OQ-11) |
| EC-13 | Invalid | TC-09 | Precondition: existing account |
| EC-14 | Ambiguous | TC-21 | Conditional (OQ-09) |
| EC-15 | Valid | TC-01a, TC-01b | Bundled at both interfaces |
| EC-16 | Invalid | TC-10 | **combined-root-cause** with EC-26 (TC-10 is a Combined probe, not an Isolated invalid probe - see TC-10 row) |
| EC-17 | Invalid | TC-11 | API-level |
| EC-18 | Invalid | TC-12 | Confirm Password matched to deviated value (D-4) |
| EC-19 | Invalid | TC-13 | Confirm Password matched to deviated value (D-4) |
| EC-20 | Invalid | TC-14 | Confirm Password matched to deviated value (D-4) |
| EC-21 | Invalid | TC-15 | Confirm Password matched to deviated value (D-4) |
| EC-22 | Invalid | TC-16 | Confirm Password matched to deviated value (D-4) |
| EC-23 | Ambiguous | TC-22 | Conditional (OQ-06); Confirm Password matched to deviated value (D-4) |
| EC-24 | Valid | TC-01a, TC-01b | Bundled at both interfaces |
| EC-25 | Invalid | TC-17 | UI-level only |
| EC-26 | Invalid | TC-23 (primary, isolated); also exercised by TC-10 (**combined-root-cause** with EC-16, not a second isolated probe) | UI-level only (conditional on interface). Maps to **both** EC-29 and EC-33 - see below. |
| EC-34 | Invalid | *(none)* | **Deferred** - untestable at both documented interfaces (OQ-01) |
| EC-27 | Output/Success | TC-01b (+ conditional branch of TC-18..TC-22) | Now exercised at the API level, where the response body is actually observable |
| EC-28 | Output/Redirect | TC-01a | Observable at UI level (resolves OQ-08 for this level) |
| EC-29 | Output/Rejected | TC-02, TC-03, TC-04, TC-05, TC-10, TC-11, TC-23 (+ TC-18 branch) | TC-23 (EC-26) is also mapped to EC-33 below - an empty Confirm is simultaneously a required-field violation and a non-match |
| EC-30 | Output/Rejected | TC-06, TC-07, TC-08 (+ TC-19/TC-20 branch) | - |
| EC-31 | Output/Rejected | TC-09 (+ TC-21 branch) | - |
| EC-32 | Output/Rejected | TC-12..TC-16 (+ TC-22 branch) | - |
| EC-33 | Output/Rejected | TC-17, **TC-23** | TC-23 (EC-26, empty Confirm) added: an empty Confirm both fails REQ-04 (required) and fails REQ-13 (match, since it no longer equals the non-empty Password) - both output classes are legitimate depending on which check the implementation surfaces first (OQ-07) |

**Result:** all 27 input classes and 7 output classes are covered by
TC-01a/TC-01b/TC-02..TC-23, with exactly one documented deferral (EC-34) and one
deliberate **combined-root-cause probe** (TC-10, covering EC-16 + EC-26 together,
explicitly exempt from the single-fault rule rather than a broken isolation
attempt).

---

## 6. Open Questions

Carried forward (unchanged - each still blocks a conditional/deferred item):

| ID | Bearing on Phase 3 |
| --- | --- |
| OQ-02 | All rejection expected results (TC-02..TC-17, TC-23) stated only as "rejected with a validation error for <category>" - no exact text/status. |
| OQ-04 / OQ-10 | TC-18 expected result is conditional. |
| OQ-06 | TC-22 expected result is conditional. |
| OQ-09 | TC-21 expected result is conditional. |
| OQ-11 | TC-19, TC-20 expected results are conditional. |
| OQ-01 | TC-17, TC-23 are UI-level only; EC-34 is deferred; TC-01b's body has no `confirmPassword` field - all because the API body has no `confirmPassword` field. |
| OQ-08 | Redirect (EC-28) is asserted at UI level in TC-01a; still not observable via the API response body - this is why TC-01b exists separately to assert REQ-16. |
| OQ-12 | "Empty" vs "absent" handled as separate probes (e.g. TC-02 vs TC-03) → both currently expect EC-29; if they diverge, expected results split. |
| OQ-07 | Multi-fault inputs deliberately excluded by the single-fault rule; no TC combines two invalid conditions. |
| OQ-13 | Malformed/non-JSON request remains out of scope - no TC (see Phase 2 §2 exclusion). |

**New in Phase 3 - OQ-14:** When both Password and Confirm Password are submitted
empty (TC-10), does the system's validation response surface **both** a
password-required signal and a confirm-password-required signal, or only one? The FR
specifies required-ness for each field independently (REQ-03, REQ-04) but says
nothing about combined-omission behavior. *Impact:* TC-10's expected result requires
both signals; if the real system returns only one, that is flagged as a **candidate
defect** rather than assumed away - this OQ exists precisely so that outcome isn't
pre-judged.

---

## 7. Self-Check

- [x] Every equivalence class has at least one covering test case - **Pass with one documented deferral:** EC-01..EC-26 and all outputs are covered (see §5); EC-34 has no TC but is explicitly deferred as untestable at both documented interfaces (OQ-01), not silently dropped.
- [x] Selection rule applied exactly - **corrected this revision, twice over.** First correction: the prior version's line "no test case combines two invalid conditions" was **wrong** - TC-10 and TC-12..TC-16, TC-22 each fixed Confirm Password to the constant `Password123!` while Password was deviated, so a password-mismatch fault (EC-25) rode along with the intended password-composition fault. Fixed by making Confirm Password relational (D-4): it now always equals whatever Password value the test case uses, so TC-12..TC-16 and TC-22 are genuinely single-fault. Second correction: TC-10 could not be forced into that same fix without a genuine second condition (Confirm="" independently trips its own required-ness rule, EC-26) - so rather than leave TC-10 mislabeled as an "Isolated invalid probe" with an apologetic footnote, **TC-10 is now explicitly re-scoped as a Combined probe for EC-16 + EC-26**, exempted from the single-fault rule because the two classes share one root cause (an empty-form submission), not two independent faults. This is a labeling correction, not a claim that isolation was achieved where it wasn't. One "Combined valid coverage" case per interface (TC-01a UI, TC-01b API) bundles all valid classes; every *isolated* invalid class has its own dedicated, genuinely single-fault probe; TC-10 is the one explicit, honestly-labeled exception.
- [x] Every test case is labeled "Combined valid coverage" or "Isolated invalid probe" - **with one stated, deliberate deviation.** TC-10 carries a third label, "Combined probe (EC-16 + EC-26 - shared root cause)," which is not one of the reference's two canonical labels. This is an intentional, explained exception (see D-1/TC-10/§5) reflecting that TC-10 genuinely fits neither category - forcing it into "Isolated invalid probe" would misstate what it tests, and forcing it into "Combined valid coverage" would be nonsensical (both classes are invalid). Every other TC uses one of the two canonical labels without qualification beyond conditional/level tags.
- [x] Every TC traces to its EC(s) and REQ(s) - both columns present in every table; §5 gives the full EC→TC matrix. TC-10 now correctly traces to **both** EC-16 and EC-26 (previously listed EC-16 only, which understated what the test actually exercises).
- [x] No invented business rules or expected results - rejection outcomes kept at the OQ-02 level; only the FR-specified success response/redirect (REQ-15/16) is asserted concretely, each now at the interface where it is actually observable (TC-01a/TC-01b split). Ambiguous classes carry conditional (not guessed) results. TC-10's dual-signal expectation is stated as a requirement to check, not an assumption of which signal the system will actually show - divergence is routed to new OQ-14 rather than guessed.
- [x] IDs unique and consistently formatted (`TC-01a`, `TC-01b`, `TC-02`..`TC-23`, zero-padded, no gaps). `TC-01` was split into `TC-01a`/`TC-01b` rather than renumbering every subsequent ID.
- [x] No empty table cells - every cell populated; "None"/"-" used where nothing applies.
- [x] Terminology consistent with Phases 1-2 ("field", "class", "requirement", "valid/invalid", EC/REQ/TC IDs), plus the new "combined-root-cause" tag used consistently between TC-10's row and its two §5 matrix entries (EC-16, EC-26).
- [x] Ambiguous classes (EC-04, 11, 12, 14, 23) and API-untestable Confirm Password classes (EC-26, 34) each handled by an explicit decision (conditional TC or documented deferral) - none dropped silently.
- [x] Every isolated invalid probe holds all fields except the one under test at a genuinely valid value - **now a clean pass.** This previously failed only because TC-10 was mislabeled as an isolated probe when it structurally couldn't satisfy that property. With TC-10 re-scoped out of the "Isolated invalid probe" category entirely (it is a Combined probe, exempted by design), every test case that *is* labeled "Isolated invalid probe" now genuinely satisfies this property with no exceptions.

---

## 8. Awaiting User Review

This is the Phase 3 artifact (Domain Test Cases) for FR-01: Account Registration -
2 combined-valid cases split by interface (TC-01a UI, TC-01b API), 15 definite
isolated invalid probes (TC-02..TC-09, TC-11..TC-17), 1 combined-root-cause probe
(TC-10, covering EC-16 + EC-26 together and explicitly exempt from the single-fault
rule), 5 conditional probes for the ambiguous classes (TC-18..TC-22), 1
UI-level-only Confirm-Password probe (TC-23), and 1 documented deferral (EC-34).
Reply "approved" to proceed to Phase 4 (Boundary Value Analysis), or request specific
revisions. Note that the conditional probes (TC-18..TC-22) and TC-23/EC-34 will only
yield concrete expected results once their Open Questions (OQ-01, OQ-04/06/09/10/11)
are answered, and TC-10's dual-signal expected result depends on new OQ-14 (whether
the system reports both password-required and confirm-required violations on a
fully-blank submission, or only one).
