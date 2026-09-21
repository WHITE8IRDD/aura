/**
 * openTab.ts — Adapter to Aura Browser's Tab Management System
 * Opens YouTube links in new Aura tabs rather than navigating the current view.
 */

export function openInNewTab(url: string): void {
  if (!url) return

  try {
    // Primary Aura tab creation API — opens a real tab, keeps this route alive.
    if (window.aura?.tabs?.create) {
      void window.aura.tabs.create(url)
      return
    }

    // Custom Event bridge fallback for WebContentsView tab creation.
    window.dispatchEvent(new CustomEvent('aura:create-tab', { detail: { url } }))
  } catch (err) {
    console.error('[Aura YouTube] Failed to open URL in new tab:', err)
  }
}
