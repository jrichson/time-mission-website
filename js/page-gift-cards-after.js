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

    function updateRedemptionAnswer(loc) {
        if (!redemptionAnswer) return;

        if (!loc) {
            redemptionAnswer.textContent = 'Gift cards are location-specific. Select your location before purchasing so we can show the correct gift-card checkout and redemption details.';
            return;
        }

        var slug = locationSlug(loc);
        var locationName = loc.shortName || loc.name || 'this location';
        if (loc.status === 'temporarily-closed') {
            redemptionAnswer.textContent = 'Gift cards are temporarily paused for ' + locationName + ' while ticket sales are paused.';
            return;
        }

        if (opsGiftCardLocationIds[slug]) {
            redemptionAnswer.textContent = 'Gift cards purchased from this location are valid for Time Missions located in these states: AL, GA, FL, IL, IN, KS, MD, MN, MO, NC, TN, VA & WI.';
            return;
        }

        if (loc.giftCardUrl) {
            redemptionAnswer.textContent = 'Gift cards purchased through ' + locationName + '\'s checkout are intended for that location. Contact ' + locationName + ' before purchasing if you need to use a gift card at another Time Mission location.';
            return;
        }

        redemptionAnswer.textContent = 'Gift cards are not available for ' + locationName + ' yet, so they cannot currently be purchased or redeemed from this page for that location.';
    }

    function applySelectedLocation() {
        var loc = selectedLocation();
        if (!loc) {
            updateRedemptionAnswer(null);
            return false;
        }

        var url = loc.giftCardUrl || '';
        var locationName = loc.shortName || loc.name;
        updateRedemptionAnswer(loc);
        if (!url) {
            if (hint) {
                hint.textContent = loc.status === 'temporarily-closed'
                    ? 'Gift cards are temporarily paused for ' + locationName + '.'
                    : 'Gift cards are not available for ' + locationName + ' yet.';
            }
            setButtons('#', true);
            return true;
        }

        setButtons(url, false);
        if (/^mailto:/i.test(url)) {
            if (hint) hint.textContent = 'Email ' + locationName + ' directly for a gift card.';
        } else if (hint) {
            hint.textContent = 'Purchasing for ' + locationName + '. Change location in the top nav if needed.';
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
        cardEl.textContent = !text || /^select location$/i.test(text) ? 'YOUR LOCATION' : text;
    }

    syncLocationText();
    new MutationObserver(syncLocationText).observe(navEl, { characterData: true, childList: true, subtree: true });
    document.addEventListener('tm:location-changed', syncLocationText);
})();
