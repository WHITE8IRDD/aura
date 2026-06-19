export type InputElement = HTMLInputElement | HTMLTextAreaElement

function getValueSetter(el: InputElement) {
  const proto = el instanceof HTMLInputElement
    ? window.HTMLInputElement.prototype
    : window.HTMLTextAreaElement.prototype
  return Object.getOwnPropertyDescriptor(proto, 'value')?.set
}

function replaceSelection(el: InputElement, replacement: string) {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const newValue = el.value.slice(0, start) + replacement + el.value.slice(end)
  const setter = getValueSetter(el)
  setter?.call(el, newValue)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  const newCursor = start + replacement.length
  el.setSelectionRange(newCursor, newCursor)
  el.focus()
}

export async function showNativeInputMenu(
  el: InputElement,
  opts: {
    isAddressBar: boolean
    navigateFn?: (url: string) => void
  }
): Promise<void> {
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  const hasSelection = start !== end
  const selectedText = el.value.slice(start, end)

  const action = await window.aura.inputContextMenu.show({
    hasSelection,
    selectedText,
    fullValue: el.value,
    selectionStart: start,
    selectionEnd: end,
    isAddressBar: opts.isAddressBar
  })

  if (!action) return

  el.focus()

  switch (action.type) {
    case 'cut':
      replaceSelection(el, '')
      break
    case 'copy':
      break
    case 'paste':
      replaceSelection(el, action.text ?? '')
      break
    case 'paste-and-go':
      if (opts.navigateFn && action.text) {
        opts.navigateFn(action.text)
      }
      break
    case 'delete':
      replaceSelection(el, '')
      break
    case 'select-all':
      el.select()
      break
    case 'undo':
      document.execCommand('undo')
      break
    case 'redo':
      document.execCommand('redo')
      break
  }
}
