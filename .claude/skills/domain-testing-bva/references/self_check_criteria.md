# Self-Check Criteria

Run this checklist against every artifact before presenting it to the user. Record
the result of each item in the artifact's "Self-Check" section as a checklist with
Pass/Fail (or "N/A" with a reason) — do not just say "all checks passed" without
listing them.

- [ ] Every atomic requirement is traceable to the source Functional Requirement
      (quote or reference the originating line/section).
- [ ] No invented business rules or assumptions presented as fact — anything not
      explicitly stated in the input artifact is either omitted or listed under
      "Open Questions"/"Assumptions" with a clear flag.
- [ ] Every equivalence class has at least one covering test case (Phase 3 onward).
- [ ] IDs are unique and consistently formatted (`REQ-xx`, `EC-xx`, `TC-xx`,
      `BVA-xx`, zero-padded, no gaps that suggest a deleted/skipped item without
      explanation).
- [ ] No table cell is empty without an explicit "None"/"N/A" — every cell has
      content or an explicit marker, never a blank.
- [ ] Terminology is consistent throughout (no synonyms for the same concept —
      e.g. don't mix "field" and "parameter" for the same thing within one artifact).

If any item fails, fix the artifact before presenting it — do not present a known
failing self-check to the user and ask them to catch it.
