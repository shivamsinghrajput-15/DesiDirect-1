/* ═══════════════════════════════════════════════
   DesiDirect Admin Panel  –  js/admin.js
   ═══════════════════════════════════════════════ */

// ── AUTH ──────────────────────────────────────────────────────────────────
(function guardAdmin() {
    try {
        const u = JSON.parse(localStorage.getItem('desi_user') || 'null');
        if (!u || u.role !== 'admin') { location.href = 'login.html'; }
    } catch (e) { location.href = 'login.html'; }
})();

function adminLogout() {
    localStorage.removeItem('desi_user');
    location.href = 'login.html';
}

// ── DATA ACCESS ───────────────────────────────────────────────────────────
const DB = {
    get: key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } },
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    users:    ()  => DB.get('desi_users'),
    products: ()  => DB.get('desi_products'),
    orders:   ()  => DB.get('desi_orders'),
    payments: ()  => DB.get('desi_payments'),
    saveUsers:    u => DB.set('desi_users', u),
    saveProducts: p => DB.set('desi_products', p),
    saveOrders:   o => DB.set('desi_orders', o),
    savePayments: p => DB.set('desi_payments', p),
};

// ── HELPERS ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function fmtDate(ts) {
    if (!ts) return '–';
    const d = new Date(ts);
    return isNaN(d) ? ts : d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtCur(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN'); }

function initials(name) { return (name || '?')[0].toUpperCase(); }

function emptyState(icon, title, sub) {
    return `<div class="empty-state">
        <i class="bx ${icon}"></i>
        <h4>${title}</h4>
        <p>${sub || 'Nothing to show here yet.'}</p>
    </div>`;
}

function tblFoot(count, label) {
    return `<div class="tbl-footer">${count} ${label}${count !== 1 ? 's' : ''} found</div>`;
}

function badge(text, type) {
    return `<span class="badge badge-${type}">${text}</span>`;
}

function statusBadge(status) {
    const map = {
        active:    ['Active', 'success'],
        suspended: ['Suspended', 'danger'],
        pending:   ['Pending', 'warning'],
        approved:  ['Approved', 'success'],
        removed:   ['Removed', 'danger'],
        processing:['Processing', 'info'],
        dispatched:['Dispatched', 'purple'],
        delivered: ['Delivered', 'success'],
        cancelled: ['Cancelled', 'danger'],
        refund:    ['Refund Req.', 'warning'],
        success:   ['Success', 'success'],
        paid:      ['Paid', 'success'],
        failed:    ['Failed', 'danger'],
        refunded:  ['Refunded', 'warning'],
        cod:       ['COD', 'info'],
    };
    const [lbl, cls] = map[status] || [status || 'Unknown', 'gray'];
    return badge(lbl, cls);
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
const SECTION_TITLES = {
    dashboard:'Dashboard', customers:'Customer Management',
    producers:'Producer Management', products:'Product Management',
    orders:'Order Management', payments:'Payment Management',
    analytics:'Analytics'
};

function showSection(name) {
    document.querySelectorAll('.adm-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const sec = $(`sec-${name}`);
    if (sec) sec.classList.add('active');
    const nav = document.querySelector(`[data-sec="${name}"]`);
    if (nav) nav.classList.add('active');
    $('pageTitle').textContent = SECTION_TITLES[name] || name;
    // render on demand
    const fn = { customers: renderCustomers, producers: renderProducers,
                 products: renderProducts, orders: renderOrders,
                 payments: renderPayments, analytics: renderAnalytics };
    if (fn[name]) fn[name]();
}

document.querySelectorAll('.nav-item[data-sec]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        showSection(el.dataset.sec);
        // mobile: close sidebar
        $('adminSidebar').classList.remove('open');
    });
});

$('sidebarToggle').addEventListener('click', () => {
    $('adminSidebar').classList.toggle('open');
});

// live clock
function updateClock() {
    const now = new Date();
    $('headerTime').textContent = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}
setInterval(updateClock, 1000); updateClock();

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDashboard() {
    const users    = DB.users();
    const products = DB.products();
    const orders   = DB.orders();
    const payments = DB.payments();

    const customers  = users.filter(u => u.role === 'customer');
    const producers  = users.filter(u => u.role === 'producer');
    const revenue    = orders.filter(o => o.paymentStatus === 'paid').reduce((s,o) => s + (o.total||0), 0);
    const pending    = orders.filter(o => o.paymentStatus === 'pending').length;

    $('stat-customers').textContent = customers.length;
    $('stat-producers').textContent = producers.length;
    $('stat-products').textContent  = products.length;
    $('stat-orders').textContent    = orders.length;
    $('stat-revenue').textContent   = fmtCur(revenue);
    $('stat-pending').textContent   = pending;

    // nav badges
    $('nb-customers').textContent = customers.length;
    $('nb-producers').textContent = producers.length;
    $('nb-products').textContent  = products.length;

    // Recent activity – last 10 events from orders + registrations
    const activity = [];
    orders.slice(-5).reverse().forEach(o => activity.push({
        icon:'bx bx-receipt', color:'rgba(124,58,237,.12)', icolor:'#7c3aed',
        title:`New order <b>${o.id || 'ORD'}</b> by ${o.customerName || 'Customer'}`,
        time: fmtDate(o.date)
    }));
    users.slice(-5).reverse().forEach(u => activity.push({
        icon: u.role==='producer'?'bx bx-store':'bx bx-user-plus',
        color: u.role==='producer'?'rgba(47,79,79,.1)':'rgba(23,162,184,.1)',
        icolor: u.role==='producer'?'#2F4F4F':'#17a2b8',
        title:`<b>${u.name||'User'}</b> registered as ${u.role}`,
        time: fmtDate(u.joinDate||u.createdAt)
    }));

    const actEl = $('recentActivity');
    if (!activity.length) {
        actEl.innerHTML = `<p class="no-activity"><i class="bx bx-bell-off"></i> No recent activity</p>`;
        return;
    }
    actEl.innerHTML = activity.slice(0,10).map(a => `
        <div class="activity-item">
            <div class="act-icon" style="background:${a.color}"><i class="${a.icon}" style="color:${a.icolor}"></i></div>
            <div class="act-content">
                <div class="act-title">${a.title}</div>
                <div class="act-time">${a.time}</div>
            </div>
        </div>`).join('');
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────
function renderCustomers(search = '') {
    const sf = ($('customerFilter') || {}).value || '';
    let list = DB.users().filter(u => u.role === 'customer');
    if (sf)     list = list.filter(u => (u.status || 'active') === sf);
    if (search) list = list.filter(u =>
        (u.name||'').toLowerCase().includes(search.toLowerCase()) ||
        (u.email||'').toLowerCase().includes(search.toLowerCase()));

    const el = $('customersList');
    if (!list.length) { el.innerHTML = emptyState('bx-group','No Customers Found','Registered customers will appear here.'); return; }

    el.innerHTML = `<div class="tbl-wrap"><table class="admin-table">
        <thead><tr>
            <th>Customer</th><th>Email</th><th>Phone</th>
            <th>Status</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody>${list.map(u => `
        <tr>
            <td><div class="user-cell"><div class="u-avatar">${initials(u.name)}</div><span>${u.name||'–'}</span></div></td>
            <td>${u.email||'–'}</td>
            <td>${u.phone||'–'}</td>
            <td>${statusBadge(u.status||'active')}</td>
            <td>${fmtDate(u.joinDate||u.createdAt)}</td>
            <td><div class="action-btns">
                ${(u.status||'active')==='suspended'
                    ? `<button class="btn-action btn-success" onclick="activateUser('${u.id}')"><i class="bx bx-check"></i> Activate</button>`
                    : `<button class="btn-action btn-warning" onclick="suspendUser('${u.id}')"><i class="bx bx-block"></i> Suspend</button>`}
                <button class="btn-action btn-danger" onclick="deleteUser('${u.id}','${u.name}')"><i class="bx bx-trash"></i></button>
            </div></td>
        </tr>`).join('')}
        </tbody></table></div>` + tblFoot(list.length, 'customer');
}

function suspendUser(id) {
    confirm2('Suspend Customer', 'Suspend this customer account?', () => {
        const users = DB.users().map(u => u.id===id ? {...u, status:'suspended'} : u);
        DB.saveUsers(users); renderCustomers(); toast('Customer suspended.', 'warning');
    });
}
function activateUser(id) {
    const users = DB.users().map(u => u.id===id ? {...u, status:'active'} : u);
    DB.saveUsers(users); renderCustomers(); toast('Customer reactivated.', 'success');
}
function deleteUser(id, name) {
    confirm2('Delete Customer', `Permanently delete <b>${name}</b>? This cannot be undone.`, () => {
        DB.saveUsers(DB.users().filter(u => u.id !== id));
        renderCustomers(); renderDashboard(); toast('Customer deleted.', 'error');
    });
}

// ── PRODUCERS ─────────────────────────────────────────────────────────────
function renderProducers(search = '') {
    const sf = ($('producerFilter')||{}).value || '';
    let list = DB.users().filter(u => u.role === 'producer');
    if (sf)     list = list.filter(u => (u.status||'active') === sf);
    if (search) list = list.filter(u =>
        (u.name||'').toLowerCase().includes(search.toLowerCase()) ||
        (u.email||'').toLowerCase().includes(search.toLowerCase()));

    const products = DB.products();
    const el = $('producersList');
    if (!list.length) { el.innerHTML = emptyState('bx-store','No Producers Found','Registered producers will appear here.'); return; }

    el.innerHTML = `<div class="tbl-wrap"><table class="admin-table">
        <thead><tr>
            <th>Producer</th><th>Email</th><th>Business / Village</th>
            <th>Products</th><th>Status</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody>${list.map(u => {
            const pCount = products.filter(p => p.producerId === u.id).length;
            const earnings = DB.orders()
                .filter(o => o.paymentStatus === 'paid')
                .flatMap(o => o.items || [])
                .filter(i => i.producerId === u.id)
                .reduce((s,i) => s + ((i.price||0)*(i.qty||1)), 0);
            return `<tr>
                <td><div class="user-cell"><div class="u-avatar">${initials(u.name)}</div><span>${u.name||'–'}</span></div></td>
                <td>${u.email||'–'}</td>
                <td>${u.businessName||u.village||'–'}</td>
                <td>${pCount}</td>
                <td>${statusBadge(u.status||'active')}</td>
                <td>${fmtDate(u.joinDate||u.createdAt)}</td>
                <td><div class="action-btns">
                    ${(u.status||'active')==='pending'
                        ? `<button class="btn-action btn-success" onclick="approveProducer('${u.id}')"><i class="bx bx-check-shield"></i> Approve</button>` : ''}
                    ${(u.status||'active')==='suspended'
                        ? `<button class="btn-action btn-success" onclick="activateProducer('${u.id}')"><i class="bx bx-check"></i> Activate</button>`
                        : `<button class="btn-action btn-warning" onclick="suspendProducer('${u.id}')"><i class="bx bx-block"></i> Suspend</button>`}
                    <button class="btn-action btn-danger" onclick="deleteUser('${u.id}','${u.name}')"><i class="bx bx-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('')}
        </tbody></table></div>` + tblFoot(list.length, 'producer');
}

function approveProducer(id) {
    DB.saveUsers(DB.users().map(u => u.id===id ? {...u, status:'active'} : u));
    renderProducers(); toast('Producer approved!', 'success');
}
function suspendProducer(id) {
    confirm2('Suspend Producer', 'Suspend this producer account?', () => {
        DB.saveUsers(DB.users().map(u => u.id===id ? {...u, status:'suspended'} : u));
        renderProducers(); toast('Producer suspended.', 'warning');
    });
}
function activateProducer(id) {
    DB.saveUsers(DB.users().map(u => u.id===id ? {...u, status:'active'} : u));
    renderProducers(); toast('Producer reactivated.', 'success');
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────
function renderProducts(search = '') {
    const sf = ($('productFilter')||{}).value || '';
    let list = DB.products();
    if (sf)     list = list.filter(p => (p.status||'approved') === sf);
    if (search) list = list.filter(p =>
        (p.name||'').toLowerCase().includes(search.toLowerCase()) ||
        (p.producerName||'').toLowerCase().includes(search.toLowerCase()) ||
        (p.category||'').toLowerCase().includes(search.toLowerCase()));

    const el = $('productsList');
    if (!list.length) { el.innerHTML = emptyState('bx-package','No Products Found','Products uploaded by producers will appear here.'); return; }

    el.innerHTML = `<div class="tbl-wrap"><table class="admin-table">
        <thead><tr>
            <th>Product</th><th>Producer</th><th>Category</th>
            <th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${list.map(p => `
        <tr>
            <td><b>${p.name||'–'}</b></td>
            <td>${p.producerName||'–'}</td>
            <td>${p.category||'–'}</td>
            <td>${fmtCur(p.price)}</td>
            <td>${p.stock ?? '–'}</td>
            <td>${statusBadge(p.status||'approved')}</td>
            <td><div class="action-btns">
                ${(p.status||'approved') === 'pending'
                    ? `<button class="btn-action btn-success" onclick="approveProduct('${p.id}')"><i class="bx bx-check"></i> Approve</button>` : ''}
                ${(p.status||'approved') !== 'removed'
                    ? `<button class="btn-action btn-danger" onclick="removeProduct('${p.id}','${p.name}')"><i class="bx bx-x"></i> Remove</button>`
                    : `<button class="btn-action btn-info" onclick="approveProduct('${p.id}')"><i class="bx bx-revision"></i> Restore</button>`}
            </div></td>
        </tr>`).join('')}
        </tbody></table></div>` + tblFoot(list.length, 'product');
}

function approveProduct(id) {
    DB.saveProducts(DB.products().map(p => p.id===id ? {...p, status:'approved'} : p));
    renderProducts(); toast('Product approved.', 'success');
}
function removeProduct(id, name) {
    confirm2('Remove Product', `Remove "<b>${name}</b>" from the platform?`, () => {
        DB.saveProducts(DB.products().map(p => p.id===id ? {...p, status:'removed'} : p));
        renderProducts(); toast('Product removed.', 'warning');
    });
}

// ── ORDERS ────────────────────────────────────────────────────────────────
function renderOrders(search = '') {
    const sf = ($('orderFilter')||{}).value || '';
    let list = DB.orders();
    if (sf)     list = list.filter(o => (o.status||'') === sf);
    if (search) list = list.filter(o =>
        (o.id||'').toLowerCase().includes(search.toLowerCase()) ||
        (o.customerName||'').toLowerCase().includes(search.toLowerCase()));

    const el = $('ordersList');
    if (!list.length) { el.innerHTML = emptyState('bx-receipt','No Orders Found','Customer orders will appear here.'); return; }

    el.innerHTML = `<div class="tbl-wrap"><table class="admin-table">
        <thead><tr>
            <th>Order ID</th><th>Customer</th><th>Date</th>
            <th>Total</th><th>Status</th><th>Payment</th><th>Actions</th>
        </tr></thead>
        <tbody>${list.slice().reverse().map(o => `
        <tr>
            <td><b>${o.id||'–'}</b></td>
            <td>${o.customerName||'–'}</td>
            <td>${fmtDate(o.date)}</td>
            <td>${fmtCur(o.total)}</td>
            <td>${statusBadge(o.status||'processing')}</td>
            <td>${statusBadge(o.paymentStatus||'pending')}</td>
            <td><div class="action-btns">
                <select class="filter-wrap" style="padding:.3rem .6rem;font-size:.78rem;border-radius:7px;"
                    onchange="updateOrderStatus('${o.id}',this.value)">
                    ${['processing','dispatched','delivered','cancelled','refund'].map(s =>
                        `<option value="${s}" ${(o.status||'processing')===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
                    ).join('')}
                </select>
            </div></td>
        </tr>`).join('')}
        </tbody></table></div>` + tblFoot(list.length, 'order');
}

function updateOrderStatus(id, status) {
    DB.saveOrders(DB.orders().map(o => o.id===id ? {...o, status} : o));
    toast(`Order updated to "${status}".`, 'info');
}

// ── PAYMENTS ──────────────────────────────────────────────────────────────
let _payFilter = '';

function renderPayments() {
    let list = DB.payments();
    if (_payFilter) list = list.filter(p => p.status === _payFilter);

    const el = $('paymentsList');
    if (!list.length) { el.innerHTML = emptyState('bx-credit-card','No Payments Found','Payment records will appear here.'); return; }

    el.innerHTML = `<div class="tbl-wrap"><table class="admin-table">
        <thead><tr>
            <th>Payment ID</th><th>Order ID</th><th>Customer</th>
            <th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th>
        </tr></thead>
        <tbody>${list.slice().reverse().map(p => `
        <tr>
            <td><b>${p.id||'–'}</b></td>
            <td>${p.orderId||'–'}</td>
            <td>${p.customerName||'–'}</td>
            <td>${fmtCur(p.amount)}</td>
            <td>${badge((p.method||'–').toUpperCase(),'info')}</td>
            <td>${statusBadge(p.status||'success')}</td>
            <td>${fmtDate(p.date)}</td>
            <td><div class="action-btns">
                ${p.status==='success'
                    ? `<button class="btn-action btn-warning" onclick="issueRefund('${p.id}')"><i class="bx bx-undo"></i> Refund</button>` : ''}
            </div></td>
        </tr>`).join('')}
        </tbody></table></div>` + tblFoot(list.length, 'payment');
}

function issueRefund(id) {
    confirm2('Issue Refund', 'Mark this payment as refunded?', () => {
        DB.savePayments(DB.payments().map(p => p.id===id ? {...p, status:'refund'} : p));
        renderPayments(); toast('Refund issued.', 'warning');
    });
}

// payment tab buttons
document.querySelectorAll('#payTabWrap .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#payTabWrap .filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _payFilter = btn.dataset.pf;
        renderPayments();
    });
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────
let _charts = {};

function renderAnalytics() {
    const orders   = DB.orders();
    const products = DB.products();
    const users    = DB.users();

    // Last 7 days labels
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' }));
    }
    const dayKeys = labels.map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toDateString();
    });

    // Revenue per day
    const revData = dayKeys.map(dk =>
        orders.filter(o => o.paymentStatus==='paid' && new Date(o.date).toDateString()===dk)
              .reduce((s,o) => s + (o.total||0), 0));

    // Orders per day
    const ordData = dayKeys.map(dk =>
        orders.filter(o => new Date(o.date).toDateString()===dk).length);

    // Category distribution
    const catMap = {};
    products.forEach(p => { catMap[p.category||'Other'] = (catMap[p.category||'Other']||0)+1; });

    // Top producers by revenue
    const prodRevMap = {};
    orders.filter(o=>o.paymentStatus==='paid').forEach(o => {
        (o.items||[]).forEach(item => {
            const k = item.producerName || item.producerId || 'Unknown';
            prodRevMap[k] = (prodRevMap[k]||0) + ((item.price||0)*(item.qty||1));
        });
    });
    const topProducers = Object.entries(prodRevMap).sort((a,b)=>b[1]-a[1]).slice(0,6);

    const PALETTE = ['#2F4F4F','#E2725B','#F4A460','#17a2b8','#7c3aed','#27ae60','#e6a817','#2980b9'];

    function makeChart(id, type, labels, data, opts = {}) {
        if (_charts[id]) _charts[id].destroy();
        const ctx = $(id);
        if (!ctx) return;
        _charts[id] = new Chart(ctx, {
            type,
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: type==='line' ? 'rgba(47,79,79,.08)'  : PALETTE,
                    borderColor:     type==='line' ? '#2F4F4F' : PALETTE,
                    borderWidth: 2, fill: type==='line', tension:.4,
                    pointBackgroundColor:'#2F4F4F', ...opts.dataset
                }]
            },
            options: {
                responsive:true, maintainAspectRatio:true,
                plugins:{ legend:{ display: type!=='line' && type!=='bar', position:'bottom' } },
                scales: (type==='line'||type==='bar') ? {
                    y:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,.05)' },
                        ticks:{ color:'#5a7575', font:{size:11} } },
                    x:{ grid:{ display:false }, ticks:{ color:'#5a7575', font:{size:11} } }
                } : {},
                ...opts.options
            }
        });
    }

    makeChart('chartRevenue', 'line', labels, revData);
    makeChart('chartCategory', 'doughnut',
        Object.keys(catMap).length ? Object.keys(catMap) : ['No Data'],
        Object.values(catMap).length ? Object.values(catMap) : [1]);
    makeChart('chartOrders', 'bar', labels, ordData, {
        dataset:{ backgroundColor:'rgba(124,58,237,.12)', borderColor:'#7c3aed' }
    });
    makeChart('chartProducers', 'bar',
        topProducers.length ? topProducers.map(p=>p[0]) : ['No Data'],
        topProducers.length ? topProducers.map(p=>p[1]) : [0], {
        dataset:{ backgroundColor:'rgba(226,114,91,.15)', borderColor:'#E2725B' },
        options:{ indexAxis:'y', plugins:{ legend:{ display:false } } }
    });
}

// ── MODAL ─────────────────────────────────────────────────────────────────
function confirm2(title, msg, onConfirm, safe = false) {
    $('modalTitle').textContent = title;
    $('modalMsg').innerHTML = msg;
    const icon = $('modalIcon');
    icon.className = 'modal-icon ' + (safe ? 'info' : 'warn');
    icon.innerHTML = `<i class="bx ${safe?'bx-info-circle':'bx-error-circle'}"></i>`;
    const btn = $('modalConfirmBtn');
    btn.className = 'btn-modal btn-confirm' + (safe ? ' safe' : '');
    btn.onclick = () => { closeModal(); onConfirm(); };
    $('confirmModal').classList.add('open');
}
function closeModal() { $('confirmModal').classList.remove('open'); }
window.closeModal = closeModal;

$('confirmModal').addEventListener('click', e => { if (e.target === $('confirmModal')) closeModal(); });

// ── TOAST ─────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
    const icons = { success:'bx-check-circle', error:'bx-x-circle', warning:'bx-error', info:'bx-info-circle' };
    const el = document.createElement('div');
    el.className = `toast t-${type}`;
    el.innerHTML = `<i class="bx ${icons[type]||'bx-info-circle'}"></i><span>${msg}</span>`;
    $('toastContainer').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3000);
}

// ── GLOBAL EXPOSE (used in inline event handlers) ─────────────────────────
Object.assign(window, {
    renderCustomers, renderProducers, renderProducts, renderOrders, renderPayments,
    suspendUser, activateUser, deleteUser,
    approveProducer, suspendProducer, activateProducer,
    approveProduct, removeProduct,
    updateOrderStatus, issueRefund,
    adminLogout
});

// ── INIT ──────────────────────────────────────────────────────────────────
renderDashboard();
