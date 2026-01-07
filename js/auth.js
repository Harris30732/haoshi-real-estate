/**
 * 好室房產 - Authentication Module
 * Google OAuth 認證與用戶管理
 */

// Current user state
let currentUser = null;

// Check if running in demo mode (file:// protocol or localhost without proper setup)
const isDemoMode = window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && !CONFIG.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com'));

/**
 * Initialize Google Identity Services
 */
function initGoogleAuth() {
    // If demo mode, setup demo login button instead
    if (isDemoMode) {
        console.log('🎮 Demo mode enabled (file:// protocol detected)');
        setupDemoLogin();
        return;
    }

    // Check if Google Identity Services is loaded
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('Google Identity Services not loaded yet, retrying...');
        setTimeout(initGoogleAuth, 500);
        return;
    }

    google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true
    });

    // Also setup the custom button
    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            google.accounts.id.prompt();
        });
    }
}

/**
 * Setup demo login for local development
 */
function setupDemoLogin() {
    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) {
        // Update button text to indicate demo mode
        loginBtn.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Demo 模式登入 (本地測試)
        `;

        loginBtn.addEventListener('click', handleDemoLogin);
    }

    // Add demo mode indicator to login page
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer) {
        const demoNotice = document.createElement('div');
        demoNotice.style.cssText = 'margin-top: 16px; padding: 12px; background: rgba(255,193,7,0.2); border-radius: 8px; font-size: 12px; color: #856404;';
        demoNotice.innerHTML = `
            <strong>📌 Demo 模式</strong><br>
            因為是 file:// 協定，Google 登入無法使用。<br>
            點擊上方按鈕直接進入系統測試。
        `;
        loginContainer.appendChild(demoNotice);
    }
}

/**
 * Handle demo login (for local development)
 */
async function handleDemoLogin() {
    try {
        showLoading();

        // Simulate a demo user with admin role
        const demoUser = {
            id: 'demo-admin',
            email: 'admin@demo.haoshi.com',
            name: 'Demo Admin',
            picture: 'https://ui-avatars.com/api/?name=Demo+Admin&background=667eea&color=fff',
            role: 'admin',
            title: '系統管理員 (Demo)'
        };

        // Store demo user
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, 'demo-token-' + Date.now());
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(demoUser));

        // Set current user
        currentUser = demoUser;

        // Update UI
        updateUserUI(currentUser);

        // Show main app
        showMainApp();

        // Load initial data
        await loadInitialData();

        showToast('success', 'Demo 模式登入成功', `歡迎，${currentUser.name}！`);
    } catch (error) {
        console.error('Demo login error:', error);
        showLoginError('Demo 登入失敗');
    } finally {
        hideLoading();
    }
}

/**
 * Handle Google OAuth callback
 * @param {Object} response - Google credential response
 */
async function handleGoogleCallback(response) {
    try {
        showLoading();

        const idToken = response.credential;

        // Decode JWT to get user info (for display purposes)
        const payload = parseJwt(idToken);

        // Verify with backend and check if user exists in database
        const authResult = await verifyGoogleToken(idToken);

        if (authResult.success) {
            // Store tokens
            localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, authResult.access_token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(authResult.user));

            // Set current user
            currentUser = authResult.user;

            // Update UI with user info
            updateUserUI(currentUser);

            // Show main app
            showMainApp();

            // Load initial data
            await loadInitialData();

            showToast('success', '登入成功', `歡迎回來，${currentUser.name}！`);
        } else {
            showLoginError(authResult.message || '您沒有權限存取此系統');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('登入失敗，請稍後再試');
    } finally {
        hideLoading();
    }
}

/**
 * Verify Google token with backend
 * @param {string} idToken - Google ID token
 * @returns {Promise<Object>}
 */
async function verifyGoogleToken(idToken) {
    try {
        // For demo/development, simulate verification
        // In production, this should call your backend API
        const payload = parseJwt(idToken);

        // Check if user email exists in the system
        // This is a simplified check - in production, verify with backend
        const userExists = await checkUserExists(payload.email);

        if (!userExists.exists) {
            return {
                success: false,
                message: '您的帳號尚未被授權使用此系統，請聯繫管理員'
            };
        }

        return {
            success: true,
            access_token: idToken, // In production, backend should issue its own JWT
            user: {
                id: userExists.user.id,
                email: payload.email,
                name: userExists.user.name || payload.name,
                picture: payload.picture,
                role: userExists.user.role || 'user',
                title: userExists.user.title
            }
        };
    } catch (error) {
        console.error('Token verification error:', error);
        throw error;
    }
}

/**
 * Check if user exists in database
 * @param {string} email 
 * @returns {Promise<Object>}
 */
async function checkUserExists(email) {
    try {
        // Try to fetch user data from API
        const response = await fetch(buildApiUrl(CONFIG.ENDPOINTS.DATA.USERS));

        if (!response.ok) {
            // If API fails, use demo mode
            console.warn('API not available, using demo mode');
            return getDemoUser(email);
        }

        const users = await response.json();
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (user) {
            return { exists: true, user };
        }

        return { exists: false };
    } catch (error) {
        console.warn('Error checking user, using demo mode:', error);
        return getDemoUser(email);
    }
}

/**
 * Get demo user for development
 * @param {string} email 
 * @returns {Object}
 */
function getDemoUser(email) {
    // Demo users for development
    const demoUsers = {
        'admin@example.com': { id: 'demo-1', name: 'Admin User', role: 'admin', title: '系統管理員' },
        'manager@example.com': { id: 'demo-2', name: 'Manager User', role: 'manager', title: '管理者' },
        'user@example.com': { id: 'demo-3', name: 'Normal User', role: 'user', title: '一般使用者' }
    };

    // For demo, allow any Google account with admin role
    return {
        exists: true,
        user: demoUsers[email] || {
            id: 'demo-new',
            name: email.split('@')[0],
            role: 'admin', // Default to admin for demo
            title: '測試帳號'
        }
    };
}

/**
 * Parse JWT token
 * @param {string} token 
 * @returns {Object}
 */
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return {};
    }
}

/**
 * Update UI with user information
 * @param {Object} user 
 */
function updateUserUI(user) {
    // Update avatar
    const avatarImg = document.getElementById('userAvatarImg');
    if (avatarImg) {
        avatarImg.src = user.picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff`;
    }

    // Update dropdown info
    const displayName = document.getElementById('userDisplayName');
    const emailEl = document.getElementById('userEmail');
    if (displayName) displayName.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;

    // Show/hide management options based on role
    const communityManage = document.getElementById('menuCommunityManage');
    const userManage = document.getElementById('menuUserManage');

    if (communityManage) {
        communityManage.classList.toggle('hidden', !canManageData(user.role));
    }
    if (userManage) {
        userManage.classList.toggle('hidden', !canManageUsers(user.role));
    }

    // Show/hide action buttons
    updateActionButtonsVisibility(user.role);
}

/**
 * Update action buttons based on user role
 * @param {string} role 
 */
function updateActionButtonsVisibility(role) {
    const actionButtons = document.getElementById('actionButtons');
    if (actionButtons) {
        const isManager = canManageData(role);
        actionButtons.style.display = isManager ? 'flex' : 'none';
    }
}

/**
 * Get current user
 * @returns {Object|null}
 */
function getCurrentUser() {
    if (currentUser) return currentUser;

    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            return currentUser;
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Get current user's name
 * @returns {string}
 */
function getCurrentUserName() {
    const user = getCurrentUser();
    return user?.name || '系統';
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    const user = getCurrentUser();
    return !!(token && user);
}

/**
 * Logout user
 */
function logout() {
    // Clear stored data
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);

    // Reset state
    currentUser = null;

    // Revoke Google session
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }

    // Show login page
    showLoginPage();

    showToast('info', '已登出', '您已成功登出系統');
}

/**
 * Show login page
 */
function showLoginPage() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loadingOverlay').classList.add('hidden');
}

/**
 * Show main app
 */
function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
}

/**
 * Show login error
 * @param {string} message 
 */
function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    if (errorEl && errorText) {
        errorText.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

/**
 * Hide login error
 */
function hideLoginError() {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
}

/**
 * Show loading overlay
 */
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

/**
 * Initialize authentication on page load
 */
function initAuth() {
    // Check for existing session
    if (isAuthenticated()) {
        const user = getCurrentUser();
        updateUserUI(user);
        showMainApp();
        loadInitialData();
    } else {
        showLoginPage();
        initGoogleAuth();
    }

    hideLoading();
}
