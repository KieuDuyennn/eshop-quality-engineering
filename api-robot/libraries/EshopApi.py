"""Python keywords for the EShop API suite."""

from __future__ import annotations

import csv
import json
import socket
import time
from collections.abc import Mapping
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from requests import Response
from robot.api.deco import keyword, library
from robot.libraries.BuiltIn import BuiltIn

DATA_DIR = Path(__file__).resolve().parents[2] / "e2e" / "automation" / "data"


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


@library(scope="GLOBAL", auto_keywords=False)
class EshopApi:
    """Keywords that read the EShop test design files and drive the API.

    Cases are read from ``e2e/automation/data``, the same files the Playwright
    suite reads, so both suites run the same inputs against the same expectations.
    Bodies and headers that hold a password or a token are returned as dictionaries
    whose logged form shows ``***`` instead.
    """

    def __init__(self, api_url: str = "http://localhost:3000") -> None:
        self._api_url = api_url.rstrip("/")
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
    def load_registration_case(self, tc_id: str) -> dict[str, Any]:
        """Reads one ``level=api`` row of ``fr01_registration.csv``.

        Fills ``{{UNIQUE}}`` and ``{{RUN}}``, drops the key named in ``omit_field``
        and returns a dictionary with:

        - ``body``: the register request body
        - ``expected_status``: ``expect_signal`` as an integer
        - ``expect_success``: ``True`` when ``expect_outcome`` is ``success``
        - ``login_probe``: whether logging in afterwards can tell if an account
          was written. It cannot when the email or password key was left out
        """
        with (DATA_DIR / "fr01_registration.csv").open(encoding="utf-8", newline="") as handle:
            rows = [row for row in csv.DictReader(handle) if row["tc_id"] == tc_id]
        if len(rows) != 1 or rows[0]["level"] != "api":
            raise AssertionError(f"fr01_registration.csv: expected one api row {tc_id}")
        row = rows[0]
        run = str(self._unique_stamp())
        email = row["email"].replace("{{RUN}}", run)
        if email == "{{UNIQUE}}":
            email = self.unique_email(tc_id)
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
            "login_probe": row["omit_field"] not in ("email", "password"),
        }

    @keyword
    def describe_response(self, response: Response) -> str:
        """Returns ``METHOD URL answered STATUS: BODY`` with passwords and tokens hidden."""
        try:
            body = json.dumps(_redact(response.json()), ensure_ascii=False)
        except ValueError:
            body = response.text
        method = response.request.method
        return f"{method} {response.url} answered {response.status_code}: {body[:500]}"
