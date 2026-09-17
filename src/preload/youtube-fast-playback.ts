const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com'];

export function isYouTubePage(): boolean {
  return YOUTUBE_HOSTS.includes(window.location.hostname);
}

export function initYouTubeFastPlayback(): void {
  if (!isYouTubePage()) return;

  const script = document.createElement('script');
  script.textContent = `
    (function() {
      'use strict';

      // 1. Preconnect to fast video servers
      try {
        ['https://i.ytimg.com', 'https://yt3.ggpht.com'].forEach(h => {
          const l = document.createElement('link');
          l.rel = 'dns-prefetch'; l.href = h;
          (document.head || document.documentElement).appendChild(l);
        });
      } catch(e) {}

      // 2. High-speed Silent Video Ad Skipper (Safe DOM-level, no fetch corruption)
      function skipVideoAds() {
        try {
          const video = document.querySelector('video');
          const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
          if (!video || !player) return;

          const isAd = player.classList.contains('ad-showing') || 
                       player.classList.contains('ad-interrupting') ||
                       document.querySelector('.ytp-ad-text') ||
                       document.querySelector('.ytp-ad-skip-button-container');

          if (isAd) {
            video.muted = true;
            video.playbackRate = 16.0;
            if (isFinite(video.duration) && video.duration > 0) {
              video.currentTime = video.duration - 0.05;
            }
            const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
            if (skipBtn) (skipBtn as HTMLElement).click();
          }

          // Auto-close anti-adblock warning modal if shown
          const dismissBtn = document.querySelector('ytd-enforcement-message-view-model #dismiss-button, tp-yt-paper-dialog #dismiss-button');
          if (dismissBtn) {
            (dismissBtn as HTMLElement).click();
            if (video && video.paused) video.play();
          }
        } catch(e) {}
      }

      // 3. Remove cosmetic ad banners
      function removeAdOverlays() {
        const selectors = [
          '#masthead-ad',
          '.ytp-ad-overlay-container',
          'ytd-ad-slot-renderer',
          'ytd-in-feed-ad-layout-renderer',
          'ytd-banner-promo-renderer'
        ];
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        });
      }

      setInterval(skipVideoAds, 100);
      setInterval(removeAdOverlays, 1000);
    })();
  `;

  (document.head || document.documentElement).appendChild(script);
  script.remove();
}