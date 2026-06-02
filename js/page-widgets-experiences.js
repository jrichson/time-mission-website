(function () {
    'use strict';

    var widgets = window.TMPageWidgets = window.TMPageWidgets || {};
    var prefersReducedMotion = widgets.prefersReducedMotion;
    var runWhenVisible = widgets.runWhenVisible;

    // ==========================================
    // INFINITE EXPERIENCES CAROUSEL WITH DRAG SCROLL + 3D TILT
    // Returns nothing — wires DOM listeners on #experiencesScroll, prev/next,
    // and tilt on .experience-card. Inlines the click-to-missions handler
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

            function startAutoScroll() {
                if (animationId || reduceMotion) return;
                animationId = requestAnimationFrame(autoScroll);
            }

            function stopAutoScroll() {
                if (!animationId) return;
                cancelAnimationFrame(animationId);
                animationId = null;
            }

            if (!reduceMotion) {
                runWhenVisible(scrollEl, startAutoScroll, stopAutoScroll, '250px 0px');
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
                var tiltFrame = null;
                var tiltEvent = null;

                function applyTilt() {
                    tiltFrame = null;
                    if (!tiltEvent) return;
                    var rect = card.getBoundingClientRect();
                    var x = tiltEvent.clientX - rect.left;
                    var y = tiltEvent.clientY - rect.top;

                    var centerX = rect.width / 2;
                    var centerY = rect.height / 2;

                    var rotateX = (y - centerY) / centerY * -8;
                    var rotateY = (x - centerX) / centerX * 8;

                    card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-8px)';
                }

                card.addEventListener('mousemove', function (e) {
                    tiltEvent = e;
                    if (!tiltFrame) tiltFrame = requestAnimationFrame(applyTilt);
                });

                card.addEventListener('mouseleave', function () {
                    if (tiltFrame) {
                        cancelAnimationFrame(tiltFrame);
                        tiltFrame = null;
                    }
                    tiltEvent = null;
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
                });
            }

            card.addEventListener('click', function () {
                if (isHovering && !wasDragged) {
                    window.location.href = '/missions';
                }
            });
        });
    }

    widgets.initExperiencesCarousel = initExperiencesCarousel;
})();
