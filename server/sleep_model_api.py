from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.model.predictor import parse_payload

HOST = "127.0.0.1"
PORT = 8787
MAX_BODY_BYTES = 32_000


class SleepModelHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/sleep-prediction":
            self._send(404, {"error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                self._send(413 if length > MAX_BODY_BYTES else 400, {"error": "Invalid request size"})
                return
            result = parse_payload(self.rfile.read(length))
            self._send(200, result)
        except ValueError as error:
            self._send(400, {"error": str(error)})
        except Exception:
            self._send(500, {"error": "The sleep model could not process this request."})

    def do_OPTIONS(self):
        self._send(204, {})

    def _send(self, status, body):
        encoded = json.dumps(body, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), SleepModelHandler).serve_forever()
