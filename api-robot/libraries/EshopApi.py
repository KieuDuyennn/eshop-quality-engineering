"""Python keywords for the EShop API suite.

Reads the test design files the Playwright suite also uses, builds request bodies
and auth headers that never print a password or a token, and sends the concurrent
cancel requests that RequestsLibrary cannot send in parallel.
"""

from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import http.client
import json
import os
import socket
import threading
import time
from collections.abc import Mapping
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import MappingProxyType
from typing import Any
from urllib.parse import urlsplit

from requests import Response
from robot.api.deco import keyword, library
from robot.libraries.BuiltIn import BuiltIn

DATA_DIR = Path(__file__).resolve().parents[2] / "e2e" / "automation" / "data"
MALFORMED_TOKEN = "not.a.valid.jwt"
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
NONEXISTENT_USER_ID = 2_147_483_647
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


class RedactedDict(dict):
    """A dict whose printed form hides passwords and tokens.

    Robot logs every assigned variable with ``repr``, so request bodies and auth
    headers are kept in this type and can be passed around and logged safely. The
    real values still reach ``requests`` and ``json.dumps``.
    """

    def __repr__(self) -> str:
        return repr(_redact(self))

    __str__ = __repr__


def _is_sensitive(key: object) -> bool:
    name = str(key).lower()
    return "password" in name or "token" in name or name == "authorization"


def _redact(value: object) -> object:
    if isinstance(value, Mapping):
        return {key: "***" if _is_sensitive(key) else _redact(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _sign_hs256(secret: str, claims: dict[str, Any]) -> str:
    header = _base64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _base64url(json.dumps(claims, separators=(",", ":")).encode())
    signature = hmac.new(secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    return f"{header}.{payload}.{_base64url(signature)}"


def _bearer(token: str) -> RedactedDict:
    return RedactedDict(Authorization=f"Bearer {token}")


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


@library(scope="GLOBAL", auto_keywords=False)
class EshopApi:
    """Keywords that read the EShop test design files and drive the API.

    Cases are read from ``e2e/automation/data``, the same files the Playwright
    suite reads, so both suites run the same inputs against the same expectations.
    Bodies and headers that hold a password or a token are returned as dictionaries
    whose logged form shows ``***`` instead.
    """

    def __init__(self, api_url: str = "http://localhost:3000", request_timeout: float = 10) -> None:
        self._api_url = api_url.rstrip("/")
        self._request_timeout = float(request_timeout)
        self._last_stamp = 0

    @keyword("API Port Should Be Free")
    def api_port_should_be_free(self) -> None:
        """Fails when something already listens on the host and port of ``api_url``.

        The suite starts its own backend so every run begins with a freshly seeded
        database, and a server left over from an earlier run would hide that.
        """
        target = urlsplit(self._api_url)
        port = target.port or (443 if target.scheme == "https" else 80)
        try:
            with socket.create_connection((target.hostname, port), timeout=1):
                pass
        except OSError:
            return
        raise AssertionError(
            f"something already listens on {target.hostname}:{port}; "
            "stop it so this run starts its own backend"
        )

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

    def credentials(self, email: str, password: str, name: str | None = None) -> RedactedDict:
        body = RedactedDict(email=email, password=password)
        if name is not None:
            body["name"] = name
        return body

    def _variable(self, name: str) -> str:
        value = BuiltIn().get_variable_value(name)
        if value is None:
            raise AssertionError(f"{name} is not defined; import resources/variables.resource")
        return value

    @keyword
    def new_user_credentials(self, email: str, name: str) -> RedactedDict:
        """Returns a register body for ``email`` with ``${NEW_USER_PASSWORD}``.

        The password is read here, not passed in, so it never shows up as a keyword
        argument in a TRACE log.
        """
        return self.credentials(email, self._variable("${NEW_USER_PASSWORD}"), name=name)

    @keyword
    def admin_credentials(self) -> RedactedDict:
        """Returns the login body of the seeded admin from ``variables.resource``."""
        return self.credentials(
            self._variable("${ADMIN_EMAIL}"), self._variable("${ADMIN_PASSWORD}")
        )

    @keyword
    def credentials_with_wrong_password(self, credentials: Mapping[str, Any]) -> RedactedDict:
        """Returns a copy of ``credentials`` whose password is not the registered one."""
        return RedactedDict(credentials, password=f"{credentials['password']}-wrong")

    @keyword
    def auth_header_from_login(self, response: Response) -> RedactedDict:
        """Returns the auth header for the token in a ``POST /api/login`` response.

        The token is read here and not in Robot, so it is never a keyword argument
        that a TRACE log level would print.
        """
        return _bearer(response.json()["token"])

    @keyword
    def crafted_auth_header(self, actor: str) -> RedactedDict:
        """Returns the auth header for an ``actor`` that login cannot produce.

        ``malformed_token`` is not a JWT at all. ``ghost`` is a token for a user id
        that does not exist, signed with the SUT key from the ``SUT_JWT_SECRET``
        environment variable, the same way the Playwright suite mints it.
        """
        if actor == "malformed_token":
            return _bearer(MALFORMED_TOKEN)
        claims = {
            "ghost": {"id": NONEXISTENT_USER_ID, "role": "user"},
        }
        if actor not in claims:
            raise AssertionError(f"no crafted token is defined for actor '{actor}'")
        secret = os.environ.get("SUT_JWT_SECRET")
        if not secret:
            raise AssertionError(
                "SUT_JWT_SECRET is not set. Tests tagged needs-jwt-secret sign their "
                "token with the SUT key: set it to SECRET_KEY from sut/backend/server.js."
            )
        return _bearer(_sign_hs256(secret, claims[actor]))

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

    @keyword
    def describe_response(self, response: Response) -> str:
        """Returns ``METHOD URL answered STATUS: BODY`` with passwords and tokens hidden."""
        try:
            body = json.dumps(_redact(response.json()), ensure_ascii=False)
        except ValueError:
            body = response.text
        method = response.request.method
        return f"{method} {response.url} answered {response.status_code}: {body[:500]}"

    @keyword
    def cancel_order_concurrently(
        self, order_id: int | str, auth: Mapping[str, str], count: int = 10
    ) -> list[int]:
        """Sends ``count`` cancel requests for one order at the same moment.

        Each worker opens its connection first and then waits on a barrier, so the
        requests leave together and reach the server inside the gap between its
        status check and its update. Returns one status code per request.
        """
        count = int(count)
        target = urlsplit(self._api_url)
        path = f"/api/orders/{order_id}/cancel"
        headers = dict(auth)
        barrier = threading.Barrier(count, timeout=self._request_timeout)

        def cancel_once() -> int:
            connection = http.client.HTTPConnection(
                target.hostname, target.port, timeout=self._request_timeout
            )
            try:
                try:
                    connection.connect()
                except OSError:
                    # Release the other workers at once instead of after the timeout.
                    barrier.abort()
                    raise
                barrier.wait()
                connection.request("PUT", path, headers=headers)
                return connection.getresponse().status
            finally:
                connection.close()

        with ThreadPoolExecutor(max_workers=count) as pool:
            futures = [pool.submit(cancel_once) for _ in range(count)]
        errors = [future.exception() for future in futures if future.exception()]
        connect_errors = [error for error in errors if isinstance(error, OSError)]
        if errors:
            cause = (connect_errors or errors)[0]
            raise AssertionError(f"concurrent cancel of order {order_id} failed: {cause!r}")
        return [future.result() for future in futures]
