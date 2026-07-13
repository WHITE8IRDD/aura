import { WebContents } from 'electron'

const CHROME_VERSION = '126.0.0.0'
const CHROME_MAJOR = '126'

export function buildCleanUA(): string {
  const platform = process.platform
  let osToken: string
  if (platform === 'win32') {
    osToken = 'Windows NT 10.0; Win64; x64'
  } else if (platform === 'darwin') {
    osToken = 'Macintosh; Intel Mac OS X 10_15_7'
  } else {
    osToken = 'X11; Linux x86_64'
  }
  return `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`
}

function stripElectronTokens(ua: string): string {
  return ua
    .replace(/\sElectron\/[\d.]+/gi, '')
    .replace(/\sAura\/[\d.]+/gi, '')
    .replace(/\saura\/[\d.]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSecChUa(): string {
  return `"Google Chrome";v="${CHROME_MAJOR}", "Chromium";v="${CHROME_MAJOR}", "Not_A Brand";v="24"`
}

function buildSecChUaPlatform(): string {
  if (process.platform === 'win32') return '"Windows"'
  if (process.platform === 'darwin') return '"macOS"'
  return '"Linux"'
}

export function applyGoogleCompatibility(sess: Electron.Session): void {
  const cleanUA = buildCleanUA()
  const secChUa = buildSecChUa()
  const secChUaPlatform = buildSecChUaPlatform()

  sess.setUserAgent(cleanUA)

  sess.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders }

    if (headers['User-Agent']) {
      headers['User-Agent'] = stripElectronTokens(headers['User-Agent'])
      if (!headers['User-Agent'].includes('Chrome/')) {
        headers['User-Agent'] = cleanUA
      }
    } else {
      headers['User-Agent'] = cleanUA
    }

    const url = details.url.toLowerCase()
    const isGoogleAuth =
      url.includes('accounts.google.com') ||
      url.includes('google.com/signin') ||
      url.includes('gstatic.com') ||
      url.includes('googleapis.com') ||
      url.includes('youtube.com') ||
      url.includes('ytimg.com')

    // Strip any existing Sec-CH-UA headers (case-insensitive)
    for (const key of Object.keys(headers)) {
      const lk = key.toLowerCase()
      if (
        lk === 'sec-ch-ua' ||
        lk === 'sec-ch-ua-mobile' ||
        lk === 'sec-ch-ua-platform'
      ) {
        delete headers[key]
      }
    }

    // Always set Chrome-brand Sec-CH-UA headers for every request,
    // just like a real Chrome browser does
    headers['Sec-CH-UA'] = secChUa
    headers['Sec-CH-UA-Mobile'] = '?0'
    headers['Sec-CH-UA-Platform'] = secChUaPlatform

    callback({ requestHeaders: headers })
  })
}

export function injectWebdriverBypass(webContents: WebContents): void {
  const secChUaPlatform = buildSecChUaPlatform()
  webContents.on('dom-ready', () => {
    webContents.executeJavaScript(`
      (function() {
        try {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true
          });

          var uaPlatform = ${secChUaPlatform};
          Object.defineProperty(navigator, 'userAgentData', {
            get: function() {
              return {
                brands: [
                  { brand: 'Google Chrome', version: '126' },
                  { brand: 'Chromium', version: '126' },
                  { brand: 'Not_A Brand', version: '24' },
                ],
                mobile: false,
                platform: uaPlatform,
                getHighEntropyValues: function() {
                  return Promise.resolve({
                    brands: [
                      { brand: 'Google Chrome', version: '126.0.0.0' },
                      { brand: 'Chromium', version: '126.0.0.0' },
                      { brand: 'Not_A Brand', version: '24.0.0.0' },
                    ],
                    mobile: false,
                    platform: uaPlatform,
                    architecture: 'x86',
                    bitness: '64',
                    model: '',
                    platformVersion: uaPlatform === 'Windows' ? '15.0.0' : '10_15_7',
                    fullVersionList: [
                      { brand: 'Google Chrome', version: '126.0.0.0' },
                      { brand: 'Chromium', version: '126.0.0.0' },
                      { brand: 'Not_A Brand', version: '24.0.0.0' },
                    ],
                    uaFullVersion: '126.0.0.0',
                    wow64: false,
                  });
                },
              };
            },
            configurable: true,
          });

          delete window.electron;
          delete window.process;
          delete window.require;
          delete window.module;
          delete window.__dirname;
          delete window.__filename;
        } catch (e) { /* silent */ }
      })();
    `).catch(() => { /* silent */ })
  })
}
