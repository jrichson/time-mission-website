(function () {
    'use strict';

    var widgets = window.TMPageWidgets = window.TMPageWidgets || {};
    var prefersReducedMotion = widgets.prefersReducedMotion;
    var runWhenVisible = widgets.runWhenVisible;

    // ==========================================
    // MINUTES COUNTER, fades through 60, 90, 120
    // ==========================================
    function initMinutesCycler() {
        var minutesEl = document.getElementById('minutesCounter');
        if (!minutesEl) return;
        var minuteValues = [60, 90, 120];
        var minuteIndex = 0;
        var timer = null;

        function cycleMinutes() {
            minutesEl.classList.add('fade-out');
            setTimeout(function () {
                minuteIndex = (minuteIndex + 1) % minuteValues.length;
                minutesEl.textContent = minuteValues[minuteIndex];
                minutesEl.classList.remove('fade-out');
            }, 400);
        }

        function startCycler() {
            if (timer) return;
            timer = setInterval(cycleMinutes, 2500);
        }

        runWhenVisible(minutesEl, startCycler, null, '120px 0px');
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
        var timer = null;

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

        function startCounter() {
            if (timer) return;
            timer = setInterval(addPoints, 1800);
        }

        runWhenVisible(pointsEl, startCounter, null, '120px 0px');
    }

    widgets.initMinutesCycler = initMinutesCycler;
    widgets.initPointsCounter = initPointsCounter;
})();
