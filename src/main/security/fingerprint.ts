import { app, type Session } from 'electron'

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function setupAntiFingerprintFlags(): void {
  app.commandLine.appendSwitch('enable-features', 'WebRtcHideLocalIpsWithMdns')
  app.commandLine.appendSwitch(
    'force-webrtc-ip-handling-policy',
    'default_public_interface_only'
  )
}

export function setupSessionFingerprintDefenses(targetSession: Session): void {
  targetSession.setUserAgent(CHROME_UA)
  console.log('[Aura/fingerprint] Set Chrome user-agent on session')
}

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
  } catch (e) {}
})();
`
