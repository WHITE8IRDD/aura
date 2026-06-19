import { useEffect, useState, useCallback } from 'react'
import type { AuraSettings } from '../types'

function applyFontSize(size: string): void {
  document.documentElement.setAttribute('data-font-size', size)
}

export function useSettings(): {
  settings: AuraSettings | null
  set: <K extends keyof AuraSettings>(key: K, value: AuraSettings[K]) => Promise<void>
  reset: () => Promise<void>
  loaded: boolean
} {
  const [settings, setSettings] = useState<AuraSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.aura.settings.getAll().then((s) => {
      if (cancelled) return
      const settings = s as AuraSettings
      setSettings(settings)
      applyFontSize(settings.fontSize)
    })

    const unsub = window.aura.settings.onChanged((data: { key: string; value: unknown }) => {
      setSettings((prev) => (prev ? { ...prev, [data.key as keyof AuraSettings]: data.value as never } : prev))
      if (data.key === 'fontSize') {
        applyFontSize(data.value as string)
      }
    })

    return () => { cancelled = true; unsub() }
  }, [])

  const set = useCallback(async <K extends keyof AuraSettings>(key: K, value: AuraSettings[K]) => {
    await window.aura.settings.set(key as string, value)
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }, [])

  const reset = useCallback(async () => {
    await window.aura.settings.reset()
    const fresh = await window.aura.settings.getAll()
    setSettings(fresh as AuraSettings)
    applyFontSize((fresh as AuraSettings).fontSize)
  }, [])

  return { settings, set, reset, loaded: settings !== null }
}
