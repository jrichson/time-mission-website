(function () {
    var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        revealItems.forEach(function (el) { revealObserver.observe(el); });
    } else {
        revealItems.forEach(function (el) { el.classList.add('visible'); });
    }

    document.querySelectorAll('.faq-item .faq-question').forEach(function (question) {
        question.addEventListener('click', function () {
            var item = question.closest('.faq-item');
            if (!item) return;

            var isActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(function (faq) {
                faq.classList.remove('active');
                var button = faq.querySelector('.faq-question');
                if (button) button.setAttribute('aria-expanded', 'false');
            });

            if (!isActive) {
                item.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });

    var buttons = Array.prototype.slice.call(document.querySelectorAll('.btn-gift-card, [data-gift="1"]'));
    var hint = document.getElementById('giftCardLocationHint');
    var redemptionAnswer = document.querySelector('[data-gift-card-location-answer]');
    var opsGiftCardLocationIds = {
        'manassas': true,
        'mount-prospect': true,
        'orland-park': true
    };
    if (!buttons.length) return;

    function translate(key, fallback, replacements) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback, replacements);
        }
        var value = fallback;
        Object.keys(replacements || {}).forEach(function (token) {
            value = String(value || '').replace(new RegExp('\\{' + token + '\\}', 'g'), replacements[token]);
        });
        return value;
    }

    function setButtons(href, disabled) {
        buttons.forEach(function (button) {
            button.setAttribute('href', href || '#');
            if (disabled) {
                button.setAttribute('aria-disabled', 'true');
                button.classList.add('is-disabled');
                return;
            }
            button.removeAttribute('aria-disabled');
            button.classList.remove('is-disabled');
        });
    }

    function selectedLocation() {
        var tm = window.TM || null;
        var loc = (tm && tm.current) || null;
        if (loc) return loc;

        var slug = tm && typeof tm.getSavedSlug === 'function' ? tm.getSavedSlug() : '';
        if (slug && tm && typeof tm.get === 'function') {
            return tm.get(slug);
        }
        return null;
    }

    function locationSlug(loc) {
        return String((loc && (loc.slug || loc.id)) || '').toLowerCase();
    }

    function localizedLocationName(loc) {
        var fallback = (loc && (loc.shortName || loc.name)) || '';
        var slug = locationSlug(loc);
        return slug ? translate('location.name.' + slug, fallback) : fallback;
    }

    function updateRedemptionAnswer(loc) {
        if (!redemptionAnswer) return;

        if (!loc) {
            redemptionAnswer.textContent = translate(
                'gift.locationSpecific',
                'Gift cards are location-specific. Select your location before purchasing so we can show the correct gift-card checkout and redemption details.'
            );
            return;
        }

        var slug = locationSlug(loc);
        var locationName = localizedLocationName(loc) || translate('location.selectedLocation', 'this location');
        if (loc.status === 'temporarily-closed') {
            redemptionAnswer.textContent = translate(
                'gift.pausedRedemption',
                'Gift cards are temporarily paused for {location} while ticket sales are paused.',
                { location: locationName }
            );
            return;
        }

        if (opsGiftCardLocationIds[slug]) {
            redemptionAnswer.textContent = translate(
                'gift.opsStates',
                'Gift cards purchased from this location are valid for Time Missions located in these states: AL, GA, FL, IL, IN, KS, MD, MN, MO, NC, TN, VA & WI.'
            );
            return;
        }

        if (loc.giftCardUrl) {
            redemptionAnswer.textContent = translate(
                'gift.locationRedemption',
                'Gift cards purchased through {location}\'s checkout are intended for that location. Contact {location} before purchasing if you need to use a gift card at another Time Mission location.',
                { location: locationName }
            );
            return;
        }

        redemptionAnswer.textContent = translate(
            'gift.unavailableRedemption',
            'Gift cards are not available for {location} yet, so they cannot currently be purchased or redeemed from this page for that location.',
            { location: locationName }
        );
    }

    function applySelectedLocation() {
        var loc = selectedLocation();
        if (!loc) {
            updateRedemptionAnswer(null);
            return false;
        }

        var url = loc.giftCardUrl || '';
        var locationName = localizedLocationName(loc);
        updateRedemptionAnswer(loc);
        if (!url) {
            if (hint) {
                hint.textContent = loc.status === 'temporarily-closed'
                    ? translate('gift.pausedHint', 'Gift cards are temporarily paused for {location}.', { location: locationName })
                    : translate('gift.unavailableHint', 'Gift cards are not available for {location} yet.', { location: locationName });
            }
            setButtons('#', true);
            return true;
        }

        setButtons(url, false);
        if (/^mailto:/i.test(url)) {
            if (hint) hint.textContent = translate(
                'gift.emailHint',
                'Email {location} directly for a gift card.',
                { location: locationName }
            );
        } else if (hint) {
            hint.textContent = translate(
                'gift.purchasingHint',
                'Purchasing for {location}. Change location in the top nav if needed.',
                { location: locationName }
            );
        }
        return true;
    }

    function openLocationOverlay() {
        var overlay = document.getElementById('locationDropdown');
        var navEl = document.getElementById('nav');
        if (!overlay) return;
        overlay.classList.add('open');
        if (navEl) navEl.classList.add('location-open');
        document.body.style.overflow = 'hidden';
    }

    buttons.forEach(function (button) {
        button.addEventListener('click', function (event) {
            var href = button.getAttribute('href');
            if (button.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
                return;
            }

            if (!href || href === '#') {
                event.preventDefault();
                openLocationOverlay();
                return;
            }

            if (/^mailto:/i.test(href)) {
                event.preventDefault();
                window.location.href = href;
                return;
            }

            event.preventDefault();
            window.open(href, '_blank', 'noopener');
        });
    });

    if (window.TM && window.TM.ready && window.TM.ready.then) {
        window.TM.ready.then(applySelectedLocation);
    }

    applySelectedLocation();
    document.addEventListener('tm:locations-ready', applySelectedLocation);
    document.addEventListener('tm:location-changed', applySelectedLocation);

    var navEl = document.getElementById('locationText');
    var cardEl = document.getElementById('giftCardLocationText');
    if (!navEl || !cardEl) return;

    function syncLocationText() {
        var text = (navEl.textContent || '').trim();
        cardEl.textContent = !text || /^select location$/i.test(text)
            ? translate('gift.yourLocation', 'YOUR LOCATION')
            : text;
    }

    syncLocationText();
    new MutationObserver(syncLocationText).observe(navEl, { characterData: true, childList: true, subtree: true });
    document.addEventListener('tm:location-changed', syncLocationText);
    document.addEventListener('tm:language-changed', function () {
        applySelectedLocation();
        syncLocationText();
    });
    if (window.TMI18n && window.TMI18n.ready && typeof window.TMI18n.ready.then === 'function') {
        window.TMI18n.ready.then(function () {
            applySelectedLocation();
            syncLocationText();
        });
    }
})();
