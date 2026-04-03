// ============================================================
// DesiDirect – js/products.js
// Central product management module (localStorage-backed)
// ============================================================

const STORAGE_KEY = 'desi_products';

// ---- loadProducts ------------------------------------------------
// Returns the full array of all products from localStorage
function loadProducts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

// ---- saveProducts ------------------------------------------------
function saveProducts(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// ---- addProduct --------------------------------------------------
// Accepts a plain object; assigns a unique id and uploadedAt timestamp
function addProduct(data) {
    const products = loadProducts();
    const product = {
        id:           Date.now(),
        productName:  data.productName  || '',
        price:        parseInt(data.price) || 0,
        stock:        parseInt(data.stock) || 0,
        category:     data.category     || 'Handicrafts',
        description:  data.description  || '',
        image:        data.image        || '',   // base64 dataURL or ''
        artisanName:  data.artisanName  || 'Local Artisan',
        uploadedAt:   new Date().toISOString()
    };
    products.push(product);
    saveProducts(products);
    return product;
}

// ---- deleteProduct -----------------------------------------------
function deleteProduct(id) {
    const products = loadProducts().filter(p => p.id !== parseInt(id));
    saveProducts(products);
}

// ---- editProduct -------------------------------------------------
function editProduct(id, updatedData) {
    const products = loadProducts().map(p => {
        if (p.id !== parseInt(id)) return p;
        return {
            ...p,
            productName:  updatedData.productName  || p.productName,
            price:        parseInt(updatedData.price)  || p.price,
            stock:        parseInt(updatedData.stock)  || p.stock,
            category:     updatedData.category     || p.category,
            description:  updatedData.description  !== undefined ? updatedData.description : p.description,
            image:        updatedData.image        || p.image,
            editedAt:     new Date().toISOString()
        };
    });
    saveProducts(products);
}

// ---- renderProductCards ------------------------------------------
// mode: 'customer' | 'dashboard'
// container: DOM element to append cards into
function renderProductCards(products, container, mode = 'customer') {
    container.innerHTML = '';

    if (products.length === 0) {
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

        const uploadDate = new Date(p.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const card = document.createElement('div');

        if (mode === 'customer') {
            card.className = 'product-card glass-panel';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="product-image-container" style="position:relative; overflow:hidden;">
                    ${imgHTML}
                    <button class="wishlist-btn"><i class='bx bx-heart'></i></button>
                    <span style="position:absolute;top:10px;left:10px;background:var(--secondary-color);color:white;font-size:0.7rem;padding:3px 10px;border-radius:20px;font-weight:700;">NEW</span>
                </div>
                <div class="product-details">
                    <div class="product-meta">
                        <span class="category">${p.category}</span>
                        <div class="rating"><i class='bx bxs-star'></i> 4.8</div>
                    </div>
                    <h3 class="product-name">${p.productName}</h3>
                    <p class="artisan-credit">By ${p.artisanName}</p>
                    <div style="margin-bottom:0.5rem;">${stockBadge}</div>
                    <div class="product-footer">
                        <span class="price">₹${p.price.toLocaleString('en-IN')}</span>
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
                            <h4 style="margin:0 0 0.2rem;color:var(--primary-color);font-size:1rem;">${p.productName}</h4>
                            <span style="font-size:0.78rem;color:#888;">${p.category} · Listed ${uploadDate}</span>
                        </div>
                        <span style="font-weight:700;color:var(--secondary-color);font-size:1.05rem;">₹${p.price.toLocaleString('en-IN')}</span>
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

// ---- addToCart ---------------------------------------------------
// Called from customer card "Add to Cart" buttons
function addToCart(productId) {
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

    // Visual feedback on the button
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

    // Update nav badge across pages
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('nav .nav-actions a span').forEach(badge => {
        badge.textContent   = totalQty;
        badge.style.display = totalQty > 0 ? 'flex' : 'none';
    });
}

