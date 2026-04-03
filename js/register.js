// =============================================
//  register.js  —  Firebase Sign-Up Handler
//  Supports: Email/Password, Google, Phone (OTP)
// =============================================

import { auth, googleProvider } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- Save user to the admin-readable desi_users list ----
function saveToUsersList(user) {
    try {
        const list = JSON.parse(localStorage.getItem('desi_users') || '[]');
        const idx  = list.findIndex(u => u.id === user.id || u.uid === user.uid);
        if (idx === -1) {
            list.push(user);
        } else {
            // Update existing entry but keep original joinDate & status
            list[idx] = { joinDate: list[idx].joinDate, status: list[idx].status, ...user };
        }
        localStorage.setItem('desi_users', JSON.stringify(list));
    } catch (e) {
        console.error('saveToUsersList error:', e);
    }
}



// ---- UI helpers ----
function showError(msg) {
    const el = document.getElementById('authError');
    if (!el) return;
    el.textContent = msg;
    el.style.background = '#fff0ee';
    el.style.color = '#c0392b';
    el.style.borderColor = '#e2725b';
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function showSuccess(msg) {
    const el = document.getElementById('authError');
    if (!el) return;
    el.textContent = msg;
    el.style.background = '#f0fff4';
    el.style.color = '#276749';
    el.style.borderColor = '#68d391';
    el.style.display = 'block';
}
function hideError() {
    const el = document.getElementById('authError');
    if (el) el.style.display = 'none';
}
function setLoading(btnId, loading, defaultText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? '…' : defaultText;
}

// ---- Friendly Firebase error messages ----
const ERROR_MAP = {
    'auth/email-already-in-use':   'An account with this email already exists.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/operation-not-allowed':  'This sign-in method is not enabled. Contact support.',
    'auth/popup-closed-by-user':   'Sign-up popup was closed. Please try again.',
    'auth/cancelled-popup-request':'Sign-up cancelled. Please try again.',
    'auth/invalid-phone-number':   'Please enter a valid phone number with country code (e.g. +91…).',
    'auth/invalid-verification-code': 'Incorrect OTP. Please check and try again.',
    'auth/code-expired':           'OTP has expired. Please request a new one.'
};

// ======================================
//  1. EMAIL / PASSWORD SIGN-UP
// ======================================
async function handleEmailSignup(e) {
    e.preventDefault();
    hideError();

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm').value;
    const role     = document.getElementById('role').value;

    if (!name)               { showError('Please enter your full name.');            return; }
    if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { showError('Passwords do not match.');                 return; }

    setLoading('signupBtn', true, 'Create Account');
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: `${name}::${role}` });

        const userData = { uid: cred.user.uid, name, email: cred.user.email, role };
        localStorage.setItem('desi_user', JSON.stringify(userData));

        // ── Save to desi_users so Admin Portal can see this user ──
        saveToUsersList({ ...userData, id: cred.user.uid, joinDate: new Date().toISOString(), status: 'active' });

        // ── Register artisan profile so it appears on artisans.html ──
        if (role === 'producer') {
            const artisanData = {
                ...userData,
                specialty: 'Artisan Craftsperson',
                bio: 'Passionate artisan bringing authentic handmade goods directly from the village to your home.',
                location: 'India',
                joinedAt: new Date().toISOString()
            };
            // Use global helper if artisans.js is loaded, else write directly
            if (typeof window.registerArtisanProfile === 'function') {
                window.registerArtisanProfile(artisanData);
            } else {
                try {
                    const list = JSON.parse(localStorage.getItem('desi_artisans') || '[]');
                    const idx  = list.findIndex(a => a.uid === artisanData.uid);
                    if (idx === -1) list.push(artisanData); else list[idx] = artisanData;
                    localStorage.setItem('desi_artisans', JSON.stringify(list));
                } catch (e) { console.error('Artisan save error:', e); }
            }
        }

        window.location.href = (role === 'producer') ? 'producer-dashboard.html' : 'marketplace.html';
    } catch (err) {
        setLoading('signupBtn', false, 'Create Account');
        showError(ERROR_MAP[err.code] || err.message);
        console.error('[Email Signup]', err.code, err.message);
    }
}

// ======================================
//  2. GOOGLE SIGN-UP
// ======================================
async function handleGoogleSignup() {
    hideError();
    setLoading('googleSignupBtn', true, '  Sign up with Google');
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user   = result.user;

        // For Google users, set default role if displayName has no "::" marker
        let name = user.displayName || user.email.split('@')[0];
        let role = 'customer';
        if (user.displayName && user.displayName.includes('::')) {
            const parts = user.displayName.split('::');
            name = parts[0];
            role = parts[1] || 'customer';
        }

        const userData = { uid: user.uid, name, email: user.email, role };
        localStorage.setItem('desi_user', JSON.stringify(userData));

        // ── Save to desi_users so Admin Portal can see this user ──
        saveToUsersList({ ...userData, id: user.uid, joinDate: new Date().toISOString(), status: 'active' });

        window.location.href = 'marketplace.html';
    } catch (err) {
        setLoading('googleSignupBtn', false, '  Sign up with Google');
        showError(ERROR_MAP[err.code] || err.message);
        console.error('[Google Signup]', err.code, err.message);
    }
}

// ======================================
//  3. PHONE / OTP SIGN-UP
// ======================================
let confirmationResult = null;

function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {},
            'expired-callback': () => {
                showError('reCAPTCHA expired. Please try again.');
                window.recaptchaVerifier = null;
            }
        });
    }
}

async function handleSendOTP() {
    hideError();
    const phone = document.getElementById('phoneInput')?.value.trim();
    if (!phone) { showError('Please enter your phone number.'); return; }

    setLoading('sendOTPBtn', true, 'Send OTP');
    try {
        setupRecaptcha();
        confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
        showSuccess('OTP sent! Check your phone.');
        document.getElementById('otpStep').style.display  = 'flex';
        document.getElementById('sendOTPBtn').textContent = 'Resend OTP';
        document.getElementById('sendOTPBtn').disabled    = false;
    } catch (err) {
        setLoading('sendOTPBtn', false, 'Send OTP');
        window.recaptchaVerifier = null;
        showError(ERROR_MAP[err.code] || err.message);
        console.error('[Phone OTP]', err.code, err.message);
    }
}

async function handleVerifyOTP() {
    hideError();
    const otp  = document.getElementById('otpInput')?.value.trim();
    const name = document.getElementById('phoneName')?.value.trim() || 'User';
    const role = document.getElementById('phoneRole')?.value || 'customer';

    if (!otp) { showError('Please enter the OTP.'); return; }
    if (!confirmationResult) { showError('Please send OTP first.'); return; }

    setLoading('verifyOTPBtn', true, 'Verify & Join');
    try {
        const result = await confirmationResult.confirm(otp);
        const user   = result.user;

        // Save name+role in displayName for future logins
        await updateProfile(user, { displayName: `${name}::${role}` });

        const userData = { uid: user.uid, name, email: user.email || '', role };
        localStorage.setItem('desi_user', JSON.stringify(userData));

        // ── Save to desi_users so Admin Portal can see this user ──
        saveToUsersList({ ...userData, id: user.uid, joinDate: new Date().toISOString(), status: 'active' });

        // ── Register artisan profile so it appears on artisans.html ──
        if (role === 'producer') {
            const artisanData = {
                ...userData,
                specialty: 'Artisan Craftsperson',
                bio: 'Passionate artisan bringing authentic handmade goods directly from the village to your home.',
                location: 'India',
                joinedAt: new Date().toISOString()
            };
            try {
                const list = JSON.parse(localStorage.getItem('desi_artisans') || '[]');
                const idx  = list.findIndex(a => a.uid === artisanData.uid);
                if (idx === -1) list.push(artisanData); else list[idx] = { ...list[idx], ...artisanData };
                localStorage.setItem('desi_artisans', JSON.stringify(list));
            } catch (e) { console.error('Artisan save error:', e); }
        }

        window.location.href = (role === 'producer') ? 'producer-dashboard.html' : 'marketplace.html';
    } catch (err) {
        setLoading('verifyOTPBtn', false, 'Verify & Join');
        showError(ERROR_MAP[err.code] || err.message);
        console.error('[OTP Verify]', err.code, err.message);
    }
}

// ======================================
//  TAB SWITCHER  (Email ↔ Phone)
// ======================================
function initTabs() {
    const tabs = document.querySelectorAll('.auth-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            hideError();
            const target = tab.dataset.tab;
            document.querySelectorAll('.auth-tab-panel').forEach(p => {
                p.style.display = p.id === target ? 'block' : 'none';
            });
        });
    });
}

// ======================================
//  WIRE UP ON DOM READY
// ======================================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();

    const form = document.getElementById('signupForm');
    if (form) form.addEventListener('submit', handleEmailSignup);

    const googleBtn = document.getElementById('googleSignupBtn');
    if (googleBtn) googleBtn.addEventListener('click', handleGoogleSignup);

    const sendOTPBtn = document.getElementById('sendOTPBtn');
    if (sendOTPBtn) sendOTPBtn.addEventListener('click', handleSendOTP);

    const verifyBtn = document.getElementById('verifyOTPBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', handleVerifyOTP);
});
