# Equivalence Partitioning Heuristics (Kaner & Bach Domain Testing Method)

Reference for Phase 2 (Equivalence Partitioning). Load only when executing this phase.

## The 4 Views of Equivalence

Two values belong in the same equivalence class only if they are equivalent under at
least one of these four views. Use all four as reasoning tools whenever deciding
whether to merge two candidate values into one class or split them apart:

1. **Intuitive Similarity** — the two values are too similar to bother testing both
   (e.g. quantity = 4 and quantity = 5 are intuitively similar interior values of a
   "1 to 10" range).
2. **Specified As Equivalent** — the specification or API documentation explicitly
   states that the two values are handled the same way.
3. **Equivalent Paths** — the two values would drive the program down the same code
   path (same branches, same logic executed).
4. **Risk-Based** — given a specific theory of a possible error, you would expect the
   same result from both values (i.e. if you're not theorizing a fault that would
   distinguish them, they're equivalent for testing purposes).

If none of the four views support treating two values as equivalent, do not merge
them into the same class — split them.

## The Core Fault-Detection Principle

An equivalence class is defined correctly if and only if this holds:

> If a test case in the class detects an error, every other test case in that class
> should also detect it — and if one test case in the class does NOT detect an
> error, none of the others should either.

Use this as the test for "is my class boundary drawn correctly." If you can imagine
a plausible fault that only some members of a proposed class would expose, the class
is drawn too broadly and must be split.

## Five Partitioning Guidelines by Input Condition Shape

Match the input condition's shape to the guideline below — do not apply a generic
formula when a more specific one fits.

**(a) RANGE condition** (e.g. "count from 1 to 999"):
- Exactly 1 valid class: `1 <= x <= 999`
- Exactly 2 invalid classes: `x < 1` and `x > 999`

**(b) NUMBER-OF-VALUES condition** (e.g. "1 to 6 items allowed"):
- Exactly 1 valid class: 1 to 6 items
- Exactly 2 invalid classes: zero items, and more than 6 items

**(c) SET OF DISCRETE VALUES, each handled differently** (e.g. order status:
pending/confirmed/shipping/delivered/canceled):
- One valid class PER value (because each is handled differently — do not merge them)
- Exactly 1 invalid class: any value outside the set

**(d) "MUST BE X" condition** (e.g. "email must contain @"):
- Exactly 1 valid class: satisfies X
- Exactly 1 invalid class: does not satisfy X

**(e) Suspected non-uniform handling within a class**:
If there is any reason to believe elements within one class are NOT handled
identically by the actual implementation, split that class further. Verify this by
reading the relevant source code or API spec — not just the requirement text.
Always cross-check assumed equivalence against actual API/backend behavior when the
implementation is available in this repository; do not assume the Functional
Requirement's prose description matches the real implementation. If you find a
discrepancy between the stated requirement and the actual code, do not silently
resolve it in either direction — flag it explicitly (see SKILL.md Core Principles
on grounding classes in actual implementation logic).

## Output Partitioning

Equivalence analysis is not input-only. For every atomic requirement, also derive
equivalence classes for the requirement's OUTPUTS — the distinct results the system
can produce — using the same five guidelines above (a–e), applied to the output
domain instead of the input domain. Do not skip this step even when the input-side
classes look complete; an input-only analysis routinely misses expected system
responses that no input class maps to directly.

Typical output partitions to look for:
- **Result/status classes**: distinct outcome states the operation can end in (e.g.
  `Success`, `Rejected`, `Pending Review`) — one class per distinct value, per
  guideline (c).
- **System message classes**: distinct user-facing messages or error codes (e.g.
  `"Insufficient Funds"`, `"Invalid Input"`, `"Account Locked"`) — each message that
  is handled/displayed differently is its own class, even if multiple input
  conditions could trigger it.
- **Output value-range classes**: ranges the output value itself can fall into after
  the operation (e.g. resulting account balance ranges: negative, zero, positive but
  below a threshold, at or above a threshold) — partitioned per guideline (a).
- **State-transition classes**: the before/after state pair produced by the
  operation (e.g. `Active -> Suspended`, `Active -> Active` no-op) when the
  requirement describes a state machine.

**Trace outputs back to inputs.** For every output class identified, work backward
and confirm that at least one input equivalence class (or combination of input
classes) is capable of producing it. If an output class has no traceable input
combination that reaches it, flag this explicitly as an Open Question — it usually
means either an input class is missing from the Phase 2 input analysis, or the
output is unreachable/dead behavior worth confirming with the user. This backward
trace is what guarantees no expected system response is left untested going into
Phase 3 and Phase 4.

Record output classes in the same equivalence-class table as input classes, using
the same `EC-xx` ID scheme, with a column/tag distinguishing `Input` vs `Output`
classes so later phases can reference either.

## Choosing the Best Representative

An equivalence class is only as good as its best representative value — the value
selected to actually stand in for the whole class in a test case (this feeds Phase 3
and Phase 4).

- For **ordered domains** (numeric ranges, lengths, dates), the best representative
  is usually a boundary value — but not always; if the risk theory points at an
  interior value, use that instead.
- For **unordered/enumerated domains**, pick the representative most likely to
  expose the theorized error, which may not be a boundary at all (e.g. for an
  enum, the representative might be the value with the most complex handling logic).

## Common Mistakes to Avoid

- **Overlapping partitions**: a value must not be classifiable into two partitions
  at once (e.g. defining `<=100` as valid and `>=100` as invalid — 100 is ambiguous).
  Always make the boundary explicit and exclusive.
- **Missing the invalid partition for optional fields**: optional does not mean
  "no invalid classes" — a supplied-but-malformed value is still invalid. Only the
  "absent" state is valid-by-default.
- **Forgetting the empty/null partition**: for every field, explicitly decide
  whether empty/null is valid or invalid, and state it — don't leave it implicit.
- **Merging discrete values that are actually handled differently** just because
  they look similar in the requirement prose — this is exactly what guideline (e)
  and the fault-detection principle above are meant to catch.
