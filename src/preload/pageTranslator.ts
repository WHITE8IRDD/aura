import { ipcRenderer } from 'electron'

/**
 * Aura Page Translator — Robust DOM walker with SENTINEL batch-join.
 * Handles: standard text nodes, shadow DOM (open), attributes, dynamic content.
 * Retry/fallback at IPC level. Revert restores both text and attributes.
 */

const SENTINEL = ' ||| '
const MAX_BATCH_CHARS = 1500
const RETRY_COUNT = 3
const RETRY_DELAY_MS = 1000

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SVG', 'MATH',
  'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'EMBED',
])
const SKIP_CLASSES = /notranslate|aura-translated|translator-active/
const TRANSLATABLE_ATTRS = ['title', 'aria-label', 'placeholder', 'alt']
const HAS_TEXT_RE = /[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0600-\u06FF]/

const originals = new Map<Node, string>()
const attrOriginals = new Map<Element, { attr: string; value: string }[]>()

function isVisible(el: Node): boolean {
  if (!(el instanceof HTMLElement)) return true
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function shouldSkipElement(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true
  if (el.getAttribute('translate') === 'no') return true
  if (el.classList && SKIP_CLASSES.test(el.className)) return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

function collectTextNodes(root: Node): Text[] {
  const texts: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        if (shouldSkipElement(el)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_SKIP
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT
        if (!isVisible(parent)) return NodeFilter.FILTER_REJECT
        const text = node.textContent?.trim() || ''
        if (text.length < 1 || text.length > 5000) return NodeFilter.FILTER_REJECT
        if (!HAS_TEXT_RE.test(text)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      }
      return NodeFilter.FILTER_SKIP
    }
  })

  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
      texts.push(node as Text)
    }
  }

  // Shadow DOM traversal (open mode)
  if (root instanceof Element || root instanceof Document) {
    const container = root instanceof Document ? root.body : root
    if (container) {
      for (const el of container.querySelectorAll('*')) {
        if (el.shadowRoot) {
          texts.push(...collectTextNodes(el.shadowRoot))
        }
      }
    }
  }

  return texts
}

function collectTranslatableAttrs(root: Document): { el: Element; attr: string; text: string }[] {
  const items: { el: Element; attr: string; text: string }[] = []
  const elements = root.querySelectorAll(TRANSLATABLE_ATTRS.map(a => `[${a}]`).join(','))
  for (const el of elements) {
    if (SKIP_TAGS.has(el.tagName)) continue
    if (el.getAttribute('translate') === 'no') continue
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = el.getAttribute(attr)
      if (val && val.trim().length > 1 && HAS_TEXT_RE.test(val)) {
        items.push({ el, attr, text: val.trim() })
      }
    }
  }
  return items
}

async function translateWithRetry(text: string, targetLang: string): Promise<string | null> {
  for (let attempt = 0; attempt < RETRY_COUNT; attempt++) {
    try {
      const result = await ipcRenderer.invoke('translator:translate', text, targetLang)
      if (result?.translatedText) return result.translatedText
    } catch (err) {
      console.warn(`[pageTranslator] attempt ${attempt + 1} failed:`, err)
      if (attempt < RETRY_COUNT - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
      }
    }
  }
  return null
}

async function translatePage(targetLang: string): Promise<void> {
  const texts = collectTextNodes(document.body)
  if (texts.length === 0) return

  // Batch text nodes using SENTINEL join
  const chunks: { nodes: Text[]; text: string }[] = []
  let current: { nodes: Text[]; text: string } = { nodes: [], text: '' }

  for (const t of texts) {
    const line = t.textContent || ''
    const nextLen = current.text.length + SENTINEL.length + line.length

    if (current.nodes.length > 0 && nextLen > MAX_BATCH_CHARS) {
      chunks.push(current)
      current = { nodes: [], text: '' }
    }

    if (current.nodes.length > 0) current.text += SENTINEL
    current.text += line
    current.nodes.push(t)
  }
  if (current.nodes.length > 0) chunks.push(current)

  // Translate text nodes with retry
  for (const chunk of chunks) {
    const translated = await translateWithRetry(chunk.text, targetLang)
    if (!translated) continue

    const translatedLines = translated.split(SENTINEL)
    for (let i = 0; i < chunk.nodes.length && i < translatedLines.length; i++) {
      const original = chunk.nodes[i].textContent || ''
      const translatedText = translatedLines[i]
      if (translatedText && translatedText !== original) {
        originals.set(chunk.nodes[i], original)
        chunk.nodes[i].textContent = translatedText
        chunk.nodes[i].parentElement?.classList.add('aura-translated')
      }
    }
  }

  // Translate attributes
  const attrItems = collectTranslatableAttrs(document)
  if (attrItems.length > 0) {
    const attrChunks: { items: typeof attrItems; text: string }[] = []
    let attrCurrent: { items: typeof attrItems; text: string } = { items: [], text: '' }

    for (const item of attrItems) {
      const nextLen = attrCurrent.text.length + SENTINEL.length + item.text.length
      if (attrCurrent.items.length > 0 && nextLen > MAX_BATCH_CHARS) {
        attrChunks.push(attrCurrent)
        attrCurrent = { items: [], text: '' }
      }
      if (attrCurrent.items.length > 0) attrCurrent.text += SENTINEL
      attrCurrent.text += item.text
      attrCurrent.items.push(item)
    }
    if (attrCurrent.items.length > 0) attrChunks.push(attrCurrent)

    for (const chunk of attrChunks) {
      const translated = await translateWithRetry(chunk.text, targetLang)
      if (!translated) continue

      const parts = translated.split(SENTINEL)
      for (let i = 0; i < chunk.items.length && i < parts.length; i++) {
        const item = chunk.items[i]
        const translatedText = parts[i]
        if (translatedText && translatedText !== item.text) {
          if (!attrOriginals.has(item.el)) attrOriginals.set(item.el, [])
          attrOriginals.get(item.el)!.push({ attr: item.attr, value: item.text })
          item.el.setAttribute(item.attr, translatedText)
          item.el.setAttribute('data-aura-translated', 'true')
        }
      }
    }
  }

  // Start dynamic content observer
  startDynamicObserver(targetLang)
}

function revertPage(): void {
  stopDynamicObserver()

  for (const [node, original] of originals) {
    if (node.parentNode) node.textContent = original
  }
  originals.clear()

  for (const [el, attrs] of attrOriginals) {
    for (const { attr, value } of attrs) {
      el.setAttribute(attr, value)
    }
    el.removeAttribute('data-aura-translated')
  }
  attrOriginals.clear()

  document.querySelectorAll('.aura-translated').forEach(el => {
    el.classList.remove('aura-translated')
  })
}

// Dynamic content observer
let dynamicObserver: MutationObserver | null = null

function startDynamicObserver(targetLang: string): void {
  if (dynamicObserver) return
  dynamicObserver = new MutationObserver((mutations) => {
    const newNodes: Text[] = []
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) {
        if (added.nodeType === Node.TEXT_NODE) {
          const text = added.textContent?.trim() || ''
          if (text.length >= 1 && HAS_TEXT_RE.test(text)) {
            newNodes.push(added as Text)
          }
        } else if (added instanceof Element) {
          const walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT, null)
          let n: Node | null
          while ((n = walker.nextNode())) {
            const text = n.textContent?.trim() || ''
            if (text.length >= 1 && HAS_TEXT_RE.test(text)) {
              newNodes.push(n as Text)
            }
          }
        }
      }
    }
    if (newNodes.length > 0) {
      // Batch and translate new nodes
      const chunks: { nodes: Text[]; text: string }[] = []
      let current: { nodes: Text[]; text: string } = { nodes: [], text: '' }
      for (const t of newNodes) {
        const line = t.textContent || ''
        if (current.nodes.length > 0 && current.text.length + SENTINEL.length + line.length > MAX_BATCH_CHARS) {
          chunks.push(current)
          current = { nodes: [], text: '' }
        }
        if (current.nodes.length > 0) current.text += SENTINEL
        current.text += line
        current.nodes.push(t)
      }
      if (current.nodes.length > 0) chunks.push(current)

      for (const chunk of chunks) {
        translateWithRetry(chunk.text, targetLang).then(translated => {
          if (!translated) return
          const parts = translated.split(SENTINEL)
          for (let i = 0; i < chunk.nodes.length && i < parts.length; i++) {
            const original = chunk.nodes[i].textContent || ''
            if (parts[i] && parts[i] !== original) {
              originals.set(chunk.nodes[i], original)
              chunk.nodes[i].textContent = parts[i]
              chunk.nodes[i].parentElement?.classList.add('aura-translated')
            }
          }
        })
      }
    }
  })
  dynamicObserver.observe(document.body, { childList: true, subtree: true })
}

function stopDynamicObserver(): void {
  if (dynamicObserver) {
    dynamicObserver.disconnect()
    dynamicObserver = null
  }
}

// IPC listeners
ipcRenderer.on('pageTranslator:translate', (_e, targetLang: string) => {
  translatePage(targetLang)
})

ipcRenderer.on('pageTranslator:revert', () => {
  revertPage()
})
