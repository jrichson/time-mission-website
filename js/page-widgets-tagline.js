(function () {
    'use strict';

    var widgets = window.TMPageWidgets = window.TMPageWidgets || {};
    var prefersReducedMotion = widgets.prefersReducedMotion;

    // ==========================================================================
    // Shared widget primitives — shared through TMPageWidgets namespace
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
        if (key && window.TMI18n && typeof window.TMI18n.array === 'function') {
            return window.TMI18n.array(key, fallback);
        }
        if (key && window.TMI18n && typeof window.TMI18n.t === 'function') {
            var translated = window.TMI18n.t(key);
            if (Array.isArray(translated) && translated.length) return translated;
        }
        return Array.isArray(fallback) ? fallback : [];
    }

    function localizedLocationName(value) {
        var fallback = String(value || '');
        var key = fallback.toLowerCase().trim().replace(/\s+/g, '-');
        if (key && window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text('location.name.' + key, fallback);
        }
        return fallback;
    }

    function initTagline(taglines, opts) {
        var taglineElement = document.getElementById('taglineText');
        var noop = { setEyebrowToLocation: function () {} };
        if (!taglineElement) return noop;
        if (!Array.isArray(taglines) || taglines.length === 0) return noop;

        var initialCityFallback = opts && opts.initialCity ? opts.initialCity : null;
        var initialCity = initialCityFallback ? localizedLocationName(initialCityFallback) : null;
        var initialHoldMs = opts && typeof opts.initialHoldMs === 'number' ? opts.initialHoldMs : 3000;
        var mobileLocationHoldMs = opts && typeof opts.mobileLocationHoldMs === 'number' ? opts.mobileLocationHoldMs : 5000;
        var translationKey = opts && opts.translationKey ? opts.translationKey : '';
        var fallbackTaglines = taglines.slice();
        taglines = getTranslatedArray(translationKey, fallbackTaglines);

        var currentTaglineIndex = 0;
        var isTyping = false;
        var taglineIntervalId = null;
        var taglineStartTimerId = null;
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
            taglineStartTimerId = null;
            taglineElement.classList.remove('no-cursor');
            taglineIntervalId = setInterval(rotateTagline, 4000);
        }

        function holdBeforeRotation(delay) {
            if (reduceMotion) return;
            if (taglineStartTimerId) clearTimeout(taglineStartTimerId);
            taglineStartTimerId = setTimeout(startRotation, delay);
        }

        // On mobile with location: show "Time Mission {City}" for 5s, then rotate.
        function setEyebrowToLocation(city) {
            if (!isMobile() || !city) return;
            city = localizedLocationName(city);
            if (taglineStartTimerId) {
                clearTimeout(taglineStartTimerId);
                taglineStartTimerId = null;
            }
            if (taglineIntervalId) {
                clearInterval(taglineIntervalId);
                taglineIntervalId = null;
            }
            isTyping = false;
            taglineElement.textContent = 'Time Mission ' + city;
            taglineElement.classList.add('no-cursor');
            holdBeforeRotation(mobileLocationHoldMs);
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
            holdBeforeRotation(initialHoldMs);
        }

        document.addEventListener('tm:language-changed', function () {
            taglines = getTranslatedArray(translationKey, fallbackTaglines);
            currentTaglineIndex = 0;
            initialCity = initialCityFallback ? localizedLocationName(initialCityFallback) : null;
            if (initialCity) taglineElement.textContent = 'Time Mission ' + initialCity;
            else if (taglines[0]) taglineElement.textContent = taglines[0];
        });

        return { setEyebrowToLocation: setEyebrowToLocation };
    }

    widgets.initTagline = initTagline;
})();
