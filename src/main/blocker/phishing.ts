const PHISHING_DOMAINS = new Set<string>([
  'paypal-verify.com',
  'apple-id-verify.com',
  'microsoft-account-verify.com',
  'amazon-security-alert.com',
  'netflix-billing-update.com',
  'google-account-recovery.net',
  'malware-traffic-analysis.net'
])

export function isPhishingDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  if (PHISHING_DOMAINS.has(host)) return true
  for (const phish of PHISHING_DOMAINS) {
    if (host.endsWith('.' + phish)) return true
  }
  return false
}

export function getPhishingDomainCount(): number {
  return PHISHING_DOMAINS.size
}
