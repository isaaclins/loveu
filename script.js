// Smooth scroll animation observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe all elements with data-animate attribute
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('[data-animate]');
    animateElements.forEach(el => observer.observe(el));
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            const navHeight = document.querySelector('.nav').offsetHeight;
            const targetPosition = target.offsetTop - navHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add subtle parallax effect to hero
let lastScrollTop = 0;
const hero = document.querySelector('.hero-content');

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (hero && scrollTop < window.innerHeight) {
        const parallaxValue = scrollTop * 0.3;
        hero.style.transform = `translateY(${parallaxValue}px)`;
        hero.style.opacity = 1 - (scrollTop / window.innerHeight) * 0.5;
    }
    
    lastScrollTop = scrollTop;
}, { passive: true });

// Add active state to navigation based on scroll position
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    const navHeight = document.querySelector('.nav').offsetHeight;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.pageYOffset >= (sectionTop - navHeight - 100)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}, { passive: true });

// Add cursor effect (optional enhancement)
const createCursor = () => {
    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    // Add hover effect on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .work-card, .craft-item');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });
};

// Uncomment to enable custom cursor
// createCursor();

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Keyboard navigation enhancement
document.addEventListener('keydown', (e) => {
    // Press 'h' to go to top
    if (e.key === 'h' || e.key === 'H') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// Console easter egg
console.log('%c👋 Hallo! Willkommen auf meinem Portfolio.', 'font-size: 20px; font-weight: bold; color: #2d5c8f;');
console.log('%cIch bin Kaya – Kreative Gestalterin mit Leidenschaft für präzises Handwerk.', 'font-size: 14px; color: #666;');
console.log('%cInteressiert an einer Zusammenarbeit? Lass uns reden!', 'font-size: 14px; color: #4a7fb8;');

