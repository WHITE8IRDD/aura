import React, { useEffect, useState } from 'react'

interface PermissionRequest {
  id: number
  origin: string
  permission: string
}

const PERMISSION_LABELS: Record<string, string> = {
  geolocation: 'access your location',
  notifications: 'show desktop notifications',
  media: 'access your camera or microphone',
  midi: 'access MIDI devices',
  pointerLock: 'lock the pointer',
  fullscreen: 'enter fullscreen',
  clipboard: 'read from your clipboard',
  background: 'run in the background'
}

export default function PermissionPrompt(): React.ReactElement | null {
  const [request, setRequest] = useState<PermissionRequest | null>(null)

  useEffect(() => {
    return window.aura.permissions.onRequest((req) => setRequest(req))
  }, [])

  if (!request) return null

  const label = PERMISSION_LABELS[request.permission] ?? `use ${request.permission}`
  const origin = (() => {
    try {
      return new URL(request.origin).host
    } catch {
      return request.origin
    }
  })()

  const respond = (granted: boolean, remember: boolean): void => {
    window.aura.permissions.respond(request.id, granted, remember)
    setRequest(null)
  }

  return (
    <div className="perm-prompt">
      <div className="perm-prompt-body">
        <div className="perm-prompt-origin">{origin}</div>
        <div className="perm-prompt-text">wants to {label}</div>
      </div>
      <div className="perm-prompt-actions">
        <button className="perm-deny" onClick={() => respond(false, false)}>Block</button>
        <button className="perm-allow-once" onClick={() => respond(true, false)}>Allow once</button>
        <button className="perm-allow" onClick={() => respond(true, true)}>Always allow</button>
      </div>
    </div>
  )
}
