// Received Payments Page Logic
console.log('Received Payments page loaded');

let receivedData = [];
let workersData = [];
let sitesData = [];
let currentView = 'all'; // 'all', 'worker', 'site'
let currentEntity = null; // selected worker or site
let currentPage = 1;
const recordsPerPage = 10;

// Base URL builder (always uses configured BASE_URL)
function buildBaseUrl() {
    return BASE_URL;
}

// Generic JSONP request helper to bypass CORS
function jsonpRequest(action, params = {}, callbackName = null, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const cbName = callbackName || `__cb_${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        params.action = action;
        params.callback = cbName;
        const url = buildBaseUrl() + '?' + new URLSearchParams(params).toString();
        
        console.log(`JSONP Request: ${action}, URL: ${url.substring(0, 100)}...`);
        
        let timeoutHandle = null;
        let resolved = false;
        
        // Create callback that handles response
        window[cbName] = function(result) {
            if (resolved) return;
            resolved = true;
            
            if (timeoutHandle) clearTimeout(timeoutHandle);
            if (script) {
                script.onerror = null;
                if (script.parentNode) script.parentNode.removeChild(script);
            }
            
            console.log(`JSONP Response for ${action}:`, result);
            try { 
                resolve(result); 
            } catch (e) {
                console.error(`Error resolving ${action}:`, e);
                reject(e);
            } finally { 
                try { delete window[cbName]; } catch {} 
            }
        };
        
        // Create and configure script element
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = url;
        
        // Error handler for network failures
        script.onerror = function() {
            if (resolved) return;
            resolved = true;
            
            if (timeoutHandle) clearTimeout(timeoutHandle);
            if (script.parentNode) script.parentNode.removeChild(script);
            
            console.error(`Network error loading ${action}`);
            try { delete window[cbName]; } catch {}
            reject(new Error(`Network error: Failed to load ${action}`));
        };
        
        // Set timeout with cleanup
        timeoutHandle = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            
            if (script.parentNode) script.parentNode.removeChild(script);
            console.error(`Timeout loading ${action} after ${timeoutMs}ms`);
            try { delete window[cbName]; } catch {}
            reject(new Error(`Timeout: ${action} did not respond after ${timeoutMs}ms`));
        }, timeoutMs);
        
        // Inject script into DOM
        document.head.appendChild(script);
    });
}

// Load received payments data (via JSONP to avoid CORS)
async function loadReceivedPayments() {
    try {
        console.log('Loading received payments, workers, and sites...');
        
        const [receivedRes, workersRes, sitesRes] = await Promise.all([
            jsonpRequest('getReceived').catch(err => {
                console.warn('Failed to load received payments, retrying...', err);
                return jsonpRequest('getReceived');
            }),
            jsonpRequest('getWorkers').catch(err => {
                console.warn('Failed to load workers, retrying...', err);
                return jsonpRequest('getWorkers');
            }),
            jsonpRequest('getSites').catch(err => {
                console.warn('Failed to load sites, retrying...', err);
                return jsonpRequest('getSites');
            })
        ]);

        receivedData = Array.isArray(receivedRes) ? receivedRes : (receivedRes && (receivedRes.data || receivedRes.result) || []);
        workersData = Array.isArray(workersRes) ? workersRes : (workersRes && (workersRes.data || workersRes.result) || []);
        sitesData = Array.isArray(sitesRes) ? sitesRes : (sitesRes && (sitesRes.data || sitesRes.result) || []);

        console.log('✅ All data loaded successfully');
        console.log(`  - Received: ${receivedData.length} records`);
        console.log(`  - Workers: ${workersData.length} records`);
        console.log(`  - Sites: ${sitesData.length} records`);

        applyView('all');
    } catch (error) {
        console.error('❌ Error loading received payments after retry:', error);
        receivedData = [];
        workersData = [];
        sitesData = [];
        
        const errorMsg = error.message || 'Unknown error';
        document.getElementById('transactionsList').innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    <div style="padding: 2rem; text-align: center;">
                        <div style="color: #e74c3c; font-size: 1.25rem; margin-bottom: 0.5rem;">⚠️</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">Failed to load data</div>
                        <div style="font-size: 0.875rem; color: #7f8c8d; margin-bottom: 1rem;">${errorMsg}</div>
                        <button onclick="loadReceivedPayments()" style="padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">🔄 Retry</button>
                    </div>
                </td>
            </tr>
        `;
        
        ['fromWorker','fromSite','receivedSite'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<option value="">⚠️ Failed to load - check connection</option>`;
        });
    }
}

// Apply view mode (All, Worker, Site)
function applyView(view) {
    currentView = view;
    currentPage = 1;
    currentEntity = null;
    document.getElementById('entitySelect').value = '';
    
    // Update button states using CSS classes
    document.querySelectorAll('.filter-chip').forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide dropdown and update header
    const selectWrapper = document.getElementById('selectWrapper');
    const thirdHeader = document.getElementById('thirdHeader');
    
    if (view === 'all') {
        selectWrapper.style.display = 'none';
        thirdHeader.textContent = 'From';
    } else if (view === 'worker') {
        selectWrapper.style.display = 'block';
        thirdHeader.textContent = 'Worker';
        populateWorkerDropdown();
    } else if (view === 'site') {
        selectWrapper.style.display = 'block';
        thirdHeader.textContent = 'Site';
        populateSiteDropdown();
    }
    
    renderTransactions(getFilteredData());
}

// Populate worker dropdown
function populateWorkerDropdown() {
    const select = document.getElementById('entitySelect');
    select.innerHTML = '<option value="">Select Worker...</option>';
    
    if (workersData.length === 0) return;
    
    workersData.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.worker_id || '';
        option.textContent = worker.name || 'Unknown';
        select.appendChild(option);
    });
}

// Populate site dropdown
function populateSiteDropdown() {
    const select = document.getElementById('entitySelect');
    select.innerHTML = '<option value="">Select Site...</option>';
    
    if (sitesData.length === 0) return;
    
    sitesData.forEach(site => {
        const option = document.createElement('option');
        option.value = site.site_id || '';
        option.textContent = site.site_name || 'Unknown';
        select.appendChild(option);
    });
}

// Apply entity filter (worker or site)
function applyEntityFilter(entityId) {
    if (!entityId) {
        currentEntity = null;
    } else {
        currentEntity = String(entityId);
    }
    currentPage = 1;
    renderTransactions(getFilteredData());
}

// Get filtered data based on current view and entity
function getFilteredData() {
    let filtered = receivedData;

    if (currentView === 'worker' && currentEntity !== null) {
        const worker = workersData.find(w => String(w.worker_id) === String(currentEntity));
        if (worker) {
            filtered = receivedData.filter(r =>
                String(r.worker_id) === String(worker.worker_id) ||
                r.worker_name === worker.name ||
                r.from_name === worker.name
            );
        } else {
            filtered = [];
        }
    } else if (currentView === 'site' && currentEntity !== null) {
        const site = sitesData.find(s => String(s.site_id) === String(currentEntity) || s.site_name === currentEntity);
        if (site) {
            filtered = receivedData.filter(r => {
                const matchesSiteId = r.site_id && r.site_id !== 'none' && String(r.site_id) === String(site.site_id) && r.from_type !== 'worker';
                const matchesSiteName = r.from_type === 'site' && (r.site_name === site.site_name || r.from_name === site.site_name);
                // Only allow rows that are explicitly site-sourced, or have a real site_id that is not from a worker entry
                return matchesSiteId || matchesSiteName;
            });
        } else {
            filtered = [];
        }
    } else if (currentView === 'worker' || currentView === 'site') {
        // If user hasn't selected a worker/site yet, show nothing to avoid mixed results
        filtered = [];
    }

    return filtered;
}

// Render transactions list
function renderTransactions(data) {
    const tbody = document.getElementById('transactionsList');
    const countEl = document.getElementById('transactionCount');
    const totalEl = document.getElementById('totalReceived');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Handle null, undefined, or empty data
    if (!data || !Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    <div style="padding: 2rem; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">💰</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">No transactions yet</div>
                        <div style="font-size: 0.875rem;">Tap "Add Received" to add payment</div>
                    </div>
                </td>
            </tr>
        `;
        countEl.textContent = '0 records';
        totalEl.textContent = '₹0';
        paginationInfo.textContent = 'Showing 0-0 of 0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    // Sort by date (latest first)
    const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });
    
    // Calculate total
    const total = sorted.reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0);
    
    // Pagination calculations
    const totalRecords = sorted.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const startIdx = (currentPage - 1) * recordsPerPage;
    const endIdx = Math.min(startIdx + recordsPerPage, totalRecords);
    const pageRecords = sorted.slice(startIdx, endIdx);
    
    // Update pagination info
    paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalRecords}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    // Render table rows
    tbody.innerHTML = pageRecords.map((record, index) => {
        const date = formatDate(record.date);
        const amount = parseFloat(record.amount) || 0;
        const mode = record.payment_mode || 'N/A';
        const note = record.note || '';
        
        // Determine what to display in third column based on current view and record type
        let displayName = record.from_name || 'Unknown';
        let displayId = null;
        let profileUrl = null;
        
        if (currentView === 'worker') {
            // In worker view, show worker name from the record (never show "none")
            displayName = (record.worker_name && record.worker_name !== 'none') 
                ? record.worker_name 
                : (record.from_name || 'Unknown');
            displayId = record.worker_id;
            if (displayId && displayId !== 'none') {
                profileUrl = `worker-profile.html?id=${displayId}`;
            }
        } else if (currentView === 'site') {
            // In site view, show site name from the record (never show "none")
            displayName = (record.site_name && record.site_name !== 'none') 
                ? record.site_name 
                : (record.from_name || 'Unknown');
            displayId = record.site_id;
            // Fallback: if no site_id, try resolve by name from loaded sites
            if ((!displayId || displayId === 'none') && displayName) {
                const match = sitesData.find(s => s.site_name === displayName);
                if (match) displayId = match.site_id;
            }
            if (displayId && displayId !== 'none') {
                profileUrl = `site-profile.html?id=${displayId}`;
            }
        } else {
            // In 'all' view, intelligently show based on from_type
            // If from_type is worker, prefer worker_name; if site, prefer site_name
            const fromType = record.from_type || 'other';
            
            if (fromType === 'worker' && record.worker_name && record.worker_name !== 'none') {
                displayName = record.worker_name;
                displayId = record.worker_id;
                if (displayId && displayId !== 'none') {
                    profileUrl = `worker-profile.html?id=${displayId}`;
                }
            } else if (fromType === 'site' && record.site_name && record.site_name !== 'none') {
                displayName = record.site_name;
                displayId = record.site_id;
                if ((!displayId || displayId === 'none') && displayName) {
                    const match = sitesData.find(s => s.site_name === displayName);
                    if (match) displayId = match.site_id;
                }
                if (displayId && displayId !== 'none') {
                    profileUrl = `site-profile.html?id=${displayId}`;
                }
            } else {
                // For 'other' or fallback, use from_name
                displayName = record.from_name || 'Unknown';
            }
        }
        
        // Make name clickable if we have a profile URL
        let nameHtml = `<div style="font-weight: 600;">${displayName}</div>`;
        if (profileUrl) {
            nameHtml = `
                <a href="${profileUrl}" style="text-decoration: none; color: #3498db; font-weight: 600; cursor: pointer;">
                    ${displayName}
                </a>
            `;
        }
        
        return `
            <tr>
                <td>${startIdx + index + 1}</td>
                <td>${date}</td>
                <td>
                    ${nameHtml}
                    ${note ? `<div style="font-size: 0.75rem; color: var(--gray-600); margin-top: 0.25rem;">${note}</div>` : ''}
                </td>
                <td><span class="amount-positive">+₹${amount.toFixed(2)}</span></td>
                <td>${mode}</td>
            </tr>
        `;
    }).join('');
    
    countEl.textContent = `${totalRecords} record${totalRecords !== 1 ? 's' : ''}`;
    totalEl.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);
    
    if (recordDate.getTime() === today.getTime()) {
        return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (recordDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Open add received modal
function openAddReceivedModal() {
    const modal = document.getElementById('addReceivedModal');
    modal.classList.add('active');
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('receivedDate').value = today;
    
    // Load sites for context dropdown
    populateReceivedSiteDropdown();
    
    // Reset form to default (Worker type)
    document.getElementById('fromType').value = 'worker';
    updateFromTypeOptions();
    document.getElementById('receivedSite').value = '';
    document.getElementById('receivedSiteId').value = '';
    document.getElementById('fromName').value = '';
    document.getElementById('fromWorker').value = '';
    document.getElementById('fromWorkerId').value = '';
    document.getElementById('fromSite').value = '';
    document.getElementById('fromSiteId').value = '';
    document.getElementById('receivedAmount').value = '';
    document.getElementById('paymentMode').value = '';
    document.getElementById('receivedNote').value = '';
    document.getElementById('workerSearch').value = '';
}

// Close add received modal
function closeAddReceivedModal() {
    const modal = document.getElementById('addReceivedModal');
    modal.classList.remove('active');
}

// Update form based on From Type selection
function updateFromTypeOptions() {
    const fromType = document.getElementById('fromType').value;
    
    // Show/hide appropriate input sections
    document.getElementById('manualFromWrapper').style.display = fromType === 'other' ? 'block' : 'none';
    document.getElementById('workerFromWrapper').style.display = fromType === 'worker' ? 'block' : 'none';
    document.getElementById('siteFromWrapper').style.display = fromType === 'site' ? 'block' : 'none';
    
    // Hide context site dropdown when "Site" is selected as source (to avoid duplicate)
    const receivedSiteGroup = document.getElementById('receivedSite').closest('.form-group');
    if (receivedSiteGroup) {
        receivedSiteGroup.style.display = fromType === 'site' ? 'none' : 'block';
    }
    
    // Populate dropdowns if needed
    if (fromType === 'worker') {
        populateWorkerSelectDropdown();
        setupWorkerSearch();
    } else if (fromType === 'site') {
        populateSiteSelectDropdown();
    }
    
    // Clear fields
    document.getElementById('fromName').value = '';
    document.getElementById('fromWorker').value = '';
    document.getElementById('fromWorkerId').value = '';
    document.getElementById('fromSite').value = '';
    document.getElementById('fromSiteId').value = '';
}

// Populate worker dropdown in form
function populateWorkerSelectDropdown() {
    const select = document.getElementById('fromWorker');
    select.innerHTML = '<option value="">Choose Worker...</option>';
    
    if (workersData.length === 0) return;
    
    workersData.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.worker_id;
        option.dataset.workerId = worker.worker_id;
        option.textContent = `${worker.name || 'Unknown'} ${worker.phone ? '(' + worker.phone + ')' : ''}`;
        select.appendChild(option);
    });
}

// Setup worker search functionality
function setupWorkerSearch() {
    const searchInput = document.getElementById('workerSearch');
    const select = document.getElementById('fromWorker');
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const options = select.querySelectorAll('option');
        
        options.forEach(option => {
            if (option.value === '') return;
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
}

// Populate site dropdown for context
function populateReceivedSiteDropdown() {
    const select = document.getElementById('receivedSite');
    select.innerHTML = '<option value="">Select Site</option>';
    
    if (sitesData.length === 0) return;
    
    sitesData.forEach(site => {
        const option = document.createElement('option');
        option.value = site.site_name || '';
        option.dataset.siteId = site.site_id || '';
        option.textContent = site.site_name || 'Unknown';
        select.appendChild(option);
    });
    
    // Update hidden ID field when site selected
    select.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        document.getElementById('receivedSiteId').value = selectedOption.dataset.siteId || '';
    });
}

// Populate site dropdown in form
function populateSiteSelectDropdown() {
    const select = document.getElementById('fromSite');
    select.innerHTML = '<option value="">Choose Site...</option>';
    
    if (sitesData.length === 0) return;
    
    sitesData.forEach(site => {
        const option = document.createElement('option');
        option.value = site.site_id;
        option.textContent = site.site_name || 'Unknown';
        select.appendChild(option);
    });
}

// Auto-fill from name when worker is selected
function updateFromNameFromWorker() {
    const select = document.getElementById('fromWorker');
    const workerId = select.value;
    const selectedOption = select.options[select.selectedIndex];
    
    if (workerId) {
        const worker = workersData.find(w => String(w.worker_id) === String(workerId));
        if (worker) {
            document.getElementById('fromName').value = worker.name || '';
            document.getElementById('fromWorkerId').value = worker.worker_id || '';
        }
    } else {
        document.getElementById('fromName').value = '';
        document.getElementById('fromWorkerId').value = '';
    }
}

// Auto-fill from name when site is selected
function updateFromNameFromSite() {
    const select = document.getElementById('fromSite');
    const siteId = select.value;
    
    if (siteId) {
        const site = sitesData.find(s => String(s.site_id) === String(siteId));
        if (site) {
            document.getElementById('fromName').value = site.site_name || '';
            document.getElementById('fromSiteId').value = site.site_id || '';
        }
    } else {
        document.getElementById('fromName').value = '';
        document.getElementById('fromSiteId').value = '';
    }
}
// Submit received payment
async function submitReceivedPayment(event) {
    event.preventDefault();
    
    const date = document.getElementById('receivedDate').value;
    const siteId = document.getElementById('receivedSiteId').value || 'none';
    const siteName = document.getElementById('receivedSite').value || 'none';
    const fromType = document.getElementById('fromType').value;
    const fromName = document.getElementById('fromName').value.trim();
    const amount = document.getElementById('receivedAmount').value;
    const paymentMode = document.getElementById('paymentMode').value;
    const note = document.getElementById('receivedNote').value.trim();
    
    // Get worker/site ID if applicable
    let fromWorkerId = '';
    let fromSiteId = '';
    
    if (fromType === 'worker') {
        fromWorkerId = document.getElementById('fromWorkerId').value || document.getElementById('fromWorker').value;
    } else if (fromType === 'site') {
        fromSiteId = document.getElementById('fromSiteId').value || document.getElementById('fromSite').value;
    }
    
    if (!date || !fromName || !amount || !paymentMode) {
        alert('❌ Please fill all required fields');
        return;
    }
    
    if (parseFloat(amount) <= 0) {
        alert('❌ Amount must be greater than 0');
        return;
    }
    
    try {
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '💾 Saving...';
        
        // Prepare data for Google Sheets
        const data = {
            date: date,
            site_id: siteId,
            site_name: siteName,
            worker_id: fromWorkerId || 'none',
            worker_name: fromType === 'worker' ? fromName : 'none',
            from_name: fromName,
            from_type: fromType,
            amount: parseFloat(amount),
            payment_mode: paymentMode,
            note: note || ''
        };
        
        console.log('📤 Submitting received payment:', data);
        
        // Submit via improved JSONP function with retry logic
        try {
            const response = await jsonpRequest('addReceived', data);
            
            if (response && (response.status === 'success' || response.success)) {
                alert('✅ Received payment added successfully!');
                closeAddReceivedModal();
                document.getElementById('receivedForm').reset();
                await loadReceivedPayments();
            } else {
                const errMsg = response?.message || 'Failed to save received payment';
                throw new Error(errMsg);
            }
        } catch (retryErr) {
            console.warn('First attempt failed, retrying...', retryErr);
            try {
                const response = await jsonpRequest('addReceived', data);
                if (response && (response.status === 'success' || response.success)) {
                    alert('✅ Received payment added successfully!');
                    closeAddReceivedModal();
                    document.getElementById('receivedForm').reset();
                    await loadReceivedPayments();
                } else {
                    throw new Error(response?.message || 'Failed to save received payment');
                }
            } catch (finalErr) {
                throw finalErr;
            }
        }
    } catch (error) {
        console.error('❌ Error submitting received payment:', error);
        alert('❌ Failed to save: ' + error.message);
    } finally {
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Save Payment';
        }
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('addReceivedModal');
    if (event.target === modal) {
        closeAddReceivedModal();
    }
});

// Pagination functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTransactions(getFilteredData());
    }
}

function nextPage() {
    const filteredData = getFilteredData();
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTransactions(getFilteredData());
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Received Payments page...');
    loadReceivedPayments();
});

// Reload data when page becomes visible (after adding payment)
window.addEventListener('focus', () => {
    console.log('Page focused, reloading data...');
    loadReceivedPayments();
});
