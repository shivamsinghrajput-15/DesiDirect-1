// =============================================
//  login.js  —  Firebase Sign-In Handler
//  Supports: Email/Password, Google, Phone (OTP)
// =============================================

import { auth, googleProvider } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- UI helpers ----
function showError(msg) {
    const el = document.getElementById('authError');
    if (!el) return;
    el.textContent = msg;
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
    if (el) {
        el.style.display = 'none';
        el.style.background = '#fff0ee';
        el.style.color = '#c0392b';
        el.style.borderColor = '#e2725b';
    }
}
function setLoading(btnId, loading, defaultText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? '…' : defaultText;
}

// ---- Role extraction helper ----
function extractUserData(user) {
    let name = user.email ? user.email.split('@')[0] : 'User';
    let role = 'customer';
    if (user.displayName) {
        if (user.displayName.includes('::')) {
            const parts = user.displayName.split('::');
            name = parts[0] || name;
            role = parts[1] || 'customer';
        } else {
            name = user.displayName;
        }
    }
    return { uid: user.uid, name, email: user.email || '', role };
}

function redirectByRole(role) {
    if (role === 'producer') window.location.href = 'producer-dashboard.html';
    else if (role === 'admin') window.location.href = 'admin.html';
    else window.location.href = 'marketplace.html';
}

// ---- Friendly Firebase error messages ----
const ERROR_MAP = {
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-credential':     'Invalid email or password.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/too-many-requests':      'Too many failed attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/user-disabled':          'This account has been disabled.',
    'auth/popup-closed-by-user':   'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request':'Sign-in cancelled. Please try again.',
    'auth/invalid-phone-number':   'Please enter a valid phone number with country code (e.g. +91…).',
    'auth/invalid-verification-code': 'Incorrect OTP. Please check and try again.',
    'auth/code-expired':           'OTP has expired. Please request a new one.',
    'auth/missing-phone-number':   'Please enter your phone number.'
};

// ======================================
//  1. EMAIL / PASSWORD SIGN-IN
// ======================================
async function handleEmailLogin(e) {
    e.preventDefault();
    hideError();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Please enter your email and password.');
        return;
    }

    setLoading('loginBtn', true, 'Log In');
    try {
        const cred     = await signInWithEmailAndPassword(auth, email, password);
        const userData = extractUserData(cred.user);
        localStorage.setItem('desi_user', JSON.stringify(userData));

        // ── Keep artisan listing fresh on every login ──
        if (userData.role === 'producer') {
            try {
                const list = JSON.parse(localStorage.getItem('desi_artisans') || '[]');
                const idx  = list.findIndex(a => a.uid === userData.uid);
                if (idx === -1) {
                    // First time login — add them
                    list.push({ ...userData, specialty: 'Artisan Craftsperson', bio: 'Passionate artisan.', location: 'India', joinedAt: new Date().toISOString() });
                } else {
                    // Update name/email in case they changed
                    list[idx] = { ...list[idx], name: userData.name, email: userData.email };
                }
                localStorage.setItem('desi_artisans', JSON.stringify(list));
            } catch(e) {}
        }

        redirectByRole(userData.role);
    } catch (err) {
        setLoading('loginBtn', false, 'Log In');
        showError(ERROR_MAP[err.code] || err.message);
        console.error('[Email Login]', err.code, err.message);
    }
}

// ======================================
//  2. GOOGLE SIGN-IN
// ======================================
async function handleGoogleLogin() {
    hideError();
    setLoading('googleLoginBtn', true, '  Log in with Google');
    try {
        const result   = await signInWithPopup(auth, googleProvider);
        const userData = extractUserData(result.user);
        localStorage.setItem('desi_user', JSON.stringify(userData));
        redirectByRole(userData.role);
    } catch (err) {
        setLoading('googleLoginBtn', false, '  Log in with Google');
        showError(ERROR_MAP[err.code] || err.message);
        console.error('[Google Login]', err.code, err.message);
    }
}

// ======================================
//  3. PHONE / OTP SIGN-IN
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
        document.getElementById('otpStep').style.display = 'flex';
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
    const otp = document.getElementById('otpInput')?.value.trim();
    if (!otp) { showError('Please enter the OTP you received.'); return; }
    if (!confirmationResult) { showError('Please send OTP first.'); return; }

    setLoading('verifyOTPBtn', true, 'Verify & Login');
    try {
        const result   = await confirmationResult.confirm(otp);
        const userData = extractUserData(result.user);
        localStorage.setItem('desi_user', JSON.stringify(userData));
        redirectByRole(userData.role);
    } catch (err) {
        setLoading('verifyOTPBtn', false, 'Verify & Login');
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

    const form = document.getElementById('loginForm');
    if (form) form.addEventListener('submit', handleEmailLogin);

    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) googleBtn.addEventListener('click', handleGoogleLogin);

    const sendOTPBtn = document.getElementById('sendOTPBtn');
    if (sendOTPBtn) sendOTPBtn.addEventListener('click', handleSendOTP);

    const verifyBtn = document.getElementById('verifyOTPBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', handleVerifyOTP);
});
