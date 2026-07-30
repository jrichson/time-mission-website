(function () {
    'use strict';

    var widgets = window.TMPageWidgets = window.TMPageWidgets || {};
    var prefersReducedMotion = widgets.prefersReducedMotion;
    var runWhenVisible = widgets.runWhenVisible;

    // ==========================================
    // PRESS TICKER, JS-driven seamless loop
    // ==========================================
    function initPressTicker() {
        var logosContainer = document.getElementById('pressLogos');
        if (!logosContainer) return;

        var logos = logosContainer.querySelectorAll('.press-logo');
        var halfCount = logos.length / 2;
        if (prefersReducedMotion()) return;
        var tickerPos = 0;
        var tickerSpeed = 0.6;
        var tickerPaused = false;
        var tickerRaf;

        function getHalfWidth() {
            var w = 0;
            var gap = 64; // 4rem = 64px
            for (var i = 0; i < halfCount; i++) {
                w += logos[i].getBoundingClientRect().width + gap;
            }
            return w;
        }

        var halfWidth = 0;

        // Wait for images to load to get accurate widths
        function initTicker() {
            halfWidth = getHalfWidth();
            if (halfWidth === 0) {
                requestAnimationFrame(initTicker);
                return;
            }
            tickerRaf = requestAnimationFrame(tickerLoop);
        }

        function tickerLoop() {
            if (!tickerPaused) {
                tickerPos += tickerSpeed;
                if (tickerPos >= halfWidth) {
                    tickerPos -= halfWidth;
                }
                logosContainer.style.transform = 'translateX(' + (-tickerPos) + 'px)';
            }
            tickerRaf = requestAnimationFrame(tickerLoop);
        }

        logosContainer.addEventListener('mouseenter', function () { tickerPaused = true; });
        logosContainer.addEventListener('mouseleave', function () { tickerPaused = false; });

        function startTicker() {
            if (tickerRaf) return;
            tickerRaf = requestAnimationFrame(initTicker);
        }

        function stopTicker() {
            if (!tickerRaf) return;
            cancelAnimationFrame(tickerRaf);
            tickerRaf = null;
        }

        runWhenVisible(logosContainer, startTicker, stopTicker, '200px 0px');
    }

    // ==========================================
    // REVEAL ON SCROLL — stat-card gets a 200ms delayed .animated class
    // ==========================================
    function initRevealOnScroll() {
        var observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Trigger counter wheel animation
                    if (entry.target.classList.contains('stat-card')) {
                        setTimeout(function () {
                            entry.target.classList.add('animated');
                        }, 200);
                    }
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(function (el) {
            observer.observe(el);
        });
    }

    // ==========================================
    // SMOOTH SCROLL FOR ANCHOR LINKS (index variant — guards '#'/'#!')
    // ==========================================
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                var href = this.getAttribute('href') || '';
                if (href === '#' || href === '#!' || href.charAt(0) !== '#') return;
                e.preventDefault();
                var target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    widgets.initPressTicker = initPressTicker;
    widgets.initRevealOnScroll = initRevealOnScroll;
    widgets.initSmoothScroll = initSmoothScroll;
})();
