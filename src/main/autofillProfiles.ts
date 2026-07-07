import { ipcMain, safeStorage, BrowserWindow } from 'electron'
import { getDb } from './db'

// ─── Profiles ────────────────────────────────────────────────────────

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
    console.warn('[Aura/autofillProfiles] safeStorage unavailable')
    return null
  }
  try {
    return safeStorage.encryptString(value).toString('base64')
  } catch (err) {
    console.error('[Aura/autofillProfiles] encrypt failed:', err)
    return null
  }
}

function dec(stored: string | null): string {
  if (!stored) return ''
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch (err) {
    console.error('[Aura/autofillProfiles] decrypt failed:', err)
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

// ─── Payment Cards ────────────────────────────────────────────────────

export interface PaymentCard {
  id: number
  label: string
  cardholder: string
  number: string
  expMonth: string
  expYear: string
  cvv: string
  brand: string
  lastFour: string
  createdAt: number
  updatedAt: number
}

export type PaymentCardInput = Omit<PaymentCard, 'id' | 'createdAt' | 'updatedAt' | 'lastFour' | 'brand'>

function detectBrand(number: string): string {
  const first = number.replace(/\s/g, '').substring(0, 2)
  if (/^4/.test(first)) return 'Visa'
  if (/^5[1-5]/.test(first)) return 'Mastercard'
  if (/^3[47]/.test(first)) return 'Amex'
  if (/^6(?:011|5)/.test(first)) return 'Discover'
  if (/^35(?:2[89]|[3-8])/.test(first)) return 'JCB'
  return ''
}

function lastFour(number: string): string {
  return number.replace(/\s/g, '').slice(-4)
}

export function listPaymentCards(): PaymentCard[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM payment_cards ORDER BY updated_at DESC').all() as any[]
  return rows.map(rowToCard)
}

function rowToCard(r: any): PaymentCard {
  return {
    id: r.id,
    label: r.label || 'Card',
    cardholder: dec(r.cardholder_enc),
    number: dec(r.number_enc),
    expMonth: dec(r.exp_month_enc),
    expYear: dec(r.exp_year_enc),
    cvv: dec(r.cvv_enc),
    brand: r.brand || '',
    lastFour: r.last_four || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export function addPaymentCard(input: PaymentCardInput): { id: number; success: boolean } {
  const db = getDb()
  if (!safeStorage.isEncryptionAvailable()) {
    return { id: 0, success: false }
  }
  const cleanNumber = input.number.replace(/\s/g, '')
  const brand = detectBrand(cleanNumber)
  const last = lastFour(cleanNumber)
  const stmt = db.prepare(`
    INSERT INTO payment_cards (
      label, cardholder_enc, number_enc, exp_month_enc, exp_year_enc, cvv_enc,
      brand, last_four
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const res = stmt.run(
    input.label || 'Card',
    enc(input.cardholder),
    enc(cleanNumber),
    enc(input.expMonth),
    enc(input.expYear),
    enc(input.cvv),
    brand,
    last
  )
  return { id: Number(res.lastInsertRowid), success: true }
}

export function updatePaymentCard(id: number, input: PaymentCardInput): boolean {
  const db = getDb()
  if (!safeStorage.isEncryptionAvailable()) return false
  const cleanNumber = input.number.replace(/\s/g, '')
  const brand = detectBrand(cleanNumber)
  const last = lastFour(cleanNumber)
  const stmt = db.prepare(`
    UPDATE payment_cards SET
      label = ?, cardholder_enc = ?, number_enc = ?, exp_month_enc = ?,
      exp_year_enc = ?, cvv_enc = ?, brand = ?, last_four = ?,
      updated_at = unixepoch()
    WHERE id = ?
  `)
  const res = stmt.run(
    input.label || 'Card',
    enc(input.cardholder),
    enc(cleanNumber),
    enc(input.expMonth),
    enc(input.expYear),
    enc(input.cvv),
    brand,
    last,
    id
  )
  return res.changes > 0
}

export function deletePaymentCard(id: number): boolean {
  const db = getDb()
  const res = db.prepare('DELETE FROM payment_cards WHERE id = ?').run(id)
  return res.changes > 0
}

export function deleteAllPaymentCards(): number {
  const db = getDb()
  const res = db.prepare('DELETE FROM payment_cards').run()
  return res.changes
}

// ─── Fill profile data into a web page ───────────────────────────────

export async function fillProfileIntoTab(
  tabId: number,
  profileId: number
): Promise<{ ok: boolean; reason?: string }> {
  const { TabManager } = await import('./tabs')
  const tabsManager = TabManager.getInstance?.()
  if (!tabsManager) return { ok: false, reason: 'no-tab-manager' }

  const record = tabsManager.getTab(tabId)
  if (!record?.view) return { ok: false, reason: 'no-tab' }

  const profile = listProfiles().find(p => p.id === profileId)
  if (!profile) return { ok: false, reason: 'no-such-profile' }

  await record.view.webContents.executeJavaScript(`
    (function() {
      const fields = {
        'fullName': ${JSON.stringify(profile.fullName)},
        'givenName': ${JSON.stringify(profile.givenName)},
        'familyName': ${JSON.stringify(profile.familyName)},
        'email': ${JSON.stringify(profile.email)},
        'phone': ${JSON.stringify(profile.phone)},
        'organization': ${JSON.stringify(profile.organization)},
        'street': ${JSON.stringify(profile.street)},
        'city': ${JSON.stringify(profile.city)},
        'region': ${JSON.stringify(profile.region)},
        'postalCode': ${JSON.stringify(profile.postalCode)},
        'country': ${JSON.stringify(profile.country)}
      };
      const sel = (s) => document.querySelector(s);
      const map = [
        { sel: 'input[name*="name"i]', val: fields.fullName || fields.givenName },
        { sel: 'input[name*="email"i]', val: fields.email },
        { sel: 'input[name*="phone"i]', val: fields.phone },
        { sel: 'input[name*="org"i],input[name*="company"i]', val: fields.organization },
        { sel: 'input[name*="street"i],input[name*="address"i]', val: fields.street },
        { sel: 'input[name*="city"i]', val: fields.city },
        { sel: 'input[name*="state"i],input[name*="region"i]', val: fields.region },
        { sel: 'input[name*="zip"i],input[name*="postal"i]', val: fields.postalCode },
        { sel: 'input[name*="country"i]', val: fields.country }
      ];
      map.forEach(({ sel: s, val }) => {
        const el = sel(s);
        if (el && val) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    })()
  `)
  return { ok: true }
}

export async function fillCardIntoTab(
  tabId: number,
  cardId: number
): Promise<{ ok: boolean; reason?: string }> {
  const { TabManager } = await import('./tabs')
  const tabsManager = TabManager.getInstance?.()
  if (!tabsManager) return { ok: false, reason: 'no-tab-manager' }

  const record = tabsManager.getTab(tabId)
  if (!record?.view) return { ok: false, reason: 'no-tab' }

  const card = listPaymentCards().find(c => c.id === cardId)
  if (!card) return { ok: false, reason: 'no-such-card' }

  await record.view.webContents.executeJavaScript(`
    (function() {
      const sel = (s) => document.querySelector(s);
      const setNative = (el, val) => {
        if (!el) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setNative(sel('input[name*="ccname"i],input[name*="cardholder"i],input[name*="name"i][autocomplete*="cc"i]'), ${JSON.stringify(card.cardholder)});
      setNative(sel('input[name*="ccnum"i],input[name*="number"i][autocomplete*="cc"i],input[autocomplete="cc-number"]'), ${JSON.stringify(card.number)});
      setNative(sel('input[name*="expmonth"i],input[name*="exp-month"i],input[autocomplete="cc-exp-month"],input[autocomplete*="exp-month"i]'), ${JSON.stringify(card.expMonth)});
      setNative(sel('input[name*="expyear"i],input[name*="exp-year"i],input[autocomplete="cc-exp-year"],input[autocomplete*="exp-year"i]'), ${JSON.stringify(card.expYear)});
      setNative(sel('input[name*="cvv"i],input[name*="cvc"i],input[autocomplete="cc-csc"]'), ${JSON.stringify(card.cvv)});
    })()
  `)
  return { ok: true }
}

// ─── IPC Registration ────────────────────────────────────────────────

export function registerAutofillProfilesIPC(): void {
  ipcMain.handle('autofill:isAvailable', () => safeStorage.isEncryptionAvailable())

  ipcMain.handle('autofill:list', () => listProfiles())
  ipcMain.handle('autofill:add', (_e, input: AutofillProfileInput) => addProfile(input))
  ipcMain.handle('autofill:update', (_e, id: number, input: AutofillProfileInput) => updateProfile(id, input))
  ipcMain.handle('autofill:delete', (_e, id: number) => deleteProfile(id))
  ipcMain.handle('autofill:deleteAll', () => deleteAllProfiles())
  ipcMain.handle('autofill:promptSaveAccept', (_e, input: AutofillProfileInput) => addProfile(input))
  ipcMain.handle('autofill:fillProfile', async (_e, tabId: number, profileId: number) =>
    fillProfileIntoTab(tabId, profileId))

  ipcMain.handle('autofill:cards:list', () => listPaymentCards())
  ipcMain.handle('autofill:cards:add', (_e, input: PaymentCardInput) => addPaymentCard(input))
  ipcMain.handle('autofill:cards:update', (_e, id: number, input: PaymentCardInput) => updatePaymentCard(id, input))
  ipcMain.handle('autofill:cards:delete', (_e, id: number) => deletePaymentCard(id))
  ipcMain.handle('autofill:cards:deleteAll', () => deleteAllPaymentCards())
  ipcMain.handle('autofill:cards:fill', async (_e, tabId: number, cardId: number) =>
    fillCardIntoTab(tabId, cardId))
}
