# OmniFit

Health and fitness app: train, fuel, progress. Vanilla HTML/CSS/JS wrapped with [Capacitor](https://capacitorjs.com/) for iOS and Android.

Web UI lives in `www/` (do not rewrite it for Capacitor). Native shells: `ios/`, `android/`.

## Local web (with meal scan)

Meal scan needs the Python helper (proxies photos to xAI). **Do not ship this local proxy or your private key in the store build.**

```bash
cd "/Users/jerryarmstrong/Desktop/Chief of Staff/Daisy/omnifit"
# optional: put XAI_API_KEY in .env (see .env.example)
python3 serve 8766
# open http://127.0.0.1:8766/
```

Without `serve`, static files still open, but `/api/scan-meal` will fail until a hosted backend exists.

## Capacitor setup

```bash
npm install
npx cap sync
```

### Android

```bash
npx cap open android
```

Build/run from Android Studio. `applicationId` is `com.omnifit.app`.

### iOS

iOS uses the **SPM** template (`CapApp-SPM`) so CocoaPods is not required.

```bash
npx cap open ios
```

Open in Xcode on a Mac with a current Xcode. Signing team must be set before a device/TestFlight build. Bundle id: `com.omnifit.app`.

> Note: `npx cap add ios --packagemanager SPM` is broken on Capacitor CLI 7.x when the flag is lowercased; this project already has `ios/` from the SPM template. Re-sync with `npx cap sync ios`.

## Privacy and Terms

- `www/privacy.html` — meal photos, body photos, health logging, AI estimates
- `www/terms.html` — fitness use, AI estimate limits, liability
- Linked from **Profile** in the app

Update contact wording before store submission.

## Project layout

```
omnifit/
  www/                 # web app (Capacitor webDir)
  ios/                 # Xcode project (SPM)
  android/             # Android Studio project
  serve                # local meal-scan proxy only
  capacitor.config.json
  package.json
  README.md
```

Brand icons live under `www/assets/` only.

## Before App Store / Play Store will accept this

1. **Hosted meal-scan API** — replace local `serve` + private xAI key with a server you control; point `app.js` `fetch("/api/scan-meal")` at that HTTPS URL (or Capacitor HTTP config). Store review will reject a binary that depends on a laptop proxy.
2. **Apple Developer + Google Play developer accounts** and paid enrollment.
3. **Signing** — iOS: Team ID, certificates, provisioning; Android: upload keystore (never commit it).
4. **Store listings** — screenshots (phone sizes), description, support URL, marketing URL.
5. **Privacy disclosures** — Apple Privacy Nutrition Labels; Google Play Data safety form (photos, health-ish logs, AI processing).
6. **Health positioning** — not a medical device; keep disclaimers consistent with Terms.
7. **Icons / splash** — wire final App Icon sets in Xcode / Android mipmap from `www/assets/omnifit-e-app-icon.png` and icon-512.
8. **Optional** — accounts, cloud sync, analytics, payments (none in this build).
9. **Test** — TestFlight + internal Play track: workout player, nutrition, meal scan against **hosted** API, body photos, Profile legal links, install/update.

## Scripts

| Command | What |
|---|---|
| `npm start` | local `serve` on 8766 |
| `npm run sync` | `npx cap sync` |
| `npm run ios` | open Xcode |
| `npm run android` | open Android Studio |

## Meal scan API (production)

The store build **must not** use the local Python `serve` script or embed an xAI key.

- **Hosted API:** `server/app.py` — `POST /api/scan-meal`, `GET /api/status`
- **Secret on the host only:** `XAI_API_KEY` (see `.env.example` and `server/README.md`)
- **Client:** set `window.OMNIFIT.scanApiBase` in `www/config.js` to the public HTTPS origin (no trailing slash). Leave it `""` for local same-origin via `python3 serve`.

Deploy `server/` yourself (Railway, Render, Fly, Docker, VPS). Do not put `XAI_API_KEY` in `www/`, Capacitor sync output, or git.

Local still works:

```bash
# from project root — static www + /api/scan-meal on one port
export XAI_API_KEY=...
python3 serve 8766
```

Or run API alone:

```bash
cd server && export XAI_API_KEY=... && python3 app.py
# then set scanApiBase in www/config.js to http://127.0.0.1:8787 for device testing
```

