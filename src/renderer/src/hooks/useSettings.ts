import { useEffect, useState, useCallback } from 'react'
import type { AuraSettings } from '../types'

function applyThemeToDocument(theme: string): void {
  const html = document.documentElement
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    html.setAttribute('data-theme', theme)
  }
}

function applyFontSize(size: string): void {
  document.documentElement.setAttribute('data-font-size', size)
}

let mediaListener: ((e: MediaQueryListEvent) => void) | null = null
function setupAutoThemeWatcher(currentTheme: string): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  if (mediaListener) mq.removeEventListener('change', mediaListener)
  if (currentTheme === 'auto') {
    mediaListener = (e: MediaQueryListEvent): void => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', mediaListener)
  } else {
    mediaListener = null
  }
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
      applyThemeToDocument(settings.theme)
      applyFontSize(settings.fontSize)
      setupAutoThemeWatcher(settings.theme)
    })

    const unsub = window.aura.settings.onChanged((data: { key: string; value: unknown }) => {
      setSettings((prev) => (prev ? { ...prev, [data.key as keyof AuraSettings]: data.value as never } : prev))
      if (data.key === 'theme') {
        applyThemeToDocument(data.value as string)
        setupAutoThemeWatcher(data.value as string)
      }
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
    applyThemeToDocument((fresh as AuraSettings).theme)
    applyFontSize((fresh as AuraSettings).fontSize)
    setupAutoThemeWatcher((fresh as AuraSettings).theme)
  }, [])

  return { settings, set, reset, loaded: settings !== null }
}
