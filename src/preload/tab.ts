import { contextBridge, ipcRenderer } from 'electron'
import { setupAutofillCapture, setupAutofillSuggestions } from './autofillFormWatcher'
import './pageTranslator'
import './videoDownloadDetector'

const zoomApi = {
  zoom: (dir: 'in' | 'out') => ipcRenderer.send('tab:wheelZoom', dir)
}

contextBridge.exposeInMainWorld('__aura_internal', zoomApi)

window.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  e.stopPropagation()
  zoomApi.zoom(e.deltaY < 0 ? 'in' : 'out')
}, { passive: false, capture: true })

setupAutofillCapture()
setupAutofillSuggestions()
