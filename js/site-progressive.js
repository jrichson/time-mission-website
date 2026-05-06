/**
 * site-progressive.js — progressive enhancement loaded deferred on every page.
 * Handles:
 *   - Reveal-on-scroll: IntersectionObserver for .reveal elements with prefers-reduced-motion guard.
 *   - Footer location toggles: .footer-location-toggle expand/collapse.
 */
(function () {
    var revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealEls.forEach(function (el) { el.classList.add('visible'); });
    } else {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        revealEls.forEach(function (el) { observer.observe(el); });
    }
})();

document.querySelectorAll('.footer-location-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
        btn.parentElement.classList.toggle('open');
    });
});
