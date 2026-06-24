(function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.btn-donation, [data-donation="1"]'));
    var hint = document.getElementById('donationLocationHint');
    if (!buttons.length) return;

    function setButtons(href, disabled, label) {
        buttons.forEach(function (button) {
            button.setAttribute('href', href || '#');
            if (label) button.textContent = label;
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
        if (slug && tm && typeof tm.get === 'function') return tm.get(slug);
        return null;
    }

    function applySelectedLocation() {
        var loc = selectedLocation();
        var url = loc && typeof loc.donationUrl === 'string' ? loc.donationUrl.trim() : '';
        var locationName = (loc && (loc.shortName || loc.name)) || '';

        if (!url) {
            setButtons('#', true, 'Donation Request Form Coming Soon');
            if (hint) {
                hint.textContent = locationName
                    ? 'The online donation request form is not ready for ' + locationName + ' yet. Use contact for now and include your organization, event date, and request type.'
                    : 'The online donation request form is not ready yet. Use contact for now and include your location, organization, event date, and request type.';
            }
            return;
        }

        setButtons(url, false, 'Donate to ' + locationName);
        if (hint) hint.textContent = 'Donation support is routed to ' + locationName + '.';
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
