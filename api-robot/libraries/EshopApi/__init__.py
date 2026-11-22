"""Python keywords for the EShop API suite.

Reads the test design files the Playwright suite also uses, builds request bodies
and auth headers that never print a password or a token, and sends the concurrent
cancel requests that RequestsLibrary cannot send in parallel.
"""

from __future__ import annotations

from robot.api.deco import library

from .auth import AuthKeywords
from .data import DataKeywords
from .http import HttpKeywords


@library(scope="GLOBAL", auto_keywords=False)
class EshopApi(AuthKeywords, DataKeywords, HttpKeywords):
    """Keywords that read the EShop test design files and drive the API.

    Cases are read from ``e2e/automation/data``, the same files the Playwright
    suite reads, so both suites run the same inputs against the same expectations.
    Bodies and headers that hold a password or a token are returned as dictionaries
    whose logged form shows ``***`` instead.
    """

    def __init__(
        self,
        api_url: str = "http://localhost:3000",
        admin_email: str = "admin@eshop.com",
        request_timeout: float = 10,
    ) -> None:
        self._api_url = api_url.rstrip("/")
        self._admin_email = admin_email
        self._request_timeout = float(request_timeout)
        self._last_stamp = 0
