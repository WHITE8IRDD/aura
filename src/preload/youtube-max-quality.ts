/**
 * YouTube Max Quality Enforcer
 * Forces YouTube to always select the highest available quality.
 * No API keys required — pure DOM + player API injection.
 */

const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com']

export function isYouTubePage(): boolean {
  return YOUTUBE_HOSTS.includes(window.location.hostname)
}

const QUALITY_PRIORITY = [
  'hd2160', 'hd1440', 'hd1080', 'hd720',
  'large', 'medium', 'small', 'tiny',
]

export function initYouTubeMaxQuality(): void {
  if (!isYouTubePage()) return

  const script = document.createElement('script')
  script.textContent = `
    (function() {
      'use strict';
      var QP = ${JSON.stringify(QUALITY_PRIORITY)};

      function forceMaxQuality(player) {
        if (!player || typeof player.getAvailableQualityLevels !== 'function') return;
        try {
          var available = player.getAvailableQualityLevels();
          if (!available || available.length === 0) return;
          var best = available[0];
          for (var i = 0; i < QP.length; i++) {
            if (available.indexOf(QP[i]) !== -1) { best = QP[i]; break; }
          }
          var current = player.getPlaybackQuality ? player.getPlaybackQuality() : null;
          if (current !== best) {
            if (typeof player.setPlaybackQualityRange === 'function') player.setPlaybackQualityRange(best, best);
            if (typeof player.setPlaybackQuality === 'function') player.setPlaybackQuality(best);
          }
        } catch(e) {}
      }

      function getPlayer() {
        var el = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
        return (el && typeof el.getPlayerState === 'function') ? el : null;
      }

      function hookQualityChange(player) {
        if (!player || player.__auraQHooked) return;
        player.__auraQHooked = true;
        if (typeof player.addEventListener === 'function') {
          player.addEventListener('onPlaybackQualityChange', function(q) {
            var avail = player.getAvailableQualityLevels ? player.getAvailableQualityLevels() : [];
            if (avail.length > 0 && q !== avail[0]) {
              setTimeout(function() { forceMaxQuality(player); }, 500);
            }
          });
          player.addEventListener('onStateChange', function(state) {
            if (state === 3 || state === 1) setTimeout(function() { forceMaxQuality(player); }, 800);
          });
        }
      }

      try {
        var pref = document.cookie.split(';').find(function(c) { return c.trim().startsWith('PREF='); });
        if (pref) {
          var v = pref.split('=').slice(1).join('=').trim();
          v = v.indexOf('f6=') !== -1 ? v.replace(/f6=\\d+/, 'f6=8') : v + '&f6=8';
          document.cookie = 'PREF=' + v + ';domain=.youtube.com;path=/;max-age=31536000';
        } else {
          document.cookie = 'PREF=f6=8;domain=.youtube.com;path=/;max-age=31536000';
        }
      } catch(e) {}

      function init() {
        var checks = 0;
        var iv = setInterval(function() {
          if (++checks > 200) return clearInterval(iv);
          var p = getPlayer();
          if (p) {
            clearInterval(iv);
            forceMaxQuality(p);
            hookQualityChange(p);
            var retries = 0;
            var retryIv = setInterval(function() {
              if (++retries > 5) return clearInterval(retryIv);
              forceMaxQuality(p);
            }, 1500);
          }
        }, 50);
      }

      document.addEventListener('yt-navigate-finish', function() {
        setTimeout(function() {
          var p = getPlayer();
          if (p) { forceMaxQuality(p); hookQualityChange(p); }
        }, 1000);
      });

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
    })();
  `;
  ;(document.head || document.documentElement).appendChild(script)
  script.remove()
}
