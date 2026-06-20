import { ipcMain } from 'electron'

interface TranslateResult {
  translatedText: string
  detectedLang?: string
  engine: string
  error?: string
}

function getSetting(key: string): unknown {
  try {
    const { getSetting } = require('./settings')
    return getSetting(key)
  } catch {
    return undefined
  }
}

async function libretranslate(
  text: string,
  targetLang: string
): Promise<TranslateResult> {
  const endpoint =
    (getSetting('translatorLibreEndpoint') as string) ||
    'https://translate.argosopentech.com/translate'

  const body = JSON.stringify({
    q: text,
    source: 'auto',
    target: targetLang,
    format: 'text'
  })

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`LibreTranslate ${res.status}: ${errText}`)
  }

  const json = await res.json()
  return {
    translatedText: json.translatedText,
    detectedLang: json.detectedLanguage?.language,
    engine: 'libretranslate'
  }
}

async function googleTranslate(
  text: string,
  targetLang: string
): Promise<TranslateResult> {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: targetLang,
    dt: 't',
    q: text
  })

  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`
  )

  if (!res.ok) {
    throw new Error(`Google Translate ${res.status}`)
  }

  const json = await res.json()
  const translatedText = json[0]
    ?.map((segment: unknown[]) => segment[0])
    .filter(Boolean)
    .join('')

  const detectedLang = json[2] || undefined

  return {
    translatedText,
    detectedLang,
    engine: 'google'
  }
}

export async function translateText(
  text: string,
  targetLang?: string
): Promise<TranslateResult> {
  const lang = targetLang || (getSetting('translatorTargetLang') as string) || 'en'
  const engine =
    (getSetting('translatorEngine') as string) || 'libretranslate'

  if (engine === 'google') {
    return googleTranslate(text, lang)
  }

  try {
    return await libretranslate(text, lang)
  } catch (libreErr) {
    console.warn('[translator] LibreTranslate failed, falling back to Google:', libreErr)
    try {
      return await googleTranslate(text, lang)
    } catch (googleErr) {
      return {
        translatedText: '',
        engine: 'error',
        error: `LibreTranslate: ${(libreErr as Error).message}; Google: ${(googleErr as Error).message}`
      }
    }
  }
}

export function registerTranslatorIPC(): void {
  ipcMain.handle(
    'translator:translate',
    async (_e, text: string, targetLang?: string): Promise<TranslateResult> => {
      return translateText(text, targetLang)
    }
  )
}
