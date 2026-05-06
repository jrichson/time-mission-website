
        // ==========================================
        // HERO VIDEO + REDUCED MOTION
        // If the user prefers reduced motion, skip autoplay looping video; poster / container
        // background still show a static hero (WCAG-aligned). Otherwise always try playback
        // (no save-data / effectiveType gating — marketing wants the hero video broadly).
        // ==========================================
        const heroVideoEl = document.getElementById('heroVideo');
        if (heroVideoEl) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (prefersReducedMotion) {
                heroVideoEl.removeAttribute('autoplay');
                heroVideoEl.removeAttribute('loop');
                heroVideoEl.preload = 'none';
                heroVideoEl.pause();
            } else {
                heroVideoEl.muted = true;
                let attempted = false;
                function kickHeroPlayback() {
                    if (attempted) return;
                    attempted = true;
                    heroVideoEl.play().catch(function () {});
                }
                if (heroVideoEl.readyState >= 2) {
                    kickHeroPlayback();
                } else {
                    heroVideoEl.addEventListener('loadeddata', kickHeroPlayback, { once: true });
                    heroVideoEl.addEventListener('canplay', kickHeroPlayback, { once: true });
                }
            }
        }

        // ==========================================
        // ROTATING TYPEWRITER TAGLINES
        // Changes every 4 seconds with delete/retype effect
        // ==========================================
        const taglines = [
            "Social Gaming Adventure",
            "Better Than Your Ex's Personality",
            "Date Night, Leveled Up",
            "Family Game Night on Steroids",
            "Where Couch Potatoes Become Heroes",
            "Touch Grass... Indoors",
            "Corporate Team Building, But Fun",
            "Cheaper Than Therapy",
            "Your New Favorite Addiction",
            "Making Memories (& Enemies)",
            "Swipe Right on Adventure"
        ];

        const taglineElement = document.getElementById('taglineText');
        window.updateEyebrowLocation = function() {};

        if (taglineElement) {
            let currentTaglineIndex = 0;
            let isTyping = false;

            async function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }

            async function deleteText() {
                const currentText = taglineElement.textContent;
                for (let i = currentText.length; i >= 0; i--) {
                    taglineElement.textContent = currentText.substring(0, i);
                    await sleep(30); // Delete speed
                }
            }

            async function typeText(text) {
                for (let i = 0; i <= text.length; i++) {
                    taglineElement.textContent = text.substring(0, i);
                    await sleep(50); // Type speed
                }
            }

            async function rotateTagline() {
                if (isTyping) return;
                isTyping = true;

                await deleteText();
                await sleep(200); // Pause between delete and type

                currentTaglineIndex = (currentTaglineIndex + 1) % taglines.length;
                await typeText(taglines[currentTaglineIndex]);

                isTyping = false;
            }

            let taglineIntervalId = null;
            const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

            function startRotation() {
                taglineElement.classList.remove('no-cursor');
                taglineIntervalId = setInterval(rotateTagline, 4000);
            }

            function setEyebrowToLocation(city) {
                if (!isMobile() || !city) return;
                if (taglineIntervalId) clearInterval(taglineIntervalId);
                isTyping = false;
                taglineElement.textContent = 'Time Mission ' + city;
                taglineElement.classList.add('no-cursor');
                setTimeout(startRotation, 5000);
            }

            window.updateEyebrowLocation = function(city) {
                setEyebrowToLocation(city);
            };

            setTimeout(startRotation, 3000);
        }

        // ==========================================
        // MINUTES COUNTER, fades through 60, 90, 120
        // ==========================================
        const minutesEl = document.getElementById('minutesCounter');
        const minuteValues = [60, 90, 120];
        let minuteIndex = 0;

        function cycleMinutes() {
            if (!minutesEl) return;
            minutesEl.classList.add('fade-out');
            setTimeout(() => {
                minuteIndex = (minuteIndex + 1) % minuteValues.length;
                minutesEl.textContent = minuteValues[minuteIndex];
                minutesEl.classList.remove('fade-out');
            }, 400);
        }

        setInterval(cycleMinutes, 2500);

        // ==========================================
        // POINTS COUNTER, score counts up with hit-point popups
        // ==========================================
        const pointsEl = document.getElementById('pointsCounter');
        const pointsWrap = document.getElementById('pointsWrap');
        let currentScore = 0;
        const hitValues = [50, 100, 75, 150, 200, 100, 250, 50, 125, 100];
        let hitIndex = 0;

        function spawnHitPoint(value) {
            if (!pointsWrap) return;
            const el = document.createElement('span');
            el.className = 'hit-point';
            el.textContent = '+' + value;
            // Random horizontal position around the number
            const offsetX = (Math.random() - 0.5) * 80;
            el.style.left = 'calc(50% + ' + offsetX + 'px)';
            el.style.top = '-10px';
            pointsWrap.appendChild(el);
            el.addEventListener('animationend', () => el.remove());
        }

        function addPoints() {
            if (!pointsEl) return;
            const value = hitValues[hitIndex % hitValues.length];
            hitIndex++;
            currentScore += value;

            // Reset after reaching ~1200 so it loops
            if (currentScore > 1200) {
                currentScore = 0;
                pointsEl.textContent = '0';
                return;
            }

            // Animate the number counting up
            const startVal = currentScore - value;
            const endVal = currentScore;
            const duration = 400;
            const startTime = performance.now();

            function tick(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                const current = Math.round(startVal + (endVal - startVal) * eased);
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

        // Mobile menu, location picker, and scroll effect are handled by js/nav.js

        // ==========================================
        // INFINITE CAROUSEL WITH DRAG SCROLL
        // ==========================================
        const scrollEl = document.getElementById('experiencesScroll');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (scrollEl) {
            let scrollPos = 0;
            let autoScrollSpeed = 0.8;
            let isHovering = false;
            let isDragging = false;
            let dragStartX = 0;
            let dragScrollStart = 0;
            let animationId = null;
            let isTouching = false;
            let touchStartX = 0;
            let touchScrollStart = 0;
            let touchVelocity = 0;
            let lastTouchX = 0;
            let lastTouchTime = 0;

            // Measure actual rendered width of original cards
            const originalCards = scrollEl.querySelectorAll('.experience-card:not([aria-hidden])');

            function getHalfWidth() {
                let total = 0;
                const gap = parseFloat(getComputedStyle(scrollEl).gap) || 24;
                originalCards.forEach(card => {
                    total += card.offsetWidth + gap;
                });
                return total;
            }

            function wrapPos(pos) {
                const halfW = getHalfWidth();
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

            animationId = requestAnimationFrame(autoScroll);

            // Hover: pause auto-scroll (desktop)
            scrollEl.addEventListener('mouseenter', () => { isHovering = true; });
            scrollEl.addEventListener('mouseleave', () => {
                isHovering = false;
                isDragging = false;
                scrollEl.classList.remove('dragging');
            });

            // Mouse drag to scroll (desktop)
            let wasDragged = false;
            scrollEl.addEventListener('mousedown', (e) => {
                isDragging = true;
                wasDragged = false;
                dragStartX = e.clientX;
                dragScrollStart = scrollPos;
                scrollEl.classList.add('dragging');
                e.preventDefault();
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - dragStartX;
                if (Math.abs(dx) > 5) wasDragged = true;
                scrollPos = wrapPos(dragScrollStart - dx);
                applyPos();
            });

            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    scrollEl.classList.remove('dragging');
                }
            });

            // Touch swipe (mobile)
            scrollEl.addEventListener('touchstart', (e) => {
                isTouching = true;
                touchStartX = e.touches[0].clientX;
                touchScrollStart = scrollPos;
                touchVelocity = 0;
                lastTouchX = touchStartX;
                lastTouchTime = Date.now();
            }, { passive: true });

            scrollEl.addEventListener('touchmove', (e) => {
                if (!isTouching) return;
                const x = e.touches[0].clientX;
                const dx = touchStartX - x;
                scrollPos = wrapPos(touchScrollStart + dx);
                applyPos();

                // Track velocity for momentum
                const now = Date.now();
                const dt = now - lastTouchTime;
                if (dt > 0) {
                    touchVelocity = (lastTouchX - x) / dt;
                }
                lastTouchX = x;
                lastTouchTime = now;
            }, { passive: true });

            scrollEl.addEventListener('touchend', () => {
                isTouching = false;
                // Momentum coast
                let velocity = touchVelocity * 15;
                function coast() {
                    if (Math.abs(velocity) < 0.3) return;
                    scrollPos = wrapPos(scrollPos + velocity);
                    applyPos();
                    velocity *= 0.95;
                    requestAnimationFrame(coast);
                }
                coast();
            }, { passive: true });

            // Wheel scroll on hover, disabled on desktop to avoid hijacking page scroll
            // Only enable on touch devices where horizontal swipe is natural
            if ('ontouchstart' in window) {
                scrollEl.addEventListener('wheel', (e) => {
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
                const gap = parseFloat(getComputedStyle(scrollEl).gap) || 24;
                const cw = (originalCards[0] ? originalCards[0].offsetWidth : 350) + gap;
                const halfW = getHalfWidth();

                // If going backward from near 0, first jump forward by halfW so we have
                // room to animate LEFT to 0 visually.
                if (delta < 0 && scrollPos - cw < 0) {
                    scrollEl.style.transition = 'none';
                    scrollPos += halfW;
                    applyPos();
                    void scrollEl.offsetWidth;
                }

                const target = scrollPos + delta * cw;

                scrollEl.style.transition = 'transform 0.4s ease';
                scrollPos = target;
                applyPos();

                scrollEl.addEventListener('transitionend', function handler() {
                    scrollEl.removeEventListener('transitionend', handler);
                    // Silently normalize into [0, halfW), no transition, no visible change
                    const wrapped = wrapPos(scrollPos);
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
                prevBtn.addEventListener('click', () => smoothSlide(-1));
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => smoothSlide(1));
            }
        }

        // 3D Tilt Effect for Experience Cards
        const cards = document.querySelectorAll('.experience-card');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = (y - centerY) / centerY * -8;
                const rotateY = (x - centerX) / centerX * 8;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });

            card.addEventListener('click', () => {
                if (isHovering && !wasDragged) {
                    window.location.href = 'missions.html';
                }
            });
        });

        // Respect reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            cards.forEach(card => {
                card.style.transition = 'none';
                card.addEventListener('mousemove', () => {});
            });
        }

        // ==========================================
        // MINI FAQ ACCORDION
        // ==========================================
        document.querySelectorAll('.mini-faq-q').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.parentElement;
                if (!item) return;
                const wasOpen = item.classList.contains('open');
                document.querySelectorAll('.mini-faq-item').forEach(i => {
                    i.classList.remove('open');
                    const q = i.querySelector('.mini-faq-q');
                    if (q) q.setAttribute('aria-expanded', 'false');
                });
                if (!wasOpen) {
                    item.classList.add('open');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });

        // ==========================================

        // TESTIMONIALS, handled by carousel script at bottom of page

        // ==========================================
        // PRESS TICKER, JS-driven seamless loop
        // ==========================================
        (function() {
            const logosContainer = document.getElementById('pressLogos');
            if (!logosContainer) return;

            const logos = logosContainer.querySelectorAll('.press-logo');
            const halfCount = logos.length / 2;
            let tickerPos = 0;
            let tickerSpeed = 0.6;
            let tickerPaused = false;
            let tickerRaf;

            function getHalfWidth() {
                let w = 0;
                const gap = 64; // 4rem = 64px
                for (let i = 0; i < halfCount; i++) {
                    w += logos[i].getBoundingClientRect().width + gap;
                }
                return w;
            }

            let halfWidth = 0;

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
                    logosContainer.style.transform = `translateX(${-tickerPos}px)`;
                }
                tickerRaf = requestAnimationFrame(tickerLoop);
            }

            logosContainer.addEventListener('mouseenter', () => { tickerPaused = true; });
            logosContainer.addEventListener('mouseleave', () => { tickerPaused = false; });

            // Start after a short delay to let images load
            window.addEventListener('load', () => {
                halfWidth = getHalfWidth();
                tickerRaf = requestAnimationFrame(tickerLoop);
            });

            // Fallback: start immediately too
            requestAnimationFrame(initTicker);
        })();

        // Reveal on scroll
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Trigger counter wheel animation
                    if (entry.target.classList.contains('stat-card')) {
                        setTimeout(() => {
                            entry.target.classList.add('animated');
                        }, 200);
                    }
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => {
            observer.observe(el);
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href') || '';
                if (href === '#' || href === '#!') return;
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

                // ==========================================
        // GAME PROMO POPUP
        // Shows after 8 seconds, remembers dismissal
        // ==========================================
        const gamePopup = document.getElementById('gamePopup');
        const gamePopupClose = document.getElementById('gamePopupClose');
        const gamePopupSkip = document.getElementById('gamePopupSkip');

        if (gamePopup && gamePopupClose && gamePopupSkip) {
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
            // setTimeout(showGamePopup, 8000);

            gamePopupClose.addEventListener('click', hideGamePopup);
            gamePopupSkip.addEventListener('click', hideGamePopup);

            gamePopup.addEventListener('click', (e) => {
                if (e.target === gamePopup) {
                    hideGamePopup();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && gamePopup.classList.contains('active')) {
                    hideGamePopup();
                }
            });
        }
    // Testimonial carousel, transform-based infinite loop with swipe support
    (function () {
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

        function getWidth() { return container.offsetWidth; }

        function setTransform(domIndex, animate) {
            if (!animate) {
                track.classList.add('no-transition');
            } else {
                track.classList.remove('no-transition');
            }
            track.style.transform = 'translateX(-' + (domIndex * getWidth()) + 'px)';
            if (!animate) void track.offsetHeight; // force reflow for instant jump
        }

        // Animate to a logical index, then teleport if in clone zone
        function slideTo(index, animate) {
            current = index;
            setTransform(offset + index, animate !== false);

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
            setTransform(offset + index, false);
        }

        function advance() { slideTo(current + 1, true); }
        function retreat() { slideTo(current - 1, true); }

        // Auto-play
        function startAuto() {
            stopAuto();
            autoTimer = setInterval(advance, 5000);
        }
        function stopAuto() {
            if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        }
        function pauseAndResume() {
            stopAuto();
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

        // Recalculate on resize
        window.addEventListener('resize', function () { jumpTo(current); });

        // Init
        jumpTo(0);
        startAuto();
    })();
    