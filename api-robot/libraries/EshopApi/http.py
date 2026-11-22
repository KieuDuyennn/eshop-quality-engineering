"""HTTP helpers that RequestsLibrary does not cover."""

from __future__ import annotations

import http.client
import json
import socket
import threading
from collections.abc import Mapping
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit

from requests import Response
from robot.api.deco import keyword

from .auth import _redact


class HttpKeywords:
    """Keywords that check the API port, describe responses and race cancels."""

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
