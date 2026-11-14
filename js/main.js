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
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const target = entry.target;
            const delay = Number(target.dataset.revealDelay);
            target.classList.remove('reveal-pending');
            if (typeof target.animate !== 'function') {
                observer.unobserve(target);
                return;
            }

            const animation = target.animate(
                [
                    { opacity: 0, transform: 'translateY(22px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ],
                {
                    duration: 650,
                    delay,
                    easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
                    fill: 'backwards'
                }
            );
            animation.onfinish = () => animation.cancel();
            observer.unobserve(target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

    revealTargets.forEach((target, index) => {
        target.classList.add('reveal-pending');
        target.dataset.revealDelay = `${(index % 3) * 80}`;
        revealObserver.observe(target);
    });
}

// ===== BOOKING MODAL LOGIC =====
const modal = document.getElementById('bookingModal');
const closeModal = document.querySelector('.close-modal');
const bookingForm = document.getElementById('bookingForm');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const availableDays = document.querySelectorAll('.calendar-day.available');
let preSelectedService = '';

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
    day.addEventListener('click', () => {
        const date = day.getAttribute('data-date');
        // Format date for display (e.g., "December 3, 2025")
        const dateObj = new Date(date + 'T12:00:00'); // Add time to prevent timezone issues
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        selectedDateDisplay.textContent = dateObj.toLocaleDateString('en-US', options);

        // Add active class to show modal
        modal.classList.add('active');
        modal.style.display = 'flex'; // Ensure display is flex before opacity transition

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
closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // Wait for transition
});

// Close when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
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
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
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
