(function () {
    'use strict';
    var boards = Array.from(document.querySelectorAll('[data-leaderboard]'));
    if (!boards.length || typeof fetch !== 'function') return;
    var venueNames = new Map();
    Array.from(boards[0].querySelector('[data-leaderboard-location]').options).forEach(function (option) {
        if (option.value && option.value !== 'global') venueNames.set(option.value, option.textContent);
    });
    var requests = new Map();
    function supported(slug) { return slug === 'global' || venueNames.has(slug); }
    function t(key) {
        return window.TMI18n && window.TMI18n.t('leaderboard.' + key) || key;
    }
    function text(tag, className, value) {
        var node = document.createElement(tag);
        node.className = className;
        node.textContent = value;
        return node;
    }
    function acquire(venue, page) {
        var key = venue + ':' + page;
        var request = requests.get(key);
        if (!request) {
            var controller = new AbortController();
            var timer = setTimeout(function () { controller.abort(); }, 8000);
            request = { controller: controller, users: 0 };
            request.promise = fetch('/api/leaderboard?location=' + encodeURIComponent(venue) + '&page=' + page, {
                headers: { accept: 'application/json' }, signal: controller.signal
            }).then(async function (response) {
                var data = await response.json();
                if (!response.ok) throw new Error(data.error || 'upstream_unavailable');
                if (data.location !== venue || data.page !== page || data.pageSize !== 10 ||
                    !Number.isSafeInteger(data.totalRecords) || data.totalRecords < 0 || data.totalRecords > 100 ||
                    !Array.isArray(data.entries) || data.entries.length > 10 ||
                    !data.entries.every(function (entry) { return typeof entry.team === 'string' && Number.isSafeInteger(entry.score)
                        && Number.isSafeInteger(entry.rank) && entry.rank >= 1 && entry.rank <= 100
                        && venueNames.has(entry.location) && (venue === 'global' || entry.location === venue); })) {
                    throw new Error('upstream_unavailable');
                }
                return data;
            }).finally(function () {
                clearTimeout(timer);
                if (requests.get(key) === request) requests.delete(key);
            });
            requests.set(key, request);
        }
        request.users++;
        return {
            promise: request.promise,
            release: function () {
                request.users--;
                if (!request.users) {
                    request.controller.abort();
                    if (requests.get(key) === request) requests.delete(key);
                }
            }
        };
    }
    boards.forEach(function (board) {
        var select = board.querySelector('[data-leaderboard-location]');
        var search = board.querySelector('[data-leaderboard-search]');
        var tbody = board.querySelector('[data-leaderboard-rows]');
        var status = board.querySelector('[data-leaderboard-status]');
        var caption = board.querySelector('[data-leaderboard-caption]');
        var retry = board.querySelector('[data-leaderboard-retry]');
        var pagination = board.querySelector('[data-leaderboard-pagination]');
        var link = board.querySelector('[data-leaderboard-link]');
        var limit = Number(board.dataset.limit);
        var venue = 'global', page = 0, result = null, state = 'loading', version = 0, active = null;
        function render(reveal) {
            var bounds = reveal === true ? board.getBoundingClientRect() : null;
            var animateRows = bounds && bounds.top < window.innerHeight && bounds.bottom > 0
                && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            var statusHadFocus = document.activeElement === status;
            var label = venue === 'global' ? t('global') : venueNames.get(venue);
            caption.textContent = label ? label + ' · ' + t('page') + ' ' + (page + 1) : t('scope');
            if (link) {
                var language = document.documentElement.lang.slice(0, 2);
                var prefix = (window.location.pathname === '/' + language || window.location.pathname.indexOf('/' + language + '/') === 0) ? '/' + language : '';
                link.href = prefix + '/leaderboard' + (supported(venue) ? '?location=' + encodeURIComponent(venue) : '');
            }
            board.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
            tbody.textContent = '';
            var rows = result ? result.entries : [];
            var query = search.value.trim().toLocaleLowerCase();
            if (query) rows = rows.filter(function (row) { return row.team.toLocaleLowerCase().includes(query); });
            rows = rows.slice(0, limit);
            rows.forEach(function (row, index) {
                var tr = document.createElement('tr');
                tr.dataset.rank = row.rank;
                var position = text('td', 'lb-col-rank', '');
                position.appendChild(text('span', 'lb-rank', String(row.rank)));
                tr.appendChild(position);
                var team = text('td', 'lb-col-team', '');
                if (row.rank === 1) team.appendChild(text('span', 'lb-leader-label', t('scoreToBeat')));
                team.appendChild(text('span', 'lb-team-name', row.team));
                team.appendChild(text('span', 'lb-team-location', ' ' + venueNames.get(row.location)));
                tr.appendChild(team);
                tr.appendChild(text('td', 'lb-col-location', venueNames.get(row.location)));
                tr.appendChild(text('td', 'lb-col-score', row.score.toLocaleString(document.documentElement.lang)));
                tbody.appendChild(tr);
                if (animateRows) tr.animate([
                    { opacity: 0, transform: 'translateY(6px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], { duration: 240, delay: index * 20, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
            });
            status.textContent = result ? (rows.length ? '' : t(result.entries.length ? 'noMatch' : 'empty')) : t(state);
            status.hidden = !!rows.length;
            retry.hidden = !['configuration', 'unavailable'].includes(state);
            search.disabled = !result;
            if (pagination) {
                pagination.hidden = !result || !result.totalRecords;
                board.querySelector('[data-leaderboard-page]').textContent = t('page') + ' ' + (page + 1);
                board.querySelector('[data-leaderboard-prev]').disabled = page === 0;
                board.querySelector('[data-leaderboard-next]').disabled = !result || !result.entries.length || (page + 1) * 10 >= result.totalRecords || page >= 99;
            }
            if (statusHadFocus && status.hidden) caption.focus({ preventScroll: true });
        }
        function load(slug, number, showResults) {
            var controlHadFocus = document.activeElement === retry || pagination && pagination.contains(document.activeElement);
            version++;
            var currentVersion = version;
            if (active) active.release();
            active = null;
            venue = slug || 'global';
            page = number;
            result = null;
            select.value = supported(venue) ? venue : '';
            state = !supported(venue) ? 'unsupported' : 'loading';
            render();
            if (state !== 'loading') return;
            if (controlHadFocus || showResults) status.focus({ preventScroll: true });
            if (showResults) board.querySelector('.leaderboard-card').scrollIntoView({ block: 'start' });
            active = acquire(venue, page);
            active.promise.then(function (data) {
                if (currentVersion !== version) return;
                result = data;
                state = 'ready';
                render(true);
            }).catch(function (error) {
                if (currentVersion !== version) return;
                state = error.message === 'configuration_unavailable' ? 'configuration' : error.message === 'unsupported_location' ? 'unsupported' : 'unavailable';
                render();
            });
        }
        select.addEventListener('change', function () { search.value = ''; load(select.value, 0); });
        search.addEventListener('input', render);
        retry.addEventListener('click', function () { load(venue, page); });
        if (pagination) {
            board.querySelector('[data-leaderboard-prev]').addEventListener('click', function () { load(venue, page - 1, true); });
            board.querySelector('[data-leaderboard-next]').addEventListener('click', function () { load(venue, page + 1, true); });
        }
        document.addEventListener('tm:language-changed', render);
        var ready = window.TM && window.TM.ready || Promise.resolve();
        ready.then(function () {
            var parameter = new URLSearchParams(window.location.search).get('location');
            var contextualVenue = window.TMNavigation && window.TMNavigation.pathLocation(window.location.pathname)
                || document.body.dataset.location;
            if (!version) load(parameter || contextualVenue || 'global', 0);
            if (window.TM && window.TM.onChange) window.TM.onChange(function (location) {
                search.value = '';
                load(location && (location.slug || location.id) || 'global', 0);
            });
        });
    });
})();
