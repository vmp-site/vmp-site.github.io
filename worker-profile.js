// Worker Profile Page Logic
const urlParams = new URLSearchParams(window.location.search);
const workerId = urlParams.get('id');
const workerName = urlParams.get('name');

let workersData = [];
let attendanceData = [];
let paymentsData = [];
let receivedData = [];
let sitesData = [];

let filteredAttendance = [];
let filteredPayments = [];
let filteredReceived = [];

// Pagination state for attendance
let attendancePage = 1;
const attendancePageSize = 10;

// Pagination state for payments
let paymentPage = 1;
const paymentPageSize = 10;

// Pagination state for received payments
let receivedPage = 1;
const receivedPageSize = 10;

let currentDateFilter = 'all';
let currentSiteFilter = 'all';
let attendanceSortDesc = true;
let paymentSortDesc = true;
let receivedSortDesc = true;

// Check if worker ID is provided
if (!workerId) {
    alert('Worker ID not provided!');
    window.location.href = 'workers.html';
}

// Fetch all data
async function loadAllData() {
    try {
        const [workersRes, attendanceRes, paymentsRes, receivedRes, sitesRes] = await Promise.all([
            fetch(`${BASE_URL}?action=getWorkers`),
            fetch(`${BASE_URL}?action=getAttendance`),
            fetch(`${BASE_URL}?action=getPayments`),
            fetch(`${BASE_URL}?action=getReceived`),
            fetch(`${BASE_URL}?action=getSites`)
        ]);

        if (!workersRes.ok) throw new Error('Failed to fetch workers');
        if (!attendanceRes.ok) throw new Error('Failed to fetch attendance');
        if (!paymentsRes.ok) throw new Error('Failed to fetch payments');
        if (!receivedRes.ok) throw new Error('Failed to fetch received');
        if (!sitesRes.ok) throw new Error('Failed to fetch sites');

        workersData = await workersRes.json();
        attendanceData = await attendanceRes.json();
        paymentsData = await paymentsRes.json();
        receivedData = await receivedRes.json();
        sitesData = await sitesRes.json();

        // Validate data is arrays
        if (!Array.isArray(workersData)) workersData = [];
        if (!Array.isArray(attendanceData)) attendanceData = [];
        if (!Array.isArray(paymentsData)) paymentsData = [];
        if (!Array.isArray(receivedData)) receivedData = [];
        if (!Array.isArray(sitesData)) sitesData = [];

        console.log('✅ Workers loaded:', workersData.length);
        console.log('✅ Attendance loaded:', attendanceData.length);
        console.log('✅ Payments loaded:', paymentsData.length);
        console.log('✅ Received (from workers) loaded:', receivedData.length);
        console.log('✅ Sites loaded:', sitesData.length);

        displayWorkerInfo();
        populateSiteFilter();
        filterAndRenderData();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading worker profile data: ' + error.message + '\n\nPlease check your BASE_URL in config.js');
    }
}

// Display worker information
function displayWorkerInfo() {
    const worker = workersData.find(w => w.worker_id == workerId);
    if (!worker) {
        alert('Worker not found!');
        window.location.href = 'workers.html';
        return;
    }

    document.getElementById('workerName').textContent = worker.name || '-';
    document.getElementById('workerPhone').textContent = worker.phone || '-';
    
    const positionBadge = worker.position === 'Karigar' ? 'badge-karigar' : 'badge-majur';
    document.getElementById('workerPosition').innerHTML = 
        `<span class="badge ${positionBadge}">${worker.position || '-'}</span>`;
    
    const typeBadge = worker.worker_type === 'New' ? 'badge-new' : 'badge-old';
    document.getElementById('workerType').innerHTML = 
        `<span class="badge ${typeBadge}">${worker.worker_type || '-'}</span>`;

    // Display assigned sites
    let assignedSitesDisplay = 'None';
    if (worker.assigned_sites && worker.assigned_sites !== 'None' && worker.assigned_sites !== '') {
        const assignedSitesStr = String(worker.assigned_sites);
        const siteIds = assignedSitesStr.split(',');
        const siteNames = siteIds.map(id => {
            const trimmedId = id.trim();
            const site = sitesData.find(s => String(s.site_id) === String(trimmedId));
            return site ? site.site_name : trimmedId;
        }).filter(name => name && name !== '');
        assignedSitesDisplay = siteNames.length > 0 ? siteNames.join(', ') : 'None';
    }
    document.getElementById('workerSites').textContent = assignedSitesDisplay;

    // Balance will be computed after filters are applied in filterAndRenderData()
}

// Populate site filter dropdown
function populateSiteFilter() {
    const siteFilter = document.getElementById('siteFilter');
    siteFilter.innerHTML = '<option value="all">All Sites</option>';
    
    sitesData.forEach(site => {
        const option = document.createElement('option');
        option.value = site.site_id;
        option.textContent = site.site_name;
        siteFilter.appendChild(option);
    });
}

// Set date filter
function setDateFilter(filter) {
    currentDateFilter = filter;
    
    // Update button states
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    // Show/hide custom date inputs
    const customInputs = document.getElementById('customDateInputs');
    if (filter === 'custom') {
        customInputs.classList.add('show');
    } else {
        customInputs.classList.remove('show');
        filterAndRenderData();
    }
}

// Apply custom date filter
function applyCustomDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        filterAndRenderData();
    }
}

// Apply site filter
function applySiteFilter() {
    currentSiteFilter = document.getElementById('siteFilter').value;
    filterAndRenderData();
}

// Filter data based on current filters
function filterAndRenderData() {
    // Filter attendance for this worker
    let baseAttendance = attendanceData.filter(record => {
        if (record.worker_id != workerId) return false;
        if (!passesDateFilter(record.date)) return false;
        if (!passesSiteFilter(record.site_id)) return false;
        return true;
    });

    // De-duplicate by (date-only + site_id). Keep latest record for the day/site
    const dedupMap = new Map();
    baseAttendance.forEach(rec => {
        // Normalize date to YYYY-MM-DD
        let d = rec.date;
        if (typeof d === 'string' && d.includes('T')) d = d.split('T')[0];
        const key = `${d}|${rec.site_id}`;
        // Overwrite to keep the last occurrence (latest saved)
        dedupMap.set(key, { ...rec, date: d });
    });
    filteredAttendance = Array.from(dedupMap.values());

    // Filter payments with debugging
    console.log('=== PAYMENT FILTERING DEBUG ===');
    console.log('Current workerId (numeric):', workerId, '(type:', typeof workerId + ')');
    console.log('Current workerName (text):', workerName);
    console.log('Total payments loaded:', paymentsData.length);
    console.log('Date filter:', currentDateFilter);
    console.log('Site filter:', currentSiteFilter);
    
    // Show sample of raw payment data structure
    if (paymentsData.length > 0) {
        console.log('Sample raw payment records:');
        paymentsData.slice(0, 5).forEach((r, i) => {
            console.log(`  Payment ${i}:`, { 
                worker_id: r.worker_id, 
                worker_name: r.worker_name, 
                type: r.type, 
                date: r.date, 
                site_id: r.site_id,
                amount: r.amount 
            });
        });
    }
    
    filteredPayments = paymentsData.filter((record, idx) => {
        // The payment data might have worker_id as either:
        // 1. Numeric ID (e.g., 123) - compare with workerId
        // 2. Worker name (e.g., "Demo bhai") - compare with workerName
        // So we need to check BOTH
        const isNumericId = !isNaN(record.worker_id);
        const workerMatch = isNumericId 
            ? String(record.worker_id) === String(workerId)  // Compare numeric IDs
            : String(record.worker_id) === String(workerName); // Compare names
        
        const dateMatch = passesDateFilter(record.date);
        const siteMatch = passesSiteFilter(record.site_id);
        
        // Filter: Only show payments GIVEN to worker (type='given')
        // But also show payments with NO type field (legacy data or from sheet)
        // EXCLUDE 'received' and 'received_worker' type payments
        const typeMatch = record.type === 'given' || record.type === undefined || record.type === '' || !record.type;
        
        // Log first 5 records for debugging
        if (idx < 5) {
            console.log(`Payment ${idx}:`, {
                worker_id_value: record.worker_id,
                is_numeric_id: isNumericId,
                worker_name: record.worker_name,
                type: record.type || '(empty/undefined)',
                date: record.date,
                site_id: record.site_id,
                workerMatch,
                dateMatch,
                siteMatch,
                typeMatch,
                PASSES: workerMatch && dateMatch && siteMatch && typeMatch
            });
        }
        
        return workerMatch && dateMatch && siteMatch && typeMatch;
    });
    
    console.log('✅ Filtered payments count:', filteredPayments.length);
    if (filteredPayments.length > 0) {
        console.log('First filtered payment:', filteredPayments[0]);
        console.log('First filtered payment:', filteredPayments[0]);
        console.log('Payment details - Amount:', filteredPayments[0].amount, 'Date:', filteredPayments[0].date);
    }
    
    // Filter received payments (type = 'received_worker')
    console.log('=== RECEIVED DATA FILTERING ===');
    console.log('Total received records loaded:', receivedData.length);
    console.log('Worker ID to match (numeric):', workerId);
    console.log('Worker Name to match:', workerName);
    
    // Show first few received records for debugging
    if (receivedData.length > 0) {
        console.log('Sample received records:');
        receivedData.slice(0, 3).forEach((r, i) => {
            console.log(`  Record ${i}:`, { 
                worker_id: r.worker_id, 
                worker_name: r.worker_name, 
                type: r.type, 
                date: r.date, 
                amount: r.amount 
            });
        });
    }
    
    filteredReceived = receivedData.filter((record) => {
        // The received data might have worker_id as either:
        // 1. Numeric ID (e.g., 123) - compare with workerId
        // 2. Worker name (e.g., "Demo bhai") - compare with workerName
        const isNumericId = !isNaN(record.worker_id);
        const workerMatch = isNumericId 
            ? String(record.worker_id) === String(workerId)
            : String(record.worker_id) === String(workerName);
        
        const dateMatch = passesDateFilter(record.date);
        const siteMatch = passesSiteFilter(record.site_id);
        const typeMatch = record.from_type === 'worker'; // Only show received from worker payments
        
        return workerMatch && dateMatch && siteMatch && typeMatch;
    });
    
    console.log('✅ Filtered received payments count:', filteredReceived.length);
    if (filteredReceived.length > 0) {
        console.log('First filtered received record:', filteredReceived[0]);
    }

    renderAttendanceTable();
    renderPaymentsTable();
    renderReceivedTable();

    // Update overall balance based on current filtered data
    updateWorkerBalance();
}
// Compute and update the Total Balance at top based on filtered data
function updateWorkerBalance() {
    try {
        const totalEarned = (filteredAttendance || []).reduce((sum, r) => {
            const amt = parseFloat(r.work_amount || r.rate || r.daily_rate || 0) || 0;
            return sum + amt;
        }, 0);
        const totalPaid = (filteredPayments || []).reduce((sum, r) => {
            const amt = parseFloat(r.amount) || 0;
            return sum + amt;
        }, 0);
        const totalReceivedFromWorker = (filteredReceived || []).reduce((sum, r) => {
            const amt = parseFloat(r.amount) || 0;
            return sum + amt;
        }, 0);

        // Balance = Earned (attendance) - Paid to worker (given) - Received from worker
        const balance = totalEarned - totalPaid - totalReceivedFromWorker;
        console.log('📊 ===== BALANCE CALCULATION =====');
        console.log('Worker ID:', workerId, 'Name:', workerName);
        console.log('💼 Total Earned (from attendance):', '₹' + totalEarned.toFixed(2), `(${(filteredAttendance || []).length} records)`);
        console.log('💸 Total Paid to Worker (given):', '₹' + totalPaid.toFixed(2), `(${(filteredPayments || []).length} records)`);
        console.log('🔄 Total Received from Worker:', '₹' + totalReceivedFromWorker.toFixed(2), `(${(filteredReceived || []).length} records)`);
        console.log('📈 Final Balance:', '₹' + balance.toFixed(2));
        console.log('Formula: Earned - Paid - Received = ' + totalEarned.toFixed(2) + ' - ' + totalPaid.toFixed(2) + ' - ' + totalReceivedFromWorker.toFixed(2) + ' = ' + balance.toFixed(2));
        console.log('============================');

        const balanceElement = document.getElementById('workerBalance');
        if (!balanceElement) return;
        let balanceClass = 'badge-balance-zero';
        if (balance > 0) balanceClass = 'badge-balance-positive';
        else if (balance < 0) balanceClass = 'badge-balance-negative';

        balanceElement.innerHTML = `<span class="badge ${balanceClass}">₹${(Number(balance) || 0).toFixed(2)}</span>`;
    } catch (e) {
        console.error('❌ Failed to update worker balance:', e);
    }
}

// Check if record passes date filter
function passesDateFilter(dateString) {
    if (currentDateFilter === 'all') return true;

    const recordDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (currentDateFilter === 'today') {
        const recordDateOnly = new Date(recordDate);
        recordDateOnly.setHours(0, 0, 0, 0);
        return recordDateOnly.getTime() === today.getTime();
    }

    if (currentDateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const recordDateOnly = new Date(recordDate);
        recordDateOnly.setHours(0, 0, 0, 0);
        return recordDateOnly.getTime() === yesterday.getTime();
    }

    if (currentDateFilter === 'custom') {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        endDate.setHours(23, 59, 59, 999);
        return recordDate >= startDate && recordDate <= endDate;
    }

    return true;
}

// Check if record passes site filter
function passesSiteFilter(siteId) {
    if (currentSiteFilter === 'all') return true;
    return siteId == currentSiteFilter;
}

// Get site name from ID
function getSiteName(siteId) {
    if (!siteId || siteId === 'none' || siteId === 'None') return 'None';
    // Try exact match first
    let site = sitesData.find(s => s.site_id === siteId);
    // Try with type conversion
    if (!site) site = sitesData.find(s => String(s.site_id) === String(siteId));
    // Try with number conversion
    if (!site && !isNaN(siteId)) {
        const numId = Number(siteId);
        site = sitesData.find(s => s.site_id === numId || Number(s.site_id) === numId);
    }
    return site ? site.site_name : 'None';
}

// Toggle attendance sort
function toggleAttendanceSort() {
    attendanceSortDesc = !attendanceSortDesc;
    document.getElementById('attendanceSortText').textContent = 
        attendanceSortDesc ? 'Latest First ↓' : 'Oldest First ↑';
    renderAttendanceTable();
}

// Toggle payment sort
function togglePaymentSort() {
    paymentSortDesc = !paymentSortDesc;
    document.getElementById('paymentSortText').textContent = 
        paymentSortDesc ? 'Latest First ↓' : 'Oldest First ↑';
    renderPaymentsTable();
}

// Render attendance table
function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceBody');
    const pageInfoEl = document.getElementById('attendancePageInfo');
    const prevBtn = document.getElementById('attendancePrevBtn');
    const nextBtn = document.getElementById('attendanceNextBtn');

    if (filteredAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No attendance records found</td></tr>';
        if (pageInfoEl) pageInfoEl.textContent = 'No records';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    // Sort by date
    const sorted = [...filteredAttendance].sort((a, b) => {
        const dateA = new Date(typeof a.date === 'string' && a.date.includes('T') ? a.date : `${a.date}T00:00:00Z`);
        const dateB = new Date(typeof b.date === 'string' && b.date.includes('T') ? b.date : `${b.date}T00:00:00Z`);
        return attendanceSortDesc ? dateB - dateA : dateA - dateB;
    });

    // Pagination calculations
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / attendancePageSize));
    if (attendancePage > totalPages) attendancePage = totalPages;
    const startIdx = (attendancePage - 1) * attendancePageSize;
    const endIdx = Math.min(startIdx + attendancePageSize, total);
    const pageItems = sorted.slice(startIdx, endIdx);

    if (pageInfoEl) pageInfoEl.textContent = `Showing ${startIdx + 1}-${endIdx} of ${total} • Page ${attendancePage}/${totalPages}`;
    if (prevBtn) prevBtn.disabled = attendancePage <= 1;
    if (nextBtn) nextBtn.disabled = attendancePage >= totalPages;

    let totalAmount = 0;
    tbody.innerHTML = pageItems.map((record, index) => {
        const amount = parseFloat(record.work_amount) || 0;
        totalAmount += amount;
        
        return `
            <tr>
                <td>${startIdx + index + 1}</td>
                <td>${formatDate(record.date)}</td>
                <td>${getSiteName(record.site_id)}</td>
                <td>${record.work_type || '-'}</td>
                <td>${record.work_title || '-'}</td>
                <td>₹${amount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    // Add total row
    tbody.innerHTML += `
        <tr class="total-row">
            <td colspan="5" style="text-align: right; font-weight: 700;">Total Earned:</td>
            <td style="color: #000; font-weight: 700;">₹${totalAmount.toFixed(2)}</td>
        </tr>
    `;
}

// Attendance pagination controls
function goAttendancePrevPage() {
    if (attendancePage > 1) {
        attendancePage--;
        renderAttendanceTable();
    }
}
function goAttendanceNextPage() {
    attendancePage++;
    renderAttendanceTable();
}

// Render payments table
function renderPaymentsTable() {
    const tbody = document.getElementById('paymentBody');
    const pageInfoEl = document.getElementById('paymentPageInfo');
    const prevBtn = document.getElementById('paymentPrevBtn');
    const nextBtn = document.getElementById('paymentNextBtn');
    
    console.log('💳 Rendering payments table - Records:', filteredPayments.length);
    
    if (!tbody) {
        console.error('❌ paymentBody element not found');
        return;
    }
    
    if (filteredPayments.length === 0) {
        console.log('⚠️ No filtered payment records to display');
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No payment records found</td></tr>';
        if (pageInfoEl) pageInfoEl.textContent = 'No records';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    // Sort by date
    const sorted = [...filteredPayments].sort((a, b) => {
        const dateA = new Date(typeof a.date === 'string' && a.date.includes('T') ? a.date : `${a.date}T00:00:00Z`);
        const dateB = new Date(typeof b.date === 'string' && b.date.includes('T') ? b.date : `${b.date}T00:00:00Z`);
        return paymentSortDesc ? dateB - dateA : dateA - dateB;
    });

    // Pagination calculations
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / paymentPageSize));
    if (paymentPage > totalPages) paymentPage = totalPages;
    const startIdx = (paymentPage - 1) * paymentPageSize;
    const endIdx = Math.min(startIdx + paymentPageSize, total);
    const pageItems = sorted.slice(startIdx, endIdx);

    if (pageInfoEl) pageInfoEl.textContent = `Showing ${startIdx + 1}-${endIdx} of ${total} • Page ${paymentPage}/${totalPages}`;
    if (prevBtn) prevBtn.disabled = paymentPage <= 1;
    if (nextBtn) nextBtn.disabled = paymentPage >= totalPages;

    let totalAmount = 0;
    tbody.innerHTML = pageItems.map((record, index) => {
        const amount = parseFloat(record.amount) || 0;
        totalAmount += amount;
        
        // Always lookup site name by site_id to get proper name
        const siteName = getSiteName(record.site_id);
        
        return `
            <tr>
                <td>${startIdx + index + 1}</td>
                <td>${formatDate(record.date)}</td>
                <td>${siteName}</td>
                <td>₹${amount.toFixed(2)}</td>
                <td>${record.type || record.payment_mode || '-'}</td>
                <td>${record.note || '-'}</td>
            </tr>
        `;
    }).join('');

    // Add total row
    tbody.innerHTML += `
        <tr style="background-color: #f8f9fa; font-weight: bold; border-top: 2px solid #dee2e6;">
            <td colspan="3" style="text-align: right;">Total Paid:</td>
            <td style="color: #dc3545;">₹${totalAmount.toFixed(2)}</td>
            <td colspan="2"></td>
        </tr>
    `;
}

// Payment pagination controls
function goPaymentPrevPage() {
    if (paymentPage > 1) {
        paymentPage--;
        renderPaymentsTable();
    }
}
function goPaymentNextPage() {
    paymentPage++;
    renderPaymentsTable();
}

// Render received payments table
function renderReceivedTable() {
    const tbody = document.getElementById('receivedBody');
    const pageInfoEl = document.getElementById('receivedPageInfo');
    const prevBtn = document.getElementById('receivedPrevBtn');
    const nextBtn = document.getElementById('receivedNextBtn');
    
    console.log('🔄 Rendering received table - Records:', filteredReceived.length);
    
    if (!tbody) {
        console.error('❌ receivedBody element not found');
        return;
    }
    
    if (filteredReceived.length === 0) {
        console.log('⚠️ No filtered received records to display');
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No received payment records found</td></tr>';
        if (pageInfoEl) pageInfoEl.textContent = 'No records';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    // Sort by date
    const sorted = [...filteredReceived].sort((a, b) => {
        const dateA = new Date(typeof a.date === 'string' && a.date.includes('T') ? a.date : `${a.date}T00:00:00Z`);
        const dateB = new Date(typeof b.date === 'string' && b.date.includes('T') ? b.date : `${b.date}T00:00:00Z`);
        return receivedSortDesc ? dateB - dateA : dateA - dateB;
    });

    // Pagination calculations
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / receivedPageSize));
    if (receivedPage > totalPages) receivedPage = totalPages;
    const startIdx = (receivedPage - 1) * receivedPageSize;
    const endIdx = Math.min(startIdx + receivedPageSize, total);
    const pageItems = sorted.slice(startIdx, endIdx);

    if (pageInfoEl) pageInfoEl.textContent = `Showing ${startIdx + 1}-${endIdx} of ${total} • Page ${receivedPage}/${totalPages}`;
    if (prevBtn) prevBtn.disabled = receivedPage <= 1;
    if (nextBtn) nextBtn.disabled = receivedPage >= totalPages;

    let totalAmount = 0;
    tbody.innerHTML = pageItems.map((record, index) => {
        const amount = parseFloat(record.amount) || 0;
        totalAmount += amount;
        
        const siteName = getSiteName(record.site_id);
        
        return `
            <tr>
                <td>${startIdx + index + 1}</td>
                <td>${formatDate(record.date)}</td>
                <td>${siteName}</td>
                <td>₹${amount.toFixed(2)}</td>
                <td>${record.payment_mode || record.mode || '-'}</td>
                <td>${record.note || '-'}</td>
            </tr>
        `;
    }).join('');

    // Add total row
    tbody.innerHTML += `
        <tr style="background-color: #f0fdf4; font-weight: bold; border-top: 2px solid #bbf7d0;">
            <td colspan="3" style="text-align: right;">Total Received:</td>
            <td style="color: #15803d;">₹${totalAmount.toFixed(2)}</td>
            <td colspan="2"></td>
        </tr>
    `;
}

// Received pagination controls
function goReceivedPrevPage() {
    if (receivedPage > 1) {
        receivedPage--;
        renderReceivedTable();
    }
}
function goReceivedNextPage() {
    receivedPage++;
    renderReceivedTable();
}

// Toggle received sort order
function toggleReceivedSort() {
    receivedSortDesc = !receivedSortDesc;
    document.getElementById('receivedSortText').textContent = receivedSortDesc ? 'Latest First ↓' : 'Oldest First ↑';
    renderReceivedTable();
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// PDF currency formatter (top-level)
function formatPdfCurrency(amount) {
    const val = (Number(amount) || 0).toFixed(2);
    return `₹${val}`;
}

function escapePdfHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function exportAttendanceHtmlPdf(workerName, data) {
    if (!window.html2pdf) return false;

    const total = data.reduce((sum, r) => sum + (parseFloat(r.work_amount || r.rate || r.daily_rate) || 0), 0);
    const filename = `${workerName}_Attendance_${new Date().toISOString().split('T')[0]}.pdf`;

    const rowsHtml = data.map((record, index) => {
        const amount = parseFloat(record.work_amount || record.rate || record.daily_rate || 0) || 0;
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapePdfHtml(formatDate(record.date))}</td>
                <td>${escapePdfHtml(getSiteName(record.site_id))}</td>
                <td>${escapePdfHtml(record.work_type || '-')}</td>
                <td>${escapePdfHtml(record.work_title || '-')}</td>
                <td style="text-align:right;">₹${amount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '820px';
    container.style.background = '#ffffff';
    container.style.opacity = '0.01';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    container.innerHTML = `
        <div style="font-family: Arial, Helvetica, sans-serif; color:#111827; padding: 8px;">
            <div style="font-size:20px; font-weight:700; margin-bottom:6px;">Attendance History - ${escapePdfHtml(workerName)}</div>
            <div style="font-size:12px; color:#374151; margin-bottom:2px;">Generated: ${escapePdfHtml(new Date().toLocaleDateString('en-IN'))}</div>
            <div style="font-size:12px; color:#374151; margin-bottom:12px;">Total Records: ${data.length}</div>

            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background:#f3f4f6;">
                        <th style="border:1px solid #d1d5db; padding:8px; text-align:left;">S.No</th>
                        <th style="border:1px solid #d1d5db; padding:8px; text-align:left;">Date</th>
                        <th style="border:1px solid #d1d5db; padding:8px; text-align:left;">Site Name</th>
                        <th style="border:1px solid #d1d5db; padding:8px; text-align:left;">Work Type</th>
                        <th style="border:1px solid #d1d5db; padding:8px; text-align:left;">Work Title</th>
                        <th style="border:1px solid #d1d5db; padding:8px; text-align:right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div style="margin-top:10px; font-size:14px; font-weight:700;">Total: ₹${total.toFixed(2)}</div>
        </div>
    `;

    document.body.appendChild(container);
    try {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await html2pdf().set({
            margin: 8,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(container).save();
        return true;
    } catch (error) {
        console.error('Attendance html2pdf export failed:', error);
        return false;
    } finally {
        if (container.parentNode) container.parentNode.removeChild(container);
    }
}

// Open edit modal
function openEditModal() {
    const worker = workersData.find(w => w.worker_id == workerId);
    if (!worker) return;

    document.getElementById('editName').value = worker.name || '';
    document.getElementById('editPhone').value = worker.phone || '';
    document.getElementById('editPosition').value = worker.position || '';
    document.getElementById('editWorkerType').value = worker.worker_type || '';

    // Populate sites dropdown
    const sitesSelect = document.getElementById('editAssignedSites');
    sitesSelect.innerHTML = '<option value="None">None (Optional)</option>';
    sitesData.forEach(site => {
        if (site.status === undefined || site.status === 'active' || site.status === true) {
            const option = document.createElement('option');
            option.value = site.site_id;
            option.textContent = site.site_name;
            sitesSelect.appendChild(option);
        }
    });

    // Select current assigned sites
    if (worker.assigned_sites && worker.assigned_sites !== 'None' && worker.assigned_sites !== '') {
        const assignedSitesStr = String(worker.assigned_sites);
        const currentSites = assignedSitesStr.split(',').map(s => s.trim());
        Array.from(sitesSelect.options).forEach(option => {
            if (currentSites.includes(String(option.value))) {
                option.selected = true;
            }
        });
    }

    document.getElementById('editModal').style.display = 'flex';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Update worker profile
async function updateWorkerProfile(event) {
    event.preventDefault();

    const name = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const position = document.getElementById('editPosition').value;
    const worker_type = document.getElementById('editWorkerType').value;

    if (!/^\d{10}$/.test(phone)) {
        alert('Phone number must be exactly 10 digits');
        return;
    }

    const assignedSitesSelect = document.getElementById('editAssignedSites');
    const selectedOptions = Array.from(assignedSitesSelect.selectedOptions);
    const assigned_sites = selectedOptions
        .filter(opt => opt.value !== 'None')
        .map(opt => opt.value)
        .join(',');

    const data = {
        workerId: workerId,
        workerName: name,
        workerPhone: phone,
        workerPosition: position,
        workerType: worker_type,
        assignedSites: assigned_sites || 'None'
    };

    try {
        const response = await fetch(`${BASE_URL}?action=updateWorker`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.status === 'success' || result.success) {
            alert('Profile updated successfully!');
            closeEditModal();
            loadAllData(); // Reload all data to reflect changes
        } else {
            alert('Error: ' + (result.message || 'Failed to update profile'));
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile: ' + error.message);
    }
}

// Navigate to payment form with this worker pre-selected
function goToPayment() {
    const workerId = new URLSearchParams(window.location.search).get('id');
    const workerName = document.querySelector('.profile-header h1')?.textContent || 'Unknown';
    
    if (workerId) {
        // Store worker info in sessionStorage to pre-fill the payment form
        sessionStorage.setItem('selectedWorkerId', workerId);
        sessionStorage.setItem('selectedWorkerName', workerName);
        sessionStorage.setItem('paymentType', 'given'); // Set payment type to 'Given (Paid to Worker)'
        window.location.href = 'payment-form.html';
    } else {
        alert('Worker ID not found');
    }
}

// Navigate to payment form to receive payment from this worker
function goToReceivePayment() {
    const workerId = new URLSearchParams(window.location.search).get('id');
    const workerName = document.getElementById('workerName')?.textContent || 'Unknown';
    
    if (workerId) {
        // Store worker info in sessionStorage to pre-fill the payment form
        sessionStorage.setItem('selectedWorkerId', workerId);
        sessionStorage.setItem('selectedWorkerName', workerName);
        sessionStorage.setItem('paymentType', 'received_worker'); // Set payment type to 'Received (From Worker)'
        window.location.href = 'payment-form.html';
    } else {
        alert('Worker ID not found');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});

// ================================
// PDF EXPORT FUNCTIONS
// ================================

/**
 * Export Attendance History to PDF
 */
function exportAttendancePDF() {
    const workerNameEl = document.getElementById('workerName');
    const workerName = workerNameEl ? workerNameEl.textContent : 'Worker';
    
    // Get all attendance data (not just current page)
    const data = filteredAttendance || [];
    
    if (data.length === 0) {
        alert('No attendance records to export');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }

    const JsPDFCtor = window.jspdf.jsPDF;
    const doc = new JsPDFCtor('p', 'mm', 'a4');
    if (typeof doc.autoTable !== 'function') {
        alert('PDF table plugin not loaded. Please refresh the page.');
        return;
    }

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Attendance History - ${workerName}`, 14, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
    doc.text(`Total Records: ${data.length}`, 14, 34);

    const headers = [['S.No', 'Date', 'Site Name', 'Work Type', 'Work Title', 'Amount (Rs.)']];
    const rows = data.map((record, index) => {
        const amount = parseFloat(record.work_amount || record.rate || record.daily_rate || 0) || 0;
        return [
            index + 1,
            formatDate(record.date),
            getSiteName(record.site_id),
            record.work_type || '-',
            record.work_title || '-',
            `Rs. ${amount.toFixed(2)}`
        ];
    });

    doc.autoTable({
        head: headers,
        body: rows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 22 },
            2: { cellWidth: 'wrap' },
            3: { cellWidth: 24 },
            4: { cellWidth: 'wrap' },
            5: { cellWidth: 26, halign: 'right' }
        },
        tableWidth: 'auto',
        margin: { left: 10, right: 10 }
    });

    const total = data.reduce((sum, r) => sum + (parseFloat(r.work_amount || r.rate || r.daily_rate) || 0), 0);
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: Rs. ${total.toFixed(2)}`, 14, finalY);

    try {
        const filename = `${workerName}_Attendance_${new Date().toISOString().split('T')[0]}.pdf`;
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Attendance PDF download failed, falling back to doc.save:', e);
        doc.save(`${workerName}_Attendance_${new Date().toISOString().split('T')[0]}.pdf`);
    }
}

/**
 * Export Payment History to PDF
 */
function exportPaymentPDF() {
    const workerNameEl = document.getElementById('workerName');
    const workerName = workerNameEl ? workerNameEl.textContent : 'Worker';
    
    // Get all payment data (not just current page)
    const data = filteredPayments || [];
    
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error('jsPDF not available on window.jspdf');
        return fallbackPrintSection('Payment History', 'paymentBody');
    }
    const JsPDFCtor = window.jspdf.jsPDF;
    const doc = new JsPDFCtor('p', 'mm', 'a4');
    if (typeof doc.autoTable !== 'function') {
        console.error('autoTable plugin not available on doc');
        return fallbackPrintSection('Payment History', 'paymentBody');
    }
    
    if (data.length === 0) {
        alert('No payment records to export');
        return;
    }
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Payment History - ${workerName}`, 14, 20);
    
    // Date info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
    doc.text(`Total Records: ${data.length}`, 14, 34);
    
    // Table headers
    const headers = [['S.No', 'Date', 'Site Name', 'Amount (₹)', 'Payment Type', 'Note']];
    
    // Table rows
    const rows = data.map((record, index) => {
        const amount = parseFloat(record.amount) || 0;
        return [
            index + 1,
            formatDate(record.date),
            getSiteName(record.site_id),
            formatPdfCurrency(amount),
            record.type === 'given' ? 'Transfer' : (record.type || 'Other'),
            record.note || '-'
        ];
    });
    
    // Generate table
    doc.autoTable({
        head: headers,
        body: rows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 22 },
            2: { cellWidth: 'wrap' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 26 },
            5: { cellWidth: 'wrap' }
        },
        tableWidth: 'auto',
        margin: { left: 10, right: 10 }
    });
    
    // Calculate total
    const total = data.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatPdfCurrency(total)}`, 14, finalY);
    
    // Save PDF (force download via blob)
    try {
        const filename = `${workerName}_Payments_${new Date().toISOString().split('T')[0]}.pdf`;
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Payments PDF download failed, falling back to doc.save:', e);
        doc.save(`${workerName}_Payments_${new Date().toISOString().split('T')[0]}.pdf`);
    }
}

/**
 * Export Received Payments (from Worker) to PDF
 */
function exportReceivedPDF() {
    const workerNameEl = document.getElementById('workerName');
    const workerName = workerNameEl ? workerNameEl.textContent : 'Worker';
    
    // Get all received data (not just current page)
    const data = filteredReceived || [];
    
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error('jsPDF not available on window.jspdf');
        return fallbackPrintSection('Received from Worker (Paid to Admin)', 'receivedBody');
    }
    const JsPDFCtor = window.jspdf.jsPDF;
    const doc = new JsPDFCtor('p', 'mm', 'a4');
    if (typeof doc.autoTable !== 'function') {
        console.error('autoTable plugin not available on doc');
        return fallbackPrintSection('Received from Worker (Paid to Admin)', 'receivedBody');
    }
    // Fallback: open print dialog for the section if PDFs libs are not available
    function fallbackPrintSection(title, tbodyId) {
        try {
            const tbody = document.getElementById(tbodyId);
            const rowsHtml = tbody ? tbody.outerHTML : '<tbody><tr><td>No data</td></tr></tbody>';
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Unable to open print window. Please allow pop-ups and try again.');
                return;
            }
            printWindow.document.write(`
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h2 { margin-top: 0; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
                        th { background: #f3f4f6; }
                    </style>
                </head>
                <body>
                    <h2>${title}</h2>
                    <table>
                        ${rowsHtml}
                    </table>
                    <script>
                        window.onload = function() { window.print(); };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (e) {
            console.error('Fallback print failed:', e);
            alert('Unable to export. Please try again.');
        }
    }
    
    if (data.length === 0) {
        alert('No received payment records to export');
        return;
    }
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Received from ${workerName}`, 14, 20);
    
    // Date info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
    doc.text(`Total Records: ${data.length}`, 14, 34);
    
    // Table headers
    const headers = [['S.No', 'Date', 'Site Name', 'Amount (₹)', 'Payment Mode', 'Note']];
    
    // Table rows
    const rows = data.map((record, index) => {
        const amount = parseFloat(record.amount) || 0;
        return [
            index + 1,
            formatDate(record.date),
            getSiteName(record.site_id),
            formatPdfCurrency(amount),
            record.payment_mode || record.mode || 'Cash',
            record.note || '-'
        ];
    });
    
    // Generate table
    doc.autoTable({
        head: headers,
        body: rows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 22 },
            2: { cellWidth: 'wrap' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 26 },
            5: { cellWidth: 'wrap' }
        },
        tableWidth: 'auto',
        margin: { left: 10, right: 10 }
    });
    
    // Calculate total
    const total = data.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Received: ${formatPdfCurrency(total)}`, 14, finalY);
    

// (moved) formatPdfCurrency defined at top-level after formatDate
    // Save PDF (force download via blob)
    try {
        const filename = `${workerName}_Received_${new Date().toISOString().split('T')[0]}.pdf`;
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Received PDF download failed, falling back to doc.save:', e);
        doc.save(`${workerName}_Received_${new Date().toISOString().split('T')[0]}.pdf`);
    }
}
