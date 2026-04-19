/**
 * artisans.js — DesiDirect
 * Dynamically loads artisan profiles from localStorage
 * and renders them on the artisans page.
 *
 * Storage key: 'desi_artisans'
 * Each artisan: { uid, name, specialty, bio, location, joinedAt, avatar? }
 */

const ARTISANS_KEY = 'desi_artisans';

/* ─── Helpers ─── */
function loadArtisans() {
    try {
        return JSON.parse(localStorage.getItem(ARTISANS_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveArtisans(list) {
    localStorage.setItem(ARTISANS_KEY, JSON.stringify(list));
}

async function loadArtisansFromAPI() {
    try {
        const res = await fetch('http://localhost:5000/api/artisans');
        if (!res.ok) throw new Error('Network response was not ok');
        const artisans = await res.json();
        saveArtisans(artisans);
        return artisans;
    } catch (err) {
        console.error('API fetch error:', err);
        return loadArtisans();
    }
}

/** Register or update a producer profile in the artisans list */
function registerArtisanProfile(userData) {
    if (!userData || userData.role !== 'producer') return;

    const list = loadArtisans();
    const idx  = list.findIndex(a => a.uid === userData.uid);

    const profile = {
        uid:       userData.uid,
        name:      userData.name,
        email:     userData.email || '',
        specialty: userData.specialty || 'Artisan Craftsperson',
        bio:       userData.bio || `Passionate artisan bringing the soul of rural craftsmanship to the modern world.`,
        location:  userData.location || 'India',
        avatar:    userData.avatar || null,
        joinedAt:  userData.joinedAt || new Date().toISOString(),
    };

    if (idx === -1) {
        list.push(profile);
    } else {
        list[idx] = { ...list[idx], ...profile }; // merge — preserve extra fields
    }

    try {
        fetch('http://localhost:5000/api/artisans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
    } catch (e) { console.error('Error saving artisan to API', e); }

    saveArtisans(list);
}

/** Generate initials avatar color from name */
function nameToColor(name) {
    const colors = [
        '#2F4F4F', '#E2725B', '#F4A460', '#6B8E6B',
        '#8B6914', '#5B7FA6', '#9E5B5B', '#5B8B8B'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

/** Render a single artisan card */
function buildArtisanCard(artisan, isNew = false) {
    const initials   = artisan.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const bgColor    = nameToColor(artisan.name);
    const joinYear   = artisan.joinedAt ? new Date(artisan.joinedAt).getFullYear() : 2024;
    const newBadge   = isNew ? `<div class="artisan-new-badge">New</div>` : '';

    const avatarHTML = artisan.avatar
        ? `<img src="${artisan.avatar}" alt="${artisan.name}"
               style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 1.5rem;display:block;border:3px solid var(--glass-border);">`
        : `<div style="width:120px;height:120px;border-radius:50%;background:${bgColor};color:white;
                       display:flex;align-items:center;justify-content:center;font-size:2.5rem;
                       font-weight:700;margin:0 auto 1.5rem;font-family:'Outfit',sans-serif;
                       border:3px solid rgba(255,255,255,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.1);">
               ${initials}
           </div>`;

    const card = document.createElement('div');
    card.className = 'product-card glass-panel artisan-card tilt-card reveal';
    card.style.cssText = 'text-align:center;padding:2rem;position:relative;cursor:default;';
    card.innerHTML = `
        ${newBadge}
        ${avatarHTML}
        <h3 class="product-name" style="margin-bottom:0.25rem;">${artisan.name}</h3>
        <p class="category" style="margin-bottom:0.75rem;">${artisan.specialty}</p>
        <p style="color:#666;font-size:0.88rem;line-height:1.6;margin-bottom:0.5rem;min-height:60px;">
            ${artisan.bio}
        </p>
        <p style="color:#999;font-size:0.8rem;margin-bottom:1.5rem;">
            <i class='bx bx-map-pin' style="color:var(--secondary-color);"></i>
            ${artisan.location} &nbsp;·&nbsp;
            <i class='bx bx-calendar' style="color:var(--secondary-color);"></i>
            Joined ${joinYear}
        </p>
        <button class="cta-button outline ripple-btn" style="width:100%;"
                onclick="viewArtisanProducts('${artisan.uid}', '${artisan.name}')">
            <i class='bx bx-store'></i> View Shop
        </button>
    `;
    return card;
}

/** View artisan's products — jump to products page filtered by artisan name */
function viewArtisanProducts(uid, name) {
    sessionStorage.setItem('artisan_filter', name);
    window.location.href = 'products.html?artisan=' + encodeURIComponent(name);
}

/** Main render function — called on artisans.html load */
async function renderDynamicArtisans() {
    const grid = document.getElementById('artisans-dynamic-grid');
    if (!grid) return;

    const artisans = await loadArtisansFromAPI();

    if (artisans.length === 0) {
        // Show a "be first" placeholder
        grid.innerHTML = `
            <div class="glass-panel" style="text-align:center;padding:3rem 2rem;grid-column:1/-1;opacity:0.75;">
                <i class='bx bx-user-plus' style="font-size:3rem;color:var(--secondary-color);display:block;margin-bottom:1rem;"></i>
                <h3 style="color:var(--primary-color);margin-bottom:0.5rem;">Be the First Featured Artisan</h3>
                <p style="color:#666;font-size:0.9rem;">Sign up as an artisan to appear here.</p>
                <a href="signup.html" class="cta-button primary ripple-btn" style="display:inline-flex;margin-top:1.5rem;text-decoration:none;">
                    <i class='bx bx-user-plus'></i> Join as Artisan
                </a>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    // Sort: newest first
    const sorted = [...artisans].sort((a, b) =>
        new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0)
    );

    // Mark the 2 most recently joined as "New"
    sorted.forEach((artisan, i) => {
        const card = buildArtisanCard(artisan, i < 2);
        grid.appendChild(card);
    });

    // Re-run scroll reveal for newly added cards
    if (window._animationsLoaded) {
        setTimeout(() => {
            document.querySelectorAll('.artisan-card.reveal:not(.visible)').forEach(el => {
                setTimeout(() => el.classList.add('visible'), 100);
            });
            if (typeof initMagneticTilt === 'function') initMagneticTilt();
        }, 200);
    }
}

/* ─── Artisan "New" badge style ─── */
(function injectArtisanStyles() {
    if (document.getElementById('artisan-styles')) return;
    const style = document.createElement('style');
    style.id = 'artisan-styles';
    style.textContent = `
        .artisan-new-badge {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: var(--secondary-color);
            color: white;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.2rem 0.6rem;
            border-radius: 100px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            animation: badgePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .artisan-card {
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        /* Section title for dynamic artisans */
        .dynamic-artisans-header {
            text-align: center;
            padding: 3rem 0 2rem;
        }

        .dynamic-artisans-header h2 {
            font-size: 2.2rem;
            color: var(--primary-color);
            margin-bottom: 0.75rem;
        }

        .dynamic-artisans-header p {
            color: #666;
            font-size: 1rem;
        }

        .artisan-count-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(226, 114, 91, 0.1);
            color: var(--secondary-color);
            border: 1px solid rgba(226, 114, 91, 0.25);
            border-radius: 100px;
            padding: 0.25rem 0.85rem;
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }
    `;
    document.head.appendChild(style);
})();

/* ─── Init on DOM ready ─── */
document.addEventListener('DOMContentLoaded', renderDynamicArtisans);

/* Export for use in register.js / auth flow */
window.registerArtisanProfile  = registerArtisanProfile;
window.renderDynamicArtisans   = renderDynamicArtisans;
window.loadArtisans            = loadArtisans;
