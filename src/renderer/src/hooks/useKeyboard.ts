import { useEffect } from 'react'

interface Handlers {
  onFocusAddress?: () => void
  onCommandPalette?: () => void
  onNextTab?: (reverse: boolean) => void
  onSwitchTab?: (index: number) => void
  onToggleSidebar?: () => void
}

export function useKeyboard(handlers: Handlers): void {
  useEffect(() => {
    const unsub: Array<() => void> = []
    if (handlers.onFocusAddress)
      unsub.push(window.aura.shortcuts.onFocusAddress(handlers.onFocusAddress))
    if (handlers.onCommandPalette)
      unsub.push(window.aura.shortcuts.onCommandPalette(handlers.onCommandPalette))
    if (handlers.onNextTab)
      unsub.push(window.aura.shortcuts.onNextTab(handlers.onNextTab))
    if (handlers.onSwitchTab)
      unsub.push(window.aura.shortcuts.onSwitchTab(handlers.onSwitchTab))
    if (handlers.onToggleSidebar)
      unsub.push(window.aura.shortcuts.onToggleSidebar(handlers.onToggleSidebar))
    return () => unsub.forEach((fn) => fn())
  }, [handlers])
}
