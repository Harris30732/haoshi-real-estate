/**
 * 好室房產 - Modals Module
 * 彈窗管理
 */

// Confirm dialog state
let confirmDialogCallback = null;

/**
 * Open modal
 * @param {string} modalId 
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Load data for specific modals
        if (modalId === 'communityModal') {
            loadCommunityList();
        } else if (modalId === 'userModal') {
            loadUserList();
        }
    }
}

/**
 * Close modal
 * @param {string} modalId 
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Close modal on backdrop click
 */
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

/**
 * Close modal on Escape key
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ==================== Property Modal ====================

/**
 * Open property modal for adding
 */
function openPropertyModal() {
    resetPropertyForm();
    document.getElementById('propertyModalTitle').textContent = '新增物件';
    openModal('propertyModal');
}

/**
 * Edit property
 * @param {string} propertyId 
 */
function editProperty(propertyId) {
    const property = getPropertiesCache().find(p => p.id === propertyId);
    if (!property) {
        showToast('error', '找不到物件', '');
        return;
    }

    document.getElementById('propertyModalTitle').textContent = '編輯物件';
    document.getElementById('propertyId').value = propertyId;
    document.getElementById('propertyCommunity').value = property.community_name || '';
    document.getElementById('propertyTotalPrice').value = property.total_price || '';
    document.getElementById('propertyTotalPing').value = property.total_ping || '';
    document.getElementById('propertyParkingPing').value = property.parking_ping || '';
    document.getElementById('propertyParkingPrice').value = property.parking_price || '';
    document.getElementById('propertyFloor').value = property.floor_info || '';
    document.getElementById('propertyAddress').value = property.address || '';
    document.getElementById('propertyStatus').value = property.status || '專任';
    document.getElementById('propertyLayout').value = property.layout || '';
    document.getElementById('propertyNotes').value = property.notes || '';

    openModal('propertyModal');
}

/**
 * Reset property form
 */
function resetPropertyForm() {
    document.getElementById('propertyForm').reset();
    document.getElementById('propertyId').value = '';
}

/**
 * Save property
 */
async function saveProperty() {
    const form = document.getElementById('propertyForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const propertyId = document.getElementById('propertyId').value;
    const propertyData = {
        community_name: document.getElementById('propertyCommunity').value,
        total_price: parseFloat(document.getElementById('propertyTotalPrice').value),
        total_ping: parseFloat(document.getElementById('propertyTotalPing').value),
        parking_ping: parseFloat(document.getElementById('propertyParkingPing').value) || 0,
        parking_price: parseFloat(document.getElementById('propertyParkingPrice').value) || 0,
        floor_info: document.getElementById('propertyFloor').value,
        address: document.getElementById('propertyAddress').value,
        status: document.getElementById('propertyStatus').value,
        layout: document.getElementById('propertyLayout').value,
        notes: document.getElementById('propertyNotes').value
    };

    try {
        showLoading();

        if (propertyId) {
            await updateProperty(propertyId, propertyData);
            showToast('success', '物件已更新', '');
        } else {
            await createProperty(propertyData);
            showToast('success', '物件已新增', '');
        }

        closeModal('propertyModal');
        renderPropertiesTable();
    } catch (error) {
        showToast('error', '儲存失敗', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Confirm delete property
 * @param {string} propertyId 
 */
function confirmDeleteProperty(propertyId) {
    showConfirmDialog(
        '確認刪除',
        '確定要刪除此物件嗎？此操作無法復原。',
        async () => {
            try {
                showLoading();
                await deleteProperty(propertyId);
                showToast('success', '物件已刪除', '');
                renderPropertiesTable();
            } catch (error) {
                showToast('error', '刪除失敗', error.message);
            } finally {
                hideLoading();
            }
        }
    );
}

/**
 * View photos (placeholder)
 * @param {string} propertyId 
 */
function viewPhotos(propertyId) {
    showToast('info', '功能開發中', '照片瀏覽功能即將推出');
}

// ==================== Community Modal ====================

// Community sort state
let communitySortColumn = 'community_name';
let communitySortDirection = 'asc';

/**
 * Toggle community sort
 * @param {string} column 
 */
function toggleCommunitySort(column) {
    if (communitySortColumn === column) {
        communitySortDirection = communitySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        communitySortColumn = column;
        communitySortDirection = 'asc';
    }
    filterCommunityList();
}

/**
 * Filter community list based on search input
 */
function filterCommunityList() {
    const searchTerm = document.getElementById('communitySearch')?.value.toLowerCase().trim() || '';
    loadCommunityList(searchTerm);
}

/**
 * Load community list
 * @param {string} searchTerm - Optional search term to filter by
 */
function loadCommunityList(searchTerm = '') {
    const tbody = document.getElementById('communityTableBody');
    if (!tbody) return;

    let communities = getCommunitiesCache();

    // Apply search filter
    if (searchTerm) {
        communities = communities.filter(c =>
            (c.community_name && c.community_name.toLowerCase().includes(searchTerm)) ||
            (c.builder && c.builder.toLowerCase().includes(searchTerm))
        );
    }

    // Apply sorting
    communities = [...communities].sort((a, b) => {
        let aVal = a[communitySortColumn];
        let bVal = b[communitySortColumn];

        // Handle numeric columns
        if (communitySortColumn === 'completion_date' || communitySortColumn === 'total_units') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
        } else {
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();
        }

        if (aVal < bVal) return communitySortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return communitySortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    if (communities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted p-4">暫無符合條件的社區</td></tr>';
        return;
    }

    tbody.innerHTML = communities.map(c => renderCommunityRow(c)).join('');
}

// Track editing state for communities
let editingCommunityId = null;

/**
 * Render a single community row
 * @param {Object} c - Community data
 * @returns {string}
 */
function renderCommunityRow(c) {
    const isEditing = editingCommunityId === c.id;

    if (isEditing) {
        return renderCommunityEditModeRow(c);
    }

    return `
    <tr data-id="${c.id}" class="community-row">
      <td>${escapeHtml(c.builder || '-')}</td>
      <td>${escapeHtml(c.community_name || '-')}</td>
      <td>民國 ${escapeHtml(c.completion_date || '-')} 年</td>
      <td>${escapeHtml(c.total_units || '-')} 戶</td>
      <td>${escapeHtml(c.unit_area_range || '-')} 坪</td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(c.agent || c.Creator || '-')}</span>
          <span class="meta-time">${formatDate(c.created_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(c.maintainer || '-')}</span>
          <span class="meta-time">${formatDate(c.updated_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button class="action-icon-btn edit" onclick="startCommunityInlineEdit('${c.id}')" title="編輯">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-icon-btn delete" onclick="confirmDeleteCommunity('${c.id}')" title="刪除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render community row in edit mode
 * @param {Object} c - Community data
 * @returns {string}
 */
function renderCommunityEditModeRow(c) {
    return `
    <tr data-id="${c.id}" class="community-row editing">
      <td><input type="text" class="edit-input" data-field="builder" value="${escapeHtml(c.builder || '')}" placeholder="建商名稱"></td>
      <td><input type="text" class="edit-input" data-field="community_name" value="${escapeHtml(c.community_name || '')}" placeholder="社區名稱"></td>
      <td><input type="number" class="edit-input" data-field="completion_date" value="${c.completion_date || ''}" placeholder="民國年份" style="width: 80px;"></td>
      <td><input type="number" class="edit-input" data-field="total_units" value="${c.total_units || ''}" placeholder="戶數" style="width: 70px;"></td>
      <td><input type="text" class="edit-input" data-field="unit_area_range" value="${escapeHtml(c.unit_area_range || '')}" placeholder="如：32/45"></td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(c.agent || c.Creator || '-')}</span>
          <span class="meta-time">${formatDate(c.created_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(c.maintainer || '-')}</span>
          <span class="meta-time">${formatDate(c.updated_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="edit-actions">
          <button class="action-btn-save" onclick="saveCommunityInlineEdit('${c.id}')" title="儲存">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            完成
          </button>
          <button class="action-btn-cancel" onclick="cancelCommunityInlineEdit()" title="取消">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Start inline editing for a community
 * @param {string} communityId 
 */
function startCommunityInlineEdit(communityId) {
    editingCommunityId = communityId;
    filterCommunityList();
}

/**
 * Cancel community inline edit
 */
function cancelCommunityInlineEdit() {
    editingCommunityId = null;
    filterCommunityList();
}

/**
 * Save community inline edit
 * @param {string} communityId 
 */
async function saveCommunityInlineEdit(communityId) {
    const row = document.querySelector(`#communityTableBody tr[data-id="${communityId}"]`);
    if (!row) return;

    // Collect values from inputs
    const updatedData = {
        id: communityId,
        builder: row.querySelector('input[data-field="builder"]')?.value || '',
        community_name: row.querySelector('input[data-field="community_name"]')?.value || '',
        completion_date: row.querySelector('input[data-field="completion_date"]')?.value || '',
        total_units: row.querySelector('input[data-field="total_units"]')?.value || '',
        unit_area_range: row.querySelector('input[data-field="unit_area_range"]')?.value || ''
    };

    // Show saving state
    row.classList.add('saving');
    const saveBtn = row.querySelector('.action-btn-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-small"></span> 儲存中...';
    }

    try {
        // Call API to update community with correct format
        const user = getCurrentUser();
        await apiRequest(CONFIG.ENDPOINTS.COMMUNITIES, 'POST', {
            action: 'update',
            user: user?.name || '系統',
            id: communityId,
            data: {
                builder: updatedData.builder,
                community_name: updatedData.community_name,
                completion_date: updatedData.completion_date,
                total_units: updatedData.total_units,
                unit_area_range: updatedData.unit_area_range
            }
        });

        // Update local cache
        const communities = getCommunitiesCache();
        const index = communities.findIndex(c => c.id === communityId);
        if (index !== -1) {
            communities[index] = { ...communities[index], ...updatedData };
        }

        showToast('success', '社區已更新', '');
        editingCommunityId = null;
        filterCommunityList();

        // Also refresh community filters in main table
        populateCommunityFilters();

    } catch (error) {
        showToast('error', '更新失敗', error.message);
        row.classList.remove('saving');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              完成
            `;
        }
    }
}

/**
 * Edit community
 * @param {string} communityId 
 */
function editCommunity(communityId) {
    const community = getCommunitiesCache().find(c => c.id === communityId);
    if (!community) {
        showToast('error', '找不到社區', '');
        return;
    }

    document.getElementById('communityId').value = communityId;
    document.getElementById('communityBuilder').value = community.builder || '';
    document.getElementById('communityName').value = community.community_name || '';
    document.getElementById('communityCompletionDate').value = community.completion_date || '';
    document.getElementById('communityTotalUnits').value = community.total_units || '';
    document.getElementById('communityAreaRange').value = community.unit_area_range || '';

    // Scroll to form
    document.getElementById('communityForm').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Reset community form
 */
function resetCommunityForm() {
    document.getElementById('communityForm').reset();
    document.getElementById('communityId').value = '';
}

/**
 * Save community
 */
async function saveCommunity() {
    const form = document.getElementById('communityForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const communityId = document.getElementById('communityId').value;
    const communityData = {
        builder: document.getElementById('communityBuilder').value,
        community_name: document.getElementById('communityName').value,
        completion_date: document.getElementById('communityCompletionDate').value,
        total_units: document.getElementById('communityTotalUnits').value,
        unit_area_range: document.getElementById('communityAreaRange').value
    };

    try {
        showLoading();

        if (communityId) {
            await updateCommunity(communityId, communityData);
            showToast('success', '社區已更新', '');
        } else {
            await createCommunity(communityData);
            showToast('success', '社區已新增', '');
        }

        resetCommunityForm();

        // Clear search box to ensure new item is visible
        const searchBox = document.getElementById('communitySearch');
        if (searchBox) {
            searchBox.value = '';
        }

        // Reload the list (without any search filter)
        loadCommunityList();
        populateCommunityFilters();
    } catch (error) {
        showToast('error', '儲存失敗', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Confirm delete community
 * @param {string} communityId 
 */
function confirmDeleteCommunity(communityId) {
    showConfirmDialog(
        '確認刪除',
        '確定要刪除此社區嗎？相關物件的社區資料將會遺失。',
        async () => {
            try {
                showLoading();
                await deleteCommunity(communityId);
                showToast('success', '社區已刪除', '');
                loadCommunityList();
                populateCommunityFilters();
            } catch (error) {
                showToast('error', '刪除失敗', error.message);
            } finally {
                hideLoading();
            }
        }
    );
}

// ==================== User Modal ====================

// Track editing state for users
let editingUserId = null;

/**
 * Load user list
 */
function loadUserList() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    const users = getUsersCache();

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted p-4">暫無成員資料</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => renderUserRow(u)).join('');
}

/**
 * Render a single user row
 * @param {Object} u - User data
 * @returns {string}
 */
function renderUserRow(u) {
    const isEditing = editingUserId === u.id;

    if (isEditing) {
        return renderUserEditModeRow(u);
    }

    return `
    <tr data-id="${u.id}" class="user-row">
      <td>${escapeHtml(u.name || '-')}</td>
      <td>${escapeHtml(u.email || '-')}</td>
      <td>${escapeHtml(u.title || '-')}</td>
      <td>${renderRoleBadge(u.role)}</td>
      <td>${u.is_active ? '<span class="badge badge-success">啟用</span>' : '<span class="badge badge-danger">停用</span>'}</td>
      <td>${formatDate(u.last_login)}</td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(u.Creator || '-')}</span>
          <span class="meta-time">${formatDate(u.created_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(u.maintainer || '-')}</span>
          <span class="meta-time">${formatDate(u.updated_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button class="action-icon-btn edit" onclick="startUserInlineEdit('${u.id}')" title="編輯">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render user row in edit mode
 * @param {Object} u - User data
 * @returns {string}
 */
function renderUserEditModeRow(u) {
    return `
    <tr data-id="${u.id}" class="user-row editing">
      <td><input type="text" class="edit-input" data-field="name" value="${escapeHtml(u.name || '')}" placeholder="姓名"></td>
      <td><input type="email" class="edit-input" data-field="email" value="${escapeHtml(u.email || '')}" placeholder="Email"></td>
      <td><input type="text" class="edit-input" data-field="title" value="${escapeHtml(u.title || '')}" placeholder="職稱"></td>
      <td>
        <select class="edit-input edit-select" data-field="role">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>一般使用者</option>
          <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>管理者</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>系統管理員</option>
        </select>
      </td>
      <td>
        <select class="edit-input edit-select" data-field="is_active">
          <option value="true" ${u.is_active ? 'selected' : ''}>啟用</option>
          <option value="false" ${!u.is_active ? 'selected' : ''}>停用</option>
        </select>
      </td>
      <td>${formatDate(u.last_login)}</td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(u.Creator || '-')}</span>
          <span class="meta-time">${formatDate(u.created_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(u.maintainer || '-')}</span>
          <span class="meta-time">${formatDate(u.updated_at_source)}</span>
        </div>
      </td>
      <td>
        <div class="edit-actions">
          <button class="action-btn-save" onclick="saveUserInlineEdit('${u.id}')" title="儲存">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            完成
          </button>
          <button class="action-btn-cancel" onclick="cancelUserInlineEdit()" title="取消">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Start inline editing for a user
 * @param {string} userId 
 */
function startUserInlineEdit(userId) {
    editingUserId = userId;
    loadUserList();
}

/**
 * Cancel user inline edit
 */
function cancelUserInlineEdit() {
    editingUserId = null;
    loadUserList();
}

/**
 * Save user inline edit
 * @param {string} userId 
 */
async function saveUserInlineEdit(userId) {
    const row = document.querySelector(`#userTableBody tr[data-id="${userId}"]`);
    if (!row) return;

    // Collect values from inputs
    const updatedData = {
        name: row.querySelector('input[data-field="name"]')?.value || '',
        email: row.querySelector('input[data-field="email"]')?.value || '',
        title: row.querySelector('input[data-field="title"]')?.value || '',
        role: row.querySelector('select[data-field="role"]')?.value || 'user',
        is_active: row.querySelector('select[data-field="is_active"]')?.value === 'true'
    };

    // Validate required fields
    if (!updatedData.name || !updatedData.email) {
        showToast('error', '請填寫必填欄位', '姓名和 Email 為必填');
        return;
    }

    // Show saving state
    row.classList.add('saving');
    const saveBtn = row.querySelector('.action-btn-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-small"></span> 儲存中...';
    }

    try {
        // Call API to update user
        await updateUser(userId, updatedData);

        showToast('success', '成員已更新', '');
        editingUserId = null;
        loadUserList();

    } catch (error) {
        showToast('error', '更新失敗', error.message);
        row.classList.remove('saving');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              完成
            `;
        }
    }
}

/**
 * Render role badge
 * @param {string} role 
 * @returns {string}
 */
function renderRoleBadge(role) {
    const roleLabels = {
        admin: '系統管理員',
        manager: '管理者',
        user: '一般使用者'
    };

    const roleClasses = {
        admin: 'badge-danger',
        manager: 'badge-warning',
        user: 'badge-primary'
    };

    return `<span class="badge ${roleClasses[role] || 'badge-primary'}">${roleLabels[role] || role}</span>`;
}

/**
 * Edit user - now redirects to inline edit
 * @param {string} userId 
 */
function editUser(userId) {
    startUserInlineEdit(userId);
}

/**
 * Reset user form
 */
function resetUserForm() {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
}

/**
 * Save user (for new users only now)
 */
async function saveUser() {
    const form = document.getElementById('userForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const userId = document.getElementById('userId').value;

    // If there's a userId, it means we're editing - but now we only use this for new users
    if (userId) {
        showToast('warning', '請使用行內編輯', '編輯請點擊列表中的編輯按鈕');
        return;
    }

    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmailInput').value,
        title: document.getElementById('userTitle').value,
        role: document.getElementById('userRole').value,
        is_active: document.getElementById('userIsActive').value === 'true'
    };

    try {
        showLoading();
        await createUser(userData);
        showToast('success', '成員已新增', '');
        resetUserForm();
        loadUserList();
    } catch (error) {
        showToast('error', '儲存失敗', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Confirm delete user
 * @param {string} userId 
 */
function confirmDeleteUser(userId) {
    showConfirmDialog(
        '確認刪除',
        '確定要刪除此成員嗎？該成員將無法再登入系統。',
        async () => {
            try {
                showLoading();
                await deleteUser(userId);
                showToast('success', '成員已刪除', '');
                loadUserList();
            } catch (error) {
                showToast('error', '刪除失敗', error.message);
            } finally {
                hideLoading();
            }
        }
    );
}

// ==================== Confirm Dialog ====================

/**
 * Show confirm dialog
 * @param {string} title 
 * @param {string} message 
 * @param {Function} callback 
 */
function showConfirmDialog(title, message, callback) {
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;
    confirmDialogCallback = callback;
    openModal('confirmDialog');
}

/**
 * Execute confirm dialog action
 */
function confirmDialogAction() {
    closeModal('confirmDialog');
    if (confirmDialogCallback) {
        confirmDialogCallback();
        confirmDialogCallback = null;
    }
}

// ==================== Toast Notifications ====================

/**
 * Show toast notification
 * @param {string} type - success, error, warning, info
 * @param {string} title 
 * @param {string} message 
 */
function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ==================== Photo Modal ====================

// Photo modal state
let currentPhotoPropertyId = null;
let currentPhotoIndex = 0;
let currentPhotos = [];
let isPhotoEditMode = false;

/**
 * View photos for a property (preview mode)
 * @param {string} propertyId 
 */
function viewPhotos(propertyId) {
    const properties = getPropertiesCache();
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    currentPhotoPropertyId = propertyId;
    currentPhotos = property.photo_paths || [];
    currentPhotoIndex = 0;

    // Check if we're in edit mode
    const user = getCurrentUser();
    const editingRow = document.querySelector(`tr[data-id="${propertyId}"].editing`);
    isPhotoEditMode = editingRow && canManageData(user?.role);

    // Update modal title
    document.getElementById('photoModalPropertyName').textContent = property.community_name || '';

    if (isPhotoEditMode) {
        document.getElementById('photoModalTitle').textContent = '編輯照片';
        document.getElementById('photoPreviewMode').classList.add('hidden');
        document.getElementById('photoEditMode').classList.remove('hidden');
        document.getElementById('photoEditActions').classList.remove('hidden');
        renderPhotoGrid();
    } else {
        document.getElementById('photoModalTitle').textContent = '物件照片';
        document.getElementById('photoPreviewMode').classList.remove('hidden');
        document.getElementById('photoEditMode').classList.add('hidden');
        document.getElementById('photoEditActions').classList.add('hidden');
        renderPhotoCarousel();
    }

    openModal('photoModal');
}

/**
 * Close photo modal
 */
function closePhotoModal() {
    closeModal('photoModal');
    currentPhotoPropertyId = null;
    currentPhotos = [];
    currentPhotoIndex = 0;
    isPhotoEditMode = false;
}

/**
 * Render photo carousel (preview mode)
 */
function renderPhotoCarousel() {
    const carouselImage = document.getElementById('carouselImage');
    const carouselEmpty = document.getElementById('carouselEmpty');
    const thumbnails = document.getElementById('photoThumbnails');
    const counter = document.getElementById('photoCounter');

    if (currentPhotos.length === 0) {
        carouselImage.classList.add('hidden');
        carouselEmpty.classList.remove('hidden');
        thumbnails.innerHTML = '';
        counter.textContent = '';
        return;
    }

    carouselImage.classList.remove('hidden');
    carouselEmpty.classList.add('hidden');

    // Show current photo
    const photoUrl = currentPhotos[currentPhotoIndex];
    carouselImage.src = photoUrl.includes('?') ? photoUrl : `${photoUrl}?width=800&height=600&resize=contain`;

    // Render thumbnails
    thumbnails.innerHTML = currentPhotos.map((url, index) => `
        <div class="photo-thumbnail ${index === currentPhotoIndex ? 'active' : ''}" onclick="goToPhoto(${index})">
            <img src="${url}?width=60&height=60&resize=cover" alt="縮圖 ${index + 1}">
        </div>
    `).join('');

    // Update counter
    counter.textContent = `${currentPhotoIndex + 1} / ${currentPhotos.length}`;
}

/**
 * Go to specific photo
 * @param {number} index 
 */
function goToPhoto(index) {
    if (index >= 0 && index < currentPhotos.length) {
        currentPhotoIndex = index;
        renderPhotoCarousel();
    }
}

/**
 * Previous photo
 */
function prevPhoto() {
    if (currentPhotos.length > 0) {
        currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
        renderPhotoCarousel();
    }
}

/**
 * Next photo
 */
function nextPhoto() {
    if (currentPhotos.length > 0) {
        currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
        renderPhotoCarousel();
    }
}

/**
 * Render photo grid (edit mode)
 */
function renderPhotoGrid() {
    const grid = document.getElementById('photoGrid');
    const properties = getPropertiesCache();
    const property = properties.find(p => p.id === currentPhotoPropertyId);
    const coverPhoto = property?.cover_photo_path;

    if (currentPhotos.length === 0) {
        grid.innerHTML = '<p class="text-muted text-center p-4">尚無照片，請上傳</p>';
        return;
    }

    grid.innerHTML = currentPhotos.map((url, index) => {
        const isCover = url === coverPhoto;
        // Use index instead of URL to avoid escaping issues
        return `
        <div class="photo-grid-item" data-index="${index}">
            ${isCover ? '<span class="cover-badge">封面</span>' : ''}
            <img src="${escapeHtml(url)}?width=200&height=150&resize=cover" alt="照片 ${index + 1}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 150%22><rect fill=%22%23f3f4f6%22 width=%22200%22 height=%22150%22/><text x=%22100%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%239ca3af%22>載入失敗</text></svg>'">
            <div class="photo-overlay">
                <button class="photo-action-btn cover" onclick="setCoverPhotoByIndex(${index})" title="設為封面">
                    <svg viewBox="0 0 24 24" fill="${isCover ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </button>
                <button class="photo-action-btn delete" onclick="deletePhotoByIndex(${index})" title="刪除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

// ==================== Photo Upload ====================

/**
 * Handle drag over
 * @param {Event} event 
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('photoUploadZone').classList.add('drag-over');
}

/**
 * Handle drag leave
 * @param {Event} event 
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('photoUploadZone').classList.remove('drag-over');
}

/**
 * Handle drop
 * @param {Event} event 
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('photoUploadZone').classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        uploadPhotos(files);
    }
}

/**
 * Handle file select
 * @param {Event} event 
 */
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        uploadPhotos(files);
    }
    // Reset input
    event.target.value = '';
}

/**
 * Upload photos
 * @param {FileList} files 
 */
async function uploadPhotos(files) {
    if (!currentPhotoPropertyId) return;

    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressDiv.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '準備上傳...';

    const user = getCurrentUser();
    const formData = new FormData();
    formData.append('property_id', currentPhotoPropertyId);
    formData.append('user', user?.name || '系統');

    // Add all files
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }

    try {
        progressText.textContent = `上傳中 (${files.length} 張)...`;
        progressFill.style.width = '30%';

        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.PHOTOS}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        progressFill.style.width = '60%';

        if (result.status === 'success' && result.files) {
            // Add new photos to current list
            result.files.forEach(file => {
                if (file.public_url) {
                    currentPhotos.push(file.public_url);
                }
            });

            progressText.textContent = '儲存照片資料...';
            progressFill.style.width = '80%';

            // IMPORTANT: Save photo_paths to backend immediately
            await apiRequest(CONFIG.ENDPOINTS.PROPERTIES, 'POST', {
                action: 'update',
                user: user?.name || '系統',
                id: currentPhotoPropertyId,
                data: {
                    photo_paths: currentPhotos
                }
            });

            progressFill.style.width = '100%';

            // Update property cache
            const properties = getPropertiesCache();
            const propIndex = properties.findIndex(p => p.id === currentPhotoPropertyId);
            if (propIndex !== -1) {
                properties[propIndex].photo_paths = [...currentPhotos];
            }

            progressText.textContent = `上傳成功！(${result.files.length} 張)`;
            showToast('success', '照片上傳成功', `已上傳 ${result.files.length} 張照片`);

            // Refresh grid only (don't refresh table to keep edit mode)
            setTimeout(() => {
                progressDiv.classList.add('hidden');
                renderPhotoGrid();
                // Update photo badge in table without full refresh
                updatePhotoCountBadge(currentPhotoPropertyId, currentPhotos.length);
            }, 1000);
        } else {
            throw new Error(result.message || '上傳失敗');
        }
    } catch (error) {
        progressText.textContent = '上傳失敗';
        showToast('error', '上傳失敗', error.message);
        setTimeout(() => progressDiv.classList.add('hidden'), 2000);
    }
}

/**
 * Update photo count badge in table without full refresh
 * @param {string} propertyId 
 * @param {number} count 
 */
function updatePhotoCountBadge(propertyId, count) {
    const row = document.querySelector(`tr[data-id="${propertyId}"]`);
    if (row) {
        const photoBtn = row.querySelector('.photo-btn');
        if (photoBtn) {
            const existingBadge = photoBtn.querySelector('.photo-count');
            if (count > 0) {
                if (existingBadge) {
                    existingBadge.textContent = count;
                } else {
                    photoBtn.classList.add('has-photos');
                    photoBtn.insertAdjacentHTML('beforeend', `<span class="photo-count">${count}</span>`);
                }
            } else if (existingBadge) {
                existingBadge.remove();
                photoBtn.classList.remove('has-photos');
            }
        }
    }
}

/**
 * Delete photo by index (wrapper for deletePhoto)
 * @param {number} index 
 */
function deletePhotoByIndex(index) {
    if (index >= 0 && index < currentPhotos.length) {
        deletePhoto(currentPhotos[index]);
    }
}

/**
 * Set cover photo by index (wrapper for setCoverPhoto)
 * @param {number} index 
 */
function setCoverPhotoByIndex(index) {
    if (index >= 0 && index < currentPhotos.length) {
        setCoverPhoto(currentPhotos[index]);
    }
}

/**
 * Delete photo
 * @param {string} photoUrl 
 */
async function deletePhoto(photoUrl) {
    if (!currentPhotoPropertyId) return;

    if (!confirm('確定要刪除這張照片嗎？')) return;

    try {
        // Remove from current list
        const index = currentPhotos.indexOf(photoUrl);
        if (index > -1) {
            currentPhotos.splice(index, 1);
        }

        // Update property via API
        const user = getCurrentUser();
        await apiRequest(CONFIG.ENDPOINTS.PROPERTIES, 'POST', {
            action: 'update',
            user: user?.name || '系統',
            id: currentPhotoPropertyId,
            data: {
                photo_paths: currentPhotos
            }
        });

        // Update cache
        const properties = getPropertiesCache();
        const propIndex = properties.findIndex(p => p.id === currentPhotoPropertyId);
        if (propIndex !== -1) {
            properties[propIndex].photo_paths = [...currentPhotos];
        }

        showToast('success', '照片已刪除', '');
        renderPhotoGrid();
        renderPropertiesTable();
    } catch (error) {
        // Restore photo if API failed
        showToast('error', '刪除失敗', error.message);
        // Re-read from cache
        const properties = getPropertiesCache();
        const property = properties.find(p => p.id === currentPhotoPropertyId);
        if (property) {
            currentPhotos = property.photo_paths || [];
        }
        renderPhotoGrid();
    }
}

/**
 * Set cover photo
 * @param {string} photoUrl 
 */
async function setCoverPhoto(photoUrl) {
    if (!currentPhotoPropertyId) return;

    try {
        const user = getCurrentUser();
        await apiRequest(CONFIG.ENDPOINTS.PROPERTIES, 'POST', {
            action: 'update',
            user: user?.name || '系統',
            id: currentPhotoPropertyId,
            data: {
                cover_photo_path: photoUrl
            }
        });

        // Update cache
        const properties = getPropertiesCache();
        const propIndex = properties.findIndex(p => p.id === currentPhotoPropertyId);
        if (propIndex !== -1) {
            properties[propIndex].cover_photo_path = photoUrl;
        }

        showToast('success', '封面已設定', '');
        renderPhotoGrid();
        renderPropertiesTable();
    } catch (error) {
        showToast('error', '設定失敗', error.message);
    }
}
