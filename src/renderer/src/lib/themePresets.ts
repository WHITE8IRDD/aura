export interface ThemePreset {
  id: string
  name: string
  description: string
  variant: 'light' | 'dark'
  colors: {
    bgPrimary: string
    bgSecondary: string
    bgTertiary: string
    bgElevated: string
    textPrimary: string
    textSecondary: string
    textTertiary: string
    borderSubtle: string
    borderDefault: string
    hoverBg: string
    activeBg: string
    accent: string
    accentHover: string
    accentSoft: string
    selectedBg: string
    selectedText: string
    chromeBg: string
    toolbarBg: string
    addressBarBg: string
    sidebarBg: string
    danger: string
    warning: string
    success: string
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'aura-dark',
    name: 'Aura Dark',
    description: 'The signature Aura experience',
    variant: 'dark',
    colors: {
      bgPrimary: '#0a0a0c',
      bgSecondary: '#14141a',
      bgTertiary: '#1c1c24',
      bgElevated: 'rgba(28, 28, 32, 0.85)',
      textPrimary: 'rgba(255, 255, 255, 0.96)',
      textSecondary: 'rgba(255, 255, 255, 0.72)',
      textTertiary: 'rgba(255, 255, 255, 0.48)',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
      borderDefault: 'rgba(255, 255, 255, 0.1)',
      hoverBg: 'rgba(255, 255, 255, 0.05)',
      activeBg: 'rgba(255, 255, 255, 0.09)',
      accent: '#6366f1',
      accentHover: '#818cf8',
      accentSoft: 'rgba(99, 102, 241, 0.12)',
      selectedBg: 'rgba(99, 102, 241, 0.18)',
      selectedText: '#a5b4fc',
      chromeBg: '#0a0a0c',
      toolbarBg: 'rgba(20, 20, 26, 0.92)',
      addressBarBg: '#1c1c24',
      sidebarBg: '#0a0a0c',
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981'
    }
  },
  {
    id: 'aura-light',
    name: 'Aura Light',
    description: 'Clean, bright, premium feel',
    variant: 'light',
    colors: {
      bgPrimary: '#fafafa',
      bgSecondary: '#f4f4f6',
      bgTertiary: '#ebebef',
      bgElevated: 'rgba(255, 255, 255, 0.96)',
      textPrimary: '#0f0f14',
      textSecondary: 'rgba(15, 15, 20, 0.68)',
      textTertiary: 'rgba(15, 15, 20, 0.44)',
      borderSubtle: 'rgba(15, 15, 20, 0.06)',
      borderDefault: 'rgba(15, 15, 20, 0.1)',
      hoverBg: 'rgba(15, 15, 20, 0.04)',
      activeBg: 'rgba(15, 15, 20, 0.08)',
      accent: '#6366f1',
      accentHover: '#4f46e5',
      accentSoft: 'rgba(99, 102, 241, 0.1)',
      selectedBg: 'rgba(99, 102, 241, 0.12)',
      selectedText: '#4f46e5',
      chromeBg: '#f4f4f6',
      toolbarBg: 'rgba(255, 255, 255, 0.88)',
      addressBarBg: '#ffffff',
      sidebarBg: '#eeeef1',
      danger: '#dc2626',
      warning: '#d97706',
      success: '#059669'
    }
  },
  {
    id: 'amoled',
    name: 'AMOLED',
    description: 'True black, perfect for OLED',
    variant: 'dark',
    colors: {
      bgPrimary: '#000000',
      bgSecondary: '#0a0a0a',
      bgTertiary: '#141414',
      bgElevated: 'rgba(20, 20, 20, 0.95)',
      textPrimary: 'rgba(255, 255, 255, 0.98)',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textTertiary: 'rgba(255, 255, 255, 0.42)',
      borderSubtle: 'rgba(255, 255, 255, 0.04)',
      borderDefault: 'rgba(255, 255, 255, 0.08)',
      hoverBg: 'rgba(255, 255, 255, 0.04)',
      activeBg: 'rgba(255, 255, 255, 0.08)',
      accent: '#06b6d4',
      accentHover: '#22d3ee',
      accentSoft: 'rgba(6, 182, 212, 0.12)',
      selectedBg: 'rgba(6, 182, 212, 0.16)',
      selectedText: '#67e8f9',
      chromeBg: '#000000',
      toolbarBg: '#000000',
      addressBarBg: '#141414',
      sidebarBg: '#000000',
      danger: '#f87171',
      warning: '#fbbf24',
      success: '#34d399'
    }
  },
  {
    id: 'carbonfox',
    name: 'Carbonfox',
    description: 'Warm carbon palette',
    variant: 'dark',
    colors: {
      bgPrimary: '#161616',
      bgSecondary: '#1c1c1c',
      bgTertiary: '#252525',
      bgElevated: 'rgba(37, 37, 37, 0.92)',
      textPrimary: '#f2f4f8',
      textSecondary: '#b6b8bb',
      textTertiary: '#7b7c7e',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
      borderDefault: 'rgba(255, 255, 255, 0.1)',
      hoverBg: 'rgba(255, 255, 255, 0.05)',
      activeBg: 'rgba(255, 255, 255, 0.09)',
      accent: '#78a9ff',
      accentHover: '#a6c8ff',
      accentSoft: 'rgba(120, 169, 255, 0.12)',
      selectedBg: 'rgba(120, 169, 255, 0.18)',
      selectedText: '#a6c8ff',
      chromeBg: '#161616',
      toolbarBg: 'rgba(28, 28, 28, 0.92)',
      addressBarBg: '#252525',
      sidebarBg: '#161616',
      danger: '#ee5396',
      warning: '#ff832b',
      success: '#42be65'
    }
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    description: 'Soothing pastel for the night',
    variant: 'dark',
    colors: {
      bgPrimary: '#1e1e2e',
      bgSecondary: '#181825',
      bgTertiary: '#313244',
      bgElevated: 'rgba(49, 50, 68, 0.92)',
      textPrimary: '#cdd6f4',
      textSecondary: '#bac2de',
      textTertiary: '#7f849c',
      borderSubtle: 'rgba(205, 214, 244, 0.06)',
      borderDefault: 'rgba(205, 214, 244, 0.1)',
      hoverBg: 'rgba(205, 214, 244, 0.04)',
      activeBg: 'rgba(205, 214, 244, 0.08)',
      accent: '#cba6f7',
      accentHover: '#f5c2e7',
      accentSoft: 'rgba(203, 166, 247, 0.14)',
      selectedBg: 'rgba(203, 166, 247, 0.2)',
      selectedText: '#cba6f7',
      chromeBg: '#181825',
      toolbarBg: 'rgba(30, 30, 46, 0.92)',
      addressBarBg: '#313244',
      sidebarBg: '#11111b',
      danger: '#f38ba8',
      warning: '#fab387',
      success: '#a6e3a1'
    }
  },
  {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappe',
    description: 'Warmer, less contrast than Mocha',
    variant: 'dark',
    colors: {
      bgPrimary: '#303446',
      bgSecondary: '#292c3c',
      bgTertiary: '#414559',
      bgElevated: 'rgba(65, 69, 89, 0.92)',
      textPrimary: '#c6d0f5',
      textSecondary: '#b5bfe2',
      textTertiary: '#838ba7',
      borderSubtle: 'rgba(198, 208, 245, 0.06)',
      borderDefault: 'rgba(198, 208, 245, 0.1)',
      hoverBg: 'rgba(198, 208, 245, 0.05)',
      activeBg: 'rgba(198, 208, 245, 0.09)',
      accent: '#ca9ee6',
      accentHover: '#f4b8e4',
      accentSoft: 'rgba(202, 158, 230, 0.14)',
      selectedBg: 'rgba(202, 158, 230, 0.2)',
      selectedText: '#ca9ee6',
      chromeBg: '#292c3c',
      toolbarBg: 'rgba(48, 52, 70, 0.92)',
      addressBarBg: '#414559',
      sidebarBg: '#232634',
      danger: '#e78284',
      warning: '#ef9f76',
      success: '#a6d189'
    }
  },
  {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    description: 'Medium contrast, balanced',
    variant: 'dark',
    colors: {
      bgPrimary: '#24273a',
      bgSecondary: '#1e2030',
      bgTertiary: '#363a4f',
      bgElevated: 'rgba(54, 58, 79, 0.92)',
      textPrimary: '#cad3f5',
      textSecondary: '#b8c0e0',
      textTertiary: '#8087a2',
      borderSubtle: 'rgba(202, 211, 245, 0.06)',
      borderDefault: 'rgba(202, 211, 245, 0.1)',
      hoverBg: 'rgba(202, 211, 245, 0.05)',
      activeBg: 'rgba(202, 211, 245, 0.09)',
      accent: '#c6a0f6',
      accentHover: '#f5bde6',
      accentSoft: 'rgba(198, 160, 246, 0.14)',
      selectedBg: 'rgba(198, 160, 246, 0.2)',
      selectedText: '#c6a0f6',
      chromeBg: '#1e2030',
      toolbarBg: 'rgba(36, 39, 58, 0.92)',
      addressBarBg: '#363a4f',
      sidebarBg: '#181926',
      danger: '#ed8796',
      warning: '#f5a97f',
      success: '#a6da95'
    }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Inspired by the lights of downtown Tokyo',
    variant: 'dark',
    colors: {
      bgPrimary: '#1a1b26',
      bgSecondary: '#16161e',
      bgTertiary: '#24283b',
      bgElevated: 'rgba(36, 40, 59, 0.92)',
      textPrimary: '#c0caf5',
      textSecondary: '#a9b1d6',
      textTertiary: '#565f89',
      borderSubtle: 'rgba(192, 202, 245, 0.06)',
      borderDefault: 'rgba(192, 202, 245, 0.1)',
      hoverBg: 'rgba(192, 202, 245, 0.05)',
      activeBg: 'rgba(192, 202, 245, 0.09)',
      accent: '#7aa2f7',
      accentHover: '#bb9af7',
      accentSoft: 'rgba(122, 162, 247, 0.14)',
      selectedBg: 'rgba(122, 162, 247, 0.2)',
      selectedText: '#7aa2f7',
      chromeBg: '#16161e',
      toolbarBg: 'rgba(26, 27, 38, 0.92)',
      addressBarBg: '#24283b',
      sidebarBg: '#16161e',
      danger: '#f7768e',
      warning: '#e0af68',
      success: '#9ece6a'
    }
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    description: 'Soho vibes for the classy minimalist',
    variant: 'dark',
    colors: {
      bgPrimary: '#191724',
      bgSecondary: '#1f1d2e',
      bgTertiary: '#26233a',
      bgElevated: 'rgba(38, 35, 58, 0.92)',
      textPrimary: '#e0def4',
      textSecondary: '#908caa',
      textTertiary: '#6e6a86',
      borderSubtle: 'rgba(224, 222, 244, 0.06)',
      borderDefault: 'rgba(224, 222, 244, 0.1)',
      hoverBg: 'rgba(224, 222, 244, 0.05)',
      activeBg: 'rgba(224, 222, 244, 0.09)',
      accent: '#c4a7e7',
      accentHover: '#ebbcba',
      accentSoft: 'rgba(196, 167, 231, 0.14)',
      selectedBg: 'rgba(196, 167, 231, 0.2)',
      selectedText: '#c4a7e7',
      chromeBg: '#1f1d2e',
      toolbarBg: 'rgba(25, 23, 36, 0.92)',
      addressBarBg: '#26233a',
      sidebarBg: '#191724',
      danger: '#eb6f92',
      warning: '#f6c177',
      success: '#9ccfd8'
    }
  },
  {
    id: 'osaka-jade',
    name: 'Osaka Jade',
    description: 'Calm jade accents on warm dark',
    variant: 'dark',
    colors: {
      bgPrimary: '#16181c',
      bgSecondary: '#1a1d22',
      bgTertiary: '#22262d',
      bgElevated: 'rgba(34, 38, 45, 0.92)',
      textPrimary: '#e8e8e3',
      textSecondary: '#a8a89e',
      textTertiary: '#6a6a60',
      borderSubtle: 'rgba(232, 232, 227, 0.06)',
      borderDefault: 'rgba(232, 232, 227, 0.1)',
      hoverBg: 'rgba(232, 232, 227, 0.04)',
      activeBg: 'rgba(232, 232, 227, 0.08)',
      accent: '#5fb3a1',
      accentHover: '#7ec9b7',
      accentSoft: 'rgba(95, 179, 161, 0.14)',
      selectedBg: 'rgba(95, 179, 161, 0.2)',
      selectedText: '#7ec9b7',
      chromeBg: '#16181c',
      toolbarBg: 'rgba(26, 29, 34, 0.92)',
      addressBarBg: '#22262d',
      sidebarBg: '#16181c',
      danger: '#e06c75',
      warning: '#e5c07b',
      success: '#98c379'
    }
  },
  {
    id: 'ayu-mirage',
    name: 'Ayu Mirage',
    description: 'Modern, soft on the eyes',
    variant: 'dark',
    colors: {
      bgPrimary: '#1f2430',
      bgSecondary: '#1c212b',
      bgTertiary: '#272d38',
      bgElevated: 'rgba(39, 45, 56, 0.92)',
      textPrimary: '#cbccc6',
      textSecondary: '#b8cfe6',
      textTertiary: '#707a8c',
      borderSubtle: 'rgba(203, 204, 198, 0.06)',
      borderDefault: 'rgba(203, 204, 198, 0.1)',
      hoverBg: 'rgba(203, 204, 198, 0.05)',
      activeBg: 'rgba(203, 204, 198, 0.09)',
      accent: '#ffcc66',
      accentHover: '#ffd580',
      accentSoft: 'rgba(255, 204, 102, 0.14)',
      selectedBg: 'rgba(255, 204, 102, 0.18)',
      selectedText: '#ffcc66',
      chromeBg: '#1c212b',
      toolbarBg: 'rgba(31, 36, 48, 0.92)',
      addressBarBg: '#272d38',
      sidebarBg: '#1c212b',
      danger: '#f28779',
      warning: '#ffad66',
      success: '#bae67e'
    }
  }
]

export const NINJA_PRESET: ThemePreset = {
  id: 'ninja-identity',
  name: 'Ninja Mode',
  description: 'Private browsing identity',
  variant: 'dark',
  colors: {
    bgPrimary: '#1e1e22',
    bgSecondary: '#252529',
    bgTertiary: '#2d2d33',
    bgElevated: 'rgba(45, 45, 51, 0.92)',
    textPrimary: 'rgba(255, 255, 255, 0.94)',
    textSecondary: 'rgba(255, 255, 255, 0.66)',
    textTertiary: 'rgba(255, 255, 255, 0.42)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderDefault: 'rgba(255, 255, 255, 0.1)',
    hoverBg: 'rgba(255, 255, 255, 0.05)',
    activeBg: 'rgba(255, 255, 255, 0.09)',
    accent: '#94a3b8',
    accentHover: '#cbd5e1',
    accentSoft: 'rgba(148, 163, 184, 0.14)',
    selectedBg: 'rgba(148, 163, 184, 0.18)',
    selectedText: '#cbd5e1',
    chromeBg: '#1e1e22',
    toolbarBg: 'rgba(30, 30, 34, 0.94)',
    addressBarBg: '#2d2d33',
    sidebarBg: '#1a1a1e',
    danger: '#f87171',
    warning: '#fbbf24',
    success: '#34d399'
  }
}

export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find(p => p.id === id)
}

export function applyPresetToDOM(preset: ThemePreset): void {
  const root = document.documentElement
  const c = preset.colors

  root.setAttribute('data-theme', preset.variant)
  root.setAttribute('data-preset', preset.id)

  root.style.setProperty('--bg-primary', c.bgPrimary)
  root.style.setProperty('--bg-secondary', c.bgSecondary)
  root.style.setProperty('--bg-tertiary', c.bgTertiary)
  root.style.setProperty('--bg-elevated', c.bgElevated)
  root.style.setProperty('--text-primary', c.textPrimary)
  root.style.setProperty('--text-secondary', c.textSecondary)
  root.style.setProperty('--text-tertiary', c.textTertiary)
  root.style.setProperty('--border-subtle', c.borderSubtle)
  root.style.setProperty('--border-default', c.borderDefault)
  root.style.setProperty('--hover-bg', c.hoverBg)
  root.style.setProperty('--active-bg', c.activeBg)
  root.style.setProperty('--accent', c.accent)
  root.style.setProperty('--accent-hover', c.accentHover)
  root.style.setProperty('--accent-soft', c.accentSoft)
  root.style.setProperty('--selected-bg', c.selectedBg)
  root.style.setProperty('--selected-text', c.selectedText)
  root.style.setProperty('--chrome-bg', c.chromeBg)
  root.style.setProperty('--toolbar-bg', c.toolbarBg)
  root.style.setProperty('--address-bar-bg', c.addressBarBg)
  root.style.setProperty('--sidebar-bg', c.sidebarBg)
  root.style.setProperty('--danger', c.danger)
  root.style.setProperty('--warning', c.warning)
  root.style.setProperty('--success', c.success)

  // Legacy CSS variables used by existing theme.css
  root.style.setProperty('--bg', c.bgPrimary)
  root.style.setProperty('--bg-elev', c.bgSecondary)
  root.style.setProperty('--bg-elev-2', c.bgTertiary)
  root.style.setProperty('--bg-elev-3', c.bgTertiary)
  root.style.setProperty('--stroke', c.borderSubtle)
  root.style.setProperty('--stroke-strong', c.borderDefault)
  root.style.setProperty('--text', c.textPrimary)
  root.style.setProperty('--text-dim', c.textSecondary)
  root.style.setProperty('--text-faint', c.textTertiary)
  root.style.setProperty('--green', c.success)
  root.style.setProperty('--red', c.danger)
}
