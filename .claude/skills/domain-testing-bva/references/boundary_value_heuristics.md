# Boundary Value Analysis Heuristics (Kaner & Bach Domain Testing Method)

Reference for Phase 4 (Boundary Value Analysis). Load only when executing this phase.

## Why Boundary Testing Works

Boundary testing is not just the mechanical min-1/min/min+1 formula — it is targeted
at three specific, distinct error types. Understanding which error type a boundary
value can catch (and which it can't) determines whether testing at the boundary is
actually necessary, and explains why boundary values are prioritized over arbitrary
interior values.

1. **"Program doesn't like numbers at all"** — a general defect that any single
   value in the class will expose. The boundary is not special here; any interior
   value would catch this equally well.
2. **"Inequality mis-specified"** (e.g. code uses `<=` where the spec says `<`) —
   this is ONLY detectable by testing exactly at the boundary value itself. A
   near-boundary but non-boundary value will not expose an off-by-one inequality
   error.
3. **"Boundary value mistyped / transposition error"** (e.g. spec says 25 but code
   checks 52, or some other off-by-a-larger-margin error) — detectable at the
   boundary AND at some nearby non-boundary values, since the mistyped threshold is
   far enough away that even a rough nearby probe may cross it.

**State clearly in the artifact:** testing exactly at the boundary (e.g. value 25 in
a "10 <= x < 25" rule) catches all three error types. Testing only a random
non-boundary value (e.g. 53) may catch only the first type. This is precisely why
boundary values — not arbitrary interior values — are the priority for this phase.

## Standard Boundary Technique

Boundary values are never computed by blindly subtracting/adding 1. Before
calculating any boundary, you MUST first determine the **precision** (the smallest
meaningful unit / step size) of the variable's data type. The step is what gets
added or subtracted — not a hardcoded literal `1`. The general formula for every
bounded equivalence class from Phase 2 (`min..max`) is:

`min - step`, `min`, `min + step`, `max - step`, `max`, `max + step`

Determine `step` from the variable's declared type/precision, not from habit:

| Data type / precision | Step | Example (`min = 1000.10`) |
|---|---|---|
| Integer / whole-unit count | `1` | `999`, `1000`, `1001` |
| Currency or float with 2 decimal places | `0.01` | `1000.09`, `1000.10`, `1000.11` |
| Currency or float with N decimal places | `10^-N` | e.g. 3 decimals → step `0.001` |
| Date | `1 day` (or the smallest stated unit — hour/minute if the FR is time-sensitive) | `expiryDate - 1 day`, `expiryDate`, `expiryDate + 1 day` |
| String length | `1` character | `minLen - 1`, `minLen`, `minLen + 1` |

Always state the determined `step` explicitly in the artifact next to each boundary
class (e.g. "precision = 2 decimal places, step = 0.01") so the reasoning is
auditable. Never assume integer step for a numeric field without first checking the
FR/spec/source for its declared precision — a balance or price field is almost never
integer-only. If a bound is open-ended (no stated maximum or minimum), only generate
boundaries for the side that has a stated limit — do not invent the other bound.
Note its absence as an Open Question if it looks like a plausible requirement gap,
but don't fabricate a test case for it.

## Practical Boundary Types for This SUT

- **Numeric quantity / price boundaries**: apply the standard `min-step/min/
  min+step/max-step/max/max+step` technique to quantity fields, price fields,
  discount thresholds, etc. — determine `step` from the field's precision first
  (quantities are typically integer step `1`; prices/balances are typically step
  `0.01` unless the FR states otherwise).
- **Date / expiry boundaries** (e.g. a coupon's expiration date): boundaries are
  `expiryDate - 1 day` (still valid, before expiry), `expiryDate` (confirm from the
  FR/spec whether the coupon is still valid ON the expiry date itself — this is
  exactly the inequality-mis-specification risk from error type 2 above), and
  `expiryDate + 1 day` (should be expired).
- **Counter / attempt-threshold boundaries** (e.g. an account lockout counter): for
  any counter-based business rule, explicitly verify the actual increment/threshold
  comparison logic in the source code before asserting what the boundary value is.
  Do not assume a threshold like "3 attempts" just because a UI message states it —
  confirm against the real comparison in the backend/API code (e.g. whether the
  check is `attempts >= 3` vs `attempts > 3`, which changes which attempt number is
  actually the boundary). If source is unavailable, flag the assumed threshold as an
  Open Question rather than asserting it as fact.
- **String-length boundaries**: apply the standard technique to `minLen`/`maxLen` on
  text fields (`minLen - 1`, `minLen`, `minLen + 1`, `maxLen - 1`, `maxLen`,
  `maxLen + 1` characters).

## Business-Rule Cutoffs ("Just Inside" vs "Just Outside")

For thresholds that trigger a business rule rather than a simple accept/reject
(e.g. "orders over $100 get free shipping"), generate boundary cases on both sides of
the cutoff to confirm which side gets the rule applied: just below the cutoff (rule
does NOT apply), exactly at the cutoff (this is where inequality mis-specification —
error type 2 — would surface: confirm whether the FR says "over" [exclusive] or "at
least"/"or more" [inclusive]), and just above the cutoff (rule DOES apply). If the
FR's wording is ambiguous about inclusive/exclusive, flag it as an Open Question
instead of guessing which side the boundary value falls on.

## Boundaries on Enumerated / Discrete Values

For an ordered enum (e.g. star rating 1–5), boundaries are the first and last valid
members plus the values immediately outside the valid set (e.g. rating 0 or 6).
For unordered enums (e.g. category ∈ {Electronics, Books, Clothing}), boundary
analysis does not apply — equivalence partitioning from Phase 2 already provides
full coverage; do not force boundary cases onto unordered sets.

## Known Blind Spots of This Technique

Domain testing and BVA are strong at finding high-probability errors with a small
test set, but they have documented blind spots. State these explicitly in the Phase 4
artifact (in a short "Technique Limitations" note) so the human reviewer knows what
this test suite does NOT cover:

- Errors that are not located at boundaries or in obvious special cases — an interior
  value handled incorrectly for reasons unrelated to range checks will not be caught
  by boundary-focused selection.
- The actual domain is often unknowable — the real implementation may partition
  inputs differently than the specification implies, so classes derived purely from
  the spec can be wrong (this is why guideline (e) requires cross-checking source
  code when available).
- Over-reliance on best representatives: reusing the same boundary values for
  regression testing over-tests those exact values and under-tests other values that
  were nearly as good. Vary interior representatives across test runs when feasible.
