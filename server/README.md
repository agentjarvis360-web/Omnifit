# OmniFit meal-scan API

Hosted endpoint for meal photos. Holds `XAI_API_KEY` on the server only.

## Endpoints

- `GET /api/status` — `{ ok, scan, model }`
- `POST /api/scan-meal` — body `{ "image": "data:image/...", "note": "optional" }`

## Env vars

| Var | Required | Purpose |
|---|---|---|
| `XAI_API_KEY` | yes (for scans) | xAI API key — never put this in the app |
| `PORT` | no | Listen port (default `8787`; hosts often set `PORT`) |
| `XAI_MODEL` | no | default `grok-4.6` |
| `CORS_ORIGINS` | no | comma list, or `*` |

## Run locally

```bash
cd server
export XAI_API_KEY=...
python3 app.py
```

## Deploy (you do this)

Any host that runs a Python process works: Railway, Render, Fly.io, a VPS, etc.

Example (Docker):

```bash
cd server
docker build -t omnifit-scan .
docker run -e XAI_API_KEY=... -e PORT=8787 -p 8787:8787 omnifit-scan
```

Then put the public HTTPS origin into `www/config.js` as `scanApiBase` (no trailing slash), sync Capacitor, and ship.

Do not commit real keys.
