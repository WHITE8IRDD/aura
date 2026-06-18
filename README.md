# Aura

> The fastest and most secure consumer browser — with AI built into the core.

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 18+ (20 LTS recommended) |
| npm | 9+ |
| OS | Windows 11, macOS 13+, or Ubuntu 22+ |

## Setup

```bash
git clone <repo>
cd aura
npm install
```

    postinstall runs electron-rebuild automatically to compile native
    modules (better-sqlite3) against the correct Electron headers.
    If it fails, run npx electron-rebuild -f -w better-sqlite3 manually.

## Develop

```bash
npm run dev
```

Launches Aura with hot-reloaded chrome.

Try it:

- Type `github.com` → loads the real site in a sandboxed renderer
- Type `weather tomorrow` → searches DuckDuckGo
- Type `localhost:3000` → navigates to local server
- Click `+` → opens a new tab
- Click `✦ Assistant` → placeholder until Stage 7

## Type-check

```bash
npm run typecheck
```

## Build & Package (Stage 8)

```bash
npm run build
```

## Stage Roadmap

| # | Stage | Status |
|---|-------|--------|
| 1 | Core windowing, tabs, navigation | ✅ Complete |
| 2 | Address bar suggestions, autocomplete, preconnect | 🔜 Next |
| 3 | New tab dashboard — light + dark layouts | ⬜ |
| 4 | Ninja Mode (private windows) | ⬜ |
| 5 | Tracker/ad blocking, anti-fingerprinting | ⬜ |
| 6 | History, bookmarks, downloads (SQLite) | ⬜ |
| 7 | AI assistant panel | ⬜ |
| 8 | Settings, perf HUD, packaging | ⬜ |

## Architecture Notes

- One WebContentsView per web tab — isolated Chromium renderer process
- Internal pages (new tab, settings) rendered by React — no extra process
- All web tabs: `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`
- Chrome renderer uses `contextBridge` only — no raw `ipcRenderer` exposure
- `CHROME_HEIGHT = 96px` is shared between `main/index.ts` and `theme.css` — keep in sync
