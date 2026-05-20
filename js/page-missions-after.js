(function () {
    var filterTabs = Array.prototype.slice.call(document.querySelectorAll('.filter-tab'));
    var portalCards = Array.prototype.slice.call(document.querySelectorAll('.portal-card'));
    var emptyState = document.querySelector('.portals-empty');

    filterTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var filter = tab.dataset.filter;
            var visibleCount = 0;

            filterTabs.forEach(function (otherTab) {
                otherTab.classList.toggle('active', otherTab === tab);
            });

            portalCards.forEach(function (card) {
                var categories = (card.dataset.category || '').split(/\s+/).filter(Boolean);
                var isVisible = filter === 'all' || categories.indexOf(filter) !== -1;
                card.dataset.filterHidden = isVisible ? '0' : '1';

                if (isVisible) {
                    card.style.display = '';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    visibleCount += 1;
                    return;
                }

                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                window.setTimeout(function () {
                    if (card.dataset.filterHidden === '1') card.style.display = 'none';
                }, 300);
            });

            if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        });
    });

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
