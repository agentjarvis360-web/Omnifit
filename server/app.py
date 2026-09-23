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
import urllib.parse
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

SYSTEM = """Estimate a meal from one photo. Be brief. Only foods you can see. USDA-style cooked values.
Return JSON only:
{"name":"short meal name","confidence":0.0,"items":[{"name":"food","portion":"amount","cal":0,"p":0,"c":0,"f":0}],"cal":0,"p":0,"c":0,"f":0,"notes":"short"}
Root cal/p/c/f are meal totals (kcal and grams). Round cal to 5, macros to 1g. Max 6 items."""


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
    # Render / platform secret files (filename = XAI_API_KEY)
    for path in (
        Path("/etc/secrets/XAI_API_KEY"),
        Path("/etc/secrets/xai_api_key"),
        ROOT / "XAI_API_KEY",
    ):
        try:
            if path.is_file():
                val = path.read_text(encoding="utf-8").strip()
                if val:
                    return val
        except Exception:
            pass
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


SEARCH_TIMEOUT = 10
OFF_USER_AGENT = "OmniFitFoodSearch/1.0 (+https://omnifit.app)"
SSL_CTX = ssl.create_default_context()

def fdc_api_key():
    # USDA FoodData Central: use real key if set, else DEMO_KEY (rate-limited but works).
    return (os.environ.get("FDC_API_KEY") or "DEMO_KEY").strip()


def http_get_json(url, headers=None, timeout=SEARCH_TIMEOUT):
    req = urllib.request.Request(
        url,
        headers=headers or {"User-Agent": OFF_USER_AGENT, "Accept": "application/json"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode("utf-8"))


def kcal_from_off_nutrients(nutriments, product=None):
    """Prefer energy-kcal; fall back to kJ."""
    if not isinstance(nutriments, dict):
        nutriments = {}
    for key in (
        "energy-kcal_serving",
        "energy-kcal",
        "energy-kcal_100g",
        "energy-kcal_value",
    ):
        if key in nutriments and nutriments[key] not in (None, ""):
            return num(nutriments[key])
    for key in ("energy_serving", "energy", "energy_100g"):
        if key in nutriments and nutriments[key] not in (None, ""):
            # assume kJ if large
            v = num(nutriments[key])
            if v > 200:  # likely kJ
                return v / 4.184
            return v
    return 0


def macro_from_off(nutriments, kind):
    for key in (f"{kind}_serving", kind, f"{kind}_100g"):
        if key in nutriments and nutriments[key] not in (None, ""):
            return num(nutriments[key])
    return 0


def off_product_to_food(product):
    if not isinstance(product, dict):
        return None
    name_bits = [
        product.get("brands") or product.get("brand") or "",
        product.get("product_name") or product.get("product_name_en") or "",
    ]
    name = " ".join(str(b).strip() for b in name_bits if b).strip()
    if not name:
        name = str(product.get("generic_name") or "").strip()
    if not name:
        return None
    nutriments = product.get("nutriments") or {}
    cal = kcal_from_off_nutrients(nutriments, product)
    p = macro_from_off(nutriments, "proteins")
    c = macro_from_off(nutriments, "carbohydrates")
    f = macro_from_off(nutriments, "fat")
    if cal <= 0 and p <= 0 and c <= 0 and f <= 0:
        return None
    code = product.get("code") or product.get("_id") or name
    return {
        "id": "off:" + str(code),
        "name": name[:120],
        "cal": int(round(cal)),
        "p": int(round(p)),
        "c": int(round(c)),
        "f": int(round(f)),
    }


def search_open_food_facts(q, limit=10):
    params = urllib.parse.urlencode(
        {
            "search_terms": q,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": max(limit, 15),
            "fields": "code,product_name,product_name_en,brands,generic_name,nutriments",
        }
    )
    url = "https://world.openfoodfacts.org/cgi/search.pl?" + params
    data = None
    last_err = None
    for attempt in range(2):
        try:
            data = http_get_json(url, timeout=SEARCH_TIMEOUT + (attempt * 4))
            break
        except Exception as e:
            last_err = e
            sys.stderr.write("off_search try%s %s: %s\n" % (attempt + 1, type(e).__name__, e))
    if data is None:
        if last_err:
            sys.stderr.write("off_search failed: %s\n" % last_err)
        return []
    foods = []
    for product in data.get("products") or []:
        item = off_product_to_food(product)
        if item:
            foods.append(item)
        if len(foods) >= limit:
            break
    return foods


def fdc_energy_kcal(food):
    """Prefer nutrient 208 / unitName KCAL; convert KJ/1062 via /4.184. Never treat kJ as kcal."""
    nutrients = food.get("foodNutrients") or []
    kcal = None
    kj = None
    for n in nutrients:
        if not isinstance(n, dict):
            continue
        unit = str(n.get("unitName") or "").upper().strip()
        nid = str(n.get("nutrientNumber") or "")
        name = str(n.get("nutrientName") or "").lower()
        val = num(n.get("value"))
        if val <= 0:
            continue
        if unit == "KCAL" or nid == "208":
            kcal = val
            break
        if unit in ("KJ", "KJOULE", "KJOULES") or nid in ("1062", "268"):
            if kj is None:
                kj = val
        elif "energy" in name and unit == "KCAL":
            kcal = val
            break
        elif "energy" in name and unit in ("KJ", "KJOULE", "KJOULES"):
            if kj is None:
                kj = val
    if kcal is not None:
        return kcal
    if kj is not None:
        return kj / 4.184
    return 0


def search_fdc(q, limit=10):
    key = fdc_api_key()
    if not key:
        return []
    params = urllib.parse.urlencode(
        {
            "query": q,
            "pageSize": limit,
            "dataType": "Branded,Foundation,SR Legacy",
            "api_key": key,
        }
    )
    url = "https://api.nal.usda.gov/fdc/v1/foods/search?" + params
    try:
        data = http_get_json(url)
    except Exception as e:
        sys.stderr.write("fdc_search %s: %s\n" % (type(e).__name__, e))
        return []
    foods = []
    for food in data.get("foods") or []:
        desc = str(food.get("description") or "").strip()
        brand = str(food.get("brandOwner") or food.get("brandName") or "").strip()
        name = (brand + " " + desc).strip() if brand else desc
        if not name:
            continue
        nutrients = {
            n.get("nutrientName"): n.get("value")
            for n in (food.get("foodNutrients") or [])
            if isinstance(n, dict)
        }
        cal = fdc_energy_kcal(food)
        p = num(nutrients.get("Protein"))
        c = num(nutrients.get("Carbohydrate, by difference"))
        f = num(nutrients.get("Total lipid (fat)"))
        if cal <= 0 and p <= 0 and c <= 0 and f <= 0:
            continue
        fdc_id = food.get("fdcId") or name
        foods.append(
            {
                "id": "fdc:" + str(fdc_id),
                "name": name[:120],
                "cal": int(round(cal)),
                "p": int(round(p)),
                "c": int(round(c)),
                "f": int(round(f)),
            }
        )
        if len(foods) >= limit:
            break
    return foods


RESTAURANT_HINTS = (
    "chipotle", "mcdonald", "mcdonalds", "starbucks", "taco bell", "tacobell",
    "subway", "panera", "wendy", "wendys", "chick-fil-a", "chickfila", "in-n-out",
    "innout", "burger king", "burgerking", "whopper", "domino", "pizza hut",
    "pizzahut", "kfc", "popeyes", "sweetgreen", "cava", "shake shack",
    "five guys", "arby", "sonic", "dunkin", "jack in the box", "del taco",
    "panda express", "wingstop", "raising cane",
)
MEAL_HINTS = (
    "burrito", "bowl", "combo", "whopper", "meal", "grande", "venti", "value meal",
    "happy meal", "crunchwrap", "chalupa", "mcmuffin", "frappuccino", "latte",
    "nugget", "quarter pounder", "big mac", "fillet", "filet",
)


def query_looks_restaurant(q):
    ql = re.sub(r"[^a-z0-9\s]+", " ", (q or "").lower()).strip()
    if not ql:
        return False
    for hint in RESTAURANT_HINTS:
        if hint in ql:
            return True
    tokens = ql.split()
    for hint in MEAL_HINTS:
        if " " in hint:
            if hint in ql:
                return True
        elif hint in tokens:
            return True
    return False


def slugify_est(name):
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (s or "food")[:60]


def search_estimate(q, limit=6):
    """Grok estimate fill for restaurant-like / thin FDC+OFF results. ids: est:<slug>."""
    key = api_key()
    if not key:
        return []
    prompt = (
        "You estimate typical US restaurant/menu nutrition. Query: %r\n"
        "Return JSON only: {\"foods\":[{\"name\":\"Brand Item\",\"cal\":0,\"p\":0,\"c\":0,\"f\":0,\"portion\":\"typical serving\"}]}\n"
        "Up to %d plausible matches for what the user likely wants. Use published-ish brand names when clear "
        "(e.g. Chipotle Chicken Burrito). cal=kcal integers; p/c/f grams integers. No markdown."
    ) % (q, limit)
    req_body = {
        "model": MODEL,
        "temperature": 0,
        "max_tokens": 700,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You return nutrition estimates as JSON only. No prose.",
            },
            {"role": "user", "content": prompt},
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
        with urllib.request.urlopen(req, timeout=25, context=SSL_CTX) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
        content = raw["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part) for part in content
            )
        data = extract_json(content)
    except Exception as e:
        sys.stderr.write("estimate_search %s: %s\n" % (type(e).__name__, e))
        return []
    foods = []
    for it in data.get("foods") or []:
        if not isinstance(it, dict):
            continue
        name = str(it.get("name") or "").strip()
        if not name:
            continue
        cal = int(round(num(it.get("cal"))))
        p = int(round(num(it.get("p"))))
        c = int(round(num(it.get("c"))))
        f = int(round(num(it.get("f"))))
        if cal <= 0 and p <= 0 and c <= 0 and f <= 0:
            continue
        foods.append(
            {
                "id": "est:" + slugify_est(name),
                "name": name[:120],
                "cal": cal,
                "p": p,
                "c": c,
                "f": f,
            }
        )
        if len(foods) >= limit:
            break
    return foods


def search_foods(q):
    q = (q or "").strip()[:80]
    if len(q) < 2:
        return [], []
    results = []
    seen = set()
    sources = []
    restaurant = query_looks_restaurant(q)

    def add_all(items, source):
        added = 0
        for it in items:
            key = re.sub(r"[^a-z0-9]+", " ", (it.get("name") or "").lower()).strip()
            if not key or key in seen:
                continue
            seen.add(key)
            results.append(it)
            added += 1
        if added and source not in sources:
            sources.append(source)

    # Order: FDC first; for restaurant-like queries estimate BEFORE Open Food Facts
    # so grocery OFF hits do not burn the request budget and crowd out menu items.
    add_all(search_fdc(q, limit=6 if restaurant else 8), "fdc")
    if restaurant:
        add_all(search_estimate(q, limit=6), "estimate")
        off_budget = min(4, max(0, 15 - len(results)))
        if off_budget:
            add_all(search_open_food_facts(q, limit=off_budget), "off")
    else:
        off_budget = max(0, 15 - len(results))
        if off_budget:
            add_all(search_open_food_facts(q, limit=off_budget), "off")
        if len(results) < 5:
            add_all(search_estimate(q, limit=min(6, 15 - len(results))), "estimate")
    return results[:15], sources


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
            hints = sorted(
                k
                for k in os.environ
                if "XAI" in k.upper() or k.upper() in ("API_KEY", "GROK_API_KEY", "XAI_KEY")
            )
            secret_files = [
                str(path)
                for path in (Path("/etc/secrets/XAI_API_KEY"), Path("/etc/secrets/xai_api_key"))
                if path.is_file()
            ]
            self.send_json(
                200,
                {
                    "ok": True,
                    "scan": bool(key),
                    "key_len": len(key),
                    "env_hints": hints,
                    "secret_files": secret_files,
                    "env_count": len(os.environ),
                    "model": MODEL,
                    "service": "omnifit-meal-scan",
                    "search": True,
                    "fdc": bool(fdc_api_key()),
                    "estimate": bool(key),
                },
            )
            return
        if path == "/api/search-food":
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query or "")
            q = (qs.get("q") or [""])[0]
            try:
                foods, sources = search_foods(q)
            except Exception as e:
                sys.stderr.write("search_food %s: %s\n" % (type(e).__name__, e))
                # Still 200 with empty list so the app can show local foods without "unavailable".
                self.send_json(200, {"foods": [], "sources": [], "error": "search_failed", "message": "Search failed."})
                return
            self.send_json(200, {"foods": foods, "sources": sources})
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
            "max_tokens": 500,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": image, "detail": "low"},
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
            with urllib.request.urlopen(req, timeout=75, context=SSL_CTX) as resp:
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
