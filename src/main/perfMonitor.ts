import { app, BrowserWindow, webContents } from 'electron'

export interface ProcessSample {
  pid: number
  type: string
  cpu: number
  memoryMB: number
  name?: string
  url?: string
}

export interface PerfSample {
  timestamp: number
  totalCpu: number
  totalMemoryMB: number
  mainCpu: number
  mainMemoryMB: number
  gpuCpu: number
  gpuMemoryMB: number
  tabCount: number
  processes: ProcessSample[]
  fps?: number
}

let intervalHandle: NodeJS.Timeout | null = null
const SAMPLE_INTERVAL_MS = 1000
const subscribers = new Set<BrowserWindow>()

function enrichProcess(metric: Electron.ProcessMetric): ProcessSample {
  const sample: ProcessSample = {
    pid: metric.pid,
    type: metric.type,
    cpu: Math.round(metric.cpu.percentCPUUsage * 10) / 10,
    memoryMB: Math.round(metric.memory.workingSetSize / 1024),
  }

  if (metric.type === 'Tab') {
    const all = webContents.getAllWebContents()
    for (const wc of all) {
      try {
        if (wc.getOSProcessId() === metric.pid) {
          sample.name = wc.getTitle() || 'Untitled'
          sample.url = wc.getURL()
          break
        }
      } catch {
      }
    }
  }

  return sample
}

function takeSample(): PerfSample {
  const metrics = app.getAppMetrics()

  let totalCpu = 0
  let totalMemoryMB = 0
  let mainCpu = 0
  let mainMemoryMB = 0
  let gpuCpu = 0
  let gpuMemoryMB = 0
  let tabCount = 0
  const processes: ProcessSample[] = []

  for (const m of metrics) {
    const p = enrichProcess(m)
    totalCpu += p.cpu
    totalMemoryMB += p.memoryMB
    if (p.type === 'Browser') {
      mainCpu = p.cpu
      mainMemoryMB = p.memoryMB
    } else if (p.type === 'GPU') {
      gpuCpu = p.cpu
      gpuMemoryMB = p.memoryMB
    } else if (p.type === 'Tab') {
      tabCount++
    }
    processes.push(p)
  }

  processes.sort((a, b) => b.cpu - a.cpu)

  return {
    timestamp: Date.now(),
    totalCpu: Math.round(totalCpu * 10) / 10,
    totalMemoryMB: Math.round(totalMemoryMB),
    mainCpu,
    mainMemoryMB,
    gpuCpu,
    gpuMemoryMB,
    tabCount,
    processes: processes.slice(0, 20),
  }
}

export function startPerfMonitor(): void {
  if (intervalHandle) return
  intervalHandle = setInterval(() => {
    if (subscribers.size === 0) return
    const sample = takeSample()
    for (const win of subscribers) {
      if (!win.isDestroyed()) {
        win.webContents.send('perf-hud:tick', sample)
      }
    }
  }, SAMPLE_INTERVAL_MS)
}

export function stopPerfMonitor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

export function subscribePerfHud(win: BrowserWindow): void {
  subscribers.add(win)
  win.on('closed', () => subscribers.delete(win))
  if (!win.isDestroyed()) {
    win.webContents.send('perf-hud:tick', takeSample())
  }
}

export function unsubscribePerfHud(win: BrowserWindow): void {
  subscribers.delete(win)
}
