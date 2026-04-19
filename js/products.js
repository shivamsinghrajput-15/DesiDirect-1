// ============================================================
// DesiDirect – js/products.js
// Product management module – Firestore-backed (shared DB)
// localStorage is kept as a write-through cache / fallback.
// ============================================================

const STORAGE_KEY = 'desi_products';

// ── Firebase Firestore reference (compat SDK, loaded via CDN) ──────────────
// firebase-app and firebase-firestore compat scripts must be loaded BEFORE
// this file in any page that uses it.
function _getFS() {
    try { return firebase.firestore(); } catch(e) { return null; }
}

// ── localStorage helpers (cache / offline fallback) ────────────────────────
function _cacheGet() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function _cacheSet(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch(e) {}
}

// ────────────────────────────────────────────────────────────────────────────
// loadProducts()
// Synchronous fallback – returns the localStorage cache immediately.
// Use loadProductsAsync() / loadProductsFromFirestore() for fresh data.
// ────────────────────────────────────────────────────────────────────────────
function loadProducts() {
    return _cacheGet();
}

// ────────────────────────────────────────────────────────────────────────────
// loadProductsFromFirestore() -> loadProductsFromAPI()
// Returns a Promise<Array> of all approved/active products from API.
// Also refreshes the local cache so offline/late loads still work.
// ────────────────────────────────────────────────────────────────────────────
async function loadProductsFromFirestore(filterArtisan) {
    try {
        const res = await fetch('http://localhost:5000/api/products');
        if (!res.ok) throw new Error('Network response was not ok');
        const products = await res.json();
        
        console.log('[DesiDirect] Loaded', products.length, 'products from API.');
        
        let filtered = products;
        if (filterArtisan) {
            filtered = products.filter(p => p.artisanName === filterArtisan);
        } else {
            _cacheSet(products);
        }
        return filtered;
    } catch (err) {
        console.error('[DesiDirect] API read error:', err.message);
        const cached = _cacheGet();
        if (filterArtisan) return cached.filter(p => p.artisanName === filterArtisan);
        return cached;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// saveProducts() – kept for admin.js compat (writes cache only)
// ────────────────────────────────────────────────────────────────────────────
function saveProducts(products) {
    _cacheSet(products);
}

// ────────────────────────────────────────────────────────────────────────────
// addProduct()
// Returns a Promise that resolves to the new product object.
// ────────────────────────────────────────────────────────────────────────────
async function addProduct(data) {
    let producerUid = '';
    try {
        const u = JSON.parse(localStorage.getItem('desi_user') || '{}');
        producerUid = u.uid || u.id || '';
    } catch(e) {}

    const artisan = data.artisanName || 'Local Artisan';
    const nowISO  = new Date().toISOString();

    const product = {
        id:           Date.now(),           // numeric id for cart / wishlist compat
        productName:  data.productName  || '',
        name:         data.productName  || '',
        price:        parseInt(data.price) || 0,
        stock:        parseInt(data.stock) || 0,
        category:     data.category     || 'Handicrafts',
        description:  data.description  || '',
        image:        data.image        || '',
        artisanName:  artisan,
        producerName: artisan,
        producerId:   producerUid,
        status:       'approved',
        uploadedAt:   nowISO
    };

    // ── Write to API (shared) ──
    try {
        const res = await fetch('http://localhost:5000/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        if (res.ok) {
            const savedProduct = await res.json();
            product._docId = savedProduct._id;
        }
    } catch(err) {
        console.error('API write error:', err);
    }

    // ── Also update localStorage cache ──
    const cached = _cacheGet();
    cached.push(product);
    _cacheSet(cached);

    return product;
}

// ────────────────────────────────────────────────────────────────────────────
// deleteProduct()
// id: numeric id (from product.id)
// ────────────────────────────────────────────────────────────────────────────
async function deleteProduct(id) {
    const numId = parseInt(id);

    // ── Find product _docId from cache ──
    const cache = _cacheGet();
    const product = cache.find(p => p.id === numId);

    // ── Delete from API ──
    if (product && product._docId) {
        try {
            await fetch(`http://localhost:5000/api/products/${product._docId}`, {
                method: 'DELETE'
            });
        } catch(err) {
            console.error('API delete error:', err);
        }
    }

    // ── Remove from cache ──
    _cacheSet(cache.filter(p => p.id !== numId));
}

// ────────────────────────────────────────────────────────────────────────────
// editProduct()
// id: numeric id; updatedData: partial product fields
// ────────────────────────────────────────────────────────────────────────────
async function editProduct(id, updatedData) {
    const numId = parseInt(id);
    const newName = updatedData.productName;

    const patch = {
        ...(newName            && { productName: newName, name: newName }),
        ...(updatedData.price  && { price: parseInt(updatedData.price) }),
        ...(updatedData.stock  !== undefined && { stock: parseInt(updatedData.stock) }),
        ...(updatedData.category    && { category: updatedData.category }),
        ...(updatedData.description !== undefined && { description: updatedData.description }),
        ...(updatedData.image  && { image: updatedData.image }),
        editedAt: new Date().toISOString()
    };

    // ── Find product _docId from cache ──
    const cache = _cacheGet();
    const product = cache.find(p => p.id === numId);

    // ── Update in API ──
    if (product && product._docId) {
        try {
            await fetch(`http://localhost:5000/api/products/${product._docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            });
        } catch(err) {
            console.error('API update error:', err);
        }
    }

    // ── Update in cache ──
    _cacheSet(cache.map(p => {
        if (p.id !== numId) return p;
        return { ...p, ...patch };
    }));
}

// ────────────────────────────────────────────────────────────────────────────
// renderProductCards()
// mode: 'customer' | 'dashboard'
// ────────────────────────────────────────────────────────────────────────────
function renderProductCards(products, container, mode) {
    mode = mode || 'customer';
    container.innerHTML = '';

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:4rem 2rem; color:#999;">
                <i class='bx bx-package' style="font-size:3rem; display:block; margin-bottom:1rem; opacity:0.4;"></i>
                ${mode === 'dashboard'
                    ? 'No products listed yet. Add your first product above!'
                    : 'No products available yet — check back soon!'}
            </div>`;
        return;
    }

    products.forEach(p => {
        const imgHTML = p.image
            ? `<img src="${p.image}" alt="${p.productName}" class="product-img" style="object-fit:cover; height:200px; width:100%;">`
            : `<div style="height:200px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f5ede8,#fff3ed);font-size:4rem;">🛍️</div>`;

        const stockBadge = p.stock > 0
            ? `<span style="font-size:0.75rem;color:#2ecc71;font-weight:600;"><i class='bx bx-check-circle'></i> In Stock (${p.stock})</span>`
            : `<span style="font-size:0.75rem;color:#e74c3c;font-weight:600;"><i class='bx bx-x-circle'></i> Out of Stock</span>`;

        const uploadDate = p.uploadedAt
            ? new Date(p.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '–';

        const card = document.createElement('div');

        if (mode === 'customer') {
            card.className = 'product-card glass-panel';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="product-image-container" style="position:relative; overflow:hidden;">
                    ${imgHTML}
                    <button class="wishlist-btn" onclick="addToWishlist(${p.id}, event)" title="Add to Wishlist"><i class='bx bx-heart'></i></button>
                    <span style="position:absolute;top:10px;left:10px;background:var(--secondary-color);color:white;font-size:0.7rem;padding:3px 10px;border-radius:20px;font-weight:700;">NEW</span>
                </div>
                <div class="product-details">
                    <div class="product-meta">
                        <span class="category">${p.category}</span>
                        <div class="rating"><i class='bx bxs-star'></i> 4.8</div>
                    </div>
                    <h3 class="product-name">${p.productName || p.name}</h3>
                    <p class="artisan-credit">By ${p.artisanName}</p>
                    <div style="margin-bottom:0.5rem;">${stockBadge}</div>
                    <div class="product-footer">
                        <span class="price">₹${(p.price || 0).toLocaleString('en-IN')}</span>
                        <button class="add-to-cart-btn" data-cart-id="${p.id}" onclick="addToCart(${p.id})">
                            <i class='bx bx-cart-add'></i>
                        </button>
                    </div>
                </div>`;
        } else {
            // dashboard mode
            card.className = 'glass-panel';
            card.style.cssText = 'padding:1.25rem; display:flex; gap:1rem; align-items:flex-start; border-radius:16px; margin-bottom:1rem;';
            card.setAttribute('data-product-id', p.id);
            card.innerHTML = `
                <div style="width:80px;height:80px;border-radius:12px;overflow:hidden;flex-shrink:0;background:#f5ede8;display:flex;align-items:center;justify-content:center;font-size:2rem;">
                    ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;" alt="${p.productName}">` : '🛍️'}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
                        <div>
                            <h4 style="margin:0 0 0.2rem;color:var(--primary-color);font-size:1rem;">${p.productName || p.name}</h4>
                            <span style="font-size:0.78rem;color:#888;">${p.category} · Listed ${uploadDate}</span>
                        </div>
                        <span style="font-weight:700;color:var(--secondary-color);font-size:1.05rem;">₹${(p.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div style="margin-top:0.6rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                        ${stockBadge}
                        <div style="margin-left:auto;display:flex;gap:0.5rem;">
                            <button onclick="openEditModal(${p.id})"
                                style="padding:0.3rem 0.9rem;border:1px solid var(--primary-color);background:white;color:var(--primary-color);border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;">
                                <i class='bx bx-edit'></i> Edit
                            </button>
                            <button onclick="confirmDelete(${p.id})"
                                style="padding:0.3rem 0.9rem;border:none;background:#fee2e2;color:#e74c3c;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;">
                                <i class='bx bx-trash'></i> Delete
                            </button>
                        </div>
                    </div>
                </div>`;
        }

        container.appendChild(card);
    });
}

// ────────────────────────────────────────────────────────────────────────────
// requireAuth() – shows sign-in prompt overlay if not logged in
// ────────────────────────────────────────────────────────────────────────────
function requireAuth(action) {
    try {
        const user = JSON.parse(localStorage.getItem('desi_user') || 'null');
        if (user && user.uid) return true;
    } catch (e) {}

    const existing = document.getElementById('_authPromptOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = '_authPromptOverlay';
    overlay.style.cssText = [
        'position:fixed','inset:0','z-index:99999',
        'display:flex','align-items:center','justify-content:center',
        'background:rgba(0,0,0,0.55)','backdrop-filter:blur(6px)',
        'animation:fadeIn .2s ease',
    ].join(';');

    const returnUrl = encodeURIComponent(window.location.href);
    overlay.innerHTML = `
        <div style="
            background:var(--background-light, #fff);
            border-radius:24px;
            padding:2.5rem 2rem;
            max-width:380px;
            width:90%;
            text-align:center;
            box-shadow:0 20px 60px rgba(0,0,0,0.3);
            position:relative;
        ">
            <button onclick="document.getElementById('_authPromptOverlay').remove()"
                style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#999;line-height:1;"
                aria-label="Close">&times;</button>
            <div style="font-size:3rem;margin-bottom:0.75rem;">🔐</div>
            <h3 style="margin:0 0 0.5rem;color:var(--primary-color,#2F4F4F);font-size:1.3rem;">Sign In Required</h3>
            <p style="color:#666;margin:0 0 1.75rem;font-size:0.95rem;line-height:1.5;">
                Please sign in to <strong>${action}</strong>.<br>
                Join our community of artisan lovers!
            </p>
            <a href="login.html?next=${returnUrl}"
               style="display:inline-block;padding:0.8rem 2rem;background:var(--secondary-color,#E2725B);color:white;border-radius:50px;text-decoration:none;font-weight:700;font-size:1rem;width:100%;box-sizing:border-box;transition:opacity .2s;"
               onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">
               <i class='bx bx-log-in' style='margin-right:6px;'></i>Sign In
            </a>
            <a href="register.html"
               style="display:block;margin-top:0.85rem;color:var(--primary-color,#2F4F4F);font-size:0.88rem;text-decoration:none;">
               No account? <strong>Register free ›</strong>
            </a>
        </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    return false;
}

// ────────────────────────────────────────────────────────────────────────────
// addToWishlist()
// ────────────────────────────────────────────────────────────────────────────
function addToWishlist(productId, event) {
    if (event) event.stopPropagation();
    if (!requireAuth('add to wishlist')) return;

    // Try Firestore cache first, then fall back to localStorage cache
    const products = loadProducts();
    const product  = products.find(p => p.id === productId);
    if (!product) return;

    try {
        const wishlist = JSON.parse(localStorage.getItem('desi_wishlist') || '[]');
        if (!wishlist.find(i => i.id === productId)) {
            wishlist.push({ id: product.id, productName: product.productName,
                            price: product.price, image: product.image,
                            artisanName: product.artisanName });
            localStorage.setItem('desi_wishlist', JSON.stringify(wishlist));
        }
        const btn = event ? event.currentTarget : document.querySelector(`[onclick*="addToWishlist(${productId}"]`);
        if (btn) {
            btn.innerHTML = "<i class='bx bxs-heart' style='color:#e74c3c;'></i>";
            btn.title     = 'Added to wishlist!';
        }
    } catch (e) { console.error('Wishlist error:', e); }
}

// ────────────────────────────────────────────────────────────────────────────
// addToCart()
// ────────────────────────────────────────────────────────────────────────────
function addToCart(productId) {
    if (!requireAuth('add to cart')) return;

    const products = loadProducts();
    const product  = products.find(p => p.id === productId);
    if (!product) return;

    const CART_KEY = 'desi_cart';
    let cart;
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { cart = []; }

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id:          product.id,
            productName: product.productName,
            price:       product.price,
            image:       product.image,
            artisanName: product.artisanName,
            qty:         1
        });
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    const btn = document.querySelector(`[data-cart-id="${productId}"]`);
    if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML  = '<i class="bx bx-check"></i>';
        btn.style.background = '#2ecc71';
        btn.style.color      = 'white';
        setTimeout(() => {
            btn.innerHTML        = original;
            btn.style.background = '';
            btn.style.color      = '';
        }, 1200);
    }

    if (typeof updateCartBadges === 'function') updateCartBadges();
}
