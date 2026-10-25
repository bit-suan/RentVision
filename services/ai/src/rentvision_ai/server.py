from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from pydantic import ValidationError

from rentvision_ai.assist import assist_listing
from rentvision_ai.extraction import extract_lease, get_lease
from rentvision_ai.models import LeaseQARequest, ListingAssistRequest
from rentvision_ai.qa import answer_question


class RentVisionAIHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        print("%s - %s" % (self.address_string(), format % args))

    def _send(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send(200, {"status": "ok"})
            return
        parts = parsed.path.strip("/").split("/")
        if parts[:3] == ["api", "v1", "leases"] and len(parts) == 4:
            lease = get_lease(parts[3])
            self._send(200, lease.model_dump())
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/")

        try:
            if parts == ["api", "v1", "listings", "assist"]:
                payload = ListingAssistRequest.model_validate_json(raw)
                result = assist_listing(payload)
                self._send(200, result.model_dump())
                return

            if parts[:3] == ["api", "v1", "leases"] and parts[-1] == "extract" and len(parts) == 5:
                lease = extract_lease(parts[3], raw)
                self._send(200, lease.model_dump())
                return

            if parts[:3] == ["api", "v1", "leases"] and parts[-1] == "qa" and len(parts) == 5:
                request = LeaseQARequest.model_validate_json(raw)
                result = answer_question(parts[3], request.question)
                self._send(200, result.model_dump(by_alias=True))
                return
        except ValidationError as exc:
            self._send(400, {"error": "validation_error", "details": json.loads(exc.json())})
            return

        self._send(404, {"error": "not_found"})


def create_server(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), RentVisionAIHandler)


def main() -> None:
    server = create_server()
    print("RentVision AI service listening on http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
