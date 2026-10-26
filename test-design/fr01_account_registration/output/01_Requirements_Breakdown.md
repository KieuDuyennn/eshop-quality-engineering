# FR-01: Account Registration - Requirements Breakdown (Phase 1)

Source: `input/Functional_Requirement.md` (FR-01: Account Registration, Pool A).

## 1. Feature Areas

| Area ID | Name | Description |
| --- | --- | --- |
| AREA-01 | Required Fields | Presence/required-ness of the four registration fields |
| AREA-02 | Email Validation | Format and uniqueness rules for the Email field |
| AREA-03 | Password Strength | Composition rules the Password field must satisfy |
| AREA-04 | Confirm Password | Match rule between Password and Confirm Password |
| AREA-05 | Post-Registration Behavior | System behavior after a successful registration |
| AREA-06 | API Contract | Request/response shape of `POST /api/register` |

## 2. Atomic Requirements

| REQ ID | Area | Statement | Source Reference | Classification |
| --- | --- | --- | --- | --- |
| REQ-01 | AREA-01 | The user MUST provide a Full Name value; it must not be empty. | §3.1 "The user MUST provide all three of: Full Name, Email, Password."; §4 Inputs Summary - Full Name: "Required; must not be empty" | Functional Requirement |
| REQ-02 | AREA-01 | The user MUST provide an Email value. | §3.1; §4 Inputs Summary - Email: "Required" | Functional Requirement |
| REQ-03 | AREA-01 | The user MUST provide a Password value. | §3.1; §4 Inputs Summary - Password: "Required" | Functional Requirement |
| REQ-04 | AREA-01 | A Confirm Password field MUST be present in the registration form (UI-level) and MUST be provided (required). | §3.1 "A Confirm Password field MUST also be present in the registration form (UI-level)."; §4 Inputs Summary - Confirm Password: "Required; must exactly equal Password" | Functional Requirement |
| REQ-05 | AREA-02 | Email MUST be in a valid format (`user@domain.com`). | §3.2 "Email MUST be in a valid format (user@domain.com)." | Functional Requirement |
| REQ-06 | AREA-02 | Email MUST be unique across the system; registering with an already-registered email MUST be rejected. | §3.2 "Email MUST be unique across the system - a second registration with an already-registered email MUST be rejected." | Functional Requirement |
| REQ-07 | AREA-03 | Password MUST have a minimum length of 8 characters. | §3.3 "Minimum length of 8 characters." | Functional Requirement |
| REQ-08 | AREA-03 | Password MUST contain at least 1 uppercase letter. | §3.3 "At least 1 uppercase letter." | Functional Requirement |
| REQ-09 | AREA-03 | Password MUST contain at least 1 lowercase letter. | §3.3 "At least 1 lowercase letter." | Functional Requirement |
| REQ-10 | AREA-03 | Password MUST contain at least 1 digit. | §3.3 "At least 1 digit." | Functional Requirement |
| REQ-11 | AREA-03 | Password MUST contain at least 1 special character from the set `@ $ ! % * ? &`. | §3.3 "At least 1 special character from the set: @ $ ! % * ? &." | Functional Requirement |
| REQ-12 | AREA-03 | All five password sub-rules (REQ-07..REQ-11) MUST hold simultaneously for the password to be considered strong/valid. | §3.3 "The password MUST satisfy ALL of the following:" | Functional Requirement |
| REQ-13 | AREA-04 | Confirm Password MUST exactly match Password. | §3.4 "The Confirm Password field MUST match the Password field exactly." | Functional Requirement |
| REQ-14 | AREA-04 | If Password and Confirm Password do not match, registration MUST be rejected. | §3.4 "If the two fields do not match, the system MUST reject the registration." | Functional Requirement |
| REQ-15 | AREA-05 | On successful registration, the user MUST be redirected to the Login page. | §3.5 "On successful registration, the user MUST be redirected to the Login page."; §1 Overview | Functional Requirement |
| REQ-16 | AREA-06 | On success, the API returns HTTP 200 with body `{ "message": "User registered successfully", "id": <number> }`. | §2 API Reference - "Success response (200 OK)" | Functional Requirement |
| REQ-17 | AREA-06 | On any validation failure (invalid email format, duplicate email, weak password, password mismatch, or missing required field), registration MUST be rejected with an appropriate error message. | §5 Expected Outputs - "Failure (validation)" | Functional Requirement |
| REQ-18 | AREA-06 | The registration endpoint is `POST /api/register`, accepting JSON body with fields `name`, `email`, `password`. | §2 API Reference - Endpoint and Request body | Observation |

**Note on REQ-18 / REQ-04 classification:** REQ-18 is classified as an *Observation* because the sample JSON request body in §2 shows only `name`, `email`, `password` - it does not include a `confirmPassword` field, even though §3.1 states Confirm Password "MUST also be present in the registration form (UI-level)." This is flagged as inconsistent; see Open Questions OQ-01.

## 3. Assumptions

| ID | Statement | Reason Flagged |
| --- | --- | --- |
| ASM-01 | "Full Name" corresponds to the `name` field in the API request body. | The FR uses "Full Name" in §3.1/§4 but the API sample in §2 uses `name`; not explicitly stated as the same field, though strongly implied. |
| ASM-02 | Confirm Password is validated client-side / at a layer not necessarily reflected in the `POST /api/register` request body, since the API sample body has no `confirmPassword` field. | Needed to reconcile REQ-04/REQ-13/REQ-14 (UI-level requirement) with REQ-18 (API body has no matching field). Not confirmed by the FR text. |
| ASM-03 | Because the actual `POST /api/register` request body has no `confirmPassword` field (per REQ-18/OQ-01), REQ-04's "MUST be provided (required)" clause can only be exercised/verified at the UI/form level, not through a direct API-level test case. | The FR states Confirm Password is "Required" (§4) at the form level, but there is no field in the API contract to omit/empty for an API-level "missing Confirm Password" test. This assumption bridges REQ-04 (form-level requirement) to test design feasibility; not stated explicitly in the FR. |

## 4. Open Questions

| ID | Question | Why It Matters |
| --- | --- | --- |
| OQ-01 | The sample API request body in §2 does not include a `confirmPassword` (or similar) field, yet §3.4 requires Confirm Password to match Password and reject on mismatch. Is Confirm Password validated only client-side (UI), or does the actual `POST /api/register` payload include an additional field not shown in the sample? | Determines whether Confirm Password test cases (REQ-04, REQ-13, REQ-14) are testable via the API alone or require UI-level/form-level test design in a later phase. |
| OQ-02 | What exact error messages/response codes are expected for each failure category (invalid email format, duplicate email, weak password, password mismatch, missing required field)? §5 only says "an appropriate error message" without specifying text or HTTP status codes. | Affects how precisely output equivalence classes (Phase 2) and expected results in test cases (Phase 3/4) can be specified; without this, expected results will be limited to "registration rejected" without a specific message/status assertion. |
| OQ-03 | Is there a maximum length constraint on Full Name, Email, or Password? The FR states only a minimum length for Password (8 chars) and no length constraint at all for Full Name or Email. | Affects whether upper-boundary test cases can be designed for these fields in Phase 4, or whether "no stated maximum" must be recorded as a gap. |
| OQ-04 | Does Full Name have any format constraints beyond "must not be empty" - e.g., is a whitespace-only string ("   ") considered empty or non-empty? Are digits, symbols, or single-character names accepted? Is there any character-set restriction at all? | Affects equivalence class derivation for Full Name in Phase 2 - currently only "empty vs. non-empty" is supported by the text, and "empty" itself is undefined for whitespace-only input. |
| OQ-05 | Is "uppercase"/"lowercase" restricted to ASCII A-Z/a-z, or does it include Unicode letters? Is "digit" restricted to ASCII 0-9? | Affects precise definition of valid/invalid equivalence classes for password composition rules in Phase 2. |
| OQ-06 | Is the password's special-character requirement (§3.3, set `@ $ ! % * ? &`) an *exclusive* character set, or just a *minimum-inclusion* rule? I.e., if a password contains a character outside letters+digits+this set (e.g., `#`, a space, a Unicode symbol), is the password rejected outright, is that character simply ignored, or does it count toward nothing but not cause rejection either? | Affects whether "password containing an out-of-set character" is a valid or invalid equivalence class in Phase 2, and whether boundary/special-value test cases in Phase 4 should include such characters. |
| OQ-07 | When a single registration request violates more than one rule at once (e.g., invalid email format AND weak password in the same submission), which error is surfaced - the first one checked, all of them, or is behavior undefined by the FR? | Phase 3's domain test design rule ("never combine two invalid conditions in one test case") assumes a single-fault model; if the real validation order matters, it affects how multi-fault inputs are excluded from or handled in test design and what expected result to assert if such a case is ever exercised. |
| OQ-08 | REQ-15 ("redirected to Login page") describes UI-navigation behavior, but the only interface the FR specifies in detail is the JSON API (REQ-16/REQ-17), whose success response `{ message, id }` has no redirect/navigation field. Is REQ-15 verifiable via API-level test cases at all, or does it require a separate UI-level/E2E test design pass outside this API-focused workflow? | Determines whether REQ-15 gets a covering test case in Phase 3/4 or must be explicitly carved out as "not testable at this test level." |
| OQ-09 | Is email uniqueness comparison case-sensitive or case-insensitive, and is the email normalized (e.g., trimmed, lowercased) before the uniqueness check? E.g., is `Test@x.com` treated as a duplicate of an existing `test@x.com`? | Affects the invalid equivalence class definition for "duplicate email" (REQ-06) in Phase 2 - without this, only exact-string duplicates can be safely asserted as invalid. |
| OQ-10 | Is leading/trailing whitespace on Full Name or Email trimmed before validation? E.g., is `" "` (spaces only) treated as empty for Full Name (REQ-01), and is `" test@x.com "` treated as valid-format for Email (REQ-05)? | Affects equivalence class boundaries for REQ-01 and REQ-05 in Phase 2; without an answer, whitespace-padded inputs cannot be confidently classified as valid or invalid. |
| OQ-11 | What exactly counts as "valid format" for Email beyond the single example `user@domain.com`? E.g., are subdomains (`user@mail.domain.com`), missing TLDs (`user@domain`), plus-addressing (`user+tag@domain.com`), or multiple `@` characters accepted or rejected? | Phase 2 needs a concrete definition to draw invalid-email equivalence classes; without it, only the most obvious malformed cases (no `@`, no domain) can be classified with confidence. |
| OQ-12 | For API-level testing, is an empty-string field value (e.g., `"name": ""`) treated the same as that field being entirely absent from the JSON payload? §4's "must not be empty" phrasing doesn't distinguish "empty value" from "missing key." | Affects whether "empty string" and "absent field" are the same equivalence class or two distinct invalid classes in Phase 2, and whether Phase 3 needs separate test cases for each. |

## 5. Self-Check

- [x] Every atomic requirement is traceable to the source Functional Requirement (each REQ row cites the exact section/quote).
- [x] No invented business rules or assumptions presented as fact - items without explicit textual support are listed under "Assumptions" (ASM-01..ASM-03) or "Open Questions" (OQ-01..OQ-12), not stated as REQ rows.
- [ ] Every equivalence class has at least one covering test case - N/A for Phase 1 (equivalence classes and test cases are produced in Phase 2/3).
- [x] IDs are unique and consistently formatted (`REQ-01`..`REQ-18`, `ASM-01`..`ASM-03`, `OQ-01`..`OQ-12`, `AREA-01`..`AREA-06`), zero-padded, no unexplained gaps.
- [x] No table cell is empty without an explicit marker - all cells populated.
- [x] Terminology is consistent throughout (consistently uses "field" for Full Name/Email/Password/Confirm Password, "requirement" for REQ rows, "endpoint" for the API route).

## 6. Awaiting User Review

This is the Phase 1 artifact (Requirements Breakdown) for FR-01: Account Registration.
Please review the atomic requirements, feature area grouping, assumptions, and open
questions above. Reply "approved" (or similar) to proceed to Phase 2 (Equivalence
Partitioning), or request specific revisions.
