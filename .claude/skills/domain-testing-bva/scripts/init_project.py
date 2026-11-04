#!/usr/bin/env python3
"""Initialize a new domain-testing-bva project workspace.

Usage:
    python init_project.py <FeatureName>

Creates test-design/<FeatureName>/{input,output}/ and a seeded state.json.
"""
import json
import os
import sys

PHASE_ARTIFACTS = [
    ("PHASE_01", "output/01_Requirements_Breakdown.md"),
    ("PHASE_02", "output/02_Equivalence_Partitioning.md"),
    ("PHASE_03", "output/03_Domain_Test_Cases.md"),
    ("PHASE_04", "output/04_Boundary_Value_Test_Cases.md"),
]


def main():
    if len(sys.argv) != 2:
        print("Usage: python init_project.py <FeatureName>", file=sys.stderr)
        sys.exit(1)

    feature_name = sys.argv[1]
    if not feature_name.strip():
        print("Error: <FeatureName> must not be empty.", file=sys.stderr)
        sys.exit(1)

    project_path = os.path.join("test-design", feature_name)
    input_dir = os.path.join(project_path, "input")
    output_dir = os.path.join(project_path, "output")
    state_path = os.path.join(project_path, "state.json")

    if os.path.exists(state_path):
        print(
            f"Error: {state_path} already exists. Refusing to overwrite an "
            "existing project. Delete it manually first if you intend to reset it.",
            file=sys.stderr,
        )
        sys.exit(1)

    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    state = {
        "project": feature_name,
        "workflow": "Domain Testing + BVA",
        "current_phase": "PHASE_01",
        "workflow_status": "READY",
        "phases": {
            phase_id: {"status": "NOT_STARTED", "artifact": artifact}
            for phase_id, artifact in PHASE_ARTIFACTS
        },
    }

    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
        f.write("\n")

    print(f"Initialized project '{feature_name}' at {project_path}")
    print(f"  - {input_dir}")
    print(f"  - {output_dir}")
    print(f"  - {state_path}")


if __name__ == "__main__":
    main()
