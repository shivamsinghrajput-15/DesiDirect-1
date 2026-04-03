/**
 * DesiDirect — Premium Animations Suite
 * Inspired by Stitch MCP "Artisan Hearth" Design System
 */

(function () {
  'use strict';

  // Signal to app.js that this animations module is loaded
  window._animationsLoaded = true;

  /* =========================================================
     0. PAGE LOADER
  ========================================================= */
  function initPageLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader) return;

    // Hide loader after page load + small delay for bar animation
    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.classList.add('hidden');
        // Mark loader as seen so it never shows again this session
        sessionStorage.setItem('dd_loader_seen', '1');
      }, 1500);
    });
  }

  /* =========================================================
     1. CUSTOM CURSOR + TRAIL
  ========================================================= */
  function initCursorTrail() {
    const cursor = document.getElementById('custom-cursor');
    const trailContainer = document.getElementById('cursor-trail-container');
    if (!cursor || !trailContainer) return;

    // Only on non-touch devices
    if (window.matchMedia('(hover: none)').matches) {
      cursor.style.display = 'none';
      return;
    }

    let mouseX = -100, mouseY = -100;
    let curX = -100, curY = -100;

    // Smooth cursor follow
    function moveCursor() {
      curX += (mouseX - curX) * 0.18;
      curY += (mouseY - curY) * 0.18;
      cursor.style.left = curX + 'px';
      cursor.style.top  = curY + 'px';
      requestAnimationFrame(moveCursor);
    }
    moveCursor();

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Spawn trail dot
      spawnTrailDot(e.clientX, e.clientY);
    });

    // Enlarged cursor on interactive elements
    document.querySelectorAll('a, button, .product-card, .tilt-card, .wishlist-btn').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
    });

    let dotFrame = 0;
    function spawnTrailDot(x, y) {
      dotFrame++;
      if (dotFrame % 3 !== 0) return; // Every 3rd frame to control density

      const dot = document.createElement('div');
      dot.className = 'cursor-dot';
      const size = Math.random() * 7 + 4;
      const colors = ['#E2725B', '#F4A460', '#2F4F4F'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      dot.style.cssText = `
        left: ${x}px; top: ${y}px;
        width: ${size}px; height: ${size}px;
        background: ${color};
        opacity: 0.6;
      `;
      trailContainer.appendChild(dot);

      setTimeout(() => dot.remove(), 800);
    }
  }

  /* =========================================================
     2. SCROLL PROGRESS BAR
  ========================================================= */
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  /* =========================================================
     3. SCROLL REVEAL (Intersection Observer)
  ========================================================= */
  function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal, .stagger-children');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          // Trigger highlight underline animation
          const highlight = entry.target.querySelector('.section-title .highlight');
          if (highlight) {
            setTimeout(() => highlight.classList.add('underline-active'), 400);
          }

          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => observer.observe(el));
  }

  /* =========================================================
     4. HERO WORD SPLIT ANIMATION
  ========================================================= */
  function initHeroTextSplit() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;

    // Wrap each word
    const originalHTML = heroTitle.innerHTML;
    const words = [];

    // Parse text + span elements
    const fragment = document.createElement('div');
    fragment.innerHTML = originalHTML;

    function wrapTextNodes(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const parts = text.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach(part => {
          if (part.trim()) {
            const wordWrap = document.createElement('span');
            wordWrap.className = 'hero-word';
            const inner = document.createElement('span');
            inner.className = 'hero-word-inner';
            inner.textContent = part;
            wordWrap.appendChild(inner);
            frag.appendChild(wordWrap);
            words.push(inner);
          } else if (part) {
            frag.appendChild(document.createTextNode(part));
          }
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Preserve <span class="highlight"> etc.
        const clone = node.cloneNode(false);
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent;
            const parts = text.split(/(\s+)/);
            parts.forEach(part => {
              if (part.trim()) {
                const wordWrap = document.createElement('span');
                wordWrap.className = 'hero-word';
                const inner = document.createElement('span');
                inner.className = 'hero-word-inner';
                inner.textContent = part;
                wordWrap.appendChild(inner);
                clone.appendChild(wordWrap);
                words.push(inner);
              } else if (part) {
                clone.appendChild(document.createTextNode(part));
              }
            });
          } else {
            clone.appendChild(child.cloneNode(true));
          }
        });
        node.replaceWith(clone);
        return; // already processed
      }
    }

    heroTitle.innerHTML = '';
    fragment.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const parts = text.split(/(\s+)/);
        parts.forEach(part => {
          if (part.trim()) {
            const wordWrap = document.createElement('span');
            wordWrap.className = 'hero-word';
            const inner = document.createElement('span');
            inner.className = 'hero-word-inner';
            inner.textContent = part;
            wordWrap.appendChild(inner);
            heroTitle.appendChild(wordWrap);
            words.push(inner);
          } else if (part) {
            heroTitle.appendChild(document.createTextNode(part));
          }
        });
      } else {
        // It's a span (like .highlight)
        const spanText = node.textContent;
        const spanParts = spanText.split(/(\s+)/);
        spanParts.forEach(part => {
          if (part.trim()) {
            const wordWrap = document.createElement('span');
            wordWrap.className = 'hero-word';
            const inner = document.createElement('span');
            inner.className = 'hero-word-inner';
            // Apply original class styling
            if (node.className === 'highlight') inner.style.color = '#E2725B';
            inner.textContent = part;
            wordWrap.appendChild(inner);
            heroTitle.appendChild(wordWrap);
            words.push(inner);
          } else if (part) {
            heroTitle.appendChild(document.createTextNode(part));
          }
        });
      }
    });

    // Animate words in on page load
    setTimeout(() => {
      words.forEach((word, i) => {
        setTimeout(() => {
          word.classList.add('visible');
        }, 1700 + i * 110);
      });
    }, 0);
  }

  /* =========================================================
     5. 3D MAGNETIC TILT CARDS
  ========================================================= */
  function initMagneticTilt() {
    const cards = document.querySelectorAll('.tilt-card');

    cards.forEach(card => {
      // Add shine overlay
      if (!card.querySelector('.tilt-shine')) {
        const shine = document.createElement('div');
        shine.className = 'tilt-shine';
        card.appendChild(shine);
      }

      const shine = card.querySelector('.tilt-shine');

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        const rotateX = -(mouseY / (rect.height / 2)) * 10;
        const rotateY =  (mouseX / (rect.width / 2))  * 10;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;

        // Update shine position
        if (shine) {
          const shineX = ((mouseX / rect.width) * 100) + 50;
          const shineY = ((mouseY / rect.height) * 100) + 50;
          shine.style.background = `radial-gradient(ellipse at ${shineX}% ${shineY}%, rgba(255,255,255,0.3) 0%, transparent 65%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });

      card.addEventListener('mouseenter', () => {
        card.style.transition = 'box-shadow 0.4s ease';
      });
    });
  }

  /* =========================================================
     6. RIPPLE EFFECT ON BUTTONS
  ========================================================= */
  function initRippleButtons() {
    document.querySelectorAll('.ripple-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 1.5;

        const wave = document.createElement('span');
        wave.className = 'ripple-wave';
        wave.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          left: ${x - size / 2}px;
          top: ${y - size / 2}px;
        `;
        btn.appendChild(wave);
        setTimeout(() => wave.remove(), 650);
      });
    });
  }

  /* =========================================================
     7. MARQUEE SECTION INJECTION
  ========================================================= */
  function initMarquee() {
    const productsSection = document.querySelector('.products-section');
    if (!productsSection || document.querySelector('.marquee-section')) return;

    const items = [
      'Authentic Handmade Crafts',
      'Direct from Village Artisans',
      'Zero Middlemen',
      '100% Organic',
      'Empowering Rural Communities',
      'Curated Heritage Goods',
      'Sustainable & Ethical',
      'Artisanal Since 2024',
    ];

    const marqueeSection = document.createElement('div');
    marqueeSection.className = 'marquee-section';

    const track = document.createElement('div');
    track.className = 'marquee-track';

    // Duplicate for seamless loop
    [...items, ...items].forEach(text => {
      const item = document.createElement('div');
      item.className = 'marquee-item';
      item.innerHTML = `
        <span class="marquee-dot"></span>
        <span>${text}</span>
      `;
      track.appendChild(item);
    });

    marqueeSection.appendChild(track);
    productsSection.parentNode.insertBefore(marqueeSection, productsSection);
  }

  /* =========================================================
     8. BLOB BACKGROUND
  ========================================================= */
  function initBlobs() {
    if (document.querySelector('.blob-container')) return;
    const blobContainer = document.createElement('div');
    blobContainer.className = 'blob-container';
    blobContainer.innerHTML = `
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    `;
    document.body.insertBefore(blobContainer, document.body.firstChild);
  }

  /* =========================================================
     9. BACK TO TOP BUTTON
  ========================================================= */
  function initBackToTop() {
    if (document.getElementById('back-to-top')) return;
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.title = 'Back to top';
    btn.innerHTML = '<i class="bx bx-up-arrow-alt"></i>';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =========================================================
     10. HIGHLIGHT UNDERLINE OBSERVER
  ========================================================= */
  function initHighlightUnderlines() {
    const highlights = document.querySelectorAll('.section-title .highlight');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('underline-active'), 300);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    highlights.forEach(el => observer.observe(el));
  }

  /* =========================================================
     11. WISHLIST HEART ANIMATION
  ========================================================= */
  function initWishlistHearts() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        this.classList.toggle('active');
        const icon = this.querySelector('i');
        if (this.classList.contains('active')) {
          icon.className = 'bx bxs-heart';
          icon.style.color = '#E2725B';
        } else {
          icon.className = 'bx bx-heart';
          icon.style.color = '';
        }
      });
    });
  }

  /* =========================================================
     12. INJECT DOM HELPERS (Loader, Cursor, Progress)
  ========================================================= */
  // Flag: has the user already seen the intro loader this session?
  const LOADER_SEEN_KEY = 'dd_loader_seen';
  const isFirstVisit    = !sessionStorage.getItem(LOADER_SEEN_KEY);

  function injectDOMHelpers() {
    // Page Loader — only inject on first visit
    if (isFirstVisit && !document.getElementById('page-loader')) {
      const loaderDiv = document.createElement('div');
      loaderDiv.id = 'page-loader';
      loaderDiv.innerHTML = `
        <div class="loader-logo">DesiDirect</div>
        <div class="loader-bar-track">
          <div class="loader-bar"></div>
        </div>
      `;
      document.body.insertBefore(loaderDiv, document.body.firstChild);
    }

    // Scroll progress bar
    if (!document.getElementById('scroll-progress')) {
      const progress = document.createElement('div');
      progress.id = 'scroll-progress';
      document.body.insertBefore(progress, document.body.firstChild);
    }

    // Custom cursor
    if (!document.getElementById('custom-cursor')) {
      const cur = document.createElement('div');
      cur.id = 'custom-cursor';
      document.body.appendChild(cur);
    }

    // Trail container
    if (!document.getElementById('cursor-trail-container')) {
      const trail = document.createElement('div');
      trail.id = 'cursor-trail-container';
      document.body.appendChild(trail);
    }
  }

  /* =========================================================
     13. ADD REVEAL CLASSES TO EXISTING ELEMENTS
  ========================================================= */
  function addRevealClasses() {
    // Section headers
    document.querySelectorAll('.section-header').forEach(el => {
      el.classList.add('reveal');
    });

    // Product grid as stagger parent
    document.querySelectorAll('.product-grid').forEach(el => {
      el.classList.add('stagger-children');
    });

    // Product cards get tilt
    document.querySelectorAll('.product-card').forEach(el => {
      el.classList.add('tilt-card');
    });

    // Primary CTA buttons get ripple + pulse
    document.querySelectorAll('.cta-button.primary, .cta-button.secondary').forEach(el => {
      el.classList.add('ripple-btn');
    });

    // Story section
    const storyContent = document.querySelector('.story-content');
    if (storyContent) storyContent.classList.add('reveal', 'reveal-left');

    const storyVisual = document.querySelector('.story-visual');
    if (storyVisual) storyVisual.classList.add('reveal', 'reveal-right');

    // Story metrics
    const storyMetrics = document.querySelector('.story-metrics');
    if (storyMetrics) storyMetrics.classList.add('stagger-children');

    // Footer sections
    document.querySelectorAll('.footer-grid > *').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i * 0.12) + 's';
    });
  }

  /* =========================================================
     14. ANIMATED COUNTER ENHANCEMENT (easing + glow)
  ========================================================= */
  function initEnhancedCounters() {
    const counters = document.querySelectorAll('.counter');

    counters.forEach(counter => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          const target = +counter.getAttribute('data-target');
          const duration = 1800;
          const startTime = performance.now();
          const startValue = 0;

          function ease(t) {
            return 1 - Math.pow(1 - t, 4); // ease-out-quart
          }

          function updateCount(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = ease(progress);
            const current = Math.round(startValue + (target - startValue) * easedProgress);
            counter.textContent = current;

            if (progress < 1) {
              requestAnimationFrame(updateCount);
            } else {
              counter.textContent = target;
              // Glow effect on finish
              counter.style.textShadow = '0 0 30px rgba(226, 114, 91, 0.5)';
              setTimeout(() => { counter.style.textShadow = ''; }, 1000);
            }
          }

          requestAnimationFrame(updateCount);
          observer.disconnect();
        }
      }, { threshold: 0.5 });

      observer.observe(counter);
    });
  }

  /* =========================================================
     15. PARALLAX ENHANCEMENT (smoother + more layers)
  ========================================================= */
  function initParallaxEnhanced() {
    const parallaxBg = document.querySelector('.parallax-bg');
    const floatingCards = document.querySelectorAll('.floating-card');
    const blobs = document.querySelectorAll('.blob');

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY;

          if (parallaxBg) {
            parallaxBg.style.transform = `translateY(${scrolled * 0.35}px)`;
          }

          floatingCards.forEach(card => {
            const speed = parseFloat(card.getAttribute('data-speed') || '1');
            const yPos = -(scrolled * speed * 0.08);
            card.style.transform = `translateY(${yPos}px)`;
          });

          // Blobs subtle parallax
          blobs.forEach((blob, i) => {
            const factor = 0.03 + i * 0.01;
            blob.style.transform = `translateY(${scrolled * factor}px)`;
          });

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* =========================================================
     16. SMOOTH NAV LINK HOVER EFFECT (highlight dot)
  ========================================================= */
  function initNavHover() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
      link.addEventListener('mouseenter', function () {
        this.style.color = '#E2725B';
      });
      link.addEventListener('mouseleave', function () {
        this.style.color = '';
      });
    });
  }

  /* =========================================================
     INIT ALL
  ========================================================= */
  function init() {
    injectDOMHelpers();
    addRevealClasses();

    // Wait for DOM stabilize
    requestAnimationFrame(() => {
      initPageLoader();
      initScrollProgress();
      initBlobs();
      initMarquee();
      initBackToTop();
      initHeroTextSplit();
      initScrollReveal();
      initMagneticTilt();
      initRippleButtons();
      initWishlistHearts();
      initHighlightUnderlines();
      initEnhancedCounters();
      initParallaxEnhanced();
      initNavHover();

      // Cursor trail last (needs DOM ready)
      setTimeout(initCursorTrail, 100);
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
