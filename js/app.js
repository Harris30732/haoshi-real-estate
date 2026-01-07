/**
 * 好室房產 - Main Application
 * 應用程式初始化與事件綁定
 */

/**
 * Initialize application
 */
async function initApp() {
    console.log('🏠 好室房產系統啟動中...');

    // Initialize modules
    initAuth();
    initCharts();
    initTable();
    initUserDropdown();
    initChartToggle();

    console.log('🏠 好室房產系統已就緒');
}

/**
 * Initialize user dropdown toggle
 */
function initUserDropdown() {
    const avatarBtn = document.getElementById('userAvatarBtn');
    const dropdown = document.getElementById('userDropdown');

    if (avatarBtn && dropdown) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
                dropdown.classList.remove('active');
            }
        });
    }
}

/**
 * Initialize chart toggle button
 */
function initChartToggle() {
    const toggleBtn = document.getElementById('chartToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleChart);
    }
}

/**
 * Handle visibility change (tab switch)
 */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Refresh data when tab becomes visible
        if (isAuthenticated()) {
            // Don't auto-refresh to avoid API calls, just resize charts
            resizeCharts();
        }
    }
});

/**
 * Handle network status changes
 */
window.addEventListener('online', () => {
    showToast('success', '網路已連線', '');
});

window.addEventListener('offline', () => {
    showToast('warning', '網路已斷線', '部分功能可能無法使用');
});

/**
 * Handle beforeunload (optional confirmation)
 */
window.addEventListener('beforeunload', (e) => {
    // Check if there are unsaved changes
    const propertyModal = document.getElementById('propertyModal');
    const communityModal = document.getElementById('communityModal');
    const userModal = document.getElementById('userModal');

    const hasOpenModal =
        propertyModal?.classList.contains('active') ||
        communityModal?.classList.contains('active') ||
        userModal?.classList.contains('active');

    if (hasOpenModal) {
        e.preventDefault();
        e.returnValue = '';
    }
});

/**
 * Global error handler
 */
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('error', '發生錯誤', '請重新整理頁面或聯繫管理員');
});

/**
 * Unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
});

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S: Save current form
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();

        const propertyModal = document.getElementById('propertyModal');
        const communityModal = document.getElementById('communityModal');
        const userModal = document.getElementById('userModal');

        if (propertyModal?.classList.contains('active')) {
            saveProperty();
        } else if (communityModal?.classList.contains('active')) {
            saveCommunity();
        } else if (userModal?.classList.contains('active')) {
            saveUser();
        }
    }

    // Ctrl/Cmd + E: Export data
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (isAuthenticated() && canManageData(getCurrentUser()?.role)) {
            exportData();
        }
    }
});

/**
 * Service Worker Registration (for future PWA support)
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //   .then(reg => console.log('SW registered:', reg))
        //   .catch(err => console.log('SW registration failed:', err));
    });
}

// ==================== Start Application ====================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
