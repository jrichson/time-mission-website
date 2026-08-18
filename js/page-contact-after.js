(function () {
    'use strict';

    function normalizeLocation(value) {
        return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

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

    function contactFormOnlyLocations() {
        var meta = document.querySelector('meta[name="tm-contact-form-only-locations"]');
        var values = meta ? String(meta.getAttribute('content') || '').split(',') : [];
        return new Set(values.map(normalizeLocation).filter(Boolean));
    }

    var formOnlyLocations = contactFormOnlyLocations();

    function directContactLocations() {
        if (window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
            return window.TM.ready.then(function () {
                return Array.isArray(window.TM.locations) ? window.TM.locations : [];
            });
        }
        if (window.TM && Array.isArray(window.TM.locations) && window.TM.locations.length) {
            return Promise.resolve(window.TM.locations);
        }
        return fetch('/data/locations.json')
            .then(function (res) { return res.ok ? res.json() : { locations: [] }; })
            .then(function (doc) { return Array.isArray(doc.locations) ? doc.locations : []; })
            .catch(function () { return []; });
    }

    function telHref(phone, phoneE164) {
        var value = String(phoneE164 || phone || '').replace(/[^\d+]/g, '');
        return value ? 'tel:' + value : '';
    }

    function setHidden(el, hidden) {
        if (!el) return;
        el.hidden = !!hidden;
    }

    function setLocationContactMessage(emptyEl, text) {
        if (emptyEl) emptyEl.textContent = text;
    }

    function localizedLocationName(loc, fallback) {
        var slug = normalizeLocation(loc && (loc.slug || loc.id));
        return slug ? translate('location.name.' + slug, fallback) : fallback;
    }

    function initLocationContactPanel(locations) {
        var select = document.getElementById('location');
        var panel = document.querySelector('[data-location-contact-panel]');
        if (!select || !panel) return;

        var card = panel.querySelector('[data-location-contact-card]');
        var empty = panel.querySelector('[data-location-contact-empty]');
        var general = panel.querySelector('[data-location-contact-general]');
        var nameEl = panel.querySelector('[data-location-contact-name]');
        var phoneRow = panel.querySelector('[data-location-contact-phone-row]');
        var phoneEl = panel.querySelector('[data-location-contact-phone]');
        var emailRow = panel.querySelector('[data-location-contact-email-row]');
        var emailEl = panel.querySelector('[data-location-contact-email]');
        var byId = {};

        locations.forEach(function (loc) {
            var id = normalizeLocation(loc && (loc.id || loc.slug));
            var slug = normalizeLocation(loc && loc.slug);
            if (id) byId[id] = loc;
            if (slug) byId[slug] = loc;
        });

        function setSelectLocation(value) {
            var normalized = normalizeLocation(value);
            if (!normalized) return false;
            var match = Array.prototype.find.call(select.options, function (option) {
                return normalizeLocation(option.value) === normalized;
            });
            if (!match) return false;
            select.value = match.value;
            return true;
        }

        function syncFromCurrentLocation() {
            var current = window.TM && window.TM.current;
            if (!current) return false;
            return setSelectLocation(current.id || current.slug);
        }

        function render() {
            var value = normalizeLocation(select.value);
            setHidden(card, true);
            setHidden(general, true);
            setHidden(empty, true);

            if (!value) {
                setLocationContactMessage(empty, translate(
                    'contact.chooseLocationDirect',
                    'Choose a location in the form to see its direct contact info.'
                ));
                setHidden(empty, false);
                return;
            }

            if (value === 'general') {
                setHidden(general, false);
                return;
            }

            var loc = byId[value];
            var contact = (loc && loc.contact) || {};
            var phone = String(contact.phone || '').trim();
            var email = formOnlyLocations.has(value) ? '' : String(contact.email || '').trim();
            var rawLocationName = (loc && (loc.shortName || loc.name))
                || select.options[select.selectedIndex].text
                || translate('location.selectedLocation', 'this location');
            var locationName = localizedLocationName(loc, rawLocationName);

            if (!phone && !email) {
                setLocationContactMessage(empty, translate(
                    'contact.unavailableDirect',
                    'Direct contact info is not listed for {location} yet. Use the message form and we will route it to the right team.',
                    { location: locationName }
                ));
                setHidden(empty, false);
                return;
            }

            if (nameEl) nameEl.textContent = locationName;
            if (phoneEl) {
                phoneEl.textContent = phone;
                phoneEl.href = telHref(phone, loc && loc.phoneE164);
            }
            if (emailEl) {
                emailEl.textContent = email;
                emailEl.href = 'mailto:' + email;
            }
            setHidden(phoneRow, !phone);
            setHidden(emailRow, !email);
            setHidden(card, false);
        }

        select.addEventListener('change', render);
        document.addEventListener('tm:language-changed', render);
        document.addEventListener('tm:location-changed', function (event) {
            var loc = event.detail || null;
            if (loc && setSelectLocation(loc.id || loc.slug)) render();
        });
        if (!select.value) syncFromCurrentLocation();
        render();
        if (window.TMI18n && window.TMI18n.ready && typeof window.TMI18n.ready.then === 'function') {
            window.TMI18n.ready.then(render);
        }
    }

    directContactLocations().then(initLocationContactPanel);

    function contactDeepLinkParams() {
        var params = new URLSearchParams(window.location.search);
        var hash = String(window.location.hash || '');
        if (hash.charAt(0) === '#') hash = hash.slice(1);
        if (hash.charAt(0) === '?') hash = hash.slice(1);
        if (hash) {
            new URLSearchParams(hash).forEach(function (value, name) {
                if (!params.has(name)) params.set(name, value);
            });
        }
        return params;
    }

    (function () {
        var params = contactDeepLinkParams();
        var type = params.get('type');
        var location = params.get('location');
        var subjectSelect = document.getElementById('subject');
        var locationSelect = document.getElementById('location');
        if (type && subjectSelect) {
            var aliases = {
                'birthday': 'birthday',
                'corporate': 'corporate',
                'private-event': 'groups',
                'private-events': 'groups',
                'bachelor-ette': 'groups',
                'field-trip': 'groups',
                'field-trips': 'groups',
                'holiday': 'groups',
                'holidays': 'groups',
                'updates': 'general',
                'event': 'groups',
            };
            var target = aliases[type] || type;
            var subjectMatch = Array.prototype.find.call(subjectSelect.options, function (o) { return o.value === target; });
            if (subjectMatch) subjectSelect.value = target;
        }
        if (location && locationSelect) {
            var normalizedLocation = normalizeLocation(location);
            var locationMatch = Array.prototype.find.call(locationSelect.options, function (o) { return o.value === normalizedLocation; });
            if (locationMatch) {
                locationSelect.value = normalizedLocation;
                locationSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        if ((type || location) && window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState({}, '', window.location.pathname || '/contact');
        }
    })();
})();
