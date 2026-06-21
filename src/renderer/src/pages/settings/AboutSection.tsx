import React, { useEffect, useState } from 'react'
import './AboutSection.css'
import auraLogo from '../../assets/brand/aura-mark-colored.png'

interface AboutInfo {
  appName: string
  appVersion: string
  electronVersion: string
  chromiumVersion: string
  nodeVersion: string
  v8Version: string
  osPlatform: string
  osVersion: string
  osArch: string
  userDataPath: string
  logsPath: string
  buildDate: string
}

function platformLabel(p: string): string {
  if (p === 'win32') return 'Windows'
  if (p === 'darwin') return 'macOS'
  if (p === 'linux') return 'Linux'
  return p
}

export function AboutSection(): React.ReactElement {
  const [info, setInfo] = useState<AboutInfo | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.aura.about.getInfo().then(setInfo)
  }, [])

  const copySysInfo = async () => {
    await window.aura.about.copySystemInfo()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!info) {
    return (
      <div className="sett-section">
        <h2 className="sett-section-title">About Aura</h2>
        <div className="sett-card">Loading…</div>
      </div>
    )
  }

  return (
    <div className="sett-section about-section">
      <h2 className="sett-section-title">About Aura</h2>

      <div className="about-hero">
        <img src={auraLogo} alt="Aura" className="about-hero-logo" />
        <div className="about-hero-meta">
          <h1 className="about-app-name">{info.appName}</h1>
          <div className="about-app-version">Version {info.appVersion}</div>
          <div className="about-app-tagline">
            The fastest and most secure consumer browser
          </div>
        </div>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">System</h3>

        <div className="about-info-grid">
          <div className="about-info-row">
            <span className="about-info-key">Platform</span>
            <span className="about-info-value">
              {platformLabel(info.osPlatform)} {info.osVersion} ({info.osArch})
            </span>
          </div>
          <div className="about-info-row">
            <span className="about-info-key">Electron</span>
            <span className="about-info-value mono">{info.electronVersion}</span>
          </div>
          <div className="about-info-row">
            <span className="about-info-key">Chromium</span>
            <span className="about-info-value mono">{info.chromiumVersion}</span>
          </div>
          <div className="about-info-row">
            <span className="about-info-key">Node.js</span>
            <span className="about-info-value mono">{info.nodeVersion}</span>
          </div>
          <div className="about-info-row">
            <span className="about-info-key">V8</span>
            <span className="about-info-value mono">{info.v8Version}</span>
          </div>
          <div className="about-info-row">
            <span className="about-info-key">Build</span>
            <span className="about-info-value mono">{info.buildDate}</span>
          </div>
        </div>

        <button className="about-action-btn secondary" onClick={copySysInfo}>
          {copied ? '\u2713 Copied' : 'Copy system info'}
        </button>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Storage</h3>

        <div className="about-info-grid">
          <div className="about-info-row">
            <span className="about-info-key">User data</span>
            <span className="about-info-value mono small">{info.userDataPath}</span>
          </div>
          <div className="about-info-row">
            <span className="about-info-key">Logs</span>
            <span className="about-info-value mono small">{info.logsPath}</span>
          </div>
        </div>

        <div className="about-button-row">
          <button
            className="about-action-btn"
            onClick={() => window.aura.about.openDataFolder()}
          >
            Open data folder
          </button>
          <button
            className="about-action-btn"
            onClick={() => window.aura.about.openLogsFolder()}
          >
            Open logs folder
          </button>
        </div>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Updates</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Check for updates</span>
            <span className="setting-description">
              Automatic updates will arrive in a future release
            </span>
          </div>
          <button
            className="about-action-btn secondary"
            disabled
            title="Auto-update will be available in Aura 1.1"
          >
            Coming soon
          </button>
        </div>
      </div>

      <div className="sett-card">
        <h3 className="sett-card-title">Legal</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">License</span>
            <span className="setting-description">
              Aura is built on Electron, Chromium, and open-source libraries.
            </span>
          </div>
        </div>

        <div className="about-credits">
          Made with care. &copy; {new Date().getFullYear()} Aura Browser.
        </div>
      </div>
    </div>
  )
}
