"""Python keywords for the EShop API suite."""

from __future__ import annotations

import socket
from urllib.parse import urlsplit

from robot.api.deco import keyword, library


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
