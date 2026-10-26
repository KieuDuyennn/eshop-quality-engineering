# Gap Notes - fr01_account_registration

## 2026-07-05 - Phase 1 self-critique

Re-reading `output/01_Requirements_Breakdown.md` against the FR text before approval.
Findings only - nothing fixed yet.

1. **REQ-04 conflates a stated rule with an unstated inference.** §3.1 only says the
   Confirm Password field "MUST also be present in the registration form (UI-level)."
   My REQ-04 statement adds "and by extension must be provided/required" - that
   extension isn't explicitly in the text; it's an inference (supported indirectly by
   REQ-13/14, but not the same claim). This should probably be split into a plain
   "field must be present" REQ plus a separate Assumption for the "must be filled in"
   part, instead of folding the inference into a REQ classified as "Functional
   Requirement."

2. **REQ-16 bundles two independently-testable output facts into one REQ.** The
   success response has (a) an exact message string `"User registered successfully"`
   and (b) a numeric `id`. These are separable equivalence classes for Phase 2
   (e.g., "id is present and numeric" vs "message text matches exactly") but are
   currently merged into a single REQ-16, which risks under-covering one of the two
   facts later.

3. **REQ-18 over-bundles the API contract Observation.** It merges the endpoint path,
   HTTP method, and all three request body field-name mappings (`name`, `email`,
   `password`) into one row. The `name` ↔ "Full Name" mapping specifically overlaps
   with ASM-01 and would be cleaner traced as its own item rather than buried inside
   REQ-18's prose.

4. **Missing Open Question: email uniqueness case-sensitivity/normalization.** §3.2
   says email must be unique but doesn't say whether comparison is case-sensitive
   (e.g., is `Test@x.com` a duplicate of `test@x.com`?) or whether the email is
   normalized before the uniqueness check. Not captured anywhere in the current
   artifact.

5. **Missing Open Question: whitespace/trimming behavior.** The FR doesn't say
   whether leading/trailing whitespace on Full Name or Email is trimmed before
   validation. This affects what "must not be empty" means for Full Name (e.g., is
   a string of only spaces empty?) and isn't currently flagged despite touching two
   existing REQs (REQ-01, REQ-05).

6. **Missing Open Question: is the special-character set exclusive or just a
   minimum-inclusion rule?** §3.3 says the password must contain "at least 1 special
   character from the set `@ $ ! % * ? &`" - it doesn't say whether a character
   outside letters+digits+that set (e.g., `#`, a space, a Unicode symbol) is simply
   ignored, tolerated as an extra character, or causes outright rejection. This is a
   real ambiguity that isn't captured under OQ-05 (which only covers ASCII vs.
   Unicode for upper/lower/digit, not the special-character set, and not the
   "exclusive set" question at all).

7. **Missing Open Question: validation error precedence when multiple rules are
   violated at once.** The FR never states which error is surfaced when a single
   request violates more than one rule simultaneously (e.g., invalid email format
   AND weak password in the same submission). This matters directly for Phase 3,
   since the domain-test-design rule "never combine two invalid conditions in one
   test case" implicitly assumes a single-fault model that the FR doesn't confirm.

8. **Testability gap not flagged for REQ-15.** REQ-15 ("redirected to Login page")
   is a UI-navigation behavior, but the only interface the FR actually specifies is
   the JSON API (REQ-16/REQ-17), whose success response has no redirect/navigation
   field. Nothing in the artifact currently notes that REQ-15 may not be verifiable
   through API-level test cases alone and may need a separate UI-level test design
   pass.

9. **OQ-04 is narrower than it should be.** It only asks about whitespace-only Full
   Name values; it doesn't ask whether Full Name permits digits, symbols, or is
   effectively unconstrained beyond non-empty. Worth broadening rather than leaving
   as a whitespace-only question.

10. **Minor: no open question about the special-character set's character encoding.**
    OQ-05 asks about ASCII-vs-Unicode for uppercase/lowercase/digit classification
    but doesn't ask the analogous question for the 7 special characters (e.g., could
    a visually similar Unicode punctuation mark be miscounted as one of them). Low
    priority but inconsistent with how OQ-05 treats the other character classes.

## 2026-07-05 - Disposition of Phase 1 self-critique

Reviewed with the user. Items 1, 4, 5, 6, 7, 8, 9 applied to
`output/01_Requirements_Breakdown.md`, plus two additional Open Questions found on
cross-check (email "valid format" precision; empty-string vs. absent-field
equivalence for API testing). Items 2, 3, 10 are **deferred** - not applied yet,
kept here for a later pass (e.g., during Phase 2 when output equivalence classes
and password character-set classes are drawn in detail).

**Correction to item 1:** on re-checking the source text while applying the fix,
item 1's premise was partially wrong. §4 Inputs Summary *does* explicitly mark
Confirm Password as "Required" - so "must be provided/required" is not an unstated
inference, it's a second explicit citation (§4) merged with the §3.1 "must be
present" citation into one REQ-04. Corrected: REQ-04 now cites both §3.1 and §4
directly (no invented fact), and a new ASM-03 was added instead to capture the
genuinely unstated part - that REQ-04's "required" clause may only be verifiable
at the UI/form level, since the API request body has no `confirmPassword` field
to omit for an API-level test.

## 2026-07-05 - Phase 2 self-critique

Re-reading `output/02_Equivalence_Partitioning.md` against the EP heuristics before
approval. Findings only - nothing fixed yet.

1. **Wrong partitioning guideline for password length (EC-18).** REQ-07 ("minimum 8
   characters") is a RANGE / NUMBER-OF-VALUES condition - guideline (a)/(b) - but I
   modeled it as a single "must-be-X"-style invalid class ("< 8 chars"). Guideline
   (a) would frame it as one valid class (len ≥ 8) and an invalid class bounded on
   the low side, which also makes the lower boundary explicit for Phase 4. As
   written, EC-18's class is open-ended downward and blurs into the empty class.

2. **Overlapping partitions - EC-16 ⊆ EC-18 (contradicts my own self-check).** An
   empty password (EC-16, length 0) is also a member of "fewer than 8 characters"
   (EC-18). The two partitions overlap, so a length-0 value is classifiable into two
   classes at once - exactly the "overlapping partitions" mistake the heuristics warn
   against. EC-18 should be bounded as `1 ≤ len ≤ 7` to be disjoint from the empty
   class. My §5 self-check line "No overlapping partitions … at exactly 8" was
   therefore overstated/wrong - it only checked the upper edge of the valid range,
   not the empty-vs-short overlap at the low end.

3. **Inconsistent empty-vs-absent handling across fields.** Full Name, Email, and
   Password each split "empty string" from "absent field" into two classes
   (EC-02/03, EC-06/07, EC-16/17), all flagged as possibly collapsing per OQ-12. But
   Confirm Password (EC-26) merges "absent / empty" into a single class. The same
   OQ-12 ambiguity is treated two different ways within one artifact - either all
   four fields should split-pending-OQ-12 or all should merge, consistently.

4. **Output side conflates "missing field" with "present-but-empty."** EC-29 is
   labeled "Missing required field," yet I route present-but-empty-string inputs
   (EC-02, EC-06, EC-16) into it. An empty-string value is not literally a *missing*
   field; if the system distinguishes them (the input-side OQ-12 question), there may
   be a distinct "empty/blank field" rejection output class separate from EC-29. The
   OQ-12 ambiguity is captured on the input side but not mirrored on the output side.

5. **EC-27 still merges two distinct output facts.** Success bundles the exact
   message string and the numeric `id` into one class. This is the Phase-1-deferred
   item 2, and I flagged it, but strictly it remains a merged output class - "`id` is
   present and numeric" is a separable output assertion that currently has no class of
   its own and could go untested in Phase 3.

6. **Possibly missed output class: malformed / non-JSON request.** There is no class
   for a structurally invalid request (invalid JSON, wrong content-type, non-object
   body). It may be out of FR scope, but it isn't even noted as a deliberate
   exclusion - worth a one-line decision rather than silent omission.

7. **EC-25 (password mismatch) may hide sub-classes under guideline (e).** If the
   implementation trims or normalizes before comparing Password to Confirm Password,
   "wholly different" vs "differs only by trailing whitespace" vs "differs only by
   case" would not be handled identically. Currently a single invalid class with no
   flag; guideline (e) suggests at least noting the possible split (and it has no
   backing implementation to confirm uniform handling).

8. **EC-12 may be a second VALID class collapsed into "Ambiguous," not just an
   ambiguous invalid.** Subdomain/plus-addressing emails, if accepted, would be a
   distinct valid-format partition of Email (valid emails are not necessarily handled
   uniformly - guideline (e)), not merely an unresolved accept/reject. Framing it only
   as "Ambiguous → EC-27 or EC-30" understates that the *valid* side of Email may
   itself need more than the single EC-05 class.

9. **Minor / cosmetic.** Ambiguous-output ordering is written inconsistently
   ("EC-30 or EC-27" for EC-11 vs "EC-27 or EC-30" for EC-12); harmless but
   inconsistent. Also, the backward-trace table calls success coverage "Partial"
   while §5 self-check does not carry that caveat forward - the two summaries are
   slightly out of step.

## 2026-07-05 - Disposition of Phase 2 self-critique

Reviewed with the user. **Applied** to `output/02_Equivalence_Partitioning.md`:
- Item 1 - EC-18 (password length) reclassified under **guideline (a) RANGE**
  (measurable length), explicitly not (b) number-of-values; valid class kept
  open-ended above (`len ≥ 8`, no invented max - OQ-03).
- Item 2 - EC-18 rebounded to `1 ≤ len ≤ 7` so it no longer overlaps EC-16 (empty,
  `len = 0`); §5 self-check corrected to state the prior "no overlapping partitions"
  tick was wrong (only checked the upper edge) and what was fixed.
- Item 3 - Confirm Password split into EC-26 (empty) and new **EC-34** (absent),
  consistent with the other three fields, both flagged with OQ-12. EC-34 appended
  after the output block with an explicit numbering note to avoid renumbering.
- Item 4 - output EC-29 relabeled "Missing **or** empty required field" with an
  explicit note that absent-vs-empty are merged on purpose pending OQ-12/OQ-02
  (identical expected results today); EC-34 added to its trace.
- Item 6 - malformed / non-JSON request added as a **deliberate exclusion** note in
  §2 plus new **OQ-13**, rather than inventing an unspecified response class.

**Deferred** (logged here, not applied - reasons below):
- Item 5 - split EC-27 success into separate message-string and numeric-`id` output
  classes. *Reason:* this is the same split already deferred from Phase 1 (gap_notes
  item 2); keeping the deferral consistent. It is now honestly recorded as "Partial"
  in both the §3 backward-trace and the §5 self-check, so it is visible rather than
  hidden. Revisit alongside Phase 1 item 2.
- Item 7 - split EC-25 (password mismatch) into guideline-(e) sub-classes
  (wholly-different vs whitespace-only vs case-only difference). *Reason:* the split
  hinges on whether the implementation trims/normalizes before comparing, and there
  is **no backend in the repo** to confirm non-uniform handling; splitting now would
  invent structure. Better resolved when an implementation or an answer to the
  trimming question (relates to OQ-10) is available.
- Item 8 - treat EC-12 (subdomain/plus-addressing email) as a possible second
  *valid* Email class rather than only "Ambiguous." *Reason:* depends on OQ-11
  (what counts as valid email format); until that resolves, its valid-vs-invalid
  status is genuinely unknown, so promoting it to a valid class now would pre-judge
  the open question. Re-evaluate when OQ-11 is answered.
- Item 9 - cosmetic ambiguous-output ordering inconsistency ("EC-30 or EC-27" vs
  "EC-27 or EC-30"). *Reason:* purely presentational, no effect on classes or
  traceability; not worth a revision cycle now. (The §3-vs-§5 "Partial" mismatch part
  of item 9 *was* fixed as part of item 5's honest recording.)

## 2026-07-06 - Phase 3 self-critique

Re-reading `output/03_Domain_Test_Cases.md` against the domain-test selection rule and
the five questions posed. Findings only - nothing fixed yet. Organized by the question
asked.

**Q1 - Did any test case combine two invalid conditions (single-fault violation)? YES.**

1. **Password-deviation probes each carry a hidden second fault (password mismatch).**
   The D-4 baseline pins Confirm Password to the *literal* `Password123!`, and D-5
   step 5 tells the tester to enter that Confirm value. But every probe that changes
   the **Password** field leaves Confirm at `Password123!`, so Confirm no longer equals
   the Password under test - a second invalid condition (EC-25 mismatch) rides along
   with the intended password fault. Affected: **TC-10** (password empty), **TC-12**
   (too short - Confirm `Password123!` ≠ `Pass1!`), **TC-13**, **TC-14**, **TC-15**,
   **TC-16**, and **TC-22** (conditional). Each of these tests two invalid conditions
   at once, so a failure can't be attributed cleanly - exactly the single-fault
   violation the rule forbids. Root cause: D-4 fixes Confirm to a constant instead of
   defining it as "equal to whatever Password value the test uses." (TC-11 is
   unaffected - it's API-level, where there is no Confirm field.)

2. **The §7 self-check falsely ticked this.** Line "Selection rule applied exactly …
   no test case combines two invalid conditions" is now demonstrably wrong for the
   TC-10/12-16/22 set - same class of over-confident self-check tick as the Phase 2
   overlap issue. Should not have passed.

**Q2 - Did I over-split the valid classes instead of bundling? NO (passes).**
3. The four valid input classes (EC-01/05/15/24) are bundled into the single TC-01,
   as the rule requires - no over-splitting. *However*, see finding 5: TC-01 may need
   to become **two** cases for a different reason (cross-interface observability), not
   because the valid classes were wrongly split.

**Q3 - Any EC without a covering test case or explicit deferral? NO (passes).**
4. Every input class EC-01..EC-26 maps to a TC and every output class EC-27..EC-33 is
   covered (§5); EC-34 is the single, explicitly-documented deferral. No silent drops.
   One *matrix* nit (not a coverage gap): §5 maps EC-26 → EC-29 only, but the TC-23
   prose admits an empty Confirm is simultaneously a mismatch (EC-33); the matrix
   doesn't reflect that second possible output.

**Q4 - Any invented message/status the FR doesn't specify? NO (passes).**
5. Rejection expected results stay at the OQ-02 level ("rejected with a validation
   error for <category>"), and the only concrete assertions (success message
   `User registered successfully`, numeric `id`, redirect) are FR-specified
   (REQ-15/16). Nothing invented. *But* there is a level-fidelity problem with how the
   success assertion is placed - see Q5 finding 6.

**Q5 - Is the D-2 UI-vs-API split defensible, or did a class fall through a gap?**

6. **TC-01 mixes two interface levels in one expected result.** It asserts both the
   redirect (UI-observable, REQ-15) and the exact API JSON `{ message, id }`
   (API-observable, REQ-16) in a single **UI-level** test - but a UI form test cannot
   directly observe the API response body. The two observables belong to two
   interfaces; bundling them into one UI case means one of them can't actually be
   checked as written. This suggests TC-01 should split into a UI valid case (asserts
   redirect) and an API valid case (asserts `{message,id}`) - i.e. "as few as
   possible" across two interfaces is legitimately **two**, not one.

7. **EC-27's API success body is never actually exercised at the API level.** As a
   consequence of finding 6, no test drives `POST /api/register` on the happy path and
   inspects its `{message,id}` 200 response; EC-27 is only "covered" inside a UI test
   where that body isn't visible. This is a genuine coverage gap hiding behind a
   green matrix cell.

8. **A single requirement's required-ness is verified at two different layers.** Field
   presence is tested as "empty" at the UI (TC-02/04/10) but as "absent" at the API
   (TC-03/05/11). Defensible given OQ-12 (empty ≠ absent) and the interface realities,
   but no single interface fully verifies any one field's required-ness, and D-2
   doesn't flag that coherence risk. Worth an explicit note that the two halves are
   complementary, not redundant.

9. **Minor.** TC-23 expected result hedges "(or password-mismatch)" which - combined
   with finding 1 - hints the artifact half-knows Confirm-vs-Password entanglement
   exists but only surfaced it for the empty-Confirm case, not for the
   password-deviation probes where it actually breaks single-fault isolation.

## 2026-07-06 - Disposition of Phase 3 self-critique

Reviewed with the user. **Applied** to `output/03_Domain_Test_Cases.md`:
- Finding 1 (the important one) - D-4 changed from a constant Confirm Password
  value to a relational rule: Confirm Password always equals whatever value Password
  holds in that test case. TC-12, TC-13, TC-14, TC-15, TC-16, and TC-22 updated so
  Confirm Password is now the same (deviated) value as Password - the EC-25 mismatch
  fault no longer rides along, and each of these six probes is now genuinely
  single-fault.
- **TC-10 could not be fully resolved by the same mechanical fix - flagged, not
  silently claimed clean.** Setting Confirm="" to match Password="" removes the EC-25
  mismatch, but Confirm="" independently trips its own required-ness rule (EC-26,
  REQ-04) - there is no Confirm value that avoids a second invalid condition once
  Password is empty (any non-empty Confirm creates a mismatch instead). This is a
  structural entanglement between REQ-03 (password required) and REQ-04 (confirm
  required), not an oversight in applying the fix, and it is now stated inline on
  TC-10 and in the §7 self-check rather than presented as resolved. If REQ-03's
  enforcement is broken in the implementation while REQ-04's is not, TC-10 could still
  show "rejected" and falsely look like it passed - worth keeping in mind if this
  suite is ever run against a real backend.
- Finding 2 - §7 self-check corrected: the line is no longer a blind pass. It now
  states plainly that the prior "no test case combines two invalid conditions" tick
  was wrong, names which six TCs were affected and why, confirms the fix for those
  six, and separately flags TC-10 as an unresolved partial exception (a new
  self-check line was also added specifically for this).
- Findings 6 & 7 - TC-01 split into **TC-01a** (UI-level: form submit, asserts
  redirect to Login, REQ-15/EC-28) and **TC-01b** (API-level: `POST /api/register`,
  asserts `{message, id}`, REQ-16/EC-27). EC-27's success body is now actually
  exercised at the API level instead of only asserted inside a UI test. IDs kept as
  TC-01a/TC-01b rather than renumbering every subsequent TC.
- Finding 3 - §5 matrix now maps EC-26 to **both** EC-29 and EC-33, matching TC-23's
  own hedge (an empty Confirm is simultaneously a required-field violation and a
  non-match).
- Finding 9 - the "(or password-mismatch)" hedge removed from TC-23's expected-result
  prose; the dual classification now lives explicitly in the §5 mapping (finding 3)
  instead of being narrated inline.

**Deferred** (logged here, not applied - reason below):
- Finding 8 - noted as a **coherence risk**, not resolved: no single interface fully
  verifies any one field's required-ness (empty tested at UI, absent tested at API).
  This is defensible given OQ-12 (empty ≠ absent is itself unresolved) and the
  interface realities (a rendered UI field can't be omitted; the documented API body
  has no shape for "blank-but-present" the way a form does), but it means REQ-01/
  REQ-02/REQ-03's "required" clause is only ever exercised as two separate halves,
  never as a single unified check. Revisit once OQ-12 resolves - if empty and absent
  turn out to have different expected results, the two halves may need to become
  genuinely parallel probes at *both* interfaces rather than one probe per interface.

## 2026-07-06 - TC-10 mislabeling correction

AI initially mislabeled TC-10 as an "Isolated invalid probe" for EC-16 alone, with a
footnoted admission that it couldn't actually achieve isolation (Confirm="" also
trips EC-26). That framing understated the problem: it kept claiming the standard
single-fault label while confessing the label didn't fit, instead of just using the
right label. Correction, per the user's direction: TC-10 is now explicitly re-scoped
as a **Combined probe (EC-16 + EC-26 - shared root cause)**, stated as exempt from
the single-fault isolation rule because both classes trace to one root cause (an
empty-form submission), not two independent faults. The fix was **relabeling +
dual-assertion** (the expected result now requires both a password-required and a
confirm-required signal, with divergence routed to new OQ-14) - not forcing a false
isolation that was never structurally achievable. Propagated to TC-10's row, §5
(EC-16/EC-26 entries), §7 self-check, and §8 counts.

## 2026-07-06 - Phase 4 self-critique

Re-reading `output/04_Boundary_Value_Test_Cases.md` against the six questions posed.
Findings only - nothing fixed yet.

**Q1 - Did BVA get applied to a field that isn't actually an ordered numeric domain?**

1. **Inconsistent scope reasoning between Full Name and Password composition counts.**
   §0 excludes Password's "≥1 uppercase/lowercase/digit" rules from BVA on the
   grounds that "Phase 2 modeled these as discrete must-be-X presence/absence
   classes (guideline d), not as ordered `min..max` ranges." But Phase 2 modeled
   Full Name's "must not be empty" the **exact same way** - EC-01/EC-02 in
   `02_Equivalence_Partitioning.md` are framed as "Present, non-empty" vs. "Empty
   string value," guideline-(d) style, not as an explicit numeric range either. Yet
   §2 of this artifact treats Full Name as boundary-sensitive (`minLen = 1`) while
   §0 treats the structurally identical password-composition case as out of scope.
   Both are really "count of qualifying characters ≥ threshold" (all characters, for
   Full Name; characters of a given class, for Password). Either both deserved BVA
   treatment or neither did - the artifact currently applies the technique
   asymmetrically to two classes Phase 2 modeled identically.

2. **A related, more significant omission: the Password length boundary set is
   incomplete.** Phase 2 (after its own self-critique) established **three** distinct
   Password-length classes, not two: EC-16 (empty, length 0, → output EC-29
   "missing/empty field"), EC-18 (too short, length 1-7, → output EC-32 "weak
   password"), and EC-15 (valid, length ≥ 8). That means there are **two** class
   boundaries on Password length, not one: 0|1 (EC-16/EC-18) and 7|8 (EC-18/EC-15).
   This artifact only analyzes the second (§1, BVA-01..03) and never mentions the
   first at all. The 0|1 boundary is not a throwaway case, either - it is exactly
   the same overlap-prone boundary that Phase 2's own self-critique fixed (EC-16 vs.
   EC-18 used to overlap at length 0), and the two classes route to **different
   output classes** (EC-29 vs. EC-32), so confirming the system tells them apart at
   exactly this transition has real fault-detection value that was skipped.

**Q2 - Did I fabricate any boundary value the FR doesn't support (especially a
max-side bound)? No fabrication found.**
3. Checked §1 and §2: both explicitly state "Not generated - open-ended upper
   bound, OQ-03" and no numeric max value appears anywhere in the artifact. This
   check passes.

**Q3 - Is the step value correct for each field's data type?**
4. String length → step = 1 character is correct per the skill's precision table,
   and both fields use it correctly. Minor observation, not a defect: all
   representative strings used are plain ASCII, so "1 character" is unambiguous;
   the artifact doesn't note that "character" itself would need a more careful
   definition if multi-byte/Unicode input were ever used (relates to existing OQ-05,
   not a new gap, just an unstated connection).

**Q4 - Is the Full Name implicit minimum derivation defensible, or invented?**
5. The `minLen = 1` derivation from "must not be empty" is logically sound on its
   own, but see finding 1 - it wasn't applied under the same rule Phase 2 actually
   used to classify the requirement, so "defensible in isolation" and "consistently
   applied" are two different questions, and only the first is actually true here.
6. **The derivation also silently assumes "empty" means exactly zero characters**,
   with no connection drawn to the still-open whitespace-only question (OQ-04/OQ-10,
   EC-04 "Ambiguous"). If the real validation trims whitespace before checking
   emptiness, a whitespace-only string could behave like the empty class regardless
   of its raw character count, which would mean the *true* boundary isn't cleanly
   at length 0 vs. 1 the way this artifact assumes. The artifact doesn't mention
   this connection or flag it as a caveat on the derivation.

**Q5 - Did any boundary point duplicate a Phase 3 TC without cross-referencing it?**
7. Checked BVA-01..05 against all Phase 3 TC input values (Password/Full Name
   values in TC-01a/b, TC-02, TC-10, TC-12, TC-18): no accidental duplicates found.
   The one genuine overlap (Full Name length 0) was correctly cross-referenced to
   TC-02 rather than duplicated. This check passes - **except** that finding 2 above
   means an *additional* boundary (Password length 0, already exercised by
   TC-10/TC-11) exists that should also have been cross-referenced here and wasn't,
   because that boundary was never identified as in-scope in the first place.

**Q6 - Confirm Password value in each BVA case - does the D-4 fix hold?**
8. Checked BVA-01/02/03: Confirm Password is set equal to the Password value under
   test in every row (`Pa1!abc`/`Pa1!abc`, `Pa1!abcd`/`Pa1!abcd`,
   `Pa1!abcde`/`Pa1!abcde`). The D-4 fix holds cleanly - no violation found.

**Additional finding (not one of the six questions, found while checking Q1/Q6):**
9. **BVA-01's "error-type-2" illustration is logically self-contradictory.** Its
   note says the boundary "exposes an implementation using `<= 7` as the invalid
   cutoff instead of `< 8`" - but for integer lengths, `length <= 7` and
   `length < 8` denote the *identical* set of values. Contrasting them as if they
   were two different possible specifications doesn't illustrate a real
   inequality-mis-specification bug; a correct example would contrast `< 8`
   (correct) against something actually different, e.g. `<= 8` (would wrongly
   reject exactly 8 too) or `< 7` (would wrongly accept exactly 7). BVA-02's
   parallel note ("`>= 8` vs `> 8`/`<= 8`") does not have this problem - only
   BVA-01's phrasing does.

## 2026-07-06 - Disposition of Phase 4 self-critique

Reviewed with the user. **Applied** to `output/04_Boundary_Value_Test_Cases.md`:
- Finding 2 (the important one) - added new §1b, "EC-18 Ceiling Boundary" renamed
  §1a for the original 7/8/9 set. §1b covers the previously-missed EC-16/EC-18 floor:
  `min − step = 0` (empty, cross-referenced to Phase 3 TC-10, not duplicated),
  `min = 1` (new **BVA-06**, the critical value - must route to EC-32 not EC-29),
  `min + step = 2` (new **BVA-07**). While implementing, found and flagged an
  additional wrinkle not in the original finding: at length 1-2 the password cannot
  satisfy all composition rules (needs ≥4 chars), so BVA-06/07 necessarily entangle
  the length fault with extra composition faults. Documented as an explicit
  isolation caveat on both rows and in a new §4 Technique Limitations bullet, rather
  than silently presented as clean single-fault probes like BVA-01/02/03.
- Finding 1 - §0's Password-composition-count row and §2 (Full Name) both now state
  the distinction explicitly: Full Name's "must not be empty" is a length threshold
  once unpacked (0 vs. ≥1 characters, nothing else asserted), while "at least 1
  uppercase" is a content claim already fully tested by Phase 3's presence/absence
  probe (TC-13) - treating "1 vs. 2 occurrences" as a boundary would invent a
  numeric-count reading the FR doesn't support. Full Name's BVA cases were kept, not
  removed, per the user's instruction.
- Finding 9 - BVA-01's illustration corrected: no longer contrasts `<= 7` vs. `< 8`
  (identical for integers); now correctly pairs BVA-01 (7, rejected) with BVA-02 (8,
  accepted) to expose a `<= 8` (wrongly rejects 8) or `< 7` (wrongly accepts 7)
  mis-specification.
- Finding 6 - §2 now has an explicit paragraph linking the `minLen = 1` derivation to
  OQ-04/OQ-10: if the system trims whitespace before checking emptiness, the real
  boundary may not sit at 0 vs. 1 the way BVA-04/BVA-05 assume. Also added as a row
  in §5's Open Questions table.

§6 self-check re-run honestly: two lines rewritten to state what was wrong and what
changed (the incomplete Password boundary set, the BVA-01 illustration), and one new
line left **unticked** - "every boundary test case isolates exactly one invalid
condition" - Partial, because BVA-06/BVA-07 cannot achieve that by construction, not
because of a fixable oversight.
