const shieldsDisabledHosts = new Set<string>()

export function areShieldsEnabled(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return !shieldsDisabledHosts.has(host)
}

export function toggleShields(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  if (shieldsDisabledHosts.has(host)) {
    shieldsDisabledHosts.delete(host)
    return true
  } else {
    shieldsDisabledHosts.add(host)
    return false
  }
}

export function getDisabledHosts(): string[] {
  return Array.from(shieldsDisabledHosts)
}
