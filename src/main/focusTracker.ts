import { app, webContents, type WebContents } from 'electron';

let lastFocusedWcId: number | null = null;
const excludedWcIds = new Set<number>();

export function excludeFromFocusTracking(wcId: number): void {
  excludedWcIds.add(wcId);
}

export function initFocusTracker(): void {
  app.on('browser-window-focus', (_event, window) => {
    const wc = window.webContents;
    if (wc && !excludedWcIds.has(wc.id)) {
      lastFocusedWcId = wc.id;
    }
  });

  // Track webContents focused directly
  webContents.getAllWebContents().forEach((wc) => {
    wc.on('focus', () => {
      if (!excludedWcIds.has(wc.id)) {
        lastFocusedWcId = wc.id;
      }
    });
  });

  app.on('web-contents-created', (_event, wc) => {
    wc.on('focus', () => {
      if (!excludedWcIds.has(wc.id)) {
        lastFocusedWcId = wc.id;
      }
    });
  });
}

export function getLastFocusedWebContents(): WebContents | null {
  if (lastFocusedWcId !== null) {
    try {
      const wc = webContents.fromId(lastFocusedWcId);
      if (wc && !wc.isDestroyed()) return wc;
    } catch {}
  }

  // Fallback: return active WebContents from focused window
  const allWcs = webContents.getAllWebContents();
  const valid = allWcs.filter((wc) => !excludedWcIds.has(wc.id) && !wc.isDestroyed());
  return valid.length > 0 ? valid[valid.length - 1] : null;
}
