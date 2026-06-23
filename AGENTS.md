# AURA BROWSER — COMPLETE HANDOFF

> Give this entire file to any AI agent. They will know exactly what Aura is, what problems we've solved, what stage we're in, and what to work on next.

---

## TABLE OF CONTENTS

1. [PROJECT IDENTITY](#1-project-identity)
2. [THE OVERALL PROBLEM](#2-the-overall-problem)
3. [COMPLETED STAGES](#3-completed-stages)
4. [STAGE 10C.4 — THE CURRENT FIX-4 TASK](#4-stage-10c4--the-current-fix-4-task)
5. [CURRENT STATE](#5-current-state)
6. [KNOWN ISSUES](#6-known-issues)
7. [WHAT TO DO NEXT](#7-what-to-do-next)
8. [KEY SOURCE CODE](#8-key-source-code)
9. [VERIFICATION CHEAT SHEET](#9-verification-cheat-sheet)
10. [QUICK START](#10-quick-start)

---

## 1. PROJECT IDENTITY

**Aura Browser** is a custom Chromium-based web browser built from scratch with Electron + React + TypeScript. It ships 4 native power features (Selection Translator, Page Translator, Image Batch Saver, HTML5 Video Downloader) to eliminate the need for browser extensions.

| Property | Value |
|---|---|
| **Tech Stack** | Electron 31, React 18, TypeScript, Vite (electron-vite) |
| **Build Tool** | `electron-vite` (ESBuild for main/preload, Vite for renderer) |
| **Packaging** | `electron-builder` (Windows NSIS) |
| **CSS** | CSS custom properties (`--text-primary`, `--bg-primary`, etc.) |
| **Theme System** | 10 presets in `themePresets.ts` (aura-dark, aura-light, amoled, carbonfox, catppuccin variants, tokyo-night, rose-pine, osaka-jade, ayu-mirage) |
| **State** | React hooks + localStorage (`useLocalStorage`, `useSettings`) |
| **IPC** | Context bridge (`contextBridge.exposeInMainWorld`) in preload scripts |
| **Popovers** | Floating `BrowserWindow` instances (frameless, transparent, alwaysOnTop, glassmorphism) |
| **Database** | `better-sqlite3@11.7.0` (pinned — v12+ uses `node:sqlite` not available in Electron 31) |
| **DOM Extraction** | `@mozilla/readability` + `linkedom` (lightweight DOM parser, CJS-compatible) |

**Status:** PRE-RELEASE (beta-ready). All core features ship. Brand identity locked. **Currently in STAGE 10C.4 — Fix-4 (4 bugs being resolved).**

---

## 2. THE OVERALL PROBLEM

The core problem Aura solves: **modern web browsers have become dependent on extensions for essential features** (translation, downloading images/videos, privacy tools). Extensions have access to all your data, can be malicious, and degrade performance. Aura rebuilds the 4 most commonly-needed extension capabilities **directly into the browser**, with deep integration at the Electron/native level:

1. **Selection Translator** — highlight text on any page → translate via LibreTranslate/Google/DeepL in a floating popover. No extension needed.
2. **Page Translator** — one-click full-page translation via DOM walker with revert capability.
3. **Image Batch Saver** — save any/all images on a page with a 4-strategy pipeline that defeats CORS restrictions (including main-process `net.request` which has NO CORS limits).
4. **HTML5 Video Downloader** — injects a download overlay on `<video>` elements (standard sources only, no blob/MSE/DASH/DRM).

These are not extensions — they are built into the browser's main process with full Electron API access.

---

## 3. COMPLETED STAGES

### STAGE 0 — Project Scaffold
- Electron main/renderer/preload architecture
- React app shell with routing: `aura://newtab`, `aura://settings`, `aura://history`, `aura://bookmarks`
- OmniBar (unified address/search bar), TabBar with WebView per tab, context menus
- Chrome shell (toolbar, bookmarks bar, nav buttons)

### STAGE 1-4 — Native Power Features
- **Selection Translator** — LibreTranslate default, Google fallback, DeepL option
- **Page Translator** — SENTINEL batch-join pattern for performance
- **Image Batch Saver** — 4-strategy pipeline (DOM → canvas, `crossOrigin Image`, main-process `net.request` (NO CORS), fetch fallback)
- **Video Downloader** — HTML5 `<video>` overlay injection

### STAGE 5 — MediaHub
- Floating BrowserWindow (380×280) with playback controls
- Picture-in-Picture support, queue management

### STAGE 10C.1 — Polish Fixes
- `preventDefault()` always first; translate item on both link + selection menus
- Clamp popover to workarea bounds; `hideView`/`showView` lifecycle
- React overlays → Floating BrowserWindows (eliminate black screen / occlusion)
- Premium glassmorphism redesign (14px radius, frosted backdrop, sectioned layout, accent badges)
- 4-strategy pipeline verified on real sites (xiaoheihe.cn, Wikipedia, Google Images)

### STAGE BRAND-LOGO-FIX-4 — Visual Identity (FINISHED)
The brand went through 5 iterations to get the NTP hero exactly right:
- **Final:** `height: 120px` colorful transparent "a" mark from `1ICON.png` + `font-size: 96px` CSS "Aura" wordmark using `var(--text-primary)` (adapts to any theme)
- Verified via CDP at exact target dimensions

### STAGE 10C.3 — Build Fix + linkedom Migration (FINISHED — CRITICAL CONTEXT)
**Problem:** `jsdom` was used for reader mode article extraction via `@mozilla/readability`. It worked in dev but broke in production builds because:
- jsdom ships runtime resource files (`default-stylesheet.css`, `xhr-sync-worker.js`) that ESBuild cannot bundle
- ESBuild treats these as missing modules and emits `require("default-stylesheet.css")` in the bundled output
- At runtime Node.js can't resolve `.css` require → `MODULE_NOT_FOUND` crash
- The app crashed on launch with "Cannot find module 'default-stylesheet.css'"

**Solution — Replace jsdom with linkedom:**
- `linkedom` has zero runtime file dependencies — it's pure JS, bundles cleanly with ESBuild
- `parseHTML()` from linkedom produces identical DOM to jsdom from Readability's perspective
- `canvas` is kept as external in `electron.vite.config.ts` because linkedom wraps `require('canvas')` in try/catch and ESBuild still resolves it at build time
- Removed `undici` from externals (no longer needed without jsdom)

**Results:**
- Main bundle: **12,416 kB → 1,748 kB** (86% smaller)
- Build time: **~10s → ~2s**
- No more runtime crashes

**Other fix — app.name to fix database path:**
- Unpackaged dev mode was using `%APPDATA%\Electron\aura.db` instead of `%APPDATA%\Aura\aura.db`
- Fixed by adding `app.name = 'Aura'` inside `getDb()` in `src/main/db/index.ts:11` before `app.getPath('userData')`
- User's real data was at the Aura path (4 bookmarks, 51 history entries, 1 tab session) — copied to dev path

---

## 4. STAGE 10C.4 — THE CURRENT FIX-4 TASK

We just completed a fix-4 task addressing 4 bugs. **Every change listed below is already applied and verified (build + typecheck pass).**

### FIX 1 — Split view toolbar button doesn't enter split mode

**Root cause:** The old `handleToggleSplit` in `UtilityCluster.tsx` used `other.url || 'aura://newtab'` as fallback. The split manager's `openSplit()` checks `isInternal()` on the URL, and `aura://newtab` is treated as internal → silently aborts. The split would never open if the other tab was on an internal page.

**Fix:**
- Replaced fallback from `'aura://newtab'` to `'about:blank'` (passes `isInternal()` check)
- Rewrote `handleToggleSplit` to be cleaner: checks `splitActive` state, if active → close, if inactive → find other tab and call `split.open(activeId, other.url ?? 'about:blank')`
- **Files changed:** `src/renderer/src/components/UtilityCluster.tsx:104-121`

### FIX 2 — Split keyboard shortcut Ctrl+\ → Ctrl+/

**Why:** `Ctrl+\` is awkward on most keyboards (especially non-US layouts). `Ctrl+/` is more natural (Cmd+Q on Mac was considered but would conflict with quit).

**Changes:**
- **Main process** (`src/main/index.ts:280`): Changed `globalShortcut.register` from `'CommandOrControl+\\'` to `'CommandOrControl+/'`
- **Toolbar tooltip** (`UtilityCluster.tsx:159`): Updated text from `Ctrl+\` to `Ctrl+/`
- **Tab context menu accelerator** (`src/main/tabContextMenuNative.ts:75`): Changed from `'CmdOrCtrl+\\'` to `'CmdOrCtrl+/'`

### FIX 3 — Suppress native error dialogs

**Problem:** Uncaught JS exceptions in both main and renderer processes were showing intrusive native OS error dialogs. These ruin the browsing experience for non-technical users.

**Main process** (`src/main/index.ts:4-16`):
- `process.on('uncaughtException')` — logs to console, does NOT show dialog
- `process.on('unhandledRejection')` — logs to console, does NOT show dialog
- `dialog.showErrorBox` override — replaces the native function with a no-op that logs instead
- **All added at the top of the file, before any imports** (cannot be added later — Electron may show error boxes on import errors)

**Renderer process** (`src/renderer/src/main.tsx:4-12`):
- `window.addEventListener('error', ...)` — `e.preventDefault()` suppresses default handling
- `window.addEventListener('unhandledrejection', ...)` — `e.preventDefault()` suppresses default handling
- **Both added before `import App`** to catch early render errors

### FIX 4 — Reader mode visual redesign

Goal: premium iOS-style reading experience with minimal intrusive UI.

**Component rewrite** (`src/renderer/src/pages/ReaderPage.tsx`):
- **Collapsed toolbar chip:** A small circular trigger button (three horizontal lines icon) that expands to the full toolbar on click. Clicking outside collapses it.
- **Favicon + site name header** at top of article (uses Google favicon API: `https://www.google.com/s2/favicons?domain=...&sz=64`)
- **Theme swatches:** Real-color circular buttons for Light (`#fafaf7`), Sepia (`#f5e9d4`), Dark (`#1c1c1e`) — active state shows a scale-up + outline ring
- **Text size ± buttons** with Aa scale indicators
- **Font cycler** (serif/sans/mono) with preview text in each font
- **Width cycler** (narrow/medium/wide)
- **Serif drop cap** on first paragraph via CSS `::first-letter`
- **Reading time, progress bar, lead image** preserved
- Preferences saved to localStorage under `aura:reader-prefs`

**CSS rewrite** (`src/renderer/src/styles/theme.css`):
- All old `.reader-*` classes replaced with new `.r-*` namespace
- Uses `color-mix()` for toolbar background so it adapts to any theme
- `backdrop-filter: blur(20px) saturate(1.6)` for frosted glass effect
- Theme-independent: all colors are CSS custom properties set by `data-theme` attribute

**No CSP change needed** — `index.html` already has `img-src 'self' https: data:` which allows Google favicon API.

---

## 5. CURRENT STATE

### ✅ WORKING — verified

| Feature | Status |
|---|---|
| Selection Translator | Working — LibreTranslate default, Google fallback |
| Page Translator | Working — DOM walker with revert |
| Image Batch Saver | Working — 4 strategies, all images regardless of CORS |
| Video Downloader | Working — HTML5 `<video>` overlay |
| Floating BrowserWindows | Working — 3 popovers (translator, imageSaver, mediaHub) |
| NTP Hero — Dark theme | ✅ VERIFIED at 120px mark + 96px text |
| NTP Hero — Light theme | ✅ VERIFIED — uses `var(--text-primary)` = `#0f0f14` |
| Reader mode | Rewritten — premium iOS-style chip toolbar, favicon+site header, theme swatches, drop cap |
| Split view toggle (toolbar) | FIXED — now enters AND exits split correctly |
| Split keyboard shortcut | FIXED — `Ctrl+/` replaces `Ctrl+\` |
| Error dialogs suppressed | FIXED — no more native error boxes for uncaught exceptions |
| Build (`electron-vite build`) | ✅ Passes (2s) |
| TypeScript (`tsc --noEmit`) | ✅ Passes (0 new errors) |
| Main bundle size | ✅ **1,748 kB** (was 12,416 kB before linkedom migration) |

### ⚠️ NOT YET AUDITED

| Surface | Risk |
|---|---|
| Light theme — chrome (toolbar, tabs, bookmark bar, address bar) | Unknown contrast |
| Light theme — settings pages | Unknown |
| Light theme — context menus | Likely fine (native) |
| Light theme — About page hero | Fine visually but verify bg contrast |
| Packaging / installer | Never tested `electron-builder` |

---

## 6. KNOWN ISSUES

1. **Duplicate `.ntp-hero` CSS rule** in `theme.css` (lines 690-697 old, 699-707 new) — second wins via cascade, harmless but should clean up
2. **14 pre-existing typecheck errors** from external modules — do NOT fix:
   - `blocker` module
   - `better-sqlite3` native module
   - `TabManager.getState` return type mismatch
   - `ninja.ts` / `shortcuts.ts` / `tabs.ts` type errors
   - `sidebar-panels` import / `types.ts` listing
3. **SVG images fail** in image save pipeline — expected (Chromium can't decode SVG to canvas)
4. **Video downloader** only works for standard `<video>` elements — no blob/MSE/DASH/HLS/DRM
5. **Dashboard layout toggle** (`aura:dash-layout` localStorage key) is independent of actual theme — intentional for flexibility
6. **NTP light dashboard (`dash-light-v2`)** textarea prompt input shows a focused "glow" on the container, not the textarea itself — may be confusing UX but not a bug per se

---

## 7. WHAT TO DO NEXT

### 🥇 TOP PRIORITY — Light Theme Audit

The light theme (`aura-light`) has NOT been fully audited for visual cohesion. Only the NTP hero was fixed.

**What to check in the running app with `aura-light` theme:**

1. **Browser chrome** (toolbar, tabs, bookmark bar, address bar):
   - Toolbar: `--toolbar-bg: rgba(255,255,255,0.88)` — verify buttons/text are visible
   - Tab bar: active/inactive tabs — verify contrast against `--bg-primary: #fafafa`
   - Address bar (OmniBar): `--address-bar-bg: #ffffff` — verify dropdown/popup items visible
   - Bookmark bar: bookmark text against `--bg-secondary: #f4f4f6`

2. **Settings pages** — flip through all settings sections, verify all text/labels legible

3. **Context menus** — native menus should be fine (OS handles them) but verify

4. **Popover windows** (translator, imageSaver, mediaHub) — verify glassmorphism backdrop works in light mode

5. **Reader mode** — verify the new `.r-*` CSS renders correctly in light theme (the toolbar backdrop using `color-mix()` should adapt)

**If you find contrast issues, fix them in `src/renderer/src/lib/themePresets.ts`** — this is where the CSS custom property values live.

### 🥈 HIGH PRIORITY — Verify & Ship

6. **Packaging** — run `npx electron-builder` (or `npm run build:win`) and verify:
   - Installer icon renders correctly
   - App icon in Windows taskbar / alt-tab
   - App launches without errors after install

7. **Edge cases** — what happens when:
   - No network? (Translator error, image saver "Could not download")
   - LibreTranslate is down? (Should fall back to Google gracefully)
   - Page has 0 images? (Batch save dialog, then says 0 saved)
   - Page has 500 images? (Batch save performance — consider chunking)
   - Video-less page? (Downloader overlay should not appear)

### 🥉 MEDIUM PRIORITY — Code Cleanup

8. **Delete duplicate `.ntp-hero` CSS rule** (lines 690-697 in theme.css)
9. **Remove `_verify.js` and `_inspect.js` temp files** if they exist in project root
10. **Remove unused wordmark PNGs** from `resources/` (TRANSPARENCY.png, WITH BACKGROUND.png, text AURA*.png) if truly not needed — keep `1ICON.png` as source of truth

### 📋 NEXT STAGE SUGGESTION

After v1.0 ships:
- Lazy-load tab WebViews
- Download manager UI
- Session restore / crash recovery
- Password manager / autofill
- Ad blocking (Electron `contentFiltering` API)
- Chrome extension API compatibility

---

## 8. KEY SOURCE CODE

### 8.1 — Important Files Modified in This Session

| File | What Changed |
|---|---|
| `src/renderer/src/pages/ReaderPage.tsx` | Complete rewrite — premium iOS-style reader with collapsible toolbar chip, favicon+site header, theme swatches, drop cap |
| `src/renderer/src/styles/theme.css` | `.reader-*` CSS replaced with `.r-*` namespace — `color-mix()`, frosted glass, real-color theme swatches |
| `src/renderer/src/components/UtilityCluster.tsx` | `handleToggleSplit` uses `about:blank` fallback; tooltip shows `Ctrl+/` |
| `src/main/index.ts` | Error suppression (lines 4-16); split shortcut `Ctrl+/` (line 280) |
| `src/renderer/src/main.tsx` | Renderer error suppression (lines 4-12) |
| `src/main/tabContextMenuNative.ts` | Split accelerator changed to `CmdOrCtrl+/` (line 75) |

### 8.2 — Previous Important Changes

| File | What Changed |
|---|---|
| `src/main/reader.ts` | Returns `rawContent` alongside parsed article for scrolling |
| `src/main/index.ts` (~line 810+) | `reader:getCurrent` IPC handler sends `rawContent` |
| `electron.vite.config.ts` | External list: `['better-sqlite3', 'canvas']` (removed `undici`) |
| `src/main/db/index.ts` | Added `app.name = 'Aura'` before `getPath('userData')` |
| `package.json` (line 12) | `postinstall` script: `electron-rebuild -f -w better-sqlite3` |
| `package.json` (line 49-50) | `overrides.better-sqlite3 = "11.7.0"` (pinned — no semver prefix!) |

### 8.3 — Architecture Overview

```
src/
├── main/                       # Electron main process
│   ├── index.ts                # Entry point: windows, IPC, shortcuts, error suppression
│   ├── db/
│   │   └── index.ts            # SQLite via better-sqlite3, app.name fix
│   ├── reader.ts               # Article extraction via linkedom + Readability
│   ├── splitManager.ts         # Split view management (openSplit checks isInternal())
│   ├── shortcuts.ts            # Keyboard shortcut registration
│   ├── tabs.ts                 # Tab management (WebView per tab)
│   ├── translator.ts           # Translation engine (LibreTranslate, Google, DeepL)
│   ├── pageTranslator.ts       # Full-page DOM translation
│   ├── imageSaver.ts           # 4-strategy image download pipeline
│   ├── videoDownloadDetector.ts# Video overlay injection
│   └── ...
├── preload/
│   ├── index.ts                # Context bridge: window.aura.*
│   └── tab.ts                  # Tab-specific preload
└── renderer/
    └── src/
        ├── pages/
        │   ├── ReaderPage.tsx  # Premium iOS-style reader overlay
        │   ├── NewTabDashboard.tsx
        │   ├── DashboardDark.tsx
        │   ├── DashboardLight.tsx
        │   └── SettingsPage.tsx
        ├── components/
        │   ├── UtilityCluster.tsx  # Toolbar buttons (split, reader, translator, etc.)
        │   └── TabBar.tsx
        ├── styles/
        │   ├── theme.css       # All component CSS (reader CSS at ~line 1396+)
        │   └── themePresets.ts # 10 theme color token definitions
        ├── lib/
        │   └── themePresets.ts # applyPresetToDOM()
        └── main.tsx            # React entry + error suppression
```

### 8.4 — Reader Mode Architecture

```
User clicks reader button in toolbar
  → UtilityCluster.tsx calls window.aura.reader.enter(tabId) [IPC: reader:enter]
  → Main process stores reader state for that tab
  → Renderer sets readerActive state → mounts <ReaderPage> component
  → ReaderPage useEffect calls window.aura.reader.getCurrent(tabId) [IPC: reader:getCurrent]
  → Main process gets article HTML from linkedom + Readability
  → Returns ReaderArticle object
  → ReaderPage renders article with premium iOS-style UI
  → User clicks Close → calls window.aura.reader.exit(tabId) [IPC: reader:exit]
  → Main process clears reader state → unmounts ReaderPage
```

### 8.5 — ReaderPage Component Structure

```tsx
Props: { tabId: number, onExit: () => void }
State: article (ReaderArticle | null), loading, error, prefs, scrollProgress, controlsExpanded

Renders:
  .r-root[data-theme][data-font][data-width]
    .r-progress (scroll-based)
    .r-toolbar[.expanded]
      collapsed: .r-toolbar-trigger (hamburger icon → expands)
      expanded:  [Aa- Aa+] | [theme swatches] | [font cycler | width cycler] | [exit X]
    .r-article
      .r-site: favicon (Google favicon API) + site name
      .r-title
      .r-excerpt (optional)
      .r-meta: byline · date · reading time
      .r-divider
      .r-lead (lead image, optional)
      .r-content (dangerouslySetInnerHTML from article.content)
        - First paragraph gets ::first-letter drop cap
      .r-footer: "Back to [site name]" button
```

### 8.6 — Theme System

```typescript
// src/renderer/src/lib/themePresets.ts
applyPresetToDOM(preset) sets on document.documentElement:
  data-theme = 'light' | 'dark'
  data-preset = 'aura-dark', 'aura-light', etc.
  --bg-primary, --text-primary, --toolbar-bg, ... (20+ tokens)
```

**aura-dark** (default): bg `#0a0a0c`, text `rgba(255,255,255,0.96)`
**aura-light**: bg `#fafafa`, text `#0f0f14`

The Reader mode uses its own independent theme system via `data-theme` attribute on `.r-root`:
- `light` → `--r-bg: #fafaf7`, `--r-text: #1a1a1a`
- `sepia` → `--r-bg: #f5e9d4`, `--r-text: #2d2418`
- `dark` → `--r-bg: #1c1c1e`, `--r-text: #e8e6e3`

### 8.7 — Critical Known Behaviors

- **`color-mix()` used in toolbar CSS** — supported in Chromium 111+ (Aura uses Electron 31 with Chromium 126)
- **`linkedom` vs `jsdom`**: linkedom has no runtime file dependencies → bundles cleanly. Both produce same DOM for Readability.
- **`app.name = 'Aura'`** must be called before `app.getPath('userData')` — Electron caches the path based on app name at call time
- **`better-sqlite3@11.7.0` pinned** because v12+ uses `node:sqlite` (not available in Electron 31's bundled Node)
- **`postinstall` script** runs `electron-rebuild -f -w better-sqlite3 || exit 0` — the `|| exit 0` is critical because if this fails (package not yet installed), npm install would fail. The overrides block ensures v11.7.0 is used.
- **`overrides"better-sqlite3": "11.7.0"`** is the EXACT version, no semver prefix (`^11.7.0` would resolve to v12+). The `overrides` block was initially missing which caused a hard-to-debug issue.

---

## 9. VERIFICATION CHEAT SHEET

```bash
# Build
npx electron-vite build           # Must pass (currently ~2s)

# TypeScript
npx tsc --noEmit                   # Must pass (14 pre-existing errors only)

# Launch
npx electron out/main/index.js     # App launches without crash

# Launch with CDP for inspection
npx electron out/main/index.js --remote-debugging-port=9222
```

### Verify reader in test script:
1. Navigate to a long-form article (e.g., Wikipedia)
2. Click reader button in toolbar → should see premium iOS-style overlay
3. Check collapsible toolbar chip in top-right → click to expand
4. Toggle themes (light/sepia/dark) → backgrounds should change correctly
5. Change font → serif/sans/mono should apply
6. Change width → column should narrow/widen
7. Change text size → should grow/shrink
8. Click outside toolbar → should collapse back to chip
9. Click X or "Back to..." → should exit reader

### Verify split view:
1. Open 2+ tabs
2. Click split button → should open split view with both tabs
3. Click split button again → should close split view
4. Press Ctrl+/ (Windows) → should toggle split view
5. Press Ctrl+\ → should NOT do anything (old shortcut removed)

### Verify error suppression:
1. Open DevTools console in main process (or use `--inspect`)
2. Throw an error: `setTimeout(() => { throw new Error('test') })`
3. Error should appear in console but NO native dialog should appear

---

## 10. QUICK START

```bash
cd aura
npm install              # must run postinstall for better-sqlite3 rebuild

# Development
npm run dev              # or: npx electron-vite dev --noSandbox

# Production build
npm run build            # or: npx electron-vite build

# TypeScript check
npm run typecheck        # or: npx tsc --noEmit

# Launch built app
npx electron out/main/index.js

# Launch with remote debugging
npx electron out/main/index.js --remote-debugging-port=9222

# Package for Windows
npm run build:win        # requires electron-builder config
```

---

*This handoff was generated at the end of STAGE 10C.4 Fix-4 — 4 bugs resolved (split toggle, Ctrl+/, error suppression, reader redesign). NTP hero exact at target (120px / 96px). All 4 native features ship. jsdom replaced with linkedom. Build passes in 2s. Bundle 1,748 kB (was 12,416 kB). Ready for light theme audit → v1.0.*
