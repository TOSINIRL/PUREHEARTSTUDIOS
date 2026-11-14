// Presentation only: the site's booking and navigation logic remain in main.js.
(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const hero = document.querySelector('.hero');
    const strip = document.querySelector('.style-strip');
    const stripToggle = document.querySelector('.strip-toggle');
    let framePending = false;

    const updateScrollPresentation = () => {
        framePending = false;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        document.documentElement.style.setProperty('--reading-progress',
            String(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0));
        const heroHeight = hero.offsetHeight;
        const shift = !reduceMotion.matches && finePointer.matches
            ? Math.min(window.scrollY, heroHeight) * 0.12
            : 0;
        hero.style.setProperty('--hero-shift', `${shift}px`);
    };

    const scheduleScrollUpdate = () => {
        if (!framePending) {
            framePending = true;
            requestAnimationFrame(updateScrollPresentation);
        }
    };
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', scheduleScrollUpdate, { passive: true });
    reduceMotion.addEventListener('change', scheduleScrollUpdate);
    finePointer.addEventListener('change', scheduleScrollUpdate);
    updateScrollPresentation();

    stripToggle.addEventListener('click', () => {
        const paused = strip.dataset.paused !== 'true';
        strip.dataset.paused = String(paused);
        stripToggle.setAttribute('aria-pressed', String(paused));
        stripToggle.setAttribute('aria-label', `${paused ? 'Resume' : 'Pause'} moving service strip`);
        stripToggle.querySelector('span').textContent = paused ? '▶' : 'Ⅱ';
    });

    document.querySelectorAll('.service-card').forEach(card => {
        let pointerFrame = null;
        card.addEventListener('pointermove', event => {
            if (reduceMotion.matches || !finePointer.matches) return;
            const { clientX, clientY } = event;
            if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
            pointerFrame = requestAnimationFrame(() => {
                pointerFrame = null;
                const bounds = card.getBoundingClientRect();
                const x = clientX - bounds.left;
                const y = clientY - bounds.top;
                card.style.setProperty('--pointer-x', `${x}px`);
                card.style.setProperty('--pointer-y', `${y}px`);
                card.style.setProperty('--tilt-x', `${(0.5 - y / bounds.height) * 3}deg`);
                card.style.setProperty('--tilt-y', `${(x / bounds.width - 0.5) * 3}deg`);
            });
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
            if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
            pointerFrame = null;
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
        });
    });

    // Highlight the section currently being read, without changing navigation.
    const links = [...document.querySelectorAll('.nav-link')];
    if ('IntersectionObserver' in window) {
        const sectionObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                links.forEach(link => {
                    if (link.getAttribute('href') === `#${entry.target.id}`) {
                        link.setAttribute('aria-current', 'location');
                    } else {
                        link.removeAttribute('aria-current');
                    }
                });
            }
        }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });
        document.querySelectorAll('section[id]').forEach(section => {
            if (links.some(link => link.hash === `#${section.id}`)) sectionObserver.observe(section);
        });
    }
})();
