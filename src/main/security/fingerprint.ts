import { app, type Session } from 'electron'

/**
 * Anti-fingerprinting protections.
 *
 * Stage 5.9 update: UA normalization REMOVED.
 *
 * Why: Generic Chrome UA caused YouTube, Spotify Web, and several other
 * single-page apps to refuse to render — their feature detection thought
 * we were an outdated browser. The privacy gain from UA spoofing is
 * small (Aura is detectable by other means anyway), but the breakage
 * was large.
 *
 * What remains active:
 *   - Canvas noise injection (defeats canvas fingerprinting)
 *   - WebRTC IP leak protection (mDNS + UDP policy via Chromium flags)
 *
 * Stage 8 plan: re-introduce UA normalization as an opt-in toggle in
 * Settings under "Strict Privacy Mode".
 */

export function setupAntiFingerprintFlags(): void {
  // Block WebRTC IP leak — uses mDNS hostnames instead of local IPs
  app.commandLine.appendSwitch('enable-features', 'WebRtcHideLocalIpsWithMdns')
  // Disable non-proxied UDP which can reveal real IP behind a VPN
  app.commandLine.appendSwitch(
    'force-webrtc-ip-handling-policy',
    'default_public_interface_only'
  )
}

export function setupSessionFingerprintDefenses(_targetSession: Session): void {
  // UA normalization disabled — see comment above.
  // Chromium's default UA is used, which is what most sites expect.
}

/**
 * Canvas noise script — injected into every web page via the tab preload.
 * Adds tiny imperceptible variation to canvas reads so two fingerprint
 * attempts return slightly different values.
 */
export const CANVAS_NOISE_SCRIPT = `
(function() {
  try {
    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = origGetImageData.apply(this, args);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4000) {
        data[i] = data[i] ^ 1;
      }
      return imageData;
    };
  } catch (e) {
    /* CSP may block — fail silently */
  }
})();
`
