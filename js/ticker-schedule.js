(function () {
    'use strict';

    var TICKER_CYCLES = 8;
    var refreshTimer = null;

    function parsedTime(value) {
        var timestamp = Date.parse(String(value || ''));
        return Number.isFinite(timestamp) ? timestamp : null;
    }

    function plainTickerCanBeStatic(text) {
        var value = String(text || '').trim();
        if (!value || value.length > 28 || value.indexOf('|') !== -1) return false;
        return !/\bGRAND OPENING\b/i.test(value);
    }

    function localizedText(key, fallback) {
        if (key && window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        return fallback;
    }

    function appendTickerItem(track, text, textI18n) {
        var item = document.createElement('span');
        item.className = 'ticker-item';
        if (textI18n) {
            var translated = document.createElement('span');
            translated.setAttribute('data-i18n', textI18n);
            translated.textContent = localizedText(textI18n, text);
            item.appendChild(translated);
        } else {
            item.textContent = text;
        }
        track.appendChild(item);
    }

    function restoreFallback(track) {
        var fallback = String(track.dataset.tmTickerFallback || '').trim();
        var fallbackI18n = String(track.dataset.tmTickerFallbackI18n || '').trim();
        var fallbackBehavior = track.dataset.tmTickerFallbackBehavior === 'animated' ? 'animated' : 'auto';
        var bar = track.closest('.ticker-bar');
        var nav = document.getElementById('nav');

        if (!fallback) {
            if (bar) bar.remove();
            if (nav) nav.classList.add('nav--no-ticker');
            return;
        }

        var isStatic = fallbackBehavior === 'auto' && plainTickerCanBeStatic(fallback);
        var cycles = isStatic ? 1 : TICKER_CYCLES;
        track.textContent = '';
        for (var index = 0; index < cycles; index += 1) {
            appendTickerItem(track, fallback, fallbackI18n);
        }
        track.classList.toggle('ticker-track--static', isStatic);
        track.dataset.tmTickerSource = track.dataset.tmTickerFallbackSource === 'default' ? 'default' : 'location';
        track.dataset.tmTickerBehavior = fallbackBehavior;
        delete track.dataset.tmTickerStartsAt;
        delete track.dataset.tmTickerEndsAt;
        delete track.dataset.tmTickerFallback;
        delete track.dataset.tmTickerFallbackI18n;
        delete track.dataset.tmTickerFallbackBehavior;
        delete track.dataset.tmTickerFallbackSource;
        if (nav) nav.classList.remove('nav--no-ticker');
    }

    function refresh(now) {
        var currentTime = now instanceof Date ? now.getTime() : Date.now();
        var nextEndTime = null;
        document.querySelectorAll('.ticker-track[data-tm-ticker-source="cms"]').forEach(function (track) {
            var startsAt = parsedTime(track.dataset.tmTickerStartsAt);
            var endsAt = parsedTime(track.dataset.tmTickerEndsAt);
            var isBeforeStart = startsAt != null && currentTime < startsAt;
            var isAtOrAfterEnd = endsAt != null && currentTime >= endsAt;
            if (isBeforeStart || isAtOrAfterEnd) restoreFallback(track);
            else if (endsAt != null && (nextEndTime == null || endsAt < nextEndTime)) nextEndTime = endsAt;
        });
        if (!(now instanceof Date) && nextEndTime != null) {
            if (refreshTimer != null) window.clearTimeout(refreshTimer);
            var delay = Math.min(2147483647, Math.max(0, nextEndTime - currentTime + 50));
            refreshTimer = window.setTimeout(function () { refresh(); }, delay);
        }
    }

    window.TMTickerSchedule = { refresh: refresh };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { refresh(); }, { once: true });
    } else {
        refresh();
    }
})();
