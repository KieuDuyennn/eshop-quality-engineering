"""Python keywords for the EShop API suite."""

from __future__ import annotations

import json
import socket
from collections.abc import Mapping
from urllib.parse import urlsplit

from requests import Response
from robot.api.deco import keyword, library


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
    """Keywords that drive the EShop API from Python."""

    def __init__(self, api_url: str = "http://localhost:3000") -> None:
        self._api_url = api_url.rstrip("/")

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

    @keyword
    def describe_response(self, response: Response) -> str:
        """Returns ``METHOD URL answered STATUS: BODY`` with passwords and tokens hidden."""
        try:
            body = json.dumps(_redact(response.json()), ensure_ascii=False)
        except ValueError:
            body = response.text
        method = response.request.method
        return f"{method} {response.url} answered {response.status_code}: {body[:500]}"
