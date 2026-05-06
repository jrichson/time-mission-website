    document.querySelectorAll('.footer-location-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.classList.toggle('open');
        });
    });
        // Reveal on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    // What-Is photo carousel
    (function() {
        const wrap = document.getElementById('whatIsCarousel');
        if (!wrap) return;
        const track = wrap.querySelector('.what-is-carousel');
        const dots = wrap.querySelectorAll('.carousel-dot');
        const total = dots.length;
        let current = 0;
        let timer;

        function goTo(i) {
            current = (i + total) % total;
            track.style.transform = 'translateX(-' + (current * 100) + '%)';
            dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
        }

        function autoPlay() {
            timer = setInterval(() => goTo(current + 1), 4000);
        }

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => { clearInterval(timer); goTo(i); autoPlay(); });
        });

        // Swipe support
        let startX = 0;
        wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
        wrap.addEventListener('touchend', e => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
            autoPlay();
        }, { passive: true });

        autoPlay();
    })();
