(function () {
    'use strict';

    var widgets = window.TMPageWidgets = window.TMPageWidgets || {};
    var prefersReducedMotion = widgets.prefersReducedMotion;
    var runWhenVisible = widgets.runWhenVisible;

    // ==========================================
    // MINI FAQ ACCORDION (index variant — sets aria-expanded for a11y)
    // ==========================================
    function initMiniFaq() {
        function setMiniFaqState(item, isOpen) {
            var q = item.querySelector('.mini-faq-q');
            var panel = item.querySelector('.mini-faq-a');
            item.classList.toggle('open', isOpen);
            if (q) q.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (panel) panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }

        document.querySelectorAll('.mini-faq-q').forEach(function (btn, index) {
            var item = btn.closest ? btn.closest('.mini-faq-item') : btn.parentElement;
            var panel = item ? item.querySelector('.mini-faq-a') : null;
            if (!item || !panel) return;

            if (!btn.id) btn.id = 'mini-faq-trigger-' + (index + 1);
            if (!panel.id) panel.id = 'mini-faq-panel-' + (index + 1);

            btn.setAttribute('type', 'button');
            btn.setAttribute('aria-controls', panel.id);
            panel.setAttribute('role', 'region');
            panel.setAttribute('aria-labelledby', btn.id);
            setMiniFaqState(item, item.classList.contains('open'));

            btn.querySelectorAll('svg').forEach(function (icon) {
                icon.setAttribute('aria-hidden', 'true');
                icon.setAttribute('focusable', 'false');
            });

            btn.addEventListener('click', function () {
                var wasOpen = item.classList.contains('open');
                document.querySelectorAll('.mini-faq-item').forEach(function (i) {
                    setMiniFaqState(i, false);
                });
                if (!wasOpen) {
                    setMiniFaqState(item, true);
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
            if (timer) clearInterval(timer);
            timer = setInterval(function () { goTo(current + 1); }, 4000);
        }

        function stopAuto() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        // Pause on interaction, resume after
        scroll.addEventListener('touchstart', stopAuto, { passive: true });
        scroll.addEventListener('touchend', function () {
            // Sync current index to nearest card after swipe
            current = Math.round(scroll.scrollLeft / scroll.offsetWidth);
            if (!reduceMotion) startAuto();
        }, { passive: true });

        if (!reduceMotion) runWhenVisible(scroll, startAuto, stopAuto, '200px 0px');
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
        if (!reduceMotion) runWhenVisible(container, startAuto, stopAuto, '200px 0px');
    }

    widgets.initMiniFaq = initMiniFaq;
    widgets.initTestimonialsSimple = initTestimonialsSimple;
    widgets.initTestimonialsTransform = initTestimonialsTransform;
})();
