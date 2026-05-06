        // FAQ Accordion
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;
                const isActive = item.classList.contains('active');
                document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        });

        // Footer locations dropdown toggle
        document.querySelectorAll('.footer-location-toggle').forEach(btn => {
            btn.addEventListener('click', () => btn.parentElement.classList.toggle('open'));
        });
    