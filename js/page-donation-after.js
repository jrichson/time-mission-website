(function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.btn-donation, [data-donation="1"]'));
    var hint = document.getElementById('donationLocationHint');
    var formSection = document.querySelector('[data-donation-form-section]');
    var frame = document.getElementById('donationRequestFrame');
    var formIntro = document.getElementById('donationFormIntro');
    var frameFallbackTimer = null;
    var activeFrameUrl = '';
    if (!buttons.length) return;

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

    function setFrame(url, locationName) {
        if (!formSection || !frame) return;
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
        frame.setAttribute('title', 'Donation request form for ' + locationName);
        formSection.hidden = false;
        if (formIntro) formIntro.textContent = 'Complete the donation request form for ' + locationName + '.';
        frameFallbackTimer = setTimeout(function () {
            showFormFallback(url, locationName);
        }, fallbackDelayMs());
    }

    function showFormFallback(url, locationName) {
        if (!url || activeFrameUrl !== url) return;
        clearFrameFallbackTimer();
        setButtons(url, false, 'Open Donation Request Form', false);
        if (hint) {
            hint.textContent = 'If the embedded form is not loading, open the donation request form in a new tab for ' + locationName + '.';
        }
    }

    function applySelectedLocation() {
        var loc = selectedLocation();
        var url = loc && typeof loc.donationUrl === 'string' ? loc.donationUrl.trim() : '';
        var locationName = (loc && (loc.shortName || loc.name)) || '';

        if (!url) {
            setButtons('#', true, 'Donation Request Form Coming Soon', false);
            setFrame('', locationName);
            if (hint) {
                hint.textContent = locationName
                    ? 'The online donation request form is not ready for ' + locationName + ' yet. Use contact for now and include your organization, event date, and request type.'
                    : 'The online donation request form is not ready yet. Use contact for now and include your location, organization, event date, and request type.';
            }
            return;
        }

        setButtons(url, false, 'Open Donation Request Form', true);
        setFrame(url, locationName);
        if (hint) hint.textContent = 'Donation requests are routed to ' + locationName + '. Complete the form below.';
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
})();
