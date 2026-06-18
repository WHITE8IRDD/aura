import type { WebContents } from 'electron'

/**
 * Extract the page's full HTML for client-side Readability parsing.
 *
 * We do the extraction in the renderer (where the DOM lives) rather
 * than serializing here. This function just fetches the URL + document
 * title and returns them to the renderer which then re-fetches the page
 * via a separate request to run Readability on a fresh DOM clone.
 */
export async function getReaderPayload(
  wc: WebContents
): Promise<{ url: string; title: string; html: string } | null> {
  try {
    const url = wc.getURL()
    const title = wc.getTitle()
    // Get full document HTML
    const html = (await wc.executeJavaScript(
      `document.documentElement.outerHTML`,
      true
    )) as string
    return { url, title, html }
  } catch (err) {
    console.warn('[Aura/reader] Extraction failed:', err)
    return null
  }
}
