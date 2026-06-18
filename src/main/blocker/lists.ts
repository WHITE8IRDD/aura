import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export function getCachePath(): string {
  const dir = join(app.getPath('userData'), 'blocker-cache')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'engine.bin')
}
