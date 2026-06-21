import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        external: ['better-sqlite3']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          tab: resolve(__dirname, 'src/preload/tab.ts'),
          mediaHubPopover: resolve(__dirname, 'src/preload/mediaHubPopover.ts'),
          translatorPopover: resolve(__dirname, 'src/preload/translatorPopover.ts'),
          imageSaverPopover: resolve(__dirname, 'src/preload/imageSaverPopover.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          mediaHubPopover: resolve(__dirname, 'src/renderer/mediaHubPopover.html'),
          translatorPopover: resolve(__dirname, 'src/renderer/translatorPopover.html'),
          imageSaverPopover: resolve(__dirname, 'src/renderer/imageSaverPopover.html')
        }
      }
    },
    plugins: [react()]
  }
})
