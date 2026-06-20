import { ipcRenderer } from 'electron'

const AUTOCOMPLETE_MAP: Record<string, string> = {
  'name': 'fullName',
  'given-name': 'givenName',
  'family-name': 'familyName',
  'email': 'email',
  'tel': 'phone',
  'tel-national': 'phone',
  'organization': 'organization',
  'street-address': 'street',
  'address-line1': 'street',
  'address-level2': 'city',
  'address-level1': 'region',
  'postal-code': 'postalCode',
  'country-name': 'country',
  'country': 'country'
}

const REVERSE_MAP: Record<string, string> = {
  fullName: 'name',
  givenName: 'given-name',
  familyName: 'family-name',
  email: 'email',
  phone: 'tel',
  organization: 'organization',
  street: 'street-address',
  city: 'address-level2',
  region: 'address-level1',
  postalCode: 'postal-code',
  country: 'country-name'
}

function captureForm(form: HTMLFormElement): Record<string, string> {
  const captured: Record<string, string> = {}
  const inputs = form.querySelectorAll<HTMLInputElement>('input[autocomplete]')
  inputs.forEach(input => {
    const ac = input.getAttribute('autocomplete')?.toLowerCase().trim()
    if (!ac) return
    const fieldKey = AUTOCOMPLETE_MAP[ac]
    if (!fieldKey) return
    const value = input.value.trim()
    if (!value) return
    captured[fieldKey] = value
  })
  return captured
}

export function setupAutofillCapture(): void {
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement
    if (!(form instanceof HTMLFormElement)) return
    const captured = captureForm(form)
    if (Object.keys(captured).length === 0) return
    ipcRenderer.send('autofill:formSubmitted', captured)
  }, true)
}

let suggestionEl: HTMLDivElement | null = null

function showSuggestions(input: HTMLInputElement, profiles: any[]) {
  if (suggestionEl) suggestionEl.remove()
  suggestionEl = document.createElement('div')
  suggestionEl.setAttribute('data-aura-autofill', '1')
  suggestionEl.style.cssText = [
    'position: absolute;',
    'z-index: 2147483647;',
    'background: #1c1c24;',
    'color: #e8e8e8;',
    'border: 1px solid rgba(255,255,255,0.1);',
    'border-radius: 8px;',
    'padding: 4px;',
    'min-width: 240px;',
    'font-family: -apple-system, sans-serif;',
    'font-size: 13px;',
    'box-shadow: 0 12px 40px rgba(0,0,0,0.5);'
  ].join('')
  const rect = input.getBoundingClientRect()
  suggestionEl.style.left = (rect.left + window.scrollX) + 'px'
  suggestionEl.style.top = (rect.bottom + window.scrollY + 4) + 'px'
  profiles.forEach((p: any) => {
    const item = document.createElement('div')
    item.style.cssText = [
      'padding: 8px 12px;',
      'border-radius: 6px;',
      'cursor: pointer;',
      'display: flex;',
      'flex-direction: column;',
      'gap: 2px;'
    ].join('')
    item.onmouseenter = () => item.style.background = 'rgba(99,102,241,0.18)'
    item.onmouseleave = () => item.style.background = 'transparent'
    const label = document.createElement('div')
    label.style.fontWeight = '600'
    label.textContent = p.fullName || p.email || p.label
    const sub = document.createElement('div')
    sub.style.cssText = 'font-size: 11px; opacity: 0.6;'
    sub.textContent = [p.email, p.city].filter(Boolean).join(' · ')
    item.appendChild(label)
    if (sub.textContent) item.appendChild(sub)
    item.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      fillFormFromProfile(input.form, p)
      hideSuggestions()
    }
    suggestionEl!.appendChild(item)
  })
  document.body.appendChild(suggestionEl)
}

function hideSuggestions() {
  if (suggestionEl) {
    suggestionEl.remove()
    suggestionEl = null
  }
}

function fillFormFromProfile(form: HTMLFormElement | null, profile: any) {
  if (!form) return
  const inputs = form.querySelectorAll<HTMLInputElement>('input[autocomplete]')
  inputs.forEach(input => {
    const ac = input.getAttribute('autocomplete')?.toLowerCase().trim()
    if (!ac) return
    for (const [field, attr] of Object.entries(REVERSE_MAP)) {
      if (attr === ac || (attr === 'tel' && ac === 'tel-national')) {
        const value = profile[field]
        if (value) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )?.set
          setter?.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }
    }
  })
}

export function setupAutofillSuggestions(): void {
  document.addEventListener('focusin', async (e) => {
    const input = e.target as HTMLInputElement
    if (!(input instanceof HTMLInputElement)) return
    const ac = input.getAttribute('autocomplete')?.toLowerCase()
    if (!ac || !AUTOCOMPLETE_MAP[ac]) return
    const profiles = await ipcRenderer.invoke('autofill:list')
    if (profiles && profiles.length > 0) {
      showSuggestions(input, profiles)
    }
  })
  document.addEventListener('focusout', () => {
    setTimeout(hideSuggestions, 200)
  })
  document.addEventListener('scroll', hideSuggestions, true)
  window.addEventListener('resize', hideSuggestions)
}
