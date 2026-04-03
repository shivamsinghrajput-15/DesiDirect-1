document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. Navigation Scroll Effect ----
    const nav = document.querySelector('nav');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // ---- 2. Parallax Effect & Floating Cards ----
    const parallaxBg = document.querySelector('.parallax-bg');
    const floatingCards = document.querySelectorAll('.floating-card');

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;

        // Background parallax (moves slower than scroll)
        if (parallaxBg) {
            parallaxBg.style.transform = `translateY(${scrolled * 0.4}px)`;
        }

        // Floating cards parallax
        floatingCards.forEach(card => {
            const speed = card.getAttribute('data-speed') || 1;
            const yPos = -(scrolled * speed * 0.1);
            card.style.transform = `translateY(${yPos}px)`;
        });
    });

    // ---- 3. Smooth Scroll for Anchor Links ----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ---- 4. Number Counter Animation ----
    // NOTE: Enhanced version handled by animations.js (eased, glow finish)
    // Legacy fallback only fires if animations.js is NOT loaded
    if (typeof window._animationsLoaded === 'undefined') {
        const counters = document.querySelectorAll('.counter');
        const speed = 200;

        const animateCounters = () => {
            counters.forEach(counter => {
                const updateCount = () => {
                    const target = +counter.getAttribute('data-target');
                    const count = +counter.innerText;
                    const inc = target / speed;
                    if (count < target) {
                        counter.innerText = Math.ceil(count + inc);
                        setTimeout(updateCount, 20);
                    } else {
                        counter.innerText = target;
                    }
                };
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        updateCount();
                        observer.disconnect();
                    }
                });
                observer.observe(counter);
            });
        };
        animateCounters();
    }

    // ---- 6. Session Management & Role Guards ----
    // Defined HERE — before the canvas early-return — so they run on EVERY page.

    function checkSession() {
        const userJson = localStorage.getItem('desi_user');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);

                // Find all nav actions containers
                const navActionsCollection = document.querySelectorAll('nav .nav-actions');

                navActionsCollection.forEach(navActions => {
                    // Find the sign in button by text
                    const signInBtn = Array.from(navActions.children).find(el => el.textContent.replace(/\s+/g, ' ').trim() === 'Sign In');

                    if (signInBtn) {
                        // Create profile dropdown UI
                        const profileDropdown = document.createElement('div');
                        profileDropdown.className = 'profile-dropdown';
                        profileDropdown.innerHTML = `
                            <div class="profile-toggle">
                                <div class="avatar"><i class='bx bxs-user'></i></div>
                                <span class="user-name">${user.name.split(' ')[0]}</span>
                                <i class='bx bx-chevron-down'></i>
                            </div>
                            <div class="dropdown-menu">
                                <div class="dropdown-header">
                                    <div class="header-avatar"><i class='bx bxs-user'></i></div>
                                    <div class="header-info">
                                        <div class="header-name">${user.name}</div>
                                        <div class="header-email">${user.email || 'user@desidirect.com'}</div>
                                    </div>
                                </div>
                                <div class="dropdown-divider"></div>
                                <a href="${user.role === 'producer' ? 'producer-dashboard.html' : (user.role === 'admin' ? 'admin.html' : 'account.html')}"><i class='bx bx-user-circle'></i> My Account</a>
                                <a href="#"><i class='bx bx-package'></i> Orders</a>
                                <a href="cart.html"><i class='bx bx-cart'></i> My Cart</a>
                                <div class="dropdown-divider"></div>
                                <a href="#" onclick="logout(event)" class="logout-btn"><i class='bx bx-log-out'></i> Logout</a>
                            </div>
                        `;

                        navActions.replaceChild(profileDropdown, signInBtn);
                    }
                });

                // ---- Role-Based Page Guards ----
                const path = window.location.pathname;
                const pageName = path.split('/').pop() || 'index.html';

                const customerOnlyPages = [
                    'marketplace.html', 'cart.html', 'checkout.html',
                    'products.html', 'product-details.html',
                    'payment.html', 'confirmation.html'
                ];
                const producerOnlyPages = ['producer-dashboard.html'];
                const adminOnlyPages = ['admin.html'];

                if (path.endsWith('admin-login.html')) {
                    if (user.role === 'admin') window.location.href = 'admin.html';
                } else if (path.endsWith('login.html') || path.endsWith('signup.html')) {
                    if (user.role === 'producer') window.location.href = 'producer-dashboard.html';
                    else if (user.role === 'admin') window.location.href = 'admin.html';
                    else window.location.href = 'marketplace.html';
                } else if (customerOnlyPages.some(p => pageName === p)) {
                    if (user.role === 'producer') window.location.href = 'producer-dashboard.html';
                    else if (user.role === 'admin') window.location.href = 'admin.html';
                } else if (producerOnlyPages.some(p => pageName === p)) {
                    if (user.role === 'customer') window.location.href = 'marketplace.html';
                    else if (user.role === 'admin') window.location.href = 'admin.html';
                } else if (adminOnlyPages.some(p => pageName === p)) {
                    if (user.role === 'producer') window.location.href = 'producer-dashboard.html';
                    else if (user.role === 'customer') window.location.href = 'marketplace.html';
                }
            } catch (e) {
                console.error('Session parsing error:', e);
            }
        }
    }

    window.logout = function (e) {
        if (e) e.preventDefault();
        localStorage.removeItem('desi_user');
        window.location.href = 'index.html';
    };

    checkSession();

    // ---- 7. Particle Canvas Effect (auth/home pages only) ----
    const canvas = document.getElementById('particles');
    if (!canvas) return;   // Only continues if this page has the particles canvas

    const ctx = canvas.getContext('2d');
    let particlesArray = [];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Handle Window Resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 1 - 0.5;
            this.speedY = Math.random() * 1 - 0.5;
            // Warm earth colours (Gold/Terracotta/Forest tones mixed slightly)
            const colors = ['rgba(244, 164, 96, 0.4)', 'rgba(226, 114, 91, 0.3)', 'rgba(253, 251, 247, 0.5)'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
            if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particlesArray = [];
        const numberOfParticles = (canvas.width * canvas.height) / 15000;
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
        }
        requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();
});
