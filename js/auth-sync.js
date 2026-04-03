/**
 * auth-sync.js  — ES module, deferred by default (runs after DOM is ready)
 * Responsibilities:
 *  1. Fallback session check — replaces "Sign In" with profile dropdown
 *     if app.js missed it (e.g. whitespace mismatch or load-order issue)
 *  2. Wires up the profile dropdown click-to-toggle on every page
 *  3. Exposes window.logout so inline onclick handlers work
 */

// ── helpers ──────────────────────────────────────────────────────────────────

/** Normalise inner whitespace so "Sign\n   In" === "Sign In" */
const normaliseText = el => el.textContent.replace(/\s+/g, ' ').trim();

function buildProfileDropdown(user) {
    const accountHref =
        user.role === 'producer' ? 'producer-dashboard.html'
      : user.role === 'admin'    ? 'admin.html'
      : 'account.html';

    const div = document.createElement('div');
    div.className = 'profile-dropdown';
    div.innerHTML = `
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
            <a href="${accountHref}"><i class='bx bx-user-circle'></i> My Account</a>
            <a href="#"><i class='bx bx-package'></i> Orders</a>
            <a href="cart.html"><i class='bx bx-cart'></i> My Cart</a>
            <div class="dropdown-divider"></div>
            <a href="#" onclick="window.logout(event)" class="logout-btn">
                <i class='bx bx-log-out'></i> Logout
            </a>
        </div>`;
    return div;
}

// ── session check ─────────────────────────────────────────────────────────────

function syncNav() {
    const raw = localStorage.getItem('desi_user');
    if (!raw) return;

    let user;
    try { user = JSON.parse(raw); } catch { return; }

    document.querySelectorAll('nav .nav-actions').forEach(navActions => {
        // Skip if already replaced (app.js may have done it first)
        if (navActions.querySelector('.profile-dropdown')) return;

        const signInBtn = Array.from(navActions.children)
            .find(el => normaliseText(el) === 'Sign In');

        if (signInBtn) {
            navActions.replaceChild(buildProfileDropdown(user), signInBtn);
        }
    });

    wireDropdowns();
}

// ── dropdown toggle ──────────────────────────────────────────────────────────

function wireDropdowns() {
    document.querySelectorAll('.profile-dropdown').forEach(dropdown => {
        const toggle = dropdown.querySelector('.profile-toggle');
        if (!toggle || toggle._wired) return;
        toggle._wired = true;

        toggle.addEventListener('click', e => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
    });

    // Close on outside click (register once)
    if (!document._dropdownOutsideWired) {
        document._dropdownOutsideWired = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('.profile-dropdown.open')
                    .forEach(d => d.classList.remove('open'));
        });
    }
}

// ── logout ───────────────────────────────────────────────────────────────────

window.logout = function(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('desi_user');
    window.location.href = 'index.html';
};

// ── run ───────────────────────────────────────────────────────────────────────
// Modules are deferred — DOM is already ready when this executes.
syncNav();
