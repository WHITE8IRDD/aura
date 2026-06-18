# Aura Security Model — Stage 5

## Renderer isolation
Every web tab runs in its own sandboxed WebContentsView with:
- `sandbox: true` — OS-level process sandbox (no system calls)
- `contextIsolation: true` — page JS and preload never share a context
- `nodeIntegration: false` — zero Node.js API surface in web pages

## Tracker & Ad Blocking ✅ Stage 5
- **Engine:** `@ghostery/adblocker-electron` (same family as Brave/Ghostery)
- **Rules:** EasyList + EasyPrivacy (~50,000 rules)
- **Update:** Cached locally, rebuilt on demand
- **Scope:** Every session including Ninja windows

## HTTPS-Only Mode ✅ Stage 5
- All `http://` requests auto-upgraded to `https://`
- Failure shows an interstitial; user can opt in per-session per-host
- Localhost / private networks (192.168.x, 10.x) exempted

## Anti-Fingerprinting ✅ Stage 5
- **Canvas noise:** 1-bit randomization of getImageData() values
- **User-agent:** normalized to generic Chrome 131 / Windows
- **WebRTC IP leak:** disabled via mDNS hiding + UDP policy

## Phishing Protection ✅ Stage 5
- Local blocklist of known phishing/malware domains
- Subdomain matching
- No external API call (no Safe Browsing)

## Permissions ✅ Stage 5
- Per-site prompts via toast UI
- Three options: Block / Allow once / Always allow
- Session-scoped memory

## IPC Surface
Only `window.aura` exposed via `contextBridge`. `ipcRenderer` never exposed directly.

## De-Google ✅ Stage 5
Aura's own code makes **zero connections** to Google services:
- Favicons fetched locally from origin sites (not via google.com/s2)
- Default search: DuckDuckGo
- No telemetry, no field trials, no Safe Browsing, no FCM, no Translate, no Sync

## Planned (not yet implemented)
- Bookmarks/history persisted to SQLite with safeStorage password encryption (Stage 6)
- AI assistant panel with local-first prompts (Stage 7)
- Settings UI for toggling blockers / permissions per-site (Stage 8)
- Auto-update with code signing (Stage 8)

## Out of scope for v1
- Building an independent rendering engine (Chromium is the foundation)
- Hardware security key / passkey support
- Multi-account containers
