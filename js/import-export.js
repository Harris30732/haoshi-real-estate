/**
 * 好室房產 - Import/Export Module
 * 資料匯入匯出功能
 */

// Import state
let importData = null;

/**
 * Open import modal
 */
function importData() {
    document.getElementById('importFile').value = '';
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('confirmImportBtn').disabled = true;
    openModal('importModal');
}

/**
 * Handle import file selection
 */
document.getElementById('importFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const content = await readFileContent(file);
        const data = parseImportData(file.name, content);

        if (data && data.length > 0) {
            importData = data;
            previewImportData(data);
            document.getElementById('confirmImportBtn').disabled = false;
        } else {
            showToast('error', '無法解析檔案', '請確認檔案格式正確');
        }
    } catch (error) {
        showToast('error', '讀取檔案失敗', error.message);
    }
});

/**
 * Read file content
 * @param {File} file 
 * @returns {Promise<string>}
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('讀取檔案失敗'));
        reader.readAsText(file);
    });
}

/**
 * Parse import data based on file type
 * @param {string} filename 
 * @param {string} content 
 * @returns {Array}
 */
function parseImportData(filename, content) {
    if (filename.endsWith('.json')) {
        return parseJSON(content);
    } else if (filename.endsWith('.csv')) {
        return parseCSV(content);
    }
    return null;
}

/**
 * Parse JSON content
 * @param {string} content 
 * @returns {Array}
 */
function parseJSON(content) {
    try {
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [data];
    } catch (e) {
        console.error('JSON parse error:', e);
        return null;
    }
}

/**
 * Parse CSV content
 * @param {string} content 
 * @returns {Array}
 */
function parseCSV(content) {
    try {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return null;

        // Parse header
        const headers = parseCSVLine(lines[0]);

        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index];
                });
                data.push(row);
            }
        }

        return data;
    } catch (e) {
        console.error('CSV parse error:', e);
        return null;
    }
}

/**
 * Parse a single CSV line (handling quoted values)
 * @param {string} line 
 * @returns {Array}
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * Preview import data
 * @param {Array} data 
 */
function previewImportData(data) {
    const preview = document.getElementById('importPreview');
    const previewContent = document.getElementById('importPreviewContent');

    if (!preview || !previewContent) return;

    // Show first 5 rows
    const previewData = data.slice(0, 5);
    const columns = Object.keys(previewData[0] || {});

    let html = `
    <table class="data-table text-xs">
      <thead>
        <tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${previewData.map(row => `
          <tr>${columns.map(c => `<td>${escapeHtml(row[c] || '')}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
    <p class="text-sm text-muted mt-2">顯示前 ${previewData.length} 筆，共 ${data.length} 筆</p>
  `;

    previewContent.innerHTML = html;
    preview.classList.remove('hidden');
}

/**
 * Confirm import
 */
async function confirmImport() {
    if (!importData || importData.length === 0) {
        showToast('error', '沒有可匯入的資料', '');
        return;
    }

    try {
        showLoading();

        // Import each row
        let successCount = 0;
        let errorCount = 0;

        for (const row of importData) {
            try {
                // Map CSV columns to property fields
                const propertyData = mapImportRow(row);
                await createProperty(propertyData);
                successCount++;
            } catch (e) {
                console.error('Import row error:', e);
                errorCount++;
            }
        }

        closeModal('importModal');
        showToast('success', '匯入完成', `成功 ${successCount} 筆，失敗 ${errorCount} 筆`);
        renderPropertiesTable();

    } catch (error) {
        showToast('error', '匯入失敗', error.message);
    } finally {
        hideLoading();
        importData = null;
    }
}

/**
 * Map import row to property data
 * @param {Object} row 
 * @returns {Object}
 */
function mapImportRow(row) {
    // Try to map common column names
    return {
        community_name: row.community_name || row['社區名稱'] || row.社區 || '',
        total_price: parseFloat(row.total_price || row['總價'] || row.總價萬 || 0),
        total_ping: parseFloat(row.total_ping || row['總坪數'] || row.總坪 || 0),
        parking_ping: parseFloat(row.parking_ping || row['車位坪數'] || row.車位坪 || 0),
        parking_price: parseFloat(row.parking_price || row['車位價格'] || row.車位價萬 || 0),
        floor_info: row.floor_info || row['樓層'] || row.樓層資訊 || '',
        address: row.address || row['地址'] || '',
        status: row.status || row['狀態'] || '一般',
        layout: row.layout || row['格局'] || row.房型 || '',
        notes: row.notes || row['備註'] || ''
    };
}

// ==================== Export Functions ====================

/**
 * Export data to file
 */
function exportData() {
    const properties = getFilteredProperties();

    if (properties.length === 0) {
        showToast('warning', '沒有可匯出的資料', '');
        return;
    }

    // Prepare export data
    const exportData = properties.map(p => {
        const community = getCommunityByName(p.community_name);
        const housePing = (parseFloat(p.total_ping) || 0) - (parseFloat(p.parking_ping) || 0);
        const housePrice = (parseFloat(p.total_price) || 0) - (parseFloat(p.parking_price) || 0);
        const unitPrice = housePing > 0 ? (housePrice / housePing).toFixed(1) : 0;

        return {
            社區名稱: p.community_name || '',
            建商: community?.builder || '',
            完工年份: community?.completion_date || '',
            總戶數: community?.total_units || '',
            坪數範圍: community?.unit_area_range || '',
            總價萬: p.total_price || 0,
            總坪數: p.total_ping || 0,
            車位坪數: p.parking_ping || 0,
            房屋坪數: housePing.toFixed(1),
            車位價格萬: p.parking_price || 0,
            房屋單價萬坪: unitPrice,
            樓層: p.floor_info || '',
            地址: p.address || '',
            狀態: p.status || '',
            格局: p.layout || '',
            備註: p.notes || '',
            建立者: p.agent || '',
            建立時間: p.created_at_source || '',
            維護者: p.maintainer || '',
            維護時間: p.updated_at_source || ''
        };
    });

    // Generate CSV
    const csv = generateCSV(exportData);
    downloadFile(csv, `物件資料_${getDateString()}.csv`, 'text/csv;charset=utf-8');

    showToast('success', '匯出成功', `已匯出 ${properties.length} 筆資料`);
}

/**
 * Export system backup (JSON)
 */
function exportBackup() {
    const backup = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        data: {
            properties: getPropertiesCache(),
            communities: getCommunitiesCache(),
            users: canManageUsers(getCurrentUser()?.role) ? getUsersCache() : []
        }
    };

    const json = JSON.stringify(backup, null, 2);
    downloadFile(json, `系統備份_${getDateString()}.json`, 'application/json');

    showToast('success', '備份成功', '系統資料已匯出');
}

/**
 * Save backup (same as export for client-side)
 */
function saveBackup() {
    exportBackup();
}

/**
 * Generate CSV from data array
 * @param {Array} data 
 * @returns {string}
 */
function generateCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    const csvLines = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                const value = row[h];
                // Escape quotes and wrap in quotes if contains comma or newline
                if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ];

    return bom + csvLines.join('\n');
}

/**
 * Download file
 * @param {string} content 
 * @param {string} filename 
 * @param {string} mimeType 
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Get current date string for filenames
 * @returns {string}
 */
function getDateString() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}
