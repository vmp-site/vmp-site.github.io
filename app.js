// Worker Management System JavaScript
console.log('Work Tool - Worker Management System initialized');

// Get all buttons and forms
const addSiteBtn = document.getElementById('addSiteBtn');
const addWorkerBtn = document.getElementById('addWorkerBtn');
const addAttendanceBtn = document.getElementById('addAttendanceBtn');
const addPaymentBtn = document.getElementById('addPaymentBtn');
const workerSitesChips = document.getElementById('workerSitesChips');
const workerSitesHidden = document.getElementById('workerSitesHidden');
const workerSitesFilter = document.getElementById('workerSitesFilter');
const workerPositionChips = document.getElementById('workerPositionChips');
const workerPositionHidden = document.getElementById('workerPositionHidden');
const workerPositionFilter = document.getElementById('workerPositionFilter');
let workerSiteSelections = new Set();
let workerPositionSelections = new Set();
let positionsData = [];

const siteForm = document.getElementById('siteForm');
const workerForm = document.getElementById('workerForm');
const attendanceForm = document.getElementById('attendanceForm');
const paymentForm = document.getElementById('paymentForm');

async function fetchPositions() {
    try {
        const response = await fetch(`${BASE_URL}?action=getPositions`);
        if (!response.ok) throw new Error('Failed to fetch positions');
        positionsData = await response.json();
    } catch (error) {
        console.error('Error fetching positions:', error);
    }
}

function loadPositionsForWorkers() {
    if (!workerPositionChips) return;
    workerPositionSelections = new Set();
    if (workerPositionHidden) workerPositionHidden.value = '';
    workerPositionChips.innerHTML = '';
    if (workerPositionFilter) workerPositionFilter.value = '';
    
    if (Array.isArray(positionsData)) {
        positionsData.forEach(pos => {
            const name = pos.position_name || '';
            if (!name) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip-button';
            btn.textContent = name;
            btn.dataset.value = name;
            btn.addEventListener('click', () => togglePositionChip(btn));
            workerPositionChips.appendChild(btn);
        });
        if (workerPositionFilter) {
            workerPositionFilter.addEventListener('input', filterPositionChips);
        }
    }
}

async function loadSitesForWorkers() {
    if (!workerSitesChips) return;
    workerSiteSelections = new Set();
    workerSitesHidden.value = '';
    workerSitesChips.innerHTML = '';
    if (workerSitesFilter) workerSitesFilter.value = '';
    try {
        const response = await fetch(`${BASE_URL}?action=getSites`);
        const sites = await response.json();
        if (Array.isArray(sites)) {
            sites.forEach(site => {
                const name = site.site_name || '';
                if (!name) return;
                
                const isActive = site.status === undefined || site.status === 'active' || site.status === true;
                if (!isActive) return;
                
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chip-button';
                btn.textContent = name;
                btn.dataset.value = name;
                btn.addEventListener('click', () => toggleSiteChip(btn));
                workerSitesChips.appendChild(btn);
            });
            if (workerSitesFilter) {
                workerSitesFilter.addEventListener('input', filterSiteChips);
            }
        }
    } catch (err) {}
}

function toggleSiteChip(btn) {
    const val = btn.dataset.value;
    if (workerSiteSelections.has(val)) {
        workerSiteSelections.delete(val);
        btn.classList.remove('chip-selected');
    } else {
        workerSiteSelections.add(val);
        btn.classList.add('chip-selected');
    }
    workerSitesHidden.value = Array.from(workerSiteSelections).join(', ');
}

function filterSiteChips() {
    const term = (workerSitesFilter ? workerSitesFilter.value : '').toLowerCase();
    const buttons = workerSitesChips ? workerSitesChips.querySelectorAll('.chip-button') : [];
    buttons.forEach(btn => {
        const text = btn.dataset.value.toLowerCase();
        btn.style.display = text.includes(term) ? 'inline-flex' : 'none';
    });
}

function togglePositionChip(btn) {
    const value = btn.dataset.value;
    if (workerPositionSelections.has(value)) {
        workerPositionSelections.delete(value);
        btn.classList.remove('chip-selected');
    } else {
        workerPositionSelections.add(value);
        btn.classList.add('chip-selected');
    }
    if (workerPositionHidden) {
        workerPositionHidden.value = Array.from(workerPositionSelections).join(', ');
    }
}

function filterPositionChips() {
    const term = (workerPositionFilter ? workerPositionFilter.value : '').toLowerCase();
    const buttons = workerPositionChips ? workerPositionChips.querySelectorAll('.chip-button') : [];
    buttons.forEach(btn => {
        const text = btn.dataset.value.toLowerCase();
        btn.style.display = text.includes(term) ? 'inline-flex' : 'none';
    });
}

// Get all cancel buttons
const cancelButtons = document.querySelectorAll('.btn-cancel');

// Function to hide all forms
function hideAllForms() {
    siteForm.classList.add('hidden');
    workerForm.classList.add('hidden');
    attendanceForm.classList.add('hidden');
    paymentForm.classList.add('hidden');
}

// Function to show specific form
function showForm(formElement) {
    hideAllForms();
    formElement.classList.remove('hidden');
    formElement.scrollIntoView({ behavior: 'smooth' });
}

// Event listeners for main buttons
if (addSiteBtn) {
    addSiteBtn.addEventListener('click', () => {
        showForm(siteForm);
    });
}

if (addWorkerBtn) {
    addWorkerBtn.addEventListener('click', () => {
        showForm(workerForm);
        loadSitesForWorkers();
        loadPositionsForWorkers();
    });
}

if (addAttendanceBtn) {
    addAttendanceBtn.addEventListener('click', () => {
        window.location.href = 'attendance-form.html';
    });
}

if (addPaymentBtn) {
    addPaymentBtn.addEventListener('click', () => {
        showForm(paymentForm);
    });
}

// Event listeners for cancel buttons
cancelButtons.forEach(button => {
    button.addEventListener('click', () => {
        hideAllForms();
    });
});

// Form submission handlers with API integration
const forms = document.querySelectorAll('form');

// Handle site form submission
const siteFormElement = siteForm.querySelector('form');
siteFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = {
        siteName: formData.get('siteName'),
        siteLocation: formData.get('siteLocation'),
        siteManager: formData.get('siteManager')
    };
    
    // Show loading message
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    // Call API function
    const result = await addSite(data);
    
    // Restore button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Show result message
    if (result.success) {
        alert(result.message);
        e.target.reset();
        hideAllForms();
    } else {
        alert(result.message);
    }
});

// Handle worker form submission
const workerFormElement = workerForm.querySelector('form');
workerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const phone = formData.get('workerPhone').trim();
    
    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
        alert('Phone number must be exactly 10 digits');
        return;
    }
    
    const data = {
        workerName: formData.get('workerName'),
        workerPhone: phone,
        workerPosition: workerPositionHidden ? workerPositionHidden.value : '',
        workerSites: workerSitesHidden ? workerSitesHidden.value : ''
    };
    
    // Show loading message
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    // Call API function
    const result = await addWorker(data);
    
    // Restore button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Show result message
    if (result.success) {
        alert(result.message);
        e.target.reset();
        hideAllForms();
    } else {
        alert(result.message);
    }
});

// Handle attendance form submission
const attendanceFormElement = attendanceForm.querySelector('form');
attendanceFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = {
        attendanceWorker: formData.get('attendanceWorker'),
        attendanceDate: formData.get('attendanceDate'),
        checkIn: formData.get('checkIn'),
        checkOut: formData.get('checkOut')
    };
    
    // Show loading message
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    // Call API function
    const result = await addAttendance(data);
    
    // Restore button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Show result message
    if (result.success) {
        alert(result.message);
        e.target.reset();
        hideAllForms();
    } else {
        alert(result.message);
    }
});

// Handle payment form submission
const paymentFormElement = paymentForm.querySelector('form');
paymentFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const data = {
        paymentWorker: formData.get('paymentWorker'),
        paymentAmount: formData.get('paymentAmount'),
        paymentDate: formData.get('paymentDate'),
        paymentType: formData.get('paymentType')
    };
    
    // Show loading message
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    // Call API function
    const result = await addPayment(data);
    
    // Restore button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Show result message
    if (result.success) {
        alert(result.message);
        e.target.reset();
        hideAllForms();
    } else {
        alert(result.message);
    }
});

// Set today's date as default for date inputs
const today = new Date().toISOString().split('T')[0];
const dateInputs = document.querySelectorAll('input[type="date"]');
dateInputs.forEach(input => {
    input.value = today;
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchPositions();
});