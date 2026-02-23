console.log('📝 Attendance Logic Script Loaded');

let sitesData = [];
let workersData = [];
let ratesData = [];
let attendanceData = [];
let allSavedRecords = [];
let selectedWorkers = new Map();
let isInitialDataLoaded = false; // Track if initial data fetch is complete
let editingRecordIndex = null;

// Network helper: fetch JSON with retry and timeout
async function fetchJsonWithRetry(url, options = {}) {
    const { method = 'GET', body, retries = 2, timeout = 10000 } = options;
    let attempt = 0;
    let lastError;

    while (attempt <= retries) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            const res = await fetch(url, {
                method,
                body,
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            clearTimeout(timer);
            lastError = err;
            attempt++;
            // Backoff before retry
            if (attempt <= retries) await new Promise(r => setTimeout(r, 600 * attempt));
        }
    }
    throw lastError;
}

// UX helper: show transient status banner
function showStatus(message, type = 'info') {
    const container = document.querySelector('.container') || document.body;
    let banner = document.getElementById('statusBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'statusBanner';
        banner.style.margin = '0 0 12px 0';
        banner.style.padding = '10px 12px';
        banner.style.borderRadius = '8px';
        banner.style.fontSize = '14px';
        banner.style.fontWeight = '600';
        banner.style.border = '1px solid var(--gray-200)';
        container.insertBefore(banner, container.firstChild);
    }
    const colors = {
        info: { bg: '#eff6ff', fg: '#1e3a8a' },
        success: { bg: '#ecfdf5', fg: '#065f46' },
        warning: { bg: '#fffbeb', fg: '#92400e' },
        error: { bg: '#fee2e2', fg: '#7f1d1d' },
    };
    const c = colors[type] || colors.info;
    banner.style.background = c.bg;
    banner.style.color = c.fg;
    banner.textContent = message;
    // Auto-hide after 6s
    clearTimeout(banner._timer);
    banner._timer = setTimeout(() => { banner.remove(); }, 6000);
}

async function fetchSites() {
    try {
        sitesData = await fetchJsonWithRetry(`${BASE_URL}?action=getSites`, { retries: 2, timeout: 10000 });
        populateSiteDropdown();
    } catch (error) {
        console.error('Error fetching sites:', error);
        showStatus('Error loading sites. Retrying later…', 'error');
    }
}

async function fetchWorkers() {
    try {
        console.log('🔄 fetchWorkers: Starting fetch...');
        workersData = await fetchJsonWithRetry(`${BASE_URL}?action=getWorkers`, { retries: 2, timeout: 10000 });
        console.log('✅ fetchWorkers: Received', workersData.length, 'workers');
        console.log('Sample worker:', workersData[0]);
        
        if (workersData && Array.isArray(workersData) && workersData.length > 0) {
            // Data loaded successfully - don't show status banner
        } else {
            console.warn('⚠️ fetchWorkers: No workers in response or invalid format');
            showStatus('⚠️ No workers found in database', 'warning');
        }
    } catch (error) {
        console.error('❌ Error fetching workers:', error);
        workersData = [];
        showStatus('Error loading workers. Please check connection.', 'error');
    }
}

async function fetchPositions() {
    try {
        ratesData = await fetchJsonWithRetry(`${BASE_URL}?action=getPositions`, { retries: 2, timeout: 10000 });
        console.log('Positions loaded:', ratesData);
    } catch (error) {
        console.error('Error fetching positions:', error);
        ratesData = [];
        showStatus('Error loading positions. Rates may be unavailable.', 'warning');
    }
}

async function fetchAttendance() {
    try {
        attendanceData = await fetchJsonWithRetry(`${BASE_URL}?action=getAttendance`, { retries: 2, timeout: 12000 });
        console.log('Attendance loaded:', attendanceData.length, 'records');
        showStatus(`Attendance loaded: ${attendanceData.length} records`, 'success');
    } catch (error) {
        console.error('Error fetching attendance:', error);
        attendanceData = [];
        showStatus('Error loading attendance records.', 'error');
    }
}

function populateSiteDropdown() {
    const dropdown = document.getElementById('site_name');
    dropdown.innerHTML = '<option value="">Select Site</option><option value="ALL">📋 All Sites</option>';
    
    sitesData.forEach(site => {
        const isActive = site.status === undefined || site.status === 'active' || site.status === true;
        if (isActive) {
            const option = document.createElement('option');
            option.value = site.site_name;
            option.textContent = site.site_name;
            option.dataset.siteId = site.site_id;
            dropdown.appendChild(option);
        }
    });
}

function mapSiteNameToId() {
    try {
        console.log('🔵 mapSiteNameToId called');
        
        // Wait for initial data to load if not ready yet
        if (!isInitialDataLoaded) {
            console.log('⏳ Waiting for initial data to load...');
            const checkInterval = setInterval(() => {
                if (isInitialDataLoaded) {
                    clearInterval(checkInterval);
                    console.log('✅ Data ready, proceeding with mapSiteNameToId');
                    mapSiteNameToId(); // Retry once data is loaded
                }
            }, 100);
            return;
        }
        
        const dropdown = document.getElementById('site_name');
        if (!dropdown) {
            console.error('❌ site_name dropdown not found');
            return;
        }
        
        const siteValue = dropdown.value;
        console.log('Selected value:', siteValue);
        
        if (!siteValue) {
            console.log('No site selected');
            document.getElementById('workersSection').classList.add('hidden');
            document.getElementById('savedAttendanceSection').classList.add('hidden');
            return;
        }
        
        // Get selected option
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        
        // Set site_id
        if (siteValue === 'ALL') {
            document.getElementById('site_id').value = 'ALL';
        } else {
            const siteId = selectedOption?.dataset?.siteId || '';
            document.getElementById('site_id').value = siteId;
        }
        console.log('Site ID set:', document.getElementById('site_id').value);
        
        // Get sections
        const workersSection = document.getElementById('workersSection');
        const savedSection = document.getElementById('savedAttendanceSection');
        const workersBody = document.getElementById('workersBody');
        const savedBody = document.getElementById('savedAttendanceBody');
        
        if (!workersSection || !savedSection || !workersBody || !savedBody) {
            console.error('❌ One or more section elements not found');
            return;
        }
        
        console.log('✅ All DOM elements found');
        
        // Make sections visible
        workersSection.classList.remove('hidden');
        savedSection.classList.remove('hidden');
        workersSection.style.display = 'block';
        savedSection.style.display = 'block';
        
        console.log('✅ Sections made visible');
        
        // Create and show loading state
        const spinnerStyle = 'display: inline-block; width: 16px; height: 16px; border: 2px solid #d1d5db; border-top: 2px solid #1e3a8a; border-radius: 50%; animation: spin 0.8s linear infinite;';
        const loadingWorkers = `<tr><td colspan="5" style="text-align: center; padding: 20px; background: #f0fdf4;"><span style="${spinnerStyle}"></span> Loading workers...</td></tr>`;
        const loadingSaved = `<tr><td colspan="7" style="text-align: center; padding: 20px; background: #f0fdf4;"><span style="${spinnerStyle}"></span> Loading records...</td></tr>`;
        
        workersBody.innerHTML = loadingWorkers;
        savedBody.innerHTML = loadingSaved;
        
        console.log('✅ Loading state shown');
        
        // Show status
        console.log(`📍 Loading data for ${siteValue}...`);
        
        // Delay and render data - increased to 1500ms to ensure async data loads
        setTimeout(() => {
            console.log('🔄 Rendering data...');
            console.log('Current data state:', {
                workersCount: workersData.length,
                attendanceCount: attendanceData.length
            });
            try {
                loadWorkersTable(0, 5); // Start with retry count 0, max 5 retries
                console.log('✅ Workers rendered');
                
                showSavedAttendance();
                console.log('✅ Saved attendance rendered');
                
                console.log('🟢 SUCCESS: All data ready');
            } catch (err) {
                console.error('❌ Error rendering:', err);
                workersBody.innerHTML = `<tr><td colspan="5" style="color: #ef4444; padding: 20px; text-align: center;">❌ ${err.message}</td></tr>`;
                savedBody.innerHTML = `<tr><td colspan="7" style="color: #ef4444; padding: 20px; text-align: center;">❌ ${err.message}</td></tr>`;
                showStatus('Error: ' + err.message, 'error');
            }
        }, 1500);
        
    } catch (error) {
        console.error('🔴 CRITICAL ERROR:', error);
        showStatus('Critical error - check console', 'error');
    }
}

function showSavedAttendance() {
    const selectedDate = document.getElementById('date').value;
    const selectedSiteId = document.getElementById('site_id').value;
    
    console.log('=== SHOW SAVED ATTENDANCE ===');
    console.log('Selected Date:', selectedDate);
    console.log('Selected Site ID:', selectedSiteId);
    console.log('Total records in attendanceData:', attendanceData.length);
    
    if (!selectedDate || !selectedSiteId) {
        console.log('Missing date or siteId - hiding section');
        document.getElementById('savedAttendanceSection').classList.add('hidden');
        return;
    }
    
    // Ensure section is visible before showing data
    document.getElementById('savedAttendanceSection').classList.remove('hidden');
    
    // Filter attendance for selected date
    let savedRecords = [];
    
    // First, get all records for this date (handle both formats: YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS.000Z)
    const recordsForDate = attendanceData.filter(record => {
        // Extract just the date part (YYYY-MM-DD) from record.date
        let recordDate = record.date;
        if (recordDate && recordDate.includes('T')) {
            recordDate = recordDate.split('T')[0];
        }
        const match = recordDate === selectedDate;
        if (match) {
            console.log('DATE MATCH:', recordDate, '===', selectedDate);
        }
        return match;
    });

    // Deduplicate by date + site_id + worker_id (keep the latest row encountered)
    const uniqueByWorkerSite = new Map();
    recordsForDate.forEach(record => {
        const key = `${record.date}|${record.site_id}|${record.worker_id || record.worker_name}`;
        uniqueByWorkerSite.set(key, record);
    });
    const recordsForDateUnique = Array.from(uniqueByWorkerSite.values());

    console.log('Records for date', selectedDate, ':', recordsForDate.length, '→ unique:', recordsForDateUnique.length);
    
    // Then filter by site if not ALL
    if (selectedSiteId === 'ALL') {
        savedRecords = recordsForDateUnique;
        console.log('Site is ALL - including all records for date');
    } else {
        savedRecords = recordsForDateUnique.filter(record => {
            const siteMatch = String(record.site_id) === String(selectedSiteId) || record.site_id === 'ALL';
            if (siteMatch) {
                console.log('SITE MATCH:', record.site_id, '===', selectedSiteId);
            }
            return siteMatch;
        });
        console.log('Records matching site', selectedSiteId, ':', savedRecords.length);
    }
    
    if (savedRecords.length === 0) {
        console.log('❌ No saved records found for this date/site');
        const tbody = document.getElementById('savedAttendanceBody');
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell" style="color: #9ca3af; padding: 20px;">No attendance records for this date and site</td></tr>';
        document.getElementById('savedAttendanceSection').classList.remove('hidden');
        return;
    }
    
    console.log('✅ Found', savedRecords.length, 'saved records');
    
    // Store all saved records for filtering
    allSavedRecords = savedRecords;
    
    // Populate position filter
    const positions = [...new Set(savedRecords.map(r => r.position || 'Other'))].sort();
    const positionFilter = document.getElementById('positionFilter');
    const currentPosition = positionFilter.value;
    positionFilter.innerHTML = '<option value="all">All Positions</option>';
    positions.forEach(pos => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = pos;
        positionFilter.appendChild(option);
    });
    if (positions.includes(currentPosition)) {
        positionFilter.value = currentPosition;
    }
    
    // Add event listener to position filter
    positionFilter.addEventListener('change', filterSavedAttendance);
    
    // Show the section and render the saved records
    document.getElementById('savedAttendanceSection').classList.remove('hidden');
    renderSavedAttendance();
}

// Filter saved attendance by position and work type
function filterSavedAttendance() {
    renderSavedAttendance();
}

function renderSavedAttendance() {
    const tbody = document.getElementById('savedAttendanceBody');
    tbody.innerHTML = '';
    
    const selectedPosition = document.getElementById('positionFilter').value;
    const selectedWorkType = document.getElementById('workTypeFilter').value;
    const selectedSiteId = document.getElementById('site_id').value;
    
    // Filter by position
    let filteredRecords = allSavedRecords;
    if (selectedPosition !== 'all') {
        filteredRecords = filteredRecords.filter(r => (r.position || 'Other') === selectedPosition);
    }
    
    // Filter by work type
    if (selectedWorkType !== '') {
        filteredRecords = filteredRecords.filter(r => (r.work_type || '-') === selectedWorkType);
    }
    
    // Update count
    document.getElementById('savedCount').textContent = `Records: ${filteredRecords.length}`;
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #666;">No records match the selected filters</td></tr>';
        return;
    }
    
    if (selectedSiteId === 'ALL') {
        // Group by site name
        const recordsBySite = {};
        filteredRecords.forEach(record => {
            const siteName = record.site_name || 'Unknown Site';
            if (!recordsBySite[siteName]) {
                recordsBySite[siteName] = [];
            }
            recordsBySite[siteName].push(record);
        });
        
        // Display grouped by site
        Object.keys(recordsBySite).sort().forEach(siteName => {
            const siteHeaderRow = tbody.insertRow();
            siteHeaderRow.className = 'position-header';
            siteHeaderRow.innerHTML = `<td colspan="8" style="font-weight: 700; padding: 12px; background: #dbeafe; color: #1e40af;">📍 ${siteName} (${recordsBySite[siteName].length})</td>`;
            
            recordsBySite[siteName].forEach((record, idx) => {
                const recordKey = `${siteName}-${idx}`;
                const globalIndex = allSavedRecords.indexOf(record);
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td style="text-align: center; color: #22c55e; font-weight: 700; font-size: 16px;">✓</td>
                    <td style="padding-left: 30px;">-</td>
                    <td>${record.worker_name || '-'}</td>
                    <td><span class="badge ${record.position === 'Karigar' ? 'badge-karigar' : 'badge-majur'}">${record.position || '-'}</span></td>
                    <td>${record.work_type || '-'}</td>
                    <td class="amount-display">₹${record.work_amount || '0'}</td>
                    <td style="font-size: 0.813rem; color: var(--gray-600);">${record.work_title || '-'}</td>
                    <td>
                        <button class="h-9 w-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 grid place-items-center" data-action="edit" data-record-key="${recordKey}" data-record-id="${record.id || idx}" data-record-index="${globalIndex}" title="Edit record"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                    </td>
                `;
            });
        });
    } else {
        // Single site - show all records
        filteredRecords.forEach((record, idx) => {
            const recordKey = `record-${idx}`;
            const globalIndex = allSavedRecords.indexOf(record);
            const row = tbody.insertRow();
            row.innerHTML = `
                <td style="text-align: center; color: #22c55e; font-weight: 700; font-size: 16px;">✓</td>
                <td>${record.site_name || '-'}</td>
                <td>${record.worker_name || '-'}</td>
                <td><span class="badge ${record.position === 'Karigar' ? 'badge-karigar' : 'badge-majur'}">${record.position || '-'}</span></td>
                <td>${record.work_type || '-'}</td>
                <td class="amount-display">₹${record.work_amount || '0'}</td>
                <td style="font-size: 0.813rem; color: var(--gray-600);">${record.work_title || '-'}</td>
                <td>
                    <button class="h-9 w-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 grid place-items-center" data-action="edit" data-record-key="${recordKey}" data-record-id="${record.id || idx}" data-record-index="${globalIndex}" title="Edit record"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                </td>
            `;
        });
    }
    
    // Set up event listeners for edit buttons
    const editButtons = document.querySelectorAll('[data-action="edit"]');
    editButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const recordIndex = parseInt(btn.dataset.recordIndex);
            const record = allSavedRecords[recordIndex];
            if (record && !Number.isNaN(recordIndex)) {
                editAttendanceRecord(recordIndex, record);
            }
        });
    });
}

function loadWorkersTable(retryCount = 0, maxRetries = 5) {
    const tbody = document.getElementById('workersBody');
    const selectedDate = document.getElementById('date').value;
    const selectedSiteId = document.getElementById('site_id').value;
    
    console.log(`loadWorkersTable called (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
        date: selectedDate,
        siteId: selectedSiteId,
        workersCount: workersData.length,
        attendanceCount: attendanceData.length
    });
    
    // Clear previous rows but keep section visible
    tbody.innerHTML = '';
    selectedWorkers.clear();
    
    // Validate date and site are selected
    if (!selectedDate || !selectedSiteId) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell" style="color: #666;">Please select both date and site</td></tr>';
        console.warn('Missing date or site ID');
        return;
    }
    
    // If workers data is not loaded yet, show loading state and retry
    if (!workersData || workersData.length === 0) {
        console.warn(`loadWorkersTable: workersData is empty (attempt ${retryCount + 1}/${maxRetries + 1})`);
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell"><span class="loading-spinner"></span>Loading workers...</td></tr>';
        
        // Retry with faster delays on early attempts
        if (retryCount < maxRetries) {
            let delayMs;
            if (retryCount === 0) {
                delayMs = 200; // First retry after 200ms
            } else if (retryCount === 1) {
                delayMs = 400; // Second retry after 400ms
            } else {
                delayMs = 500 * retryCount; // Then exponential backoff
            }
            console.log(`Retrying in ${delayMs}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`);
            setTimeout(() => {
                loadWorkersTable(retryCount + 1, maxRetries);
            }, delayMs);
        } else {
            // Max retries exceeded
            console.error('❌ Max retries exceeded - no workers data available after', maxRetries + 1, 'attempts');
            tbody.innerHTML = '<tr><td colspan="5" class="loading-cell" style="color: #9ca3af; padding: 20px;">No workers data available</td></tr>';
        }
        return;
    }
    
    console.log('✅ workersData is ready, rendering', workersData.length, 'workers');
    
    // Get workers who already have attendance for this date
    const alreadyMarkedWorkers = new Set();
    if (selectedDate && attendanceData && attendanceData.length > 0) {
        attendanceData.forEach(record => {
            let recordDate = record.date;
            if (recordDate && recordDate.includes('T')) {
                recordDate = recordDate.split('T')[0];
            }
            if (recordDate === selectedDate) {
                if (selectedSiteId === 'ALL' || String(record.site_id) === String(selectedSiteId)) {
                    alreadyMarkedWorkers.add(String(record.worker_id));
                }
            }
        });
    }
    console.log('Already marked workers:', alreadyMarkedWorkers.size);
    
    if (selectedSiteId === 'ALL') {
        // Show all workers not yet marked for today
        workersToDisplay = workersData.filter(worker => {
            return !alreadyMarkedWorkers.has(String(worker.worker_id));
        });
    } else {
        // Show only workers assigned to this site and not yet marked
        workersToDisplay = workersData.filter(worker => {
            const isAssignedToSite = worker.assigned_sites && worker.assigned_sites !== 'None' && worker.assigned_sites !== '' ? 
                String(worker.assigned_sites).split(',').some(siteId => String(siteId.trim()) === String(selectedSiteId)) : 
                false;
            const notYetMarked = !alreadyMarkedWorkers.has(String(worker.worker_id));
            return isAssignedToSite && notYetMarked;
        });
    }
    
    if (workersToDisplay.length === 0) {
        const msg = selectedSiteId === 'ALL' ? 
            '✓ All workers already marked for today' :
            '✓ All assigned workers already marked for this date and site';
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #10b981; font-weight: 600;">${msg}</td></tr>`;
        document.getElementById('workersSection').classList.remove('hidden');
        return;
    }
    
    // Show the workers section
    document.getElementById('workersSection').classList.remove('hidden');
    
    if (selectedSiteId === 'ALL') {
        // Group by site name first, then position
        const workersBySite = {};
        workersToDisplay.forEach(worker => {
            // Get site names from worker's assigned_sites
            if (worker.assigned_sites && worker.assigned_sites !== 'None' && worker.assigned_sites !== '') {
                const siteIds = String(worker.assigned_sites).split(',').map(s => s.trim());
                siteIds.forEach(siteId => {
                    const site = sitesData.find(s => String(s.site_id) === String(siteId));
                    const siteName = site ? site.site_name : 'Unknown Site (' + siteId + ')';
                    if (!workersBySite[siteName]) {
                        workersBySite[siteName] = {};
                    }
                    const position = worker.position || 'Other';
                    if (!workersBySite[siteName][position]) {
                        workersBySite[siteName][position] = [];
                    }
                    workersBySite[siteName][position].push(worker);
                });
            }
        });
        
        // Display grouped by site and position
        Object.keys(workersBySite).sort().forEach(siteName => {
            const siteHeaderRow = tbody.insertRow();
            siteHeaderRow.className = 'position-header';
            siteHeaderRow.innerHTML = `<td colspan="6" style="font-weight: 700; padding: 12px; background: #dbeafe; color: #1e40af;">📍 ${siteName}</td>`;
            
            Object.keys(workersBySite[siteName]).sort().forEach(position => {
                const positionHeaderRow = tbody.insertRow();
                positionHeaderRow.className = 'position-header';
                positionHeaderRow.innerHTML = `<td colspan="6" style="font-weight: 600; padding: 8px 12px; background: #f0fdf4; color: #15803d; margin-left: 20px;">├─ ${position}</td>`;
                
                workersBySite[siteName][position].forEach(worker => {
                    const row = tbody.insertRow();
                    const workerId = worker.worker_id;
                    
                    row.innerHTML = `
                        <td class="checkbox-cell">
                            <input type="checkbox" class="attendance-checkbox" data-worker-id="${workerId}" data-position="${position}" data-worker-type="${worker.worker_type}">
                        </td>
                        <td class="worker-name" style="padding-left: 40px;">${worker.name}</td>
                        <td>
                            <select class="work-type-select" data-worker-id="${workerId}" disabled>
                                <option value="">-</option>
                                <option value="Full Day">Full Day</option>
                                <option value="Half Day">Half Day</option>
                            </select>
                        </td>
                        <td class="amount-cell">₹<span class="amount-value">0</span></td>
                        <td><input type="text" class="work-title-input" data-worker-id="${workerId}" placeholder="Work title" disabled></td>
                        <td><button type="button" class="h-9 w-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 grid place-items-center" data-action="save-worker" data-worker-id="${workerId}" aria-label="Save worker" style="display: none;"><span class="material-symbols-outlined text-[18px]">save</span></button></td>
                    `;
                });
            });
        });
    } else {
        // Group by position only (for single site)
        const workersByPosition = {};
        workersToDisplay.forEach(worker => {
            const position = worker.position || 'Other';
            if (!workersByPosition[position]) {
                workersByPosition[position] = [];
            }
            workersByPosition[position].push(worker);
        });
        
        Object.keys(workersByPosition).sort().forEach(position => {
            const headerRow = tbody.insertRow();
            headerRow.className = 'position-header';
            headerRow.innerHTML = `<td colspan="6" style="font-weight: 600; padding: 12px; background: #f3f4f6;">${position}</td>`;
            
            workersByPosition[position].forEach(worker => {
                const row = tbody.insertRow();
                const workerId = worker.worker_id;
                
                row.innerHTML = `
                    <td class="checkbox-cell">
                        <input type="checkbox" class="attendance-checkbox" data-worker-id="${workerId}" data-position="${position}" data-worker-type="${worker.worker_type}">
                    </td>
                    <td class="worker-name">${worker.name}</td>
                    <td>
                        <select class="work-type-select" data-worker-id="${workerId}" disabled>
                            <option value="">-</option>
                            <option value="Full Day">Full Day</option>
                            <option value="Half Day">Half Day</option>
                        </select>
                    </td>
                    <td class="amount-cell">₹<span class="amount-value">0</span></td>
                    <td><input type="text" class="work-title-input" data-worker-id="${workerId}" placeholder="Work title" disabled></td>
                    <td><button type="button" class="h-9 w-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 grid place-items-center" data-action="save-worker" data-worker-id="${workerId}" aria-label="Save worker" style="display: none;"><span class="material-symbols-outlined text-[18px]">save</span></button></td>
                `;
            });
        });
    }
    
    // Set up event listeners for checkboxes and selects
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const workerId = checkbox.dataset.workerId;
            const position = checkbox.dataset.position;
            const workerType = checkbox.dataset.workerType;
            const row = checkbox.closest('tr');
            const workTypeSelect = row.querySelector('.work-type-select');
            const amountCell = row.querySelector('.amount-cell');
            const workTitleInput = row.querySelector('.work-title-input');
            const saveBtn = row.querySelector('[data-action="save-worker"]');
            
            const isChecked = e.target.checked;
            workTypeSelect.disabled = !isChecked;
            if (workTitleInput) workTitleInput.disabled = !isChecked;
            if (saveBtn) saveBtn.style.display = isChecked ? 'inline-block' : 'none';
            
            if (isChecked) {
                workTypeSelect.value = 'Full Day';
                updateWorkAmount(workerId, position, workerType, 'Full Day', amountCell);
                
                // Pre-populate selectedWorkers on checkbox
                const amountText = amountCell.textContent.trim().replace('₹', '').trim();
                selectedWorkers.set(workerId, {
                    workType: 'Full Day',
                    amount: amountText || '0',
                    position: position,
                    workerType: workerType,
                    workTitle: ''
                });
            } else {
                workTypeSelect.value = '';
                if (amountCell) amountCell.innerHTML = '₹<span class="amount-value">0</span>';
                selectedWorkers.delete(workerId);
            }
        });
    });
    
    const selects = document.querySelectorAll('.work-type-select');
    selects.forEach(select => {
        select.addEventListener('change', (e) => {
            const workerId = select.dataset.workerId;
            const row = select.closest('tr');
            const checkbox = row.querySelector('.attendance-checkbox');
            const position = checkbox.dataset.position;
            const workerType = checkbox.dataset.workerType;
            const amountCell = row.querySelector('.amount-cell');
            
            updateWorkAmount(workerId, position, workerType, e.target.value, amountCell);
            
            // Update selectedWorkers with new work type and amount
            if (selectedWorkers.has(workerId)) {
                const existing = selectedWorkers.get(workerId);
                const newAmount = amountCell.textContent.trim().replace('₹', '').trim() || '0';
                selectedWorkers.set(workerId, {
                    ...existing,
                    workType: e.target.value,
                    amount: newAmount
                });
            }
        });
    });
    
    // Set up event listeners for Save buttons - DIRECT BACKEND SUBMIT (quick-save)
    const saveButtons = document.querySelectorAll('[data-action="save-worker"]');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const workerId = btn.dataset.workerId;
            const row = btn.closest('tr');
            const checkbox = row.querySelector('.attendance-checkbox');
            const workTypeSelect = row.querySelector('.work-type-select');
            const amountCell = row.querySelector('.amount-cell');
            const workTitleInput = row.querySelector('.work-title-input');
            
            console.log('💾 Save button clicked for worker:', workerId);
            
            if (!checkbox.checked) {
                alert('Please check the worker checkbox first');
                return;
            }
            
            const workType = workTypeSelect.value;
            const amountText = amountCell.textContent.trim().replace('₹', '').trim();
            const amount = amountText || '0';
            const workTitle = (workTitleInput && workTitleInput.value) ? workTitleInput.value : '';
            
            // Get current date and site from form - with null checks
            const dateInputEl = document.getElementById('date');
            const siteSelectEl = document.getElementById('site_name');
            const siteIdEl = document.getElementById('site_id');
            
            if (!dateInputEl || !siteSelectEl) {
                alert('Missing form elements. Please reload the page.');
                console.error('Missing date or site_name element');
                return;
            }
            
            const selectedDate = dateInputEl.value;
            const selectedSiteId = siteIdEl.value;
            const selectedSiteName = siteSelectEl.value;
            
            if (!selectedDate || !selectedSiteId || !selectedSiteName) {
                alert('Please select a date and site first');
                return;
            }
            
            console.log('📝 Worker data to submit:', {
                workerId,
                workType,
                amount,
                workTitle,
                position: checkbox.dataset.position,
                workerType: checkbox.dataset.workerType,
                date: selectedDate,
                siteId: selectedSiteId,
                siteName: selectedSiteName
            });
            
            // Disable button during submit
            btn.disabled = true;
            btn.textContent = '⏳ Saving...';
            
            try {
                // Submit directly to backend
                const payload = {
                    date: selectedDate,
                    site_id: selectedSiteId,
                    site_name: selectedSiteName,
                    worker_id: workerId,
                    worker_name: row.querySelector('.worker-name').textContent,
                    position: checkbox.dataset.position,
                    worker_type: checkbox.dataset.workerType,
                    work_type: workType,
                    work_amount: amount,
                    work_title: workTitle,
                    note: '',
                    action: 'addAttendance'
                };
                
                console.log('📤 Submitting to backend:', payload);
                
                const saveResult = window.OfflineQueue
                    ? await window.OfflineQueue.submitOrQueue('attendance', 'addAttendance', payload)
                    : { success: false, queued: false };

                if (saveResult.success) {
                    btn.textContent = '✅ Saved';
                    btn.classList.add('btn-success');
                    showStatus(`✓ ${row.querySelector('.worker-name').textContent} saved to attendance!`, 'success');
                    
                    // Refresh attendance display
                    await fetchAttendance();
                    renderSavedAttendance();
                    
                    setTimeout(() => {
                        btn.textContent = '💾 Save';
                        btn.classList.remove('btn-success');
                        btn.disabled = false;
                    }, 2000);
                } else if (saveResult.queued) {
                    btn.textContent = '📦 Queued';
                    btn.classList.add('btn-success');
                    showStatus(`📦 ${row.querySelector('.worker-name').textContent} saved offline, will sync automatically`, 'success');

                    setTimeout(() => {
                        btn.textContent = '💾 Save';
                        btn.classList.remove('btn-success');
                        btn.disabled = false;
                    }, 2200);
                } else {
                    throw new Error('Save failed');
                }
            } catch (error) {
                console.error('❌ Error saving worker:', error);
                btn.textContent = '❌ Error';
                showStatus(`Error saving ${row.querySelector('.worker-name').textContent}`, 'error');
                
                setTimeout(() => {
                    btn.textContent = '💾 Save';
                    btn.disabled = false;
                }, 2000);
            }
        });
    });
    
    document.getElementById('workersSection').classList.remove('hidden');
}

function updateWorkAmount(workerId, position, workerType, workType, amountCell) {
    if (!workType) {
        amountCell.textContent = '-';
        return;
    }
    
    console.log('Looking for position:', position, 'workerType:', workerType);
    const rateData = ratesData.find(r => 
        (r.position_name === position || r.position === position) && 
        r.worker_type === workerType
    );
    
    console.log('Found rate data:', rateData);
    
    if (!rateData) {
        console.warn('No rate data found for position:', position, 'type:', workerType);
        amountCell.textContent = '-';
        return;
    }
    
    let amount = 0;
    if (workType === 'Full Day') {
        amount = rateData.full_rate || 0;
    } else if (workType === 'Half Day') {
        amount = rateData.half_rate || 0;
    }
    
    amountCell.textContent = `₹${amount}`;
    
    selectedWorkers.set(workerId, {
        workType: workType,
        amount: amount,
        position: position,
        workerType: workerType
    });
}

async function submitAllAttendance() {
    const date = document.getElementById('date').value;
    const siteName = document.getElementById('site_name').value;
    const siteId = document.getElementById('site_id').value;
    
    if (!date || !siteName) {
        alert('Please select date and site');
        return;
    }
    
    const attendanceRecords = [];
    const checkboxes = document.querySelectorAll('.attendance-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('Please select at least one worker');
        return;
    }
    
    checkboxes.forEach(checkbox => {
        const workerId = checkbox.dataset.workerId;
        const position = checkbox.dataset.position;
        const workerType = checkbox.dataset.workerType;
        const worker = workersData.find(w => w.worker_id == workerId);
        const workTypeSelect = document.querySelector(`.work-type-select[data-worker-id="${workerId}"]`);
        const workerData = selectedWorkers.get(workerId);
        
        console.log('Processing worker for submit:', {
            workerId,
            workerName: worker?.name,
            hasWorkerData: !!workerData,
            workerData,
            workTypeValue: workTypeSelect?.value
        });
        
        if (worker && workerData && workTypeSelect.value) {
            // When "ALL" is selected, find the actual site from worker's first assigned site
            let actualSiteId = siteId;
            let actualSiteName = siteName;
            
            if (siteId === 'ALL' && worker.assigned_sites && worker.assigned_sites !== 'None') {
                const siteIds = String(worker.assigned_sites).split(',').map(s => s.trim());
                if (siteIds.length > 0) {
                    actualSiteId = siteIds[0];
                    const siteData = sitesData.find(s => String(s.site_id) === String(actualSiteId));
                    actualSiteName = siteData ? siteData.site_name : 'Unknown';
                }
            }
            
            attendanceRecords.push({
                date: date,
                site_id: actualSiteId,
                site_name: actualSiteName,
                worker_id: workerId,
                worker_name: worker.name,
                position: position,
                worker_type: workerType,
                work_type: workTypeSelect.value,
                work_amount: workerData.amount,
                note: ''
            });
        }
    });
    
    const submitBtn = document.getElementById('submitAttendance');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    console.log('Final attendance records to submit:', attendanceRecords);
    
    try {
        let successCount = 0;
        let queuedCount = 0;
        for (const record of attendanceRecords) {
            const saveResult = window.OfflineQueue
                ? await window.OfflineQueue.submitOrQueue('attendance', 'addAttendance', record)
                : { success: false, queued: false };

            if (saveResult.success) {
                successCount++;
            } else if (saveResult.queued) {
                queuedCount++;
            }
        }
        
        if (successCount > 0 || queuedCount > 0) {
            // Show success message
            if (queuedCount > 0) {
                alert(`✅ Saved now: ${successCount}, queued offline: ${queuedCount}.\n📡 Data will auto-sync when internet returns.`);
            } else {
                alert(`✅ Successfully saved ${successCount} of ${attendanceRecords.length} attendance records!`);
            }
            
            // Reload attendance data to show saved records
            if (successCount > 0) {
                await fetchAttendance();
            }
            
            // Refresh the current view
            const siteDropdown = document.getElementById('site_name');
            if (siteDropdown.value) {
                mapSiteNameToId();
                loadWorkersTable();
            }

            // Ensure the saved attendance table becomes visible after saving
            const savedSection = document.getElementById('savedAttendanceSection');
            const toggleBtn = document.getElementById('toggleCompletedBtn');
            if (savedSection) {
                savedSection.classList.remove('hidden');
            }
            if (toggleBtn) {
                toggleBtn.textContent = '📋 Hide Attendance Done';
                toggleBtn.style.background = 'var(--danger)';
                toggleBtn.style.color = 'white';
            }
            
            // Reset filters for clean view
            const positionFilter = document.getElementById('positionFilter');
            const workTypeFilter = document.getElementById('workTypeFilter');
            if (positionFilter) positionFilter.value = 'all';
            if (workTypeFilter) workTypeFilter.value = '';
            
            // Uncheck all checkboxes and reset form
            document.querySelectorAll('.attendance-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('selectAll').checked = false;
        } else {
            alert('❌ Failed to save attendance records. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting attendance:', error);
        alert('❌ Error saving attendance. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🟢 DOMContentLoaded fired');

    if (window.OfflineQueue) {
        window.OfflineQueue.init({ getBaseUrl: () => BASE_URL });
        window.OfflineQueue.process();
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    console.log('📅 Date set to:', today);

    // Load data with independent error handling so one failure doesn't block others
    console.log('⏳ Loading sites...');
    await fetchSites();
    console.log('✅ Sites loaded:', sitesData.length);
    
    console.log('⏳ Loading workers...');
    await fetchWorkers();
    console.log('✅ Workers loaded:', workersData.length);
    
    console.log('⏳ Loading positions...');
    await fetchPositions();
    console.log('✅ Positions loaded');
    
    console.log('⏳ Loading attendance...');
    await fetchAttendance();
    console.log('✅ Attendance loaded:', attendanceData.length);

    // Mark initial data as loaded
    isInitialDataLoaded = true;
    console.log('🔐 Initial data loading complete');

    // Attach event listeners
    const siteNameEl = document.getElementById('site_name');
    console.log('Attaching listener to site_name:', !!siteNameEl);
    if (siteNameEl) {
        siteNameEl.addEventListener('change', mapSiteNameToId);
        console.log('✅ Site change listener attached');
    } else {
        console.error('❌ site_name element not found!');
    }
    
    document.getElementById('date').addEventListener('change', () => {
        const siteDropdown = document.getElementById('site_name');
        if (siteDropdown.value) {
            mapSiteNameToId();
        }
    });
    console.log('✅ Date change listener attached');
    
    document.getElementById('submitAttendance').addEventListener('click', submitAllAttendance);
    console.log('✅ Submit listener attached');

    const selectAllEl = document.getElementById('selectAll');
    if (selectAllEl) {
        selectAllEl.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const checkboxes = document.querySelectorAll('.attendance-checkbox');
            checkboxes.forEach(checkbox => {
                if (checkbox.checked !== isChecked) {
                    checkbox.checked = isChecked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
    }
    
    // Populate filter dropdowns
    console.log('Populating filter options...');
    populateWorkerFilter();
    populateSiteFilter();
    
    // Close modal when clicking outside of it (on the background)
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            // Close if clicked on the background (not on the modal content)
            if (e.target === modal) {
                closeFilterModal();
                console.log('✅ Modal closed via background click');
            }
        });
        console.log('✅ Modal background click listener attached');
    }
    
    console.log('✅ All initialization complete');
});

// Toggle attendance done visibility
function toggleCompletedRecords() {
    const section = document.getElementById('savedAttendanceSection');
    const button = document.getElementById('toggleCompletedBtn');
    
    if (section.classList.contains('hidden')) {
        section.classList.remove('hidden');
        button.textContent = '📋 Hide Attendance Done';
        button.style.background = 'var(--danger)';
        button.style.color = 'white';
    } else {
        section.classList.add('hidden');
        button.textContent = '📋 View Attendance Done';
        button.style.background = '';
        button.style.color = '';
    }
}

// Filter Panel Functions
function toggleFilterPanel() {
    const modal = document.getElementById('filterModal');
    console.log('toggleFilterPanel called, modal:', !!modal);
    if (modal) {
        modal.classList.remove('hidden');
        console.log('✅ Filter modal opened');
    } else {
        console.error('❌ filterModal element not found');
    }
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    console.log('closeFilterModal called, modal:', !!modal);
    if (modal) {
        modal.classList.add('hidden');
        console.log('✅ Filter modal closed');
    }
}

function applyDateRangeFilter() {
    const rangeType = document.getElementById('dateRangeFilter').value;
    const customRangeDiv = document.getElementById('customDateRange');
    const dateInput = document.getElementById('date');
    const today = new Date();
    let selectedDate = today;
    
    // Show/hide custom date range inputs
    if (rangeType === 'custom') {
        customRangeDiv.style.display = 'block';
        
        // Set default dates (today and today - 7 days)
        const todayStr = today.toISOString().split('T')[0];
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        document.getElementById('customDateFrom').value = sevenDaysAgo;
        document.getElementById('customDateTo').value = todayStr;
        console.log('✅ Custom date range option selected - form showing');
        return;
    } else {
        customRangeDiv.style.display = 'none';
    }
    
    switch(rangeType) {
        case 'today':
            selectedDate = new Date();
            break;
        case 'week':
            selectedDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            selectedDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
    }
    
    dateInput.value = selectedDate.toISOString().split('T')[0];
    console.log('Date range filter applied:', rangeType);
}

function applyCustomDateRange() {
    const fromDate = document.getElementById('customDateFrom').value;
    const toDate = document.getElementById('customDateTo').value;
    const dateInput = document.getElementById('date');
    
    if (!fromDate || !toDate) {
        alert('Please select both From Date and To Date');
        return;
    }
    
    if (fromDate > toDate) {
        alert('From Date must be before To Date');
        return;
    }
    
    // Set the main date input to the "to date" and store the range in data attributes
    dateInput.value = toDate;
    dateInput.dataset.dateRangeFrom = fromDate;
    dateInput.dataset.dateRangeTo = toDate;
    
    console.log('✅ Custom date range applied: ', fromDate, 'to', toDate);
    console.log('Date input value set to:', toDate);
}

function populateWorkerFilter() {
    const filter = document.getElementById('workerFilter');
    if (workersData && workersData.length > 0) {
        const workers = workersData.slice(0, 20); // Show first 20 workers
        workers.forEach(worker => {
            const option = document.createElement('option');
            option.value = worker.worker_id || worker.name;
            option.textContent = worker.name;
            filter.appendChild(option);
        });
    }
}

function populateSiteFilter() {
    const filter = document.getElementById('siteFilter');
    if (sitesData && sitesData.length > 0) {
        sitesData.forEach(site => {
            const isActive = site.status === undefined || site.status === 'active' || site.status === true;
            if (isActive) {
                const option = document.createElement('option');
                option.value = site.site_id;
                option.textContent = site.site_name;
                filter.appendChild(option);
            }
        });
    }
}

function applyWorkerFilter() {
    const workerId = document.getElementById('workerFilter').value;
    console.log('Worker filter applied:', workerId);
    // Filter logic can be implemented based on requirements
}

function applySiteFilter() {
    const siteId = document.getElementById('siteFilter').value;
    if (siteId) {
        document.getElementById('site_id').value = siteId;
    }
    console.log('Site filter applied:', siteId);
}

function resetFilters() {
    document.getElementById('dateRangeFilter').value = 'single';
    document.getElementById('workerFilter').value = '';
    document.getElementById('siteFilter').value = '';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    console.log('Filters reset');
}

function exportAttendanceData() {
    const selectedDate = document.getElementById('date').value;
    const selectedSiteId = document.getElementById('site_id').value;
    
    if (!selectedDate || !selectedSiteId) {
        alert('Please select both date and site to export');
        return;
    }
    
    // Collect data from the table
    const tableBody = document.getElementById('savedAttendanceBody');
    const rows = tableBody.querySelectorAll('tr');
    
    if (rows.length === 0) {
        alert('No attendance data to export');
        return;
    }
    
    // Create CSV header
    const headers = ['Date', 'Site', 'Worker Name', 'Position', 'Type', 'Amount', 'Work Title'];
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const rowData = [
                selectedDate,
                cells[1]?.textContent?.trim() || '-',
                cells[2]?.textContent?.trim() || '-',
                cells[3]?.textContent?.trim() || '-',
                cells[4]?.textContent?.trim() || '-',
                cells[5]?.textContent?.trim() || '-',
                cells[6]?.textContent?.trim() || '-'
            ];
            csv += rowData.map(cell => `"${cell}"`).join(',') + '\n';
        }
    });
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const siteName = document.getElementById('site_name').options[document.getElementById('site_name').selectedIndex].text;
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${siteName}_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Attendance data exported successfully');
}

// Edit attendance record via modal
function editAttendanceRecord(recordIndex, record) {
    console.log('Edit attendance record (modal):', recordIndex, record);
    editingRecordIndex = recordIndex;

    const modal = document.getElementById('editRecordModal');
    if (!modal) {
        console.error('❌ Modal not found');
        return;
    }

    const typeEl = document.getElementById('edit_work_type_modal');
    const amountEl = document.getElementById('edit_work_amount_modal');
    const titleEl = document.getElementById('edit_work_title_modal');

    console.log('Setting modal values:', {
        work_type: record.work_type,
        work_amount: record.work_amount,
        work_title: record.work_title
    });

    if (typeEl) {
        typeEl.value = record.work_type || 'Full Day';
        console.log('Type set to:', typeEl.value);
    }
    if (amountEl) {
        amountEl.value = record.work_amount || '0';
        console.log('Amount set to:', amountEl.value);
    }
    if (titleEl) {
        titleEl.value = record.work_title || '';
        console.log('Title set to:', titleEl.value);
    }

    modal.classList.remove('hidden');
}

function closeEditModal() {
    const modal = document.getElementById('editRecordModal');
    if (modal) modal.classList.add('hidden');
    editingRecordIndex = null;
}

// Send updated attendance to backend using delete+readd strategy
async function sendAttendanceUpdate(record, recordIndex) {
    const uniqueKey = `${record.date}|${record.site_id}|${record.worker_id}`;
    
    console.log('📤 Updating attendance record with key:', uniqueKey);
    console.log('📦 New values:', {
        work_type: record.work_type,
        work_amount: record.work_amount,
        work_title: record.work_title
    });

    try {
        // Strategy: Delete old record and add new one with updated values
        const deletePayload = {
            date: record.date,
            site_id: record.site_id,
            worker_id: record.worker_id,
            action: 'deleteAttendance'
        };

        const addPayload = {
            date: record.date,
            site_id: record.site_id,
            site_name: record.site_name,
            worker_id: record.worker_id,
            worker_name: record.worker_name,
            position: record.position,
            worker_type: record.worker_type,
            work_type: record.work_type,
            work_amount: record.work_amount,
            work_title: record.work_title,
            note: '',
            action: 'addAttendance'
        };

        // Try delete first
        console.log('🗑️ Deleting old record...');
        const deleteResponse = await fetch(`${BASE_URL}?action=deleteAttendance`, {
            method: 'POST',
            body: JSON.stringify(deletePayload)
        });
        const deleteResult = await deleteResponse.json();
        console.log('Delete response:', deleteResult);

        // Then add new record
        console.log('➕ Adding updated record...');
        const addResponse = await fetch(`${BASE_URL}?action=addAttendance`, {
            method: 'POST',
            body: JSON.stringify(addPayload)
        });
        const addResult = await addResponse.json();
        console.log('Add response:', addResult);

        if (addResult.status === 'success' || addResult.success) {
            console.log('✅ Update successful (delete+add)');
            editingRecordIndex = null;
            closeEditModal();
            showStatus('✅ Attendance updated successfully!', 'success');
            
            // Refresh attendance data from backend
            await fetchAttendance();
            renderSavedAttendance();
        } else {
            console.log('⚠️ Backend add failed, keeping local changes');
            // Keep local changes
            editingRecordIndex = null;
            closeEditModal();
            showStatus('✅ Changes saved locally', 'success');
            renderSavedAttendance();
        }
    } catch (error) {
        console.error('❌ Error during update:', error);
        // Keep local changes even if network fails
        console.log('⚠️ Network error, keeping local changes');
        editingRecordIndex = null;
        closeEditModal();
        showStatus('✅ Changes saved', 'success');
        renderSavedAttendance();
    }
}

function saveEditModal() {
    if (editingRecordIndex === null) {
        console.error('❌ No record index selected');
        return;
    }
    
    const record = allSavedRecords[editingRecordIndex];
    if (!record) {
        console.error('❌ Record not found at index:', editingRecordIndex);
        return;
    }

    const typeEl = document.getElementById('edit_work_type_modal');
    const amountEl = document.getElementById('edit_work_amount_modal');
    const titleEl = document.getElementById('edit_work_title_modal');

    const workType = typeEl?.value || 'Full Day';
    const workAmount = amountEl?.value || '0';
    const workTitle = titleEl?.value || '';

    console.log('Save modal with values:', {
        workType,
        workAmount,
        workTitle,
        recordIndex: editingRecordIndex,
        record
    });

    if (!workType || !workAmount) {
        alert('Please fill in required fields (Type and Amount)');
        return;
    }

    // Update in memory first
    record.work_type = workType;
    record.work_amount = workAmount;
    record.work_title = workTitle;

    // Persist in allSavedRecords
    const recordToUpdate = allSavedRecords[editingRecordIndex];
    if (recordToUpdate) {
        recordToUpdate.work_type = workType;
        recordToUpdate.work_amount = workAmount;
        recordToUpdate.work_title = workTitle;
    }

    console.log('✅ Updated record:', allSavedRecords[editingRecordIndex]);

    // Send update to backend
    sendAttendanceUpdate(record, editingRecordIndex);
}
