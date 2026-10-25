// Leaderboard tables: renders rows into [data-leaderboard] from /data/leaderboard.json.
// API later: point LEADERBOARD_URL at the endpoint; it should return the same shape
// ({ periods: { week|month|all: [{ rank, team, locationSlug, missions, score }] } }).
(function () {
    'use strict';

    var LEADERBOARD_URL = '/data/leaderboard.json';
    var boards = Array.prototype.slice.call(document.querySelectorAll('[data-leaderboard]'));
    if (!boards.length || typeof fetch !== 'function') return;

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.t === 'function') {
            var value = window.TMI18n.t(key);
            if (typeof value === 'string' && value) return value;
        }
        return fallback;
    }

    function currentLanguage() {
        return (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
    }

    function ordinal(n) {
        if (currentLanguage() !== 'en') return '#' + n;
        var mod100 = n % 100;
        var suffix = (mod100 >= 11 && mod100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
        return n + suffix.toUpperCase();
    }

    function locationName(slug) {
        var loc = window.TM && typeof window.TM.get === 'function' ? window.TM.get(slug) : null;
        if (loc) return loc.shortName || loc.name || slug;
        return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function cell(tag, className, text) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function render(board, data) {
        var activeTab = board.querySelector('.leaderboard-tab[aria-selected="true"]');
        var period = activeTab ? activeTab.dataset.period : 'week';
        var select = board.querySelector('[data-leaderboard-location]');
        var location = select ? select.value : '';
        var limit = parseInt(board.dataset.limit, 10) || 5;
        var rows = ((data.periods || {})[period] || []).filter(function (row) {
            return !location || row.locationSlug === location;
        });
        if (location) {
            rows = rows.map(function (row, i) { return Object.assign({}, row, { rank: i + 1 }); });
        }
        var searchInput = board.querySelector('[data-leaderboard-search]');
        var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (query) {
            rows = rows.filter(function (row) {
                return String(row.team).toLowerCase().indexOf(query) !== -1
                    || locationName(row.locationSlug).toLowerCase().indexOf(query) !== -1;
            });
        }
        rows = rows.slice(0, limit);

        var tbody = board.querySelector('[data-leaderboard-rows]');
        tbody.textContent = '';
        rows.forEach(function (row) {
            var tr = document.createElement('tr');
            if (row.rank <= 3) tr.className = 'lb-top lb-top-' + row.rank;
            var rank = cell('td', 'lb-col-rank');
            rank.appendChild(cell('span', 'lb-rank', ordinal(row.rank)));
            tr.appendChild(rank);
            var team = cell('td', 'lb-col-team', row.team);
            team.appendChild(cell('span', 'lb-team-sub', locationName(row.locationSlug)));
            tr.appendChild(team);
            tr.appendChild(cell('td', 'lb-col-location', locationName(row.locationSlug)));
            tr.appendChild(cell('td', 'lb-col-missions', String(row.missions)));
            tr.appendChild(cell('td', 'lb-col-score', Number(row.score).toLocaleString()));
            tbody.appendChild(tr);
        });
        var empty = board.querySelector('.leaderboard-empty');
        if (empty) {
            empty.hidden = rows.length > 0;
            empty.textContent = query
                ? translate('leaderboard.noMatch', 'No teams match your search.')
                : translate('leaderboard.empty', 'No scores yet for this view.');
        }
    }

    function fillLocations(board, data) {
        var select = board.querySelector('[data-leaderboard-location]');
        if (!select || select.options.length > 1) return;
        var slugs = {};
        Object.keys(data.periods || {}).forEach(function (key) {
            (data.periods[key] || []).forEach(function (row) { slugs[row.locationSlug] = true; });
        });
        Object.keys(slugs).map(function (slug) { return { slug: slug, name: locationName(slug) }; })
            .sort(function (a, b) { return a.name.localeCompare(b.name); })
            .forEach(function (item) {
                var option = document.createElement('option');
                option.value = item.slug;
                option.textContent = item.name;
                select.appendChild(option);
            });
        // Default to the visitor's selected location when there is one on the board
        var current = window.TM && window.TM.current;
        if (current && slugs[current.slug || current.id]) select.value = current.slug || current.id;
    }

    fetch(LEADERBOARD_URL, { headers: { accept: 'application/json' } })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
            if (!data) return;
            boards.forEach(function (board) {
                var ready = window.TM && window.TM.ready && typeof window.TM.ready.then === 'function'
                    ? window.TM.ready : Promise.resolve();
                ready.then(function () {
                    fillLocations(board, data);
                    render(board, data);
                });
                board.querySelectorAll('.leaderboard-tab').forEach(function (tab) {
                    tab.addEventListener('click', function () {
                        board.querySelectorAll('.leaderboard-tab').forEach(function (t) {
                            t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
                        });
                        render(board, data);
                    });
                });
                var select = board.querySelector('[data-leaderboard-location]');
                if (select) select.addEventListener('change', function () { render(board, data); });
                var search = board.querySelector('[data-leaderboard-search]');
                if (search) search.addEventListener('input', function () { render(board, data); });
                document.addEventListener('tm:language-changed', function () { render(board, data); });
            });
        })
        .catch(function () { /* leave the table empty */ });
})();
