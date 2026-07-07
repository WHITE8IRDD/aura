import React, { useEffect, useState } from 'react'

interface Profile {
  id: number; label: string; fullName: string; givenName: string
  familyName: string; email: string; phone: string
  organization: string; street: string; city: string
  region: string; postalCode: string; country: string
  createdAt: number; updatedAt: number
}

interface ProfileInput {
  label: string; fullName: string; givenName: string; familyName: string
  email: string; phone: string; organization: string
  street: string; city: string; region: string; postalCode: string; country: string
}

const EMPTY_INPUT: ProfileInput = {
  label: '', fullName: '', givenName: '', familyName: '',
  email: '', phone: '', organization: '',
  street: '', city: '', region: '', postalCode: '', country: ''
}

function ProfileEditModal({ profile, onSave, onCancel }: {
  profile: ProfileInput
  onSave: (p: ProfileInput) => void
  onCancel: () => void
}) {
  const [f, setF] = useState<ProfileInput>(profile)
  const set = (k: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="autofill-modal-overlay" onClick={onCancel}>
      <div className="autofill-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{profile.label ? 'Edit profile' : 'Add profile'}</h3>
        <div className="autofill-modal-fields">
          <label>Label <input value={f.label} onChange={set('label')} placeholder="Home / Work / etc" /></label>
          <label>Full name <input value={f.fullName} onChange={set('fullName')} /></label>
          <label>Given name <input value={f.givenName} onChange={set('givenName')} /></label>
          <label>Family name <input value={f.familyName} onChange={set('familyName')} /></label>
          <label>Email <input value={f.email} onChange={set('email')} type="email" /></label>
          <label>Phone <input value={f.phone} onChange={set('phone')} type="tel" /></label>
          <label>Organization <input value={f.organization} onChange={set('organization')} /></label>
          <label>Street address <input value={f.street} onChange={set('street')} /></label>
          <label>City <input value={f.city} onChange={set('city')} /></label>
          <label>State / Region <input value={f.region} onChange={set('region')} /></label>
          <label>Postal code <input value={f.postalCode} onChange={set('postalCode')} /></label>
          <label>Country <input value={f.country} onChange={set('country')} /></label>
        </div>
        <div className="autofill-modal-actions">
          <button className="sett-btn" onClick={onCancel}>Cancel</button>
          <button className="sett-btn" style={{ background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            onClick={() => onSave(f)}>Save</button>
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ p, onEdit, onDelete }: { p: Profile; onEdit: () => void; onDelete: () => void }) {
  const fields = [
    p.fullName, p.email, p.phone,
    [p.street, p.city, p.region, p.postalCode].filter(Boolean).join(', ')
  ].filter(Boolean)
  return (
    <div className="sett-card">
      <div className="sett-card-title-row">
        <h3 className="sett-card-title">{p.label || 'Profile'}</h3>
        <div className="sett-card-actions">
          <button className="sett-btn-small" onClick={onEdit}>Edit</button>
          <button className="sett-btn-small sett-btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
      {fields.map((line, i) => <div key={i} className="autofill-field-line">{line}</div>)}
    </div>
  )
}

export function AutofillProfilesManager(): React.ReactElement {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProfileInput | null>(null)

  const load = async () => {
    const list = await window.aura.autofill.list()
    setProfiles(list)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(EMPTY_INPUT)
    setModalOpen(true)
  }

  const openEdit = (p: Profile) => {
    setEditing({
      label: p.label, fullName: p.fullName, givenName: p.givenName,
      familyName: p.familyName, email: p.email, phone: p.phone,
      organization: p.organization, street: p.street, city: p.city,
      region: p.region, postalCode: p.postalCode, country: p.country
    })
    setModalOpen(true)
  }

  const handleSave = async (input: ProfileInput) => {
    if (editing && profiles.some(p =>
      typeof p.label === 'string' && typeof editing.label === 'string' &&
      p.label === editing.label && p.email === editing.email &&
      p.street === editing.street
    )) {
      const existing = profiles.find(p =>
        p.label === editing.label && p.email === editing.email
      )
      if (existing) {
        await window.aura.autofill.update(existing.id, { ...input, label: input.label || 'Profile' })
      }
    } else {
      await window.aura.autofill.add({ ...input, label: input.label || 'Profile' })
    }
    setModalOpen(false)
    setEditing(null)
    await load()
  }

  const handleDelete = async (id: number) => {
    await window.aura.autofill.delete(id)
    await load()
  }

  const handleDeleteAll = async () => {
    await window.aura.autofill.deleteAll()
    await load()
  }

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Autofill Profiles</h2>

      {profiles.length > 0 && (
        <div className="sett-card">
          <div className="sett-card-title-row">
            <h3 className="sett-card-title">Saved profiles ({profiles.length})</h3>
            <button className="sett-btn-small sett-btn-danger" onClick={handleDeleteAll}>Delete all</button>
          </div>
        </div>
      )}

      {profiles.map(p => (
        <ProfileCard key={p.id} p={p}
          onEdit={() => openEdit(p)}
          onDelete={() => handleDelete(p.id)} />
      ))}

      <div className="sett-card">
        <div className="sett-field">
          <div className="sett-field-label">Add a profile</div>
          <div className="sett-field-desc">Save your name, email, address, and more for quick autofill</div>
          <button className="sett-btn" style={{ marginTop: 8, background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            onClick={openAdd}>
            Add profile
          </button>
        </div>
      </div>

      {modalOpen && editing && (
        <ProfileEditModal
          profile={editing}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
