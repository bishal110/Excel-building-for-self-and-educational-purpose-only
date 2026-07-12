# Building the Windows .exe on your own machine

The cloud environment this project was developed in **cannot download Electron's
Windows binaries** (its network policy returns 403 for the GitHub release
downloads), so the `.exe` could not be produced there. Everything is configured
and ready — on a Windows machine it is two commands.

## Prerequisites

- **Node.js 20+** — https://nodejs.org (the Windows ARM64 installer works
  natively on ARM64 machines).
- No other tools needed. `electron-builder` handles packaging; the build is
  unsigned (see note below).

## Steps (Windows ARM64 — your machine)

```powershell
# 1. Get the code
git clone https://github.com/bishal110/Excel-building-for-self-and-educational-purpose-only.git
cd Excel-building-for-self-and-educational-purpose-only

# 2. Install dependencies (this also downloads Electron's Windows binaries)
npm install

# 3. Build the portable .exe for ARM64
npm run dist:win-arm64
```

The result lands in `release/`:

```
release/AI_Office 0.3.1.exe        ← portable, single-file, double-click to run
```

For an **x64** machine (or to hand the app to colleagues on x64 platform PCs):

```powershell
npm run dist:win-x64
```

## Verify it worked

1. Double-click the `.exe` in `release/` — the app opens in its own window.
2. Sheets/Docs/Slides all work fully offline (no server, no internet).
3. Your work autosaves locally; use **File → Save project** for a portable
   `.aioffice` file.

## Notes

- **SmartScreen warning:** the build is unsigned (a code-signing certificate
  costs money and isn't needed for personal use). On first run Windows may show
  "Windows protected your PC" — click **More info → Run anyway**.
- **Where the config lives:** `electron-builder.yml` (targets, icon, output
  dir) and `electron/main.cjs` (the app window). To also produce an installer,
  change the target from `portable` to `nsis` in `electron-builder.yml`.
- **No .exe needed for daily use:** the same app also runs as
  - a PWA — open the hosted app in Edge/Chrome and click **Install app**;
  - a single offline file — `npm run build:single` produces
    `dist-single/AI_Office.html`, which runs from a double-click with no install;
  - a LAN app — `npm run build && npm run serve:lan`, then open
    `http://<pc-ip>:8080` from any device on the network.
