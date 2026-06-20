import { ipcRenderer } from 'electron'

const SENTINEL = ' ||| '
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT'])
const SKIP_CLASSES = ['notranslate', 'translator-active']

const originals = new Map<Node, string>()

function isVisible(el: Node): boolean {
  if (!(el instanceof HTMLElement)) return true
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function collectTextNodes(root: Node): Text[] {
  const texts: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const parent = node.parentElement
    if (!parent) continue
    if (SKIP_TAGS.has(parent.tagName)) continue
    if (parent.closest?.('[class*="notranslate"]')) continue
    for (const cls of SKIP_CLASSES) {
      if (parent.classList?.contains(cls)) continue
    }
    if (!isVisible(parent)) continue
    const text = node.textContent?.trim()
    if (text && text.length > 0) {
      texts.push(node as Text)
    }
  }
  return texts
}

async function translatePage(targetLang: string): Promise<void> {
  const texts = collectTextNodes(document.body)
  if (texts.length === 0) return

  const chunks: { nodes: Text[]; text: string }[] = []
  let current: { nodes: Text[]; text: string } = { nodes: [], text: '' }

  for (const t of texts) {
    const line = t.textContent || ''
    const nextLen = current.text.length + SENTINEL.length + line.length

    if (current.nodes.length > 0 && nextLen > 1500) {
      chunks.push(current)
      current = { nodes: [], text: '' }
    }

    if (current.nodes.length > 0) current.text += SENTINEL
    current.text += line
    current.nodes.push(t)
  }
  if (current.nodes.length > 0) chunks.push(current)

  for (const chunk of chunks) {
    try {
      const result = await ipcRenderer.invoke('translator:translate', chunk.text, targetLang)
      if (!result.translatedText) continue

      const translatedLines = result.translatedText.split(SENTINEL)

      for (let i = 0; i < chunk.nodes.length && i < translatedLines.length; i++) {
        const original = chunk.nodes[i].textContent || ''
        const translated = translatedLines[i]
        if (translated && translated !== original) {
          originals.set(chunk.nodes[i], original)
          chunk.nodes[i].textContent = translated
        }
      }
    } catch (err) {
      console.warn('[pageTranslator] chunk error:', err)
    }
  }
}

function revertPage(): void {
  for (const [node, original] of originals) {
    node.textContent = original
  }
  originals.clear()
}

ipcRenderer.on('pageTranslator:translate', (_e, targetLang: string) => {
  translatePage(targetLang)
})

ipcRenderer.on('pageTranslator:revert', () => {
  revertPage()
})
