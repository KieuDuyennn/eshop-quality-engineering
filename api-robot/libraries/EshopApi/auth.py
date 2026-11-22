"""Credentials, auth headers and JWT signing that never print a password or a token."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from collections.abc import Mapping
from typing import Any

from requests import Response
from robot.api.deco import keyword
from robot.libraries.BuiltIn import BuiltIn

MALFORMED_TOKEN = "not.a.valid.jwt"
NONEXISTENT_USER_ID = 2_147_483_647


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


class AuthKeywords:
    """Keywords that build request bodies and auth headers."""

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

        ``malformed_token`` is not a JWT at all. ``ghost``, ``expired_token``,
        ``signed_missing_role`` and ``signed_nonexistent_admin`` are signed with the
        SUT key from the ``SUT_JWT_SECRET`` environment variable, the same way the
        Playwright suite mints them.
        """
        if actor == "malformed_token":
            return _bearer(MALFORMED_TOKEN)
        claims = {
            "ghost": {"id": NONEXISTENT_USER_ID, "role": "user"},
            "expired_token": {"id": 1, "role": "admin", "exp": int(time.time()) - 3600},
            "signed_missing_role": {"id": 1, "email": self._admin_email},
            "signed_nonexistent_admin": {
                "id": NONEXISTENT_USER_ID,
                "email": f"missing.{self._unique_stamp()}@example.com",
                "role": "admin",
            },
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
