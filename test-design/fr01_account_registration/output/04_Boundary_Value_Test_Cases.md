# FR-01: Account Registration - Boundary Value Test Cases (Phase 4)

Input artifacts: `output/02_Equivalence_Partitioning.md` (Phase 2, APPROVED),
`output/03_Domain_Test_Cases.md` (Phase 3, APPROVED).
Reference applied: `references/boundary_value_heuristics.md` (Kaner & Bach domain-testing
method).

**Continuity note:** boundary test cases for Password reuse Phase 3's corrected D-4
rule (`output/03_Domain_Test_Cases.md`, §0) - Confirm Password is always set equal to
whatever value Password holds in the test case, never a fixed constant, so no boundary
probe on Password accidentally introduces a second fault (mismatch, EC-25).

---

## 0. Scope Determination - Which Fields Are Boundary-Sensitive

Boundary Value Analysis only applies to **ordered** domains with a stated (or clearly
implied) numeric threshold. Every field/dimension from Phase 2 is evaluated below so
the scope decision is auditable - fields excluded are excluded by explicit reasoning,
not omission.

| Field / Dimension | REQ | Phase 2 EC(s) | Ordered range? | BVA Applicable? | Reasoning |
| --- | --- | --- | --- | --- | --- |
| Full Name - non-empty | REQ-01 | EC-01, EC-02 | Yes - implicit `minLen = 1` | **Yes** | "Must not be empty" logically implies a floor of 1 character even though the FR never states the number "1" - see §2 for the explicit derivation, and the note there distinguishing this from the Password-composition exclusion below (both were modeled the same way in Phase 2, but only one has a clean numeric floor to test). |
| Full Name - maximum length | REQ-01 | - | Unknown | No | FR states no maximum length. Already flagged as **OQ-03**. Per skill: do not invent the other bound. |
| Email - presence | REQ-02 | EC-06, EC-07 | No (discrete) | No | Present/absent is a binary condition, not an ordered length threshold. Already fully covered by Phase 3 (TC-04, TC-05). |
| Email - format validity | REQ-05 | EC-08-EC-12 | No (discrete/structural) | No | Malformation patterns (missing `@`, missing domain, etc.) are discrete structural presence/absence conditions, not an ordered numeric domain - per skill, boundary analysis does not apply to unordered/structural conditions. |
| Email - length | REQ-05 | - | Unknown | No | FR states no minimum or maximum email length at all. Already covered by **OQ-03**; no new Open Question needed, and no bound is fabricated. |
| Email - uniqueness | REQ-06 | EC-13, EC-14 | No (discrete) | No | Duplicate vs. unique is a binary condition, not an ordered range. |
| Password - length | REQ-07 | EC-15, EC-18 | Yes - explicit `min = 8`, max open-ended | **Yes** | Explicit numeric minimum stated in the FR - the clearest boundary-sensitive field in this FR. See §1. |
| Password - uppercase/lowercase/digit count (≥1 each) | REQ-08-REQ-10 | EC-19, EC-20, EC-21 | Not modeled as a range in Phase 2 | **No - deliberate scope decision** | Phase 2 modeled these as discrete must-be-X presence/absence classes (EP guideline d: "satisfies X" vs "does not satisfy X"), not as ordered `min..max` ranges. Treating "count of qualifying characters" as its own boundary-testable range would introduce new equivalence structure beyond what Phase 2 approved. Phase 3's isolated probes (TC-13/TC-14/TC-15) already directly and fully test the 0-occurrence invalid case per rule (presence vs. absence is a complete test of the requirement as stated); extending to explicit 1-vs-2-occurrence boundary testing would be inventing a numeric-count interpretation of "at least 1" that Phase 2 never adopted, not filling a real coverage gap. This is the same underlying pattern as Full Name's "must not be empty" above - the distinction that keeps Full Name in scope and this out is stated explicitly in §2. |
| Password - special-character set membership | REQ-11 | EC-22, EC-23 | No (unordered enum) | No | The set `@ $ ! % * ? &` is an unordered discrete set. Per skill: boundary analysis does not apply to unordered enums. |
| Confirm Password - match | REQ-13 | EC-24, EC-25 | No (discrete equality) | No | Match/mismatch is a binary equality condition, not an ordered range. |
| Confirm Password - presence | REQ-04 | EC-26, EC-34 | No (discrete) | No | Same reasoning as Email presence. |
| Output classes | EC-27-EC-33 | - | No | No | Discrete outcome states (success / one of five rejection categories) - this FR has no numeric output range (e.g. no balance or computed price) for BVA to apply to. |

**Result: exactly two boundary-sensitive fields carried forward into this artifact -
Password length (REQ-07, §1a/§1b - two edges, since Phase 2 defines three length
classes for this field) and Full Name's implicit minimum length (REQ-01, §2).**
Every other field is excluded above with a stated reason (§3 collects these as an
explicit non-fabrication log).

---

## 1. Password Length Boundaries (REQ-07 / EC-15, EC-16, EC-18)

Password length has **two** boundary-worthy edges, not one - see §1b for why the
second edge was added after self-critique.

### 1a. EC-18 Ceiling Boundary (too-short vs. valid) - EC-18 / EC-15

**Precision and step (stated before computing, per skill requirement):** Password is
a string; its length constraint ("minimum length of 8 characters," §3.3 of the FR) is
measured in whole characters. There is no sub-character unit for a string-length
constraint, so **precision = 1 character** and **step = 1 character** (per the skill's
String-length boundary row).

**Bound determination:** Minimum = **8**, stated explicitly in REQ-07. Maximum =
**open-ended** - the FR states no maximum password length, and Phase 1 already flags
this gap as **OQ-03**. Per the skill's open-ended-bound guidance, only the
minimum-side boundaries are generated below; the maximum side is not fabricated.

| Boundary Point | Value (chars) | Classification | EC | REQ | Already covered? |
| --- | --- | --- | --- | --- | --- |
| min − step | 7 | Invalid | EC-18 | REQ-07 | No - new (**BVA-01**). Phase 3's TC-12 used a 6-char representative for EC-18, an interior value, not this exact boundary. |
| min | 8 | Valid | EC-15 | REQ-07 | No - new (**BVA-02**). Phase 3's TC-01a/TC-01b used a 12-char password, interior valid, not this exact boundary. |
| min + step | 9 | Valid | EC-15 | REQ-07 | No - new (**BVA-03**). |
| max − step / max / max + step | - | - | - | - | **Not generated - open-ended upper bound, OQ-03.** |

| BVA ID | Boundary Point | EC / REQ | Level | Input (all other fields at Phase 3 D-4 baseline unless noted) | Expected Result |
| --- | --- | --- | --- | --- | --- |
| BVA-01 | min − step (7 chars) | EC-18 / REQ-07 | UI form | Password = `Pa1!abc` (exactly 7 characters; contains ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char from the set - every other composition rule is satisfied so length is the *only* varying condition, per the Phase 3 D-4 single-fault rule); Confirm Password = `Pa1!abc` (same value) | Registration rejected - weak password, too short (→ EC-32). Exact text/code unspecified - OQ-02. **This is the error-type-2 case**: the real risk is a length check mis-specified as `<= 8` (which would wrongly treat exactly 8 characters as too-short, rejecting a valid password) - BVA-01 (7 chars) together with BVA-02 (8 chars) is what exposes that specific bug, since BVA-01 alone only confirms 7 is correctly rejected. |
| BVA-02 | min (8 chars) | EC-15 / REQ-07 | UI form | Password = `Pa1!abcd` (exactly 8 characters; same composition pattern as BVA-01 plus one more lowercase letter); Confirm Password = `Pa1!abcd` (same value) | Registration succeeds - the system must **not** reject this length (→ confirms EC-15's floor is inclusive of 8, consistent with REQ-07 "minimum length of 8"). **This is the paired error-type-2 case to BVA-01**: together they confirm the boundary sits exactly at 8, catching both possible mis-specifications - `<= 8` (would wrongly reject this 8-char password as too-short) and `< 7` (would wrongly accept a 7-char password as valid, which BVA-01 independently catches). Full success-response/redirect assertions are already covered by Phase 3 TC-01a/TC-01b; this case only needs to confirm acceptance at the exact boundary. |
| BVA-03 | min + step (9 chars) | EC-15 / REQ-07 | UI form | Password = `Pa1!abcde` (exactly 9 characters); Confirm Password = `Pa1!abcde` (same value) | Registration succeeds - confirms the valid class holds just above the boundary, not only exactly at it (guards against a transposition-style error, error type 3, that a single boundary probe alone might miss). |

### 1b. The Other Password-Length Boundary: EC-16 / EC-18 (empty vs. too-short)

**This boundary was missed in the first draft of this artifact and is added here
after self-critique (see `gap_notes.md`, Phase 4 self-critique finding 2).** Phase 2
(after its own overlap-fixing self-critique) defined **three**, not two, Password
length classes: EC-16 (empty, length 0, → output EC-29 "missing/empty field"),
EC-18 (too short, `1 ≤ len ≤ 7`, → output EC-32 "weak password"), and EC-15 (valid,
`len ≥ 8`). EC-18 is itself a bounded range with **two** edges - its ceiling
(bordering EC-15, tested above as BVA-01) and its **floor** (bordering EC-16, not
yet tested). The floor deserves its own boundary treatment for the same reason the
ceiling does: EC-16 and EC-18 route to **different output classes** (EC-29 vs.
EC-32), so confirming the system distinguishes "no password at all" from "a password
that's present but too short" at exactly this transition has independent
fault-detection value. Same precision/step as §1a: 1 character.

| Boundary Point | Value (chars) | Classification | EC | REQ | Already covered? |
| --- | --- | --- | --- | --- | --- |
| min − step | 0 (empty string) | Invalid | EC-16 | REQ-03 | **Yes - Phase 3 TC-10** already uses `Password = ""`, which *is* this exact boundary value. No new test case generated; cross-referenced only (same treatment as Full Name's empty boundary in §2). |
| min | 1 | Invalid | EC-18 | REQ-07 | No - new (**BVA-06**). **This is the critical value**: it is the first length above the EC-16/EC-18 class boundary, and it must route to EC-32 (weak password), not EC-29 (missing field) - a distinct expected result from its neighbor at 0. |
| min + step | 2 | Invalid | EC-18 | REQ-07 | No - new (**BVA-07**). Still inside EC-18's invalid range; confirms the class holds just above its own floor, not only exactly at it. |

| BVA ID | Boundary Point | EC / REQ | Level | Input (all other fields at Phase 3 D-4 baseline unless noted) | Expected Result |
| --- | --- | --- | --- | --- | --- |
| BVA-06 | EC-18 floor (1 char) | EC-18 / REQ-07 | UI form | Password = `P` (exactly 1 character); Confirm Password = `P` (same value, per Phase 3 D-4). **Isolation caveat:** unlike BVA-01/02/03, a 1-character string cannot simultaneously satisfy the uppercase/lowercase/digit/special composition rules (that requires ≥4 characters), so this value necessarily also fails EC-20 (no lowercase letter), EC-21 (no digit), and EC-22 (no special char) alongside the intended length fault (it does satisfy EC-19's uppercase requirement, since `P` is uppercase). This is not fixable by choosing a different 1-character value - it is a structural consequence of testing this exact boundary, similar in kind to Phase 3's TC-10 entanglement. It does **not** create expected-result ambiguity here, because every one of those extra faults still routes to the same output class as the intended one (EC-32, "weak password") - unlike TC-10, where the two entangled faults routed to different output classes. | Registration rejected - **weak password, too short** (→ EC-32), **not** "missing/empty required field" (EC-29). This is the error-type-2 case for this boundary: a check that mis-specifies "empty" as, e.g., "length ≤ 1" instead of "length == 0" would incorrectly route this value to EC-29 instead of EC-32 - a value like 4 or 5 characters would not expose that specific mistake. Exact text/code unspecified - OQ-02. |
| BVA-07 | EC-18 floor + step (2 chars) | EC-18 / REQ-07 | UI form | Password = `Pa` (exactly 2 characters); Confirm Password = `Pa` (same value). Same isolation caveat as BVA-06 - 2 characters (uppercase `P`, lowercase `a`) still cannot satisfy all composition rules, so this also fails EC-21 (no digit) and EC-22 (no special char) alongside the length fault, with the same "same output class" mitigation. | Registration rejected - weak password, too short (→ EC-32). Confirms EC-18 holds just above its own floor, not only exactly at it. |

---

## 2. Full Name Implicit Minimum-Length Boundary (REQ-01 / EC-01, EC-02)

**Precision and step (stated before computing, per skill requirement):** Full Name is
a string. The FR states only "must not be empty" (§3.1/§4) - it never writes a numeric
threshold. This is logically equivalent to an implicit floor of `minLen = 1`: an
empty string (0 characters) is invalid, and any string of 1 or more characters
satisfies "not empty." This derivation is stated explicitly here because, unlike
Password's REQ-07, it is **not a number written in the FR** - it is inferred from the
word "empty," which is why it is flagged distinctly from Password's boundary rather
than presented as equally explicit. Precision = 1 character, step = 1 character.

**Why this field is in scope while Password's composition counts (REQ-08-REQ-10) are
not, even though Phase 2 modeled both as guideline-(d) presence/absence classes:**
the two are not equivalent in what they measure. "Must not be empty" reduces to a
single, unambiguous numeric floor on Full Name's own **length** - 0 characters vs. 1
or more - where "0 vs. ≥1" is the entire content of the rule and nothing else is being
asserted. "At least 1 uppercase letter" is a claim about the **content** of the
password, not its length; Phase 3's TC-13 already fully tests the presence/absence of
that content ("has an uppercase letter" vs. "has none") with no residual boundary
left to probe, since the rule doesn't state or imply anything about *how many*
uppercase letters beyond "at least 1" - treating "1 vs. 2 occurrences" as its own
boundary would be inventing a numeric-count reading of "at least 1" that the FR
doesn't support and Phase 2 never adopted. Full Name's rule, by contrast, genuinely
is a length threshold once "empty" is unpacked, so the standard length-boundary
technique applies to it directly.

**Caveat linking this derivation to an existing Open Question:** this `minLen = 1`
derivation assumes "empty" means exactly zero raw characters. If the real
implementation trims whitespace before checking emptiness, a whitespace-only string
(e.g. `"   "`) would behave like the empty class regardless of its raw length - in
which case the true boundary would not sit cleanly at 0 vs. 1 character the way this
section assumes. This is not a new gap; it is the same ambiguity already tracked as
**OQ-04/OQ-10** (Phase 1/2/3) and EC-04 ("Ambiguous" - whitespace-only, tested
conditionally in Phase 3's TC-18). BVA-04/BVA-05 below assume the straightforward
raw-length reading; if OQ-04/OQ-10 resolve toward a trim-then-check behavior, this
derivation and its boundary values would need to be revisited.

**Bound determination:** Implicit minimum = **1** (derived above). Maximum: the FR
states no maximum length for Full Name - open-ended, already covered by **OQ-03**.
Only minimum-side boundaries are generated.

| Boundary Point | Value (chars) | Classification | EC | REQ | Already covered? |
| --- | --- | --- | --- | --- | --- |
| min − step | 0 (empty string) | Invalid | EC-02 | REQ-01 | **Yes - Phase 3 TC-02** already uses `Full Name = ""`, which *is* this exact boundary value. No new test case generated; cross-referenced only, to avoid a redundant duplicate. |
| min | 1 | Valid | EC-01 | REQ-01 | No - new (**BVA-04**). Phase 3's TC-01a/TC-01b used `"Nguyen Van A"` (12 characters), interior valid, not this boundary. |
| min + step | 2 | Valid | EC-01 | REQ-01 | No - new (**BVA-05**). |
| max − step / max / max + step | - | - | - | - | **Not generated - open-ended upper bound, OQ-03.** |

| BVA ID | Boundary Point | EC / REQ | Level | Input (all other fields at Phase 3 D-4 baseline) | Expected Result |
| --- | --- | --- | --- | --- | --- |
| BVA-04 | min (1 char) | EC-01 / REQ-01 | UI form | Full Name = `A` (exactly 1 character) | Registration succeeds - the system must **not** treat a single-character name as empty/invalid (→ confirms the implicit floor is inclusive of 1). This is the error-type-2 case for the empty-vs-non-empty inequality (e.g. a check that mis-specifies "empty" as "length ≤ 1" instead of "length == 0" would be caught here). |
| BVA-05 | min + step (2 chars) | EC-01 / REQ-01 | UI form | Full Name = `An` (exactly 2 characters) | Registration succeeds - confirms the valid class holds just above the boundary as well as exactly at it. |

---

## 3. Boundaries Not Generated (Explicit Non-Fabrication Log)

Per the skill's instruction not to invent bounds that aren't stated, the following are
recorded as deliberate exclusions (summarized from §0, restated here for a single
audit point):

- **Password / Full Name / Email - maximum length:** no maximum stated for any of the
  three in the FR. No `max − step / max / max + step` values were generated for any
  field in this artifact. Already tracked as **OQ-03**; not duplicated as a new OQ.
- **Email - minimum length:** no minimum length stated at all (only format validity).
  No boundary generated.
- **Password composition counts (uppercase/lowercase/digit, REQ-08-REQ-10):** not
  modeled as ranges in Phase 2 - see §0 table. Excluded by scope decision, not by
  oversight.
- **Password special-character set (REQ-11):** unordered enum - boundary analysis
  does not apply per the skill's explicit guidance on unordered enums.
- **Confirm Password (match and presence):** discrete equality/presence conditions,
  not ordered ranges.
- **Output classes:** discrete outcome states; no numeric output range exists in this
  FR for BVA to apply to.

---

## 4. Technique Limitations (stated per skill requirement)

Boundary Value Analysis and domain testing generally are strong at finding
high-probability errors with a small, targeted test set, but this suite has
documented blind spots the human reviewer should know about:

- **Interior errors are not covered.** An interior value handled incorrectly for
  reasons unrelated to range checks (e.g. a password that is 20 characters and
  triggers an unrelated bug) will not be caught by this boundary-focused selection -
  Phase 3's equivalence-class representatives provide the only interior-value
  coverage this suite has.
- **The real domain may not match the spec.** No backend implementation exists in
  this repository to cross-check (as already noted in Phase 2); if the real
  implementation partitions Password length or Full Name length differently than the
  FR implies, the boundaries computed here could be wrong. This is why BVA-01/BVA-02
  and BVA-04 are specifically valuable - they are the cases most likely to expose
  exactly that kind of discrepancy (error types 2 and 3).
- **Over-reliance on the same representative values.** BVA-01..BVA-03 and BVA-04/05
  reuse a small, fixed set of boundary strings. If this suite is rerun repeatedly for
  regression testing, consider varying the *non-boundary* characters in these
  representatives (e.g. different filler letters) so only the boundary-relevant
  property (length) stays fixed - this avoids over-testing one exact string while
  under-testing other equally-valid nearby values.
- **Single-fault isolation is not always achievable at extreme boundaries.** BVA-06
  and BVA-07 (§1b) test Password lengths of 1-2 characters, which are too short to
  simultaneously satisfy the composition rules (uppercase/lowercase/digit/special all
  require ≥4 characters). Both cases necessarily combine the intended length fault
  with additional composition faults. This does not create expected-result ambiguity
  here (all the entangled faults share the same output class, EC-32), but it means
  those two cases are weaker single-fault probes than BVA-01/02/03 - a reviewer
  should not read them as confirming the length rule in isolation from the
  composition rules the way the other boundary cases in this artifact do.

---

## 5. Open Questions Relevant to This Phase

| ID | Bearing on Phase 4 |
| --- | --- |
| OQ-02 | BVA-01/BVA-06's rejection expected results are stated only as "weak password, too short" - no exact message text or status code, consistent with Phase 3. |
| OQ-03 | Directly governs this entire artifact's scope: because no maximum is stated for Password, Full Name, or Email, no `max`-side boundary test cases exist anywhere in this artifact. If OQ-03 is ever answered with a concrete maximum, this artifact will need additional max-side subsections for both boundary-sensitive fields (`max − 1`, `max`, `max + 1`). |
| OQ-04 / OQ-10 | §2's `minLen = 1` derivation for Full Name assumes "empty" means exactly 0 raw characters. If whitespace-only input is trimmed before the emptiness check (still unresolved), the true boundary may not sit at 0 vs. 1 the way BVA-04/BVA-05 assume - see the caveat added to §2. |

**New in Phase 4:** None identified - no additional ambiguity surfaced; the two
boundary-sensitive fields are exercised entirely from information already in the FR
plus the pre-existing OQ-02/OQ-03.

---

## 6. Self-Check

- [x] Precision and step stated explicitly, before computing values, for every
  boundary-sensitive field - Password (§1a/§1b: "precision = 1 character, step = 1
  character") and Full Name (§2: same, with the implicit-derivation caveat spelled
  out separately since it is not a literal number in the FR).
- [x] `min − step / min / min + step` computed for both boundary-sensitive fields;
  `max − step / max / max + step` explicitly **not** fabricated for either - both are
  open-ended per OQ-03, and this is stated at the point of omission (§1a, §2) rather
  than silently absent.
- [x] Every BVA test case traces to its EC and REQ - see the "EC / REQ" column in
  §1a/§1b/§2's test-case tables.
- [x] No new equivalence classes invented to justify additional boundary cases -
  the Password composition-count question was explicitly considered and declined in
  §0, and §2 now states explicitly *why* Full Name's implicit floor is a legitimate
  length boundary while the composition-count question is not, rather than applying
  the two inconsistently as the first draft did (see `gap_notes.md`, Phase 4
  self-critique finding 1).
- [x] Boundary points already exercised by Phase 3 are cross-referenced, not
  duplicated - Full Name's `min − step` (0, empty) reuses Phase 3 TC-02, and
  Password's `min − step` (0, empty, §1b) reuses Phase 3 TC-10, rather than
  generating redundant new test cases for either value.
- [x] **Corrected this revision: the Password-length boundary set was incomplete.**
  The first draft only tested EC-18's ceiling (bordering EC-15, §1a) and missed
  EC-18's floor (bordering EC-16, §1b) entirely - a real coverage gap, since EC-16
  and EC-18 route to different output classes (EC-29 vs. EC-32) and Phase 2's own
  self-critique was specifically about this pair overlapping. §1b (BVA-06, BVA-07)
  now covers it.
- [x] Confirm Password's value in every Password-boundary test case is set equal to
  the Password value under test (BVA-01/02/03/06/07), consistent with the Phase 3
  D-4 fix - no boundary probe reintroduces the mismatch (EC-25) single-fault
  violation that Phase 3 corrected.
- [ ] Every boundary test case isolates exactly one invalid condition - **Partial,
  honestly.** True for BVA-01 (7 chars can satisfy all composition rules) and all of
  §2's Full Name cases. **Not fully true for BVA-06/BVA-07** (§1b): at length 1-2,
  the composition rules cannot all be satisfied, so these two cases necessarily
  combine the length fault with additional composition faults. This is flagged
  inline on both rows and in §4's Technique Limitations, not hidden - it does not
  create expected-result ambiguity (all entangled faults share output class EC-32),
  but it is not clean single-fault isolation either.
- [x] The error-type-2 illustration in BVA-01/BVA-02 no longer contrasts logically
  identical inequalities. **Corrected this revision:** the first draft said BVA-01
  "exposes `<= 7` vs. `< 8`" - for integer lengths these denote the identical set,
  so the illustration didn't actually describe a possible bug. Replaced with a
  correct pairing: BVA-01 (7 chars, rejected) and BVA-02 (8 chars, accepted) together
  expose a check mis-specified as `<= 8` (would wrongly reject the valid 8-char
  case) or `< 7` (would wrongly accept the invalid 7-char case).
- [x] IDs unique and consistently formatted (`BVA-01`..`BVA-07`, zero-padded, no
  gaps).
- [x] No empty table cells - every cell populated; "-" used where a value
  legitimately does not apply (e.g. the max-side columns).
- [x] Terminology consistent with Phases 1-3 ("field", "class", "requirement",
  EC/REQ/TC/BVA IDs, "valid/invalid").
- [x] Technique Limitations stated explicitly (§4), as required by the skill, so the
  human reviewer knows what this suite does not cover - now including the BVA-06/07
  isolation caveat.
- [x] Every excluded field/dimension has a stated reason (§0, §3) - nothing is
  silently out of scope, and the Full Name / Password-composition scope distinction
  is now stated explicitly (§2) rather than left as an unexplained asymmetry.

---

## 7. Awaiting User Review

This is the Phase 4 artifact (Boundary Value Test Cases) for FR-01: Account
Registration - 7 new boundary test cases (BVA-01..BVA-07) across the two
boundary-sensitive fields identified in this FR (Password length - both its ceiling
at EC-15/EC-18 and, after self-critique, its floor at EC-16/EC-18 - and Full Name's
implicit minimum length), plus two cross-referenced boundaries already covered by
Phase 3 (Full Name empty → TC-02; Password empty → TC-10). All other fields/
dimensions are explicitly excluded from BVA scope with a stated reason (§0/§3), and
the Full Name / Password-composition-count scope asymmetry flagged in self-critique
is now explained rather than left implicit (§2). Both boundary-sensitive fields are
open-ended on the upper side (OQ-03), so no max-side test cases exist in this
artifact. Note BVA-06/BVA-07 carry a documented single-fault-isolation caveat (§1b,
§4) - a structural limitation at very short password lengths, not an oversight left
unfixed. Reply "approved" to close out the FR-01 domain testing + BVA workflow, or
request specific revisions.
