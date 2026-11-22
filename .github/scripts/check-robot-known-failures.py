"""Check a Robot run against api-robot/data/known_failures.json.

Usage:
  python check-robot-known-failures.py <output.xml> <known_failures.json>

The suite runs with --skiponfailure known-bug, so a known defect shows up as a skipped
test. This script fails the job when a known-bug test passed (the defect was fixed),
failed for a reason other than its recorded one, has no entry, or an entry has no
test, and when any other test did not pass or a token or the JWT key reached
output.xml.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

KNOWN_BUG_TAG = "known-bug"
KINDS = ("bug", "clarification")
JWT_PATTERN = re.compile(r"eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+")


@dataclass
class TestResult:
    test_id: str
    status: str
    message: str
    tags: set[str]


def normalize_tag(tag: str) -> str:
    # Robot matches tags ignoring case, spaces and underscores, and so does this script.
    return tag.lower().replace(" ", "").replace("_", "")


def read_results(output_xml: Path) -> list[TestResult]:
    results = []
    for test in ET.parse(output_xml).getroot().iter("test"):
        status = test.find("status")
        results.append(
            TestResult(
                test_id=test.get("name", "").split(" ")[0],
                status=status.get("status", "") if status is not None else "",
                message=(status.text or "") if status is not None else "",
                tags={normalize_tag(tag.text or "") for tag in test.findall("tag")},
            )
        )
    return results


def first_line(message: str) -> str:
    original = message.split("Original failure:", 1)[-1]
    lines = [line.strip() for line in original.splitlines()]
    return next(
        (line for line in lines if line and line != "Several failures occurred:"), "(no message)"
    )


def entry_problems(test_id: str, entry: object) -> list[str]:
    if not isinstance(entry, dict):
        return [f"{test_id}: entry must be an object"]
    problems = []
    if not isinstance(entry.get("bug"), str) or not entry["bug"]:
        problems.append(f"{test_id}: missing bug")
    if entry.get("kind") not in KINDS:
        problems.append(f"{test_id}: kind must be one of {', '.join(KINDS)}")
    if not isinstance(entry.get("issue"), str):
        problems.append(f"{test_id}: issue must be a string (empty until the issue is filed)")
    signature = entry.get("expect_error")
    if (
        not isinstance(signature, list)
        or not signature
        or not all(isinstance(part, str) and part for part in signature)
    ):
        problems.append(f"{test_id}: expect_error must be a non-empty list of non-empty strings")
    return problems


def find_problems(results: list[TestResult], known: dict[str, dict], output_text: str) -> list[str]:
    problems = []
    for test_id, count in Counter(result.test_id for result in results).items():
        if count > 1:
            problems.append(f"{test_id}: {count} tests share this ID")
    test_ids = {result.test_id for result in results}
    for test_id, entry in known.items():
        problems.extend(entry_problems(test_id, entry))
        if test_id not in test_ids:
            problems.append(f"{test_id}: listed in known_failures.json but no test has this ID")
    valid = {
        test_id: entry for test_id, entry in known.items() if not entry_problems(test_id, entry)
    }

    for result in results:
        if KNOWN_BUG_TAG not in result.tags:
            if result.status != "PASS":
                problems.append(
                    f"{result.test_id}: {result.status.lower()}: {first_line(result.message)}"
                )
            if result.test_id in known:
                problems.append(f"{result.test_id}: has an entry but no known-bug tag")
            continue
        if result.test_id not in known:
            problems.append(
                f"{result.test_id}: tagged known-bug but has no entry in known_failures.json"
            )
            continue
        entry = valid.get(result.test_id)
        if entry is None:
            continue
        if result.status == "PASS":
            problems.append(
                f"{result.test_id}: passed, so {entry['bug']} looks fixed; "
                "remove its known-bug tag and its entry"
            )
        elif not all(part in result.message for part in entry["expect_error"]):
            problems.append(
                f"{result.test_id}: failed, but not with {json.dumps(entry['expect_error'])}; "
                f"first error was: {first_line(result.message)}"
            )

    if JWT_PATTERN.search(output_text):
        problems.append("output.xml contains a JWT; a token was logged")
    secret = os.environ.get("SUT_JWT_SECRET")
    if secret and secret in output_text:
        problems.append("output.xml contains the value of SUT_JWT_SECRET")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("output_xml", type=Path, help="Robot output.xml")
    parser.add_argument("known_failures", type=Path, help="api-robot/data/known_failures.json")
    args = parser.parse_args()
    # Windows runners print through cp1252; a Vietnamese server message must not crash
    # the report of the problems.
    sys.stdout.reconfigure(errors="backslashreplace")

    results = read_results(args.output_xml)
    known = json.loads(args.known_failures.read_text(encoding="utf-8"))["cases"]
    problems = find_problems(results, known, args.output_xml.read_text(encoding="utf-8"))

    print(f"Checked {len(results)} tests against {len(known)} known-failure entries.")
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for problem in problems:
            print(f"- {problem}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
