(function () {
    'use strict';

    var widgets = window.TMPageWidgets = window.TMPageWidgets || {};
    var shouldLimitAutoplayMedia = widgets.shouldLimitAutoplayMedia;

    // ==========================================
    // HERO VIDEO + REDUCED MOTION / DATA SAVER
    // Keep the static experience photo as the first paint and fallback, then
    // reveal the hero video only after playback can paint.
    // ==========================================
    function initHeroVideo() {
        var heroVideoEl = document.getElementById('heroVideo');
        if (!heroVideoEl) return;
        var heroVideoShell = heroVideoEl.closest ? heroVideoEl.closest('.hero-video-container') : null;

        function revealHeroVideo() {
            if (heroVideoShell) {
                heroVideoShell.classList.remove('is-video-fallback');
                heroVideoShell.classList.add('is-video-ready');
            }
        }

        function revealHeroFallback() {
            if (heroVideoShell) {
                heroVideoShell.classList.remove('is-video-ready');
                heroVideoShell.classList.add('is-video-fallback');
            }
        }

        function runAfterHeroPaint(callback) {
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(callback);
            });
        }

        if (shouldLimitAutoplayMedia()) {
            heroVideoEl.removeAttribute('autoplay');
            heroVideoEl.removeAttribute('loop');
            heroVideoEl.preload = 'none';
            heroVideoEl.pause();
            revealHeroFallback();
            return;
        }

        heroVideoEl.autoplay = true;
        heroVideoEl.setAttribute('autoplay', '');
        heroVideoEl.muted = true;
        heroVideoEl.defaultMuted = true;
        heroVideoEl.setAttribute('muted', '');
        heroVideoEl.loop = true;
        heroVideoEl.setAttribute('loop', '');
        heroVideoEl.playsInline = true;
        heroVideoEl.setAttribute('playsinline', '');
        heroVideoEl.setAttribute('webkit-playsinline', '');
        heroVideoEl.preload = 'none';

        runAfterHeroPaint(function () {
            heroVideoEl.querySelectorAll('source[data-src]').forEach(function (source) {
                if (source.hasAttribute('data-media') && !source.hasAttribute('media')) {
                    source.setAttribute('media', source.getAttribute('data-media'));
                }
                if (!source.getAttribute('src')) source.setAttribute('src', source.getAttribute('data-src'));
            });

            var attempted = false;
            function kickHeroPlayback() {
                if (attempted) return;
                attempted = true;
                var playAttempt = heroVideoEl.play();
                if (playAttempt && typeof playAttempt.then === 'function') {
                    playAttempt.then(revealHeroVideo).catch(revealHeroFallback);
                } else {
                    revealHeroVideo();
                }
            }

            heroVideoEl.addEventListener('playing', revealHeroVideo, { once: true });
            heroVideoEl.preload = 'auto';
            heroVideoEl.load();
            kickHeroPlayback();
        });
    }

    widgets.initHeroVideo = initHeroVideo;
})();
