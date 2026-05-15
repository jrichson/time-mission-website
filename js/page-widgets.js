// js/page-widgets.js
// RFC #12 — shared widget module behind a single TMPage facade.
// Replaces 8 per-page scripts (page-{philadelphia,houston,west-nyack,manassas,
// lincoln,mount-prospect,antwerp,index}-after.js, ~3,900 LoC of effective
// duplication) with one IIFE.
//
// Public surface:
//   window.TMPage.initCity({ city, taglines, gamePopup? })
//   window.TMPage.initIndex({ taglines, heroVideo?, gamePopup? })
//
// Internally registers window.updateEyebrowLocation (consumed by js/nav.js).
// initCity registers the real handler; initIndex registers a no-op stub so
// nav.js never branches per page.
//
// Behavioral parity with the deleted source files is the contract — timing
// constants, easing functions, and momentum decay are copied verbatim. See
// the source files in git history at HEAD~1 for byte-level reference.

(function () {
    'use strict';

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function shouldLimitAutoplayMedia() {
        var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        var effectiveType = connection && typeof connection.effectiveType === 'string'
            ? connection.effectiveType
            : '';
        return prefersReducedMotion()
            || Boolean(connection && connection.saveData)
            || effectiveType === 'slow-2g'
            || effectiveType === '2g';
    }

    function runAfterFirstPaint(callback) {
        var run = function () {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(callback, { timeout: 1800 });
            } else {
                window.setTimeout(callback, 800);
            }
        };
        if (document.readyState === 'complete') {
            run();
        } else {
            window.addEventListener('load', run, { once: true });
        }
    }

    // ==========================================================================
    // Shared widget primitives — closure-scoped, not exported
    // ==========================================================================

    /**
     * Rotating typewriter taglines.
     * opts:
     *   initialCity         (string|null) — if non-null, eyebrow is held as
     *                       "Time Mission <city>" before rotation starts.
     *   initialHoldMs       (number) — delay before startRotation kicks off.
     *   mobileLocationHoldMs (number) — re-hold duration after a mobile
     *                       location change via setEyebrowToLocation.
     * Returns: { setEyebrowToLocation(city: string): void }
     */
    function getTranslatedArray(key, fallback) {
        if (key && window.TMI18n && typeof window.TMI18n.t === 'function') {
            var translated = window.TMI18n.t(key);
            if (Array.isArray(translated) && translated.length) return translated;
        }
        return Array.isArray(fallback) ? fallback : [];
    }

    function initTagline(taglines, opts) {
        var taglineElement = document.getElementById('taglineText');
        var noop = { setEyebrowToLocation: function () {} };
        if (!taglineElement) return noop;
        if (!Array.isArray(taglines) || taglines.length === 0) return noop;

        var initialCity = opts && opts.initialCity ? opts.initialCity : null;
        var initialHoldMs = opts && typeof opts.initialHoldMs === 'number' ? opts.initialHoldMs : 3000;
        var mobileLocationHoldMs = opts && typeof opts.mobileLocationHoldMs === 'number' ? opts.mobileLocationHoldMs : 5000;
        var translationKey = opts && opts.translationKey ? opts.translationKey : '';
        var fallbackTaglines = taglines.slice();
        taglines = getTranslatedArray(translationKey, fallbackTaglines);

        var currentTaglineIndex = 0;
        var isTyping = false;
        var taglineIntervalId = null;
        var reduceMotion = prefersReducedMotion();

        function sleep(ms) {
            return new Promise(function (resolve) { setTimeout(resolve, ms); });
        }

        async function deleteText() {
            var currentText = taglineElement.textContent;
            for (var i = currentText.length; i >= 0; i--) {
                taglineElement.textContent = currentText.substring(0, i);
                await sleep(30); // Delete speed
            }
        }

        async function typeText(text) {
            for (var i = 0; i <= text.length; i++) {
                taglineElement.textContent = text.substring(0, i);
                await sleep(50); // Type speed
            }
        }

        async function rotateTagline() {
            if (isTyping) return;
            taglines = getTranslatedArray(translationKey, fallbackTaglines);
            if (!taglines.length) return;
            isTyping = true;

            await deleteText();
            await sleep(200); // Pause between delete and type

            currentTaglineIndex = (currentTaglineIndex + 1) % taglines.length;
            await typeText(taglines[currentTaglineIndex]);

            isTyping = false;
        }

        function isMobile() {
            return window.matchMedia('(max-width: 768px)').matches;
        }

        function startRotation() {
            if (reduceMotion) return;
            taglineElement.classList.remove('no-cursor');
            taglineIntervalId = setInterval(rotateTagline, 4000);
        }

        // On mobile with location: show "Time Mission {City}" for 5s, then rotate.
        function setEyebrowToLocation(city) {
            if (!isMobile() || !city) return;
            if (taglineIntervalId) clearInterval(taglineIntervalId);
            isTyping = false;
            taglineElement.textContent = 'Time Mission ' + city;
            taglineElement.classList.add('no-cursor');
            if (!reduceMotion) setTimeout(startRotation, mobileLocationHoldMs);
        }

        if (initialCity) {
            // Location pages always show location name first, then rotate.
            taglineElement.textContent = 'Time Mission ' + initialCity;
            taglineElement.classList.add('no-cursor');
        } else if (taglines[0]) {
            taglineElement.textContent = taglines[0];
        }
        if (reduceMotion) {
            taglineElement.classList.add('no-cursor');
        } else {
            setTimeout(startRotation, initialHoldMs);
        }

        document.addEventListener('tm:language-changed', function () {
            taglines = getTranslatedArray(translationKey, fallbackTaglines);
            currentTaglineIndex = 0;
            if (!initialCity && taglines[0]) taglineElement.textContent = taglines[0];
        });

        return { setEyebrowToLocation: setEyebrowToLocation };
    }

    // ==========================================
    // MINUTES COUNTER, fades through 60, 90, 120
    // ==========================================
    function initMinutesCycler() {
        var minutesEl = document.getElementById('minutesCounter');
        if (!minutesEl) return;
        var minuteValues = [60, 90, 120];
        var minuteIndex = 0;

        function cycleMinutes() {
            minutesEl.classList.add('fade-out');
            setTimeout(function () {
                minuteIndex = (minuteIndex + 1) % minuteValues.length;
                minutesEl.textContent = minuteValues[minuteIndex];
                minutesEl.classList.remove('fade-out');
            }, 400);
        }

        setInterval(cycleMinutes, 2500);
    }

    // ==========================================
    // POINTS COUNTER, score counts up with hit-point popups
    // ==========================================
    function initPointsCounter() {
        var pointsEl = document.getElementById('pointsCounter');
        var pointsWrap = document.getElementById('pointsWrap');
        if (!pointsEl) return;
        if (prefersReducedMotion()) {
            pointsEl.textContent = '1,200';
            return;
        }

        var currentScore = 0;
        var hitValues = [50, 100, 75, 150, 200, 100, 250, 50, 125, 100];
        var hitIndex = 0;

        function spawnHitPoint(value) {
            if (!pointsWrap) return;
            var el = document.createElement('span');
            el.className = 'hit-point';
            el.textContent = '+' + value;
            // Random horizontal position around the number
            var offsetX = (Math.random() - 0.5) * 80;
            el.style.left = 'calc(50% + ' + offsetX + 'px)';
            el.style.top = '-10px';
            pointsWrap.appendChild(el);
            el.addEventListener('animationend', function () { el.remove(); });
        }

        function addPoints() {
            var value = hitValues[hitIndex % hitValues.length];
            hitIndex++;
            currentScore += value;

            // Reset after reaching ~1200 so it loops
            if (currentScore > 1200) {
                currentScore = 0;
                pointsEl.textContent = '0';
                return;
            }

            // Animate the number counting up
            var startVal = currentScore - value;
            var endVal = currentScore;
            var duration = 400;
            var startTime = performance.now();

            function tick(now) {
                var elapsed = now - startTime;
                var progress = Math.min(elapsed / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                var current = Math.round(startVal + (endVal - startVal) * eased);
                pointsEl.textContent = current.toLocaleString();
                if (progress < 1) requestAnimationFrame(tick);
            }

            requestAnimationFrame(tick);

            // Bump animation on the number
            pointsEl.classList.remove('bump');
            void pointsEl.offsetWidth; // force reflow
            pointsEl.classList.add('bump');

            // Spawn floating hit point
            spawnHitPoint(value);
        }

        setInterval(addPoints, 1800);
    }

    // ==========================================
    // INFINITE EXPERIENCES CAROUSEL WITH DRAG SCROLL + 3D TILT
    // Returns nothing — wires DOM listeners on #experiencesScroll, prev/next,
    // and tilt on .experience-card. Inlines the click→missions.html handler
    // because it depends on closure-shared isHovering/wasDragged state.
    //
    // Ships the index-style smoothSlide (handles backward-from-zero by jumping
    // forward by halfW first) — strict superset of the city version, safer at
    // boundaries.
    // ==========================================
    function initExperiencesCarousel() {
        var scrollEl = document.getElementById('experiencesScroll');
        var prevBtn = document.getElementById('prevBtn');
        var nextBtn = document.getElementById('nextBtn');
        var reduceMotion = prefersReducedMotion();

        // closure-shared state used by both carousel and tilt-click
        var isHovering = false;
        var wasDragged = false;

        if (scrollEl) {
            var scrollPos = 0;
            var autoScrollSpeed = 0.8;
            var isDragging = false;
            var dragStartX = 0;
            var dragScrollStart = 0;
            var animationId = null;
            var isTouching = false;
            var touchStartX = 0;
            var touchScrollStart = 0;
            var touchVelocity = 0;
            var lastTouchX = 0;
            var lastTouchTime = 0;

            // Measure actual rendered width of original cards
            var originalCards = scrollEl.querySelectorAll('.experience-card:not([aria-hidden])');

            function getHalfWidth() {
                var total = 0;
                var gap = parseFloat(getComputedStyle(scrollEl).gap) || 24;
                originalCards.forEach(function (card) {
                    total += card.offsetWidth + gap;
                });
                return total;
            }

            function wrapPos(pos) {
                var halfW = getHalfWidth();
                if (halfW <= 0) return pos;
                while (pos >= halfW) pos -= halfW;
                while (pos < 0) pos += halfW;
                return pos;
            }

            function applyPos() {
                scrollEl.style.transform = 'translateX(' + (-scrollPos) + 'px)';
            }

            // Auto-scroll loop
            function autoScroll() {
                if (!isHovering && !isDragging && !isTouching) {
                    scrollPos += autoScrollSpeed;
                    scrollPos = wrapPos(scrollPos);
                    applyPos();
                }
                animationId = requestAnimationFrame(autoScroll);
            }

            if (!reduceMotion) {
                animationId = requestAnimationFrame(autoScroll);
            }

            // Hover: pause auto-scroll (desktop)
            scrollEl.addEventListener('mouseenter', function () { isHovering = true; });
            scrollEl.addEventListener('mouseleave', function () {
                isHovering = false;
                isDragging = false;
                scrollEl.classList.remove('dragging');
            });

            // Mouse drag to scroll (desktop)
            scrollEl.addEventListener('mousedown', function (e) {
                isDragging = true;
                wasDragged = false;
                dragStartX = e.clientX;
                dragScrollStart = scrollPos;
                scrollEl.classList.add('dragging');
                e.preventDefault();
            });

            window.addEventListener('mousemove', function (e) {
                if (!isDragging) return;
                var dx = e.clientX - dragStartX;
                if (Math.abs(dx) > 5) wasDragged = true;
                scrollPos = wrapPos(dragScrollStart - dx);
                applyPos();
            });

            window.addEventListener('mouseup', function () {
                if (isDragging) {
                    isDragging = false;
                    scrollEl.classList.remove('dragging');
                }
            });

            // Touch swipe (mobile)
            scrollEl.addEventListener('touchstart', function (e) {
                isTouching = true;
                touchStartX = e.touches[0].clientX;
                touchScrollStart = scrollPos;
                touchVelocity = 0;
                lastTouchX = touchStartX;
                lastTouchTime = Date.now();
            }, { passive: true });

            scrollEl.addEventListener('touchmove', function (e) {
                if (!isTouching) return;
                var x = e.touches[0].clientX;
                var dx = touchStartX - x;
                scrollPos = wrapPos(touchScrollStart + dx);
                applyPos();

                // Track velocity for momentum
                var now = Date.now();
                var dt = now - lastTouchTime;
                if (dt > 0) {
                    touchVelocity = (lastTouchX - x) / dt;
                }
                lastTouchX = x;
                lastTouchTime = now;
            }, { passive: true });

            scrollEl.addEventListener('touchend', function () {
                isTouching = false;
                // Momentum coast
                var velocity = touchVelocity * 15;
                function coast() {
                    if (Math.abs(velocity) < 0.3) return;
                    scrollPos = wrapPos(scrollPos + velocity);
                    applyPos();
                    velocity *= 0.95;
                    requestAnimationFrame(coast);
                }
                if (!reduceMotion) coast();
            }, { passive: true });

            // Wheel scroll on hover, disabled on desktop to avoid hijacking page scroll
            // Only enable on touch devices where horizontal swipe is natural
            if ('ontouchstart' in window) {
                scrollEl.addEventListener('wheel', function (e) {
                    e.preventDefault();
                    scrollPos = wrapPos(scrollPos + e.deltaY * 0.5);
                    applyPos();
                }, { passive: false });
            }

            // Prev/Next buttons, smooth slide with seamless wrap.
            // Strategy: always animate in the requested direction toward an UNWRAPPED
            // target (which may exceed [0, halfW)). Because we have a duplicate set
            // of cards, positions like halfW look identical to 0, so crossing the
            // boundary is visually seamless. Once the transition finishes, we quietly
            // normalize scrollPos back into [0, halfW) so future arithmetic stays clean.
            function smoothSlide(delta) {
                var gap = parseFloat(getComputedStyle(scrollEl).gap) || 24;
                var cw = (originalCards[0] ? originalCards[0].offsetWidth : 350) + gap;
                var halfW = getHalfWidth();

                // If going backward from near 0, first jump forward by halfW so we have
                // room to animate LEFT to 0 visually.
                if (delta < 0 && scrollPos - cw < 0) {
                    scrollEl.style.transition = 'none';
                    scrollPos += halfW;
                    applyPos();
                    void scrollEl.offsetWidth;
                }

                var target = scrollPos + delta * cw;

                if (reduceMotion) {
                    scrollEl.style.transition = 'none';
                    scrollPos = wrapPos(target);
                    applyPos();
                    void scrollEl.offsetWidth;
                    scrollEl.style.transition = '';
                    return;
                }

                scrollEl.style.transition = 'transform 0.4s ease';
                scrollPos = target;
                applyPos();

                scrollEl.addEventListener('transitionend', function handler() {
                    scrollEl.removeEventListener('transitionend', handler);
                    // Silently normalize into [0, halfW), no transition, no visible change
                    var wrapped = wrapPos(scrollPos);
                    if (wrapped !== scrollPos) {
                        scrollEl.style.transition = 'none';
                        scrollPos = wrapped;
                        applyPos();
                        void scrollEl.offsetWidth;
                    }
                    scrollEl.style.transition = '';
                }, { once: true });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', function () { smoothSlide(-1); });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', function () { smoothSlide(1); });
            }
        }

        // 3D Tilt Effect for Experience Cards
        var cards = document.querySelectorAll('.experience-card');

        cards.forEach(function (card) {
            if (reduceMotion) {
                card.style.transition = 'none';
            } else {
                card.addEventListener('mousemove', function (e) {
                    var rect = card.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;

                    var centerX = rect.width / 2;
                    var centerY = rect.height / 2;

                    var rotateX = (y - centerY) / centerY * -8;
                    var rotateY = (x - centerX) / centerX * 8;

                    card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-8px)';
                });

                card.addEventListener('mouseleave', function () {
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
                });
            }

            card.addEventListener('click', function () {
                if (isHovering && !wasDragged) {
                    window.location.href = 'missions.html';
                }
            });
        });
    }

    // ==========================================
    // MINI FAQ ACCORDION (index variant — sets aria-expanded for a11y)
    // ==========================================
    function initMiniFaq() {
        document.querySelectorAll('.mini-faq-q').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.parentElement;
                if (!item) return;
                var wasOpen = item.classList.contains('open');
                document.querySelectorAll('.mini-faq-item').forEach(function (i) {
                    i.classList.remove('open');
                    var q = i.querySelector('.mini-faq-q');
                    if (q) q.setAttribute('aria-expanded', 'false');
                });
                if (!wasOpen) {
                    item.classList.add('open');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    // ==========================================
    // TESTIMONIALS — CITY variant: scrollLeft auto-advance
    // ==========================================
    function initTestimonialsSimple() {
        var scroll = document.querySelector('.testimonials-scroll');
        if (!scroll) return;
        var cards = scroll.querySelectorAll('.testimonial-card');
        if (cards.length < 2) return;
        var reduceMotion = prefersReducedMotion();
        var current = 0;
        var timer;

        function goTo(i) {
            current = i % cards.length;
            scroll.scrollTo({ left: scroll.offsetWidth * current, behavior: 'smooth' });
        }

        function startAuto() {
            timer = setInterval(function () { goTo(current + 1); }, 4000);
        }

        // Pause on interaction, resume after
        scroll.addEventListener('touchstart', function () { clearInterval(timer); }, { passive: true });
        scroll.addEventListener('touchend', function () {
            // Sync current index to nearest card after swipe
            current = Math.round(scroll.scrollLeft / scroll.offsetWidth);
            if (!reduceMotion) startAuto();
        }, { passive: true });

        if (!reduceMotion) startAuto();
    }

    // ==========================================
    // TESTIMONIALS — INDEX variant: transform-based clone-and-teleport carousel
    // 5000ms auto, 8000ms resume after pause, 450ms ANIM_MS, 0.4 velocity threshold
    // ==========================================
    function initTestimonialsTransform() {
        var container = document.querySelector('.testimonials-scroll');
        var track = document.querySelector('.testimonials-track');
        if (!container || !track) return;
        var cards = track.querySelectorAll('.testimonial-card');
        var count = cards.length;
        if (count < 2) return;

        var current = 0;
        var autoTimer = null;
        var resumeTimer = null;
        var offset = count; // DOM offset after prepending clones
        var ANIM_MS = 450; // must match CSS transition duration
        var reduceMotion = prefersReducedMotion();

        // Clone cards: prepend last→first, append first→last
        var i, clone;
        for (i = 0; i < count; i++) {
            clone = cards[i].cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.appendChild(clone);
        }
        for (i = count - 1; i >= 0; i--) {
            clone = cards[i].cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.insertBefore(clone, track.firstChild);
        }

        function getWidth() {
            return Math.round(container.getBoundingClientRect().width || container.offsetWidth || 0);
        }

        function normalizeIndex(index) {
            return ((index % count) + count) % count;
        }

        function setTransform(domIndex, animate) {
            var width = getWidth();
            if (width <= 0) return false;
            if (!animate) {
                track.classList.add('no-transition');
            } else {
                track.classList.remove('no-transition');
            }
            track.style.transform = 'translateX(-' + (domIndex * width) + 'px)';
            if (!animate) void track.offsetHeight; // force reflow for instant jump
            return true;
        }

        // Animate to a logical index, then teleport if in clone zone
        function slideTo(index, animate) {
            current = index;
            if (!setTransform(offset + index, animate !== false)) {
                current = normalizeIndex(index);
                return;
            }

            // If we landed in clone zone, schedule teleport after animation
            if (animate !== false && (index >= count || index < 0)) {
                setTimeout(function () {
                    var real = index >= count ? index - count : index + count;
                    current = real;
                    setTransform(offset + real, false);
                }, ANIM_MS + 50);
            }
        }

        function jumpTo(index) {
            current = index;
            return setTransform(offset + index, false);
        }

        function advance() { slideTo(current + 1, true); }
        function retreat() { slideTo(current - 1, true); }

        // Auto-play
        function startAuto() {
            if (reduceMotion) return;
            stopAuto();
            autoTimer = setInterval(advance, 5000);
        }
        function stopAuto() {
            if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        }
        function pauseAndResume() {
            stopAuto();
            if (reduceMotion) return;
            if (resumeTimer) clearTimeout(resumeTimer);
            resumeTimer = setTimeout(startAuto, 8000);
        }

        // Swipe / drag support
        var startX = 0, startY = 0, dragging = false, dragDelta = 0;
        var dragStartTime = 0, isHorizontal = null;

        function onPointerDown(e) {
            var touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            dragging = true;
            dragDelta = 0;
            dragStartTime = Date.now();
            isHorizontal = null;
            track.classList.add('no-transition');
            container.classList.add('grabbing');
            pauseAndResume();
        }

        function onPointerMove(e) {
            if (!dragging) return;
            var touch = e.touches ? e.touches[0] : e;
            var dx = touch.clientX - startX;
            var dy = touch.clientY - startY;

            if (isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                isHorizontal = Math.abs(dx) > Math.abs(dy);
            }
            if (!isHorizontal) return;

            if (e.cancelable) e.preventDefault();
            dragDelta = dx;
            var w = getWidth();
            var basePx = (offset + current) * w;
            track.style.transform = 'translateX(' + (-(basePx - dragDelta)) + 'px)';
        }

        function onPointerUp() {
            if (!dragging) return;
            dragging = false;
            container.classList.remove('grabbing');
            if (!isHorizontal) return;

            var w = getWidth();
            var elapsed = Date.now() - dragStartTime;
            var velocity = Math.abs(dragDelta) / Math.max(elapsed, 1);

            if (Math.abs(dragDelta) > w * 0.25 || velocity > 0.4) {
                if (dragDelta > 0) { retreat(); } else { advance(); }
            } else {
                slideTo(current, true);
            }
            dragDelta = 0;
        }

        // Touch events
        container.addEventListener('touchstart', onPointerDown, { passive: true });
        container.addEventListener('touchmove', onPointerMove, { passive: false });
        container.addEventListener('touchend', onPointerUp);
        container.addEventListener('touchcancel', onPointerUp);

        // Mouse drag
        container.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        // Pause on wheel
        container.addEventListener('wheel', pauseAndResume, { passive: true });

        function syncLayout() { jumpTo(current); }

        // Recalculate after viewport changes and after browser cache restores.
        window.addEventListener('resize', syncLayout);
        window.addEventListener('pageshow', syncLayout);
        if ('ResizeObserver' in window) {
            var resizeObserver = new ResizeObserver(syncLayout);
            resizeObserver.observe(container);
        }

        // Init
        if (!jumpTo(0)) {
            requestAnimationFrame(syncLayout);
            window.setTimeout(syncLayout, 250);
            window.addEventListener('load', syncLayout, { once: true });
        }
        if (!reduceMotion) startAuto();
    }

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

        // Start after a short delay to let images load
        window.addEventListener('load', function () {
            halfWidth = getHalfWidth();
            tickerRaf = requestAnimationFrame(tickerLoop);
        });

        // Fallback: start immediately too
        requestAnimationFrame(initTicker);
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
                if (href === '#' || href === '#!') return;
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

    // ==========================================
    // GAME PROMO POPUP
    // Shows after 8 seconds, remembers dismissal. Currently disabled-but-wired:
    // the setTimeout(showGamePopup, 8000) line stays commented out so re-enabling
    // is a one-line change. Close/skip/overlay/Esc handlers always attach when
    // the DOM elements are present.
    // ==========================================
    function initGamePopup(enabled) {
        var gamePopup = document.getElementById('gamePopup');
        var gamePopupClose = document.getElementById('gamePopupClose');
        var gamePopupSkip = document.getElementById('gamePopupSkip');

        if (!gamePopup || !gamePopupClose || !gamePopupSkip) return;

        function showGamePopup() {
            if (sessionStorage.getItem('gamePopupDismissed')) return;
            gamePopup.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function hideGamePopup() {
            gamePopup.classList.remove('active');
            document.body.style.overflow = '';
            sessionStorage.setItem('gamePopupDismissed', 'true');
        }

        // Popup disabled for now, re-enable when ready:
        // if (enabled) setTimeout(showGamePopup, 8000);
        // (enabled flag preserved so re-enable is a one-line guard.)
        if (enabled) {
            // Intentionally left as a hook — re-enable showGamePopup here when launching.
            // setTimeout(showGamePopup, 8000);
        }

        gamePopupClose.addEventListener('click', hideGamePopup);
        gamePopupSkip.addEventListener('click', hideGamePopup);

        gamePopup.addEventListener('click', function (e) {
            if (e.target === gamePopup) {
                hideGamePopup();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && gamePopup.classList.contains('active')) {
                hideGamePopup();
            }
        });
    }

    // ==========================================
    // HERO VIDEO + REDUCED MOTION / DATA SAVER
    // Keep the poster as the first paint, then defer muted playback for users
    // who have not asked for reduced motion or data savings.
    // ==========================================
    function initHeroVideo() {
        var heroVideoEl = document.getElementById('heroVideo');
        if (!heroVideoEl) return;

        if (shouldLimitAutoplayMedia()) {
            heroVideoEl.removeAttribute('autoplay');
            heroVideoEl.removeAttribute('loop');
            heroVideoEl.preload = 'none';
            heroVideoEl.pause();
            return;
        }

        heroVideoEl.removeAttribute('autoplay');
        heroVideoEl.muted = true;
        heroVideoEl.loop = true;
        heroVideoEl.preload = 'none';

        runAfterFirstPaint(function () {
            heroVideoEl.querySelectorAll('source[data-src]').forEach(function (source) {
                if (!source.getAttribute('src')) source.setAttribute('src', source.getAttribute('data-src'));
                if (source.hasAttribute('data-media') && !source.hasAttribute('media')) {
                    source.setAttribute('media', source.getAttribute('data-media'));
                }
            });

            var attempted = false;
            function kickHeroPlayback() {
                if (attempted) return;
                attempted = true;
                heroVideoEl.play().catch(function () {});
            }

            heroVideoEl.preload = 'metadata';
            heroVideoEl.load();

            if (heroVideoEl.readyState >= 2) {
                kickHeroPlayback();
            } else {
                heroVideoEl.addEventListener('loadeddata', kickHeroPlayback, { once: true });
                heroVideoEl.addEventListener('canplay', kickHeroPlayback, { once: true });
            }
        });
    }

    // ==========================================================================
    // Public surface — TMPage facade
    // ==========================================================================

    function initCity(config) {
        if (!config || typeof config !== 'object') return;
        var city = config.city || '';
        var taglines = Array.isArray(config.taglines) ? config.taglines : [];
        var heroVideo = config.heroVideo !== false;
        var gamePopup = config.gamePopup === true;

        if (heroVideo) initHeroVideo();

        // initTagline returns { setEyebrowToLocation } so we can register the nav.js hook.
        var tagline = initTagline(taglines, {
            initialCity: city,           // "Time Mission Philadelphia" held 3500ms before rotation
            initialHoldMs: 3500,
            mobileLocationHoldMs: 5000,
            translationKey: 'home.taglines'
        });
        window.updateEyebrowLocation = function (newCity) {
            tagline.setEyebrowToLocation(newCity);
        };

        initMinutesCycler();
        initPointsCounter();
        initExperiencesCarousel();
        initMiniFaq();
        initTestimonialsSimple();    // CITY variant
        initPressTicker();
        initRevealOnScroll();
        initSmoothScroll();
        initGamePopup(gamePopup);
    }

    function initIndex(config) {
        if (!config || typeof config !== 'object') return;
        var taglines = Array.isArray(config.taglines) ? config.taglines : [];
        var heroVideo = config.heroVideo !== false;   // default true
        var gamePopup = config.gamePopup === true;

        if (heroVideo) initHeroVideo();

        // No initialCity — index does not show "Time Mission <City>" hold.
        // initIndex registers a no-op so nav.js never branches per page.
        initTagline(taglines, {
            initialCity: null,
            initialHoldMs: 3000,
            mobileLocationHoldMs: 5000,
            translationKey: 'home.taglines'
        });
        window.updateEyebrowLocation = function () {};

        initMinutesCycler();
        initPointsCounter();
        initExperiencesCarousel();
        initMiniFaq();
        initTestimonialsTransform();   // INDEX variant — heavyweight transform carousel
        initPressTicker();
        initRevealOnScroll();
        initSmoothScroll();
        initGamePopup(gamePopup);
    }

    window.TMPage = { initCity: initCity, initIndex: initIndex };

    // ==========================================================================
    // Auto-init from inline config — handles the defer/inline ordering case.
    //
    // Pattern: each Astro page sets a synchronous `window.__TM_PAGE_INIT__`
    // before the deferred `page-widgets.js` script tag is parsed. Because
    // synchronous inline scripts always execute in document order before any
    // deferred external script, the config is guaranteed to be set by the
    // time this IIFE runs.
    //
    // Schema:
    //   window.__TM_PAGE_INIT__ = { mode: 'city' | 'index', config: {...} };
    //
    // The TMPage.initCity / TMPage.initIndex methods remain available for any
    // non-deferred caller (e.g., future programmatic re-init, tests).
    // ==========================================================================
    var pageInit = window.__TM_PAGE_INIT__;
    if (pageInit && typeof pageInit === 'object') {
        if (pageInit.mode === 'city') {
            initCity(pageInit.config);
        } else if (pageInit.mode === 'index') {
            initIndex(pageInit.config);
        }
    }
})();
