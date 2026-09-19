# SHIELDS_RECON.md — Aura Browser Ad-Block & Privacy Infrastructure Recon

> Generated: 2026-09-19
> Purpose: Recon for Prompt 1 (backend) + Prompt 2 (popover, scriptlet, integration)

---

## 1. SESSION / PARTITION ANALYSIS

### Tab Sessions

**Default session:** `session.defaultSession` — used by all normal tabs.
- `src/main/tabs.ts:139` — `this._session = ses ?? session.defaultSession`

**Ninja Mode session:** `session.fromPartition('ninja-{Date.now()}-{id}', { cache: false })`
- `src/main/ninja.ts:30` — `const partition = ninja-${Date.now()}-${id}`
- `src/main/ninja.ts:31` — `const privateSession = session.fromPartition(partition, { cache: false })`
- `src/main/ninja.ts:47` — passed as `session: privateSession` in webPreferences

**Split view:** `src/main/splitManager.ts:40` — no explicit session (inherits default).

### Sessions the Blocker Must Be Installed On

1. **`session.defaultSession`** — all normal tabs (majority of traffic)
2. **Each Ninja Mode `privateSession`** — created dynamically per Ninja window

The blocker's `installBlockerOnSession()` uses a `WeakSet<Session>` guard, so it's safe to call on any session. The `web-contents-created` hook in `src/main/index.ts:1376` already calls `registerNetworkAdBlocker(contents.session)` for every new WebContents, covering Ninja sessions automatically.

---

## 2. EXISTING `webRequest.*` CALLS

| # | File | Line | API | Enclosing Function |
|---|------|------|-----|-------------------|
| 1 | `src/main/index.ts` | 225 | `webRequest.onBeforeSendHeaders` | `startupReady` (video stream priority) |
| 2 | `src/main/blocker/index.ts` | 134 | `webRequest.onBeforeRequest` | `installBlocker(targetSession)` — tracking param strip |
| 3 | `src/main/blocker/adblock-engine.ts` | 121 | `engine.enableBlockingInSession(targetSession)` | `registerNetworkAdBlocker()` — uses onBeforeRequest internally |
| 4 | `src/main/security/https-only.ts` | 27 | `webRequest.onBeforeRequest` | `setupHttpsOnly(targetSession)` |
| 5 | `src/main/storeIntegration.ts` | 23 | `webRequest.onBeforeSendHeaders` | `applyChromeUASpoof(targetSession)` |
| 6 | `src/main/settings-bridge.ts` | 67 | `webRequest.onBeforeSendHeaders` | `applyHeadersToSession(targetSession)` |
| 7 | `src/main/settings-bridge.ts` | 69 | `webRequest.onBeforeSendHeaders(null)` | Unregister previous handler |

### CRITICAL: Multiple `onBeforeRequest` Registrations

The current codebase has **3 separate `onBeforeRequest` listeners**:
1. `blocker/index.ts:134` — tracking param strip
2. `blocker/adblock-engine.ts:121` — `enableBlockingInSession()` internally registers onBeforeRequest
3. `security/https-only.ts:27` — HTTPS-only upgrade

Per Electron docs, only ONE `onBeforeRequest` listener is allowed per session. A second registration **silently replaces** the first. This means the current implementation has a race condition.

**The new blocker (File F) must consolidate ALL `onBeforeRequest` logic into a single handler.**

---

## 3. POPOVER `webPreferences` (VERBATIM)

### Shields Popover (existing — `src/main/shieldsWindow.ts:58-63`)
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  sandbox: false,
  nodeIntegration: false
}
```

### MediaHub Popover (`src/main/mediaHubWindow.ts:55-60`)
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/mediaHubPopover.js'),
  contextIsolation: true,
  sandbox: false,
  nodeIntegration: false
}
```

### Virtual Keyboard (`src/main/virtualKeyboard.ts:83-88` — hash routing reference)
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: false,
}
```

---

## 4. POPOVER `loadURL` / `loadFile` (VERBATIM)

### Shields Popover (`src/main/shieldsWindow.ts:66-71`)
```typescript
const popoverUrl = process.env['ELECTRON_RENDERER_URL']
  ? `${process.env['ELECTRON_RENDERER_URL']}/shieldsPopover.html?domain=${encodeURIComponent(domain)}`
  : `file://${join(__dirname, '../renderer/shieldsPopover.html')}?domain=${encodeURIComponent(domain)}`
shieldsPopoverWin.loadURL(popoverUrl)
```

### Virtual Keyboard (`src/main/virtualKeyboard.ts:94-99`)
```typescript
const isDev = !app.isPackaged && process.env['ELECTRON_RENDERER_URL']
const url = isDev
  ? `${process.env['ELECTRON_RENDERER_URL']}#/virtual-keyboard`
  : `file://${join(__dirname, '../renderer/index.html')}#/virtual-keyboard`
vkWindow.loadURL(url)
```

---

## 5. `setWindowOpenHandler` (VERBATIM)

### In `src/main/tabs.ts:727-737`
```typescript
wc.setWindowOpenHandler(({ url, disposition }) => {
  // Consult the shared popup policy FIRST — hijacked opens must die here
  // instead of being converted into new tabs.
  try {
    if (shouldBlockPopup(wc.getURL() || '', url, disposition)) {
      return { action: 'deny' }
    }
  } catch {}
  this.create(url)
  return { action: 'deny' }
})
```

### In `src/main/blocker/popup-interceptor.ts:71-76`
```typescript
wc.setWindowOpenHandler(({ url, disposition }) => {
  if (shouldBlockPopup(wc.getURL() || '', url, disposition)) {
    return { action: 'deny' }
  }
  return { action: 'allow' }
})
```

**Note:** tabs.ts calls `setupTabNavigationGuards(wc)` which calls `applyPopupInterceptor(wc)`. But then tabs.ts ALSO has its own `setWindowOpenHandler` in `wireEvents()`. Per Electron docs, the LAST registration wins. So tabs.ts handler is the active one, and it delegates to `shouldBlockPopup()`.

---

## 6. HELPER: Tab ID → WebContents

### `TabManager.findTab()` — static (`src/main/tabs.ts:107-112`)
```typescript
static findTab(tabId: number): TabManager | null {
  for (const mgr of TabManager.instances.values()) {
    if (mgr.records.has(tabId)) return mgr
  }
  return null
}
```

### `TabManager.getTab()` — instance (`src/main/tabs.ts:174`)
```typescript
getTab(id: number): TabRecord | undefined { return this.records.get(id) }
```

### `TabManager.getWebContentsId()` — instance (`src/main/tabs.ts:221-224`)
```typescript
getWebContentsId(id: number): number | null {
  const rec = this.records.get(id)
  return rec?.view?.webContents.id ?? null
}
```

### `getTabsForEvent()` — `src/main/index.ts:415-424`
```typescript
function getTabsForEvent(e: Electron.IpcMainInvokeEvent): TabManager | null {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return null
  if (win === mainWindow) return tabs
  const ninjaAny = ninja as unknown as {
    getManager?: (id: number) => TabManager | null
    getTabsForWindow?: (w: BrowserWindow) => TabManager | null
  }
  return ninjaAny.getManager?.(win.id) ?? ninjaAny.getTabsForWindow?.(win) ?? null
}
```

---

## 7. `package.json` SCRIPTS

```json
"scripts": {
  "dev": "electron-vite dev --noSandbox",
  "dev:verbose": "electron-vite dev",
  "build": "electron-vite build",
  "preview": "electron-vite preview",
  "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json",
  "postinstall": "electron-rebuild -f -w better-sqlite3 || exit 0"
}
```

### electron-vite Externalization (`electron.vite.config.ts`)
```typescript
main: {
  plugins: [externalizeDepsPlugin()],  // auto-externalizes all node_modules
  build: {
    outDir: 'out/main',
    rollupOptions: {
      input: { index: resolve(__dirname, 'src/main/index.ts') },
      external: ['better-sqlite3', 'canvas']  // native modules
    }
  }
}
```

New deps must go in `dependencies` (not `devDependencies`) for electron-vite to externalize them.

---

## 8. DATABASE OPEN CALL

**File:** `src/main/db/index.ts:26`
```typescript
db = new Database(dbPath)
```

Called from `src/main/index.ts:209`:
```typescript
const db = getDb()
initShieldsDatabase(db)
```

---

## 9. `app.on('before-quit', ...)` HANDLER

**File:** `src/main/index.ts:1335-1338`
```typescript
app.on('before-quit', (event) => {
  try { forceShutdownMediaFlush() } catch {}
  maybeClearOnQuit()
})
```

**Also:** `src/main/index.ts:1340-1344`
```typescript
app.on('will-quit', () => {
  try { forceFlushMediaResume() } catch {}
  try { cleanupKeyboard() } catch {}
  globalShortcut.unregisterAll()
})
```

---

## 10. DELETION TARGETS

### Files matching `src/main/blocker/*`

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `src/main/blocker/index.ts` | 228 | Current blocker orchestrator (TO BE REPLACED by File F) |
| 2 | `src/main/blocker/adblock-engine.ts` | 124 | Secondary network blocker (TO BE REPLACED by File E) |
| 3 | `src/main/blocker/popup-interceptor.ts` | 93 | Popup blocking (TO BE MERGED into File F) |
| 4 | `src/main/blocker/cosmetics.ts` | 77 | Cosmetic CSS injection (TO BE MERGED into File F) |
| 5 | `src/main/blocker/shields-store.ts` | 131 | Shields SQLite store (TO BE REPLACED by File A) |
| 6 | `src/main/blocker/url-cleaner.ts` | 44 | Tracking param strip (TO BE REPLACED by File D) |
| 7 | `src/main/blocker/lists.ts` | 9 | Cache path helper (TO BE REMOVED) |
| 8 | `src/main/blocker/phishing.ts` | 22 | Phishing domain checker (keep as-is, not in scope) |

### `src/preload/stealth-adblock.ts` (186 lines)

TO BE REPLACED by `src/preload/shields-scriptlets.ts` in Prompt 2. Do NOT delete in Prompt 1 — comment out imports only.

### Old shield window files
| File | Status |
|------|--------|
| `src/main/shieldsWindow.ts` | TO BE REPLACED by `src/main/blocker/shields-popover.ts` in Prompt 2 |
| `src/renderer/shieldsPopover.html` | TO BE KEPT — used by existing separate HTML entry |
| `src/renderer/src/shieldsPopover.tsx` | TO BE REPLACED by ShieldsPopover.tsx in Prompt 2 |
| `src/renderer/src/components/ShieldsPopoverWindow.tsx` | TO BE REPLACED by ShieldsPopover.tsx in Prompt 2 |
| `src/renderer/src/components/ShieldsPopover.tsx` | TO BE REPLACED by ShieldsPopover.tsx in Prompt 2 |
