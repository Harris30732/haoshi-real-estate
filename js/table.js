/**
 * 好室房產 - Table Module
 * 表格渲染與管理
 */

// Table state
let currentTab = 'active'; // 'active' or 'archived'
let currentPage = 1;
let sortColumn = 'total_price';
let sortDirection = 'desc';
let expandedCommunities = new Set();

// Filter state
let filters = {
    minPrice: null,
    maxPrice: null,
    houseType: '',
    contractType: '',
    community: ''
};

/**
 * Initialize table event listeners
 */
function initTable() {
    // Filter change handlers
    document.getElementById('filterMinPrice')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('filterMaxPrice')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('filterHouseType')?.addEventListener('change', applyFilters);
    document.getElementById('filterContractType')?.addEventListener('change', applyFilters);
    document.getElementById('filterCommunity')?.addEventListener('change', applyFilters);

    // Sortable columns
    document.querySelectorAll('.data-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (column) {
                toggleSort(column);
            }
        });
    });
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Switch tab (active/archived)
 * @param {string} tab 
 */
function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    // Update tab UI
    document.getElementById('tabActive')?.classList.toggle('active', tab === 'active');
    document.getElementById('tabArchived')?.classList.toggle('active', tab === 'archived');

    renderPropertiesTable();
}

/**
 * Apply filters
 */
function applyFilters() {
    filters = {
        minPrice: parseFloat(document.getElementById('filterMinPrice')?.value) || null,
        maxPrice: parseFloat(document.getElementById('filterMaxPrice')?.value) || null,
        houseType: document.getElementById('filterHouseType')?.value || '',
        contractType: document.getElementById('filterContractType')?.value || '',
        community: document.getElementById('filterCommunity')?.value || ''
    };

    currentPage = 1;
    renderPropertiesTable();
}

/**
 * Toggle sort direction
 * @param {string} column 
 */
function toggleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'desc';
    }

    renderPropertiesTable();
}

/**
 * Get filtered and sorted properties
 * @returns {Array}
 */
function getFilteredProperties() {
    let properties = getPropertiesCache();

    // Filter by tab (active/archived)
    if (currentTab === 'active') {
        properties = properties.filter(p => p.status !== '已下架');
    } else {
        properties = properties.filter(p => p.status === '已下架');
    }

    // Apply filters
    if (filters.minPrice !== null) {
        properties = properties.filter(p => (parseFloat(p.total_price) || 0) >= filters.minPrice);
    }
    if (filters.maxPrice !== null) {
        properties = properties.filter(p => (parseFloat(p.total_price) || 0) <= filters.maxPrice);
    }
    if (filters.houseType) {
        properties = properties.filter(p => p.layout === filters.houseType);
    }
    if (filters.contractType) {
        properties = properties.filter(p => p.status === filters.contractType);
    }
    if (filters.community) {
        properties = properties.filter(p => p.community_name === filters.community);
    }

    // Sort
    properties.sort((a, b) => {
        let aVal, bVal;

        // Handle calculated values
        if (sortColumn === 'house_ping') {
            aVal = (parseFloat(a.total_ping) || 0) - (parseFloat(a.parking_ping) || 0);
            bVal = (parseFloat(b.total_ping) || 0) - (parseFloat(b.parking_ping) || 0);
        } else if (sortColumn === 'unit_price') {
            const aHousePing = (parseFloat(a.total_ping) || 0) - (parseFloat(a.parking_ping) || 0);
            const bHousePing = (parseFloat(b.total_ping) || 0) - (parseFloat(b.parking_ping) || 0);
            const aHousePrice = (parseFloat(a.total_price) || 0) - (parseFloat(a.parking_price) || 0);
            const bHousePrice = (parseFloat(b.total_price) || 0) - (parseFloat(b.parking_price) || 0);
            aVal = aHousePing > 0 ? aHousePrice / aHousePing : 0;
            bVal = bHousePing > 0 ? bHousePrice / bHousePing : 0;
        } else if (sortColumn === 'age') {
            const currentYear = 115; // 民國115年 = 2026
            const aCommunity = getCommunityByName(a.community_name);
            const bCommunity = getCommunityByName(b.community_name);
            aVal = aCommunity?.completion_date ? currentYear - parseInt(aCommunity.completion_date) : 0;
            bVal = bCommunity?.completion_date ? currentYear - parseInt(bCommunity.completion_date) : 0;
        } else {
            aVal = a[sortColumn];
            bVal = b[sortColumn];
        }

        // Handle numeric values
        if (['total_price', 'total_ping', 'parking_ping', 'parking_price'].includes(sortColumn)) {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        }

        // Handle string comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    return properties;
}

/**
 * Render properties table
 */
function renderPropertiesTable() {
    const tbody = document.getElementById('propertiesTableBody');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');

    if (!tbody) return;

    const allProperties = getPropertiesCache();
    const activeCount = allProperties.filter(p => p.status !== '已下架').length;
    const archivedCount = allProperties.filter(p => p.status === '已下架').length;

    // Update tab counts
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('archivedCount').textContent = archivedCount;

    const filteredProperties = getFilteredProperties();
    const totalItems = filteredProperties.length;
    const totalPages = Math.ceil(totalItems / CONFIG.ITEMS_PER_PAGE);

    // Paginate
    const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const pageProperties = filteredProperties.slice(startIndex, startIndex + CONFIG.ITEMS_PER_PAGE);

    // Show/hide empty state
    if (pageProperties.length === 0) {
        tbody.innerHTML = '';
        emptyState?.classList.remove('hidden');
        pagination?.classList.add('hidden');
        return;
    }

    emptyState?.classList.add('hidden');

    // Render rows
    let html = '';
    pageProperties.forEach(property => {
        html += renderPropertyRow(property);
    });

    tbody.innerHTML = html;

    // Render pagination
    renderPagination(totalItems, totalPages);

    // Update charts
    updateCharts();
}

/**
 * Get house type based on ping (房屋坪數)
 * 20坪以下 - 套房
 * 20-32坪 - 兩房
 * 32-50坪 - 三房
 * 50坪以上 - 三房以上
 * @param {number} housePing 
 * @returns {string}
 */
function getHouseType(housePing) {
    if (!housePing || housePing <= 0) return '-';
    if (housePing < 20) return '套房';
    if (housePing < 32) return '兩房';
    if (housePing < 50) return '三房';
    return '三房以上';
}

/**
 * Render a single property row
 * @param {Object} property 
 * @returns {string}
 */
function renderPropertyRow(property) {
    const community = getCommunityByName(property.community_name);
    const isExpanded = expandedCommunities.has(property.id);

    // Calculate derived values
    const housePing = (parseFloat(property.total_ping) || 0) - (parseFloat(property.parking_ping) || 0);
    const housePrice = (parseFloat(property.total_price) || 0) - (parseFloat(property.parking_price) || 0);
    const unitPrice = housePing > 0 ? (housePrice / housePing).toFixed(1) : '-';

    // Calculate age from completion date
    const currentYear = 115; // 民國115年 = 2026
    const completionYear = parseInt(community?.completion_date) || 0;
    const age = completionYear > 0 ? currentYear - completionYear : '-';

    // Auto-classify house type based on ping (房屋坪數)
    const houseType = getHouseType(housePing);

    const user = getCurrentUser();
    const canEdit = canManageData(user?.role);
    const hasPhotos = property.photo_paths && property.photo_paths.length > 0;

    let html = `
    <tr data-id="${property.id}" class="property-row">
      <td class="col-community">
        <div class="community-cell ${isExpanded ? 'expanded' : ''}" onclick="toggleCommunityDetails('${property.id}')">
          <svg class="community-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          ${escapeHtml(property.community_name || '-')}
        </div>
      </td>
      <td class="col-property">${age}</td>
      <td class="col-property">${escapeHtml(community?.total_units || '-')}</td>
      <td class="col-price">${formatNumber(property.total_price)}</td>
      <td class="col-price">${formatNumber(property.total_ping, 1)}</td>
      <td class="col-price">${formatNumber(property.parking_ping, 1)}</td>
      <td class="col-price">${formatNumber(housePing, 1)}</td>
      <td class="col-price">${formatNumber(property.parking_price)}</td>
      <td class="col-price">${unitPrice}</td>
      <td class="col-property">${escapeHtml(property.floor_info || '-')}</td>
      <td class="col-property">${escapeHtml(property.address || '-')}</td>
      <td class="col-property">${houseType}</td>
      <td class="col-photo">
        <button class="photo-btn ${hasPhotos ? 'has-photos' : ''}" onclick="viewPhotos('${property.id}')" title="查看照片">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          ${hasPhotos ? `<span class="photo-count">${property.photo_paths.length}</span>` : ''}
        </button>
      </td>
      <td class="col-property">${renderStatusBadge(property.status)}</td>
      <td class="col-meta">${escapeHtml(property.notes || '-')}</td>
      <td class="col-meta">
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(property.maintainer || property.agent || '-')}</span>
          <span class="meta-time">${formatDate(property.updated_at_source || property.created_at_source)}</span>
        </div>
      </td>
      <td class="col-action">
        ${canEdit ? renderInlineEditButton(property) : renderViewOnlyButton(property)}
      </td>
    </tr>
  `;

    // Add expandable community details row
    html += `
    <tr class="community-details-row ${isExpanded ? 'active' : ''}" data-parent="${property.id}">
      <td class="community-details-cell" colspan="17">
        <div class="community-details">
          <div class="community-detail-item">
            <span class="community-detail-label">建商</span>
            <span class="community-detail-value">${escapeHtml(community?.builder || '-')}</span>
          </div>
          <div class="community-detail-item">
            <span class="community-detail-label">完工年份</span>
            <span class="community-detail-value">民國 ${escapeHtml(community?.completion_date || '-')} 年</span>
          </div>
          <div class="community-detail-item">
            <span class="community-detail-label">總戶數</span>
            <span class="community-detail-value">${escapeHtml(community?.total_units || '-')} 戶</span>
          </div>
          <div class="community-detail-item">
            <span class="community-detail-label">坪數範圍</span>
            <span class="community-detail-value">${escapeHtml(community?.unit_area_range || '-')} 坪</span>
          </div>
        </div>
      </td>
    </tr>
  `;

    return html;
}

/**
 * Render status badge
 * @param {string} status 
 * @returns {string}
 */
function renderStatusBadge(status) {
    let className = 'status-badge ';
    switch (status) {
        case '專任':
            className += 'status-exclusive';
            break;
        case '一般':
            className += 'status-general';
            break;
        case '已成交':
            className += 'status-sold';
            break;
        case '下架':
        case '已下架':
            className += 'status-delisted';
            break;
        case '屋主':
            className += 'status-owner';
            break;
        case '待確認':
            className += 'status-pending';
            break;
        default:
            className += 'status-general';
    }
    return `<span class="${className}">${escapeHtml(status || '-')}</span>`;
}

/**
 * Render inline edit button for manager+ users
 * @param {Object} property 
 * @returns {string}
 */
function renderInlineEditButton(property) {
    return `
    <div class="table-actions">
      <button class="action-btn-inline edit" onclick="startInlineEdit('${property.id}')" title="編輯此物件">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        編輯
      </button>
      <button class="action-btn-inline delete" onclick="confirmDeleteProperty('${property.id}')" title="刪除此物件">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        刪除
      </button>
    </div>
  `;
}

/**
 * Render view only button (for users without edit permission)
 * @param {Object} property 
 * @returns {string}
 */
function renderViewOnlyButton(property) {
    return `
    <div class="table-actions">
      <button class="action-btn-inline view" onclick="viewPropertyDetails('${property.id}')" title="檢視詳情">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        檢視
      </button>
    </div>
  `;
}

// Track currently editing property
let editingPropertyId = null;

/**
 * Start inline editing for a property
 * @param {string} propertyId 
 */
function startInlineEdit(propertyId) {
    // Close any existing edit mode
    if (editingPropertyId && editingPropertyId !== propertyId) {
        cancelInlineEdit(editingPropertyId);
    }

    editingPropertyId = propertyId;
    const row = document.querySelector(`tr[data-id="${propertyId}"]`);
    if (!row) return;

    // Get property data
    const properties = getPropertiesCache();
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    // Add editing class
    row.classList.add('editing');

    // Render edit mode row
    renderEditModeRow(row, property);
}

/**
 * Render row in edit mode
 * @param {HTMLElement} row 
 * @param {Object} property 
 */
function renderEditModeRow(row, property) {
    const community = getCommunityByName(property.community_name);
    const communities = getCommunitiesCache();

    // Calculate values for display
    const housePing = (parseFloat(property.total_ping) || 0) - (parseFloat(property.parking_ping) || 0);
    const housePrice = (parseFloat(property.total_price) || 0) - (parseFloat(property.parking_price) || 0);
    const unitPrice = housePing > 0 ? (housePrice / housePing).toFixed(1) : '-';
    const currentYear = 115;
    const completionYear = parseInt(community?.completion_date) || 0;
    const age = completionYear > 0 ? currentYear - completionYear : '-';

    // Status options
    const statusOptions = ['專任', '一般', '屋主', '待確認', '下架'].map(s =>
        `<option value="${s}" ${property.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    // Community options  
    const communityOptions = communities.map(c =>
        `<option value="${c.community_name}" ${property.community_name === c.community_name ? 'selected' : ''}>${c.community_name}</option>`
    ).join('');

    row.innerHTML = `
      <td class="col-community">
        <select class="edit-input edit-community" data-field="community_name" onchange="updateCommunityLinkedFields('${property.id}')">
          ${communityOptions}
        </select>
      </td>
      <td class="col-property"><span class="calc-value" id="calcAge-${property.id}">${age}</span></td>
      <td class="col-property"><span class="calc-value" id="calcUnits-${property.id}">${escapeHtml(community?.total_units || '-')}</span></td>
      <td class="col-price"><input type="number" class="edit-input" data-field="total_price" value="${property.total_price || ''}" step="1"></td>
      <td class="col-price"><input type="number" class="edit-input" data-field="total_ping" value="${property.total_ping || ''}" step="0.1"></td>
      <td class="col-price"><input type="number" class="edit-input" data-field="parking_ping" value="${property.parking_ping || ''}" step="0.1"></td>
      <td class="col-price"><span class="calc-value" id="calcHousePing-${property.id}">${formatNumber(housePing, 1)}</span></td>
      <td class="col-price"><input type="number" class="edit-input" data-field="parking_price" value="${property.parking_price || ''}" step="1"></td>
      <td class="col-price"><span class="calc-value" id="calcUnitPrice-${property.id}">${unitPrice}</span></td>
      <td class="col-property"><input type="text" class="edit-input" data-field="floor_info" value="${escapeHtml(property.floor_info || '')}"></td>
      <td class="col-property"><input type="text" class="edit-input" data-field="address" value="${escapeHtml(property.address || '')}"></td>
      <td class="col-property"><span class="calc-value" id="calcHouseType-${property.id}">${getHouseType(housePing)}</span></td>
      <td class="col-photo">
        <button class="photo-btn" onclick="viewPhotos('${property.id}')" title="查看照片">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
      </td>
      <td class="col-property">
        <select class="edit-input edit-status" data-field="status">
          ${statusOptions}
        </select>
      </td>
      <td class="col-meta"><input type="text" class="edit-input" data-field="notes" value="${escapeHtml(property.notes || '')}" placeholder="備註"></td>
      <td class="col-meta">
        <div class="meta-info">
          <span class="meta-user">${escapeHtml(property.maintainer || property.agent || '-')}</span>
          <span class="meta-time">${formatDate(property.updated_at_source || property.created_at_source)}</span>
        </div>
      </td>
      <td class="col-action">
        <div class="edit-actions">
          <button class="action-btn-save" onclick="saveInlineEdit('${property.id}')" title="儲存">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            完成
          </button>
          <button class="action-btn-cancel" onclick="cancelInlineEdit('${property.id}')" title="取消">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </td>
    `;

    // Add input change listeners for calculated values
    row.querySelectorAll('input[data-field="total_price"], input[data-field="total_ping"], input[data-field="parking_ping"], input[data-field="parking_price"]').forEach(input => {
        input.addEventListener('input', () => updateCalculatedValues(property.id));
    });
}

/**
 * Update calculated values when inputs change
 * @param {string} propertyId 
 */
function updateCalculatedValues(propertyId) {
    const row = document.querySelector(`tr[data-id="${propertyId}"]`);
    if (!row) return;

    const totalPing = parseFloat(row.querySelector('input[data-field="total_ping"]')?.value) || 0;
    const parkingPing = parseFloat(row.querySelector('input[data-field="parking_ping"]')?.value) || 0;
    const totalPrice = parseFloat(row.querySelector('input[data-field="total_price"]')?.value) || 0;
    const parkingPrice = parseFloat(row.querySelector('input[data-field="parking_price"]')?.value) || 0;

    const housePing = totalPing - parkingPing;
    const housePrice = totalPrice - parkingPrice;
    const unitPrice = housePing > 0 ? (housePrice / housePing).toFixed(1) : '-';

    const housePingEl = document.getElementById(`calcHousePing-${propertyId}`);
    const unitPriceEl = document.getElementById(`calcUnitPrice-${propertyId}`);
    const houseTypeEl = document.getElementById(`calcHouseType-${propertyId}`);

    if (housePingEl) housePingEl.textContent = formatNumber(housePing, 1);
    if (unitPriceEl) unitPriceEl.textContent = unitPrice;
    if (houseTypeEl) houseTypeEl.textContent = getHouseType(housePing);
}

/**
 * Update community linked fields when community selection changes
 * @param {string} propertyId 
 */
function updateCommunityLinkedFields(propertyId) {
    const row = document.querySelector(`tr[data-id="${propertyId}"]`);
    if (!row) return;

    const communitySelect = row.querySelector('select[data-field="community_name"]');
    const communityName = communitySelect?.value;
    const community = getCommunityByName(communityName);

    const currentYear = 115;
    const completionYear = parseInt(community?.completion_date) || 0;
    const age = completionYear > 0 ? currentYear - completionYear : '-';

    const ageEl = document.getElementById(`calcAge-${propertyId}`);
    const unitsEl = document.getElementById(`calcUnits-${propertyId}`);

    if (ageEl) ageEl.textContent = age;
    if (unitsEl) unitsEl.textContent = community?.total_units || '-';
}

/**
 * Save inline edit
 * @param {string} propertyId 
 */
async function saveInlineEdit(propertyId) {
    const row = document.querySelector(`tr[data-id="${propertyId}"]`);
    if (!row) return;

    // Collect all edited values
    const updates = {};
    row.querySelectorAll('input.edit-input, select.edit-input').forEach(input => {
        const field = input.dataset.field;
        let value = input.value;

        // Convert numeric fields
        if (['total_price', 'total_ping', 'parking_ping', 'parking_price'].includes(field)) {
            value = value ? parseFloat(value) : null;
        }

        updates[field] = value;
    });

    try {
        // Show loading state
        row.classList.add('saving');

        // Call API to update
        await updateProperty(propertyId, updates);

        showToast('success', '更新成功', '物件資料已儲存');

        editingPropertyId = null;

        // Re-render table
        renderPropertiesTable();
    } catch (error) {
        showToast('error', '更新失敗', error.message);
        row.classList.remove('saving');
    }
}

/**
 * Cancel inline edit
 * @param {string} propertyId 
 */
function cancelInlineEdit(propertyId) {
    editingPropertyId = null;
    renderPropertiesTable();
}

/**
 * View property details (for non-edit users)
 * @param {string} propertyId 
 */
function viewPropertyDetails(propertyId) {
    // For now, just toggle community details
    toggleCommunityDetails(propertyId);
}

/**
 * Toggle community details expansion
 * @param {string} propertyId 
 */
function toggleCommunityDetails(propertyId) {
    if (expandedCommunities.has(propertyId)) {
        expandedCommunities.delete(propertyId);
    } else {
        expandedCommunities.add(propertyId);
    }

    // Update UI
    const row = document.querySelector(`tr[data-id="${propertyId}"]`);
    const detailsRow = document.querySelector(`tr[data-parent="${propertyId}"]`);
    const cellDiv = row?.querySelector('.community-cell');

    if (cellDiv) {
        cellDiv.classList.toggle('expanded', expandedCommunities.has(propertyId));
    }
    if (detailsRow) {
        detailsRow.classList.toggle('active', expandedCommunities.has(propertyId));
    }
}

/**
 * Render pagination
 * @param {number} totalItems 
 * @param {number} totalPages 
 */
function renderPagination(totalItems, totalPages) {
    const pagination = document.getElementById('pagination');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const totalItemsEl = document.getElementById('totalItems');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (!pagination || !paginationNumbers) return;

    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }

    pagination.classList.remove('hidden');
    totalItemsEl.textContent = totalItems;

    // Generate page numbers
    let numbersHtml = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        numbersHtml += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
              onclick="goToPage(${i})">${i}</button>
    `;
    }

    paginationNumbers.innerHTML = numbersHtml;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

/**
 * Go to specific page
 * @param {number} page 
 */
function goToPage(page) {
    currentPage = page;
    renderPropertiesTable();

    // Scroll to top of table
    document.querySelector('.table-wrapper')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Go to previous page
 */
function prevPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

/**
 * Go to next page
 */
function nextPage() {
    const filteredProperties = getFilteredProperties();
    const totalPages = Math.ceil(filteredProperties.length / CONFIG.ITEMS_PER_PAGE);

    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

/**
 * Populate community filter dropdown
 */
function populateCommunityFilters() {
    const select = document.getElementById('filterCommunity');
    const propertySelect = document.getElementById('propertyCommunity');

    const communities = getCommunitiesCache();

    // Filter dropdown
    if (select) {
        const options = communities.map(c =>
            `<option value="${escapeHtml(c.community_name)}">${escapeHtml(c.community_name)}</option>`
        ).join('');
        select.innerHTML = '<option value="">全部</option>' + options;
    }

    // Property form dropdown
    if (propertySelect) {
        const options = communities.map(c =>
            `<option value="${escapeHtml(c.community_name)}">${escapeHtml(c.community_name)}</option>`
        ).join('');
        propertySelect.innerHTML = '<option value="">請選擇社區</option>' + options;
    }
}

/**
 * Delist a property
 * @param {string} propertyId 
 */
async function delistProperty(propertyId) {
    const reason = document.getElementById(`delistReason-${propertyId}`)?.value;

    if (!reason) {
        showToast('warning', '請選擇下架原因', '');
        return;
    }

    try {
        await updateProperty(propertyId, {
            status: '已下架',
            notes: `下架原因: ${reason}`
        });

        showToast('success', '物件已下架', '');
        renderPropertiesTable();
    } catch (error) {
        showToast('error', '下架失敗', error.message);
    }
}

/**
 * Relist a property
 * @param {string} propertyId 
 */
async function relistProperty(propertyId) {
    try {
        await updateProperty(propertyId, { status: '一般' });

        showToast('success', '物件已重新上架', '');
        renderPropertiesTable();
    } catch (error) {
        showToast('error', '上架失敗', error.message);
    }
}

// ==================== Utility Functions ====================

/**
 * Escape HTML to prevent XSS
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Format number with decimal places
 * @param {number|string} value 
 * @param {number} decimals 
 * @returns {string}
 */
function formatNumber(value, decimals = 0) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toFixed(decimals);
}

/**
 * Format date string
 * @param {string} dateStr 
 * @returns {string}
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-TW');
    } catch (e) {
        return dateStr;
    }
}
