#!/usr/bin/env python3
"""Update the workflow state for a domain-testing-bva project.

Usage:
    python update_state.py <project_path> <phase_id> <new_status>

Validates phase_id and new_status, updates that phase's status, advances
current_phase/workflow_status when appropriate, and writes state.json back
with stable key ordering. Exits non-zero with a clear message on any invalid
input rather than writing malformed or inconsistent state.
"""
import json
import os
import sys

PHASE_ORDER = ["PHASE_01", "PHASE_02", "PHASE_03", "PHASE_04"]
VALID_STATUSES = {"NOT_STARTED", "RUNNING", "WAITING_FOR_APPROVAL", "APPROVED"}

# Fixed key order so every write produces a stably-ordered document.
STATE_KEY_ORDER = ["project", "workflow", "current_phase", "workflow_status", "phases"]
PHASE_KEY_ORDER = ["status", "artifact"]


def fail(message):
    print(f"Error: {message}", file=sys.stderr)
    sys.exit(1)


def ordered_state(state):
    ordered = {k: state[k] for k in STATE_KEY_ORDER if k in state}
    # Preserve any unexpected extra keys at the end rather than silently dropping them.
    for k in state:
        if k not in ordered:
            ordered[k] = state[k]

    ordered_phases = {}
    for phase_id in PHASE_ORDER:
        if phase_id not in ordered["phases"]:
            continue
        phase = ordered["phases"][phase_id]
        ordered_phase = {k: phase[k] for k in PHASE_KEY_ORDER if k in phase}
        for k in phase:
            if k not in ordered_phase:
                ordered_phase[k] = phase[k]
        ordered_phases[phase_id] = ordered_phase
    ordered["phases"] = ordered_phases
    return ordered


def main():
    if len(sys.argv) != 4:
        fail("Usage: python update_state.py <project_path> <phase_id> <new_status>")

    project_path, phase_id, new_status = sys.argv[1], sys.argv[2], sys.argv[3]

    if phase_id not in PHASE_ORDER:
        fail(f"invalid phase_id '{phase_id}'. Must be one of: {', '.join(PHASE_ORDER)}")

    if new_status not in VALID_STATUSES:
        fail(
            f"invalid new_status '{new_status}'. Must be one of: "
            f"{', '.join(sorted(VALID_STATUSES))}"
        )

    state_path = os.path.join(project_path, "state.json")
    if not os.path.isfile(state_path):
        fail(f"state.json not found at '{state_path}'")

    with open(state_path, "r", encoding="utf-8") as f:
        try:
            state = json.load(f)
        except json.JSONDecodeError as e:
            fail(f"state.json at '{state_path}' is not valid JSON: {e}")

    for required_key in ("project", "workflow", "current_phase", "workflow_status", "phases"):
        if required_key not in state:
            fail(f"state.json is missing required key '{required_key}' — refusing to guess.")

    for phase_id_check in PHASE_ORDER:
        if phase_id_check not in state["phases"]:
            fail(f"state.json is missing phase entry '{phase_id_check}' — refusing to guess.")
        if "status" not in state["phases"][phase_id_check]:
            fail(f"state.json phase '{phase_id_check}' is missing 'status' — refusing to guess.")
        if state["phases"][phase_id_check]["status"] not in VALID_STATUSES:
            fail(
                f"state.json phase '{phase_id_check}' has invalid status "
                f"'{state['phases'][phase_id_check]['status']}'"
            )

    if state["current_phase"] not in PHASE_ORDER:
        fail(f"state.json current_phase '{state['current_phase']}' is not a valid phase id")

    # Update the target phase's status.
    state["phases"][phase_id]["status"] = new_status

    # Advance workflow only when the phase being updated is the current phase
    # and it has just been APPROVED.
    if new_status == "APPROVED":
        if phase_id != state["current_phase"]:
            fail(
                f"cannot approve '{phase_id}' while current_phase is "
                f"'{state['current_phase']}'. Phases must be approved in order."
            )
        idx = PHASE_ORDER.index(phase_id)
        if idx == len(PHASE_ORDER) - 1:
            state["workflow_status"] = "COMPLETED"
            # current_phase stays on PHASE_04; there is no next phase to advance to.
        else:
            state["current_phase"] = PHASE_ORDER[idx + 1]
            state["workflow_status"] = "READY"
    else:
        if phase_id == state["current_phase"]:
            state["workflow_status"] = new_status

    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(ordered_state(state), f, indent=2)
        f.write("\n")

    print(
        f"Updated {state_path}: {phase_id} -> {new_status} "
        f"(current_phase={state['current_phase']}, workflow_status={state['workflow_status']})"
    )


if __name__ == "__main__":
    main()
