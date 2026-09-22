const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com']

export function isYouTubePage(): boolean {
  return YOUTUBE_HOSTS.includes(window.location.hostname)
}

export function initYouTubeFastPlayback(debug = false): void {
  if (!isYouTubePage()) return

  const script = document.createElement('script')
  // NOTE: This runs in PAGE context as plain JavaScript. No TypeScript annotations or `as` casts belong inside this string.
  script.textContent = `
    (function () {
      'use strict';

      if (window.__auraYTEngineInitialized) return;
      window.__auraYTEngineInitialized = true;

      var DEBUG = ${debug ? 'true' : 'false'};
      var CLEAN_TRACK_INTERVAL_MS = 500;
      var AD_CHECK_INTERVAL_MS = 150;
      var UNSKIPPABLE_THRESHOLD_MS = 800;
      var MAX_REFRESHES_PER_VIDEO = 2;

      var state = {
        lastCleanTimestamp: 0,
        adDetectedAt: 0,
        isRefreshing: false,
        currentVideoId: null,
        cleanTrackTimer: null,
        adCheckTimer: null
      };

      function log() {
        if (DEBUG) console.log.apply(console, ['[Aura/YT-Engine]'].concat(Array.prototype.slice.call(arguments)));
      }

      function getVideoId() {
        try {
          return new URLSearchParams(window.location.search).get('v');
        } catch (e) {
          return null;
        }
      }

      function getPlayer() {
        return document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
      }

      function isAdShowing(player) {
        return !!(
          player.classList.contains('ad-showing') ||
          player.classList.contains('ad-interrupting') ||
          document.querySelector('.ytp-ad-text') ||
          document.querySelector('.ytp-ad-skip-button-container')
        );
      }

      // Reset state on SPA navigation between videos
      function handleNavigation() {
        var newId = getVideoId();
        if (newId !== state.currentVideoId) {
          log('Navigated to new video:', newId);
          state.currentVideoId = newId;
          state.lastCleanTimestamp = 0;
          state.adDetectedAt = 0;
          state.isRefreshing = false;
        }
      }

      function trackCleanPosition() {
        try {
          var video = document.querySelector('video');
          var player = getPlayer();
          if (!video || !player) return;

          if (!isAdShowing(player) && video.currentTime > 0 && !video.paused) {
            state.lastCleanTimestamp = Math.floor(video.currentTime);
            state.adDetectedAt = 0;
          }
        } catch (e) {
          log('trackCleanPosition error:', e);
        }
      }

      function checkAndBypassAd() {
        try {
          if (state.isRefreshing) return;

          var video = document.querySelector('video');
          var player = getPlayer();
          if (!video || !player) return;

          var videoId = getVideoId();
          if (!videoId) return;

          if (isAdShowing(player)) {
            // First line of defense: speed through & click Skip
            video.muted = true;
            video.playbackRate = 16.0;

            var skipBtn = document.querySelector(
              '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button'
            );
            if (skipBtn) {
              skipBtn.click();
              return;
            }

            if (state.adDetectedAt === 0) {
              state.adDetectedAt = Date.now();
            }

            // Unskippable ad stuck past threshold -> force refresh & resume
            if (Date.now() - state.adDetectedAt > UNSKIPPABLE_THRESHOLD_MS) {
              var refreshKey = 'aura_yt_refresh_' + videoId;
              var refreshCount = parseInt(sessionStorage.getItem(refreshKey) || '0', 10);

              if (refreshCount < MAX_REFRESHES_PER_VIDEO) {
                state.isRefreshing = true;
                sessionStorage.setItem(refreshKey, String(refreshCount + 1));

                var resumeTime = Math.max(0, state.lastCleanTimestamp - 1);
                var url = new URL(window.location.href);
                url.searchParams.set('t', resumeTime + 's');

                log('Unskippable ad — reloading to bypass, resuming at', resumeTime, 's');
                window.location.href = url.toString();
              } else {
                log('Refresh limit reached for this video, playing ad out.');
              }
            }
          }

          // Auto-dismiss anti-adblock enforcement dialogs
          var dismissBtn = document.querySelector(
            'ytd-enforcement-message-view-model #dismiss-button, tp-yt-paper-dialog #dismiss-button'
          );
          if (dismissBtn) {
            dismissBtn.click();
            if (video && video.paused) video.play();
          }
        } catch (e) {
          log('checkAndBypassAd error:', e);
        }
      }

      function startTimers() {
        stopTimers();
        state.cleanTrackTimer = setInterval(trackCleanPosition, CLEAN_TRACK_INTERVAL_MS);
        state.adCheckTimer = setInterval(checkAndBypassAd, AD_CHECK_INTERVAL_MS);
      }

      function stopTimers() {
        if (state.cleanTrackTimer) clearInterval(state.cleanTrackTimer);
        if (state.adCheckTimer) clearInterval(state.adCheckTimer);
        state.cleanTrackTimer = null;
        state.adCheckTimer = null;
      }

      // Pause polling when tab is hidden to save CPU/battery
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          stopTimers();
        } else {
          startTimers();
        }
      });

      // YouTube SPA route change listener
      document.addEventListener('yt-navigate-finish', handleNavigation);

      handleNavigation();
      startTimers();
      log('Engine initialized for video:', state.currentVideoId);
    })();
  `

  ;(document.head ?? document.documentElement)?.appendChild(script)
  script.remove()
}
