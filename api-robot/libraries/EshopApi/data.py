"""Test design cases for the EShop API suite, read from ``e2e/automation/data``."""

from __future__ import annotations

import csv
import json
import time
from pathlib import Path
from types import MappingProxyType
from typing import Any

from robot.api.deco import keyword
from robot.libraries.BuiltIn import BuiltIn

DATA_DIR = Path(__file__).resolve().parents[3] / "e2e" / "automation" / "data"
DASHBOARD_API_ACTORS = frozenset(
    {
        "admin",
        "non_admin",
        "anonymous",
        "malformed_token",
        "expired_token",
        "signed_missing_role",
        "signed_nonexistent_admin",
        "throwaway_user",
    }
)
STATUS_STEPS = MappingProxyType(
    {
        "pending": (),
        "confirmed": ("confirmed",),
        "shipping": ("confirmed", "shipping"),
        "delivered": ("confirmed", "shipping", "delivered"),
        "canceled": ("canceled",),
    }
)

ORDER_HISTORY_REQUIRED = MappingProxyType(
    {
        "order_detail": ("acting_as", "detail_owned_by", "expect_http_any_of"),
        "admin_orders_list": ("acting_as", "expect_http_any_of"),
        "admin_set_status": (
            "acting_as",
            "seed_owner_orders",
            "set_status",
            "expect_http_any_of",
        ),
        "order_cancel": ("acting_as", "cancel_owned_by", "expect_http_any_of"),
        "order_cancel_race": (
            "acting_as",
            "seed_owner_orders",
            "expect_final_status",
            "expect_http_multiset",
        ),
        "checkout": ("acting_as", "checkout_total_amount", "expect_http_any_of"),
        "my_orders": ("acting_as", "expect_http_any_of"),
    }
)
REFUSAL_READ_BACK = MappingProxyType(
    {"admin_set_status": "transition_from", "order_cancel": "cancel_target_status"}
)


def _load_json_cases(file_name: str) -> list[dict[str, Any]]:
    with (DATA_DIR / file_name).open(encoding="utf-8") as handle:
        return json.load(handle)["cases"]


def _find_case(cases: list[dict[str, Any]], tc_id: str, file_name: str) -> dict[str, Any]:
    matches = [case for case in cases if case.get("tc_id") == tc_id]
    if len(matches) != 1:
        raise AssertionError(
            f"{file_name}: expected exactly one case {tc_id}, found {len(matches)}"
        )
    return matches[0]


class DataKeywords:
    """Keywords that read test cases and build unique test data."""

    def _unique_stamp(self) -> int:
        # The Windows clock of Python 3.12 moves in steps of about 15 ms, so two calls
        # inside one test can read the same time_ns(); the stamp must still grow.
        self._last_stamp = max(time.time_ns(), self._last_stamp + 1)
        return self._last_stamp

    @keyword
    def unique_email(self, test_id: str | None = None) -> str:
        """Returns ``rf.<test-id>.<timestamp>@example.com``.

        ``test_id`` defaults to the first word of the running test's name. The
        timestamp grows on every call, so two calls in one test give two
        addresses.
        """
        if test_id is None:
            test_name = BuiltIn().get_variable_value("${TEST NAME}")
            if not test_name:
                raise AssertionError("Unique Email needs a test_id outside a running test")
            test_id = test_name.split()[0]
        return f"rf.{test_id.lower()}.{self._unique_stamp()}@example.com"

    @keyword
    def load_registration_case(self, tc_id: str) -> dict[str, Any]:
        """Reads one ``level=api`` row of ``fr01_registration.csv``.

        Fills ``{{UNIQUE}}``, ``{{EXISTING}}`` and ``{{RUN}}``, drops the key named
        in ``omit_field`` and returns a dictionary with:

        - ``body``: the register request body
        - ``expected_status``: ``expect_signal`` as an integer
        - ``expect_success``: ``True`` when ``expect_outcome`` is ``success``
        - ``existing_account``: the register body to send first, or ``None``.
          ``{{EXISTING}}`` names an address that already has an account, so the
          test creates that account itself
        - ``login_probe``: whether logging in afterwards can tell if an account
          was written. It cannot when the email or password key was left out, or
          when the address already had an account
        """
        with (DATA_DIR / "fr01_registration.csv").open(encoding="utf-8", newline="") as handle:
            rows = [row for row in csv.DictReader(handle) if row["tc_id"] == tc_id]
        if len(rows) != 1 or rows[0]["level"] != "api":
            raise AssertionError(f"fr01_registration.csv: expected one api row {tc_id}")
        row = rows[0]
        run = str(self._unique_stamp())
        existing_account = None
        email = row["email"].replace("{{RUN}}", run)
        if email == "{{UNIQUE}}":
            email = self.unique_email(tc_id)
        elif email == "{{EXISTING}}":
            email = self.unique_email(tc_id)
            existing_account = self.credentials(email, "Existing123!", name="RF Existing User")
        if "{{" in email:
            raise AssertionError(f"fr01_registration.csv: {tc_id} has an unknown placeholder")
        if row["omit_field"] not in ("", "name", "email", "password"):
            raise AssertionError(f"fr01_registration.csv: {tc_id} omits an unknown field")
        body = self.credentials(email, row["password"], name=row["name"])
        if row["omit_field"]:
            del body[row["omit_field"]]
        return {
            "body": body,
            "expected_status": int(row["expect_signal"]),
            "expect_success": row["expect_outcome"] == "success",
            "existing_account": existing_account,
            "login_probe": existing_account is None
            and row["omit_field"] not in ("email", "password"),
        }

    @keyword
    def load_order_history_case(self, tc_id: str) -> dict[str, Any]:
        """Reads one ``channel=api`` case of ``fr11_order_history.json``.

        Fails naming the field when a case lacks one its ``api_call`` needs, so a
        broken data file is reported as such and not as a SUT finding.
        """
        file_name = "fr11_order_history.json"
        case = _find_case(_load_json_cases(file_name), tc_id, file_name)
        required = ORDER_HISTORY_REQUIRED.get(case.get("api_call", ""))
        if case.get("channel") != "api" or required is None:
            raise AssertionError(f"{file_name}: {tc_id} is not an api case with a known api_call")
        missing = [field for field in required if field not in case]
        read_back = REFUSAL_READ_BACK.get(case["api_call"])
        refusal = 200 not in case.get("expect_http_any_of", [200])
        if refusal and read_back and read_back not in case:
            missing.append(read_back)
        if missing:
            raise AssertionError(f"{file_name}: {tc_id} lacks {', '.join(missing)}")
        if "seed_owner_orders" in case and not case["seed_owner_orders"]:
            raise AssertionError(f"{file_name}: {tc_id} has an empty seed_owner_orders")
        return case

    @keyword
    def load_dashboard_case(self, tc_id: str) -> dict[str, Any]:
        """Reads one ``layer=api`` case of ``fr13_dashboard.json``."""
        file_name = "fr13_dashboard.json"
        case = _find_case(_load_json_cases(file_name), tc_id, file_name)
        if case.get("layer") != "api":
            raise AssertionError(f"{file_name}: {tc_id} is not an api case")
        if case.get("actor") not in DASHBOARD_API_ACTORS:
            raise AssertionError(f"{file_name}: {tc_id} has unknown actor {case.get('actor')}")
        return case

    @keyword
    def status_steps_to(self, status: str) -> list[str]:
        """Returns the admin status updates that take a pending order to ``status``.

        The server moves an order forward through pending, confirmed, shipping and
        delivered one step at a time, and cancels it from pending or confirmed.
        Seeding reaches canceled through the admin endpoint, so it never depends on
        the customer cancel guard that FR-11 tests.
        """
        if status not in STATUS_STEPS:
            raise AssertionError(f"'{status}' is not an order status the server knows")
        return list(STATUS_STEPS[status])

    @keyword
    def find_order(
        self, orders: list[dict[str, Any]], order_id: int | str
    ) -> dict[str, Any] | None:
        """Returns the order with ``order_id`` from an orders payload, or ``None``."""
        return next((order for order in orders if str(order["id"]) == str(order_id)), None)
