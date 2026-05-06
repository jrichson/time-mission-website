    (function () {
        document.querySelectorAll('.faq-item .faq-question').forEach((btn) => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.faq-item');
                if (!item) return;
                const was = item.classList.contains('active');
                document.querySelectorAll('.faq-item').forEach((el) => {
                    el.classList.remove('active');
                    const q = el.querySelector('.faq-question');
                    if (q) q.setAttribute('aria-expanded', 'false');
                });
                if (!was) {
                    item.classList.add('active');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });
    })();
    document.querySelectorAll('.footer-location-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.parentElement.classList.toggle('open');
        });
    });
