#!/usr/bin/env python3
"""OmniFit meal-scan API (hosted). Keeps XAI_API_KEY server-side only."""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request

try:
    import certifi

    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CTX = ssl.create_default_context()

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8787))
XAI_URL = "https://api.x.ai/v1/chat/completions"
MODEL = os.environ.get("XAI_MODEL", "grok-4.6")
MAX_BODY = 8 * 1024 * 1024
# Comma-separated origins, or * for any (dev only). Default allows Capacitor + local.
CORS_ORIGINS = [
    o.strip()
    for o in (os.environ.get("CORS_ORIGINS") or "*,capacitor://localhost,http://localhost,http://127.0.0.1").split(",")
    if o.strip()
]

SYSTEM = """You are a careful nutrition analyst estimating a meal from a photograph.
Use USDA-style values for cooked food. Identify only foods that are actually visible.
Estimate portion size from visual cues (typical 10.5-inch dinner plate, utensils, hands, packaging labels).
If a nutrition label is readable, prefer it. Include drinks in frame.
Do not invent hidden ingredients unless they are visually obvious (oil sheen, sauce, cheese).
Round calories to the nearest 5 and macros to the nearest 1 gram.
If uncertain, lower confidence and state assumptions in notes.
Return JSON only with this shape:
{
  "name": "short meal name",
  "confidence": 0.0,
  "items": [{"name": "food", "portion": "estimated amount", "cal": 0, "p": 0, "c": 0, "f": 0}],
  "cal": 0,
  "p": 0,
  "c": 0,
  "f": 0,
  "notes": "assumptions"
}
cal, p, c, f on the root object are totals for the whole meal.
p = protein grams, c = carbohydrate grams, f = fat grams."""


def load_dotenv():
    for path in (ROOT / ".env", ROOT.parent / ".env", Path.home() / ".grok" / ".env"):
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


load_dotenv()


def api_key():
    # Prefer exact name; also accept common casing mistakes from dashboards.
    for name in ("XAI_API_KEY", "XAI_KEY", "GROK_API_KEY"):
        val = (os.environ.get(name) or "").strip()
        if val:
            return val
    for key, val in os.environ.items():
        if key.upper().replace("-", "_") == "XAI_API_KEY":
            val = (val or "").strip()
            if val:
                return val
    return ""


def extract_json(text):
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("No JSON object in model response")
    return json.loads(text[start : end + 1])


def num(v, default=0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def normalize(data):
    items = []
    for item in data.get("items") or []:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "Food").strip()[:80]
        items.append(
            {
                "name": name or "Food",
                "portion": str(item.get("portion") or "").strip()[:80],
                "cal": int(round(num(item.get("cal")))),
                "p": int(round(num(item.get("p")))),
                "c": int(round(num(item.get("c")))),
                "f": int(round(num(item.get("f")))),
            }
        )
    cal = int(round(num(data.get("cal"), sum(i["cal"] for i in items))))
    p = int(round(num(data.get("p"), sum(i["p"] for i in items))))
    c = int(round(num(data.get("c"), sum(i["c"] for i in items))))
    f = int(round(num(data.get("f"), sum(i["f"] for i in items))))
    conf = max(0.0, min(1.0, num(data.get("confidence"), 0.5)))
    name = str(data.get("name") or "Scanned meal").strip()[:80] or "Scanned meal"
    notes = str(data.get("notes") or "").strip()[:400]
    return {
        "name": name,
        "confidence": round(conf, 2),
        "items": items,
        "cal": max(0, cal),
        "p": max(0, p),
        "c": max(0, c),
        "f": max(0, f),
        "notes": notes,
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def cors(self):
        origin = self.headers.get("Origin") or ""
        allow = "*"
        if "*" not in CORS_ORIGINS and origin:
            allow = origin if origin in CORS_ORIGINS else CORS_ORIGINS[0]
        elif origin and "*" not in CORS_ORIGINS:
            allow = CORS_ORIGINS[0] if CORS_ORIGINS else "*"
        if "*" in CORS_ORIGINS:
            allow = origin or "*"
        self.send_header("Access-Control-Allow-Origin", allow)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Vary", "Origin")

    def send_json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/health", "/api/status"):
            key = api_key()
            self.send_json(
                200,
                {
                    "ok": True,
                    "scan": bool(key),
                    "key_len": len(key),
                    "model": MODEL,
                    "service": "omnifit-meal-scan",
                },
            )
            return
        self.send_json(404, {"error": "not_found", "message": "Not found"})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/scan-meal":
            self.scan_meal()
            return
        self.send_json(404, {"error": "not_found", "message": "Not found"})

    def read_json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            raise ValueError("Request too large")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def scan_meal(self):
        key = api_key()
        if not key:
            self.send_json(
                503,
                {
                    "error": "missing_key",
                    "message": "Set XAI_API_KEY on the host to enable meal scan.",
                },
            )
            return
        try:
            payload = self.read_json_body()
        except Exception:
            self.send_json(400, {"error": "bad_request", "message": "Could not read the photo."})
            return
        image = str(payload.get("image") or "")
        if not image.startswith("data:image/"):
            self.send_json(400, {"error": "bad_image", "message": "Send a JPEG or PNG photo."})
            return
        if len(image) > MAX_BODY:
            self.send_json(400, {"error": "too_large", "message": "Photo is too large. Try a closer shot."})
            return
        note = str(payload.get("note") or "").strip()[:200]
        user_text = "Estimate calories and macros for the meal in this photo."
        if note:
            user_text += " Extra context from the user: " + note
        req_body = {
            "model": MODEL,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": image, "detail": "high"},
                        },
                        {"type": "text", "text": user_text},
                    ],
                },
            ],
        }
        req = urllib.request.Request(
            XAI_URL,
            data=json.dumps(req_body).encode("utf-8"),
            headers={
                "Authorization": "Bearer " + key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180, context=SSL_CTX) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")[:300]
            sys.stderr.write("scan_meal HTTP %s %s\n" % (e.code, detail.replace("\n", " ")))
            self.send_json(502, {"error": "upstream", "message": "Scan failed. Try another photo."})
            return
        except Exception as e:
            sys.stderr.write("scan_meal %s: %s\n" % (type(e).__name__, e))
            self.send_json(502, {"error": "upstream", "message": "Could not reach the scan service."})
            return
        try:
            content = raw["choices"][0]["message"]["content"]
            if isinstance(content, list):
                content = "".join(
                    part.get("text", "") if isinstance(part, dict) else str(part) for part in content
                )
            result = normalize(extract_json(content))
        except Exception:
            self.send_json(502, {"error": "parse", "message": "Could not read macros from the scan."})
            return
        self.send_json(200, result)


if __name__ == "__main__":
    if not api_key():
        print("WARNING: XAI_API_KEY is not set — /api/scan-meal will return 503", file=sys.stderr)
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"OmniFit meal-scan API on http://0.0.0.0:{PORT}/")
    print("POST /api/scan-meal  GET /api/status")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
