// ===== MOBILE MENU TOGGLE =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navbar = document.querySelector('.navbar');

hamburger.addEventListener('click', () => {
    const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!isExpanded));
    hamburger.classList.toggle('active', !isExpanded);
    navMenu.classList.toggle('active', !isExpanded);
});

// Close menu when clicking on a nav link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    });
});

// ===== SMOOTH SCROLLING =====
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight - 16;
            window.scrollTo({
                top: offsetTop,
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
        }
    });
});

// ===== NAVBAR SCROLL EFFECT =====
const updateNavbar = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 16);
};

window.addEventListener('scroll', updateNavbar, { passive: true });
updateNavbar();

// ===== SCROLL REVEAL ANIMATIONS =====
const revealTargets = document.querySelectorAll(
    '.section-header, .service-card, .stylist-wrapper > *, .pricing-card, .calendar-container, .confirmation-content, .contact-item, .social-media'
);

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const runningReveals = new Set();
    const playReveal = (element, keyframes, options) => {
        const animation = element.animate(keyframes, options);
        runningReveals.add(animation);
        const release = () => runningReveals.delete(animation);
        animation.onfinish = () => { release(); animation.cancel(); };
        animation.oncancel = release;
    };
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const target = entry.target;
            const delay = Number(target.dataset.revealDelay);
            target.classList.remove('reveal-pending');
            if (revealMotionPreference.matches || typeof target.animate !== 'function') {
                observer.unobserve(target);
                return;
            }

            const isHeading = target.classList.contains('section-header');
            const isCard = target.classList.contains('service-card');
            playReveal(target,
                isHeading ? [
                    { transform: 'translateY(30px)' },
                    { transform: 'translateY(0)' }
                ] : [
                    { opacity: 0, transform: `translateY(${isCard ? 48 : 32}px) scale(${isCard ? 0.97 : 1})` },
                    { opacity: 1, transform: 'translateY(0) scale(1)' }
                ],
                {
                    duration: isCard ? 950 : 800,
                    delay,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    fill: 'backwards'
                }
            );
            const image = isCard && target.querySelector('.service-image');
            if (image && typeof image.animate === 'function') {
                playReveal(image, [
                    { clipPath: 'inset(0 0 100% 0)' },
                    { clipPath: 'inset(0 0 0% 0)' }
                ], {
                    duration: 1100, delay,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards'
                });
            }
            observer.unobserve(target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

    revealTargets.forEach(target => {
        target.classList.add('reveal-pending');
        const siblings = Array.from(target.parentElement.children)
            .filter(element => element.matches('.service-card, .pricing-card, .contact-item'));
        target.dataset.revealDelay = `${siblings.length ? (siblings.indexOf(target) % 4) * 90 : 0}`;
        revealObserver.observe(target);
    });
    revealMotionPreference.addEventListener('change', () => {
        if (!revealMotionPreference.matches) return;
        revealObserver.disconnect();
        revealTargets.forEach(target => target.classList.remove('reveal-pending'));
        runningReveals.forEach(animation => animation.cancel());
    });
}

// ===== BOOKING MODAL LOGIC =====
const modal = document.getElementById('bookingModal');
const closeModal = document.querySelector('.close-modal');
const bookingForm = document.getElementById('bookingForm');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const availableDays = document.querySelectorAll('.calendar-day.available');
let preSelectedService = '';
const dialog = modal.querySelector('[role="dialog"]');
let triggeringDay = null;
let hideModalTimer;
let backgroundElements = [];
let previousBodyOverflow = '';

const getDialogControls = () => Array.from(dialog.querySelectorAll(
    'button, input, select, textarea, a[href], [tabindex]'
)).filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);

function dismissBookingDialog() {
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('active');
    modal.inert = true;
    backgroundElements.forEach(([element, wasInert]) => {
        element.inert = wasInert;
    });
    backgroundElements = [];
    document.body.style.overflow = previousBodyOverflow;
    triggeringDay?.focus({ preventScroll: true });
    modal.setAttribute('aria-hidden', 'true');
    hideModalTimer = setTimeout(() => {
        modal.style.display = 'none';
    }, prefersReducedMotion ? 0 : 300);
}

document.addEventListener('keydown', event => {
    if (!modal.classList.contains('active')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        dismissBookingDialog();
    } else if (event.key === 'Tab') {
        const controls = getDialogControls();
        const first = controls[0] || dialog;
        const last = controls[controls.length - 1] || dialog;
        if (!controls.length || !controls.includes(document.activeElement)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

document.addEventListener('focusin', event => {
    if (modal.classList.contains('active') && !dialog.contains(event.target)) {
        (getDialogControls()[0] || dialog).focus();
    }
});

// Handle Select Service buttons
document.querySelectorAll('.select-service-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click if any
        preSelectedService = btn.getAttribute('data-service');

        // Scroll to booking section
        const bookingSection = document.getElementById('booking');
        const offsetTop = bookingSection.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight - 16;
        window.scrollTo({
            top: offsetTop,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
    });
});

// Open modal when clicking available date
availableDays.forEach(day => {
    const dateObj = new Date(day.dataset.date + 'T12:00:00');
    day.tabIndex = 0;
    day.setAttribute('role', 'button');
    day.setAttribute('aria-haspopup', 'dialog');
    day.setAttribute('aria-controls', 'bookingModal');
    day.setAttribute('aria-label', `Book ${dateObj.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    })}`);
    day.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            day.click();
        }
    });
    day.addEventListener('click', () => {
        if (modal.classList.contains('active')) return;
        clearTimeout(hideModalTimer);
        triggeringDay = day;
        const date = day.getAttribute('data-date');
        // Format date for display (e.g., "December 3, 2025")
        const dateObj = new Date(date + 'T12:00:00'); // Add time to prevent timezone issues
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        selectedDateDisplay.textContent = dateObj.toLocaleDateString('en-US', options);

        // Add active class to show modal
        modal.classList.add('active');
        modal.style.display = 'flex'; // Ensure display is flex before opacity transition
        modal.inert = false;
        modal.removeAttribute('aria-hidden');
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        backgroundElements = Array.from(document.body.children)
            .filter(element => element !== modal && !['SCRIPT', 'STYLE'].includes(element.tagName))
            .map(element => [element, element.inert]);
        backgroundElements.forEach(([element]) => { element.inert = true; });
        closeModal.focus({ preventScroll: true });

        // Pre-select service if one was chosen
        if (preSelectedService) {
            const serviceSelect = document.getElementById('service');
            serviceSelect.value = preSelectedService;
            // Reset after selection so it doesn't persist if they close and pick another date without clicking select again
            // preSelectedService = ''; // Optional: decide if you want it to persist or not. Let's keep it for now.
        }
    });
});

// Close modal
closeModal.addEventListener('click', dismissBookingDialog);

// Close when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        dismissBookingDialog();
    }
});

// Handle form submission
bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = bookingForm.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;

    // Show loading state
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // Get form data
    const formData = new FormData(bookingForm);
    const bookingData = Object.fromEntries(formData.entries());
    bookingData.date = selectedDateDisplay.textContent;

    // Prepare template parameters
    // These names must match the variables in your EmailJS email template
    const templateParams = {
        to_name: "PureHearted Studioz",
        from_name: bookingData.name,
        from_email: bookingData.email,
        service: bookingData.service,
        date: bookingData.date,
        time: bookingData.time,
        message: `New booking request for ${bookingData.service} on ${bookingData.date} at ${bookingData.time}`
    };

    // Send email using EmailJS
    // Replace 'YOUR_SERVICE_ID' and 'YOUR_TEMPLATE_ID' with actual IDs from EmailJS dashboard
    emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
        .then(function () {
            console.log('SUCCESS!');

            // Show success message
            submitBtn.textContent = 'Booking Confirmed! ✓';
            submitBtn.style.backgroundColor = '#4CAF50';

            setTimeout(() => {
                dismissBookingDialog();
                setTimeout(() => {
                    // Reset form
                    bookingForm.reset();
                    submitBtn.textContent = originalText;
                    submitBtn.style.backgroundColor = '';
                    submitBtn.disabled = false;
                }, 300);
            }, 1500);
        }, function (error) {
            console.log('FAILED...', error);
            submitBtn.textContent = 'Failed to send. Try again.';
            submitBtn.style.backgroundColor = '#f44336';
            submitBtn.disabled = false;

            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.backgroundColor = '';
            }, 3000);
        });
});
