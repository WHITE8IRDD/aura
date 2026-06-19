import { app, ipcMain, BrowserWindow, powerMonitor, webContents } from 'electron'
import { getSetting } from './settings'

export async function getGPUDetails() {
  try {
    const info = await app.getGPUInfo('complete') as any
    const featureStatus = info?.featureStatus && Object.keys(info.featureStatus).length > 0
      ? extractFeatures(info.featureStatus)
      : extractFeatures((app.getGPUFeatureStatus?.() as unknown as Record<string, string>) || {})
    return {
      vendor: info?.gpuDevice?.[0]?.vendorString || 'Unknown',
      device: info?.gpuDevice?.[0]?.deviceString || 'Unknown',
      driverVendor: info?.machineModelName || '',
      driverVersion: info?.driverVersion || info?.gpuDevice?.[0]?.driverVersion || '',
      glRenderer: info?.auxAttributes?.glRenderer || '',
      glVendor: info?.auxAttributes?.glVendor || '',
      glVersion: info?.auxAttributes?.glVersion || '',
      features: featureStatus,
      hardwareAccelerationEnabled: app.getGPUFeatureStatus
        ? (app.getGPUFeatureStatus() as any)?.gpu_compositing !== 'disabled_software'
        : true
    }
  } catch (err) {
    console.error('[Aura/perf] getGPUInfo failed:', err)
    return null
  }
}

function extractFeatures(featureStatus: Record<string, string>): Array<{name: string, status: string}> {
  const friendly: Record<string, string> = {
    'gpu_compositing': 'GPU compositing',
    'webgl': 'WebGL',
    'webgl2': 'WebGL 2',
    'video_decode': 'Hardware video decode',
    'video_encode': 'Hardware video encode',
    'rasterization': 'GPU rasterization',
    'canvas_oop_rasterization': 'OOP canvas rasterization',
    'opengl': 'OpenGL',
    'vulkan': 'Vulkan',
    'multiple_raster_threads': 'Multiple raster threads',
    'skia_renderer': 'Skia renderer'
  }
  return Object.entries(featureStatus)
    .filter(([key]) => friendly[key])
    .map(([key, status]) => ({ name: friendly[key], status }))
}

export interface TabMemoryInfo {
  pid: number
  title: string
  url: string
  memoryMB: number
  cpuPercent: number
  type: string
}

export function getTabMemoryMetrics(): TabMemoryInfo[] {
  try {
    const metrics = app.getAppMetrics()
    const result: TabMemoryInfo[] = []
    for (const m of metrics) {
      let title = '—'
      let url = ''
      const type = m.type
      const allWcs = webContents.getAllWebContents()
      for (const wc of allWcs) {
        if (wc.getOSProcessId() === m.pid) {
          title = wc.getTitle() || '—'
          url = wc.getURL() || ''
          break
        }
      }
      const memoryMB = Math.round((m.memory?.workingSetSize || 0) / 1024)
      const cpuPercent = Math.round((m.cpu?.percentCPUUsage || 0) * 10) / 10
      result.push({
        pid: m.pid,
        title: type === 'Browser' ? 'Aura (main process)' : title,
        url,
        memoryMB,
        cpuPercent,
        type
      })
    }
    return result.sort((a, b) => b.memoryMB - a.memoryMB)
  } catch (err) {
    console.error('[Aura/perf] getAppMetrics failed:', err)
    return []
  }
}

let energySaverInterval: NodeJS.Timeout | null = null

function isOnBattery(): boolean {
  try {
    return powerMonitor.isOnBatteryPower?.() ?? false
  } catch {
    return false
  }
}

function shouldApplyEnergySaver(): boolean {
  const mode = getSetting('perfEnergySaver') as string
  if (mode === 'always') return true
  if (mode === 'onBattery') return isOnBattery()
  return false
}

export function applyEnergySaverToAll(): void {
  const apply = shouldApplyEnergySaver()
  for (const wc of webContents.getAllWebContents()) {
    try {
      if (apply) {
        wc.setFrameRate(30)
      } else {
        wc.setFrameRate(60)
      }
    } catch {
    }
  }
}

export function startEnergySaverWatcher(): void {
  if (energySaverInterval) clearInterval(energySaverInterval)
  applyEnergySaverToAll()
  energySaverInterval = setInterval(applyEnergySaverToAll, 30 * 1000)
  powerMonitor.on('on-ac', applyEnergySaverToAll)
  powerMonitor.on('on-battery', applyEnergySaverToAll)
}

export function stopEnergySaverWatcher(): void {
  if (energySaverInterval) {
    clearInterval(energySaverInterval)
    energySaverInterval = null
  }
}

let memoryPressureInterval: NodeJS.Timeout | null = null

export function checkMemoryPressure(): void {
  const thresholdMB = getSetting('perfTabUnloadThresholdMB') as number
  if (thresholdMB === 0) return
  const metrics = app.getAppMetrics()
  const totalMB = metrics.reduce((sum, m) => sum + (m.memory?.workingSetSize || 0) / 1024, 0)
  if (totalMB > thresholdMB) {
    console.log(`[Aura/perf] Memory pressure: ${totalMB.toFixed(0)}MB > ${thresholdMB}MB threshold`)
  }
}

export function startMemoryPressureWatcher(): void {
  if (memoryPressureInterval) clearInterval(memoryPressureInterval)
  memoryPressureInterval = setInterval(checkMemoryPressure, 60 * 1000)
}

export function stopMemoryPressureWatcher(): void {
  if (memoryPressureInterval) {
    clearInterval(memoryPressureInterval)
    memoryPressureInterval = null
  }
}

export function discardAllSleepingTabs(): number {
  return 0
}

export function registerPerformanceIPC(): void {
  ipcMain.handle('perf:getGPU', () => getGPUDetails())
  ipcMain.handle('perf:getTabMetrics', () => getTabMemoryMetrics())
  ipcMain.handle('perf:discardSleepingTabs', () => discardAllSleepingTabs())
}

export function initPerformance(): void {
  registerPerformanceIPC()
  startEnergySaverWatcher()
  startMemoryPressureWatcher()
}
