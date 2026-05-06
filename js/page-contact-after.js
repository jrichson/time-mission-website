    document.querySelectorAll('.footer-location-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.classList.toggle('open');
        });
    });

    // Pre-select the Subject field from ?type= deep-links (group page CTAs)
    // and strip the query param so SEO crawlers see one canonical /contact URL
    // instead of seven indexable variants. Falls back to "groups" for any
    // event-type the form's select doesn't list explicitly.
    (function () {
        var params = new URLSearchParams(window.location.search);
        var type = params.get('type');
        if (!type) return;
        var select = document.getElementById('subject');
        if (select) {
            var aliases = {
                'birthday': 'birthday',
                'corporate': 'corporate',
                'private-event': 'groups',
                'bachelor-ette': 'groups',
                'field-trip': 'groups',
                'holiday': 'groups',
                'event': 'groups'
            };
            var target = aliases[type] || type;
            var match = Array.prototype.find.call(select.options, function (o) { return o.value === target; });
            if (match) select.value = target;
        }
        if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState({}, '', '/contact');
        }
    })();
