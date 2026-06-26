(function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.btn-donation, [data-donation="1"]'));
    var hint = document.getElementById('donationLocationHint');
    var formSection = document.querySelector('[data-donation-form-section]');
    var frame = document.getElementById('donationRequestFrame');
    var formIntro = document.getElementById('donationFormIntro');
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

    function setFrame(url, locationName) {
        if (!formSection || !frame) return;
        if (!url) {
            formSection.hidden = true;
            frame.removeAttribute('src');
            return;
        }

        frame.setAttribute('src', url);
        frame.setAttribute('title', 'Donation request form for ' + locationName);
        formSection.hidden = false;
        if (formIntro) formIntro.textContent = 'Complete the donation request form for ' + locationName + '.';
    }

    function applySelectedLocation() {
        var loc = selectedLocation();
        var url = loc && typeof loc.donationUrl === 'string' ? loc.donationUrl.trim() : '';
        var locationName = (loc && (loc.shortName || loc.name)) || '';

        if (!url) {
            setButtons('#', true, 'Donation Request Form Coming Soon');
            setFrame('', locationName);
            if (hint) {
                hint.textContent = locationName
                    ? 'The online donation request form is not ready for ' + locationName + ' yet. Use contact for now and include your organization, event date, and request type.'
                    : 'The online donation request form is not ready yet. Use contact for now and include your location, organization, event date, and request type.';
            }
            return;
        }

        setButtons(url, false, 'Open Donation Request Form');
        setFrame(url, locationName);
        if (hint) hint.textContent = 'Donation requests are routed to ' + locationName + '. Complete the form below or open it in a new tab.';
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
