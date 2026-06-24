import { session } from 'electron'

export const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const CHROME_STORE_DOMAINS = [
  'chromewebstore.google.com',
  'chrome.google.com',
  'clients2.google.com',
  'clients2.googleusercontent.com',
]

export const isChromeStoreDomain = (urlString: string): boolean => {
  try {
    const { hostname } = new URL(urlString)
    return CHROME_STORE_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    )
  } catch {
    return false
  }
}

export function applyChromeUASpoof(targetSession: Electron.Session): void {
  targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (isChromeStoreDomain(details.url)) {
      const headers = { ...details.requestHeaders }

      // Strip ALL existing UA/Sec-CH-UA headers (case-insensitive)
      for (const key of Object.keys(headers)) {
        const lk = key.toLowerCase()
        if (
          lk === 'user-agent' ||
          lk === 'sec-ch-ua' ||
          lk === 'sec-ch-ua-mobile' ||
          lk === 'sec-ch-ua-platform' ||
          lk === 'sec-ch-ua-platform-version' ||
          lk === 'sec-ch-ua-arch' ||
          lk === 'sec-ch-ua-bitness' ||
          lk === 'sec-ch-ua-model' ||
          lk === 'sec-ch-ua-full-version' ||
          lk === 'sec-ch-ua-full-version-list' ||
          lk === 'sec-ch-ua-wow64'
        ) {
          delete headers[key]
        }
      }

      // Set authentic Chrome 131 headers
      headers['User-Agent'] = CHROME_UA
      headers['sec-ch-ua'] = '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"'
      headers['sec-ch-ua-mobile'] = '?0'
      headers['sec-ch-ua-platform'] = '"Windows"'

      callback({ requestHeaders: headers })
      return
    }
    callback({ requestHeaders: details.requestHeaders })
  })
}

export const STORE_INJECTION_SCRIPT = `
(function() {
  if (window.__auraStoreInjected) return;
  window.__auraStoreInjected = true;

  function getExtensionId() {
    var m = window.location.pathname.match(/\\/detail\\/[^\\/]+\\/([a-p]{32})/);
    return m ? m[1] : null;
  }

  function interceptInstallButtons() {
    var extId = getExtensionId();
    if (!extId) return;

    var buttons = document.querySelectorAll('button');
    buttons.forEach(function(btn) {
      var text = (btn.textContent || '').trim().toLowerCase();
      if ((text.indexOf('add to chrome') !== -1 ||
           text.indexOf('add to') !== -1 ||
           text.indexOf('install') !== -1) &&
          !btn.dataset.auraIntercepted) {
        btn.dataset.auraIntercepted = '1';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          var originalText = btn.textContent;
          btn.textContent = 'Installing...';
          btn.disabled = true;

          window.__auraInstallExtension(extId).then(function() {
            btn.textContent = 'Installed \\u2713';
            setTimeout(function() { btn.textContent = originalText; btn.disabled = false; }, 2500);
          }).catch(function(err) {
            btn.textContent = 'Install Failed';
            console.error('[Aura] Extension install failed:', err);
            setTimeout(function() { btn.textContent = originalText; btn.disabled = false; }, 2500);
          });

          return false;
        }, true);
      }
    });
  }

  interceptInstallButtons();

  var root = document.body || document.documentElement;
  if (root) {
    var observer = new MutationObserver(interceptInstallButtons);
    observer.observe(root, { childList: true, subtree: true });
  }
})();
`

export function injectStoreScript(webContents: Electron.WebContents): void {
  if (!webContents || webContents.isDestroyed()) return
  const url = webContents.getURL()
  if (!isChromeStoreDomain(url)) return

  webContents
    .executeJavaScript(`
      window.__auraInstallExtension = function(extId) {
        return new Promise(function(resolve, reject) {
          if (window.aura && window.aura.extensions && window.aura.extensions.installFromStoreId) {
            window.aura.extensions.installFromStoreId(extId)
              .then(function(r) { r && r.success ? resolve(r) : reject(new Error((r && r.error) || 'Install failed')); })
              .catch(reject);
          } else {
            reject(new Error('Aura extensions API not available'));
          }
        });
      };
    `)
    .then(() => webContents.executeJavaScript(STORE_INJECTION_SCRIPT))
    .catch((err) => console.warn('[Aura] Store script injection failed:', err?.message))
}
