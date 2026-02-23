// Reports Page Logic - Give Father Control!
console.log('Reports page loaded');

// Global data storage
let attendanceData = [];
let paymentsData = [];
let workersData = [];
let sitesData = [];

// Current filter state
let currentFilter = 'today';

// Pagination state
let currentPage = 1;
let recordsPerPage = 10;
let totalRecords = 0;
let filteredData = [];
// Category filtering state
let currentCategory = 'all'; // 'all' | 'worker' | 'site'
let currentEntityId = null; // selected worker_id or site_id

// Payment Type filtering state
let currentPaymentType = 'all'; // 'all' | 'given' | 'received'

// Search state
let currentSearchTerm = '';

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
// Report Page Logic - formatCurrency imported from config.js
console.log('📋 Report page loaded');

// ================================
// SEARCH FUNCTIONS
// ================================

/**
 * Filter table data based on search term
 * @param {Array} tableData - Combined table data
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered data
 */
function filterTableDataBySearch(tableData, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return tableData;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return tableData.filter(row => {
        const searchableFields = [
            row.name.toLowerCase(),
            row.type.toLowerCase(),
            row.amount.toString(),
            row.mode.toLowerCase(),
            row.note.toLowerCase(),
            row.date
        ];
        
        return searchableFields.some(field => field.includes(term));
    });
}

/**
 * Setup search functionality
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    if (!searchInput) {
        console.warn('Search input not found on page. Skipping search setup.');
        return;
    }

    // Search input event listener with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchTerm = e.target.value;
            currentPage = 1; // Reset to first page when searching
            updateReport();
            if (clearSearchBtn) {
                clearSearchBtn.style.display = currentSearchTerm ? 'flex' : 'none';
            }
        }, 300); // debounce
    });

    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchTerm = '';
            currentPage = 1;
            clearSearchBtn.style.display = 'none';
            updateReport();
            searchInput.focus();
        });
    }

    // Enter key triggers search immediately
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            currentSearchTerm = e.target.value;
            currentPage = 1;
            updateReport();
            if (clearSearchBtn) {
                clearSearchBtn.style.display = currentSearchTerm ? 'flex' : 'none';
            }
        }
    });
}

// ================================
// PAGINATION FUNCTIONS
// ================================

/**
 * Get paginated data
 * @param {Array} data - Data to paginate
 * @param {number} page - Current page (1-based)
 * @param {number} perPage - Records per page
 * @returns {Object} Paginated data with metadata
 */
function getPaginatedData(data, page, perPage) {
    const total = data.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, total);
    const paginatedData = data.slice(startIndex, endIndex);
    
    return {
        data: paginatedData,
        pagination: {
            currentPage: page,
            totalPages,
            totalRecords: total,
            recordsPerPage: perPage,
            startIndex: startIndex + 1,
            endIndex,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
}

/**
 * Update pagination controls
 * @param {Object} pagination - Pagination metadata
 */
function updatePaginationControls(pagination) {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (pagination.totalRecords === 0) {
        paginationContainer.classList.add('pagination-container-hidden');
        return;
    }
    
    if (pagination.totalPages > 1) {
        paginationContainer.classList.remove('pagination-container-hidden');
    } else {
        paginationContainer.classList.add('pagination-container-hidden');
        return;
    }
    
    paginationInfo.textContent = `Showing ${pagination.startIndex}-${pagination.endIndex} of ${pagination.totalRecords} records`;
    
    prevBtn.disabled = !pagination.hasPrev;
    nextBtn.disabled = !pagination.hasNext;
    
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    console.log('Pagination:', { currentPage: pagination.currentPage, totalPages: pagination.totalPages, startPage, endPage });
    
    let pageNumbersHTML = '';
    
    if (startPage > 1) {
        const isPage1Active = pagination.currentPage === 1;
        console.log('Adding page 1 separately, active:', isPage1Active);
        pageNumbersHTML += `<span class="page-number ${isPage1Active ? 'active' : ''}" data-page="1">1</span>`;
        if (startPage > 2) {
            pageNumbersHTML += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === pagination.currentPage;
        console.log(`Page ${i}, active: ${isActive}, currentPage: ${pagination.currentPage}`);
        pageNumbersHTML += `<span class="page-number ${isActive ? 'active' : ''}" data-page="${i}">${i}</span>`;
    }
    
    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            pageNumbersHTML += `<span class="page-ellipsis">...</span>`;
        }
        const isLastPageActive = pagination.currentPage === pagination.totalPages;
        pageNumbersHTML += `<span class="page-number ${isLastPageActive ? 'active' : ''}" data-page="${pagination.totalPages}">${pagination.totalPages}</span>`;
    }
    
    pageNumbers.innerHTML = pageNumbersHTML;
    
    pageNumbers.querySelectorAll('.page-number').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page !== currentPage) {
                currentPage = page;
                updateReport();
            }
        });
    });
}

/**
 * Setup pagination event listeners
 */
function setupPaginationControls() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateReport();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateReport();
        }
    });
}

/**
 * Get date range based on filter type
 * @param {string} filterType - 'today', 'last7days', 'last30days', 'all'
 * @returns {Object} Date range with start, end, and label
 */
function getDateRange(filterType) {
    const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const end = formatDate(today);

    switch (filterType) {
        case 'today':
            return { start: end, end, label: 'Today' };
        case 'last7days': {
            const startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            return { start: formatDate(startDate), end, label: 'Last 7 Days' };
        }
        case 'last30days': {
            const startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
            return { start: formatDate(startDate), end, label: 'Last 30 Days' };
        }
        case 'all':
        default:
            return {
                start: '2000-01-01',
                end: '2099-12-31',
                label: 'All Data'
            };
    }
}

/**
 * Check if a date is within the given range
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {boolean} True if date is within range
 */
function isDateInRange(dateStr, startDate, endDate) {
    return dateStr >= startDate && dateStr <= endDate;
}

/**
 * Filter attendance data by date range
 * @param {string} filterType - Filter type
 * @returns {Array} Filtered attendance data
 */
function filterAttendanceByDate(filterType) {
    const dateRange = getDateRange(filterType);
    return attendanceData.filter(record => 
        isDateInRange(record.date, dateRange.start, dateRange.end)
    );
}

/**
 * Filter payments data by date range
 * @param {string} filterType - Filter type
 * @returns {Array} Filtered payments data
 */
function filterPaymentsByDate(filterType) {
    const dateRange = getDateRange(filterType);
    return paymentsData.filter(record => 
        isDateInRange(record.date, dateRange.start, dateRange.end)
    );
}

// ================================
// FILTER SETUP FUNCTIONS
// ================================

/**
 * Setup filter button event listeners
 */
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('#timeFilters .filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update current filter and reset pagination
            currentFilter = button.getAttribute('data-filter');
            currentPage = 1;
            
            // Update the report
            updateReport();
            
            console.log(`Filter changed to: ${currentFilter}`);
        });
    });
}

/**
 * Normalize date to YYYY-MM-DD format
 * @param {string} dateStr - Input date string
 * @returns {string|null} Normalized date or null if invalid
 */
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    
    try {
        // Handle various date formats
        let date;
        
        if (dateStr.includes('/')) {
            // Handle MM/DD/YYYY or DD/MM/YYYY formats
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                // Assume MM/DD/YYYY for now
                date = new Date(parts[2], parts[0] - 1, parts[1]);
            }
        } else if (dateStr.includes('-')) {
            // Handle YYYY-MM-DD format
            date = new Date(dateStr);
        } else {
            return null;
        }
        
        if (isNaN(date.getTime())) {
            return null;
        }
        
        // Return in YYYY-MM-DD format
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Date normalization error:', error);
        return null;
    }
}

/**
 * Format date for display as DD-MM-YYYY
 * @param {string} dateStr
 * @returns {string}
 */
function formatDisplayDate(dateStr) {
    const normalized = normalizeDate(dateStr);
    if (!normalized) return dateStr || '-';
    const [y, m, d] = normalized.split('-');
    return `${d}-${m}-${y}`;
}

// ================================
// SEARCH FUNCTIONS
// ================================

/**
 * Filter table data based on search term
 * @param {Array} tableData - Combined table data
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered data
 */
function filterTableDataBySearch(tableData, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return tableData;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return tableData.filter(row => {
        const searchableFields = [
            row.name.toLowerCase(),
            row.type.toLowerCase(),
            row.amount.toString(),
            row.mode.toLowerCase(),
            row.note.toLowerCase(),
            row.date
        ];
        
        return searchableFields.some(field => field.includes(term));
    });
}


// ================================
// PAGINATION FUNCTIONS
// ================================

/**
 * Get paginated data
 * @param {Array} data - Data to paginate
 * @param {number} page - Current page (1-based)
 * @param {number} perPage - Records per page
 * @returns {Object} Paginated data with metadata
 */
function getPaginatedData(data, page, perPage) {
    const total = data.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, total);
    const paginatedData = data.slice(startIndex, endIndex);
    
    return {
        data: paginatedData,
        pagination: {
            currentPage: page,
            totalPages,
            totalRecords: total,
            recordsPerPage: perPage,
            startIndex: startIndex + 1,
            endIndex,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
}


/**
 * Setup pagination event listeners
 */
function setupPaginationControls() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateReport();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateReport();
        }
    });
}

// ================================
// TOTALS CALCULATION FUNCTIONS
// ================================

/**
 * Calculate totals based on filtered data
 * @param {Array} filteredAttendance - Filtered attendance records
 * @param {Array} filteredPayments - Filtered payment records
 * @returns {Object} Calculated totals
 */
function calculateFilteredTotals(filteredAttendance, filteredPayments) {
    // Total Work Amount = sum of all attendance work_amount
    const totalWorkAmount = filteredAttendance.reduce((total, record) => {
        return total + (parseFloat(record.work_amount) || 0);
    }, 0);
    
    // Total Paid = sum of 'given' payments only
    const totalPaidAmount = filteredPayments
        .filter(record => record.type === 'given' || !record.type)
        .reduce((total, record) => {
            return total + (parseFloat(record.amount) || 0);
        }, 0);
    
    // Total Received = sum of 'received' payments (from sites)
    const totalReceivedAmount = filteredPayments
        .filter(record => record.type === 'received')
        .reduce((total, record) => {
            return total + (parseFloat(record.amount) || 0);
        }, 0);
    
    // Pending Balance = Total Work Amount - Total Paid
    const pendingBalance = totalWorkAmount - totalPaidAmount;
    
    console.log('Totals calculated:', {
        totalWorkAmount,
        totalPaidAmount,
        totalReceivedAmount,
        pendingBalance,
        attendanceCount: filteredAttendance.length,
        paymentCount: filteredPayments.length
    });
    
    return {
        totalWorkAmount,
        totalPaidAmount,
        totalReceivedAmount,
        pendingBalance
    };
}

// ================================
// API FUNCTIONS
// ================================

/**
 * Fetch all data from backend
 */
async function fetchAllData() {
    try {
        console.log('Fetching all report data...');
        
        // Fetch attendance data
        const attendanceResponse = await fetch(`${BASE_URL}?action=getAttendance`);
        if (!attendanceResponse.ok) throw new Error('Failed to fetch attendance');
        {
            let att = await attendanceResponse.json();
            attendanceData = Array.isArray(att) ? att : (att && Array.isArray(att.data) ? att.data : (att && Array.isArray(att.result) ? att.result : []));
        }
        
        // Fetch payments data (includes 'given' and 'received' payments)
        const paymentsResponse = await fetch(`${BASE_URL}?action=getPayments`);
        if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
        {
            let pay = await paymentsResponse.json();
            let rawPayments = Array.isArray(pay) ? pay : (pay && Array.isArray(pay.data) ? pay.data : (pay && Array.isArray(pay.result) ? pay.result : []));
            console.log('Raw payments data sample:', rawPayments[0]);
            console.log('First payment fields:', rawPayments[0] ? Object.keys(rawPayments[0]) : 'No data');
            
            // Normalize payments to ensure they have a type field
            // Payments from getPayments are "given" transfers (money paid TO workers)
            paymentsData = rawPayments.map(payment => ({
                ...payment,
                type: payment.type || 'given' // Default to 'given' if no type specified
            }));
            console.log('Normalized payments count:', paymentsData.length);
            console.log('First normalized payment:', paymentsData[0]);
        }
        
        // Fetch received data (payments received from workers - type='received_worker')
        try {
            const receivedResponse = await fetch(`${BASE_URL}?action=getReceived`);
            if (receivedResponse.ok) {
                let received = await receivedResponse.json();
                const receivedData = Array.isArray(received) ? received : (received && Array.isArray(received.data) ? received.data : (received && Array.isArray(received.result) ? received.result : []));
                
                console.log('===== RECEIVED DATA DEBUG =====');
                console.log('Raw received data sample:', receivedData[0]);
                console.log('First received fields:', receivedData[0] ? Object.keys(receivedData[0]) : 'No data');
                console.log('from_name value:', receivedData[0]?.from_name);
                console.log('===============================');
                
                // Normalize received data field names to match payment structure
                const normalizedReceived = receivedData.map(record => {
                    // Try to extract name from various possible fields
                    const fromName = record.from_name || record.fromName || record.worker_name || record.name || record.from_worker_name || record.workerName;
                    const toName = record.to_name || record.toName || record.site_name || record.to_site_name || record.siteName;
                    
                    const normalized = {
                        ...record,
                        type: record.type || 'received_worker',
                        amount: record.amount || record.received_amount || record.payment_amount,
                        worker_id: record.worker_id || record.workerId || record.from_worker_id,
                        site_id: record.site_id || record.siteId || record.from_site_id,
                        date: record.date || record.payment_date || record.received_date,
                        payment_mode: record.payment_mode || record.mode || 'Cash',
                        note: record.note || record.remarks || record.description || '-',
                        // Store the direct name from received data
                        from_name: fromName,
                        to_name: toName
                    };
                    
                    console.log('Normalized received record:', {
                        from_name: normalized.from_name,
                        to_name: normalized.to_name,
                        worker_id: normalized.worker_id,
                        amount: normalized.amount
                    });
                    
                    // Log if critical fields are missing
                    if (!normalized.worker_id && !normalized.from_name) {
                        console.warn('Received record missing both worker_id and from_name:', record);
                    }
                    
                    return normalized;
                });
                
                // Add received payments to paymentsData
                paymentsData = [...paymentsData, ...normalizedReceived];
                console.log(`Added ${normalizedReceived.length} received payments`);
                console.log('Normalized sample:', normalizedReceived[0]);
            }
        } catch (error) {
            console.log('Note: getReceived endpoint not available, continuing with payments only');
        }
        
        // Fetch workers for names
        const workersResponse = await fetch(`${BASE_URL}?action=getWorkers`);
        if (!workersResponse.ok) throw new Error('Failed to fetch workers');
        {
            let workers = await workersResponse.json();
            workersData = Array.isArray(workers) ? workers : (workers && Array.isArray(workers.data) ? workers.data : (workers && Array.isArray(workers.result) ? workers.result : []));
        }
        
        // Fetch sites for names
        const sitesResponse = await fetch(`${BASE_URL}?action=getSites`);
        if (!sitesResponse.ok) throw new Error('Failed to fetch sites');
        {
            let sites = await sitesResponse.json();
            sitesData = Array.isArray(sites) ? sites : (sites && Array.isArray(sites.data) ? sites.data : (sites && Array.isArray(sites.result) ? sites.result : []));
        }
        
        console.log('All data fetched successfully');
        console.log(`Attendance: ${attendanceData.length} records`);
        console.log(`Payments: ${paymentsData.length} records`);
        
        return true;
    } catch (error) {
        console.error('Error fetching data:', error);
        return false;
    }
}

// ================================
// FILTER SETUP FUNCTIONS
// ================================

/**
 * Setup filter button event listeners
 */
// Time filter buttons are scoped in the earlier setupFilterButtons (#timeFilters)

/**
 * Check if date is within range
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {boolean} True if date is in range
 */
function isDateInRange(dateStr, startDate, endDate) {
    if (!dateStr) return false;
    
    // Normalize date format (handle different formats)
    const normalizedDate = normalizeDate(dateStr);
    if (!normalizedDate) return false;
    
    return normalizedDate >= startDate && normalizedDate <= endDate;
}

/**
 * Normalize date to YYYY-MM-DD format
 * @param {string} dateStr - Input date string
 * @returns {string|null} Normalized date or null if invalid
 */
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    
    try {
        // Handle various date formats
        let date;
        
        if (dateStr.includes('/')) {
            // Handle MM/DD/YYYY or DD/MM/YYYY formats
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                // Assume MM/DD/YYYY for now
                date = new Date(parts[2], parts[0] - 1, parts[1]);
            }
        } else if (dateStr.includes('-')) {
            // Handle YYYY-MM-DD format
            date = new Date(dateStr);
        } else {
            return null;
        }
        
        if (isNaN(date.getTime())) {
            return null;
        }
        
        // Return in YYYY-MM-DD format
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Date normalization error:', error);
        return null;
    }
}

// ================================// UI UPDATE FUNCTIONS
// ================================

/**
 * Get worker name by ID
 */
function getWorkerName(workerId) {
    if (!workerId || workerId === 'undefined' || workerId === 'null') {
        console.warn('getWorkerName called with invalid workerId:', workerId);
        return 'Unknown';
    }
    
    // Convert to string for comparison
    const searchId = String(workerId).trim();
    
    // Try to find the worker by worker_id (try both strict and loose equality)
    let worker = workersData.find(w => String(w.worker_id) === searchId || w.worker_id == workerId);
    
    if (worker) {
        const name = worker.name || worker.worker_name || worker.workerName;
        if (name) return name;
    }
    
    // If not found and workerId looks like a timestamp, it might be invalid
    if (searchId.length > 10) {
        console.warn(`Worker not found for ID: ${workerId}. Available workers:`, workersData.map(w => w.worker_id));
        return 'Unknown Worker';
    }
    
    console.warn(`Worker not found for ID: ${workerId}`);
    return `ID:${searchId}`;
}

/**
 * Get site name by ID
 */
function getSiteName(siteId) {
    if (!siteId || siteId === 'undefined' || siteId === 'null') {
        return 'Unknown Site';
    }
    
    const searchId = String(siteId).trim();
    const site = sitesData.find(s => String(s.site_id) === searchId || s.site_id == siteId);
    
    if (site) {
        return site.name || site.site_name || site.siteName || 'Unknown Site';
    }
    
    return `Site ID:${searchId}`;
}

/**
 * Update totals display
 * @param {Object} totals - Calculated totals
 */
function updateTotalsDisplay(totals) {
    document.getElementById('totalWorkAmount').textContent = formatCurrency(totals.totalWorkAmount);
    document.getElementById('totalPaidAmount').textContent = formatCurrency(totals.totalPaidAmount);
    document.getElementById('totalReceivedAmount').textContent = formatCurrency(totals.totalReceivedAmount);
    document.getElementById('pendingBalance').textContent = formatCurrency(totals.pendingBalance);
}

/**
 * Create combined table data from attendance and payments
 * Shows both Transfer (payments given) and Received payments
 * @param {Array} filteredAttendance - Filtered attendance data
 * @param {Array} filteredPayments - Filtered payments data
 * @returns {Array} Combined and sorted table data (latest first)
 */
function createCombinedTableData(filteredAttendance, filteredPayments) {
    // Convert attendance to table format
    const attendanceRows = filteredAttendance.map(record => {
        // Safely parse amount
        let amount = 0;
        try {
            // Try multiple field names for rate/amount
            let rawAmount = record.rate || record.amount || record.payment_amount || record.daily_rate || record.work_amount;
            
            if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
                const parsed = parseFloat(String(rawAmount).trim());
                if (!isNaN(parsed) && isFinite(parsed)) {
                    amount = parsed;
                }
            }
        } catch (e) {
            console.warn('Error parsing rate:', record.rate, e);
        }
        
        return {
            date: record.date,
            name: `${getWorkerName(record.worker_id)} @ ${getSiteName(record.site_id)}`,
            worker_id: record.worker_id,
            site_id: record.site_id,
            type: 'attendance',
            displayType: 'Work',
            amount: amount,
            mode: record.work_type || 'Work',
            note: record.work_title || record.note || '-',
            sortKey: `${record.date}_${record.worker_id}_attendance`
        };
    });
    
    // Convert payments to table format - Split into Transfer and Received
    const paymentRows = filteredPayments.map(record => {
        // Debug: log payment structure
        if (!record.worker_id) {
            console.warn('Payment record with missing worker_id:', record);
        }
        
        // Safely parse amount - try multiple field names
        let amount = 0;
        try {
            let rawAmount = record.amount || record.payment_amount || record.amount_paid || record.received_amount;
            
            if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
                const strAmount = String(rawAmount).trim();
                const parsed = parseFloat(strAmount);
                
                if (!isNaN(parsed) && isFinite(parsed)) {
                    amount = parsed;
                    if (amount === 0 && strAmount !== '0' && strAmount !== '') {
                        console.warn('Amount parsed as 0 but raw value was:', rawAmount, 'in record:', record);
                    }
                } else {
                    console.warn('Failed to parse amount:', rawAmount, 'from record:', record);
                }
            } else {
                console.warn('Amount field is empty in record:', record);
            }
        } catch (e) {
            console.warn('Error parsing amount:', record.amount, e);
        }
        
        // Get worker name - use from_name if available (for received payments), otherwise lookup by ID
        let workerName = record.from_name;
        if (!workerName) {
            workerName = getWorkerName(record.worker_id);
        }
        
        let siteName = record.to_name;
        if (!siteName) {
            siteName = getSiteName(record.site_id);
        }
        
        // Debug payment row
        if (record.type === 'received_worker' || record.type === 'received') {
            console.log('Creating payment row for received payment:', {
                from_name: record.from_name,
                workerName: workerName,
                to_name: record.to_name,
                siteName: siteName,
                type: record.type
            });
        }
        
        // For received payments, only show site if it's valid (not "Unknown Site")
        let displayName;
        if ((record.type === 'received' || record.type === 'received_worker') && 
            (siteName === 'Unknown Site' || !record.to_name)) {
            // For received payments without valid site, just show worker name
            displayName = workerName;
        } else {
            // For given payments or when site is available, show both
            displayName = `${workerName} @ ${siteName}`;
        }
        
        return {
            date: record.date,
            name: displayName,
            worker_id: record.worker_id,
            site_id: record.site_id,
            type: 'payment',
            displayType: record.type === 'given' ? '📤 Transfer' : (record.type === 'received' ? '📥 Received (Site)' : '📥 Received (Worker)'),
            paymentType: record.type, // 'given' (Transfer), 'received' (from site), 'received_worker'
            amount: amount,
            mode: record.payment_mode || record.mode || 'Cash',
            note: record.note || record.remarks || '-',
            sortKey: `${record.date}_${record.worker_id}_payment`
        };
    });
    
    // Combine and sort by date (newest first)
    const combined = [...attendanceRows, ...paymentRows];
    combined.sort((a, b) => {
        // Primary sort: by date (newest first)
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        
        // Secondary sort: by sortKey for consistency
        return a.sortKey.localeCompare(b.sortKey);
    });
    
    console.log(`Combined table data: ${combined.length} records (sorted latest first)`);
    console.log('Sample payment row:', paymentRows[0]);
    return combined;
}

/**
 * Update the report table with pagination support
 * @param {Array} tableData - Combined table data
 */
function updateReportTable(tableData) {
    // Apply search filter
    const searchFilteredData = filterTableDataBySearch(tableData, currentSearchTerm);
    filteredData = searchFilteredData;
    totalRecords = searchFilteredData.length;
    
    // Update records info in header
    const recordsInfo = document.getElementById('recordsInfo');
    if (recordsInfo) {
        if (currentSearchTerm) {
            recordsInfo.textContent = `Found ${totalRecords} records matching "${currentSearchTerm}"`;
        } else {
            recordsInfo.textContent = `Showing ${totalRecords} records`;
        }
    }
    
    // Get paginated data
    const paginatedResult = getPaginatedData(searchFilteredData, currentPage, recordsPerPage);
    const paginatedData = paginatedResult.data;
    const pagination = paginatedResult.pagination;
    
    const tbody = document.getElementById('reportTableBody');
    
    if (paginatedData.length === 0) {
        document.getElementById('reportTable').classList.add('report-table-hidden');
        document.getElementById('reportNoData').classList.remove('report-no-data-hidden');
        document.getElementById('paginationContainer').classList.add('pagination-container-hidden');
        return;
    }
    
    // Generate table rows with row numbers
    tbody.innerHTML = paginatedData.map((row, index) => {
        const globalRowNumber = pagination.startIndex + index;
        // Normalize date display to YYYY-MM-DD
        const displayDate = formatDisplayDate(row.date);
        
        // Determine type badge color and text
        let typeHtml = '';
        if (row.type === 'attendance') {
            typeHtml = '<span class="type-badge type-attendance">Work</span>';
        } else if (row.paymentType === 'given') {
            typeHtml = '<span class="type-badge" style="background: #ef4444; color: white;">📤 Transfer</span>';
        } else if (row.paymentType === 'received') {
            typeHtml = '<span class="type-badge" style="background: #10b981; color: white;">📥 Received</span>';
        } else if (row.paymentType === 'received_worker') {
            typeHtml = '<span class="type-badge" style="background: #3b82f6; color: white;">📥 Recv. Worker</span>';
        }
        
        return `
            <tr>
                <td style="font-weight: bold; color: var(--gray-600);">${globalRowNumber}</td>
                <td><strong>${displayDate}</strong></td>
                <td style="font-weight: 500; color: var(--gray-800);">${row.name}</td>
                <td style="font-weight: 700; color: #111; font-size: 0.95rem;">
                    ${formatCurrency(row.amount)}
                </td>
                <td>${typeHtml}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('reportNoData').classList.add('report-no-data-hidden');
    document.getElementById('reportTable').classList.remove('report-table-hidden');
    
    // Update pagination controls
    updatePaginationControls(pagination);
}

/**
 * Update the entire report based on current filter
 */
function updateReport() {
    console.log(`Updating report with filter: ${currentFilter}`);
    
    // Get filtered data
    const filteredAttendance = filterAttendanceByDate(currentFilter);
    const filteredPayments = filterPaymentsByDate(currentFilter);
    
    console.log(`Filtered attendance: ${filteredAttendance.length} records`);
    console.log(`Filtered payments: ${filteredPayments.length} records`);
    // No auto-fallback: keep user's selected filter even if empty
    
    // Calculate totals
    const totals = calculateFilteredTotals(filteredAttendance, filteredPayments);
    
    // Update UI
    updateTotalsDisplay(totals);
    
    // Create and update table
    const tableData = createCombinedTableData(filteredAttendance, filteredPayments);
    const categoryFiltered = applyCategoryFilter(tableData);
    const paymentTypeFiltered = applyPaymentTypeFilter(categoryFiltered);
    updateReportTable(paymentTypeFiltered);
    
    // Update table title
    const dateRange = getDateRange(currentFilter);
    document.getElementById('tableTitle').textContent = `All Records - ${dateRange.label}`;
    
    // Hide loading
    document.getElementById('reportLoading').style.display = 'none';
    
    // Hide loading indicator
    const reportLoading = document.getElementById('reportLoading');
    if (reportLoading) {
        reportLoading.style.display = 'none';
    }
}

// ================================
// CATEGORY FILTERS
// ================================

function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('#categoryFilters .filter-btn');
    const selectWrapper = document.getElementById('entitySelectWrapper');
    const entitySelect = document.getElementById('entitySelect');

    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-category');
            currentEntityId = null;
            console.log('Category filter changed to:', currentCategory);
            // Hide dropdown selector - we show all data for the category
            selectWrapper.style.display = 'none';
            // Reset page and update
            currentPage = 1;
            updateReport();
        });
    });

    if (entitySelect) {
        entitySelect.addEventListener('change', () => {
            currentEntityId = entitySelect.value || null;
            currentPage = 1;
            updateReport();
        });
    }
}

/**
 * Setup payment type filter buttons
 */
function setupPaymentTypeFilters() {
    const paymentTypeButtons = document.querySelectorAll('#paymentTypeFilters .filter-btn');
    console.log(`Found ${paymentTypeButtons.length} payment type filter buttons`);

    paymentTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            paymentTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPaymentType = btn.getAttribute('data-paymenttype');
            console.log(`Payment type filter changed to: ${currentPaymentType}`);
            currentPage = 1;
            updateReport();
        });
    });
}

function populateWorkerDropdown(selectEl) {
    const options = workersData.map(w => `<option value="${w.worker_id}">${w.name}</option>`);
    selectEl.innerHTML = `<option value="">Select Worker</option>` + options.join('');
}

function populateSiteDropdown(selectEl) {
    const options = sitesData.map(s => `<option value="${s.site_id}">${s.name || s.site_name || s.site}</option>`);
    selectEl.innerHTML = `<option value="">Select Site</option>` + options.join('');
}

function applyCategoryFilter(tableData) {
    console.log('Applying category filter:', currentCategory, 'to', tableData.length, 'records');
    
    // Worker filter: Show attendance + given payments (payments TO workers)
    if (currentCategory === 'worker') {
        const filtered = tableData.filter(r => {
            // Show attendance records (work done by workers)
            if (r.type === 'attendance') return true;
            // Show 'given' payments (transfers TO workers)
            if (r.type === 'payment' && r.paymentType === 'given') return true;
            // Show 'received_worker' (payments FROM workers to admin)
            if (r.type === 'payment' && r.paymentType === 'received_worker') return true;
            return false;
        });
        console.log('Worker filter result:', filtered.length, 'records');
        return filtered;
    }
    
    // Site filter: Show ONLY received payments (payments FROM sites)
    if (currentCategory === 'site') {
        const filtered = tableData.filter(r => {
            // Show only 'received' payments (payments FROM sites to admin)
            return r.type === 'payment' && r.paymentType === 'received';
        });
        console.log('Site filter result:', filtered.length, 'records (received from sites)');
        return filtered;
    }
    
    // All: Show everything
    console.log('Showing all records:', tableData.length);
    return tableData;
}

/**
 * Apply payment type filter
 * @param {Array} tableData - Combined table data
 * @returns {Array} Filtered data by payment type
 */
function applyPaymentTypeFilter(tableData) {
    console.log(`Applying payment type filter: ${currentPaymentType}`);
    console.log(`Table data before filter: ${tableData.length} records`);
    
    if (currentPaymentType === 'all') {
        // Show all payment types (given + received), but exclude work/attendance
        const filtered = tableData.filter(r => r.type === 'payment');
        console.log(`Showing all payment types: ${filtered.length} records (excluding work/attendance)`);
        return filtered;
    }
    if (currentPaymentType === 'given') {
        // Show only 'given' transfer payments (money transferred TO workers), NOT work/attendance
        const filtered = tableData.filter(r => 
            r.type === 'payment' && r.paymentType === 'given'
        );
        console.log(`Showing 'given' transfers only: ${filtered.length} records (excluding work/attendance)`);
        return filtered;
    }
    if (currentPaymentType === 'received') {
        // Show only 'received' payments (money received FROM sites or workers)
        const filtered = tableData.filter(r => 
            r.type === 'payment' && (r.paymentType === 'received' || r.paymentType === 'received_worker')
        );
        console.log(`Showing 'received' payments only: ${filtered.length} records`);
        return filtered;
    }
    console.log(`No filter matched, returning all: ${tableData.length} records`);
    return tableData;
}

// ================================
// EVENT HANDLERS
// ================================

/**
 * Handle filter button clicks
 */
// Time filter buttons are already handled; no duplicate setup here.

// ================================
// MAIN INITIALIZATION
// ================================

/**
 * Initialize reports page
 */
async function initializeReports() {
    console.log('Initializing Reports page...');
    
    // Setup filter buttons
    setupFilterButtons();
    
    // Setup search functionality
    setupSearchFunctionality();
    
    // Setup pagination controls
    setupPaginationControls();

    // Fetch data first so dropdowns have content
    
    // Fetch all data
    const dataLoaded = await fetchAllData();
    
    if (!dataLoaded) {
        document.getElementById('reportLoading').innerHTML = `
            <div style="color: #e74c3c;">
                ⚠️ Failed to load data. Please check your connection.
            </div>
        `;
        return;
    }
    
    // Setup category filters (after data fetch to populate selects)
    setupCategoryFilters();
    
    // Setup payment type filters
    setupPaymentTypeFilters();

    // Initial report with 'today' filter
    updateReport();
    
    console.log('Reports page initialized successfully!');
    console.log('Professional report with search and pagination is ready!');
    console.log(`Total attendance records: ${attendanceData.length}`);
    console.log(`Total payment records: ${paymentsData.length}`);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeReports);

// ================================
// GLOBAL FUNCTION EXPORTS
// ================================

// Export functions for use by other modules (like PDF export)
window.getDateRange = getDateRange;
window.filterAttendanceByDate = filterAttendanceByDate;
window.filterPaymentsByDate = filterPaymentsByDate;
window.calculateFilteredTotals = calculateFilteredTotals;
window.createCombinedTableData = createCombinedTableData;
window.filterTableDataBySearch = filterTableDataBySearch;