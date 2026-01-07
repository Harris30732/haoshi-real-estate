/**
 * 好室房產 - API Module
 * API 呼叫與資料管理
 */

// Data cache
let propertiesCache = [];
let communitiesCache = [];
let usersCache = [];

/**
 * Make API request with authentication
 * @param {string} endpoint 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);

    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(buildApiUrl(endpoint), config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== All Data API ====================

/**
 * Fetch all data from /all-data endpoint
 * @returns {Promise<Object>}
 */
async function fetchAllData() {
    try {
        const data = await apiRequest(CONFIG.ENDPOINTS.DATA.ALL);

        // Update caches
        if (data.properties_for_sale) {
            propertiesCache = Array.isArray(data.properties_for_sale) ? data.properties_for_sale : [];
        }
        if (data.communities) {
            communitiesCache = Array.isArray(data.communities) ? data.communities : [];
        }
        if (data.users) {
            usersCache = Array.isArray(data.users) ? data.users : [];
        }

        return data;
    } catch (error) {
        console.error('Error fetching all data:', error);
        // Fall back to demo data
        propertiesCache = getDemoProperties();
        communitiesCache = getDemoCommunities();
        usersCache = getDemoUsers();
        return {
            properties_for_sale: propertiesCache,
            communities: communitiesCache,
            users: usersCache
        };
    }
}

// ==================== Properties API ====================

/**
 * Fetch all properties
 * @returns {Promise<Array>}
 */
async function fetchProperties() {
    try {
        // Try to get from all-data endpoint first
        const data = await apiRequest(CONFIG.ENDPOINTS.DATA.ALL);
        if (data.properties_for_sale) {
            propertiesCache = Array.isArray(data.properties_for_sale) ? data.properties_for_sale : [];
            return propertiesCache;
        }

        // Fallback to individual endpoint
        const propData = await apiRequest(CONFIG.ENDPOINTS.DATA.PROPERTIES);
        propertiesCache = Array.isArray(propData) ? propData : [];
        return propertiesCache;
    } catch (error) {
        console.error('Error fetching properties:', error);
        // Return demo data for development
        propertiesCache = getDemoProperties();
        return propertiesCache;
    }
}

/**
 * Create new property
 * @param {Object} propertyData 
 * @returns {Promise<Object>}
 */
async function createProperty(propertyData) {
    const payload = {
        action: 'create',
        user: getCurrentUserName(),
        data: propertyData
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.PROPERTIES, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Update cache
        if (result.data) {
            propertiesCache.push(result.data);
        }

        return result;
    } catch (error) {
        // Demo mode: simulate success
        const newProperty = {
            id: 'demo-' + Date.now(),
            ...propertyData,
            created_at_source: new Date().toISOString().split('T')[0],
            agent: getCurrentUserName()
        };
        propertiesCache.push(newProperty);
        return { status: 'success', data: newProperty };
    }
}

/**
 * Update property
 * @param {string} id 
 * @param {Object} propertyData 
 * @returns {Promise<Object>}
 */
async function updateProperty(id, propertyData) {
    const payload = {
        action: 'update',
        user: getCurrentUserName(),
        id: id,
        data: propertyData
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.PROPERTIES, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Update cache
        const index = propertiesCache.findIndex(p => p.id === id);
        if (index !== -1 && result.data) {
            propertiesCache[index] = result.data;
        }

        return result;
    } catch (error) {
        // Demo mode
        const index = propertiesCache.findIndex(p => p.id === id);
        if (index !== -1) {
            propertiesCache[index] = {
                ...propertiesCache[index],
                ...propertyData,
                updated_at_source: new Date().toISOString().split('T')[0],
                maintainer: getCurrentUserName()
            };
        }
        return { status: 'success', data: propertiesCache[index] };
    }
}

/**
 * Delete property
 * @param {string} id 
 * @returns {Promise<Object>}
 */
async function deleteProperty(id) {
    const payload = {
        action: 'delete',
        user: getCurrentUserName(),
        id: id
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.PROPERTIES, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Update cache
        propertiesCache = propertiesCache.filter(p => p.id !== id);

        return result;
    } catch (error) {
        // Demo mode
        propertiesCache = propertiesCache.filter(p => p.id !== id);
        return { status: 'success', deleted_id: id };
    }
}

// ==================== Communities API ====================

/**
 * Fetch all communities
 * @returns {Promise<Array>}
 */
async function fetchCommunities() {
    try {
        const data = await apiRequest(CONFIG.ENDPOINTS.DATA.COMMUNITIES);
        communitiesCache = Array.isArray(data) ? data : [];
        return communitiesCache;
    } catch (error) {
        console.error('Error fetching communities:', error);
        communitiesCache = getDemoCommunities();
        return communitiesCache;
    }
}

/**
 * Create new community
 * @param {Object} communityData 
 * @returns {Promise<Object>}
 */
async function createCommunity(communityData) {
    const payload = {
        action: 'create',
        user: getCurrentUserName(),
        data: communityData
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.COMMUNITIES, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.data) {
            communitiesCache.push(result.data);
        }

        return result;
    } catch (error) {
        // Demo mode
        const newCommunity = {
            id: 'demo-' + Date.now(),
            ...communityData,
            created_at_source: new Date().toISOString().split('T')[0],
            agent: getCurrentUserName()
        };
        communitiesCache.push(newCommunity);
        return { status: 'success', data: newCommunity };
    }
}

/**
 * Update community
 * @param {string} id 
 * @param {Object} communityData 
 * @returns {Promise<Object>}
 */
async function updateCommunity(id, communityData) {
    const payload = {
        action: 'update',
        user: getCurrentUserName(),
        id: id,
        data: communityData
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.COMMUNITIES, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const index = communitiesCache.findIndex(c => c.id === id);
        if (index !== -1 && result.data) {
            communitiesCache[index] = result.data;
        }

        return result;
    } catch (error) {
        // Demo mode
        const index = communitiesCache.findIndex(c => c.id === id);
        if (index !== -1) {
            communitiesCache[index] = {
                ...communitiesCache[index],
                ...communityData,
                updated_at_source: new Date().toISOString().split('T')[0],
                maintainer: getCurrentUserName()
            };
        }
        return { status: 'success', data: communitiesCache[index] };
    }
}

/**
 * Delete community
 * @param {string} id 
 * @returns {Promise<Object>}
 */
async function deleteCommunity(id) {
    const payload = {
        action: 'delete',
        user: getCurrentUserName(),
        id: id
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.COMMUNITIES, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        communitiesCache = communitiesCache.filter(c => c.id !== id);

        return result;
    } catch (error) {
        // Demo mode
        communitiesCache = communitiesCache.filter(c => c.id !== id);
        return { status: 'success', deleted_id: id };
    }
}

// ==================== Users API ====================

/**
 * Fetch all users
 * @returns {Promise<Array>}
 */
async function fetchUsers() {
    try {
        const data = await apiRequest(CONFIG.ENDPOINTS.DATA.USERS);
        usersCache = Array.isArray(data) ? data : [];
        return usersCache;
    } catch (error) {
        console.error('Error fetching users:', error);
        usersCache = getDemoUsers();
        return usersCache;
    }
}

/**
 * Create new user
 * @param {Object} userData 
 * @returns {Promise<Object>}
 */
async function createUser(userData) {
    const payload = {
        action: 'create',
        user: getCurrentUserName(),
        data: userData
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.USERS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.data) {
            usersCache.push(result.data);
        }

        return result;
    } catch (error) {
        // Demo mode
        const newUser = {
            id: 'demo-' + Date.now(),
            ...userData,
            is_active: true,
            imported_at: new Date().toISOString()
        };
        usersCache.push(newUser);
        return { status: 'success', data: newUser };
    }
}

/**
 * Update user
 * @param {string} id 
 * @param {Object} userData 
 * @returns {Promise<Object>}
 */
async function updateUser(id, userData) {
    const payload = {
        action: 'update',
        user: getCurrentUserName(),
        id: id,
        data: userData
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.USERS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const index = usersCache.findIndex(u => u.id === id);
        if (index !== -1 && result.data) {
            usersCache[index] = result.data;
        }

        return result;
    } catch (error) {
        // Demo mode
        const index = usersCache.findIndex(u => u.id === id);
        if (index !== -1) {
            usersCache[index] = { ...usersCache[index], ...userData };
        }
        return { status: 'success', data: usersCache[index] };
    }
}

/**
 * Delete user
 * @param {string} id 
 * @returns {Promise<Object>}
 */
async function deleteUser(id) {
    const payload = {
        action: 'delete',
        user: getCurrentUserName(),
        id: id
    };

    try {
        const result = await apiRequest(CONFIG.ENDPOINTS.USERS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        usersCache = usersCache.filter(u => u.id !== id);

        return result;
    } catch (error) {
        // Demo mode
        usersCache = usersCache.filter(u => u.id !== id);
        return { status: 'success', deleted_id: id };
    }
}

// ==================== Demo Data ====================

/**
 * Get demo properties for development
 * @returns {Array}
 */
function getDemoProperties() {
    return [
        {
            id: 'demo-prop-1',
            community_name: '威均天翔',
            total_price: 1200,
            total_ping: 35.5,
            parking_ping: 8.5,
            parking_price: 180,
            floor_info: '12樓/共25樓',
            address: '桃園市中壢區青埔路123號',
            status: '專任',
            layout: '兩房',
            notes: '近高鐵站，生活機能佳',
            agent: '錦宣',
            maintainer: '錦宣',
            created_at_source: '2026-01-01',
            updated_at_source: '2026-01-05'
        },
        {
            id: 'demo-prop-2',
            community_name: '上城捷境',
            total_price: 980,
            total_ping: 28.2,
            parking_ping: 7.8,
            parking_price: 150,
            floor_info: '8樓/共18樓',
            address: '桃園市中壢區高鐵路456號',
            status: '一般',
            layout: '套房',
            notes: '屋況新穎，適合自住',
            agent: '小明',
            maintainer: '小明',
            created_at_source: '2026-01-02',
            updated_at_source: '2026-01-04'
        },
        {
            id: 'demo-prop-3',
            community_name: '新大南青山',
            total_price: 1580,
            total_ping: 45.8,
            parking_ping: 9.2,
            parking_price: 200,
            floor_info: '15樓/共30樓',
            address: '桃園市中壢區新南路789號',
            status: '專任',
            layout: '三房成3+1房',
            notes: '三面採光，景觀優美',
            agent: '阿華',
            maintainer: '錦宣',
            created_at_source: '2026-01-03',
            updated_at_source: '2026-01-06'
        }
    ];
}

/**
 * Get demo communities for development
 * @returns {Array}
 */
function getDemoCommunities() {
    return [
        {
            id: 'demo-comm-1',
            builder: '威均建設',
            community_name: '威均天翔',
            completion_date: '108',
            total_units: '361',
            unit_area_range: '25/45',
            agent: '錦宣',
            created_at_source: '2025-12-01'
        },
        {
            id: 'demo-comm-2',
            builder: '上城建設',
            community_name: '上城捷境',
            completion_date: '103',
            total_units: '117',
            unit_area_range: '22/35',
            agent: '錦宣',
            created_at_source: '2025-12-01'
        },
        {
            id: 'demo-comm-3',
            builder: '新大南建設',
            community_name: '新大南青山',
            completion_date: '112',
            total_units: '181',
            unit_area_range: '35/55',
            agent: '錦宣',
            created_at_source: '2025-12-01'
        }
    ];
}

/**
 * Get demo users for development
 * @returns {Array}
 */
function getDemoUsers() {
    return [
        {
            id: 'demo-user-1',
            name: '系統管理員',
            email: 'admin@haoshi.com',
            title: '系統管理員',
            role: 'admin',
            is_active: true,
            last_login: '2026-01-06T10:00:00Z'
        },
        {
            id: 'demo-user-2',
            name: '錦宣',
            email: 'jinxuan@haoshi.com',
            title: '資深業務經理',
            role: 'manager',
            is_active: true,
            last_login: '2026-01-06T09:30:00Z'
        },
        {
            id: 'demo-user-3',
            name: '小明',
            email: 'xiaoming@haoshi.com',
            title: '業務專員',
            role: 'user',
            is_active: true,
            last_login: '2026-01-05T16:00:00Z'
        }
    ];
}

/**
 * Get cached properties
 * @returns {Array}
 */
function getPropertiesCache() {
    return propertiesCache;
}

/**
 * Get cached communities
 * @returns {Array}
 */
function getCommunitiesCache() {
    return communitiesCache;
}

/**
 * Get cached users
 * @returns {Array}
 */
function getUsersCache() {
    return usersCache;
}

/**
 * Get community info by name
 * @param {string} communityName 
 * @returns {Object|null}
 */
function getCommunityByName(communityName) {
    return communitiesCache.find(c => c.community_name === communityName) || null;
}

/**
 * Load initial data
 */
async function loadInitialData() {
    showLoading();
    try {
        // Fetch all data in a single API call for efficiency
        await fetchAllData();

        // Update UI
        updateCharts();
        renderPropertiesTable();
        populateCommunityFilters();

    } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('error', '載入失敗', '無法載入資料，請重新整理頁面');
    } finally {
        hideLoading();
    }
}
