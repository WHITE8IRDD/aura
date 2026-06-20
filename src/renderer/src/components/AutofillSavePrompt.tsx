import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './AutofillSavePrompt.css'

interface Captured {
  fullName?: string
  givenName?: string
  familyName?: string
  email?: string
  phone?: string
  organization?: string
  street?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
}

export const AutofillSavePrompt: React.FC = () => {
  const [pending, setPending] = useState<Captured | null>(null)

  useEffect(() => {
    const unsub = window.aura.autofill.onPromptSave((data: Captured) => {
      setPending(data)
      setTimeout(() => setPending(null), 20000)
    })
    return unsub
  }, [])

  if (!pending) return null

  const handleSave = async () => {
    await window.aura.autofill.acceptSave({
      label: 'Profile',
      fullName: pending.fullName || '',
      givenName: pending.givenName || '',
      familyName: pending.familyName || '',
      email: pending.email || '',
      phone: pending.phone || '',
      organization: pending.organization || '',
      street: pending.street || '',
      city: pending.city || '',
      region: pending.region || '',
      postalCode: pending.postalCode || '',
      country: pending.country || ''
    })
    setPending(null)
  }

  const previewFields = Object.entries(pending)
    .filter(([_, v]) => v && v.length > 0)
    .slice(0, 3)
    .map(([_, v]) => v)
    .join(' \u00b7 ')

  return (
    <AnimatePresence>
      <motion.div
        className="autofill-save-banner"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="autofill-banner-content">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <div className="autofill-banner-text">
            <strong>Save this info to Aura?</strong>
            <span>{previewFields}</span>
          </div>
        </div>
        <div className="autofill-banner-actions">
          <button onClick={() => setPending(null)}>Not now</button>
          <button className="primary" onClick={handleSave}>Save</button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
