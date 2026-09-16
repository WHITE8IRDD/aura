import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        external: ['better-sqlite3', 'canvas']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          tab: resolve(__dirname, 'src/preload/tab.ts'),
          mediaHubPopover: resolve(__dirname, 'src/preload/mediaHubPopover.ts'),
          translatorPopover: resolve(__dirname, 'src/preload/translatorPopover.ts'),
          imageSaverPopover: resolve(__dirname, 'src/preload/imageSaverPopover.ts'),
          perfHud: resolve(__dirname, 'src/preload/perfHud.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          mediaHubPopover: resolve(__dirname, 'src/renderer/mediaHubPopover.html'),
          translatorPopover: resolve(__dirname, 'src/renderer/translatorPopover.html'),
          imageSaverPopover: resolve(__dirname, 'src/renderer/imageSaverPopover.html'),
          'perf-hud': resolve(__dirname, 'src/renderer/perf-hud/index.html')
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    }
  }
})
