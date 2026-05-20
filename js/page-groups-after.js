(function () {
    document.querySelectorAll('.faq-item .faq-question').forEach(function (button) {
        button.addEventListener('click', function () {
            var item = button.closest('.faq-item');
            if (!item) return;

            var isActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(function (entry) {
                entry.classList.remove('active');
                var question = entry.querySelector('.faq-question');
                if (question) question.setAttribute('aria-expanded', 'false');
            });

            if (!isActive) {
                item.classList.add('active');
                button.setAttribute('aria-expanded', 'true');
            }
        });
    });

    var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });
        revealItems.forEach(function (el) { revealObserver.observe(el); });
    } else {
        revealItems.forEach(function (el) { el.classList.add('visible'); });
    }
})();
