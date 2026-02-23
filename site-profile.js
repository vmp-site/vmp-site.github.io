// Site Profile Page Logic
console.log('Site Profile page loaded');

// Get site ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const siteId = urlParams.get('id');

// Global data storage
let sitesData = [];
let attendanceData = [];
let paymentsData = [];
let workersData = [];

// Check if site ID is provided
if (!siteId) {
    alert('Site ID not provided!');
    window.location.href = 'sites.html';
}

// ================================
// API FUNCTIONS
// ================================

/**
 * Fetch all data from backend
 */
async function fetchAllData() {
    try {
        // Fetch sites data
        const sitesResponse = await fetch(`${BASE_URL}?action=getSites`);
        sitesData = await sitesResponse.json();
        
        // Fetch attendance data
        const attendanceResponse = await fetch(`${BASE_URL}?action=getAttendance`);
        attendanceData = await attendanceResponse.json();
        
        // Fetch payments data
        const paymentsResponse = await fetch(`${BASE_URL}?action=getPayments`);
        paymentsData = await paymentsResponse.json();
        
        // Fetch workers data for display names
        const workersResponse = await fetch(`${BASE_URL}?action=getWorkers`);
        workersData = await workersResponse.json();
        
        console.log('All data fetched successfully');
        return true;
    } catch (error) {
        console.error('Error fetching data:', error);
        return false;
    }
}

// ================================
// UI UPDATE FUNCTIONS
// ================================

/**
 * Update site header information - check if element exists before updating
 */
function updateSiteHeader() {
    const site = sitesData.find(s => s.site_id === siteId);
    
    if (site) {
        const siteNameEl = document.getElementById('siteName');
        const detailSiteNameEl = document.getElementById('detailSiteName');
        const clientNameEl = document.getElementById('clientNameBadge');
        const locationEl = document.getElementById('siteLocation');
        
        if (siteNameEl) siteNameEl.textContent = site.site_name || 'Site Profile';
        if (detailSiteNameEl) detailSiteNameEl.textContent = site.site_name || 'Site Name';
        if (clientNameEl) clientNameEl.textContent = site.client_name || site.site_name || '-';
        if (locationEl) locationEl.textContent = site.location || '-';
    }
}

/**
 * Update summary cards with calculations
 */
function updateSummaryCards() {
    const siteAttendance = attendanceData.filter(a => a.site_id == siteId);
    const sitePayments = paymentsData.filter(p => p.site_id == siteId);
    
    const totalWork = siteAttendance.reduce((sum, a) => sum + (parseFloat(a.work_amount) || 0), 0);
    const totalPaid = sitePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const pendingBalance = totalWork - totalPaid;
    
    const totalWorkEl = document.getElementById('totalWork');
    const totalReceivedEl = document.getElementById('totalReceived');
    const pendingBalanceEl = document.getElementById('pendingBalance');
    
    if (totalWorkEl) totalWorkEl.textContent = `₹${totalWork.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (totalReceivedEl) totalReceivedEl.textContent = `₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (pendingBalanceEl) pendingBalanceEl.textContent = `₹${pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get worker name by ID
 */
function getWorkerName(workerId) {
    const worker = workersData.find(w => w.worker_id === workerId);
    return worker ? worker.name : workerId;
}

// ================================
// MAIN INITIALIZATION
// ================================

/**
 * Initialize site profile page
 */
async function initializeSiteProfile() {
    console.log('Initializing site profile for ID:', siteId);
    
    // Fetch all data
    const dataLoaded = await fetchAllData();
    
    if (!dataLoaded) {
        alert('Failed to load data. Please check your connection.');
        return;
    }
    
    // Update all UI components
    updateSiteHeader();
    updateSummaryCards();
    
    console.log('Site profile loaded successfully');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSiteProfile);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeSiteProfile);