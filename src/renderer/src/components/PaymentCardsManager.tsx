import React, { useEffect, useState } from 'react'

interface PaymentCard {
  id: number; label: string; cardholder: string; number: string
  expMonth: string; expYear: string; cvv: string
  brand: string; lastFour: string
  createdAt: number; updatedAt: number
}

interface CardInput {
  label: string; cardholder: string; number: string
  expMonth: string; expYear: string; cvv: string
}

const EMPTY_INPUT: CardInput = {
  label: '', cardholder: '', number: '', expMonth: '', expYear: '', cvv: ''
}

const BRAND_LOGOS: Record<string, string> = {
  Visa: '💳',
  Mastercard: '💳',
  Amex: '💳',
  Discover: '💳',
  JCB: '💳'
}

function CardEditModal({ card, onSave, onCancel }: {
  card: CardInput
  onSave: (c: CardInput) => void
  onCancel: () => void
}) {
  const [f, setF] = useState<CardInput>(card)
  const set = (k: keyof CardInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))
  const [showNumber, setShowNumber] = useState(false)
  const [showCvv, setShowCvv] = useState(false)

  return (
    <div className="autofill-modal-overlay" onClick={onCancel}>
      <div className="autofill-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{card.cardholder ? 'Edit card' : 'Add payment card'}</h3>
        <div className="autofill-modal-fields">
          <label>Label <input value={f.label} onChange={set('label')} placeholder="Personal / Business / etc" /></label>
          <label>Cardholder name <input value={f.cardholder} onChange={set('cardholder')} /></label>
          <label style={{ position: 'relative' }}>
            Card number
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={f.number} onChange={set('number')} type={showNumber ? 'text' : 'password'} placeholder="0000 0000 0000 0000" style={{ flex: 1 }} />
              <button className="sett-btn-small" onClick={() => setShowNumber(!showNumber)} style={{ flexShrink: 0 }}>
                {showNumber ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <div className="card-modal-row">
            <label style={{ flex: 1 }}>
              Exp. month <input value={f.expMonth} onChange={set('expMonth')} placeholder="MM" />
            </label>
            <label style={{ flex: 1 }}>
              Exp. year <input value={f.expYear} onChange={set('expYear')} placeholder="YYYY" />
            </label>
          </div>
          <label style={{ position: 'relative' }}>
            CVV
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={f.cvv} onChange={set('cvv')} type={showCvv ? 'text' : 'password'} placeholder="123" style={{ flex: 1 }} />
              <button className="sett-btn-small" onClick={() => setShowCvv(!showCvv)} style={{ flexShrink: 0 }}>
                {showCvv ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        </div>
        <div className="autofill-modal-actions">
          <button className="sett-btn" onClick={onCancel}>Cancel</button>
          <button className="sett-btn" style={{ background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            onClick={() => {
              if (!f.number.trim()) return
              onSave(f)
            }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function CardItem({ card, onEdit, onDelete }: {
  card: PaymentCard
  onEdit: () => void
  onDelete: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const masked = card.number.replace(/.(?=.{4})/g, '•').replace(/(.{4})/g, '$1 ')
  const display = revealed ? card.number.replace(/(.{4})/g, '$1 ') : masked

  return (
    <div className="sett-card">
      <div className="sett-card-title-row">
        <h3 className="sett-card-title">
          {card.brand || 'Card'} ···· {card.lastFour}
        </h3>
        <div className="sett-card-actions">
          <button className="sett-btn-small" onClick={onEdit}>Edit</button>
          <button className="sett-btn-small sett-btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="card-line">{card.cardholder}</div>
      <div className="card-number-row" onClick={() => setRevealed(!revealed)} style={{ cursor: 'pointer' }}>
        <code className="card-number">{display}</code>
        <span className="card-reveal-hint">{revealed ? 'Hide' : 'Show'}</span>
      </div>
      <div className="card-expiry">Exp. {card.expMonth}/{card.expYear}</div>
    </div>
  )
}

export function PaymentCardsManager(): React.ReactElement {
  const [cards, setCards] = useState<PaymentCard[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CardInput | null>(null)
  const [vaultUnlocked, setVaultUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  const load = async () => {
    const list = await window.aura.autofill.cards.list()
    setCards(list)
  }

  useEffect(() => {
    if (vaultUnlocked) load()
  }, [vaultUnlocked])

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      const ok = await window.aura.passwords.unlockVault()
      if (ok) setVaultUnlocked(true)
    } finally {
      setUnlocking(false)
    }
  }

  const openAdd = () => {
    setEditing(EMPTY_INPUT)
    setModalOpen(true)
  }

  const openEdit = (c: PaymentCard) => {
    setEditing({
      label: c.label,
      cardholder: c.cardholder,
      number: c.number,
      expMonth: c.expMonth,
      expYear: c.expYear,
      cvv: c.cvv
    })
    setModalOpen(true)
  }

  const handleSave = async (input: CardInput) => {
    if (!input.number.trim()) return
    if (editing && cards.some(c => c.number === editing.number && c.cardholder === editing.cardholder)) {
      const existing = cards.find(c => c.number.replace(/\s/g, '') === editing.number.replace(/\s/g, ''))
      if (existing) {
        await window.aura.autofill.cards.update(existing.id, { ...input, label: input.label || 'Card' })
      }
    } else {
      await window.aura.autofill.cards.add({ ...input, label: input.label || 'Card' })
    }
    setModalOpen(false)
    setEditing(null)
    await load()
  }

  const handleDelete = async (id: number) => {
    await window.aura.autofill.cards.delete(id)
    await load()
  }

  const handleDeleteAll = async () => {
    await window.aura.autofill.cards.deleteAll()
    await load()
  }

  if (!vaultUnlocked) {
    return (
      <div className="sett-section">
        <h2 className="sett-section-title">Payment Cards</h2>
        <div className="sett-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Payment cards are locked</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 16 }}>
            Verify your identity to view and manage saved cards
          </div>
          <button className="sett-btn" style={{ background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            onClick={handleUnlock} disabled={unlocking}>
            {unlocking ? 'Verifying...' : 'Unlock'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sett-section">
      <h2 className="sett-section-title">Payment Cards</h2>

      {cards.length > 0 && (
        <div className="sett-card">
          <div className="sett-card-title-row">
            <h3 className="sett-card-title">Saved cards ({cards.length})</h3>
            <button className="sett-btn-small sett-btn-danger" onClick={handleDeleteAll}>Delete all</button>
          </div>
        </div>
      )}

      {cards.map(c => (
        <CardItem key={c.id} card={c}
          onEdit={() => openEdit(c)}
          onDelete={() => handleDelete(c.id)} />
      ))}

      <div className="sett-card">
        <div className="sett-field">
          <div className="sett-field-label">Add a payment card</div>
          <div className="sett-field-desc">Save your card details for quick checkout</div>
          <button className="sett-btn" style={{ marginTop: 8, background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}
            onClick={openAdd}>
            Add card
          </button>
        </div>
      </div>

      {modalOpen && editing && (
        <CardEditModal
          card={editing}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
