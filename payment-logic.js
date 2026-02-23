let sitesData = [];
let workersData = [];
let attendanceData = [];
let paymentsData = [];
let currentWorkerBalance = 0;

// Pagination and filtering variables
let allPayments = [];
let filteredPayments = [];
let currentPage = 1;
const recordsPerPage = 10;

async function loadSites() {
    try {
        const response = await fetch(`${BASE_URL}?action=getSites`);
        if (!response.ok) throw new Error('Failed to fetch sites');
        sitesData = await response.json();
        populateSiteDropdown();
    } catch (error) {
        console.error('Error loading sites:', error);
        alert('Error loading sites');
    }
}

async function loadWorkers() {
    try {
        const response = await fetch(`${BASE_URL}?action=getWorkers`);
        if (!response.ok) throw new Error('Failed to fetch workers');
        workersData = await response.json();
        populateWorkerDropdown();
    } catch (error) {
        console.error('Error loading workers:', error);
        alert('Error loading workers');
    }
}

async function loadAttendanceAndPayments() {
    try {
        console.log('⏳ Fetching attendance and payment data...');
        const [attendanceRes, paymentsRes] = await Promise.all([
            fetch(`${BASE_URL}?action=getAttendance`),
            fetch(`${BASE_URL}?action=getPayments`)
        ]);
        
        if (!attendanceRes.ok || !paymentsRes.ok) {
            throw new Error('Failed to fetch data');
        }
        
        attendanceData = await attendanceRes.json();
        paymentsData = await paymentsRes.json();
        
        // Validate data is array
        if (!Array.isArray(attendanceData)) {
            console.error('❌ Attendance data is not an array:', attendanceData);
            attendanceData = [];
        }
        if (!Array.isArray(paymentsData)) {
            console.error('❌ Payment data is not an array:', paymentsData);
            paymentsData = [];
        }
        
        console.log('✅ Loaded attendance records:', attendanceData.length);
        console.log('✅ Loaded payment records:', paymentsData.length);
        
        // Load all payments for history table
        allPayments = paymentsData || [];
        filteredPayments = [...allPayments];
        populateFilterDropdowns();
        renderPaymentsTable();
    } catch (error) {
        console.error('❌ Error loading attendance/payments:', error);
        attendanceData = [];
        paymentsData = [];
        allPayments = [];
        filteredPayments = [];
    }
}

function populateSiteDropdown() {
    const dropdown = document.getElementById('site_name');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Select Site</option>';
    
    sitesData.forEach(site => {
        const option = document.createElement('option');
        option.value = site.site_name;
        option.textContent = site.site_name;
        option.dataset.siteId = site.site_id;
        dropdown.appendChild(option);
    });
}

function populateWorkerDropdown() {
    const dropdown = document.getElementById('worker_name');
    if (!dropdown) return;
    
    const siteDropdown = document.getElementById('site_name');
    const selectedSiteOption = siteDropdown.options[siteDropdown.selectedIndex];
    const selectedSiteId = selectedSiteOption ? selectedSiteOption.dataset.siteId : '';
    
    dropdown.innerHTML = '<option value="">Select Worker</option>';
    
    let filteredWorkers = workersData;
    if (selectedSiteId) {
        filteredWorkers = workersData.filter(worker => {
            if (!worker.assigned_sites) return false;
            // Convert to string first in case it's a number
            const assignedSitesStr = String(worker.assigned_sites);
            const assignedSitesArray = assignedSitesStr.split(',').map(s => s.trim());
            return assignedSitesArray.includes(selectedSiteId) || assignedSitesArray.includes('None');
        });
    }
    
    filteredWorkers.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.name;
        option.textContent = `${worker.name} - ${worker.phone || ''} (${worker.position || ''})`;
        option.dataset.workerId = worker.worker_id;
        option.dataset.workerName = worker.name;
        option.dataset.workerPhone = worker.phone || '';
        option.dataset.workerPosition = worker.position || '';
        dropdown.appendChild(option);
    });
    
    dropdown.dataset.allWorkers = JSON.stringify(filteredWorkers);
}

function filterWorkers() {
    const searchInput = document.getElementById('worker_search');
    const dropdown = document.getElementById('worker_name');
    if (!searchInput || !dropdown) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const allWorkers = dropdown.dataset.allWorkers ? JSON.parse(dropdown.dataset.allWorkers) : workersData;
    
    dropdown.innerHTML = '<option value="">Select Worker</option>';
    
    const filtered = allWorkers.filter(worker => {
        const name = String(worker.name || '').toLowerCase();
        const phone = String(worker.phone || '').toLowerCase();
        const position = String(worker.position || '').toLowerCase();
        return name.includes(searchTerm) || phone.includes(searchTerm) || position.includes(searchTerm);
    });
    
    filtered.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.name;
        option.textContent = `${worker.name} - ${worker.phone || ''} (${worker.position || ''})`;
        option.dataset.workerId = worker.worker_id;
        option.dataset.workerPhone = worker.phone || '';
        option.dataset.workerPosition = worker.position || '';
        dropdown.appendChild(option);
    });
}

function mapSiteNameToId() {
    const dropdown = document.getElementById('site_name');
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const siteId = selectedOption.dataset.siteId || '';
    document.getElementById('site_id').value = siteId;
    
    populateWorkerDropdown();
    
    if (siteId) {
        showWorkersTable(siteId);
    } else {
        hideWorkersTable();
    }
}

function handlePaymentTypeChange() {
    const typeDropdown = document.getElementById('type');
    const selectedType = typeDropdown.value;
    
    const siteInputGroup = document.querySelector('#site_name').closest('.input-group');
    const workerInputGroup = document.querySelector('#worker_name').closest('.input-group');
    const workersTableSection = document.getElementById('workersTableSection');
    
    // Reset selections
    document.getElementById('site_name').value = '';
    document.getElementById('site_id').value = '';
    document.getElementById('worker_name').selectedIndex = 0;
    document.getElementById('worker_id').value = '';
    clearWorkerSelection();
    
    if (selectedType === 'received') {
        // Received (From Site) - Show only Site field
        siteInputGroup.style.display = 'block';
        workerInputGroup.style.display = 'none';
        if (workersTableSection) workersTableSection.style.display = 'none';
        
        // Update site label
        const siteLabel = siteInputGroup.querySelector('label');
        siteLabel.innerHTML = 'Site: <span style="color: red;">*</span>';
        document.getElementById('site_name').required = true;
        document.getElementById('worker_name').required = false;
    } else if (selectedType === 'received_worker') {
        // Received (From Worker) - Show Site then Worker
        siteInputGroup.style.display = 'block';
        workerInputGroup.style.display = 'block';
        
        // Update labels to show required fields
        const siteLabel = siteInputGroup.querySelector('label');
        siteLabel.innerHTML = 'Site: <span style="color: red;">*</span>';
        const workerLabel = workerInputGroup.querySelector('label');
        workerLabel.textContent = 'Worker:';
        
        document.getElementById('site_name').required = true;
        document.getElementById('worker_name').required = true;
    } else if (selectedType === 'given') {
        // Given (Paid to Worker) - Show both fields
        siteInputGroup.style.display = 'block';
        workerInputGroup.style.display = 'block';
        
        // Update labels - site is optional
        const siteLabel = siteInputGroup.querySelector('label');
        siteLabel.innerHTML = 'Site: <span style="color: #94a3b8; font-size: 12px;">(Optional)</span>';
        const workerLabel = workerInputGroup.querySelector('label');
        workerLabel.textContent = 'Worker:';
        
        document.getElementById('site_name').required = false;
        document.getElementById('worker_name').required = true;
    } else {
        // Default - Show both fields
        siteInputGroup.style.display = 'block';
        workerInputGroup.style.display = 'block';
        
        const siteLabel = siteInputGroup.querySelector('label');
        siteLabel.innerHTML = 'Site: <span style="color: #94a3b8; font-size: 12px;">(Optional)</span>';
        
        document.getElementById('site_name').required = false;
        document.getElementById('worker_name').required = true;
    }
}

function showWorkersTable(siteId) {
    const tableSection = document.getElementById('workersTableSection');
    const tableBody = document.getElementById('workersTableBody');
    
    if (!tableSection || !tableBody) return;
    
    const filteredWorkers = workersData.filter(worker => {
        if (!worker.assigned_sites) return false;
        // Convert to string first in case it's a number
        const assignedSitesStr = String(worker.assigned_sites);
        const assignedSitesArray = assignedSitesStr.split(',').map(s => s.trim());
        return assignedSitesArray.includes(siteId) || assignedSitesArray.includes('None');
    });
    
    if (filteredWorkers.length === 0) {
        tableSection.style.display = 'none';
        return;
    }
    
    tableBody.innerHTML = '';
    filteredWorkers.forEach(worker => {
        const totalEarned = attendanceData
            .filter(a => a.worker_id == worker.worker_id)
            .reduce((sum, a) => sum + (parseFloat(a.work_amount) || 0), 0);
        
        const totalPaid = paymentsData
            .filter(p => p.worker_id == worker.worker_id)
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        const pending = totalEarned - totalPaid;
        
        const positionBadge = worker.position === 'Karigar' ? 
            '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">Karigar</span>' :
            '<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">Majur</span>';
        
        const typeBadge = worker.worker_type === 'New' ?
            '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">New</span>' :
            '<span style="background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">Old</span>';
        
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.style.transition = 'all 0.2s';
        row.onmouseover = function() { this.style.background = '#f8fafc'; };
        row.onmouseout = function() { this.style.background = 'white'; };
        row.onclick = function() { selectWorkerFromTable(worker.worker_id, worker.name); };
        
        row.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <input type="radio" name="selected_worker" value="${worker.worker_id}" onclick="selectWorkerFromTable('${worker.worker_id}', '${worker.name}')">
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${worker.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${positionBadge}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${typeBadge}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: ${pending >= 0 ? '#059669' : '#dc2626'};">₹${pending.toFixed(2)}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    tableSection.style.display = 'block';
}

function hideWorkersTable() {
    const tableSection = document.getElementById('workersTableSection');
    if (tableSection) tableSection.style.display = 'none';
}

function selectWorkerFromTable(workerId, workerName) {
    const dropdown = document.getElementById('worker_name');
    const options = dropdown.options;
    
    for (let i = 0; i < options.length; i++) {
        if (options[i].dataset.workerId == workerId) {
            dropdown.selectedIndex = i;
            mapWorkerNameToId();
            break;
        }
    }
}

function mapWorkerNameToId() {
    const dropdown = document.getElementById('worker_name');
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const workerId = selectedOption.dataset.workerId || '';
    const workerName = selectedOption.value;
    const workerPhone = selectedOption.dataset.workerPhone || '';
    const workerPosition = selectedOption.dataset.workerPosition || '';
    
    console.log('👤 Worker selected - ID:', workerId, 'Name:', workerName);
    
    document.getElementById('worker_id').value = workerId;
    
    // Show selected worker info
    const selectedInfo = document.getElementById('selectedWorkerInfo');
    const selectedDetails = document.getElementById('selectedWorkerDetails');
    const clearBtn = document.getElementById('clearWorker');
    
    if (workerId && workerName) {
        selectedInfo.style.display = 'block';
        selectedDetails.innerHTML = `<strong>${workerName}</strong> - ${workerPhone} (${workerPosition})`;
        if (clearBtn) clearBtn.style.display = 'block';
        
        console.log('✅ Worker info displayed, loading balance...');
        // Load worker balance when worker is selected
        loadWorkerBalance(workerId, workerName);
    } else {
        console.log('⚠️ No worker selected, hiding wallet info');
        selectedInfo.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        hideWalletInfo();
    }
    
    updatePaymentCalculation();
}

function clearWorkerSelection() {
    const dropdown = document.getElementById('worker_name');
    const selectedInfo = document.getElementById('selectedWorkerInfo');
    const clearBtn = document.getElementById('clearWorker');
    
    dropdown.selectedIndex = 0;
    document.getElementById('worker_id').value = '';
    
    if (selectedInfo) selectedInfo.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    
    hideWalletInfo();
    currentWorkerBalance = 0;
}

async function loadWorkerBalance(workerId, workerName) {
    console.log('🔍 Loading balance for worker:', workerId, 'Name:', workerName);
    
    if (!workerId) {
        console.warn('⚠️ No worker ID provided');
        hideWalletInfo();
        return;
    }
    
    if (!attendanceData.length || !paymentsData.length) {
        console.log('⏳ Loading attendance and payment data...');
        await loadAttendanceAndPayments();
    }
    
    console.log('📊 Data loaded - Attendance records:', attendanceData.length, 'Payment records:', paymentsData.length);
    
    try {
        // Filter attendance for this worker - deduplicate by date + site like worker profile does
        let workerAttendance = attendanceData.filter(att => att.worker_id == workerId);
        
        // Deduplicate by (date + site_id) - keep latest record for the day/site
        const dedupMap = new Map();
        workerAttendance.forEach(rec => {
            // Normalize date to YYYY-MM-DD
            let d = rec.date;
            if (typeof d === 'string' && d.includes('T')) d = d.split('T')[0];
            const key = `${d}|${rec.site_id}`;
            // Overwrite to keep the last occurrence (latest saved)
            dedupMap.set(key, { ...rec, date: d });
        });
        workerAttendance = Array.from(dedupMap.values());
        
        console.log('👷 Worker attendance records (after dedup):', workerAttendance.length);
        console.log('Raw attendance before dedup:', attendanceData.filter(att => att.worker_id == workerId).length);
        
        const totalEarned = workerAttendance.reduce((sum, att) => {
            const amount = parseFloat(att.work_amount) || 0;
            console.log('  Attendance:', att.date, 'Site:', att.site_id, 'Amount:', amount);
            return sum + amount;
        }, 0);
        
        // Filter payments for this worker
        const workerPayments = paymentsData.filter(pay => {
            // The payment data might have worker_id as either:
            // 1. Numeric ID (e.g., 123) - compare with workerId
            // 2. Worker name (e.g., "Demo bhai") - compare with workerName
            const isNumericId = !isNaN(pay.worker_id);
            const workerMatch = isNumericId 
                ? String(pay.worker_id) === String(workerId)
                : String(pay.worker_id) === workerName; // Use worker name parameter
            
            // Only count "given" payments (payments TO the worker)
            // Exclude "received" payments (payments FROM the worker TO the company)
            const typeMatch = pay.type === 'given' || pay.type === undefined || pay.type === '' || !pay.type;
            
            return workerMatch && typeMatch;
        });
        
        console.log('💰 Worker payment records (GIVEN only):', workerPayments.length);
        console.log('All payments for this worker (before filter):', paymentsData.filter(pay => pay.worker_id == workerId).length);
        
        const totalPaid = workerPayments.reduce((sum, pay) => {
            const amount = parseFloat(pay.amount) || 0;
            console.log('  Payment:', pay.date, 'Amount:', amount, 'Type:', pay.type);
            return sum + amount;
        }, 0);
        
        console.log('📈 Total Earned: ₹' + totalEarned.toFixed(2));
        console.log('💸 Total Paid (GIVEN to worker): ₹' + totalPaid.toFixed(2));
        
        currentWorkerBalance = totalEarned - totalPaid;
        console.log('💼 ===== WALLET BALANCE CALCULATION =====');
        console.log('Formula: Earned - Paid = ' + totalEarned.toFixed(2) + ' - ' + totalPaid.toFixed(2) + ' = ₹' + currentWorkerBalance.toFixed(2));
        console.log('=========================================');
        
        showWalletInfo(currentWorkerBalance);
        
    } catch (error) {
        console.error('❌ Error loading worker balance:', error);
        currentWorkerBalance = 0;
        hideWalletInfo();
    }
}

function showWalletInfo(balance) {
    console.log('💼 Showing wallet info with balance:', balance);
    
    // Ensure amount input is always visible
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.style.display = 'block';
        console.log('✅ Amount (₹) input is visible');
    } else {
        console.error('❌ Amount input element not found');
    }
    
    const walletInfo = document.getElementById('walletInfo');
    const walletBalance = document.getElementById('walletBalance');
    
    if (!walletInfo || !walletBalance) {
        console.error('❌ Wallet info elements not found');
        return;
    }
    
    // Validate balance is a number
    const validBalance = isNaN(balance) ? 0 : balance;
    
    walletBalance.textContent = `₹${validBalance.toFixed(2)}`;
    
    // Set color based on balance: green for positive (+), red for negative (-)
    if (validBalance > 0) {
        walletBalance.style.color = '#10b981'; // Green color
    } else if (validBalance < 0) {
        walletBalance.style.color = '#ef4444'; // Red color
    } else {
        walletBalance.style.color = 'var(--gray-900)'; // Default dark color for zero
    }
    
    walletInfo.style.display = 'block';
    console.log('✅ Wallet info displayed: ₹' + validBalance.toFixed(2));
    
    // Update calculation if amount is already entered
    if (amountInput && amountInput.value) {
        calculatePaymentDifference(parseFloat(amountInput.value));
    }
}

function hideWalletInfo() {
    // Keep amount input ALWAYS visible - only hide wallet info section
    const walletInfo = document.getElementById('walletInfo');
    if (walletInfo) {
        walletInfo.style.display = 'none';
        console.log('🔒 Wallet info hidden, Amount input remains visible');
    }
    hidePaymentCalculation();
}

function calculatePaymentDifference(paymentAmount) {
    if (!paymentAmount || paymentAmount <= 0) {
        hidePaymentCalculation();
        return;
    }
    
    const difference = paymentAmount - currentWorkerBalance;
    const paymentCalculation = document.getElementById('paymentCalculation');
    const takeNeed = document.getElementById('takeNeed');
    const giveTo = document.getElementById('giveTo');
    const takeNeedAmount = document.getElementById('takeNeedAmount');
    const giveToAmount = document.getElementById('giveToAmount');
    
    if (!paymentCalculation) return;
    
    paymentCalculation.style.display = 'block';
    
    if (difference > 0) {
        // Payment is more than balance - show "Take need"
        takeNeed.style.display = 'block';
        giveTo.style.display = 'none';
        takeNeedAmount.textContent = `₹${difference.toFixed(2)}`;
    } else if (difference < 0) {
        // Payment is less than balance - show "Give to"
        takeNeed.style.display = 'none';
        giveTo.style.display = 'block';
        giveToAmount.textContent = `₹${Math.abs(difference).toFixed(2)}`;
    } else {
        // Exact match
        hidePaymentCalculation();
    }
}

function hidePaymentCalculation() {
    const paymentCalculation = document.getElementById('paymentCalculation');
    const takeNeed = document.getElementById('takeNeed');
    const giveTo = document.getElementById('giveTo');
    
    if (paymentCalculation) {
        paymentCalculation.style.display = 'none';
    }
    if (takeNeed) takeNeed.style.display = 'none';
    if (giveTo) giveTo.style.display = 'none';
}

function updatePaymentCalculation() {
    const amountInput = document.getElementById('amount');
    if (amountInput && amountInput.value) {
        const amount = parseFloat(amountInput.value);
        if (amount > 0) {
            calculatePaymentDifference(amount);
        }
    }
}

async function submitPayment(e) {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const site_name = document.getElementById('site_name').value || 'none';
    const site_id = document.getElementById('site_id').value || 'none';
    const worker_name = document.getElementById('worker_name').value;
    const worker_id = document.getElementById('worker_id').value;
    const amount = document.getElementById('amount').value;
    const payment_mode = document.getElementById('payment_mode').value;
    const note = document.getElementById('note').value;
    
    // Validation
    if (!date || !worker_name || !amount || !payment_mode) {
        alert('Please fill all required fields');
        return;
    }
    
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const data = {
        date,
        site_id,
        site_name,
        worker_id,
        worker_name,
        amount: parseFloat(amount),
        payment_mode,
        note
    };
    
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const saveResult = window.OfflineQueue
            ? await window.OfflineQueue.submitOrQueue('payment', 'addPayment', data)
            : { success: false, queued: false };
        
        if (saveResult.success) {
            alert('Payment saved successfully!');
            document.getElementById('paymentForm').reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            hideWalletInfo();
            currentWorkerBalance = 0;
        } else if (saveResult.queued) {
            alert('📦 Payment saved offline. It will auto-sync when internet returns.');
            document.getElementById('paymentForm').reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            hideWalletInfo();
            currentWorkerBalance = 0;
        } else {
            alert('Error: Failed to save payment');
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        alert('Error saving payment. Please check your connection and try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.OfflineQueue) {
        window.OfflineQueue.init({ getBaseUrl: () => BASE_URL });
        window.OfflineQueue.process();
    }

    // Ensure Amount input is always visible
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.style.display = 'block';
        console.log('✅ Amount (₹) input visible on page load');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Load sites and workers FIRST, then payments
    await loadSites();
    await loadWorkers();
    await loadAttendanceAndPayments();
    
    // Auto-select based on session storage (from worker/site profile)
    const selectedWorkerId = sessionStorage.getItem('selectedWorkerId');
    const selectedWorkerName = sessionStorage.getItem('selectedWorkerName');
    const selectedSiteId = sessionStorage.getItem('selectedSiteId');
    const selectedSiteName = sessionStorage.getItem('selectedSiteName');
    const paymentType = sessionStorage.getItem('paymentType');
    
    // Set payment type if specified
    const typeDropdown = document.getElementById('type');
    if (paymentType && typeDropdown) {
        typeDropdown.value = paymentType;
        handlePaymentTypeChange();
    }
    
    // Auto-select site if coming from site profile
    if (selectedSiteId && selectedSiteName && sitesData && sitesData.length > 0) {
        const siteDropdown = document.getElementById('site_name');
        if (siteDropdown) {
            for (let option of siteDropdown.options) {
                if (option.value === selectedSiteName || option.dataset.siteId === selectedSiteId) {
                    siteDropdown.value = option.value;
                    mapSiteNameToId();
                    break;
                }
            }
        }
    }
    
    // Auto-select worker if coming from worker profile
    if (selectedWorkerId && selectedWorkerName && workersData && workersData.length > 0) {
        const workerDropdown = document.getElementById('worker_name');
        if (workerDropdown) {
            // Find the worker in dropdown
            for (let option of workerDropdown.options) {
                if (option.value === selectedWorkerName || option.dataset.workerId === selectedWorkerId) {
                    workerDropdown.value = option.value;
                    mapWorkerNameToId();
                    break;
                }
            }
        }
    }
    
    // Clear sessionStorage
    sessionStorage.removeItem('selectedWorkerId');
    sessionStorage.removeItem('selectedWorkerName');
    sessionStorage.removeItem('selectedSiteId');
    sessionStorage.removeItem('selectedSiteName');
    sessionStorage.removeItem('paymentType');
    
    // Event listeners
    const paymentForm = document.getElementById('paymentForm');
    
    // Add change listener for site dropdown (already declared above)
    const siteDropdownElement = document.getElementById('site_name');
    if (siteDropdownElement) {
        siteDropdownElement.addEventListener('change', mapSiteNameToId);
    }
    
    // Add change listener for type dropdown (already declared above)
    if (typeDropdown) {
        typeDropdown.addEventListener('change', handlePaymentTypeChange);
    }
    
    // Worker dropdown with change and click-to-unselect functionality
    const workerDropdown = document.getElementById('worker_name');
    if (workerDropdown) {
        let lastSelectedIndex = 0;
        
        workerDropdown.addEventListener('change', () => {
            mapWorkerNameToId();
            lastSelectedIndex = workerDropdown.selectedIndex;
        });
        
        workerDropdown.addEventListener('mousedown', (e) => {
            const clickedIndex = workerDropdown.selectedIndex;
            
            // If clicking on already selected option, deselect it
            if (clickedIndex === lastSelectedIndex && clickedIndex !== 0) {
                e.preventDefault();
                setTimeout(() => {
                    workerDropdown.selectedIndex = 0;
                    clearWorkerSelection();
                }, 0);
            }
            
            lastSelectedIndex = clickedIndex;
        });
    }
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', submitPayment);
    }
    
    // Listen for amount changes to calculate payment difference
    // (amountInput already declared at the top of DOMContentLoaded)
    if (amountInput) {
        amountInput.addEventListener('input', (e) => {
            const amount = parseFloat(e.target.value);
            if (amount && currentWorkerBalance !== 0) {
                calculatePaymentDifference(amount);
            } else {
                hidePaymentCalculation();
            }
        });
    }
    
    // Add search functionality for workers
    const workerSearch = document.getElementById('worker_search');
    if (workerSearch) {
        workerSearch.addEventListener('input', filterWorkers);
    }
    
    // Add clear worker selection button
    const clearWorkerBtn = document.getElementById('clearWorker');
    if (clearWorkerBtn) {
        clearWorkerBtn.addEventListener('click', clearWorkerSelection);
    }
});

// Populate filter dropdowns
function populateFilterDropdowns() {
    const filterWorker = document.getElementById('filterWorker');
    const filterSite = document.getElementById('filterSite');
    
    if (filterWorker) {
        const uniqueWorkers = [...new Set(allPayments.map(p => p.worker_name))].filter(Boolean);
        filterWorker.innerHTML = '<option value="">All Workers</option>';
        uniqueWorkers.forEach(worker => {
            filterWorker.innerHTML += `<option value="${worker}">${worker}</option>`;
        });
    }
    
    if (filterSite) {
        const uniqueSites = [...new Set(allPayments.map(p => p.site_name))].filter(Boolean);
        filterSite.innerHTML = '<option value="">All Sites</option>';
        uniqueSites.forEach(site => {
            if (site !== 'none') {
                filterSite.innerHTML += `<option value="${site}">${site}</option>`;
            }
        });
    }
}

// Apply filters
function applyFilters() {
    const filterWorker = document.getElementById('filterWorker')?.value || '';
    const filterSite = document.getElementById('filterSite')?.value || '';
    const filterMode = document.getElementById('filterMode')?.value || '';
    const filterStartDate = document.getElementById('filterStartDate')?.value || '';
    const filterEndDate = document.getElementById('filterEndDate')?.value || '';
    
    filteredPayments = allPayments.filter(payment => {
        let match = true;
        
        if (filterWorker && payment.worker_name !== filterWorker) match = false;
        if (filterSite && payment.site_name !== filterSite) match = false;
        if (filterMode && payment.payment_mode !== filterMode) match = false;
        
        if (filterStartDate && payment.date < filterStartDate) match = false;
        if (filterEndDate && payment.date > filterEndDate) match = false;
        
        return match;
    });
    
    currentPage = 1;
    renderPaymentsTable();
}

// Render payments table with pagination
function renderPaymentsTable() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--gray-600);">No payments found</td></tr>';
        updatePaginationInfo(0, 0, 0);
        return;
    }
    
    // Sort by date descending (latest first)
    const sortedPayments = [...filteredPayments].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, sortedPayments.length);
    const pagePayments = sortedPayments.slice(startIndex, endIndex);
    
    // Render rows
    pagePayments.forEach((payment, index) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--gray-200)';
        
        // Format date properly
        let formattedDate = '-';
        if (payment.date) {
            const date = new Date(payment.date);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
        }
        
        // Smart lookup - properly identify which ID is which
        let workerName = '-';
        let siteName = '-';
        let workerId = null;
        let siteId = null;
        
        // First pass: identify numeric IDs in the payment record
        const allIds = [];
        if (payment.worker_id && !isNaN(payment.worker_id)) allIds.push({ field: 'worker_id', value: payment.worker_id });
        if (payment.site_id && !isNaN(payment.site_id)) allIds.push({ field: 'site_id', value: payment.site_id });
        if (payment.worker_name && !isNaN(payment.worker_name)) allIds.push({ field: 'worker_name', value: payment.worker_name });
        if (payment.site_name && !isNaN(payment.site_name)) allIds.push({ field: 'site_name', value: payment.site_name });
        
        // Match IDs to actual workers and sites
        if (workersData && workersData.length > 0) {
            for (let id of allIds) {
                const worker = workersData.find(w => String(w.worker_id) === String(id.value));
                if (worker && !workerId) {
                    workerId = id.value;
                    workerName = worker.name;
                    break;
                }
            }
        }
        
        if (sitesData && sitesData.length > 0) {
            for (let id of allIds) {
                const site = sitesData.find(s => String(s.site_id) === String(id.value));
                if (site && !siteId) {
                    siteId = id.value;
                    siteName = site.site_name;
                    break;
                }
            }
        }
        
        // Fallback: check if actual names are stored directly
        if (workerName === '-') {
            if (payment.worker_name && isNaN(payment.worker_name)) {
                workerName = payment.worker_name;
            }
        }
        
        // Better fallback for site name - check all fields
        if (siteName === '-') {
            // Check if site_name field contains text (site name)
            if (payment.site_name && isNaN(payment.site_name) && payment.site_name !== 'none' && !String(payment.site_name).startsWith('SITE_')) {
                siteName = payment.site_name;
            }
            // Check if site_id field contains text (site name due to column swap)
            else if (payment.site_id && isNaN(payment.site_id) && payment.site_id !== 'none' && !String(payment.site_id).startsWith('SITE_')) {
                siteName = payment.site_id;
            }
            // Check if worker_name field contains site name (severe column mix-up)
            else if (payment.worker_name && isNaN(payment.worker_name) && sitesData && sitesData.length > 0) {
                const testSite = sitesData.find(s => s.site_name === payment.worker_name);
                if (testSite) siteName = payment.worker_name;
            }
            // Last resort: check all object keys for any text that matches a site name
            else if (sitesData && sitesData.length > 0) {
                for (let key in payment) {
                    if (payment[key] && isNaN(payment[key])) {
                        const testSite = sitesData.find(s => s.site_name === payment[key]);
                        if (testSite) {
                            siteName = payment[key];
                            break;
                        }
                    }
                }
            }
        }
        
        const displayWorkerName = workerName === '-' ? '-' : (workerName.length > 20 ? workerName.substring(0, 20) + '...' : workerName);
        
        const displaySiteName = siteName === '-' ? '-' : (siteName.length > 15 ? siteName.substring(0, 15) + '...' : siteName);
        
        // Debug logging
        if (index === 0) {
            console.log('Payment sample:', { 
                payment, 
                workerName, 
                siteName, 
                workerId, 
                siteId,
                sitesDataCount: sitesData ? sitesData.length : 0
            });
        }
        
        // Get note (truncate if too long)
        const note = payment.note || '-';
        const displayNote = note.length > 30 ? note.substring(0, 30) + '...' : note;
        
        const modeBadge = payment.payment_mode === 'cash' ?
            '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">💵 Cash</span>' :
            '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">💳 Online</span>';
        
        row.innerHTML = `
            <td style="padding: 14px 12px; text-align: center; color: var(--gray-700); font-weight: 500;">${startIndex + index + 1}</td>
            <td style="padding: 14px 12px; color: var(--gray-900); font-weight: 500; white-space: nowrap;">${formattedDate}</td>
            <td style="padding: 14px 12px; color: var(--gray-900); font-weight: 600;" title="${workerName}">${displayWorkerName}</td>
            <td style="padding: 14px 12px; color: var(--gray-900); font-weight: 500;" title="${siteName}">${displaySiteName}</td>
            <td style="padding: 14px 12px; text-align: right; color: #0f172a; font-weight: 700; font-size: 14px;">₹${parseFloat(payment.amount || 0).toFixed(2)}</td>
            <td style="padding: 14px 12px; text-align: center;">${modeBadge}</td>
            <td style="padding: 14px 12px; color: var(--gray-600); font-size: 13px;" title="${note}">${displayNote}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    updatePaginationInfo(startIndex + 1, endIndex, sortedPayments.length);
}

// Update pagination info and buttons
function updatePaginationInfo(start, end, total) {
    document.getElementById('showingStart').textContent = start;
    document.getElementById('showingEnd').textContent = end;
    document.getElementById('totalRecords').textContent = total;
    
    const totalPages = Math.ceil(total / recordsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}

// Pagination functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPaymentsTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredPayments.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPaymentsTable();
    }
}

// Export to PDF
function exportPaymentsPDF() {
    if (typeof jspdf === 'undefined') {
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }
    
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Payment History Report', 14, 20);
    
    // Date - properly formatted
    const now = new Date();
    const formattedGeneratedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${formattedGeneratedDate}`, 14, 28);
    
    // Filter info
    let filterText = 'Filters: ';
    const filterWorker = document.getElementById('filterWorker')?.value || '';
    const filterSite = document.getElementById('filterSite')?.value || '';
    const filterMode = document.getElementById('filterMode')?.value || '';
    
    if (filterWorker) filterText += `Worker: ${filterWorker}, `;
    if (filterSite) filterText += `Site: ${filterSite}, `;
    if (filterMode) filterText += `Mode: ${filterMode}, `;
    
    if (filterText !== 'Filters: ') {
        doc.text(filterText, 14, 34);
    }
    
    // Prepare table data with proper formatting
    const tableData = filteredPayments.map((payment, index) => {
        // Format date properly
        let formattedDate = '-';
        if (payment.date) {
            const date = new Date(payment.date);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
        }
        
        // Smart worker name lookup - handle all possible field arrangements
        let workerName = '-';
        let foundWorker = null;
        
        // Try all numeric fields as potential worker_id
        const possibleIds = [
            { val: payment.worker_id, field: 'worker_id' },
            { val: payment.site_id, field: 'site_id' },
            { val: payment.worker_name, field: 'worker_name' },
            { val: payment.site_name, field: 'site_name' }
        ];
        
        if (workersData && workersData.length > 0) {
            for (let id of possibleIds) {
                if (id.val && !isNaN(id.val)) {
                    const worker = workersData.find(w => String(w.worker_id) === String(id.val));
                    if (worker) {
                        workerName = worker.name;
                        foundWorker = worker;
                        break;
                    }
                }
            }
        }
        
        // If still not found, use direct text name fields
        if (workerName === '-') {
            if (payment.worker_name && isNaN(payment.worker_name)) {
                workerName = payment.worker_name;
            }
        }
        
        // Smart site name lookup - handle all possible field arrangements
        let siteName = '-';
        let foundSite = null;
        
        if (sitesData && sitesData.length > 0) {
            for (let id of possibleIds) {
                if (id.val && !isNaN(id.val)) {
                    const site = sitesData.find(s => String(s.site_id) === String(id.val));
                    if (site) {
                        siteName = site.site_name;
                        foundSite = site;
                        break;
                    }
                }
            }
        }
        
        // If still not found, use direct text name fields
        if (siteName === '-') {
            if (payment.site_name && isNaN(payment.site_name) && payment.site_name !== 'none' && !String(payment.site_name).startsWith('SITE_')) {
                siteName = payment.site_name;
            } else if (payment.worker_name && isNaN(payment.worker_name) && sitesData && sitesData.length > 0) {
                // Check if worker_name field actually contains a site name
                const testSite = sitesData.find(s => s.site_name === payment.worker_name);
                if (testSite) siteName = payment.worker_name;
            }
        }
        
        // Format amount properly (with Rs., no decimals if whole number)
        const amount = parseFloat(payment.amount || 0);
        const formattedAmount = amount % 1 === 0 ? `Rs. ${Math.floor(amount)}` : `Rs. ${amount.toFixed(2)}`;
        
        return [
            index + 1,
            formattedDate,
            workerName,
            siteName,
            formattedAmount,
            (payment.payment_mode === 'cash' ? 'Cash' : (payment.payment_mode === 'online' ? 'Online' : payment.payment_mode)) || '-',
            payment.note || '-'
        ];
    });
    
    // Calculate total
    const totalAmount = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const formattedTotal = totalAmount % 1 === 0 ? `Rs. ${Math.floor(totalAmount)}` : `Rs. ${totalAmount.toFixed(2)}`;
    tableData.push(['', '', '', 'Total:', formattedTotal, '', '']);
    
    // Add table
    doc.autoTable({
        startY: filterText !== 'Filters: ' ? 38 : 32,
        head: [['#', 'Date', 'Worker', 'Site', 'Amount', 'Mode', 'Note']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 58, 138],
            fontSize: 10,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 4
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            4: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            if (data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [243, 244, 246];
            }
        }
    });
    
    // Save
    const filename = `Payment_History_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}
