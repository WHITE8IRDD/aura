# Aura v0.11.1

Fix release: full-page translation pipeline, native tab context menu, and pinned-tab drag reorder that stays put. Build passes clean (`npm run build`), no new typecheck errors.

## Translation button now works
- **Main (`src/main/index.ts`)**: new `translation:translate-page` handler — grabs the active tab's `WebContents`, runs an inline DOM-walker via `executeJavaScript` that batches text nodes and translates them through the Google Translate API (originals kept in `window.__auraOrigMap`); new `translation:revert` handler restores original text and clears the `.aura-translated` markers.
- Pipeline: `UtilityCluster.tsx` → `window.aura.translation.translatePage()` → preload `contextBridge` → `ipcMain.handle` → active tab DOM.

## Right-click context menu on tabs
- **Preload (`src/preload/index.ts`)**: exposed `tabs.showContextMenu(tabId)` → `tabs:show-context-menu` IPC.
- **Main (`src/main/index.ts`)**: native `Menu`/`MenuItem` handler with Pin/Unpin Tab, Duplicate Tab, Mute/Unmute Tab, Close Tab.
- **Renderer (`TabBar.tsx`)**: `onContextMenu` attached to pinned tab elements (unpinned `<Tab>` already had it).

## Pinned-tab drag reorder no longer snaps back
- **Renderer (`TabBar.tsx`)**: drag system rewritten on `dragRef` + `forceRender` (smooth 60fps transforms, sibling tabs slide with 180ms ease). New `orderOverride` lock applies the dropped ID order to `displayTabs` instantly and only clears once `props.tabs` catches up from the main process — snap-back impossible. Spinner now shows only when `loading && !favicon`.
- **Preload**: `tabs.reorder` accepts a full ordered-ID array (new) or legacy `(fromId, toIndex)`.
- **Main (`tabs.ts` + `index.ts`)**: new `TabManager.setOrder()` adopts the dropped order, then `normalizeOrder()` + `emit()` broadcast `tabs:update` and persist via session save. Legacy single-move contract kept for `VerticalTabBar`.
- **Root cause found**: renderer was sending an ID array to a handler expecting `(fromId, toIndex)` — `order.indexOf(array)` returned -1, so main silently did nothing and never broadcast.

## Cursor + crash fixes
- `theme.css`: `cursor: default !important` on all tab elements (`grabbing` only while dragging), `user-select: none`, `no-drag` app region, `spin` keyframes + `.tab-spinner`.
- `TabBar.tsx`: `cursor: default` inline styles, `WebkitAppRegion: no-drag`, fixed `props is not defined` ReferenceError (component now takes `props` directly), added missing `NinjaAvatar` import.
- Earlier session groundwork this builds on: GPU flag crash fix, `transparent: false` window, renderer `outDir`, relaxed CSP, `ErrorBoundary`, `useRef`/`handleContextMenu` fixes.

## Verify
1. Pin 2+ tabs, drag one to a new spot → it stays.
2. Right-click any tab → native menu appears.
3. Open a foreign-language page → translate button translates it; revert restores it.
4. Reload the browser → tab order persists.
