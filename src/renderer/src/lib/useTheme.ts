import { useEffect } from 'react'
import { NINJA_PRESET, getPresetById, applyPresetToDOM } from './themePresets'

export function useTheme(): void {
  useEffect(() => {
    let mounted = true

    const applyCurrentTheme = async () => {
      if (window.aura.isNinjaWindow) {
        if (!mounted) return
        applyPresetToDOM(NINJA_PRESET)
        return
      }

      const mode = await window.aura.settings.get('themeMode') as 'light' | 'dark' | 'auto'
      const presetId = await window.aura.settings.get('themePreset') as string
      const resolved = await window.aura.theme.getResolved() as 'light' | 'dark'

      let preset = getPresetById(presetId)
      if (!preset) preset = getPresetById('aura-dark')!

      if (preset.variant !== resolved) {
        preset = getPresetById(resolved === 'light' ? 'aura-dark' : 'aura-dark')!
      }

      if (!mounted) return
      applyPresetToDOM(preset)
    }

    applyCurrentTheme()

    if (window.aura.isNinjaWindow) return

    const unsubTheme = window.aura.theme.onChanged(() => { void applyCurrentTheme() })

    const unsubSettings = window.aura.settings.onChanged((data: { key: string }) => {
      if (data.key === 'themeMode' || data.key === 'themePreset') {
        void applyCurrentTheme()
      }
    })

    return () => {
      mounted = false
      unsubTheme()
      unsubSettings()
    }
  }, [])
}
