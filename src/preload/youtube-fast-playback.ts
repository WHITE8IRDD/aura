/**
 * YouTube Super Fast Playback Engine
 * Minimizes buffering and load-to-play time.
 * Integrates with existing media resume — does NOT duplicate it.
 */

const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com']

export function isYouTubePage(): boolean {
  return YOUTUBE_HOSTS.includes(window.location.hostname)
}

export function initYouTubeFastPlayback(): void {
  if (!isYouTubePage()) return

  const script = document.createElement('script')
  script.textContent = `
    (function() {
      'use strict';

      function preconnect() {
        var hosts = ['https://i.ytimg.com', 'https://yt3.ggpht.com', 'https://fonts.googleapis.com'];
        hosts.forEach(function(h) {
          var l = document.createElement('link');
          l.rel = 'dns-prefetch'; l.href = h;
          document.head.appendChild(l);
        });
      }

      function injectCSS() {
        var s = document.createElement('style');
        s.id = 'aura-yt-perf';
        s.textContent =
          '.html5-video-player, .html5-video-container, video {' +
          'will-change: transform; transform: translateZ(0);' +
          '}' +
          '.ytp-spinner { transition: opacity 0.1s !important; }';
        document.head.appendChild(s);
      }

      function removeBlockers() {
        ['#masthead-ad', '.ytp-ad-overlay-container', '.ytp-endscreen-content',
         '.ytp-autonav-endscreen-countdown-overlay'].forEach(function(sel) {
          var el = document.querySelector(sel);
          if (el) el.style.display = 'none';
        });
      }

      function optimizeVideos() {
        document.querySelectorAll('video').forEach(function(v) {
          v.preload = 'auto';
          v.playsInline = true;
        });
      }

      function optimizePlayer() {
        var p = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
        if (p && typeof p.unloadModule === 'function') {
          try { p.unloadModule('annotations_module'); } catch(e) {}
        }
      }

      function init() {
        preconnect();
        injectCSS();
        setTimeout(removeBlockers, 800);
        setTimeout(optimizeVideos, 1500);
        var checks = 0;
        var iv = setInterval(function() {
          if (++checks > 200) return clearInterval(iv);
          var p = document.querySelector('#movie_player');
          if (p) { clearInterval(iv); optimizePlayer(); }
        }, 50);
      }

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();

      var lastUrl = location.href;
      new MutationObserver(function() {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          setTimeout(function() { removeBlockers(); optimizeVideos(); optimizePlayer(); }, 800);
        }
      }).observe(document.body, { childList: true, subtree: true });
    })();
  `;
  ;(document.head || document.documentElement).appendChild(script)
  script.remove()
}
