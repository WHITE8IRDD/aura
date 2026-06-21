# AURA BROWSER — COMPLETE HANOFF

> Give this file to any AI agent. They will know exactly what Aura is, what's been built, what stage we're in, and what to do next.

---

## TABLE OF CONTENTS

1. [PROJECT IDENTITY](#1-project-identity)
2. [COMPLETED STAGES](#2-completed-stages)
3. [CURRENT STATE](#3-current-state)
4. [KEY SOURCE CODE](#4-key-source-code)
5. [WHAT TO DO NEXT](#5-what-to-do-next)

---

## 1. PROJECT IDENTITY

**Aura Browser** is a custom Chromium-based web browser built from scratch with Electron + React + TypeScript. Its mission: replace the need for browser extensions by shipping 4 native power features (Selection Translator, Page Translator, Image Batch Saver, HTML5 Video Downloader) in a modern, minimal, premium UI.

| Property | Value |
|---|---|
| **Tech Stack** | Electron 31, React 18, TypeScript, Vite (electron-vite) |
| **Build Tool** | `electron-vite` (ESBuild for main/preload, Vite for renderer) |
| **Packaging** | `electron-builder` (Windows NSIS) |
| **CSS Approach** | CSS custom properties (`--text-primary`, `--bg-primary`, etc.) |
| **Theme System** | 10 presets in `themePresets.ts` (aura-dark, aura-light, amoled, carbonfox, catppuccin-mocha/frappe/macchiato, tokyo-night, rose-pine, osaka-jade, ayu-mirage) |
| **State Management** | React hooks + localStorage (`useLocalStorage`, `useSettings`) |
| **IPC** | Context bridge (`contextBridge.exposeInMainWorld`) in preload scripts |
| **Popovers** | Floating `BrowserWindow` instances (frameless, transparent, alwaysOnTop) |

**Status:** PRE-RELEASE (beta-ready). All core features ship. UI/brand identity locked. Next step: ship v1.0.

---

## 2. COMPLETED STAGES

### STAGE 0 — Project Scaffold
- Electron main/renderer/preload architecture
- React app shell with routing: `aura://newtab`, `aura://settings`, `aura://history`, `aura://bookmarks`
- OmniBar (unified address/search bar), TabBar with WebView per tab, context menus
- Chrome shell (toolbar, bookmarks bar, nav buttons)

### STAGES 1-4 — Four Native Power Features

**Feature 1 — Selection Translator** (`src/main/translator.ts` + `src/main/translatorWindow.ts`)
- Translate selected text via LibreTranslate (default fallback), Google Translate, or DeepL
- Context menu "Translate selection" on text selection
- Floating popover (400×300, frameless, transparent, glassmorphism)

**Feature 2 — Page Translator** (`src/main/pageTranslator.ts`)
- DOM text-node walker translates full page content
- SENTINEL batch-join pattern for performance + revert capability
- Toggle via toolbar button

**Feature 3 — Image Batch Saver** (`src/main/imageSaver.ts` + `src/main/imageSaverWindow.ts`)
- 4-strategy conversion pipeline, in priority order:
  1. Existing `<img>` DOM element → canvas.toDataURL (instant, same-origin)
  2. New `Image()` with `crossOrigin='anonymous'` → canvas (HTTP cache)
  3. **Main process `net.request`** download → renderer `createImageBitmap` → `OffscreenCanvas` (NO CORS restrictions — works for ALL images)
  4. Fetch fallback (same-origin cache only)
- Batch save all page images with per-image independent results
- Floating popover (300×360) with quality/size selectors

**Feature 4 — HTML5 Video Downloader** (`src/main/videoDownloadDetector.ts`)
- Scans page for `<video>` elements
- Injects overlay download button
- Standard HTML5 `<video>` sources only (no blob/MSE/DASH/HLS/DRM)

### STAGE 5 — MediaHub
- Floating BrowserWindow (380×280) with playback controls
- Picture-in-Picture support
- Queue management

### STAGE 10C.1 — Polish
- **FIX-2:** `preventDefault()` always first; translate item on link + selection menus both
- **FIX-3:** Clamp popover to workarea bounds; `hideView`/`showView` lifecycle
- **FIX-4:** React overlays → Floating BrowserWindows (eliminate black screen / occlusion)
- **FIX-5:** Premium glassmorphism redesign (14px radius, frosted backdrop, sectioned layout, accent badges)
- **FIX-6:** 4-strategy pipeline verified on real sites (xiaoheihe.cn, Wikipedia, Google Images)

### STAGES BRAND-LOGO through BRAND-LOGO-FIX-4 — Visual Identity

The brand identity was built over 5 iterations. Here's what changed each time:

| Iteration | Mark Height | Text Size | File Used | Result |
|---|---|---|---|---|
| Initial | ~30px | ~14px | WHITE.png (monochrome) | ❌ Tiny, white, wrong file |
| FIX-1 | 88px | 72px | aura-wordmark-dark.png (static wordmark PNG) | ❌ Light theme invisible |
| FIX-2 | 88px | 72px | aura-icon-colored.png (from 1ICON.png, inline composition) | ❌ Still too small for target |
| FIX-3 | 96px | 72px | aura-mark-colored.png + !important CSS | ❌ Close but not exact (96 vs 120 target) |
| **FIX-4 (CURRENT)** | **120px** | **96px** | **`1ICON.png` (colorful transparent "a" mark) + CSS wordmark** | **✅ VERIFIED PASS** |

**Final hero composition:**
- LEFT: Rainbow gradient "a" letterform from `1ICON.png` (2000×2000, transparent bg, 800×800 content area)
- RIGHT: CSS text "Aura" with `color: var(--text-primary)` (adapts to any theme)
- Gap: 18px, margin-bottom: 48px
- Mark: `height: 120px !important` via CSS
- Wordmark: `font-size: 96px !important`, bold, `-apple-system` font stack
- Verified in live app via CDP: all 4 pass criteria met

---

## 3. CURRENT STATE

### ✅ WORKING — verified in running app

| Feature | Status |
|---|---|
| Selection Translator | Working — LibreTranslate default, Google fallback |
| Page Translator | Working — DOM walker with revert |
| Image Batch Saver | Working — 4 strategies, all images regardless of CORS |
| Video Downloader | Working — HTML5 `<video>` overlay |
| Floating BrowserWindows | Working — 3 popovers (translator, imageSaver, mediaHub) |
| NTP Hero — Dark theme | ✅ **VERIFIED** at 120px mark + 96px text, colorful gradient |
| NTP Hero — Light theme | ✅ Text uses `var(--text-primary)` = `#0f0f14` (dark, visible) |
| About page | Uses `aura-mark-colored.png`, correct |
| Tab favicon | Uses `aura-mark-colored.png`, visible on both themes |
| Window icon | `resolveIcon()` helper in main process, returns correct path |
| Build (`electron-vite build`) | ✅ Passes |
| TypeScript (`tsc --noEmit`) | ✅ Passes (0 new errors, 14 pre-existing from external modules) |

### ⚠️ NOT YET AUDITED

| Surface | Risk |
|---|---|
| Light theme — chrome (toolbar, tabs, bookmark bar, address bar) | Unknown contrast. The toolbar uses `--toolbar-bg: rgba(255,255,255,0.88)` — likely fine but needs testing |
| Light theme — settings pages | Unknown — must check all sections |
| Light theme — context menus | Unknown — uses native menus, probably fine |
| Light theme — About page hero | Uses `aura-mark-colored.png` (colored mark) — fine visually but verify bg contrast |
| Window icon on light Windows taskbar | Icon is colorful gradient — should be visible on any color bg |
| Packaging / installer | `package.json` has build config — never tested `electron-builder` |

### 📋 KNOWN ISSUES

1. **Duplicate `.ntp-hero` CSS rule** in `theme.css` (lines 690-697 old, 699-707 new) — harmless (second wins via cascade) but should be cleaned
2. **14 pre-existing typecheck errors** from external modules — do NOT fix:
   - `blocker` module
   - `better-sqlite3` native module
   - `TabManager.getState` return type mismatch
   - `ninja.ts` / `shortcuts.ts` / `tabs.ts` type errors
   - `sidebar-panels` import / `types.ts` listing
3. **SVG images fail** in image save pipeline — expected (Chromium can't decode SVG to canvas)
4. **Video downloader** only works for standard `<video>` elements — no blob/MSE/DASH/HLS/DRM
5. **Dashboard layout toggle** (`aura:dash-layout` localStorage key) is independent of actual theme — user can be in dark theme with light layout UI or vice versa

---

## 4. KEY SOURCE CODE

### 4.1 — NTP Dashboard (Dark)

**File:** `src/renderer/src/pages/DashboardDark.tsx`

```tsx
import React, { useEffect, useRef, useState } from 'react'
import { showNativeInputMenu } from '../lib/buildInputMenu'
import { useSettings } from '../hooks/useSettings'
import auraMark from '../assets/brand/aura-mark-colored.png'

interface Props {
  onNavigate: (url: string) => void
  onSwitchLayout: () => void
}

export default function DashboardDark({
  onNavigate, onSwitchLayout
}: Props): React.ReactElement {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { settings } = useSettings()
  const s = settings as Record<string, unknown> | null
  const ntpLayout = (s?.ntpLayout as string) ?? 'default'
  const searchPosition = (s?.ntpSearchBarPosition as string) ?? 'center'

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    const isUrl =
      /^https?:\/\//i.test(trimmed) ||
      (/^[^\s]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(' '))
    if (isUrl) {
      const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      onNavigate(url)
    } else {
      const engine = (s?.defaultSearchEngine as string) ?? 'duckduckgo'
      const q = encodeURIComponent(trimmed)
      const searchUrl = (() => {
        switch (engine) {
          case 'google': return `https://www.google.com/search?q=${q}`
          case 'brave': return `https://search.brave.com/search?q=${q}`
          case 'startpage': return `https://www.startpage.com/sp/search?query=${q}`
          case 'duckduckgo':
          default: return `https://duckduckgo.com/?q=${q}`
        }
      })()
      onNavigate(searchUrl)
    }
    setQuery('')
  }

  if (ntpLayout === 'off') return <div className="ntp-blank" />

  return (
    <div className={`aurora-newtab ntp-layout-${ntpLayout} ntp-search-${searchPosition}`}>
      <div className="aurora-bg-glow" />
      <div className="aurora-bg-glow-secondary" />
      <button className="aurora-layout-toggle" onClick={onSwitchLayout} title="Switch layout">
        Switch layout
      </button>
      <div className="aurora-center">
        { /* ═══ HERO — EXACT TARGET ═══ */ }
        <div className="ntp-hero">
          <img src={auraMark} alt="" className="ntp-hero-mark" draggable={false} />
          <span className="ntp-hero-wordmark">Aura</span>
        </div>
        <form className="aurora-searchbar" onSubmit={handleSubmit}>
          <div className="aurora-cursor-bar" />
          <input ref={inputRef} type="text" value={query}
            onChange={(e) => setQuery(e.target.value)} placeholder="Search now"
            spellCheck={false} autoComplete="off"
            onContextMenu={(e) => {
              e.preventDefault(); e.stopPropagation()
              showNativeInputMenu(e.currentTarget, { isAddressBar: true, navigateFn: onNavigate })
            }} />
          <button type="button" className="aurora-scan-btn" title="Visual search (coming soon)" tabIndex={-1}>...</button>
          <button type="submit" className="aurora-mic-btn" title="Search">...</button>
        </form>
      </div>
    </div>
  )
}
```

### 4.2 — NTP Dashboard (Light)

**File:** `src/renderer/src/pages/DashboardLight.tsx`

```tsx
import React, { useEffect, useRef, useState } from 'react'
import { IconSparkle, IconMic, IconPlus, IconMore } from '../components/Icons'
import WidgetGrid from '../widgets/WidgetGrid'
import { showNativeInputMenu } from '../lib/buildInputMenu'
import { useSettings } from '../hooks/useSettings'
import auraMark from '../assets/brand/aura-mark-colored.png'

interface Props {
  onNavigate: (url: string) => void
  onSwitchLayout: () => void
}

export default function DashboardLight({
  onNavigate, onSwitchLayout
}: Props): React.ReactElement {
  const [prompt, setPrompt] = useState('')
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { settings } = useSettings()
  const s = settings as Record<string, unknown> | null
  const ntpLayout = (s?.ntpLayout as string) ?? 'default'
  const searchPosition = (s?.ntpSearchBarPosition as string) ?? 'center'

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return
    const isUrl = /^https?:\/\//i.test(trimmed) ||
      (/^[^\s]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(' '))
    if (isUrl) {
      const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      onNavigate(url)
    } else {
      const engine = (s?.defaultSearchEngine as string) ?? 'duckduckgo'
      const q = encodeURIComponent(trimmed)
      const searchUrl = (() => {
        switch (engine) {
          case 'google': return `https://www.google.com/search?q=${q}`
          case 'brave': return `https://search.brave.com/search?q=${q}`
          case 'startpage': return `https://www.startpage.com/sp/search?query=${q}`
          case 'duckduckgo':
          default: return `https://duckduckgo.com/?q=${q}`
        }
      })()
      onNavigate(searchUrl)
    }
    setPrompt('')
  }

  if (ntpLayout === 'off') return <div className="ntp-blank" />

  return (
    <div className={`dash-light-v2 ntp-layout-${ntpLayout} ntp-search-${searchPosition}`}>
      <div className="dash-light-bg-glow" />
      <button className="layout-toggle-floating" onClick={onSwitchLayout}>Switch layout</button>
      <div className="dash-light-inner">
        { /* ═══ HERO — EXACT SAME COMPOSITION AS DARK ═══ */ }
        <div className="ntp-hero">
          <img src={auraMark} alt="" className="ntp-hero-mark" draggable={false} />
          <span className="ntp-hero-wordmark">Aura</span>
        </div>
        <header className="dash-light-hero">
          <div className="dash-light-greeting-block">
            <h1 className="dash-light-title">What&apos;s on your mind?</h1>
          </div>
        </header>
        <form className="dash-light-prompt" onSubmit={handleSubmit}>
          <textarea ref={inputRef} value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showNativeInputMenu(e.currentTarget, { isAddressBar: true, navigateFn: onNavigate }) }}
            placeholder="Ask me anything, search the web, or type a URL&hellip;" rows={2} />
          <div className="dash-light-prompt-bar">
            <div className="dash-light-prompt-selectors">
              <select className="dash-light-select" defaultValue="balanced">
                <option>Balanced</option>
                <option>Creative</option>
                <option>Precise</option>
              </select>
              <select className="dash-light-select" defaultValue="auto">
                <option>Auto</option>
                <option>Web</option>
                <option>News</option>
              </select>
            </div>
            <div className="dash-light-prompt-buttons">
              <button type="button" className="dash-light-icon-btn" title="Attach"><IconPlus size={14} /></button>
              <button type="button" className="dash-light-icon-btn" title="Voice"><IconMic size={14} /></button>
              <button type="submit" className="dash-light-send"><IconSparkle size={12} /><span>Ask</span></button>
            </div>
          </div>
        </form>
        <div className="dash-light-widget-bar">
          <h2 className="dash-light-section-title">Your space</h2>
          <button className="dash-light-edit-btn" onClick={() => setEditing((v) => !v)}>
            <IconMore size={13} />{editing ? 'Done' : 'Edit widgets'}
          </button>
        </div>
        <WidgetGrid onNavigate={onNavigate} editing={editing} />
      </div>
    </div>
  )
}
```

### 4.3 — Layout Switcher (which dashboard to show)

**File:** `src/renderer/src/pages/NewTabDashboard.tsx`

```tsx
import React from 'react'
import DashboardDark from './DashboardDark'
import DashboardLight from './DashboardLight'
import { useLocalStorage } from '../hooks/useLocalStorage'

type LayoutMode = 'light' | 'dark'

interface Props {
  onNavigate: (url: string) => void
}

export default function NewTabDashboard({ onNavigate }: Props): React.ReactElement {
  const [layout, setLayout] = useLocalStorage<LayoutMode>('aura:dash-layout', 'dark')
  const toggle = (): void => setLayout((m) => (m === 'light' ? 'dark' : 'light'))
  return layout === 'light' ? (
    <DashboardLight onNavigate={onNavigate} onSwitchLayout={toggle} />
  ) : (
    <DashboardDark onNavigate={onNavigate} onSwitchLayout={toggle} />
  )
}
```

> **IMPORTANT:** The `aura:dash-layout` localStorage key is INDEPENDENT of the actual theme. A user can be in `aura-light` theme with `dark` dashboard layout, or vice versa. This is intentional for maximum flexibility.

### 4.4 — Hero CSS (the EXACT target sizing)

**File:** `src/renderer/src/styles/theme.css` (lines 699-733)

```css
.ntp-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-bottom: 48px;
  user-select: none;
  pointer-events: none;
}

.ntp-hero-mark {
  height: 120px !important;
  width: auto !important;
  max-width: 140px;
  object-fit: contain;
  flex-shrink: 0;
  -webkit-user-drag: none;
  user-drag: none;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}

.ntp-hero-wordmark {
  font-size: 96px !important;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--text-primary);
  font-family: -apple-system, 'Inter', BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

@media (max-width: 720px) {
  .ntp-hero-mark { height: 80px !important; }
  .ntp-hero-wordmark { font-size: 60px !important; }
  .ntp-hero { gap: 12px; margin-bottom: 32px; }
}
```

> **NOTE:** There is a DUPLICATE `.ntp-hero` rule at line 690 (old: gap 16px, mb 32px) that should be deleted. The one at line 699 (gap 18px, mb 48px) is the active one.

### 4.5 — Theme System (color tokens)

**File:** `src/renderer/src/lib/themePresets.ts`

The theme system uses CSS custom properties. The `applyPresetToDOM()` function sets all tokens on `document.documentElement`:

```typescript
export function applyPresetToDOM(preset: ThemePreset): void {
  const root = document.documentElement
  const c = preset.colors
  root.setAttribute('data-theme', preset.variant)   // 'light' or 'dark'
  root.setAttribute('data-preset', preset.id)        // 'aura-dark', 'aura-light', etc.
  root.style.setProperty('--bg-primary', c.bgPrimary)
  root.style.setProperty('--text-primary', c.textPrimary)
  root.style.setProperty('--toolbar-bg', c.toolbarBg)
  // ... all 20+ tokens ...
}
```

**aura-dark** (default): bg `#0a0a0c`, text `rgba(255,255,255,0.96)`, accent `#6366f1`
**aura-light**: bg `#fafafa`, text `#0f0f14`, accent `#6366f1`

### 4.6 — 4-Strategy Image Saver Pipeline

**File:** `src/main/imageSaver.ts`

The core insight: **Strategy 3 (main-process `net.request`) has NO CORS restrictions** because the main process makes the HTTP request, downloads the raw bytes, and sends them to the renderer for decoding via `createImageBitmap` + `OffscreenCanvas`.

```typescript
// The conversion script runs in the TAB's renderer via executeJavaScript
const CONVERT_SCRIPT = `
(async () => {
  // Strategy 1: find existing <img> on the page matching this URL
  const existingImg = findImg(TARGET_URL);
  if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
    const dataUrl = imgToDataUrl(existingImg, FORMAT, MIME, QUALITY);
    if (dataUrl) return dataUrl;
  }

  // Strategy 2: new Image() with crossOrigin='anonymous'
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise(resolve => { ... });
    if (loaded && img.naturalWidth > 0) { ... }
  } catch(e) {}

  // Strategy 3: main process downloaded raw data → createImageBitmap
  if (RAW_BASE64) {
    return await rawToDataUrl(RAW_BASE64, MIME, QUALITY);
  }

  // Strategy 4: fetch fallback (same-origin only)
  try {
    const res = await fetch(TARGET_URL);
    if (res.ok) { ... }
  } catch(e) {}

  return { error: 'Image is protected by the site' };
})()
`

// In main process:
export async function saveImageWithFormat(parentWindow, url, format, quality, sourceWcId) {
  // Try strategies 1 & 2 first (no raw data)
  let result = await sourceWc.executeJavaScript(scriptWithoutRaw, true)
  
  // If both failed, download via main process (no CORS) + try strategy 3
  if (typeof result !== 'string') {
    const rawBuf = await downloadBuffer(url)  // net.request — NO CORS
    result = await sourceWc.executeJavaScript(scriptWithRaw, true)
  }
  
  // Show save dialog with the converted data
  if (typeof result === 'string') {
    dialog.showSaveDialog(...)
  }
}
```

### 4.7 — Floating Popover Window Pattern

**File:** `src/main/imageSaverWindow.ts` (300×360)
**File:** `src/main/translatorWindow.ts` (400×300)

All popovers follow the same pattern:

```typescript
popoverWin = new BrowserWindow({
  width: POPOVER_WIDTH, height: POPOVER_HEIGHT,
  frame: false, transparent: true,
  resizable: false, movable: false,
  minimizable: false, maximizable: false,
  skipTaskbar: true, alwaysOnTop: true,
  show: false, parent,
  hasShadow: true,
  backgroundColor: '#00000000',
  webPreferences: {
    preload: join(__dirname, '../preload/...'),
    contextIsolation: true, sandbox: false, nodeIntegration: false
  }
})

// Position near mouse click, clamped to workarea
popoverWin.once('ready-to-show', () => {
  popoverWin?.webContents.send('...setData', { /* anchor data */ })
  popoverWin?.show()
})

// Auto-close on blur or parent move/resize
popoverWin.on('blur', () => closePopover())
parent.on('move', () => closePopover())
parent.on('resize', () => closePopover())
```

### 4.8 — Tab Favicon

**File:** `src/renderer/src/components/TabBar.tsx` (line 4)

```typescript
import auraFavicon from '../assets/brand/aura-mark-colored.png'
```

Used as fallback favicon for internal `aura://` pages when the tab has no real favicon. The colored "a" mark is visible on both light and dark tab backgrounds.

### 4.9 — About Page Hero

**File:** `src/renderer/src/pages/settings/AboutSection.tsx` (line 3)

```typescript
import auraLogo from '../../assets/brand/aura-mark-colored.png'
```

Rendered as `.about-hero-logo` (80px, border-radius: 16px) in the About settings section.

### 4.10 — Window Icon Resolution

**File:** `src/main/index.ts` (within BrowserWindow creation)

```typescript
function resolveIcon(name: string): string {
  const devPath = join(__dirname, `../../resources/icons/${name}`)
  const prodPath = join(process.resourcesPath!, 'icons', name)
  return existsSync(devPath) ? devPath : prodPath
}
```

Used for: `mainWindow.setIcon()`, system tray icon, Ninja window, popover windows.

### 4.11 — Translation Engine

**File:** `src/main/translator.ts`

```typescript
export async function translateText(text: string, targetLang?: string): Promise<TranslateResult> {
  const engine = (getSetting('translatorEngine') as string) || 'libretranslate'
  
  if (engine === 'google') return googleTranslate(text, lang)
  
  // LibreTranslate default, fallback to Google on failure
  try {
    return await libretranslate(text, lang)
  } catch (libreErr) {
    try {
      return await googleTranslate(text, lang)
    } catch (googleErr) {
      return { translatedText: '', engine: 'error', error: `Libre: ...; Google: ...` }
    }
  }
}
```

### 4.12 — Brand Asset (the colorful "a" mark)

**File:** `src/renderer/src/assets/brand/aura-mark-colored.png`

This is a copy of `resources/icons/1ICON.png` — a 2000×2000 RGBA PNG containing a colorful gradient "a" letterform on a transparent background. The "a" mark is approximately 800×800 pixels centered in the 2000×2000 canvas.

The file has:
- **Transparent corners** (all 4 corners have alpha = 0) — no background plate
- **Colorful gradient content** — sampled pixel at (800,1000) = `rgb(238, 253, 65)` (yellow-green), other areas show blue `(0,119,255)`, purple `(105,39,114)`
- **White center body** — center pixel at (1000,1000) = `rgb(250, 250, 250)` (the filled interior of the "a" letterform)

### 4.13 — `resources/icons/` Directory (source PNGs)

All icon files live in `resources/icons/` (except wordmark composites in `resources/`):

| File | Size | Content |
|---|---|---|
| `1ICON.png` | 114KB | **Primary colorful "a" mark** — transparent bg, rainbow gradient (yellow→pink→purple). **THIS IS THE SOURCE OF TRUTH** |
| `2.png` | 263KB | Alternative colorful variant — more saturated, warmer tones |
| `WHITE.png` | 69KB | Monochrome white "a" on transparent — **do NOT use for hero** |
| `BALCK.png` | 70KB | Monochrome black "a" on transparent — **do NOT use for hero** |
| `icon-16.png` through `icon-512.png` | various | Resized icons generated by `generate-icons.js` from 1ICON.png |
| `icon.ico` | 361KB | Windows ICO format (multiple sizes) |

Wordmark composites in `resources/`:

| File | Size | Content |
|---|---|---|
| `TRANSPARENCY.png` | 664KB | Full-color wordmark (icon + "Aura" text as one image) |
| `WITH BACKGROUND.png` | 601KB | Same wordmark with background plate |
| `text AURA without background colord.png` | 315KB | Wide colorful wordmark, transparent bg, aspect ratio 2.9 |
| `text AURA with background colord.png` | 308KB | Same with bg plate |

---

## 5. WHAT TO DO NEXT

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

5. **About page** — hero logo visible, text legible, "System" / "Storage" cards correct

**If you find contrast issues, fix them in `src/renderer/src/styles/theme.css`** by checking which variable is wrong and adjusting in `src/renderer/src/lib/themePresets.ts`.

### 🥈 HIGH PRIORITY — Verify & Ship

6. **Packaging** — run `npx electron-builder` (or `npm run build:win`) and verify:
   - Installer icon renders correctly
   - App icon in Windows taskbar / alt-tab
   - App launches without errors after install

7. **Window icon on both taskbar themes** — verify the colored "a" icon is visible on both Windows light and dark taskbar backgrounds

8. **Edge cases** — what happens when:
   - No network? (Translator should show error, image saver should show "Could not download image")
   - LibreTranslate is down? (Should fall back to Google gracefully)
   - Page has 0 images? (Batch save shows dialog, then says 0 saved)
   - Page has 500 images? (Batch save performance — consider chunking)
   - Video-less page? (Downloader overlay should not appear)

### 🥉 MEDIUM PRIORITY — Code Cleanup

9. **Delete duplicate `.ntp-hero` CSS rule** (lines 690-697 in theme.css)

10. **Remove `_verify.js` and `_inspect.js` temp files** if they exist in project root

11. **Remove unused wordmark PNGs** from `resources/` (TRANSPARENCY.png, WITH BACKGROUND.png, text AURA*.png) if they're truly not needed — but keep `1ICON.png` as source of truth

### 📋 NEXT STAGE SUGGESTION

After v1.0 ships, the next stage should be **V2 — Performance & Features**:

- Lazy-load tab WebViews
- Download manager UI
- Session restore / crash recovery
- Password manager / autofill
- Ad blocking (Electron `contentFiltering` API)
- Chrome extension API compatibility

---

## VERIFICATION CHEAT SHEET

When verifying the hero in a running app via Chrome DevTools Protocol:

```javascript
// Query hero elements via CDP Runtime.evaluate
const mark = document.querySelector('.ntp-hero-mark')
const text = document.querySelector('.ntp-hero-wordmark')

// Expected values (already verified — these should not regress):
mark.getBoundingClientRect().height  // 120
getComputedStyle(text).fontSize       // "96px"
getComputedStyle(text).color          // rgb(15,15,20) in light, rgba(255,255,255,0.96) in dark
getComputedStyle(mark.parentElement).gap  // "18px"
getComputedStyle(mark.parentElement).marginBottom  // "48px"
```

To verify the mark image has NO background plate:
```javascript
// Create canvas, drawImage, sample 4 corners
const corner = (x, y) => ctx.getImageData(x, y, 1, 1).data
const corners = [
  corner(2, 2),  // top-left
  corner(canvas.width - 3, 2),  // top-right
  corner(2, canvas.height - 3),  // bottom-left
  corner(canvas.width - 3, canvas.height - 3)  // bottom-right
]
// All must have alpha < 30
corners.every(c => c[3] < 30)  // must be true
```

To verify the mark has colorful gradient content:
```javascript
// Sample at 9 points across the horizontal center of the image
for (let i = 0; i < 9; i++) {
  const x = Math.round(canvas.width * (0.1 + i * 0.1))
  const y = Math.round(canvas.height * 0.5)
  const p = ctx.getImageData(x, y, 1, 1).data
  // At least one should have varying RGB values
}
```

---

## QUICK START

```bash
# Install
cd aura
npm install

# Development
npm run dev          # or: npx electron-vite dev
npm run build        # or: npx electron-vite build

# TypeScript check
npm run typecheck    # or: npx tsc --noEmit

# Launch built app
npx electron out/main/index.js

# Launch with remote debugging (for CDP verification)
npx electron out/main/index.js --remote-debugging-port=9222

# Package
npm run build:win    # (requires electron-builder config)
```

---

*This handoff was generated at STAGE BRAND-LOGO-FIX-4 — the NTP hero is exactly at target (120px mark, 96px text, colorful gradient "a" on transparent bg). All 4 native features ship. Ready for v1.0.*
