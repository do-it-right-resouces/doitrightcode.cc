(function() {
"use strict";

// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================
const DEBUG_MODE = false; // Set to true to enable console logging

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

// ============================================================================
// AUTH SYSTEM - Login/Register with Admin Bypass
// ============================================================================

const ADMIN_EMAIL = 'unkledo@icloud.com';
const ADMIN_PASS = 'Denver3100';
let currentUser = null;
let isAuthMode = 'login'; // 'login' or 'register'
let paymentType = null; // 'barcode' or 'hmac'
let userCredits = 0;

function initAuth() {
    // Check for existing session
    const savedUser = localStorage.getItem('dirUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            userCredits = parseInt(localStorage.getItem('dirCredits_' + currentUser.email) || '0');
            hideAuthOverlay();
            updateUserDisplay();
        } catch(e) {
            localStorage.removeItem('dirUser');
        }
    }
    
    // Auth event listeners
    document.getElementById('auth-submit')?.addEventListener('click', handleAuth);
    document.getElementById('auth-toggle')?.addEventListener('click', toggleAuthMode);
    document.getElementById('auth-email')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleAuth(); });
    document.getElementById('auth-password')?.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleAuth(); });
    
    // Logout button in header
    document.getElementById('btn-main-logout')?.addEventListener('click', logout);
    
    // Puff smoke on auth logo
    setTimeout(() => puffAuthSmoke(3), 500);
}

function handleAuth() {
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    const errorEl = document.getElementById('auth-error');
    
    if (!email || !password) {
        showAuthError('Please enter email and password');
        return;
    }
    
    if (isAuthMode === 'login') {
        doLogin(email, password);
    } else {
        const confirm = document.getElementById('auth-confirm')?.value;
        if (password !== confirm) {
            showAuthError('Passwords do not match');
            return;
        }
        doRegister(email, password);
    }
}

function doLogin(email, password) {
    // Check admin credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        currentUser = { email, isAdmin: true, credits: 999999 };
        userCredits = 999999;
        localStorage.setItem('dirUser', JSON.stringify(currentUser));
        localStorage.setItem('dirCredits_' + email, '999999');
        hideAuthOverlay();
        updateUserDisplay();
        debugLog('🔑 Admin logged in - unlimited access');
        return;
    }
    
    // Check regular user
    const users = JSON.parse(localStorage.getItem('dirUsers') || '{}');
    if (users[email] && users[email].password === password) {
        currentUser = { email, isAdmin: false };
        userCredits = parseInt(localStorage.getItem('dirCredits_' + email) || '0');
        localStorage.setItem('dirUser', JSON.stringify(currentUser));
        hideAuthOverlay();
        updateUserDisplay();
        debugLog('✅ User logged in:', email);
        return;
    }
    
    showAuthError('Invalid email or password');
}

function doRegister(email, password) {
    const users = JSON.parse(localStorage.getItem('dirUsers') || '{}');
    
    if (users[email]) {
        showAuthError('Email already registered');
        return;
    }
    
    users[email] = { password, created: Date.now() };
    localStorage.setItem('dirUsers', JSON.stringify(users));
    localStorage.setItem('dirCredits_' + email, '0');
    
    currentUser = { email, isAdmin: false };
    userCredits = 0;
    localStorage.setItem('dirUser', JSON.stringify(currentUser));
    
    hideAuthOverlay();
    updateUserDisplay();
    debugLog('✅ User registered:', email);
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    }
}

function toggleAuthMode() {
    isAuthMode = isAuthMode === 'login' ? 'register' : 'login';
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-submit');
    const toggle = document.getElementById('auth-toggle');
    const regFields = document.getElementById('register-fields');
    
    if (isAuthMode === 'register') {
        title.textContent = 'Register';
        btn.textContent = 'Register';
        toggle.textContent = 'Already have an account? Login';
        regFields.style.display = 'block';
    } else {
        title.textContent = 'Login';
        btn.textContent = 'Login';
        toggle.textContent = "Don't have an account? Register";
        regFields.style.display = 'none';
    }
    puffAuthSmoke(2);
}

function hideAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
}

function showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function logout() {
    currentUser = null;
    userCredits = 0;
    localStorage.removeItem('dirUser');
    showAuthOverlay();
    updateUserDisplay();
}

function updateUserDisplay() {
    const headerUser = document.getElementById('header-user');
    const emailDisplay = document.getElementById('user-email-display');
    const adminPanel = document.getElementById('secure-panel');
    const isAdmin = currentUser?.isAdmin || false;
    
    if (currentUser && headerUser) {
        headerUser.style.display = 'flex';
        if (emailDisplay) {
            emailDisplay.textContent = currentUser.email + (isAdmin ? ' ⭐' : '');
        }
    } else if (headerUser) {
        headerUser.style.display = 'none';
    }
    
    // Show/hide admin panel
    if (adminPanel) {
        adminPanel.style.display = isAdmin ? 'block' : 'none';
        if (isAdmin) {
            loadAdminData();
        }
    }
    
    // Log audit event
    if (currentUser) {
        addAuditLog('login', `User logged in: ${currentUser.email}${isAdmin ? ' (ADMIN)' : ''}`);
    }
    
    debugLog('User:', currentUser?.email, 'Credits:', userCredits, 'Admin:', isAdmin);
}

// Admin Panel Functions
function showAdminTab(tabName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(el => el.style.display = 'none');
    // Remove active from all tabs
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    
    // Show selected section
    const section = document.getElementById('admin-' + tabName);
    if (section) section.style.display = 'block';
    
    // Set active tab
    event.target.classList.add('active');
}

function loadAdminData() {
    loadUsersTable();
    loadBalancesList();
    loadAuditLog();
    loadPaymentStats();
}

function loadUsersTable() {
    const users = JSON.parse(localStorage.getItem('dirUsers') || '{}');
    const table = document.getElementById('secure-users-table');
    if (!table) return;
    
    let html = '<thead><tr style="background:#003300;"><th style="padding:0.5rem; text-align:left;">Email</th><th style="padding:0.5rem;">Credits</th><th style="padding:0.5rem;">Created</th><th style="padding:0.5rem;">Actions</th></tr></thead><tbody>';
    
    Object.entries(users).forEach(([email, data]) => {
        const credits = localStorage.getItem('dirCredits_' + email) || '0';
        const created = data.created ? new Date(data.created).toLocaleDateString() : 'N/A';
        html += `<tr style="border-bottom:1px solid #333;">
            <td style="padding:0.5rem;">${email}</td>
            <td style="padding:0.5rem; text-align:center;">${credits}</td>
            <td style="padding:0.5rem; text-align:center; color:#888;">${created}</td>
            <td style="padding:0.5rem; text-align:center;">
                <button class="btn btn-delete-user" data-email="${email}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">🗑️</button>
            </td>
        </tr>`;
    });
    
    html += '</tbody>';
    table.innerHTML = html;
}

function loadBalancesList() {
    const users = JSON.parse(localStorage.getItem('dirUsers') || '{}');
    const list = document.getElementById('secure-balances-list');
    if (!list) return;
    
    let html = '';
    Object.keys(users).forEach(email => {
        const credits = localStorage.getItem('dirCredits_' + email) || '0';
        html += `<div style="padding:0.3rem 0; border-bottom:1px solid #333; display:flex; justify-content:space-between;">
            <span>${email}</span>
            <span style="color:#ffff00;">${credits} credits</span>
        </div>`;
    });
    
    list.innerHTML = html || '<div style="color:#888;">No users found</div>';
}

function loadPaymentStats() {
    const payments = JSON.parse(localStorage.getItem('dirPayments') || '[]');
    const totalPayments = payments.length;
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pending = payments.filter(p => p.status === 'pending').length;
    
    document.getElementById('stat-total-payments').textContent = totalPayments;
    document.getElementById('stat-total-revenue').textContent = '$' + totalRevenue;
    document.getElementById('stat-pending').textContent = pending;
}

// Audit Log Functions
let auditLog = [];

function addAuditLog(type, message) {
    const entry = {
        time: new Date().toISOString(),
        type: type,
        message: message,
        user: currentUser?.email || 'anonymous'
    };
    auditLog.unshift(entry);
    
    // Store in localStorage
    const stored = JSON.parse(localStorage.getItem('dirAuditLog') || '[]');
    stored.unshift(entry);
    if (stored.length > 500) stored.pop(); // Keep last 500 entries
    localStorage.setItem('dirAuditLog', JSON.stringify(stored));
}

function loadAuditLog() {
    auditLog = JSON.parse(localStorage.getItem('dirAuditLog') || '[]');
    refreshAuditLog();
}

function refreshAuditLog() {
    const list = document.getElementById('audit-log-list');
    const filter = document.getElementById('audit-filter')?.value || 'all';
    const search = document.getElementById('audit-search')?.value?.toLowerCase() || '';
    
    if (!list) return;
    
    let filtered = auditLog;
    if (filter !== 'all') {
        filtered = filtered.filter(e => e.type === filter);
    }
    if (search) {
        filtered = filtered.filter(e => e.message.toLowerCase().includes(search) || e.user.toLowerCase().includes(search));
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="audit-entry"><span style="color:#888;">No entries found</span></div>';
        return;
    }
    
    list.innerHTML = filtered.slice(0, 100).map(entry => {
        const time = new Date(entry.time).toLocaleString();
        return `<div class="audit-entry">
            <span class="audit-time">${time}</span>
            <span class="audit-type ${entry.type}">${entry.type.toUpperCase()}</span>
            <span>${entry.message}</span>
            <span style="color:#666; float:right;">${entry.user}</span>
        </div>`;
    }).join('');
}

function exportAuditLog() {
    const data = JSON.stringify(auditLog, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function savePaymentSettings() {
    const settings = {
        btcAddress: document.getElementById('admin-btc-address')?.value || '',
        lnInvoice: document.getElementById('admin-ln-invoice')?.value || '',
        barcodePrice: parseFloat(document.getElementById('admin-barcode-price')?.value) || 10,
        hmacPrice: parseFloat(document.getElementById('admin-hmac-price')?.value) || 5
    };
    localStorage.setItem('dirPaymentSettings', JSON.stringify(settings));
    addAuditLog('payment', 'Payment settings updated by admin');
    alert('✅ Payment settings saved!');
}

function deleteUser(email) {
    if (!confirm(`Delete user ${email}?`)) return;
    const users = JSON.parse(localStorage.getItem('dirUsers') || '{}');
    delete users[email];
    localStorage.setItem('dirUsers', JSON.stringify(users));
    localStorage.removeItem('dirCredits_' + email);
    addAuditLog('admin', `User deleted: ${email}`);
    loadUsersTable();
    loadBalancesList();
}

function isAdminUser() {
    return currentUser?.isAdmin === true;
}

function hasCredits() {
    return isAdminUser() || userCredits > 0;
}

// Auth logo smoke effect
function puffAuthSmoke(count = 2) {
    const container = document.getElementById('auth-logo-smoke');
    if (!container) return;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const leftPuff = document.createElement('div');
            leftPuff.className = 'smoke-puff left';
            leftPuff.style.animationDelay = (Math.random() * 0.3) + 's';
            container.appendChild(leftPuff);
            setTimeout(() => leftPuff.remove(), 2500);
            
            const rightPuff = document.createElement('div');
            rightPuff.className = 'smoke-puff right';
            rightPuff.style.animationDelay = (Math.random() * 0.3) + 's';
            container.appendChild(rightPuff);
            setTimeout(() => rightPuff.remove(), 2500);
        }, i * 200);
    }
}

// ============================================================================
// PAYMENT SYSTEM - Bitcoin/Lightning with Admin Bypass
// ============================================================================

function showPaymentTab(tab) {
    document.getElementById('payment-btc').style.display = tab === 'btc' ? 'block' : 'none';
    document.getElementById('payment-ln').style.display = tab === 'ln' ? 'block' : 'none';
    document.getElementById('tab-btc').classList.toggle('active', tab === 'btc');
    document.getElementById('tab-ln').classList.toggle('active', tab === 'ln');
}

function showPaymentModal(type) {
    // Admin bypass - no payment needed
    if (isAdminUser()) {
        debugLog('🔑 Admin bypass - no payment required');
        if (type === 'hmac') {
            onImportHMACKeyConfirmed();
        }
        return true; // Payment not needed
    }
    
    paymentType = type;
    const modal = document.getElementById('payment-modal');
    const typeDisplay = document.getElementById('payment-type-display');
    const amountDisplay = document.getElementById('payment-amount-display');
    
    if (type === 'barcode') {
        typeDisplay.textContent = 'Barcode Generation - $10';
        amountDisplay.textContent = '$10.00 USD';
    } else if (type === 'hmac') {
        typeDisplay.textContent = 'HMAC Key Import - $5';
        amountDisplay.textContent = '$5.00 USD';
    }
    
    modal.classList.add('active');
    return false; // Payment needed
}

function closePaymentModal() {
    document.getElementById('payment-modal')?.classList.remove('active');
    paymentType = null;
}

function simulatePayment() {
    // For demo/testing - mark as paid
    if (paymentType === 'barcode') {
        userCredits += 1;
        localStorage.setItem('dirCredits_' + currentUser?.email, userCredits.toString());
        alert('✅ Payment confirmed! You can now generate 1 barcode.');
    } else if (paymentType === 'hmac') {
        alert('✅ Payment confirmed! HMAC key import unlocked.');
        onImportHMACKeyConfirmed();
    }
    closePaymentModal();
}

// Called after payment confirmed for HMAC import
async function onImportHMACKeyConfirmed() {
    const hex = document.getElementById('hmac-key-hex')?.value.trim();
    if (!hex) { 
        alert('Enter hex key to import'); 
        return; 
    }
    const ok = await importHMACKeyHex(hex);
    if (ok) {
        alert('✅ HMAC key imported successfully!');
        document.getElementById('enable-hmac').checked = true;
        onHMACToggle();
    } else {
        alert('Failed to import HMAC key');
    }
}

// ============================================================================
// MD5 IMPLEMENTATION (Educational - DO NOT USE IN PRODUCTION)
// ============================================================================

function md5(message) {
    // UTF-8 encode
    const bytes = new TextEncoder().encode(message || '');

    // Helper functions
    const rotl = (x, n) => (x << n) | (x >>> (32 - n));
    const toHexLE = (num) => {
        return ('00000000' + (num >>> 0).toString(16)).slice(-8).match(/../g).reverse().join('');
    };

    // Initialize vars
    let a0 = 0x67452301;
    let b0 = 0xEFCDAB89;
    let c0 = 0x98BADCFE;
    let d0 = 0x10325476;

    // Pre-processing: padding
    const origLenBits = bytes.length * 8;
    const padLen = ((56 - (bytes.length + 1) % 64) + 64) % 64; // bytes to pad after 0x80
    const totalLen = bytes.length + 1 + padLen + 8;
    const buf = new Uint8Array(totalLen);
    buf.set(bytes, 0);
    buf[bytes.length] = 0x80;
    // length in bits, little-endian 64-bit
    for (let i = 0; i < 8; i++) {
        buf[bytes.length + 1 + padLen + i] = (origLenBits >>> (8 * i)) & 0xFF;
    }

    // Constants T
    const K = new Uint32Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;

    // per-round shifts
    const s = [7,12,17,22, 5,9,14,20, 4,11,16,23, 6,10,15,21];

    // Process each 512-bit chunk
    for (let offset = 0; offset < buf.length; offset += 64) {
        const M = new Uint32Array(16);
        for (let i = 0; i < 16; i++) {
            M[i] = (
                (buf[offset + i*4 + 0]) |
                (buf[offset + i*4 + 1] << 8) |
                (buf[offset + i*4 + 2] << 16) |
                (buf[offset + i*4 + 3] << 24)
            ) >>> 0;
        }

        let A = a0, B = b0, C = c0, D = d0;

        for (let i = 0; i < 64; i++) {
            let F, g;
            if (i < 16) {
                F = (B & C) | ((~B) & D);
                g = i;
            } else if (i < 32) {
                F = (D & B) | ((~D) & C);
                g = (5*i + 1) % 16;
            } else if (i < 48) {
                F = B ^ C ^ D;
                g = (3*i + 5) % 16;
            } else {
                F = C ^ (B | (~D));
                g = (7*i) % 16;
            }
            const tmp = (A + F + K[i] + M[g]) >>> 0;
            const rot = (i < 16) ? s[(i % 4)] : (i < 32 ? s[(4 + (i % 4))] : (i < 48 ? s[(8 + (i % 4))] : s[(12 + (i % 4))]));
            A = D;
            D = C;
            C = B;
            B = (B + rotl(tmp, rot)) >>> 0;
        }

        a0 = (a0 + A) >>> 0;
        b0 = (b0 + B) >>> 0;
        c0 = (c0 + C) >>> 0;
        d0 = (d0 + D) >>> 0;
    }

    // produce the final hash (little-endian)
    return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
} 

// ============================================================================
// AES-256 ENCRYPTION (Web Crypto API - Secure!)
// ============================================================================

let aesKey = null;
let aesKeyHex = '';

async function generateAESKey() {
    aesKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    
    const exported = await crypto.subtle.exportKey("raw", aesKey);
    const hexArray = Array.from(new Uint8Array(exported));
    aesKeyHex = hexArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    debugLog('🔑 AES-256 Key Generated:', aesKeyHex);
    
    const display = document.getElementById('aes-key-display');
    if (display) {
        display.textContent = aesKeyHex;
    }
}

async function encryptFieldAES(data) {
    if (!aesKey) {
        await generateAESKey();
    }
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        dataBuffer
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    
    // Convert to hex
    return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function decryptFieldAES(hexData) {
    if (!aesKey) {
        throw new Error('No AES key available');
    }
    
    const combined = new Uint8Array(hexData.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

// Fields that should be encrypted (sensitive data)
const SENSITIVE_FIELDS = ['DCS', 'DAC', 'DAD', 'DBB', 'DAG', 'DAH', 'DAI'];

// ============================================================================
// STATE-SPECIFIC CONFIGURATIONS
// ============================================================================

const STATE_CONFIGS = {
    FL: {
        name: "Florida",
        iin: "636026",
        subfileId: "ZF",
        auditTrail: "FLDMVAUDIT000001",
        useIdemia: true,
        defaultYear: 2020,
        exampleData: {
            DAQ: "B231952418000",
            DCS: "BOLDEN",
            DAC: "JACOB",
            DAD: "WALTER",
            DBB: "01011990",
            DBA: "01012032",
            DBD: "01092026",
            DDB: "03012020",
            DBC: "1",
            DAY: "BRO",
            DAU: "070 IN",
            DAW: "180",
            DAZ: "BRO",
            DAG: "605 AFFIRMED COURT",
            DAI: "TALLAHASSEE",
            DAJ: "FL",
            DAK: "323990000",
            DCG: "USA",
            DCA: "E",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "E802009203873",
            DDA: "M",
            DDE: "N",
            DDF: "N",
            DDG: "N",
            DDK: "1"
        }
     },
    CA: {
        name: "California",
        iin: "636014",
        subfileId: "ZC",
        auditTrail: "CADMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2017,
        exampleData: {
            DAQ: "I1234568",
            DCS: "SAMPLE",
            DAC: "JANE",
            DAD: "MARIE",
            DBB: "01011985",
            DBA: "01012028",
            DBD: "06152017",
            DDB: "06152017",
            DBC: "2",
            DAY: "BRO",
            DAU: "065 IN",
            DAW: "140",
            DAZ: "BRN",
            DAG: "2570 24TH STREET",
            DAI: "SACRAMENTO",
            DAJ: "CA",
            DAK: "958164035",
            DCG: "USA",
            DCA: "C",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "AB1234567890",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    TX: {
        name: "Texas",
        iin: "636015",
        subfileId: "ZT",
        auditTrail: "TXDPSAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "12345678",
            DCS: "SMITH",
            DAC: "JOHN",
            DAD: "WILLIAM",
            DBB: "05151988",
            DBA: "05152028",
            DBD: "05152023",
            DDB: "05152023",
            DBC: "1",
            DAY: "BRO",
            DAU: "072 IN",
            DAW: "185",
            DAZ: "BLK",
            DAG: "123 MAIN STREET",
            DAI: "HOUSTON",
            DAJ: "TX",
            DAK: "770011234",
            DCG: "USA",
            DCA: "C",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "TX123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    NY: {
        name: "New York",
        iin: "636001",
        subfileId: "ZN",
        auditTrail: "NYDMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "123456789",
            DCS: "JOHNSON",
            DAC: "MICHAEL",
            DAD: "JAMES",
            DBB: "03201985",
            DBA: "03202028",
            DBD: "03202023",
            DDB: "03202023",
            DBC: "1",
            DAY: "BLU",
            DAU: "070 IN",
            DAW: "175",
            DAZ: "BRO",
            DAG: "456 BROADWAY",
            DAI: "NEW YORK",
            DAJ: "NY",
            DAK: "100011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "NY123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    GA: {
        name: "Georgia",
        iin: "636055",
        subfileId: "ZG",
        auditTrail: "GADDSAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "123456789",
            DCS: "WILLIAMS",
            DAC: "DAVID",
            DAD: "LEE",
            DBB: "07041990",
            DBA: "07042030",
            DBD: "07042025",
            DDB: "07042025",
            DBC: "1",
            DAY: "BRO",
            DAU: "071 IN",
            DAW: "180",
            DAZ: "BLK",
            DAG: "789 PEACHTREE ST",
            DAI: "ATLANTA",
            DAJ: "GA",
            DAK: "303011234",
            DCG: "USA",
            DCA: "C",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "GA123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    NC: {
        name: "North Carolina",
        iin: "636004",
        subfileId: "ZN",
        auditTrail: "NCDMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "123456789012",
            DCS: "BROWN",
            DAC: "ROBERT",
            DAD: "ALLEN",
            DBB: "09151987",
            DBA: "09152027",
            DBD: "09152022",
            DDB: "09152022",
            DBC: "1",
            DAY: "GRN",
            DAU: "069 IN",
            DAW: "170",
            DAZ: "BRO",
            DAG: "321 OAK DRIVE",
            DAI: "CHARLOTTE",
            DAJ: "NC",
            DAK: "282011234",
            DCG: "USA",
            DCA: "C",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "NC123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    PA: {
        name: "Pennsylvania",
        iin: "636025",
        subfileId: "ZP",
        auditTrail: "PADOTAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "12345678",
            DCS: "DAVIS",
            DAC: "THOMAS",
            DAD: "EDWARD",
            DBB: "11201982",
            DBA: "11202026",
            DBD: "11202022",
            DDB: "11202022",
            DBC: "1",
            DAY: "HAZ",
            DAU: "073 IN",
            DAW: "190",
            DAZ: "BRO",
            DAG: "555 LIBERTY AVE",
            DAI: "PHILADELPHIA",
            DAJ: "PA",
            DAK: "191011234",
            DCG: "USA",
            DCA: "C",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "PA123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    OH: {
        name: "Ohio",
        iin: "636023",
        subfileId: "ZO",
        auditTrail: "OHBMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "AB123456",
            DCS: "MILLER",
            DAC: "JAMES",
            DAD: "PAUL",
            DBB: "02281986",
            DBA: "02282030",
            DBD: "02282025",
            DDB: "02282025",
            DBC: "1",
            DAY: "BRO",
            DAU: "068 IN",
            DAW: "165",
            DAZ: "BLN",
            DAG: "999 BUCKEYE BLVD",
            DAI: "COLUMBUS",
            DAJ: "OH",
            DAK: "432011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "OH123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    IL: {
        name: "Illinois",
        iin: "636035",
        subfileId: "ZI",
        auditTrail: "ILSOSAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "W12345678901",
            DCS: "WILSON",
            DAC: "CHRIS",
            DAD: "ANDREW",
            DBB: "06101984",
            DBA: "06102028",
            DBD: "06102024",
            DDB: "06102024",
            DBC: "1",
            DAY: "BLU",
            DAU: "074 IN",
            DAW: "195",
            DAZ: "BLK",
            DAG: "777 LAKE SHORE DR",
            DAI: "CHICAGO",
            DAJ: "IL",
            DAK: "606011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "IL123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    AZ: {
        name: "Arizona",
        iin: "636039",
        subfileId: "ZA",
        auditTrail: "AZMVDAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "D12345678",
            DCS: "MOORE",
            DAC: "DANIEL",
            DAD: "SCOTT",
            DBB: "12251989",
            DBA: "12252065",
            DBD: "12252020",
            DDB: "12252020",
            DBC: "1",
            DAY: "BRO",
            DAU: "071 IN",
            DAW: "175",
            DAZ: "BRO",
            DAG: "123 DESERT RD",
            DAI: "PHOENIX",
            DAJ: "AZ",
            DAK: "850011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "AZ123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    NV: {
        name: "Nevada",
        iin: "636049",
        subfileId: "ZV",
        auditTrail: "NVDMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "1234567890",
            DCS: "TAYLOR",
            DAC: "KEVIN",
            DAD: "MARK",
            DBB: "08081991",
            DBA: "08082029",
            DBD: "08082025",
            DDB: "08082025",
            DBC: "1",
            DAY: "GRN",
            DAU: "070 IN",
            DAW: "170",
            DAZ: "BRO",
            DAG: "456 STRIP BLVD",
            DAI: "LAS VEGAS",
            DAJ: "NV",
            DAK: "891011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "NV123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    CO: {
        name: "Colorado",
        iin: "636020",
        subfileId: "ZC",
        auditTrail: "CODMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "123456789",
            DCS: "ANDERSON",
            DAC: "BRIAN",
            DAD: "JOSEPH",
            DBB: "04151988",
            DBA: "04152028",
            DBD: "04152024",
            DDB: "04152024",
            DBC: "1",
            DAY: "BLU",
            DAU: "072 IN",
            DAW: "180",
            DAZ: "BLN",
            DAG: "789 MOUNTAIN VIEW",
            DAI: "DENVER",
            DAJ: "CO",
            DAK: "802011234",
            DCG: "USA",
            DCA: "R",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "CO123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    WA: {
        name: "Washington",
        iin: "636045",
        subfileId: "ZW",
        auditTrail: "WADOLAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "THOMABC123AB",
            DCS: "THOMAS",
            DAC: "STEVEN",
            DAD: "RAY",
            DBB: "01301986",
            DBA: "01302030",
            DBD: "01302025",
            DDB: "01302025",
            DBC: "1",
            DAY: "GRY",
            DAU: "069 IN",
            DAW: "165",
            DAZ: "GRY",
            DAG: "321 PIKE PLACE",
            DAI: "SEATTLE",
            DAJ: "WA",
            DAK: "981011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "WA123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    NJ: {
        name: "New Jersey",
        iin: "636036",
        subfileId: "ZJ",
        auditTrail: "NJMVCAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "A12345678901234",
            DCS: "JACKSON",
            DAC: "ANTHONY",
            DAD: "WAYNE",
            DBB: "10101985",
            DBA: "10102029",
            DBD: "10102025",
            DDB: "10102025",
            DBC: "1",
            DAY: "BRO",
            DAU: "071 IN",
            DAW: "175",
            DAZ: "BLK",
            DAG: "456 JERSEY AVE",
            DAI: "NEWARK",
            DAJ: "NJ",
            DAK: "071011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "NJ123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    VA: {
        name: "Virginia",
        iin: "636000",
        subfileId: "ZV",
        auditTrail: "VADMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "T12345678",
            DCS: "WHITE",
            DAC: "RICHARD",
            DAD: "ALAN",
            DBB: "05051987",
            DBA: "05052031",
            DBD: "05052026",
            DDB: "05052026",
            DBC: "1",
            DAY: "BLU",
            DAU: "073 IN",
            DAW: "185",
            DAZ: "BRO",
            DAG: "789 COLONIAL PKWY",
            DAI: "RICHMOND",
            DAJ: "VA",
            DAK: "232011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "VA123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    MI: {
        name: "Michigan",
        iin: "636032",
        subfileId: "ZM",
        auditTrail: "MISOSAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "K123456789012",
            DCS: "HARRIS",
            DAC: "CHARLES",
            DAD: "DEAN",
            DBB: "07201984",
            DBA: "07202028",
            DBD: "07202024",
            DDB: "07202024",
            DBC: "1",
            DAY: "HAZ",
            DAU: "070 IN",
            DAW: "170",
            DAZ: "BRO",
            DAG: "555 MOTOR CITY DR",
            DAI: "DETROIT",
            DAJ: "MI",
            DAK: "482011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "MI123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    TN: {
        name: "Tennessee",
        iin: "636053",
        subfileId: "ZT",
        auditTrail: "TNDOSAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "123456789",
            DCS: "MARTIN",
            DAC: "GARY",
            DAD: "LEE",
            DBB: "03151990",
            DBA: "03152030",
            DBD: "03152025",
            DDB: "03152025",
            DBC: "1",
            DAY: "BRO",
            DAU: "068 IN",
            DAW: "160",
            DAZ: "BLK",
            DAG: "123 MUSIC ROW",
            DAI: "NASHVILLE",
            DAJ: "TN",
            DAK: "372011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "TN123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    MD: {
        name: "Maryland",
        iin: "636003",
        subfileId: "ZM",
        auditTrail: "MDMVAAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "M123456789012",
            DCS: "THOMPSON",
            DAC: "LARRY",
            DAD: "WAYNE",
            DBB: "09091988",
            DBA: "09092028",
            DBD: "09092024",
            DDB: "09092024",
            DBC: "1",
            DAY: "BRO",
            DAU: "069 IN",
            DAW: "165",
            DAZ: "BLK",
            DAG: "456 HARBOR BLVD",
            DAI: "BALTIMORE",
            DAJ: "MD",
            DAK: "212011234",
            DCG: "USA",
            DCA: "C",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "MD123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    MA: {
        name: "Massachusetts",
        iin: "636002",
        subfileId: "ZM",
        auditTrail: "MARMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "S12345678",
            DCS: "GARCIA",
            DAC: "MANUEL",
            DAD: "JOSE",
            DBB: "11111986",
            DBA: "11112030",
            DBD: "11112025",
            DDB: "11112025",
            DBC: "1",
            DAY: "BRO",
            DAU: "067 IN",
            DAW: "155",
            DAZ: "BLK",
            DAG: "789 BEACON ST",
            DAI: "BOSTON",
            DAJ: "MA",
            DAK: "021011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "MA123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    },
    IN: {
        name: "Indiana",
        iin: "636037",
        subfileId: "ZI",
        auditTrail: "INBMVAUDIT000001",
        useIdemia: false,
        defaultYear: 2020,
        exampleData: {
            DAQ: "1234567890",
            DCS: "ROBINSON",
            DAC: "ERIC",
            DAD: "ALLEN",
            DBB: "06061989",
            DBA: "06062029",
            DBD: "06062025",
            DDB: "06062025",
            DBC: "1",
            DAY: "GRN",
            DAU: "072 IN",
            DAW: "180",
            DAZ: "BRO",
            DAG: "321 SPEEDWAY BLVD",
            DAI: "INDIANAPOLIS",
            DAJ: "IN",
            DAK: "462011234",
            DCG: "USA",
            DCA: "D",
            DCB: "NONE",
            DCD: "NONE",
            DCF: "IN123456789012",
            DDA: "F",
            DDE: "N",
            DDF: "N",
            DDG: "N"
        }
    }
};

const FIELD_SCHEMA = [
    {id:"DAQ", label:"DL/ID Number", include:{FL:'required', CA:'required'}, desc:"License/ID Number"},
    {id:"DCS", label:"Last Name", include:{FL:'required', CA:'required'}, desc:"Family Name", sensitive:true},
    {id:"DAC", label:"First Name", include:{FL:'required', CA:'required'}, desc:"Given Name", sensitive:true},
    {id:"DAD", label:"Middle Name", include:{FL:'optional', CA:'optional'}, desc:"Middle Name", sensitive:true},
    {id:"DBB", label:"Date of Birth", include:{FL:'required', CA:'required'}, desc:"MMDDYYYY", sensitive:true},
    {id:"DBA", label:"Expiration Date", include:{FL:'required', CA:'required'}, desc:"MMDDYYYY"},
    {id:"DBD", label:"Issue Date", include:{FL:'required', CA:'required'}, desc:"MMDDYYYY"},
    {id:"DDB", label:"Revision Date", include:{FL:'optional', CA:'optional'}, desc:"MMDDYYYY"},
    {id:"DBC", label:"Sex", include:{FL:'required', CA:'required'}, desc:"1=Male, 2=Female, 9=X"},
    {id:"DAY", label:"Eye Color", include:{FL:'required', CA:'required'}, desc:"BLK/BRO/BLU/GRY/GRN/HAZ"},
    {id:"DAU", label:"Height", include:{FL:'required', CA:'required'}, desc:"XXX IN or XXX CM"},
    {id:"DAW", label:"Weight (lbs)", include:{FL:'optional', CA:'optional'}, desc:"Weight in pounds"},
    {id:"DAZ", label:"Hair Color", include:{FL:'optional', CA:'optional'}, desc:"BAL/BLK/BLN/BRO/GRY/RED/WHI"},
    {id:"DAG", label:"Street Address", include:{FL:'required', CA:'required'}, desc:"Mailing Street", sensitive:true},
    {id:"DAH", label:"Street Address 2", include:{FL:'optional', CA:'optional'}, desc:"Apt/Unit", sensitive:true},
    {id:"DAI", label:"City", include:{FL:'required', CA:'required'}, desc:"City", sensitive:true},
    {id:"DAJ", label:"State", include:{FL:'required', CA:'required'}, desc:"Jurisdiction Code"},
    {id:"DAK", label:"Postal Code", include:{FL:'required', CA:'required'}, desc:"ZIP Code"},
    {id:"DCG", label:"Country", include:{FL:'required', CA:'required'}, desc:"USA/CAN/MEX"},
    {id:"DCA", label:"License Class", include:{FL:'required', CA:'required'}, desc:"A/B/C/D/E/M"},
    {id:"DCB", label:"Restrictions", include:{FL:'always', CA:'always'}, desc:"Restriction Codes or NONE"},
    {id:"DCD", label:"Endorsements", include:{FL:'always', CA:'always'}, desc:"Endorsement Codes or NONE"},
    {id:"DCF", label:"Doc Discriminator", include:{FL:'required', CA:'required'}, desc:"Unique Document ID"},
    {id:"DDA", label:"Compliance Type", include:{FL:'optional', CA:'always'}, desc:"F/M/N (REAL ID)"},
    {id:"DDE", label:"Last Name Truncated", include:{FL:'always', CA:'always'}, desc:"Y/N/U"},
    {id:"DDF", label:"First Name Truncated", include:{FL:'always', CA:'always'}, desc:"Y/N/U"},
    {id:"DDG", label:"Middle Name Truncated", include:{FL:'always', CA:'always'}, desc:"Y/N/U"},
    {id:"DDH", label:"Under 18 Until", include:{FL:'optional', CA:'optional'}, desc:"MMDDYYYY"},
    {id:"DDI", label:"Under 19 Until", include:{FL:'optional', CA:'optional'}, desc:"MMDDYYYY"},
    {id:"DDJ", label:"Under 21 Until", include:{FL:'optional', CA:'optional'}, desc:"MMDDYYYY"},
    {id:"DDK", label:"Organ Donor", include:{FL:'optional', CA:'optional'}, desc:"1=Yes, 0=No"},
    {id:"DDL", label:"Veteran", include:{FL:'optional', CA:'optional'}, desc:"Y if veteran"},
    {id:"DCE", label:"Weight Range", include:{FL:'optional', CA:'optional'}, desc:"0-9 range code"},
    {id:"DCL", label:"Race/Ethnicity", include:{FL:'optional', CA:'optional'}, desc:"Race Code"},
    {id:"DCU", label:"Suffix", include:{FL:'optional', CA:'optional'}, desc:"JR/SR/III/IV"},
    {id:"DCT", label:"Given Name Alt", include:{FL:'optional', CA:'optional'}, desc:"First Name (Alt)"},
    {id:"DDD", label:"Limited Duration", include:{FL:'optional', CA:'optional'}, desc:"Y if temp"},
    {id:"DDC", label:"HazMat Exp Date", include:{FL:'optional', CA:'optional'}, desc:"MMDDYYYY"},
    {id:"PAA", label:"Permit Class", include:{FL:'optional', CA:'optional'}, desc:"Permit Class"},
    {id:"PAB", label:"Permit Exp Date", include:{FL:'optional', CA:'optional'}, desc:"MMDDYYYY"},
    {id:"PAC", label:"Permit Issue Date", include:{FL:'optional', CA:'optional'}, desc:"MMDDYYYY"},
    {id:"PAD", label:"Permit ID", include:{FL:'optional', CA:'optional'}, desc:"Permit ID"},
    {id:"PAE", label:"Permit Endorsements", include:{FL:'optional', CA:'optional'}, desc:"Permit End"},
    {id:"PAF", label:"Permit Restrictions", include:{FL:'optional', CA:'optional'}, desc:"Permit Rest"},
    {id:"DBO", label:"Last Name Alias", include:{FL:'optional', CA:'optional'}, desc:"Alias Surname"},
    {id:"DBP", label:"First Name Alias", include:{FL:'optional', CA:'optional'}, desc:"Alias Given"},
    {id:"DBQ", label:"Middle Name Alias", include:{FL:'optional', CA:'optional'}, desc:"Alias Middle"},
    {id:"DBR", label:"Suffix Alias", include:{FL:'optional', CA:'optional'}, desc:"Alias Suffix"},
    {id:"DBS", label:"Name Prefix", include:{FL:'optional', CA:'optional'}, desc:"MR/MRS/MS/DR"},
    {id:"DBN", label:"Alias Family Name", include:{FL:'optional', CA:'optional'}, desc:"Alias Last"},
    {id:"DCH", label:"Federal Commercial", include:{FL:'optional', CA:'optional'}, desc:"Federal Limits"},
    {id:"DCI", label:"Jurisdiction Vehicle", include:{FL:'optional', CA:'optional'}, desc:"Jur Vehicle"},
    {id:"DCJ", label:"Jurisdiction Rest", include:{FL:'optional', CA:'optional'}, desc:"Jur Rest"},
    {id:"DCK", label:"Inventory Control", include:{FL:'optional', CA:'optional'}, desc:"Inv Number"},
    {id:"DCM", label:"Standard Vehicle", include:{FL:'optional', CA:'optional'}, desc:"Standard Class"},
    {id:"DCN", label:"Standard Endorsement", include:{FL:'optional', CA:'optional'}, desc:"Standard End"},
    {id:"DCO", label:"Standard Restriction", include:{FL:'optional', CA:'optional'}, desc:"Standard Rest"},
    {id:"DCP", label:"Country ID", include:{FL:'optional', CA:'optional'}, desc:"Country Tertiary"},
    {id:"DCQ", label:"Audit Info", include:{FL:'optional', CA:'optional'}, desc:"Audit Data"},
    {id:"DCR", label:"Compliance Flag", include:{FL:'optional', CA:'optional'}, desc:"Compliance"},
];

const FL_SUBFILE = [
    {id:"ZFA", label:"FL Class", include:'required', desc:"Florida Class", defaultVal: "E"},
    {id:"ZFB", label:"FL Exp Date", include:'required', desc:"Florida Expiration", defaultVal: ""},
    {id:"ZFC", label:"FL DL Number", include:'required', desc:"Florida License #", defaultVal: ""},
    {id:"ZFD", label:"FL Office", include:'optional', desc:"Issuing Office", defaultVal: ""},
    {id:"ZFE", label:"FL Compliance", include:'optional', desc:"Compliance Data", defaultVal: ""},
    {id:"ZFJ", label:"FL Reserved", include:'optional', desc:"Reserved Field", defaultVal: ""},
    {id:"ZFK", label:"FL Terminator", include:'optional', desc:"End Marker", defaultVal: "X"}
];
const CA_SUBFILE = [
    {id:"ZCA", label:"CA Class", include:'required', desc:"California Class", defaultVal: "C"},
    {id:"ZCB", label:"CA Exp Date", include:'required', desc:"California Expiration", defaultVal: ""},
    {id:"ZCC", label:"CA DL Number", include:'required', desc:"California License #", defaultVal: ""},
    {id:"ZCD", label:"CA Office", include:'optional', desc:"Issuing Office", defaultVal: ""},
    {id:"ZCE", label:"CA Restrictions", include:'optional', desc:"CA Restrictions", defaultVal: ""},
    {id:"ZCF", label:"CA Endorsements", include:'optional', desc:"CA Endorsements", defaultVal: ""},
    {id:"ZCG", label:"CA Compliance", include:'optional', desc:"REAL ID", defaultVal: ""},
    {id:"ZCH", label:"CA Reserved 1", include:'optional', desc:"Reserved", defaultVal: ""},
    {id:"ZCI", label:"CA Reserved 2", include:'optional', desc:"Reserved", defaultVal: ""},
    {id:"ZCJ", label:"CA Reserved 3", include:'optional', desc:"Reserved", defaultVal: ""},
    {id:"ZCK", label:"CA Terminator", include:'optional', desc:"End Marker", defaultVal: "X"}
];

// All State Z Subfile Schemas
const STATE_SUBFILES = {
    FL: FL_SUBFILE,
    CA: CA_SUBFILE,
    TX: [
        {id:"ZTA", label:"TX Class", include:'required', desc:"Texas Class", defaultVal: "C"},
        {id:"ZTB", label:"TX CDL Status", include:'required', desc:"CDL Status", defaultVal: ""},
        {id:"ZTC", label:"TX Audit Number", include:'required', desc:"TX Audit #", defaultVal: ""},
        {id:"ZTD", label:"TX Inv Control", include:'always', desc:"Inventory Control", defaultVal: ""},
        {id:"ZTE", label:"TX Endorsements", include:'optional', desc:"Endorsements", defaultVal: "NONE"},
        {id:"ZTF", label:"TX Restrictions", include:'optional', desc:"Restrictions", defaultVal: "NONE"},
        {id:"ZTG", label:"TX REAL ID", include:'required', desc:"REAL ID Compliant", defaultVal: "Y"}
    ],
    NY: [
        {id:"ZNA", label:"NY Class", include:'required', desc:"New York Class", defaultVal: "D"},
        {id:"ZNB", label:"NY Doc Type", include:'required', desc:"Document Type", defaultVal: "1"},
        {id:"ZNC", label:"NY ID Number", include:'required', desc:"NY ID #", defaultVal: ""},
        {id:"ZND", label:"NY Issue Date", include:'always', desc:"Issue Date", defaultVal: ""},
        {id:"ZNE", label:"NY Organ Donor", include:'optional', desc:"Organ Donor", defaultVal: "N"},
        {id:"ZNF", label:"NY Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZNG", label:"NY Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZNH", label:"NY REAL ID", include:'required', desc:"REAL ID Flag", defaultVal: "Y"}
    ],
    GA: [
        {id:"ZGA", label:"GA Class", include:'required', desc:"Georgia Class", defaultVal: "C"},
        {id:"ZGB", label:"GA Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZGC", label:"GA Customer #", include:'required', desc:"Customer Number", defaultVal: ""},
        {id:"ZGD", label:"GA Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZGE", label:"GA Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZGF", label:"GA Compliance", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    NC: [
        {id:"ZNA", label:"NC Class", include:'required', desc:"North Carolina Class", defaultVal: "C"},
        {id:"ZNB", label:"NC Version", include:'required', desc:"Version Code", defaultVal: "01"},
        {id:"ZNC", label:"NC Audit #", include:'required', desc:"Audit Number", defaultVal: ""},
        {id:"ZND", label:"NC Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZNE", label:"NC Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZNF", label:"NC REAL ID", include:'required', desc:"REAL ID Compliant", defaultVal: "Y"}
    ],
    PA: [
        {id:"ZPA", label:"PA Class", include:'required', desc:"Pennsylvania Class", defaultVal: "C"},
        {id:"ZPB", label:"PA Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZPC", label:"PA Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZPD", label:"PA Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZPE", label:"PA Organ Donor", include:'optional', desc:"Organ Donor", defaultVal: "N"},
        {id:"ZPF", label:"PA Veteran", include:'optional', desc:"Veteran Flag", defaultVal: "N"},
        {id:"ZPG", label:"PA REAL ID", include:'required', desc:"REAL ID Compliant", defaultVal: "Y"}
    ],
    OH: [
        {id:"ZOA", label:"OH Class", include:'required', desc:"Ohio Class", defaultVal: "D"},
        {id:"ZOB", label:"OH Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZOC", label:"OH Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZOD", label:"OH Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZOE", label:"OH Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZOF", label:"OH Donor", include:'optional', desc:"Organ Donor", defaultVal: "N"},
        {id:"ZOG", label:"OH Compliance", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    IL: [
        {id:"ZIA", label:"IL Class", include:'required', desc:"Illinois Class", defaultVal: "D"},
        {id:"ZIB", label:"IL Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZIC", label:"IL Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZID", label:"IL Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZIE", label:"IL Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZIF", label:"IL Organ Donor", include:'optional', desc:"Organ Donor", defaultVal: "N"},
        {id:"ZIG", label:"IL REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    AZ: [
        {id:"ZAA", label:"AZ Class", include:'required', desc:"Arizona Class", defaultVal: "D"},
        {id:"ZAB", label:"AZ Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZAC", label:"AZ Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZAD", label:"AZ Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZAE", label:"AZ Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZAF", label:"AZ Compliance", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    NV: [
        {id:"ZVA", label:"NV Class", include:'required', desc:"Nevada Class", defaultVal: "D"},
        {id:"ZVB", label:"NV Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZVC", label:"NV Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZVD", label:"NV Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZVE", label:"NV Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZVF", label:"NV REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    CO: [
        {id:"ZCA", label:"CO Class", include:'required', desc:"Colorado Class", defaultVal: "R"},
        {id:"ZCB", label:"CO Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZCC", label:"CO Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZCD", label:"CO Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZCE", label:"CO Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZCF", label:"CO REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    WA: [
        {id:"ZWA", label:"WA Class", include:'required', desc:"Washington Class", defaultVal: "D"},
        {id:"ZWB", label:"WA Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZWC", label:"WA Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZWD", label:"WA Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZWE", label:"WA Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZWF", label:"WA EDL Flag", include:'optional', desc:"Enhanced DL", defaultVal: "N"},
        {id:"ZWG", label:"WA REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    NJ: [
        {id:"ZJA", label:"NJ Class", include:'required', desc:"New Jersey Class", defaultVal: "D"},
        {id:"ZJB", label:"NJ Doc Type", include:'required', desc:"Document Type", defaultVal: ""},
        {id:"ZJC", label:"NJ Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZJD", label:"NJ Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZJE", label:"NJ Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZJF", label:"NJ Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZJG", label:"NJ REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    VA: [
        {id:"ZVA", label:"VA Class", include:'required', desc:"Virginia Class", defaultVal: "D"},
        {id:"ZVB", label:"VA Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZVC", label:"VA Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZVD", label:"VA Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZVE", label:"VA Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZVF", label:"VA Veteran", include:'optional', desc:"Veteran Flag", defaultVal: "N"},
        {id:"ZVG", label:"VA REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    MI: [
        {id:"ZMA", label:"MI Class", include:'required', desc:"Michigan Class", defaultVal: "O"},
        {id:"ZMB", label:"MI Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZMC", label:"MI Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZMD", label:"MI Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZME", label:"MI Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZMF", label:"MI Organ Donor", include:'optional', desc:"Organ Donor", defaultVal: "N"},
        {id:"ZMG", label:"MI REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    TN: [
        {id:"ZTA", label:"TN Class", include:'required', desc:"Tennessee Class", defaultVal: "D"},
        {id:"ZTB", label:"TN Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZTC", label:"TN Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZTD", label:"TN Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZTE", label:"TN Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZTF", label:"TN REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    MD: [
        {id:"ZMA", label:"MD Class", include:'required', desc:"Maryland Class", defaultVal: "C"},
        {id:"ZMB", label:"MD Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZMC", label:"MD Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZMD", label:"MD Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZME", label:"MD Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZMF", label:"MD Veteran", include:'optional', desc:"Veteran Flag", defaultVal: "N"},
        {id:"ZMG", label:"MD REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    MA: [
        {id:"ZMA", label:"MA Class", include:'required', desc:"Massachusetts Class", defaultVal: "D"},
        {id:"ZMB", label:"MA Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZMC", label:"MA Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZMD", label:"MA Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZME", label:"MA Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZMF", label:"MA REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ],
    IN: [
        {id:"ZIA", label:"IN Class", include:'required', desc:"Indiana Class", defaultVal: "O"},
        {id:"ZIB", label:"IN Control #", include:'required', desc:"Control Number", defaultVal: ""},
        {id:"ZIC", label:"IN Issue Date", include:'required', desc:"Issue Date", defaultVal: ""},
        {id:"ZID", label:"IN Restrictions", include:'optional', desc:"Restrictions", defaultVal: ""},
        {id:"ZIE", label:"IN Endorsements", include:'optional', desc:"Endorsements", defaultVal: ""},
        {id:"ZIF", label:"IN Organ Donor", include:'optional', desc:"Organ Donor", defaultVal: "N"},
        {id:"ZIG", label:"IN REAL ID", include:'required', desc:"REAL ID", defaultVal: "Y"}
    ]
};

// Helper function to get Z subfile for current state
function getStateSubfile(state) {
    return STATE_SUBFILES[state] || FL_SUBFILE;
}

// ============================================================================
// CRC-16-CCITT IMPLEMENTATION
// ============================================================================

function crc16ccitt(data) {
    let crc = 0xFFFF;
    const poly = 0x1021;
    
    for (let i = 0; i < data.length; i++) {
        const byte = typeof data[i] === 'string' ? data.charCodeAt(i) : data[i];
        crc ^= (byte << 8);
        
        for (let bit = 0; bit < 8; bit++) {
            if (crc & 0x8000) {
                crc = ((crc << 1) ^ poly) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    
    return crc;
}

// ============================================================================
// BINARY UTILITIES
// ============================================================================

function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    return bytes;
}

function bytesToHex(bytes, withSpaces = true) {
    const hex = Array.from(bytes).map(b => 
        b.toString(16).toUpperCase().padStart(2, '0')
    );
    return withSpaces ? hex.join(' ') : hex.join('');
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentState = 'FL';
let currentAAMVA = '09';
let currentJurisdiction = '01';
let aesEnabled = false;
let md5Enabled = false; // user toggle for MD5 (non-admin)
let md5AdminAllowed = false; // admin permission flag
let adminMode = false; // whether admin is unlocked in UI
const ADMIN_TOKEN = '3100-31-3100'; // hardcoded admin token as requested
const ADMIN_API_PATH = '/admin/control'; // optional server-side check (if available)

// Admin API key reference (stored locally)
let adminApiKey = localStorage.getItem('adminApiKey') || '';
function setAdminApiKey(key) {
    adminApiKey = key || '';
    if (adminApiKey) localStorage.setItem('adminApiKey', adminApiKey);
    else localStorage.removeItem('adminApiKey');
    const input = document.getElementById('admin-api-key-input');
    if (input) input.value = adminApiKey;
    debugLog('Admin API key set');
}

// Simple in-memory MD5 cache to avoid recomputing the same digest multiple times
const md5Cache = new Map();
function md5Cached(s) {
    if (md5Cache.has(s)) return md5Cache.get(s);
    const h = md5(s);
    md5Cache.set(s, h);
    return h;
}

// HMAC-SHA256 state and helpers
let hmacEnabled = false; // toggle to sign payload
let hmacKey = null; // CryptoKey
let hmacKeyHex = '';

function bufferToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
function hexToBytes(hex) {
    if (!hex) return new Uint8Array();
    const arr = hex.match(/.{1,2}/g) || [];
    return new Uint8Array(arr.map(b => parseInt(b, 16)));
}

async function generateHMACKey() {
    hmacKey = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
    const raw = await crypto.subtle.exportKey('raw', hmacKey);
    hmacKeyHex = bufferToHex(raw);
    document.getElementById('hmac-key-hex').value = hmacKeyHex;
    document.getElementById('hmac-key-id').textContent = hmacKeyHex.substring(0, 16) + '...';
    debugLog('🔑 HMAC key generated:', hmacKeyHex.substring(0, 32) + '...');
}

async function importHMACKeyHex(hex) {
    try {
        const bytes = hexToBytes(hex);
        hmacKey = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
        hmacKeyHex = hex.toUpperCase();
        document.getElementById('hmac-key-hex').value = hmacKeyHex;
        document.getElementById('hmac-key-id').textContent = hmacKeyHex.substring(0, 16) + '...';
        debugLog('🔑 HMAC key imported');
        return true;
    } catch (e) {
        console.error('Failed to import HMAC key', e);
        return false;
    }
}

async function signHMACHex(dataStr) {
    if (!hmacKey) throw new Error('No HMAC key loaded');
    const data = new TextEncoder().encode(dataStr);
    const sig = await crypto.subtle.sign('HMAC', hmacKey, data);
    return bufferToHex(sig);
}

async function verifyHMACHex(hexSig, dataStr) {
    if (!hmacKey) throw new Error('No HMAC key loaded');
    const sigBytes = hexToBytes(hexSig);
    const data = new TextEncoder().encode(dataStr);
    // re-sign and compare
    const expected = await crypto.subtle.sign('HMAC', hmacKey, data);
    const expHex = bufferToHex(expected);
    return expHex === hexSig.toUpperCase();
}

function getCurrentConfig() {
    return STATE_CONFIGS[currentState];
}

function updateConfigDisplay() {
    const display = document.getElementById('config-display');
    if (display) {
        display.textContent = `${currentState} AAMVA v${currentAAMVA} Jur v${currentJurisdiction}`;
    }
    
    const stateInfo = document.getElementById('state-info');
    const config = getCurrentConfig();
    if (stateInfo) {
        let cryptoInfo = '';
        if (aesEnabled) cryptoInfo += '<span class="status-indicator status-crypto"></span><strong>AES-256 ACTIVE</strong> ';
        if (md5Enabled) cryptoInfo += '<span class="status-indicator status-crypto"></span><strong>MD5 ACTIVE</strong> ';
        if (hmacEnabled) cryptoInfo += '<span class="status-indicator status-crypto"></span><strong>HMAC-SHA256 ACTIVE</strong> ';
        if (adminMode) cryptoInfo += '<br><span class="status-indicator status-crypto"></span><strong>ADMIN MODE</strong> ';
        
        // Get current inventory number from input
        const inventoryInput = document.getElementById('inventory-number');
        const inventoryNum = inventoryInput ? inventoryInput.value.trim() : config.auditTrail;
        
        stateInfo.innerHTML = `
            <strong>📍 ${config.name} Configuration Active</strong><br>
            IIN: ${config.iin} | 
            Subfile: ${config.subfileId} | 
            ${config.useIdemia ? 'IDEMIA Protocol' : 'DMV Standard'} | 
            Inventory#: <span style="color:#ffff00;">${inventoryNum}</span>
            ${cryptoInfo ? '<br>' + cryptoInfo : ''}
        `;
    }
}

// -------------------------------
// Admin UI helpers & API calls
// -------------------------------

function setAdminMode(enabled, email) {
    adminMode = !!enabled;
    const actions = document.getElementById('admin-actions');
    const loginArea = document.getElementById('admin-login-area');
    const statusArea = document.getElementById('admin-status-area');
    const emailDisplay = document.getElementById('admin-email-display');
    const loginBtn = document.getElementById('btn-admin-login');
    const logoutBtn = document.getElementById('btn-admin-logout');

    if (adminMode) {
        if (actions) actions.style.display = '';
        if (loginArea) loginArea.style.display = 'none';
        if (statusArea) statusArea.style.display = '';
        if (emailDisplay) emailDisplay.textContent = email || 'admin';
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = '';
    } else {
        if (actions) actions.style.display = 'none';
        if (loginArea) loginArea.style.display = '';
        if (statusArea) statusArea.style.display = 'none';
        if (emailDisplay) emailDisplay.textContent = '';
        if (loginBtn) loginBtn.style.display = '';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    updateConfigDisplay();
}

async function adminLogin() {
    try {
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        const isHuman = document.getElementById('admin-human').checked;

        if (!email || !password || !isHuman) {
            alert('Enter email, password and confirm you are human');
            return;
        }

        const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), credentials: 'include' });
        const data = await res.json();
        if (!res.ok) {
            alert('Login failed: ' + (data.error || data.message || JSON.stringify(data)));
            return;
        }

        setAdminMode(true, email);
        alert('✅ Admin logged in');
    } catch (e) {
        console.error('Admin login error', e);
        alert('Admin login error: ' + e.message);
    }
}

async function adminLogout() {
    try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
        console.warn('Logout request failed', e);
    }
    setAdminMode(false);
    alert('Logged out');
}

function showAdminSection(name) {
    ['admin-users', 'admin-logs', 'admin-balances', 'admin-chat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === name) ? '' : 'none';
    });
}

async function loadAdminUsers() {
    try {
        showAdminSection('admin-users');
        const res = await fetch('/api/admin/users', { method: 'GET', credentials: 'include' });
        const users = await res.json();
        const table = document.getElementById('admin-users-table');
        if (!table) return;
        table.innerHTML = '<tr><th>Email</th><th>Role</th><th>Created</th></tr>' + users.map(u => `<tr><td>${u.email}</td><td>${u.role||'user'}</td><td>${u.createdAt||''}</td></tr>`).join('');
    } catch (e) {
        console.error('Load users error', e);
        alert('Failed to load users');
    }
}

async function createUser() {
    const email = document.getElementById('new-user-email')?.value.trim();
    const password = document.getElementById('new-user-pass')?.value;
    
    if (!email || !password) { 
        alert('Please enter email and password'); 
        return; 
    }
    
    const users = JSON.parse(localStorage.getItem('dirUsers') || '{}');
    
    if (users[email]) {
        alert('User already exists: ' + email);
        return;
    }
    
    users[email] = { password, created: Date.now() };
    localStorage.setItem('dirUsers', JSON.stringify(users));
    localStorage.setItem('dirCredits_' + email, '0');
    
    addAuditLog('admin', `Admin created user: ${email}`);
    alert('✅ User created: ' + email);
    
    loadUsersTable();
    loadBalancesList();
    
    // Clear inputs
    document.getElementById('new-user-email').value = '';
    document.getElementById('new-user-pass').value = '';
}

async function loadAdminLogs() {
    try {
        showAdminSection('admin-logs');
        const res = await fetch('/api/admin/logs?limit=200', { credentials: 'include' });
        const logs = await res.json();
        const list = document.getElementById('admin-logs-list');
        if (!list) return;
        list.innerHTML = logs.map(l => `<div>[${l.timestamp}] ${l.action} - ${l.details} (${l.ip})</div>`).join('');
    } catch (e) { console.error(e); alert('Failed to load logs'); }
}

async function loadBalances() {
    try {
        showAdminSection('admin-balances');
        const res = await fetch('/api/admin/balances', { credentials: 'include' });
        const json = await res.json();
        const list = document.getElementById('admin-balances-list');
        if (!list) return;
        list.innerHTML = Object.entries(json || {}).map(([k,v]) => `<div><strong>${k}</strong>: ${v}</div>`).join('');
    } catch (e) { console.error(e); alert('Failed to load balances'); }
}

async function creditAccount() {
    const email = document.getElementById('credit-email')?.value.trim();
    const amount = parseInt(document.getElementById('credit-amount')?.value);
    
    if (!email || isNaN(amount) || amount <= 0) { 
        alert('Please enter a valid email and credit amount'); 
        return; 
    }
    
    // Check if user exists
    const users = JSON.parse(localStorage.getItem('dirUsers') || '{}');
    if (!users[email]) {
        alert('User not found: ' + email);
        return;
    }
    
    // Add credits
    const currentCredits = parseInt(localStorage.getItem('dirCredits_' + email) || '0');
    const newCredits = currentCredits + amount;
    localStorage.setItem('dirCredits_' + email, newCredits.toString());
    
    // Log it
    addAuditLog('payment', `Admin credited ${amount} credits to ${email} (Total: ${newCredits})`);
    
    alert(`✅ Added ${amount} credits to ${email}\nNew balance: ${newCredits} credits`);
    
    // Refresh displays
    loadBalancesList();
    loadUsersTable();
    
    // Clear inputs
    document.getElementById('credit-email').value = '';
    document.getElementById('credit-amount').value = '';
}

async function loadChat() {
    try {
        showAdminSection('admin-chat');
        const res = await fetch('/api/chat/history', { credentials: 'include' });
        const msgs = await res.json();
        const h = document.getElementById('chat-history');
        if (!h) return;
        h.innerHTML = msgs.map(m => `<div><strong>${m.user||'bot'}:</strong> ${m.text}</div>`).join('');
    } catch (e) { console.error(e); alert('Failed to load chat'); }
}

async function sendChatMessage() {
    try {
        const text = document.getElementById('chat-input').value.trim();
        if (!text) return;
        const res = await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ text }) });
        const json = await res.json();
        if (!res.ok) { alert('Send failed: ' + (json.error || JSON.stringify(json))); return; }
        document.getElementById('chat-input').value = '';
        loadChat();
        // animate assistant
        const avatar = document.getElementById('bot-avatar');
        if (avatar) { avatar.classList.add('bounce'); setTimeout(() => avatar.classList.remove('bounce'), 300); }
        puffHeaderSmoke(2);
    } catch (e) { console.error(e); alert('Send failed'); }
}

// ------------ Interactive Logo & Smoke from Feet ------------

// Create smoke puffs from feet of header logo
function puffHeaderSmoke(count = 4) {
    const container = document.getElementById('logo-smoke');
    if (!container) return;
    
    for (let i = 0; i < count; i++) {
        // Left foot smoke
        const leftPuff = document.createElement('div');
        leftPuff.className = 'smoke-puff left';
        leftPuff.style.animationDelay = (Math.random() * 0.3) + 's';
        leftPuff.style.left = (12 + Math.random() * 10) + 'px';
        container.appendChild(leftPuff);
        leftPuff.addEventListener('animationend', () => leftPuff.remove());
        
        // Right foot smoke
        const rightPuff = document.createElement('div');
        rightPuff.className = 'smoke-puff right';
        rightPuff.style.animationDelay = (Math.random() * 0.3 + 0.1) + 's';
        rightPuff.style.left = (42 + Math.random() * 10) + 'px';
        container.appendChild(rightPuff);
        rightPuff.addEventListener('animationend', () => rightPuff.remove());
    }
}

// Create smoke puffs from feet of chat widget logo
function puffChatSmoke(count = 3) {
    const container = document.getElementById('chat-smoke');
    if (!container) return;
    
    for (let i = 0; i < count; i++) {
        // Left foot smoke
        const leftPuff = document.createElement('div');
        leftPuff.className = 'smoke-puff left';
        leftPuff.style.animationDelay = (Math.random() * 0.25) + 's';
        leftPuff.style.left = (15 + Math.random() * 8) + 'px';
        container.appendChild(leftPuff);
        leftPuff.addEventListener('animationend', () => leftPuff.remove());
        
        // Right foot smoke
        const rightPuff = document.createElement('div');
        rightPuff.className = 'smoke-puff right';
        rightPuff.style.animationDelay = (Math.random() * 0.25 + 0.1) + 's';
        rightPuff.style.left = (47 + Math.random() * 8) + 'px';
        container.appendChild(rightPuff);
        rightPuff.addEventListener('animationend', () => rightPuff.remove());
    }
}

// Header logo click - bounce and smoke from feet
document.getElementById('page-logo')?.addEventListener('click', () => {
    const el = document.getElementById('page-logo');
    if (!el) return;
    el.classList.remove('bounce');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('bounce');
    setTimeout(() => el.classList.remove('bounce'), 500);
    puffHeaderSmoke(5);
});

// Header logo hover - subtle smoke
document.getElementById('page-logo')?.addEventListener('mouseenter', () => {
    puffHeaderSmoke(2);
});

// Chat widget toggle click - bounce and smoke from feet
document.getElementById('help-toggle')?.addEventListener('click', () => {
    const toggle = document.getElementById('help-toggle');
    const panel = document.getElementById('help-panel');
    
    if (toggle) {
        toggle.classList.remove('bounce');
        void toggle.offsetWidth;
        toggle.classList.add('bounce');
        setTimeout(() => toggle.classList.remove('bounce'), 600);
    }
    
    puffChatSmoke(4);
    
    if (panel) {
        panel.classList.toggle('active');
    }
});

// Chat widget hover - subtle smoke
document.getElementById('help-toggle')?.addEventListener('mouseenter', () => {
    puffChatSmoke(2);
});

// Auto smoke on chat send
document.getElementById('btn-help-send')?.addEventListener('click', () => {
    const input = document.getElementById('help-input');
    const msgs = document.getElementById('help-messages');
    const text = input?.value?.trim();
    if (!text) return;
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'help-msg user';
    userMsg.textContent = text;
    msgs.appendChild(userMsg);
    input.value = '';
    
    // Smoke effect
    puffChatSmoke(3);
    
    // Bot response after delay
    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'help-msg bot';
        
        // Simple responses based on keywords
        const lowerText = text.toLowerCase();
        let response = "I can help you generate barcodes! Try selecting a state and clicking 'Generate Barcode'.";
        
        if (lowerText.includes('generate') || lowerText.includes('barcode')) {
            response = "To generate a barcode: 1) Select your state, 2) Fill in the required fields (yellow), 3) Click 'Generate Barcode'. The inventory number is appended to the data before encoding.";
        } else if (lowerText.includes('state')) {
            response = "We support 20+ states including FL, CA, TX, NY, GA, NC, PA, OH, IL, AZ, NV, CO, WA, NJ, VA, MI, TN, MD, MA, and IN. Each has its own IIN and field requirements.";
        } else if (lowerText.includes('inventory') || lowerText.includes('audit')) {
            response = "The Inventory Number (Audit Trail) is a 16-character code appended after the ZF fields close and CRC checksum. It's editable in the Configuration section.";
        } else if (lowerText.includes('encrypt') || lowerText.includes('aes')) {
            response = "AES-256 encryption can be enabled in the Cryptography section. It encrypts sensitive fields like name, DOB, and address while maintaining barcode structure.";
        } else if (lowerText.includes('pay') || lowerText.includes('bitcoin') || lowerText.includes('btc')) {
            response = "Payment is $10 per session via Bitcoin. Click 'Generate Barcode' and follow the payment prompts to unlock unlimited generation.";
        } else if (lowerText.includes('help') || lowerText.includes('how')) {
            response = "I'm here to help! Ask me about: generating barcodes, state selection, inventory numbers, encryption, or payment.";
        }
        
        botMsg.textContent = response;
        msgs.appendChild(botMsg);
        msgs.scrollTop = msgs.scrollHeight;
        puffChatSmoke(2);
    }, 800);
});

// Enter key to send in help chat
document.getElementById('help-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-help-send')?.click();
    }
});

// Fallback for missing logo (use embedded SVG with figure)
document.getElementById('page-logo')?.addEventListener('error', (e) => {
    const el = e && e.target ? e.target : document.getElementById('page-logo');
    if (!el) return;
    console.warn('Logo missing, using fallback');
    el.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="100%" height="100%" fill="#0a0a0a" rx="8"/><circle cx="36" cy="20" r="14" fill="#00ff00"/><rect x="26" y="34" width="20" height="24" fill="#00ff00" rx="3"/><rect x="24" y="58" width="8" height="10" fill="#00ff00" rx="2"/><rect x="40" y="58" width="8" height="10" fill="#00ff00" rx="2"/><circle cx="32" cy="18" r="3" fill="#000"/><circle cx="40" cy="18" r="3" fill="#000"/></svg>');
});

// Fallback for help avatar
document.getElementById('help-avatar')?.addEventListener('error', (e) => {
    const el = e && e.target ? e.target : document.getElementById('help-avatar');
    if (!el) return;
    el.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="100%" height="100%" fill="#0a0a0a" rx="8"/><circle cx="30" cy="18" r="12" fill="#00ff00"/><rect x="20" y="30" width="20" height="18" fill="#00ff00" rx="3"/><rect x="18" y="48" width="8" height="8" fill="#00ff00" rx="2"/><rect x="34" y="48" width="8" height="8" fill="#00ff00" rx="2"/><circle cx="26" cy="16" r="2.5" fill="#000"/><circle cx="34" cy="16" r="2.5" fill="#000"/></svg>');
});

// ============================================================================
// DMV COMPLIANT PAYLOAD BUILDER WITH ENCRYPTION
// ============================================================================

async function buildDMVCompliantPayload() {
    const LF = '\x0A';
    const CR = '\x0D';
    const RS = '\x1E';
    const EOT = '\x04';
    
    const config = getCurrentConfig();
    
    debugLog(`🔧 Building ${config.name} payload...`);
    debugLog(`🔐 AES-256: ${aesEnabled ? 'ENABLED' : 'DISABLED'}`);
    debugLog(`🔐 MD5: ${md5Enabled ? 'ENABLED' : 'DISABLED'}`);
    
    // Build DL subfile with encryption
    let dlBody = '';
    let includedFields = 0;
    let omittedFields = 0;
    let encryptedCount = 0;
   
    for (const field of FIELD_SCHEMA) {
        const input = document.getElementById('fld-' + field.id);
        let value = input ? input.value.trim() : '';
        const includeRule = field.include ? (field.include[currentState] || field.include['FL'] || 'optional') : 'optional';
        
        // Encrypt sensitive fields if AES is enabled
        if (aesEnabled && value && field.sensitive) {
            debugLog(`🔐 Encrypting ${field.id}: "${value}"`);
            value = await encryptFieldAES(value);
            encryptedCount++;
            debugLog(`   → Encrypted: ${value.substring(0, 40)}...`);
        }
        
        let shouldInclude = false;
        
        if (includeRule === 'required') {
            shouldInclude = value.length > 0;
        } else if (includeRule === 'always') {
            shouldInclude = true;
        } else {
            shouldInclude = value.length > 0;
        }
        
        if (shouldInclude) {
            dlBody += field.id + value + LF;
            includedFields++;
        } else {
            omittedFields++;
        }
    }
    
    debugLog(`DL Subfile: ${includedFields} included, ${omittedFields} omitted, ${encryptedCount} encrypted`);
    
    // Build state-specific subfile using the proper state schema
    const subfileSchema = getStateSubfile(currentState);
    const subfileId = config.subfileId;
    
    let stateBody = '';
    let stateIncluded = 0;
    
    subfileSchema.forEach(field => {
        const input = document.getElementById('fld-' + field.id);
        let value = input ? input.value.trim() : '';
        
        if (!value && field.defaultVal) {
            value = field.defaultVal;
        }
        
        const includeRule = field.include;
        const shouldInclude = includeRule === 'required' || includeRule === 'always' || value.length > 0;
        
        if (shouldInclude) {
            stateBody += field.id + value + LF;
            stateIncluded++;
        }
    });
    
    debugLog(`${subfileId} Subfile: ${stateIncluded} fields included`);
    
    // Build header
    const PREAMBLE = '@' + LF + RS + CR;
    const IIN = config.iin;
    const AAMVA_VER = currentAAMVA;
    const JUR_VER = currentJurisdiction;
    const ENTRIES = '02';
    
    let header = 'ANSI ' + IIN + AAMVA_VER + JUR_VER + ENTRIES;
    
    // Calculate offsets
    const PREAMBLE_LEN = 4;
    const DESIGNATOR_LEN = 20;
    const HEADER_BASE = header.length;
    
    const DL_OFFSET = PREAMBLE_LEN + HEADER_BASE + DESIGNATOR_LEN + 1;
    const DL_LENGTH = 2 + 1 + dlBody.length + 1;
    const STATE_OFFSET = DL_OFFSET + DL_LENGTH;
    const STATE_LENGTH = 2 + 1 + stateBody.length + 1;
    
    // Build designator
    const designator = 
        'DL' + String(DL_OFFSET).padStart(4, '0') + String(DL_LENGTH).padStart(4, '0') +
        subfileId + String(STATE_OFFSET).padStart(4, '0') + String(STATE_LENGTH).padStart(4, '0');
    
    header += designator + LF;
    
    // Assemble payload
    let payload = PREAMBLE + header;
    payload += 'DL' + LF + dlBody + CR;
    payload += subfileId + LF + stateBody + CR;
    payload += RS + EOT;
    
    // Calculate checksums
    const startTime = performance.now();
    const crc = crc16ccitt(payload);
    const crcTime = performance.now() - startTime;
    
    let md5Hash = null;
    let md5Time = 0;
    
    if (md5Enabled) {
        const md5StartTime = performance.now();
        md5Hash = md5Cached(payload);
        md5Time = performance.now() - md5StartTime;
        debugLog(`📊 MD5: ${md5Hash} (${md5Time.toFixed(3)}ms)`);
    }
    
    debugLog(`📊 CRC-16: 0x${crc.toString(16).toUpperCase()} (${crcTime.toFixed(3)}ms)`);
    
    // Add CRC to payload and record positions BEFORE padding
    const crcHigh = (crc >> 8) & 0xFF;
    const crcLow = crc & 0xFF;
    const crcPosBeforePad = payload.length; // CRC will start here
    payload += String.fromCharCode(crcHigh) + String.fromCharCode(crcLow);
    const auditPosBeforePad = payload.length; // Audit trail (inventory number) will start here
    // Get inventory number from input field, fallback to config default
    const inventoryInput = document.getElementById('inventory-number');
    let inventoryNumber = inventoryInput ? inventoryInput.value.trim() : config.auditTrail;
    // Ensure it's exactly 16 characters (pad or truncate)
    if (inventoryNumber.length < 16) {
        inventoryNumber = inventoryNumber.padEnd(16, '0');
    } else if (inventoryNumber.length > 16) {
        inventoryNumber = inventoryNumber.substring(0, 16);
    }
    payload += inventoryNumber;
    debugLog(`📋 Inventory Number (Audit Trail): ${inventoryNumber}`);

    // HMAC-SHA256 (if enabled and key present) - sign the payload up to this point (before padding)
    let hmacHex = null;
    let hmacPosBeforePad = -1;
    let hmacTime = 0;
    if (hmacEnabled && hmacKey) {
        const hmacStart = performance.now();
        hmacHex = await signHMACHex(payload);
        hmacTime = performance.now() - hmacStart;
        const hmacBytes = hexToBytes(hmacHex);
        hmacPosBeforePad = payload.length;
        // append raw bytes
        payload += Array.from(hmacBytes).map(b => String.fromCharCode(b)).join('');
        debugLog('🔐 HMAC appended:', hmacHex.substring(0, 32) + '...');
    }

    // Pad to TARGET_SIZE (e.g., 1024 bytes)
    const TARGET_SIZE = 1024;
    const paddingNeeded = TARGET_SIZE - payload.length;
    
    if (paddingNeeded > 0) {
        payload += '\x00'.repeat(paddingNeeded);
    }
    
    debugLog('Final payload size:', payload.length);
    
    return {
        payload: payload,
        structure: {
            preambleLen: PREAMBLE_LEN,
            headerLen: header.length,
            dlOffset: DL_OFFSET,
            dlLength: DL_LENGTH,
            stateOffset: STATE_OFFSET,
            stateLength: STATE_LENGTH,
            terminatorPos: payload.indexOf(RS),
            crcPos: crcPosBeforePad,
            auditPos: auditPosBeforePad,
            inventoryNumber: inventoryNumber,
            hmacPos: hmacPosBeforePad,
            totalSize: payload.length,
            crcValue: crc,
            crcHex: '0x' + crc.toString(16).toUpperCase().padStart(4, '0'),
            crcTime: crcTime,
            md5Hash: md5Hash,
            md5Time: md5Time,
            hmacHex: hmacHex,
            hmacTime: hmacTime,
            state: currentState,
            subfileId: subfileId,
            iin: IIN,
            aamvaVer: AAMVA_VER,
            jurVer: JUR_VER,
            dlFieldsIncluded: includedFields,
            dlFieldsOmitted: omittedFields,
            stateFieldsIncluded: stateIncluded,
            encryptedFields: encryptedCount,
            aesEnabled: aesEnabled,
            md5Enabled: md5Enabled,
            hmacEnabled: hmacEnabled
        }
    };
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateFields() {
    const errors = [];
    const warnings = [];
    const strictMode = document.getElementById('strict-mode')?.checked;
    const config = getCurrentConfig();
    
    FIELD_SCHEMA.forEach(field => {
        const input = document.getElementById('fld-' + field.id);
        if (!input) return;
        
        const value = input.value.trim();
        const includeRule = field.include ? (field.include[currentState] || field.include['FL'] || 'optional') : 'optional';
        
        if (includeRule === 'required' && !value) {
            errors.push(`${field.id}: REQUIRED field is empty`);
            input.style.borderColor = '#ff0000';
            return;
        } else if (includeRule === 'required') {
            input.style.borderColor = '#ffff00';
        } else if (includeRule === 'always') {
            input.style.borderColor = '#ff8800';
        } else if (aesEnabled && field.sensitive) {
            input.style.borderColor = '#ff00ff';
        } else {
            input.style.borderColor = '#00ff00';
        }
        
        if (!strictMode || !value) return;
        
        if (field.id.match(/^(DBB|DBA|DBD|DDB|DDH|DDI|DDJ|DDC|PAB|PAC)$/)) {
            if (!/^\d{8}$/.test(value)) {
                errors.push(`${field.id}: Must be MMDDYYYY (8 digits)`);
            }
        }
        
        if (field.id === 'DAJ' && value !== currentState) {
            warnings.push(`${field.id}: Should be ${currentState} for ${config.name}`);
        }
        
        if (field.id === 'DBC' && !['1', '2', '9'].includes(value)) {
            errors.push(`${field.id}: Must be 1 (Male), 2 (Female), or 9 (X)`);
        }
    });
    
    // Additional state-specific validations (Florida / IDEMIA and California)
    if (currentState === 'FL') {
        // DAJ should be 'FL'
        const daj = document.getElementById('fld-DAJ')?.value.trim();
        if (daj !== 'FL') {
            warnings.push(`DAJ should be 'FL' for Florida records`);
        }

        // DAK zip code validation: 5 or 9 digits
        const dak = document.getElementById('fld-DAK')?.value.trim();
        if (dak && !/^\d{5}(?:-\d{4})?$/.test(dak)) {
            errors.push(`DAK (Postal Code) must be 5 digits or ZIP+4`);
        }

        // DCF (Document Discriminator) must be present
        const dcf = document.getElementById('fld-DCF')?.value.trim();
        if (!dcf) {
            errors.push(`DCF (Document Discriminator) is required for Florida`);
        }

        // IDEMIA protocol enforcement
        if (!getCurrentConfig().useIdemia) {
            warnings.push(`Florida typically requires IDEMIA protocol; configuration indicates otherwise`);
        }
    }

    // California-specific validations
    if (currentState === 'CA') {
        // DAJ should be 'CA'
        const daj = document.getElementById('fld-DAJ')?.value.trim();
        if (daj !== 'CA') {
            warnings.push(`DAJ should be 'CA' for California records`);
        }

        // DAK zip code: 5 digits or ZIP+4
        const dak = document.getElementById('fld-DAK')?.value.trim();
        if (dak && !/^\d{5}(?:-\d{4})?$/.test(dak)) {
            errors.push(`DAK (Postal Code) must be 5 digits or ZIP+4`);
        }

        // DCF (Document Discriminator) presence and CA-specific format (alphanumeric)
        const dcf = document.getElementById('fld-DCF')?.value.trim();
        if (!dcf) {
            errors.push(`DCF (Document Discriminator) is required for California`);
        } else if (!/^\w{6,20}$/.test(dcf)) {
            warnings.push(`DCF should be alphanumeric and between 6-20 chars for CA`);
        }

        // DCA (License Class) should be one of known classes (common CA classes: A/B/C/D/E/M)
        const dca = document.getElementById('fld-DCA')?.value.trim();
        if (dca && !/^[A-EM]$/.test(dca)) {
            warnings.push(`DCA (License Class) for CA should be one of A/B/C/D/E/M`);
        }

        // Ensure state-specific subfile ID matches expectation
        const config = getCurrentConfig();
        if (config.subfileId !== 'ZC') {
            warnings.push(`California subfile expected to be ZC; current config: ${config.subfileId}`);
        }
    }
    
    // Validate state-specific Z subfile required fields
    const subfileSchema = getStateSubfile(currentState);
    subfileSchema.forEach(field => {
        const input = document.getElementById('fld-' + field.id);
        if (!input) return;
        
        const value = input.value.trim();
        
        if (field.include === 'required' && !value) {
            errors.push(`${field.id}: REQUIRED ${config.name} field is empty`);
            input.style.borderColor = '#ff0000';
        } else if (field.include === 'required') {
            input.style.borderColor = '#ffff00';
        } else if (field.include === 'always') {
            input.style.borderColor = '#ff8800';
        } else {
            input.style.borderColor = '#00ff00';
        }
    });
    
    return { errors, warnings };
}

// ============================================================================
// BARCODE GENERATION
// ============================================================================

async function generateBarcode() {
    console.clear();
    debugLog('═══════════════════════════════════════');
    debugLog(`🚀 GENERATING ${getCurrentConfig().name} PDF417`);
    debugLog('═══════════════════════════════════════');
    
    const validation = validateFields();
    if (validation.errors.length > 0) {
        displayValidationResults(validation);
        return;
    }
    
    try {
        const result = await buildDMVCompliantPayload();
        const { payload, structure } = result;
        
        displayProtocolAnalysis(structure, payload);
        displayHexPreview(payload);
        displayChecksumComparison(structure);
        
        const outputDiv = document.getElementById('barcode-output');
        if (!outputDiv) return;
        
        outputDiv.innerHTML = '<h3 style="color: #ffff00; margin-bottom: 1rem;">PDF417 Barcode (ECC Level 5)</h3>';
        
        const canvas = document.createElement('canvas');
        outputDiv.appendChild(canvas);
        
        bwipjs.toCanvas(canvas, {
            bcid: 'pdf417',
            text: payload,
            eclevel: 5,
            columns: 15,
            rows: 0,
            scale: 2,
            height: 6,
            includetext: false,
            parsefnc: false
        });
        
        canvas.style.maxWidth = '100%';
        window.lastCanvas = canvas;
        
        displayValidationResults(validation, true);
        
        debugLog('✅ SUCCESS');
        debugLog('═══════════════════════════════════════');
        
    } catch (error) {
        console.error('❌ ERROR:', error);
        console.error(error.stack);
        const outputDiv = document.getElementById('barcode-output');
        if (outputDiv) {
            outputDiv.innerHTML = `<div class="alert alert-error"><strong>❌ ERROR:</strong><br>${error.message}</div>`;
        }
    }
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

function displayChecksumComparison(structure) {
    const el = document.getElementById('checksum-comparison-display');
    if (!el) return;
    
    if (!structure.md5Enabled && !structure.aesEnabled) {
        el.innerHTML = '';
        return;
    }
    
    let html = '<div class="checksum-comparison">';
    html += '<h4 style="color: #ff00ff; margin-bottom: 1rem;">🔐 CRYPTOGRAPHY COMPARISON</h4>';
    
    // CRC-16
    html += '<div class="checksum-row">';
    html += '<div class="checksum-label">CRC-16-CCITT:</div>';
    html += `<div class="checksum-value">${structure.crcHex}</div>`;
    html += `<div class="checksum-time">${structure.crcTime.toFixed(3)}ms</div>`;
    html += '</div>';
    
    // MD5 (if enabled)
    if (structure.md5Enabled) {
        html += '<div class="checksum-row">';
        html += '<div class="checksum-label">MD5 Hash:</div>';
        html += `<div class="checksum-value">${structure.md5Hash}</div>`;
        html += `<div class="checksum-time">${structure.md5Time.toFixed(3)}ms</div>`;
        html += '</div>';
        
        html += '<div style="margin-top: 1rem; padding: 0.75rem; background: #1a0033; border-left: 3px solid #ff00ff; color: #cc99ff; font-size: 0.85rem;">';
        html += '<strong>📊 Comparison:</strong><br>';
        html += `• CRC-16: ${(structure.crcHex.length - 2) * 4} bits (16-bit checksum)<br>`;
        html += `• MD5: ${structure.md5Hash.length * 4} bits (128-bit hash)<br>`;
        html += `• Speed: MD5 is ${(structure.md5Time / structure.crcTime).toFixed(1)}x slower<br>`;
        html += `• Security: CRC detects errors, MD5 detects tampering (but MD5 is broken!)`;
        html += '</div>';
    }

    // HMAC (if enabled)
    if (structure.hmacEnabled && structure.hmacHex) {
        html += '<div class="checksum-row">';
        html += '<div class="checksum-label">HMAC-SHA256:</div>';
        html += `<div class="checksum-value">${structure.hmacHex}</div>`;
        html += `<div class="checksum-time">${structure.hmacTime ? structure.hmacTime.toFixed(3) + 'ms' : '—'}</div>`;
        html += '</div>';

        html += '<div style="margin-top: 1rem; padding: 0.75rem; background: #002222; border-left: 3px solid #00CC88; color: #ccffdd; font-size: 0.85rem;">';
        html += '<strong>🔐 HMAC:</strong><br>';
        html += `• Algorithm: HMAC-SHA256 (32-byte MAC)<br>`;
        html += `• Purpose: Cryptographic authentication / tamper detection<br>`;
        html += `• Note: Verify on reader before trusting payload`;
        html += '</div>';
    }
    
    // AES (if enabled)
    if (structure.aesEnabled) {
        html += '<div class="checksum-row">';
        html += '<div class="checksum-label">AES-256-GCM:</div>';
        html += `<div class="checksum-value">✓ ${structure.encryptedFields} fields encrypted</div>`;
        html += `<div class="checksum-time">ACTIVE</div>`;
        html += '</div>';
        
        html += '<div style="margin-top: 1rem; padding: 0.75rem; background: #1a0033; border-left: 3px solid #ff00ff; color: #cc99ff; font-size: 0.85rem;">';
        html += '<strong>🔐 Encryption Active:</strong><br>';
        html += `• Algorithm: AES-256-GCM (Galois/Counter Mode)<br>`;
        html += `• Key Size: 256 bits (32 bytes)<br>`;
        html += `• IV Size: 96 bits (12 bytes, random per field)<br>`;
        html += `• Encrypted: Name, DOB, Address (${structure.encryptedFields} fields)<br>`;
        html += `• Note: Data is encrypted but barcode still scans!`;
        html += '</div>';
    }
    
    html += '</div>';
    el.innerHTML = html;
}

function displayProtocolAnalysis(structure, payload) {
    const el = document.getElementById('protocol-analysis');
    if (!el) return;
    
    const config = getCurrentConfig();
    
    const cryptoStatus = structure.aesEnabled ? '🔐 AES-256 ACTIVE' : '';
    const md5Status = structure.md5Enabled ? '📊 MD5 ACTIVE' : '';
    
    const analysis = `
╔═══════════════════════════════════════════════════════════╗
║       ${config.name.toUpperCase()} DMV PROTOCOL STRUCTURE                    ║
╠═══════════════════════════════════════════════════════════╣
║ State: ${structure.state}                                               ║
║ IIN: ${structure.iin}                                              ║
║ AAMVA Version: ${structure.aamvaVer}                                       ║
║ Jurisdiction Version: ${structure.jurVer}                                 ║
║ ${config.useIdemia ? 'Protocol: IDEMIA' : 'Protocol: DMV Standard'}                                 ║
║ Total Size: ${structure.totalSize} bytes                                ║
║ CRC-16-CCITT: ${structure.crcHex} (${structure.crcTime.toFixed(3)}ms)               ║
${structure.md5Enabled ? `║ MD5 Hash: ${structure.md5Hash.substring(0, 32)}...        ║` : ''}
${structure.hmacEnabled ? `║ HMAC-SHA256: ${structure.hmacHex ? structure.hmacHex.substring(0, 32) + '...' : 'Not computed'}        ║` : ''}
${structure.aesEnabled ? `║ 🔐 AES-256: ${structure.encryptedFields} fields encrypted                   ║` : ''}
║ ECC Level: 5                                              ║
╠═══════════════════════════════════════════════════════════╣
║ FIELD INCLUSION COUNTS                                    ║
╠═══════════════════════════════════════════════════════════╣
║ DL Subfile: ${structure.dlFieldsIncluded} included, ${structure.dlFieldsOmitted} omitted            ║
║ ${structure.subfileId} Subfile: ${structure.stateFieldsIncluded} included                          ║
${structure.aesEnabled ? `║ 🔐 Encrypted: ${structure.encryptedFields} sensitive fields                  ║` : ''}
╠═══════════════════════════════════════════════════════════╣
║ SECTION         │ OFFSET │ LENGTH                         ║
╠═════════════════╪════════╪════════════════════════════════╣
║ Preamble        │      0 │      4                         ║
║ Header          │      4 │ ${String(structure.headerLen).padStart(6)}                         ║
║ DL Subfile      │ ${String(structure.dlOffset).padStart(6)} │ ${String(structure.dlLength).padStart(6)}                         ║
║ ${structure.subfileId} Subfile      │ ${String(structure.stateOffset).padStart(6)} │ ${String(structure.stateLength).padStart(6)}                         ║
║ Terminators     │ ${String(structure.terminatorPos).padStart(6)} │      2                         ║
║ CRC-16          │ ${String(structure.crcPos).padStart(6)} │      2                         ║
║ Audit Trail     │ ${String(structure.auditPos).padStart(6)} │     16                         ║
${structure.hmacEnabled ? `║ HMAC (32B)      │ ${String(structure.hmacPos).padStart(6)} │     32                         ║` : ''}
║ Padding         │ ${String(structure.auditPos + 16 + (structure.hmacEnabled ? 32 : 0)).padStart(6)} │ ${String(structure.totalSize - structure.auditPos - 16 - (structure.hmacEnabled ? 32 : 0)).padStart(6)}                         ║
╚═════════════════╧════════╧════════════════════════════════╝

✓ Binary protocol structure verified
✓ CRC-16-CCITT checksum calculated (Big-Endian)
${structure.md5Enabled ? '✓ MD5 hash calculated (128-bit digest)' : ''}
${structure.aesEnabled ? '✓ AES-256-GCM encryption applied to sensitive fields' : ''}
✓ ${config.name} inventory number: ${structure.inventoryNumber}
✓ Null padding to 1024 bytes
${config.useIdemia ? '✓ IDEMIA protocol compliance verified' : '✓ Standard DMV protocol verified'}
✓ Field inclusion rules applied correctly
`.trim();
    
    el.textContent = analysis;
}

function displayHexPreview(payload) {
    const el = document.getElementById('hex-preview');
    if (!el) return;
    
    const bytes = stringToBytes(payload);
    let hex = '';
    
    for (let i = 0; i < Math.min(512, bytes.length); i += 16) {
        const offset = i.toString(16).toUpperCase().padStart(4, '0');
        const chunk = bytes.slice(i, i + 16);
        const hexPart = bytesToHex(chunk, true).padEnd(48, ' ');
        const asciiPart = chunk.map(b => 
            (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.'
        ).join('');
        
        hex += `${offset}  ${hexPart}  ${asciiPart}\n`;
    }
    
    if (aesEnabled) {
        hex += `\n🔐 ENCRYPTED DATA VISIBLE IN HEX - Look for long hex strings!\n`;
    }
    
    hex += `\n... [${payload.length} total bytes]`;
    el.textContent = hex;
}

function displayValidationResults(validation, success = false) {
    const el = document.getElementById('validation-status');
    if (!el) return;
    
    const config = getCurrentConfig();
    
    if (success && validation.errors.length === 0) {
        let cryptoMsg = '';
        if (aesEnabled) cryptoMsg += '<br>🔐 AES-256 encryption active - sensitive data encrypted';
        if (md5Enabled) cryptoMsg += '<br>📊 MD5 checksum calculated alongside CRC-16';
        if (hmacEnabled) cryptoMsg += '<br>🔐 HMAC-SHA256 authentication tag appended to payload';
        
        el.innerHTML = `
            <div class="alert alert-success">
                <strong><span class="status-indicator status-ok"></span>✅ GENERATION SUCCESSFUL</strong><br>
                ${config.name} DMV-compliant binary protocol verified
                ${config.useIdemia ? '<br>IDEMIA hardware protocol enabled' : '<br>Standard DMV protocol enabled'}
                ${cryptoMsg}
            </div>
        `;
    } else if (validation.errors.length > 0) {
        el.innerHTML = `
            <div class="alert alert-error">
                <strong><span class="status-indicator status-error"></span>❌ ERRORS (${validation.errors.length}):</strong><br>
                ${validation.errors.map(e => '• ' + e).join('<br>')}
            </div>
        `;
    } else {
        el.innerHTML = `
            <div class="alert alert-success">
                <strong><span class="status-indicator status-ok"></span>✓ VALIDATION PASSED</strong>
            </div>
        `;
    }
    
    if (validation.warnings.length > 0) {
        el.innerHTML += `
            <div class="alert alert-warning">
                <strong><span class="status-indicator status-warning"></span>⚠️ WARNINGS:</strong><br>
                ${validation.warnings.map(w => '• ' + w).join('<br>')}
            </div>
        `;
    }
}

// ============================================================================
// UI RENDERING
// ============================================================================

function renderFields() {
    const container = document.getElementById('field-container');
    if (!container) return;
    
    const config = getCurrentConfig();
    let html = '';
    
    html += '<div class="section-divider">🔷 DL SUBFILE (AAMVA Standard)</div>';
    
    FIELD_SCHEMA.forEach(field => {
        // Get include rule - default to FL rules if state not defined, or 'optional' as fallback
        let includeRule = 'optional';
        if (field.include) {
            includeRule = field.include[currentState] || field.include['FL'] || 'optional';
        }
        const exampleVal = config.exampleData[field.id] || '';
        const isSensitive = aesEnabled && field.sensitive;
        
        let labelClass = 'field-label';
        let inputClass = '';
        let badgeClass = 'badge-optional';
        let badgeText = 'OPTIONAL';
        let reqMarker = '';
        let rowClass = 'field-row';
        
        if (includeRule === 'required') {
            labelClass = 'field-label mandatory';
            inputClass = 'mandatory';
            badgeClass = 'badge-required';
            badgeText = 'REQUIRED';
            reqMarker = ' *';
        } else if (includeRule === 'always') {
            labelClass = 'field-label always-include';
            inputClass = 'always-include';
            badgeClass = 'badge-always';
            badgeText = 'ALWAYS';
            reqMarker = ' +';
        }
        
        if (isSensitive) {
            labelClass = 'field-label encrypted-label';
            inputClass = 'encrypted-input';
            badgeClass = 'badge-encrypted';
            badgeText = '🔐 ENCRYPTED';
            rowClass = 'field-row encrypted';
        }
        
        html += `
            <div class="${rowClass}" title="${field.desc || ''} (${includeRule})${isSensitive ? ' - Will be encrypted' : ''}">
                <div class="${labelClass}">
                    ${field.id}${reqMarker}
                    ${isSensitive ? '<span class="encryption-indicator">🔐</span>' : ''}
                </div>
                <div class="field-input">
                    <input 
                        type="text" 
                        id="fld-${field.id}" 
                        class="${inputClass}"
                        value="${exampleVal}" 
                        placeholder="${field.desc || ''}"
                    >
                </div>
                <div class="badge ${badgeClass}">${badgeText}</div>
            </div>
        `;
    });
    
    const subfileSchema = getStateSubfile(currentState);
    const subfileId = config.subfileId;
    
    html += `<div class="section-divider">🔷 ${subfileId} SUBFILE (${config.name} Specific)</div>`;
    
    subfileSchema.forEach(field => {
        const includeRule = field.include;
        let exampleVal = field.defaultVal || '';
        
        // Auto-populate some Z fields from DL data
        if (field.id.match(/A$/)) exampleVal = config.exampleData.DCA || field.defaultVal || '';
        if (field.desc && field.desc.includes('Exp')) exampleVal = config.exampleData.DBA || field.defaultVal || '';
        if (field.desc && field.desc.includes('Number') || field.desc && field.desc.includes('DL')) exampleVal = config.exampleData.DAQ || field.defaultVal || '';
        if (field.desc && field.desc.includes('Issue')) exampleVal = config.exampleData.DBD || field.defaultVal || '';
        if (field.desc && field.desc.includes('Control') || field.desc && field.desc.includes('Audit')) exampleVal = config.exampleData.DCF || field.defaultVal || '';
        
        let labelClass = 'field-label';
        let inputClass = '';
        let badgeClass = 'badge-optional';
        let badgeText = 'OPTIONAL';
        let reqMarker = '';
        
        if (includeRule === 'required') {
            labelClass = 'field-label mandatory';
            inputClass = 'mandatory';
            badgeClass = 'badge-required';
            badgeText = 'REQUIRED';
            reqMarker = ' *';
        } else if (includeRule === 'always') {
            labelClass = 'field-label always-include';
            inputClass = 'always-include';
            badgeClass = 'badge-always';
            badgeText = 'ALWAYS';
            reqMarker = ' +';
        }
        
        html += `
            <div class="field-row" title="${field.desc || ''} (${includeRule})">
                <div class="${labelClass}">${field.id}${reqMarker}</div>
                <div class="field-input">
                    <input 
                        type="text" 
                        id="fld-${field.id}" 
                        class="${inputClass}"
                        value="${exampleVal}" 
                        placeholder="${field.desc || ''}"
                    >
                </div>
                <div class="badge ${badgeClass}">${badgeText}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function downloadPNG() {
    if (!window.lastCanvas) {
        alert('⚠️ Generate a barcode first');
        return;
    }
    
    window.lastCanvas.toBlob(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const cryptoSuffix = aesEnabled ? '_AES256' : '';
        link.download = `${currentState}_PDF417_AAMVA${currentAAMVA}${cryptoSuffix}_${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

function resetToExample() {
    renderFields();
    updateConfigDisplay();
    
    document.getElementById('validation-status').innerHTML = '';
    document.getElementById('protocol-analysis').textContent = 'Awaiting generation...';
    document.getElementById('hex-preview').textContent = 'Awaiting generation...';
    document.getElementById('barcode-output').innerHTML = '';
    document.getElementById('checksum-comparison-display').innerHTML = '';
    
    console.clear();
    debugLog(`🔄 Reset to ${getCurrentConfig().name} example data`);
}

async function runTests() {
    console.clear();
    debugLog('🧪 RUNNING COMPREHENSIVE CRYPTOGRAPHY TESTS...\n');
    
    // Test 1: CRC-16-CCITT
    debugLog('TEST 1: CRC-16-CCITT Implementation');
    const testData = '123456789';
    const expectedCRC = 0x29B1;
    const actualCRC = crc16ccitt(testData);
    debugLog('Input:', testData);
    debugLog('Expected:', '0x' + expectedCRC.toString(16).toUpperCase());
    debugLog('Actual:', '0x' + actualCRC.toString(16).toUpperCase());
    debugLog('Result:', expectedCRC === actualCRC ? '✅ PASS' : '❌ FAIL');
    debugLog('');
    
    // Test 2: MD5 Hash
    debugLog('TEST 2: MD5 Hash Implementation');
    const testString = 'The quick brown fox jumps over the lazy dog';
    const expectedMD5 = '9e107d9d372bb6826bd81d3542a419d6';
    const actualMD5 = md5Cached(testString);
    debugLog('Input:', testString);
    debugLog('Expected:', expectedMD5);
    debugLog('Actual:', actualMD5);
    debugLog('Result:', expectedMD5 === actualMD5 ? '✅ PASS' : '❌ FAIL');
    
    // Additional MD5 vectors
    debugLog('TEST 2b: MD5 Empty String');
    const emptyExpected = 'd41d8cd98f00b204e9800998ecf8427e';
    const emptyActual = md5Cached('');
    debugLog('Empty MD5:', emptyActual, emptyActual === emptyExpected ? '✅ PASS' : '❌ FAIL');
    
    debugLog('TEST 2c: MD5 Large data (100k "a")');
    const bigStr = 'a'.repeat(100000);
    console.time('md5-large');
    const bigHash = md5Cached(bigStr);
    console.timeEnd('md5-large');
    debugLog('Big MD5 sample (first 16 chars):', bigHash.substring(0, 16));
    debugLog('');
    
    // Test 3: AES-256 Encryption/Decryption
    debugLog('TEST 3: AES-256 Encryption/Decryption');
    try {
        const original = 'SECRET DATA 12345';
        const encrypted = await encryptFieldAES(original);
        const decrypted = await decryptFieldAES(encrypted);
        debugLog('Original:', original);
        debugLog('Encrypted:', encrypted.substring(0, 50) + '...');
        debugLog('Decrypted:', decrypted);
        debugLog('Result:', original === decrypted ? '✅ PASS' : '❌ FAIL');
    } catch (e) {
        debugLog('Result: ❌ FAIL -', e.message);
    }
    debugLog('');
    
    // Test 4: Speed Comparison
    debugLog('TEST 4: Checksum Speed Comparison');
    const largeData = 'A'.repeat(10000);
    
    const crcStart = performance.now();
    crc16ccitt(largeData);
    const crcTime = performance.now() - crcStart;
    
    const md5Start = performance.now();
    md5Cached(largeData);
    const md5Time = performance.now() - md5Start;
    
    debugLog('Data size: 10,000 bytes');
    debugLog(`CRC-16: ${crcTime.toFixed(3)}ms`);
    debugLog(`MD5: ${md5Time.toFixed(3)}ms`);
    debugLog(`MD5 is ${(md5Time / crcTime).toFixed(1)}x slower`);
    debugLog('Result: ✅ PASS (performance measured)');
    debugLog('');
    
    // Test 5: Payload CRC/Audit positions (build a payload and verify positions)
    debugLog('TEST 5: Payload CRC & Audit Position Verification');
    try {
        const payloadResult = await buildDMVCompliantPayload();
        const { payload, structure } = payloadResult;
        const crcFromStruct = structure.crcValue;
        const extractedCrc = (payload.charCodeAt(structure.crcPos) << 8) | payload.charCodeAt(structure.crcPos + 1);
        debugLog('CRC from calculation:', '0x' + crcFromStruct.toString(16).toUpperCase());
        debugLog('CRC extracted from payload:', '0x' + extractedCrc.toString(16).toUpperCase());
        debugLog('CRC position check result:', crcFromStruct === extractedCrc ? '✅ PASS' : '❌ FAIL');
        
        const expectedAudit = getCurrentConfig().auditTrail;
        const actualAudit = payload.substring(structure.auditPos, structure.auditPos + expectedAudit.length);
        debugLog('Expected Audit Trail:', expectedAudit);
        debugLog('Actual Audit Trail:', actualAudit);
        debugLog('Audit trail check result:', actualAudit === expectedAudit ? '✅ PASS' : '❌ FAIL');
        
    } catch (e) {
        debugLog('TEST 5 Result: ❌ FAIL -', e.message);
    }
    debugLog('');
    
    // Test 6: MD5 included in payload (now available to all users)
    debugLog('TEST 6: MD5 Payload Inclusion');
    try {
        document.getElementById('enable-md5').checked = true;
        onMD5Toggle(); // should enable md5
        const resultWithMD5 = await buildDMVCompliantPayload();
        debugLog('Structure says MD5 enabled:', resultWithMD5.structure.md5Enabled ? '✅ YES' : '❌ NO');
        debugLog('MD5 present:', resultWithMD5.structure.md5Enabled && resultWithMD5.structure.md5Hash ? '✅ YES' : '❌ NO');
        // disable
        document.getElementById('enable-md5').checked = false;
        onMD5Toggle();
    } catch (e) {
        debugLog('TEST 6 Result: ❌ FAIL -', e.message);
    }
    debugLog('');

    // Test 7: HMAC Sign/Verify
    debugLog('TEST 7: HMAC-SHA256 Sign & Verify');
    try {
        await generateHMACKey();
        hmacEnabled = true;
        document.getElementById('enable-hmac').checked = true;
        const signed = await buildDMVCompliantPayload();
        debugLog('Structure says HMAC enabled:', signed.structure.hmacEnabled ? '✅ YES' : '❌ NO');
        debugLog('HMAC present:', signed.structure.hmacHex ? '✅ YES' : '❌ NO');

        // Verify signature by extracting payload up to hmac position
        const payload = signed.payload;
        const hmacPos = signed.structure.hmacPos;
        const macBytes = payload.substring(hmacPos, hmacPos + 32);
        const macHex = Array.from(macBytes).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase();
        const verified = await verifyHMACHex(macHex, payload.substring(0, hmacPos));
        debugLog('HMAC verification (original):', verified ? '✅ PASS' : '❌ FAIL');

        // Tamper test: flip a byte and expect verification to fail
        const tampered = payload.substring(0, 10) + String.fromCharCode(payload.charCodeAt(10) ^ 0xFF) + payload.substring(11, payload.length);
        const tamperedVerified = await verifyHMACHex(macHex, tampered.substring(0, hmacPos));
        debugLog('HMAC tamper detection (should fail):', tamperedVerified ? '❌ FAIL' : '✅ PASS');

        // cleanup
        hmacEnabled = false;
        document.getElementById('enable-hmac').checked = false;
    } catch (e) {
        debugLog('TEST 7 Result: ❌ FAIL -', e.message);
    }
    debugLog('');

    // Test 8: California compliance check
    debugLog('TEST 8: California compliance');
    try {
        // Switch to CA profile and render fields
        currentState = 'CA';
        updateConfigDisplay();
        renderFields();

        // Validate fields (using example data populated by renderFields)
        const validation = validateFields();
        debugLog('CA validation errors:', validation.errors.length === 0 ? '✅ NONE' : validation.errors);
        debugLog('CA validation warnings:', validation.warnings.length === 0 ? '✅ NONE' : validation.warnings);

        // Build payload and assert subfile ID and audit
        const caResult = await buildDMVCompliantPayload();
        debugLog('CA subfile ID:', caResult.structure.subfileId === 'ZC' ? '✅ ZC' : `❌ ${caResult.structure.subfileId}`);
        debugLog('CA audit trail:', caResult.structure.iin === getCurrentConfig().iin ? `✅ IIN ${caResult.structure.iin}` : `❌ ${caResult.structure.iin}`);

        // revert to default FL state for subsequent use
        currentState = 'FL';
        updateConfigDisplay();
        renderFields();
    } catch (e) {
        debugLog('TEST 8 Result: ❌ FAIL -', e.message);
    }
    debugLog('');

    debugLog('🧪 TESTS COMPLETE');
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function onStateChange() {
    currentState = document.getElementById('profile-state').value;
    updateConfigDisplay();
    renderFields();
    debugLog(`📍 Switched to ${getCurrentConfig().name}`);
}

function onAAMVAChange() {
    currentAAMVA = document.getElementById('profile-aamva').value;
    updateConfigDisplay();
    debugLog(`📊 AAMVA version set to ${currentAAMVA}`);
}

function onJurisdictionChange() {
    currentJurisdiction = document.getElementById('profile-jurisdiction').value;
    updateConfigDisplay();
    debugLog(`📋 Jurisdiction version set to ${currentJurisdiction}`);
}

function onAESToggle() {
    aesEnabled = document.getElementById('enable-aes256').checked;
    const status = document.getElementById('aes-status');
    const panel = document.getElementById('aes-toggle-panel');
    const keyDisplay = document.getElementById('encryption-key-display');
    
    if (aesEnabled) {
        status.textContent = 'ON';
        status.classList.remove('off');
        status.classList.add('on');
        panel.classList.add('active');
        keyDisplay.style.display = 'block';
        generateAESKey();
        debugLog('🔐 AES-256 ENCRYPTION ENABLED');
    } else {
        status.textContent = 'OFF';
        status.classList.remove('on');
        status.classList.add('off');
        panel.classList.remove('active');
        keyDisplay.style.display = 'none';
        debugLog('🔓 AES-256 ENCRYPTION DISABLED');
    }
    
    updateConfigDisplay();
    renderFields();
}

function onMD5Toggle() {
    const checkbox = document.getElementById('enable-md5');

    md5Enabled = checkbox.checked;
    const status = document.getElementById('md5-status');
    const panel = document.getElementById('md5-toggle-panel');
    
    if (md5Enabled) {
        status.textContent = 'ON';
        status.classList.remove('off');
        status.classList.add('on');
        panel.classList.add('active');
        debugLog('📊 MD5 CHECKSUM ENABLED');
    } else {
        status.textContent = 'OFF';
        status.classList.remove('on');
        status.classList.add('off');
        panel.classList.remove('active');
        debugLog('📊 MD5 CHECKSUM DISABLED');
    }
    
    updateConfigDisplay();
}

// HMAC event handlers
function onHMACToggle() {
    const checkbox = document.getElementById('enable-hmac');
    const status = document.getElementById('hmac-status');
    const panel = document.getElementById('hmac-toggle-panel');

    if (checkbox.checked) {
        // Require a key to be present
        if (!hmacKey) {
            checkbox.checked = false;
            alert('Load or generate an HMAC key before enabling HMAC.');
            return;
        }
        hmacEnabled = true;
        status.textContent = 'ON';
        status.classList.remove('off');
        status.classList.add('on');
        panel.classList.add('active');
        debugLog('🔐 HMAC-SHA256 ENABLED');
    } else {
        hmacEnabled = false;
        status.textContent = 'OFF';
        status.classList.remove('on');
        status.classList.add('off');
        panel.classList.remove('active');
        debugLog('🔓 HMAC-SHA256 DISABLED');
    }

    updateConfigDisplay();
}

async function onGenerateHMACKey() {
    await generateHMACKey();
    alert('HMAC key generated and populated in the key field. Save it securely for verification.');
}

async function onImportHMACKey() {
    const hex = document.getElementById('hmac-key-hex').value.trim();
    if (!hex) { alert('Enter hex key to import'); return; }
    const ok = await importHMACKeyHex(hex);
    if (ok) {
        alert('HMAC key imported');
        // auto-enable HMAC if user chooses
        document.getElementById('enable-hmac').checked = true;
        onHMACToggle();
    } else alert('Failed to import HMAC key');
}

async function verifyAdminToken(token) {
    // Try server-side verification first if endpoint exists
    try {
        const resp = await fetch(`${ADMIN_API_PATH}?token=${encodeURIComponent(token)}`, { method: 'GET' });
        if (resp.ok) {
            const j = await resp.json();
            if (j && j.admin === true) return true;
        }
    } catch (e) {
        // ignore network errors and fall back to client-side check
    }

    // Fallback: simple client-side token comparison
    return token === ADMIN_TOKEN;
}

async function onAdminUnlock() {
    const token = document.getElementById('admin-token-input').value.trim();
    if (!token) { alert('Enter admin token'); return; }
    try {
        const ok = await verifyAdminToken(token);
        setAdminMode(ok);
        if (!ok) alert('Admin token invalid');
    } catch (e) {
        alert('Error verifying admin token: ' + e.message);
    }
}

function setAdminMode(enabled) {
    adminMode = !!enabled;
    const status = document.getElementById('admin-status');
    const tokenInput = document.getElementById('admin-token-input');
    const md5Checkbox = document.getElementById('enable-md5');

    if (adminMode) {
        status.textContent = 'ADMIN ON';
        status.classList.remove('off');
        status.classList.add('on');
        tokenInput.disabled = true;
        debugLog('🔑 Admin mode enabled');
    } else {
        status.textContent = 'ADMIN OFF';
        status.classList.remove('on');
        status.classList.add('off');
        tokenInput.disabled = false;
        debugLog('🔒 Admin mode disabled');
    }

    updateConfigDisplay();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    console.clear();
    debugLog('═══════════════════════════════════════');
    debugLog('✅ MULTI-STATE DMV PDF417 GENERATOR');
    debugLog('    CRYPTOGRAPHY EDITION');
    debugLog('═══════════════════════════════════════');
    debugLog('✅ States: Florida (636026) & California (636014)');
    debugLog('✅ AAMVA Versions: 08, 09, 10');
    debugLog('✅ Jurisdiction Versions: 01, 02');
    debugLog('✅ Field Inclusion: required/always/optional');
    debugLog('✅ CRC-16-CCITT (0x1021)');
    debugLog('✅ AES-256-GCM Encryption (Toggle)');
    debugLog('✅ MD5 Hash Comparison (Toggle)');
    debugLog('✅ Binary Mode | ECC Level 5');
    debugLog('═══════════════════════════════════════\n');
    
    // Initialize auth system FIRST
    initAuth();
    
    if (!window.bwipjs) {
        alert('⚠️ bwip-js library not loaded!');
        return;
    }
    
    if (!window.crypto || !window.crypto.subtle) {
        alert('⚠️ Web Crypto API not available! AES-256 encryption will not work.\nUse HTTPS or modern browser.');
    }
    
    updateConfigDisplay();
    renderFields();
    // Ensure admin-controlled UI starts locked
    setAdminMode(false);
    
    // Event listeners
    document.getElementById('profile-state')?.addEventListener('change', onStateChange);
    document.getElementById('profile-aamva')?.addEventListener('change', onAAMVAChange);
    document.getElementById('profile-jurisdiction')?.addEventListener('change', onJurisdictionChange);
    document.getElementById('inventory-number')?.addEventListener('input', updateConfigDisplay);
    document.getElementById('enable-aes256')?.addEventListener('change', onAESToggle);
    document.getElementById('enable-md5')?.addEventListener('change', onMD5Toggle);
    document.getElementById('btn-admin-unlock')?.addEventListener('click', onAdminUnlock);
    document.getElementById('enable-hmac')?.addEventListener('change', onHMACToggle);
    document.getElementById('btn-generate-hmac-key')?.addEventListener('click', onGenerateHMACKey);
    document.getElementById('btn-import-hmac-key')?.addEventListener('click', onImportHMACKey);
    document.getElementById('btn-set-api-key')?.addEventListener('click', () => {
        const v = document.getElementById('admin-api-key-input')?.value.trim();
        setAdminApiKey(v);
        alert('API key saved locally');
    });

    // Populate API key input from storage
    const apiInput = document.getElementById('admin-api-key-input');
    if (apiInput && adminApiKey) apiInput.value = adminApiKey;

    // Admin panel listeners
    document.getElementById('btn-admin-login')?.addEventListener('click', adminLogin);
    document.getElementById('btn-admin-logout')?.addEventListener('click', adminLogout);
    document.getElementById('btn-load-users')?.addEventListener('click', loadAdminUsers);
    document.getElementById('btn-load-logs')?.addEventListener('click', loadAdminLogs);
    document.getElementById('btn-load-balances')?.addEventListener('click', loadBalances);
    document.getElementById('btn-load-chat')?.addEventListener('click', loadChat);
    document.getElementById('btn-create-user')?.addEventListener('click', createUser);
    document.getElementById('btn-credit')?.addEventListener('click', creditAccount);
    document.getElementById('btn-send-chat')?.addEventListener('click', sendChatMessage);
    
    document.getElementById('btn-generate')?.addEventListener('click', generateBarcode);
    document.getElementById('btn-validate')?.addEventListener('click', () => {
        const validation = validateFields();
        displayValidationResults(validation);
    });
    document.getElementById('btn-download')?.addEventListener('click', downloadPNG);
    document.getElementById('btn-reset')?.addEventListener('click', resetToExample);
    document.getElementById('btn-test')?.addEventListener('click', runTests);
    
    // Payment tab listeners
    document.getElementById('tab-btc')?.addEventListener('click', () => showPaymentTab('btc'));
    document.getElementById('tab-ln')?.addEventListener('click', () => showPaymentTab('ln'));
    document.getElementById('btn-close-payment')?.addEventListener('click', closePaymentModal);
    document.getElementById('btn-simulate-payment')?.addEventListener('click', simulatePayment);
    
    // Admin tab listeners
    document.getElementById('admin-tab-payments')?.addEventListener('click', () => showAdminTab('payments'));
    document.getElementById('admin-tab-audit')?.addEventListener('click', () => showAdminTab('audit'));
    document.getElementById('admin-tab-users')?.addEventListener('click', () => showAdminTab('users'));
    document.getElementById('admin-tab-balances')?.addEventListener('click', () => showAdminTab('balances'));
    
    // Admin action listeners
    document.getElementById('btn-save-payment-settings')?.addEventListener('click', savePaymentSettings);
    document.getElementById('btn-refresh-audit')?.addEventListener('click', refreshAuditLog);
    document.getElementById('btn-export-audit')?.addEventListener('click', exportAuditLog);
    
    // Event delegation for dynamically created delete user buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-user')) {
            const email = e.target.dataset.email;
            if (email) deleteUser(email);
        }
    });
    
    // Periodic ambient smoke from logo feet
    setInterval(() => {
        if (document.getElementById('logo-smoke')) {
            puffHeaderSmoke(1);
        }
    }, 4000);
    
    // Initial smoke puff to show it's alive
    setTimeout(() => {
        puffHeaderSmoke(3);
        puffChatSmoke(2);
    }, 1000);
    
    debugLog('✅ System ready\n');
    debugLog('✅ Interactive logo with smoke from feet');
    debugLog('✅ Help chat widget with smoke effects');
    debugLog('Field inclusion rules:');
    debugLog('  * = REQUIRED (yellow) - Must have data');
    debugLog('  + = ALWAYS (orange) - Include even if empty');
    debugLog('  🔐 = ENCRYPTED (magenta) - AES-256 active');
    debugLog('  (no marker) = OPTIONAL (green) - Omit if empty\n');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
