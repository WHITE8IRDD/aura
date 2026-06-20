import { ipcMain, safeStorage, BrowserWindow } from 'electron'
import { getDb } from './db'

export interface AutofillProfile {
  id: number
  label: string
  fullName: string
  givenName: string
  familyName: string
  email: string
  phone: string
  organization: string
  street: string
  city: string
  region: string
  postalCode: string
  country: string
  createdAt: number
  updatedAt: number
}

export type AutofillProfileInput = Omit<AutofillProfile, 'id' | 'createdAt' | 'updatedAt'>

function enc(value: string): string | null {
  if (!value) return null
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[Aura/autofill] safeStorage unavailable')
    return null
  }
  try {
    return safeStorage.encryptString(value).toString('base64')
  } catch (err) {
    console.error('[Aura/autofill] encrypt failed:', err)
    return null
  }
}

function dec(stored: string | null): string {
  if (!stored) return ''
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch (err) {
    console.error('[Aura/autofill] decrypt failed:', err)
    return ''
  }
}

export function listProfiles(): AutofillProfile[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM autofill_profiles ORDER BY updated_at DESC').all() as any[]
  return rows.map(rowToProfile)
}

function rowToProfile(r: any): AutofillProfile {
  return {
    id: r.id,
    label: r.label || 'Profile',
    fullName: dec(r.full_name_enc),
    givenName: dec(r.given_name_enc),
    familyName: dec(r.family_name_enc),
    email: dec(r.email_enc),
    phone: dec(r.phone_enc),
    organization: dec(r.organization_enc),
    street: dec(r.street_enc),
    city: dec(r.city_enc),
    region: dec(r.region_enc),
    postalCode: dec(r.postal_code_enc),
    country: dec(r.country_enc),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export function addProfile(input: AutofillProfileInput): { id: number; success: boolean } {
  const db = getDb()
  if (!safeStorage.isEncryptionAvailable()) {
    return { id: 0, success: false }
  }
  const stmt = db.prepare(`
    INSERT INTO autofill_profiles (
      label, full_name_enc, given_name_enc, family_name_enc,
      email_enc, phone_enc, organization_enc, street_enc, city_enc,
      region_enc, postal_code_enc, country_enc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const res = stmt.run(
    input.label || 'Profile',
    enc(input.fullName),
    enc(input.givenName),
    enc(input.familyName),
    enc(input.email),
    enc(input.phone),
    enc(input.organization),
    enc(input.street),
    enc(input.city),
    enc(input.region),
    enc(input.postalCode),
    enc(input.country)
  )
  return { id: Number(res.lastInsertRowid), success: true }
}

export function updateProfile(id: number, input: AutofillProfileInput): boolean {
  const db = getDb()
  if (!safeStorage.isEncryptionAvailable()) return false
  const stmt = db.prepare(`
    UPDATE autofill_profiles SET
      label = ?, full_name_enc = ?, given_name_enc = ?, family_name_enc = ?,
      email_enc = ?, phone_enc = ?, organization_enc = ?, street_enc = ?,
      city_enc = ?, region_enc = ?, postal_code_enc = ?, country_enc = ?,
      updated_at = unixepoch()
    WHERE id = ?
  `)
  const res = stmt.run(
    input.label || 'Profile',
    enc(input.fullName),
    enc(input.givenName),
    enc(input.familyName),
    enc(input.email),
    enc(input.phone),
    enc(input.organization),
    enc(input.street),
    enc(input.city),
    enc(input.region),
    enc(input.postalCode),
    enc(input.country),
    id
  )
  return res.changes > 0
}

export function deleteProfile(id: number): boolean {
  const db = getDb()
  const res = db.prepare('DELETE FROM autofill_profiles WHERE id = ?').run(id)
  return res.changes > 0
}

export function deleteAllProfiles(): number {
  const db = getDb()
  const res = db.prepare('DELETE FROM autofill_profiles').run()
  return res.changes
}

export function maybePromptSave(win: BrowserWindow, captured: Partial<AutofillProfileInput>): void {
  const meaningfulFields = [
    captured.fullName, captured.givenName, captured.email,
    captured.phone, captured.street, captured.city, captured.postalCode
  ].filter(v => v && v.length > 1).length
  if (meaningfulFields < 2) return
  const existing = listProfiles()
  const duplicate = existing.some(p => p.email === captured.email && p.email !== '')
  if (duplicate) return
  win.webContents.send('autofill:promptSave', captured)
}

export function registerAutofillIPC(): void {
  ipcMain.handle('autofill:isAvailable', () => safeStorage.isEncryptionAvailable())
  ipcMain.handle('autofill:list', () => listProfiles())
  ipcMain.handle('autofill:add', (_e, input: AutofillProfileInput) => addProfile(input))
  ipcMain.handle('autofill:update', (_e, id: number, input: AutofillProfileInput) => updateProfile(id, input))
  ipcMain.handle('autofill:delete', (_e, id: number) => deleteProfile(id))
  ipcMain.handle('autofill:deleteAll', () => deleteAllProfiles())
  ipcMain.handle('autofill:promptSaveAccept', (_e, input: AutofillProfileInput) => addProfile(input))
}
