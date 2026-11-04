# Agent skills

Two [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) that I wrote to use AI for test design and test automation in this repo. Each one drives the AI through a fixed workflow with human approval gates, so the AI drafts and I review and approve before anything moves on.

| Skill | Turns | Into | Output in this repo |
| --- | --- | --- | --- |
| [`domain-testing-bva`](domain-testing-bva/SKILL.md) | a functional requirement | requirements breakdown, equivalence classes, domain test cases, boundary value test cases | [`test-design/`](../../test-design/) |
| [`playwright-automation`](playwright-automation/SKILL.md) | designed test cases | external test data files, page objects and data-driven Playwright specs, run on three browsers | [`e2e/automation/`](../../e2e/automation/) |

The two run in sequence: the `test-design/` output of the first is the input of the second.

## domain-testing-bva: designing test cases

A four-phase ISTQB black-box workflow. Each phase stops and waits for approval before the next one starts:

1. **Requirement analysis.** Split the requirement into atomic requirements, and tag each as a stated requirement, an observation or an assumption.
2. **Equivalence partitioning.** Derive valid and invalid classes for inputs *and* outputs.
3. **Domain test design.** Combine valid classes into as few cases as possible, and give each invalid class its own case (single-fault isolation).
4. **Boundary value analysis.** Work out the precision of the field first, then generate `min-step`, `min`, `min+step`, `max-step`, `max` and `max+step`.

Guardrails that keep the AI honest:

- It must not invent business rules: anything unclear becomes an open question.
- It checks classes against the backend source, not only the requirement text.
- Every row traces back through `REQ → EC → TC → BVA`.
- It runs a self-check list before presenting each artifact.
- `scripts/update_state.py` tracks progress in `state.json`, so a phase cannot be approved out of order.

## playwright-automation: test data and scripts

An eight-step workflow: environment, reading the page source, deriving cases, verifying selectors, writing the data file, writing the page object and spec, human review, running the three browsers, and triage. It enforces:

- **No inline test data.** Every case lives in a CSV or JSON file in `e2e/automation/data/`.
- **Selectors verified against the live app before the data file is written.** A throwaway probe counts the matches for each candidate locator.
- **Three distinct kinds of assertion:** UI state, API contract and data integrity.
- **Expected results from the requirement, never from the current build.** A test is never weakened to make it pass.
- **Every failure triaged** as either a test defect or a product defect. Product defects are added to `known_failures.json` so CI tracks them.

`scripts/validate-feature.ps1` checks a feature's spec, data file and JSON reports, and prints a machine-readable verdict.

## Evidence that the AI output was reviewed

The skills make the AI stop for review. These records show what that review caught:

- [AI review and gap analysis](https://github.com/KieuDuyennn/software__testing/blob/main/HW04/docs/test-plan/AI_Review_Gap_Analysis.md): 39 corrections to AI-generated scripts and data. Each records what the AI produced, why it was wrong, what I changed it to, and why the AI missed it. Examples:
  - an assertion that could never fail
  - a locator that matched one cell instead of a whole column, so a sort check passed on any order
  - a `?? 0` default that silently made an expected revenue of zero
- `gap_notes.md` in each [`test-design/`](../../test-design/) feature: my critique of each AI-drafted phase before I approved it.
- [`performance/k6/realistic-shopping.ai.js`](../../performance/k6/realistic-shopping.ai.js): an AI-drafted load scenario that I audited and refined.

## Using them

Open this repo in Claude Code and ask for a skill by name, for example:

> Use `domain-testing-bva` on `test-design/fr06_product_detail_view/input/Functional_Requirement.md`.

> Use `playwright-automation` to automate FR-06 from its test design. Stop at every human gate.

The skills started as coursework, in [HW02](https://github.com/KieuDuyennn/software__testing/tree/main/HW02/.claude/skills) and [HW04](https://github.com/KieuDuyennn/software__testing/tree/main/HW04/.claude/skills). The copies here have been adapted to this repo's paths.
