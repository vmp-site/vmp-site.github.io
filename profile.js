// Profile Page Logic
console.log('Profile page loaded');

// Lightweight JSONP helper (avoid CORS)
function jsonpRequest(action, params = {}, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        const cbName = `__prof_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        params.action = action;
        params.callback = cbName;
        const url = `${BASE_URL}?${new URLSearchParams(params).toString()}`;

        let timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout: ${action}`));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timeout);
            try { delete window[cbName]; } catch {}
            if (script && script.parentNode) script.parentNode.removeChild(script);
        }

        window[cbName] = (result) => {
            cleanup();
            resolve(result);
        };

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onerror = () => {
            cleanup();
            reject(new Error(`Network error: ${action}`));
        };
        document.head.appendChild(script);
    });
}

// Load profile data
async function loadProfileData() {
    try {
        const [sitesRes, workersRes, attendanceRes, paymentsRes, receivedRes] = await Promise.all([
            jsonpRequest('getSites'),
            jsonpRequest('getWorkers'),
            jsonpRequest('getAttendance'),
            jsonpRequest('getPayments'),
            jsonpRequest('getReceived')
        ]);
        
        const sites = Array.isArray(sitesRes) ? sitesRes : (sitesRes?.data || sitesRes?.result || []);
        const workers = Array.isArray(workersRes) ? workersRes : (workersRes?.data || workersRes?.result || []);
        const attendance = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes?.data || attendanceRes?.result || []);
        const payments = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes?.data || paymentsRes?.result || []);
        const received = Array.isArray(receivedRes) ? receivedRes : (receivedRes?.data || receivedRes?.result || []);
        
        // Calculate totals
        const totalWork = attendance.reduce((sum, a) => sum + (parseFloat(a.work_amount) || 0), 0);
        
        // Total Paid = sum of all payments (all payment records)
        const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        // Received Transfers = new schema uses received records where from_type exists
        const receivedTransfers = received.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        
        // Pending Balance = Total Work - Total Paid + Received (site/worker inflow)
        const pendingBalance = totalWork - totalPaid + receivedTransfers;
        
        // Debug logging
        console.log('Profile data loaded:', {
            totalWork,
            totalPaid,
            receivedTransfers,
            pendingBalance,
            paymentCount: payments.length,
            attendanceCount: attendance.length
        });
        
        // Update statistics
        document.getElementById('totalSites').textContent = sites.length;
        document.getElementById('totalWorkers').textContent = workers.length;
        document.getElementById('totalEarned').textContent = formatCurrency(totalWork);
        document.getElementById('totalPaid').textContent = formatCurrency(totalPaid);
        
        // Update Financial Summary section
        document.getElementById('workAmount').textContent = formatCurrency(totalWork);
        document.getElementById('paidAmount').textContent = formatCurrency(totalPaid);
        document.getElementById('receivedAmount').textContent = formatCurrency(receivedTransfers);
        document.getElementById('pendingBalance').textContent = formatCurrency(pendingBalance);
        
        // Color code pending balance
        const pendingEl = document.getElementById('pendingBalance');
        if (pendingBalance > 0) {
            pendingEl.style.color = '#10b981'; // Green - owed by workers
        } else if (pendingBalance < 0) {
            pendingEl.style.color = '#ef4444'; // Red - owed to owner
        } else {
            pendingEl.style.color = '#6b7280'; // Gray - balanced
        }
        
        // Update profile name
        document.getElementById('profileName').textContent = 'Owner';
        document.getElementById('profileAvatar').textContent = 'O';
        
        // Render received payment tables
        renderReceivedFromSite(received, sites);
        renderReceivedFromWorker(received, workers);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        // Show user-friendly error but don't alert
        document.getElementById('workAmount').textContent = '₹0';
        document.getElementById('paidAmount').textContent = '₹0';
        document.getElementById('receivedAmount').textContent = '₹0';
        document.getElementById('pendingBalance').textContent = '₹0';
    }
}

// Format date (formatCurrency is imported from config.js)
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Render Received from Site table
function renderReceivedFromSite(received, sites) {
    const tbody = document.getElementById('receivedSiteBody');
    if (!tbody) return;

    // Filter for received from site using new schema: from_type === 'site'
    const receivedFromSite = received
        .filter(r => r.from_type === 'site' || r.type === 'received')
        .slice(0, 10);
    
    if (receivedFromSite.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--gray-500);">No received payments from sites</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    receivedFromSite.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let totalAmount = 0;
    tbody.innerHTML = receivedFromSite.map((record, index) => {
        const amount = parseFloat(record.amount) || 0;
        totalAmount += amount;
        
        // Get site name (resolve by id, then site_name, then from_name) and ignore "none"
        let siteName = 'Unknown';
        if (record.site_id && record.site_id !== 'none') {
            const site = sites.find(s => String(s.site_id) === String(record.site_id));
            if (site && site.site_name) siteName = site.site_name;
        }
        if (siteName === 'Unknown') {
            if (record.site_name && record.site_name !== 'none') {
                siteName = record.site_name;
            } else if (record.from_name && record.from_name !== 'none') {
                siteName = record.from_name;
            }
        }
        
        return `
            <tr style="border-bottom: 1px solid var(--gray-200);">
                <td style="padding: 12px 8px; font-size: 0.875rem;">${index + 1}</td>
                <td style="padding: 12px 8px; font-size: 0.875rem;">${formatDate(record.date)}</td>
                <td style="padding: 12px 8px; font-size: 0.875rem;">${siteName}</td>
                <td style="padding: 12px 8px; text-align: right; font-size: 0.875rem; font-weight: 600; color: #10b981;">₹${amount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    // Add total row
    tbody.innerHTML += `
        <tr style="background: #f0fdf4; font-weight: bold;">
            <td colspan="3" style="padding: 12px 8px; text-align: right; font-size: 0.875rem;">Total Received:</td>
            <td style="padding: 12px 8px; text-align: right; font-size: 0.875rem; color: #15803d;">₹${totalAmount.toFixed(2)}</td>
        </tr>
    `;
}

// Render Received from Worker table
function renderReceivedFromWorker(received, workers) {
    const tbody = document.getElementById('receivedWorkerBody');
    if (!tbody) return;

    // Filter for received from worker using new schema: from_type === 'worker'
    const receivedFromWorker = received
        .filter(r => r.from_type === 'worker' || r.type === 'received_worker')
        .slice(0, 10);
    
    if (receivedFromWorker.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--gray-500);">No received payments from workers</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    receivedFromWorker.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let totalAmount = 0;
    tbody.innerHTML = receivedFromWorker.map((record, index) => {
        const amount = parseFloat(record.amount) || 0;
        totalAmount += amount;
        
        // Get worker name
        const worker = workers.find(w => w.worker_id == record.worker_id);
        const workerName = worker ? worker.name : (record.worker_name || record.worker_id || 'Unknown');
        
        return `
            <tr style="border-bottom: 1px solid var(--gray-200);">
                <td style="padding: 12px 8px; font-size: 0.875rem;">${index + 1}</td>
                <td style="padding: 12px 8px; font-size: 0.875rem;">${formatDate(record.date)}</td>
                <td style="padding: 12px 8px; font-size: 0.875rem;">${workerName}</td>
                <td style="padding: 12px 8px; text-align: right; font-size: 0.875rem; font-weight: 600; color: #3b82f6;">₹${amount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    // Add total row
    tbody.innerHTML += `
        <tr style="background: #eff6ff; font-weight: bold;">
            <td colspan="3" style="padding: 12px 8px; text-align: right; font-size: 0.875rem;">Total Received:</td>
            <td style="padding: 12px 8px; text-align: right; font-size: 0.875rem; color: #1e40af;">₹${totalAmount.toFixed(2)}</td>
        </tr>
    `;
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Profile page...');
    loadProfileData();
});
