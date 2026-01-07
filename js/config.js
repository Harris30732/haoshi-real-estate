/**
 * 好室房產 - Configuration
 * API 設定與常數定義
 */

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'https://findmyhome.zeabur.app/webhook',
    API_TEST_URL: 'https://findmyhome.zeabur.app/webhook-test',

    // Use test or production API
    USE_TEST_API: false,

    // Google OAuth Configuration
    // TODO: Replace with your actual Google Client ID
    GOOGLE_CLIENT_ID: '1098804852901-pdvc6u2btp4lqaad0gd85v5mgahicn2o.apps.googleusercontent.com',

    // API Endpoints
    ENDPOINTS: {
        AUTH: {
            GOOGLE: '/auth/google',
            VERIFY: '/auth/verify',
            REFRESH: '/auth/refresh'
        },
        USERS: '/admin/users',
        COMMUNITIES: '/admin/communities',
        PROPERTIES: '/admin/properties',
        PHOTOS: '/admin/photos/upload',
        DATA: {
            ALL: '/all-data',
            PROPERTIES: '/data/properties',
            COMMUNITIES: '/data/communities',
            USERS: '/data/users'
        }
    },

    // Permission Roles
    ROLES: {
        USER: 'user',
        MANAGER: 'manager',
        ADMIN: 'admin'
    },

    // Role Hierarchy (higher number = more permissions)
    ROLE_HIERARCHY: {
        user: 0,
        manager: 1,
        admin: 2
    },

    // Local Storage Keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'haoshi_access_token',
        USER_DATA: 'haoshi_user_data',
        THEME: 'haoshi_theme'
    },

    // Pagination
    ITEMS_PER_PAGE: 20,

    // Price Ranges for Chart
    PRICE_RANGES: [
        { label: '1000-1500萬', min: 1000, max: 1500 },
        { label: '1500-2000萬', min: 1500, max: 2000 },
        { label: '2000-2500萬', min: 2000, max: 2500 },
        { label: '2500-3000萬', min: 2500, max: 3000 },
        { label: '3000萬以上', min: 3000, max: Infinity }
    ],

    // Chart Colors
    CHART_COLORS: {
        primary: '#3b82f6',
        primaryLight: '#93c5fd',
        secondary: '#8b5cf6',
        secondaryLight: '#c4b5fd',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
    },

    // Status Types (from actual data)
    STATUS_TYPES: {
        EXCLUSIVE: '專任',
        GENERAL: '一般',
        DELISTED: '下架',
        OWNER: '屋主',
        SOLD: '已成交'
    },

    // Delist Reasons
    DELIST_REASONS: [
        '價格調整',
        '屋主收回',
        '已成交',
        '其他'
    ]
};

/**
 * Get the API base URL based on environment
 */
function getApiUrl() {
    return CONFIG.USE_TEST_API ? CONFIG.API_TEST_URL : CONFIG.API_BASE_URL;
}

/**
 * Build full API endpoint URL
 * @param {string} endpoint - The endpoint path
 * @returns {string} Full API URL
 */
function buildApiUrl(endpoint) {
    return getApiUrl() + endpoint;
}

/**
 * Check if user has required role
 * @param {string} userRole - Current user's role
 * @param {string} requiredRole - Required role for action
 * @returns {boolean}
 */
function hasRole(userRole, requiredRole) {
    if (!userRole) return false;
    const userLevel = CONFIG.ROLE_HIERARCHY[userRole] ?? -1;
    const requiredLevel = CONFIG.ROLE_HIERARCHY[requiredRole] ?? 999;
    return userLevel >= requiredLevel;
}

/**
 * Check if user can manage data (manager or above)
 * @param {string} userRole 
 * @returns {boolean}
 */
function canManageData(userRole) {
    return hasRole(userRole, CONFIG.ROLES.MANAGER);
}

/**
 * Check if user can manage users (admin only)
 * @param {string} userRole 
 * @returns {boolean}
 */
function canManageUsers(userRole) {
    return userRole === CONFIG.ROLES.ADMIN;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getApiUrl, buildApiUrl, hasRole, canManageData, canManageUsers };
}
