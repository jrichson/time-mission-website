(function () {
    var filterTabs = Array.prototype.slice.call(document.querySelectorAll('.filter-tab'));
    var portalCards = Array.prototype.slice.call(document.querySelectorAll('.portal-card'));
    var emptyState = document.querySelector('.portals-empty');
    function currentHiddenMissionIds() {
        var loc = window.TM && window.TM.current;
        var rows = loc && Array.isArray(loc.hiddenMissionIds) ? loc.hiddenMissionIds : [];
        return rows.reduce(function (ids, missionId) {
            ids[String(missionId)] = true;
            return ids;
        }, {});
    }

    function activeFilter() {
        var activeTab = filterTabs.find(function (tab) { return tab.classList.contains('active'); });
        return activeTab ? activeTab.dataset.filter : 'all';
    }

    function cardMatchesFilter(card, filter) {
        var categories = (card.dataset.category || '').split(/\s+/).filter(Boolean);
        return filter === 'all' || categories.indexOf(filter) !== -1;
    }

    function setCardVisible(card, isVisible) {
        card.dataset.filterHidden = isVisible ? '0' : '1';
        if (isVisible) {
            card.style.display = '';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            return;
        }

        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        window.setTimeout(function () {
            if (card.dataset.filterHidden === '1') card.style.display = 'none';
        }, 300);
    }

    function updateFilterCounts(hiddenMissionIds) {
        filterTabs.forEach(function (tab) {
            var count = portalCards.filter(function (card) {
                return !hiddenMissionIds[card.dataset.missionId] && cardMatchesFilter(card, tab.dataset.filter);
            }).length;
            var countEl = tab.querySelector('.filter-count');
            if (countEl) countEl.textContent = String(count);
        });
    }

    function applyPortalFilters() {
        var filter = activeFilter();
        var hiddenMissionIds = currentHiddenMissionIds();
        var visibleCount = 0;

        updateFilterCounts(hiddenMissionIds);

        portalCards.forEach(function (card) {
            var isVisible = !hiddenMissionIds[card.dataset.missionId] && cardMatchesFilter(card, filter);
            if (isVisible) visibleCount += 1;
            setCardVisible(card, isVisible);
        });

        if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    filterTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            filterTabs.forEach(function (otherTab) {
                otherTab.classList.toggle('active', otherTab === tab);
            });
            applyPortalFilters();
        });
    });

    if (window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
        window.TM.ready.then(applyPortalFilters);
    }
    if (window.TM && typeof window.TM.onChange === 'function') {
        window.TM.onChange(applyPortalFilters);
    }
    applyPortalFilters();

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

    var filterSection = document.querySelector('.filter-section');
    if (filterSection) {
        window.addEventListener('scroll', function () {
            filterSection.classList.toggle('stuck', filterSection.getBoundingClientRect().top <= 60);
        }, { passive: true });
    }

    portalCards.forEach(function (card) {
        card.addEventListener('click', function (event) {
            if (event.target.closest('.portal-cta, a, button, .portal-badge')) return;
            card.classList.toggle('expanded');
        });
    });
})();
