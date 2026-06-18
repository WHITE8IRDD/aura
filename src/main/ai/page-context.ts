import type { WebContents } from 'electron'

const MAX_CHARS = 8000

export async function extractPageContext(
  wc: WebContents
): Promise<{ url: string; title: string; text: string } | null> {
  try {
    const url = wc.getURL()
    const title = wc.getTitle()

    const text = await wc.executeJavaScript(`
      (function() {
        try {
          const clone = document.body.cloneNode(true);
          const junk = clone.querySelectorAll(
            'script, style, noscript, iframe, nav, header, footer, aside, ' +
            'form, button, input, [role="navigation"], [role="banner"], ' +
            '[role="complementary"], [class*="comment"], [class*="sidebar"], ' +
            '[class*="advert"], [class*="popup"]'
          );
          junk.forEach((el) => el.remove());
          const main = clone.querySelector('main, article, [role="main"]') || clone;
          let text = (main.innerText || '').trim();
          text = text.replace(/\\n{3,}/g, '\\n\\n').replace(/[ \\t]+/g, ' ');
          return text.slice(0, ${MAX_CHARS});
        } catch (e) {
          return (document.body.innerText || '').slice(0, ${MAX_CHARS});
        }
      })()
    `) as string

    return { url, title, text: text || '' }
  } catch (err) {
    console.warn('[Aura/ai] Page extraction failed:', err)
    return null
  }
}
