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
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, wait

try:
    import certifi

    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CTX = ssl.create_default_context()

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8787))
XAI_URL = "https://api.x.ai/v1/chat/completions"
MODEL = os.environ.get("XAI_MODEL", "grok-4.6")
# grok-4.6 defaults to reasoning_effort "high" (~60s+ per photo). Scan/estimate are simple
# extraction tasks, so ask for low effort. Set XAI_REASONING_EFFORT="" to send nothing.
REASONING_EFFORT = os.environ.get("XAI_REASONING_EFFORT", "low").strip()
ESTIMATE_MODEL = os.environ.get("XAI_ESTIMATE_MODEL", MODEL)
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


SEARCH_TIMEOUT = 4  # per-source HTTP timeout (sources run in parallel)
SEARCH_BUDGET = float(os.environ.get("FOOD_SEARCH_BUDGET", "4.5"))  # wall-clock cap for FDC/OFF
ESTIMATE_TIMEOUT = float(os.environ.get("FOOD_ESTIMATE_TIMEOUT", "8"))
FDC_API_BASE = (os.environ.get("FDC_API_BASE") or "https://api.nal.usda.gov/fdc/v1").rstrip("/")
OFF_USER_AGENT = "OmniFitFoodSearch/1.0 (+https://omnifit.app)"
SSL_CTX = ssl.create_default_context()
SEARCH_POOL = ThreadPoolExecutor(max_workers=16)

# ---------------------------------------------------------------------------
# Domain type. Every source is normalized into this shape before ranking:
# FoodResult = {
#   id, name, brand, source ("fdc"|"off"|"curated"|"estimate"), dataType,
#   servingLabel, servingGrams, kcalPerServing, kcalPer100g,
#   protein, carbs, fat           (grams per serving)
#   cal, p, c, f                  (= per-serving values; kept for existing clients)
#   score                         (relevance, higher is better)
# }
# ---------------------------------------------------------------------------
GENERIC_TYPES = ("Foundation", "SR Legacy", "Survey (FNDDS)")


def food_result(id, name, source, kcal100=None, p100=None, c100=None, f100=None, serving_grams=None,
                serving_label="", brand="", data_type="", kcal_serving=None, p=None, c=None, f=None):
    """Build a FoodResult. Give per-100g values (+ serving grams) or explicit per-serving values."""
    per100 = kcal100 is not None
    if per100:
        g = serving_grams if serving_grams and serving_grams > 0 else 100.0
        factor = g / 100.0
        kcal_serving = kcal100 * factor
        p, c, f = (num(p100) * factor, num(c100) * factor, num(f100) * factor)
        if not serving_label:
            serving_label = "100 g"
        serving_grams = g
    kcal_serving = num(kcal_serving)
    if kcal_serving <= 0 and num(p) <= 0 and num(c) <= 0 and num(f) <= 0:
        return None
    atwater = 4 * num(p) + 4 * num(c) + 9 * num(f)
    if (per100 and kcal100 > 902) or (kcal_serving <= 0 and atwater > 5):
        return None  # bad label data: >900 kcal/100 g (pure fat is ~900) or 0 kcal with macros
    out = {
        "id": id,
        "name": str(name)[:120],
        "brand": str(brand or "")[:80],
        "source": source,
        "dataType": data_type,
        "servingLabel": serving_label or "1 serving",
        "servingGrams": round(serving_grams, 1) if serving_grams else None,
        "kcalPerServing": int(round(kcal_serving)),
        "kcalPer100g": int(round(kcal100)) if per100 else None,
        "protein": int(round(num(p))),
        "carbs": int(round(num(c))),
        "fat": int(round(num(f))),
        "score": 0.0,
    }
    out.update(cal=out["kcalPerServing"], p=out["protein"], c=out["carbs"], f=out["fat"])
    return out


class SourceError(Exception):
    pass


def fdc_api_key():
    # USDA FoodData Central: use real key if set, else DEMO_KEY (rate-limited: ~30 req/h per IP).
    return (os.environ.get("FDC_API_KEY") or "DEMO_KEY").strip()


def http_get_json(url, headers=None, timeout=SEARCH_TIMEOUT, body=None):
    """GET (or POST when body is given) JSON. Errors become SourceError; the URL is never logged."""
    hdrs = headers or {"User-Agent": OFF_USER_AGENT, "Accept": "application/json"}
    if body is not None:
        hdrs = dict(hdrs, **{"Content-Type": "application/json"})
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=hdrs,
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SourceError("rate_limited" if e.code == 429 else "http_%s" % e.code)
    except (TimeoutError, OSError) as e:
        if "timed out" in str(e).lower() or isinstance(e, TimeoutError):
            raise SourceError("timeout")
        raise SourceError("network")


def off_product_to_food(product):
    """Open Food Facts nutriments are per 100 g; serving_quantity is grams when present."""
    if not isinstance(product, dict):
        return None
    brand = str(product.get("brands") or "").split(",")[0].strip()
    pname = str(product.get("product_name_en") or product.get("product_name") or product.get("generic_name") or "").strip()
    if not pname:
        return None
    n = product.get("nutriments") or {}
    kcal100 = num(n.get("energy-kcal_100g"), None)
    if kcal100 is None and n.get("energy_100g") not in (None, ""):
        kcal100 = num(n.get("energy_100g")) / 4.184  # energy_100g is kJ
    if kcal100 is None:
        return None
    grams = num(product.get("serving_quantity"), 0)
    label = str(product.get("serving_size") or "").strip()[:40]
    if grams <= 0 or grams > 2000:
        grams, label = 100.0, "100 g"
    code = product.get("code") or pname
    return food_result(
        "off:" + str(code), (brand + " " + pname).strip() if brand and brand.lower() not in pname.lower() else pname,
        "off", kcal100, n.get("proteins_100g"), n.get("carbohydrates_100g"), n.get("fat_100g"),
        grams, label or "%g g" % grams, brand=brand, data_type="Open Food Facts",
    )


def search_open_food_facts(q, limit=10):
    params = urllib.parse.urlencode(
        {
            "search_terms": q,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": max(limit, 15),
            "fields": "code,product_name,product_name_en,brands,generic_name,nutriments,serving_size,serving_quantity",
        }
    )
    data = http_get_json("https://world.openfoodfacts.org/cgi/search.pl?" + params)  # one try, short timeout
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


GOOD_PORTION_WORDS = ("medium", "large", "breast", "piece", "slice", "cup", "tbsp", "oz", "egg", "fillet", "patty", "item")


def fdc_serving(food, q_tokens):
    """(grams, label). Branded: label serving size. Generic: a sensible household portion, else 100 g."""
    if food.get("dataType") == "Branded":
        size = num(food.get("servingSize"), 0)
        unit = str(food.get("servingSizeUnit") or "").lower()
        if size > 0 and unit in ("g", "grm", "gm", "ml", "mlt"):
            hh = str(food.get("householdServingFullText") or "").strip()
            label = ("%s (%g %s)" % (hh, size, "ml" if unit.startswith("ml") else "g")) if hh else "%g g" % size
            return size, label[:40]
        return 100.0, "100 g"
    measures = []
    for m in (food.get("foodMeasures") or food.get("foodPortions") or []):
        if not isinstance(m, dict):
            continue
        g = num(m.get("gramWeight"), 0)
        text = str(m.get("disseminationText") or m.get("portionDescription") or m.get("modifier") or "").strip()
        if g <= 0 or g > 1500 or not text or "quantity not specified" in text.lower() or "racc" in text.lower() or text.lower() == "undetermined":
            continue
        tl = text.lower()
        pref = 0
        if " ".join(q_tokens) in tl or any(t in tl for t in q_tokens if len(t) > 3):
            pref -= 3
        if "yield" in tl or "fl oz" in tl:
            pref += 2
        if "medium" in tl:
            pref -= 2
        if any(w in tl for w in GOOD_PORTION_WORDS):
            pref -= 1
        measures.append((pref, num(m.get("rank"), 99), g, text))
    if measures:
        measures.sort(key=lambda x: (x[0], x[1]))
        _, _, g, text = measures[0]
        return g, ("%s (%g g)" % (text, round(g)))[:48]
    return 100.0, "100 g"


def fdc_add_portions(items, q, timeout=3.0):
    """Live /foods/search returns no foodMeasures for SR Legacy/Foundation, so those show "100 g".
    One batched POST /foods call fetches foodPortions for the top few and swaps in a household serving."""
    need = [it for it in items if it.get("source") == "fdc" and it.get("dataType") in ("SR Legacy", "Foundation")
            and it.get("servingLabel") == "100 g" and it.get("_n100")][:10]
    if not need:
        return
    ids = [int(it["id"].split(":", 1)[1]) for it in need if it["id"].split(":", 1)[1].isdigit()]
    data = http_get_json(
        FDC_API_BASE + "/foods?" + urllib.parse.urlencode({"api_key": fdc_api_key()}),
        timeout=timeout, body={"fdcIds": ids, "format": "full", "nutrients": [1008]},
    )
    portions = {}
    for food in data if isinstance(data, list) else []:
        meas = []
        for p in food.get("foodPortions") or []:
            unit = str((p.get("measureUnit") or {}).get("name") or "")
            desc = str(p.get("portionDescription") or "").strip()
            if not desc or desc.lower().startswith("quantity not specified"):
                bits = ["%g" % num(p.get("amount"), 1), "" if unit in ("", "undetermined") else unit, str(p.get("modifier") or "")]
                desc = " ".join(b for b in bits if b).strip()
            meas.append({"disseminationText": desc, "gramWeight": p.get("gramWeight"), "rank": p.get("sequenceNumber") or 99})
        portions[str(food.get("fdcId"))] = meas
    q_tokens = query_tokens(q)
    for it in need:
        meas = portions.get(it["id"].split(":", 1)[1])
        if not meas:
            continue
        grams, label = fdc_serving({"dataType": it["dataType"], "foodMeasures": meas}, q_tokens)
        if label == "100 g":
            continue
        k, p, c, f = it["_n100"]
        new = food_result(it["id"], it["name"], "fdc", k, p, c, f, grams, label, brand=it.get("brand"), data_type=it["dataType"])
        if new:
            new["score"] = it["score"]
            it.update(new)


def search_fdc(q, limit=10, data_types="Foundation,SR Legacy,Survey (FNDDS)"):
    key = fdc_api_key()
    if not key:
        return []
    # POST: the GET form intermittently returns nginx 400 for multi-dataType queries
    # (e.g. 'banana' pageSize 50, 'big mac' Survey) while the same POST body returns 200.
    data = http_get_json(
        FDC_API_BASE + "/foods/search?" + urllib.parse.urlencode({"api_key": key}),
        body={"query": q, "pageSize": limit, "dataType": [t.strip() for t in data_types.split(",")]},
    )
    q_tokens = query_tokens(q)
    foods = []
    for food in data.get("foods") or []:
        desc = str(food.get("description") or "").strip()
        if not desc:
            continue
        brand = str(food.get("brandName") or food.get("brandOwner") or "").strip() if food.get("dataType") == "Branded" else ""
        nutrients = {
            n.get("nutrientName"): n.get("value")
            for n in (food.get("foodNutrients") or [])
            if isinstance(n, dict)
        }
        grams, label = fdc_serving(food, q_tokens)
        item = food_result(
            "fdc:" + str(food.get("fdcId") or desc),
            (brand.title() + " " + desc.capitalize()) if brand else desc,
            "fdc",
            fdc_energy_kcal(food),  # FDC search nutrients are per 100 g (branded too)
            nutrients.get("Protein"),
            nutrients.get("Carbohydrate, by difference"),
            nutrients.get("Total lipid (fat)"),
            grams,
            label,
            brand=brand,
            data_type=str(food.get("dataType") or ""),
        )
        if item:
            item["_n100"] = (fdc_energy_kcal(food), num(nutrients.get("Protein")),
                             num(nutrients.get("Carbohydrate, by difference")), num(nutrients.get("Total lipid (fat)")))
            foods.append(item)
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


def query_names_chain(q):
    ql = re.sub(r"[^a-z0-9\s-]+", "", (q or "").lower())
    return any(h in ql for h in RESTAURANT_HINTS)


def slugify_est(name):
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (s or "food")[:60]



# Lightweight chain menu fallback (typical published values). Used when FDC/OFF miss
# and estimate is slow or rate-limited — keeps restaurant searches useful.
CURATED_RESTAURANT = [
    {"id": "cur:chip-burrito-chicken", "name": "Chipotle Chicken Burrito", "cal": 1030, "p": 54, "c": 101, "f": 44},
    {"id": "cur:chip-bowl-chicken", "name": "Chipotle Chicken Burrito Bowl", "cal": 630, "p": 46, "c": 56, "f": 24},
    {"id": "cur:chip-bowl-steak", "name": "Chipotle Steak Burrito Bowl", "cal": 620, "p": 48, "c": 53, "f": 24},
    {"id": "cur:chip-sofritas-bowl", "name": "Chipotle Sofritas Burrito Bowl", "cal": 580, "p": 26, "c": 67, "f": 24},
    {"id": "cur:chip-chips-guac", "name": "Chipotle Chips and Guacamole", "cal": 770, "p": 10, "c": 71, "f": 52},
    {"id": "cur:mcd-big-mac", "name": "McDonald's Big Mac", "cal": 590, "p": 25, "c": 46, "f": 34},
    {"id": "cur:mcd-qp", "name": "McDonald's Quarter Pounder with Cheese", "cal": 520, "p": 30, "c": 42, "f": 26},
    {"id": "cur:mcd-nuggets-10", "name": "McDonald's Chicken McNuggets (10 piece)", "cal": 410, "p": 24, "c": 26, "f": 24},
    {"id": "cur:sbux-latte", "name": "Starbucks Caffe Latte Grande", "cal": 190, "p": 13, "c": 18, "f": 7},
    {"id": "cur:sbux-bacon-gouda", "name": "Starbucks Bacon Gouda Sandwich", "cal": 360, "p": 18, "c": 34, "f": 17},
    {"id": "cur:tb-crunchwrap", "name": "Taco Bell Crunchwrap Supreme", "cal": 530, "p": 16, "c": 54, "f": 28},
    {"id": "cur:tb-bean-burrito", "name": "Taco Bell Bean Burrito", "cal": 380, "p": 13, "c": 55, "f": 11},
    {"id": "cur:cfa-sandwich", "name": "Chick-fil-A Chicken Sandwich", "cal": 440, "p": 29, "c": 41, "f": 19},
    {"id": "cur:ino-double", "name": "In-N-Out Double-Double", "cal": 670, "p": 37, "c": 41, "f": 41},
    {"id": "cur:sub-turkey", "name": "Subway Turkey Breast 6-inch", "cal": 280, "p": 18, "c": 46, "f": 4},
    {"id": "cur:pan-broccoli", "name": "Panera Broccoli Cheddar Soup Bowl", "cal": 360, "p": 13, "c": 30, "f": 21},
]


def search_curated_restaurant(q, limit=8):
    """Curated menu items as FoodResults (1 item servings). The ranker decides placement."""
    tokens = query_tokens(q)
    if not tokens:
        return []
    out = []
    for it in CURATED_RESTAURANT:
        words = name_words(it["name"])
        hits = sum(1 for t in tokens if token_hit(t, words))
        if hits >= max(1, len(tokens) - 1):
            out.append(food_result(it["id"], it["name"], "curated", serving_label="1 item",
                                   data_type="Restaurant", kcal_serving=it["cal"], p=it["p"], c=it["c"], f=it["f"]))
    return out[:limit]


def search_estimate(q, limit=6, timeout=ESTIMATE_TIMEOUT):
    """Grok estimate fill when real sources came back thin. ids: est:<slug>."""
    key = api_key()
    if not key:
        return []
    prompt = (
        "You estimate typical US nutrition for a food search. Query: %r\n"
        "Return JSON only: {\"foods\":[{\"name\":\"Brand Item\",\"cal\":0,\"p\":0,\"c\":0,\"f\":0,\"portion\":\"typical serving\"}]}\n"
        "Up to %d plausible matches for what the user likely wants. Use published-ish brand names when clear "
        "(e.g. Chipotle Chicken Burrito); otherwise a plain generic food. cal=kcal per portion, integers; "
        "p/c/f grams integers. No markdown."
    ) % (q, limit)
    req_body = {
        "model": ESTIMATE_MODEL,
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
    if REASONING_EFFORT:
        req_body["reasoning_effort"] = REASONING_EFFORT
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
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
        content = raw["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part) for part in content
            )
        data = extract_json(content)
    except Exception as e:
        sys.stderr.write("estimate_search %s: %s\n" % (type(e).__name__, e))
        raise SourceError("timeout" if "timed out" in str(e).lower() else "failed")
    foods = []
    for it in data.get("foods") or []:
        if not isinstance(it, dict):
            continue
        name = str(it.get("name") or "").strip()
        if not name:
            continue
        item = food_result(
            "est:" + slugify_est(name), name, "estimate",
            serving_label=str(it.get("portion") or "1 serving").strip()[:40], data_type="Estimate",
            kcal_serving=it.get("cal"), p=it.get("p"), c=it.get("c"), f=it.get("f"),
        )
        if item:
            foods.append(item)
        if len(foods) >= limit:
            break
    return foods


# ---------------------------------------------------------------------------
# Relevance ranking
# ---------------------------------------------------------------------------
STOP = {"and", "with", "or", "the", "a", "of", "in", "nfs", "ns", "as", "to", "only", "from", "not", "eaten"}
# Mutually exclusive main foods: "chicken" query should not surface turkey/beef items.
EXCLUSIVE = {"chicken", "turkey", "beef", "pork", "ham", "salmon", "tuna", "shrimp", "fish", "lamb", "tofu", "veal", "duck"}
PLAIN_FORMS = {"raw", "cooked", "roasted", "grilled", "baked", "boiled", "steamed", "broiled", "plain", "fresh", "regular"}
PROCESSED = {"dehydrated", "dried", "powder", "powdered", "canned", "frozen", "breaded", "fried", "babyfood", "baby",
             "infant", "formula", "juice", "chips", "chip", "flavored", "flavor", "nuggets", "patties", "patty", "strips",
             "sticks", "smoothie", "candy", "cereal", "bar", "bars", "cookie", "cookies", "bread", "muffin", "pie",
             "cake", "yogurt", "sauce", "dressing", "soup", "sandwich", "salad", "sausage", "deli", "luncheon",
             "lunchmeat", "sliced", "slices", "loaf", "roll", "spread", "mix", "drink", "beverage", "instant",
             "imitation", "substitute", "coated", "battered", "marinade", "ingredient", "fast", "diet", "entree",
             "microwaved", "uncooked", "added", "solution"}
DRY_WHEN_RAW = {"rice", "oat", "oats", "oatmeal", "pasta", "spaghetti", "macaroni", "noodle", "noodles", "quinoa",
                "barley", "bean", "beans", "lentil", "lentils", "flour", "egg", "eggs"}
COOKED = {"cooked", "roasted", "grilled", "baked", "boiled", "steamed", "broiled", "braised", "stewed", "poached"}


def name_words(name):
    return [w for w in re.sub(r"[^a-z0-9]+", " ", (name or "").lower().replace("'", "")).split() if w]


def query_tokens(q):
    return [t for t in name_words(q) if t not in STOP]


def token_hit(t, words):
    """Whole word, or word-prefix/plural for tokens of 4+ chars ('banana' ~ 'bananas', 'mac' != 'macaroni')."""
    for w in words:
        if w == t:
            return True
        if len(t) >= 4 and (w.startswith(t) or (t.endswith("s") and w == t[:-1])):
            return True
        if len(t) >= 3 and t.endswith("es") and w == t[:-2]:  # "eggs"~"egg" handled above; "tomatoes"
            return True
    return False


def src_is_chain(normalized_name):
    padded = " " + normalized_name + " "
    return any((" " + re.sub(r"[^a-z0-9]+", " ", h).strip() + " ") in padded for h in RESTAURANT_HINTS)


def score_food(item, q, tokens, restaurant, brand_query):
    """Higher is better; None means drop (irrelevant)."""
    name = item.get("name") or ""
    words = name_words(name)
    if not tokens or not words:
        return None
    hits = [t for t in tokens if token_hit(t, words)]
    if not hits:
        return None
    coverage = len(hits) / len(tokens)
    s = 60.0 * coverage
    if coverage < 1:
        s -= 25  # partial matches ("Kit Kat Big Kat" for 'big mac') sink below full matches
    qn = " ".join(name_words(q))
    nn = " ".join(words)
    desc_words = name_words(item.get("name", "")[len(item.get("brand") or ""):]) if item.get("brand") else words
    # Store brands often use the query itself as the description ("Grilled chicken" burrito);
    # give them half the name-match bonus unless the user asked for a brand.
    nb = 0.5 if (item.get("source") == "off" or item.get("dataType") == "Branded") and not brand_query else 1.0
    if nn == qn or " ".join(desc_words) == qn:
        s += 30 * nb
    elif nn.startswith(qn) or " ".join(desc_words).startswith(qn):
        s += 15 * nb
    elif len(tokens) > 1 and qn in nn:
        s += 10 * nb  # whole phrase in order: "... spaghetti with meat sauce"
    elif len(tokens) > 1 and any(len(t) <= 3 for t in tokens):
        s -= 8  # short-word names ('big mac') are phrases: "Mac & ... big bowl" is not a Big Mac
    qw = name_words(q)
    if "with" in qw and "with" in words:
        # Role inversion: 'spaghetti with meat sauce' should not rank "Spaghetti sauce with meat"
        # (a sauce) first: a word the user put after "with" appears before "with" in the item.
        after_q = set(qw[qw.index("with") + 1:])
        if after_q.intersection(words[:words.index("with")]):
            s -= 15
    if desc_words and tokens and token_hit(tokens[0], desc_words[:1]):
        s += 8  # head noun first: "Chicken breast, ..." vs "Salad with chicken breast"
    extra = [w for w in desc_words if w not in STOP and not any(token_hit(t, [w]) for t in tokens) and not w.isdigit()]
    s -= min(20, 1.5 * len([w for w in extra if w not in PLAIN_FORMS]))
    ex_q = EXCLUSIVE.intersection(tokens)
    if ex_q and (EXCLUSIVE.intersection(words) - ex_q):
        s -= 35  # e.g. turkey item for 'chicken breast'
    s -= 12 * len(PROCESSED.intersection(extra))  # processed forms the user did not ask for
    if PLAIN_FORMS.intersection(words):
        s += 6
    if ex_q and "raw" in words and not COOKED.intersection(words) and "raw" not in tokens:
        s -= 10  # meat queries: people log cooked meat
    elif not ex_q and "raw" in words and not COOKED.intersection(words) and not DRY_WHEN_RAW.intersection(tokens):
        s += 4  # produce: "Banana, raw" over "Banana, baked"
    if "nfs" in words or "ns as to" in nn or "skin not eaten" in nn or "skinless" in words:
        s += 3  # FNDDS generic defaults / lean default
    if not restaurant and src_is_chain(nn):
        s -= 15  # "McDONALD'S, Bacon Ranch Salad with Grilled Chicken" for a plain 'grilled chicken'
    src, dt = item.get("source"), item.get("dataType") or ""
    if src == "curated":
        s += 40 if restaurant else 5
    elif src == "fdc" and dt in GENERIC_TYPES:
        s += 5 if (restaurant or brand_query) else 30  # generics are the default for plain/homemade queries
        if dt == "Survey (FNDDS)":
            s += 2
    elif src == "estimate":
        s += 10 if restaurant else -15
    elif src == "off":
        s -= 8
    brand = (item.get("brand") or "").lower()
    if brand:
        bw = name_words(brand)
        if brand_query and any(token_hit(t, bw) and not token_hit(t, desc_words) for t in tokens):
            s += 30  # user named this brand
        elif not brand_query:
            s -= 10
    s -= len(words) * 0.2  # shorter names win ties
    return round(s, 1)


def rank_foods(items, q):
    tokens = query_tokens(q)
    restaurant = query_looks_restaurant(q)
    # "Brand query": a query word that appears in some branded item's brand but in no generic
    # item's description (e.g. 'tyson chicken'), or the query names a restaurant chain.
    generic_words = [name_words(it["name"]) for it in items if it.get("dataType") in GENERIC_TYPES]
    brand_query = query_names_chain(q)
    for t in tokens:
        if brand_query:
            break
        in_brand = any(it.get("brand") and token_hit(t, name_words(it["brand"])) for it in items)
        in_generic = any(token_hit(t, w) for w in generic_words)
        brand_query = in_brand and not in_generic and t not in EXCLUSIVE
    best = {}
    for it in items:
        sc = score_food(it, q, tokens, restaurant, brand_query)
        if sc is None:
            continue
        it["score"] = sc
        key = " ".join(name_words(it["name"]))
        if key not in best or best[key]["score"] < sc:
            best[key] = it
    ranked = sorted(best.values(), key=lambda x: -x["score"])
    full = [it for it in ranked if it["score"] >= 30]
    return full if len(full) >= 5 else ranked  # drop partial-word junk when there are enough real hits


# ---------------------------------------------------------------------------
# Cache (in-process TTL + LRU, keyed on normalized query)
# ---------------------------------------------------------------------------
CACHE_TTL = int(os.environ.get("FOOD_CACHE_TTL", str(24 * 3600)))
CACHE_TTL_PARTIAL = 300
CACHE_MAX = 1000
_cache = OrderedDict()
_cache_lock = threading.Lock()


def cache_get(key):
    with _cache_lock:
        hit = _cache.get(key)
        if not hit:
            return None
        if hit[0] < time.time():
            _cache.pop(key, None)
            return None
        _cache.move_to_end(key)
        return hit[1]


def cache_put(key, value, ttl):
    with _cache_lock:
        _cache[key] = (time.time() + ttl, value)
        _cache.move_to_end(key)
        while len(_cache) > CACHE_MAX:
            _cache.popitem(last=False)


def search_foods(q):
    """Returns {foods, sources, errors, partial, cached}. Never raises for source failures."""
    q = (q or "").strip()[:80]
    key = " ".join(name_words(q))
    if len(q) < 2 or not key:
        return {"foods": [], "sources": [], "errors": {}, "partial": False, "cached": False}
    hit = cache_get(key)
    if hit:
        return dict(hit, cached=True)
    restaurant = query_looks_restaurant(q)
    started = time.time()
    curated = search_curated_restaurant(q) if restaurant else []
    jobs = {
        "fdc": SEARCH_POOL.submit(search_fdc, q, 50, "Foundation,SR Legacy,Survey (FNDDS)"),
        "fdc_branded": SEARCH_POOL.submit(search_fdc, q, 10, "Branded"),
        "off": SEARCH_POOL.submit(search_open_food_facts, q, 10),
    }
    if restaurant and not curated:
        jobs["estimate"] = SEARCH_POOL.submit(search_estimate, q)  # runs alongside, not after
    items, sources, errors = list(curated), (["curated"] if curated else []), {}
    done, pending = wait(list(jobs.values()), timeout=SEARCH_BUDGET)
    for name, fut in jobs.items():
        if name == "estimate" and fut not in done:
            continue  # collected below with its own budget
        if fut in pending:
            errors[name] = "timeout"
            continue
        try:
            got = fut.result()
            items.extend(got)
            if got:
                sources.append(name)
        except SourceError as e:
            errors[name] = str(e)
        except Exception as e:
            sys.stderr.write("search %s %s: %s\n" % (name, type(e).__name__, e))
            errors[name] = "failed"
    ranked = rank_foods(items, q)
    try:
        fdc_add_portions(ranked[:12], q)
    except Exception as e:
        sys.stderr.write("fdc_portions %s: %s\n" % (type(e).__name__, e))  # keep the 100 g servings
    decent = [f for f in ranked if f["score"] >= 45]
    if len(decent) < 3 and api_key():
        fut = jobs.get("estimate")
        est_started = started if fut else time.time()
        fut = fut or SEARCH_POOL.submit(search_estimate, q)
        try:
            # Estimate gets ESTIMATE_TIMEOUT from when it started (worst case ~budget + 8s total).
            got = fut.result(timeout=max(1.0, ESTIMATE_TIMEOUT - (time.time() - est_started)))
            if got:
                sources.append("estimate")
                ranked = rank_foods(items + got, q)
        except Exception as e:
            errors["estimate"] = "timeout" if not isinstance(e, SourceError) else str(e)
    result = {
        "foods": [{k: v for k, v in it.items() if not k.startswith("_")} for it in ranked[:20]],
        "sources": sources,
        "errors": errors,
        "partial": bool(errors),
        "cached": False,
    }
    # Full answers cache 24h; partial/empty ones only briefly so a transient 429/timeout heals.
    cache_put(key, result, CACHE_TTL if (not errors and ranked) else CACHE_TTL_PARTIAL)
    return result


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

    def send_json(self, code, payload, cache_control="no-store"):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", cache_control)
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
                    "fdc_demo_key": fdc_api_key() == "DEMO_KEY",
                    "reasoning_effort": REASONING_EFFORT,
                    "estimate": bool(key),
                },
            )
            return
        if path == "/api/search-food":
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query or "")
            q = (qs.get("q") or [""])[0]
            try:
                result = search_foods(q)
            except Exception as e:
                sys.stderr.write("search_food %s: %s\n" % (type(e).__name__, e))
                # Still 200 with empty list so the app can show local foods without "unavailable".
                self.send_json(200, {"foods": [], "sources": [], "errors": {"server": "failed"}, "partial": True,
                                     "error": "search_failed", "message": "Search failed."})
                return
            if result["errors"]:
                sys.stderr.write("search_food %r partial: %s\n" % (q[:40], result["errors"]))
            # Complete answers are cacheable by the browser/CDN; partial ones are not.
            cc = "no-store" if result["partial"] or not result["foods"] else "public, max-age=3600"
            self.send_json(200, result, cc)
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
            "max_tokens": 700,
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
        if REASONING_EFFORT:
            req_body["reasoning_effort"] = REASONING_EFFORT
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
            with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")[:300]
            sys.stderr.write("scan_meal HTTP %s %s\n" % (e.code, detail.replace("\n", " ")))
            msg = {
                401: "Scan service key is invalid (server config).",
                403: "Scan service key is not allowed (server config).",
                404: "Scan model is unavailable (server config).",
                429: "Scan service is busy. Wait a moment and try again.",
            }.get(e.code, "Scan failed. Try another photo.")
            self.send_json(502, {"error": "upstream", "upstream_status": e.code, "message": msg})
            return
        except Exception as e:
            sys.stderr.write("scan_meal %s: %s\n" % (type(e).__name__, e))
            timed_out = "timed out" in str(e).lower()
            self.send_json(504 if timed_out else 502, {"error": "upstream_timeout" if timed_out else "upstream",
                           "message": "Scan took too long. Try again." if timed_out else "Could not reach the scan service."})
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
