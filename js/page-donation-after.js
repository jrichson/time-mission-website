(function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.btn-donation, [data-donation="1"]'));
    var hint = document.getElementById('donationLocationHint');
    var formSection = document.querySelector('[data-donation-form-section]');
    var frame = document.getElementById('donationRequestFrame');
    var formIntro = document.getElementById('donationFormIntro');
    var frameFallbackTimer = null;
    var activeFrameUrl = '';
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

    function setButtons(href, disabled, label, hidden) {
        buttons.forEach(function (button) {
            button.setAttribute('href', href || '#');
            if (label) button.textContent = label;
            button.hidden = Boolean(hidden);
            if (disabled) {
                button.setAttribute('aria-disabled', 'true');
                button.classList.add('is-disabled');
                return;
            }
            button.removeAttribute('aria-disabled');
            button.classList.remove('is-disabled');
        });
    }

    function fallbackDelayMs() {
        var configured = Number(window.__TM_DONATION_FALLBACK_DELAY_MS);
        return Number.isFinite(configured) && configured >= 0 ? configured : 8000;
    }

    function clearFrameFallbackTimer() {
        if (!frameFallbackTimer) return;
        clearTimeout(frameFallbackTimer);
        frameFallbackTimer = null;
    }

    function selectedLocation() {
        var tm = window.TM || null;
        var loc = (tm && tm.current) || null;
        if (loc) return loc;

        var slug = tm && typeof tm.getSavedSlug === 'function' ? tm.getSavedSlug() : '';
        if (slug && tm && typeof tm.get === 'function') return tm.get(slug);
        return null;
    }

    function localizedLocationName(loc) {
        var fallback = (loc && (loc.shortName || loc.name)) || '';
        var slug = String((loc && (loc.slug || loc.id)) || '').toLowerCase();
        return slug ? translate('location.name.' + slug, fallback) : fallback;
    }

    function setFrame(url, locationName) {
        if (!formSection || !frame) return;
        if (url && activeFrameUrl === url && frame.getAttribute('src') === url) {
            frame.setAttribute('title', translate(
                'donation.frameTitle',
                'Donation request form for {location}',
                { location: locationName }
            ));
            formSection.hidden = false;
            if (formIntro) formIntro.textContent = translate(
                'donation.formIntro',
                'Complete the donation request form for {location}.',
                { location: locationName }
            );
            return;
        }
        clearFrameFallbackTimer();
        activeFrameUrl = url || '';
        if (!url) {
            formSection.hidden = true;
            frame.removeAttribute('src');
            frame.onload = null;
            frame.onerror = null;
            return;
        }

        frame.onload = function () {
            if (activeFrameUrl === url) clearFrameFallbackTimer();
        };
        frame.onerror = function () {
            showFormFallback(url, locationName);
        };
        frame.setAttribute('src', url);
        frame.setAttribute('title', translate(
            'donation.frameTitle',
            'Donation request form for {location}',
            { location: locationName }
        ));
        formSection.hidden = false;
        if (formIntro) formIntro.textContent = translate(
            'donation.formIntro',
            'Complete the donation request form for {location}.',
            { location: locationName }
        );
        frameFallbackTimer = setTimeout(function () {
            showFormFallback(url, locationName);
        }, fallbackDelayMs());
    }

    function showFormFallback(url, locationName) {
        if (!url || activeFrameUrl !== url) return;
        clearFrameFallbackTimer();
        setButtons(url, false, translate('donation.openForm', 'Open Donation Request Form'), false);
        if (hint) {
            hint.textContent = translate(
                'donation.fallbackHint',
                'If the embedded form is not loading, open the donation request form in a new tab for {location}.',
                { location: locationName }
            );
        }
    }

    function applySelectedLocation() {
        var loc = selectedLocation();
        var url = loc && typeof loc.donationUrl === 'string' ? loc.donationUrl.trim() : '';
        var locationName = localizedLocationName(loc);

        if (!url) {
            setButtons('#', true, translate('donation.comingSoon', 'Donation Request Form Coming Soon'), false);
            setFrame('', locationName);
            if (hint) {
                hint.textContent = locationName
                    ? translate(
                        'donation.unavailableForLocation',
                        'The online donation request form is not ready for {location} yet. Use contact for now and include your organization, event date, and request type.',
                        { location: locationName }
                    )
                    : translate(
                        'donation.unavailableGeneric',
                        'The online donation request form is not ready yet. Use contact for now and include your location, organization, event date, and request type.'
                    );
            }
            return;
        }

        setButtons(url, false, translate('donation.openForm', 'Open Donation Request Form'), true);
        setFrame(url, locationName);
        if (hint) hint.textContent = translate(
            'donation.routedTo',
            'Donation requests are routed to {location}. Complete the form below.',
            { location: locationName }
        );
    }

    buttons.forEach(function (button) {
        button.addEventListener('click', function (event) {
            var href = button.getAttribute('href');
            if (button.getAttribute('aria-disabled') === 'true' || !href || href === '#') {
                event.preventDefault();
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
    document.addEventListener('tm:language-changed', applySelectedLocation);
    if (window.TMI18n && window.TMI18n.ready && typeof window.TMI18n.ready.then === 'function') {
        window.TMI18n.ready.then(applySelectedLocation);
    }
})();
