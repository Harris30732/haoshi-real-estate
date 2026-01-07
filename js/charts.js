/**
 * 好室房產 - Charts Module
 * 圖表渲染與管理
 */

// Chart instances
let priceChart = null;
let communityChart = null;

// Current chart mode
let currentChartMode = 'price'; // 'price' or 'community'

/**
 * Initialize charts
 */
function initCharts() {
    // Set Chart.js defaults
    Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6b7280';

    // Create initial charts
    createPriceChart();
    createCommunityChart();
}

/**
 * Create price distribution chart
 */
function createPriceChart() {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;

    priceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: CONFIG.PRICE_RANGES.map(r => r.label),
            datasets: [{
                label: '物件數量',
                data: [0, 0, 0, 0, 0],
                backgroundColor: CONFIG.CHART_COLORS.primary,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return `${context.parsed.x} 件`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb',
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 1,
                        callback: function (value) {
                            return value;
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            weight: 500
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create community count chart
 */
function createCommunityChart() {
    const ctx = document.getElementById('communityChart');
    if (!ctx) return;

    communityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '物件數量',
                data: [],
                backgroundColor: CONFIG.CHART_COLORS.secondary,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return `${context.parsed.x} 件`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb',
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            weight: 500
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update charts with current data
 */
function updateCharts() {
    const properties = getPropertiesCache().filter(p => p.status !== '已下架');

    updatePriceChart(properties);
    updateCommunityChart(properties);
}

/**
 * Update price distribution chart
 * @param {Array} properties 
 */
function updatePriceChart(properties) {
    if (!priceChart) return;

    // Calculate counts for each price range
    const counts = CONFIG.PRICE_RANGES.map(range => {
        return properties.filter(p => {
            const price = parseFloat(p.total_price) || 0;
            return price >= range.min && price < range.max;
        }).length;
    });

    priceChart.data.datasets[0].data = counts;
    priceChart.update('none');
}

/**
 * Update community count chart
 * @param {Array} properties 
 */
function updateCommunityChart(properties) {
    if (!communityChart) return;

    // Count properties per community
    const communityCounts = {};
    properties.forEach(p => {
        const name = p.community_name || '未分類';
        communityCounts[name] = (communityCounts[name] || 0) + 1;
    });

    // Sort by count descending and take top 10
    const sortedCommunities = Object.entries(communityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    communityChart.data.labels = sortedCommunities.map(c => c[0]);
    communityChart.data.datasets[0].data = sortedCommunities.map(c => c[1]);
    communityChart.update('none');
}

/**
 * Toggle between chart modes
 */
function toggleChart() {
    const priceContainer = document.getElementById('priceChartContainer');
    const communityContainer = document.getElementById('communityChartContainer');
    const toggleText = document.getElementById('chartToggleText');
    const chartTitle = document.getElementById('chartTitle');

    if (currentChartMode === 'price') {
        // Switch to community chart
        currentChartMode = 'community';
        priceContainer.classList.add('hidden');
        communityContainer.classList.remove('hidden');
        toggleText.textContent = '社區件數比較';
        chartTitle.textContent = '青埔地區房市分析 - 社區物件統計';
    } else {
        // Switch to price chart
        currentChartMode = 'price';
        priceContainer.classList.remove('hidden');
        communityContainer.classList.add('hidden');
        toggleText.textContent = '總價區間分布';
        chartTitle.textContent = '青埔地區房市分析 - 總價區間分布';
    }
}

/**
 * Get price range label for a property
 * @param {number} price 
 * @returns {string}
 */
function getPriceRangeLabel(price) {
    for (const range of CONFIG.PRICE_RANGES) {
        if (price >= range.min && price < range.max) {
            return range.label;
        }
    }
    return '未分類';
}

/**
 * Destroy charts
 */
function destroyCharts() {
    if (priceChart) {
        priceChart.destroy();
        priceChart = null;
    }
    if (communityChart) {
        communityChart.destroy();
        communityChart = null;
    }
}

/**
 * Resize charts
 */
function resizeCharts() {
    if (priceChart) priceChart.resize();
    if (communityChart) communityChart.resize();
}

// Handle window resize
window.addEventListener('resize', () => {
    clearTimeout(window.chartResizeTimeout);
    window.chartResizeTimeout = setTimeout(resizeCharts, 250);
});
