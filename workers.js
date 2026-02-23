let workersData = [];
let sitesData = [];
let editingWorkerId = null;
let workerSearchTerm = '';
let workerPositionFilter = 'all';
let workerTypeFilter = 'all';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadSites() {
    try {
        const response = await fetch(`${BASE_URL}?action=getSites`);
        if (!response.ok) throw new Error('Failed to fetch sites');
        sitesData = await response.json();
        populateSitesDropdown();
    } catch (error) {
        console.error('Error loading sites:', error);
    }
}

function populateSitesDropdown() {
    const dropdown = document.getElementById('assigned_sites');
    const modalDropdown = document.getElementById('modal_assigned_sites');
    
    // Clear both dropdowns
    dropdown.innerHTML = '';
    if (modalDropdown) {
        modalDropdown.innerHTML = '';
    }
    
    // Add "None" option first (default)
    const noneOption = document.createElement('option');
    noneOption.value = 'None';
    noneOption.textContent = 'None (Optional)';
    noneOption.selected = true;
    dropdown.appendChild(noneOption);
    
    const noneOptionModal = document.createElement('option');
    noneOptionModal.value = 'None';
    noneOptionModal.textContent = 'None (Optional)';
    if (modalDropdown) {
        modalDropdown.appendChild(noneOptionModal);
    }
    
    // Add all sites
    sitesData.forEach(site => {
        if (site.status === undefined || site.status === 'active' || site.status === true) {
            const option = document.createElement('option');
            option.value = site.site_id;
            option.textContent = site.site_name;
            dropdown.appendChild(option);
            
            if (modalDropdown) {
                const optionModal = document.createElement('option');
                optionModal.value = site.site_id;
                optionModal.textContent = site.site_name;
                modalDropdown.appendChild(optionModal);
            }
        }
    });
    
    console.log('Sites dropdown populated with', sitesData.length, 'sites');
}

async function loadWorkers() {
    console.log('Loading workers from API...');
    try {
        const response = await fetch(`${BASE_URL}?action=getWorkers`);
        console.log('API response status:', response.ok);
        if (!response.ok) throw new Error('Failed to fetch workers');
        workersData = await response.json();
        console.log('Workers data loaded:', workersData);
        renderWorkersTable();
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

function renderWorkersTable() {
    const tbody = document.getElementById('workersBody');
    console.log('Rendering workers table. Total workers:', workersData.length);
    console.log('Sites data available:', sitesData.length, 'sites');
    console.log('Sites:', sitesData.map(s => s.site_id + '=' + s.site_name));

    const filteredWorkers = workersData.filter((worker) => {
        const searchHaystack = `${worker.name || ''} ${worker.phone || ''} ${worker.assigned_sites || ''}`.toLowerCase();
        const matchesSearch = !workerSearchTerm || searchHaystack.includes(workerSearchTerm);
        const matchesPosition = workerPositionFilter === 'all' || worker.position === workerPositionFilter;
        const matchesType = workerTypeFilter === 'all' || worker.worker_type === workerTypeFilter;
        return matchesSearch && matchesPosition && matchesType;
    });
    
    if (filteredWorkers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-10 text-center text-slate-500 font-medium">No workers found. Add a worker or change filters.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    filteredWorkers.forEach((worker, index) => {
        // Check if this is the row being edited
        if (editingWorkerId && String(editingWorkerId) === String(worker.worker_id)) {
            // Render edit form row
            const editRow = tbody.insertRow();
            editRow.className = 'bg-blue-50';
            editRow.id = `edit-form-${worker.worker_id}`;
            
            // Handle assigned_sites - could be string, array, or null
            let assignedSitesArray = [];
            if (worker.assigned_sites && worker.assigned_sites !== 'None' && worker.assigned_sites !== '') {
                if (Array.isArray(worker.assigned_sites)) {
                    assignedSitesArray = worker.assigned_sites.map(s => String(s).trim());
                } else if (typeof worker.assigned_sites === 'string') {
                    assignedSitesArray = worker.assigned_sites.split(',').map(s => s.trim());
                }
            }
            
            const sitesOptionsHtml = sitesData.map(site => {
                const selected = assignedSitesArray.includes(String(site.site_id)) ? 'selected' : '';
                return `<option value="${escapeHtml(site.site_id)}" ${selected}>${escapeHtml(site.site_name)}</option>`;
            }).join('');
            
            editRow.innerHTML = `
                <td colspan="7">
                    <div class="p-4 rounded-xl border border-blue-200 bg-white">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                                <input type="text" class="w-full h-10 rounded-lg border-slate-300 focus:border-primary focus:ring-primary" id="edit_name_${worker.worker_id}" value="${escapeHtml(worker.name || '')}" placeholder="Worker Name" title="Worker name">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                                <input type="tel" class="w-full h-10 rounded-lg border-slate-300 focus:border-primary focus:ring-primary" id="edit_phone_${worker.worker_id}" value="${escapeHtml(worker.phone || '')}" placeholder="10 digits" pattern="\d{10}" maxlength="10" title="10-digit phone number">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Position</label>
                                <select class="w-full h-10 rounded-lg border-slate-300 focus:border-primary focus:ring-primary" id="edit_position_${worker.worker_id}" title="Select position">
                                    <option value="Karigar" ${worker.position === 'Karigar' ? 'selected' : ''}>Karigar</option>
                                    <option value="Majur" ${worker.position === 'Majur' ? 'selected' : ''}>Majur</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                                <select class="w-full h-10 rounded-lg border-slate-300 focus:border-primary focus:ring-primary" id="edit_worker_type_${worker.worker_id}" title="Select worker type">
                                    <option value="New" ${worker.worker_type === 'New' ? 'selected' : ''}>New</option>
                                    <option value="Old" ${worker.worker_type === 'Old' ? 'selected' : ''}>Old</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sites</label>
                                <select class="w-full min-h-[110px] rounded-lg border-slate-300 focus:border-primary focus:ring-primary" id="edit_assigned_sites_${worker.worker_id}" multiple title="Select assigned sites">
                                    ${sitesOptionsHtml}
                                    <option value="None" ${assignedSitesArray.length === 0 ? 'selected' : ''}>None</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-blue-100">
                            <button class="h-9 px-3 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700" data-action="save" data-worker-id="${worker.worker_id}" title="Save changes">Save</button>
                            <button class="h-9 px-3 rounded-md bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700" data-action="cancel" data-worker-id="${worker.worker_id}" title="Cancel editing">Cancel</button>
                        </div>
                    </div>
                </td>
            `;
        } else {
            // Render normal row
            const row = tbody.insertRow();
            const positionClass = worker.position === 'Karigar' ? 'karigar' : 'majur';
            const typeClass = worker.worker_type === 'New' ? 'new' : 'old';
            
            console.log('Worker assigned_sites raw value:', worker.assigned_sites, 'Type:', typeof worker.assigned_sites);
            
            let assignedSitesDisplay = 'None';
            if (worker.assigned_sites && worker.assigned_sites !== 'None' && worker.assigned_sites !== '') {
                let siteIds = [];
                if (Array.isArray(worker.assigned_sites)) {
                    siteIds = worker.assigned_sites;
                } else {
                    const assignedSitesStr = String(worker.assigned_sites);
                    siteIds = assignedSitesStr.split(',');
                }
                console.log('Site IDs to look up:', siteIds);
                
                const siteNames = siteIds.map(id => {
                    const trimmedId = id.trim();
                    console.log('Looking for site ID:', trimmedId, 'in', sitesData.length, 'sites');
                    const site = sitesData.find(s => String(s.site_id) === String(trimmedId));
                    console.log('Found site:', site);
                    return site ? site.site_name : trimmedId;
                }).filter(name => name && name !== '');
                
                assignedSitesDisplay = siteNames.length > 0 ? siteNames.join(', ') : 'None';
            }
            console.log('Final assignedSitesDisplay:', assignedSitesDisplay);
            
            const safeWorkerName = escapeHtml(worker.name || '-');
            const safeWorkerNameJs = (worker.name || '').replace(/'/g, "\\'");
            row.innerHTML = `
                <td class="px-4 py-3 text-center text-sm text-slate-600 font-semibold border-b border-slate-100">${index + 1}</td>
                <td class="px-4 py-3 text-center text-sm border-b border-slate-100">
                    <button class="text-primary font-semibold hover:underline" onclick="viewWorkerProfile('${worker.worker_id}', '${safeWorkerNameJs}')">${safeWorkerName}</button>
                </td>
                <td class="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">${escapeHtml(worker.phone || '-')}</td>
                <td class="px-4 py-3 text-center border-b border-slate-100"><span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${positionClass === 'karigar' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}">${escapeHtml(worker.position || '-')}</span></td>
                <td class="px-4 py-3 text-center border-b border-slate-100"><span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeClass === 'new' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}">${escapeHtml(worker.worker_type || '-')}</span></td>
                <td class="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100 max-w-[220px] truncate" title="${escapeHtml(assignedSitesDisplay)}">${escapeHtml(assignedSitesDisplay)}</td>
                <td class="px-4 py-3 text-center border-b border-slate-100">
                    <div class="flex items-center justify-center gap-2">
                        <button class="h-8 w-8 grid place-items-center rounded-md bg-primary text-white hover:bg-primary/90" data-action="edit" data-worker-id="${worker.worker_id}" title="Edit worker" aria-label="Edit worker">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button class="h-8 w-8 grid place-items-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" data-action="delete" data-worker-id="${worker.worker_id}" data-worker-name="${safeWorkerName}" title="Delete worker" aria-label="Delete worker">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </td>
            `;
        }
    });
    console.log('Table rendering complete');
}

function setupWorkerFilters() {
    const searchInput = document.getElementById('workerSearch');
    const positionFilter = document.getElementById('positionFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            workerSearchTerm = event.target.value.trim().toLowerCase();
            renderWorkersTable();
        });
    }

    if (positionFilter) {
        positionFilter.addEventListener('change', (event) => {
            workerPositionFilter = event.target.value;
            renderWorkersTable();
        });
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', (event) => {
            workerTypeFilter = event.target.value;
            renderWorkersTable();
        });
    }
}

function editWorker(workerId) {
    console.log('Edit button clicked for worker:', workerId);
    const worker = workersData.find(w => String(w.worker_id) === String(workerId));
    if (!worker) {
        alert('Worker not found');
        return;
    }

    editingWorkerId = workerId;

    const nameInput = document.getElementById('modal_name');
    const phoneInput = document.getElementById('modal_phone');
    const positionInput = document.getElementById('modal_position');
    const typeInput = document.getElementById('modal_worker_type');
    const sitesSelect = document.getElementById('modal_assigned_sites');
    const modal = document.getElementById('editWorkerModal');

    if (!modal || !nameInput || !phoneInput || !positionInput || !typeInput || !sitesSelect) {
        alert('Edit form is not available on this page');
        return;
    }

    nameInput.value = worker.name || '';
    phoneInput.value = worker.phone || '';
    positionInput.value = worker.position || 'Karigar';
    typeInput.value = worker.worker_type || 'New';

    let assignedSitesArray = [];
    if (worker.assigned_sites && worker.assigned_sites !== 'None' && worker.assigned_sites !== '') {
        if (Array.isArray(worker.assigned_sites)) {
            assignedSitesArray = worker.assigned_sites.map(s => String(s).trim());
        } else if (typeof worker.assigned_sites === 'string') {
            assignedSitesArray = worker.assigned_sites.split(',').map(s => s.trim());
        }
    }

    Array.from(sitesSelect.options).forEach(option => {
        if (option.value === 'None') {
            option.selected = assignedSitesArray.length === 0;
        } else {
            option.selected = assignedSitesArray.includes(String(option.value));
        }
    });

    modal.classList.remove('hidden');
}

function closeEditForm() {
    console.log('Cancel button clicked');
    const modal = document.getElementById('editWorkerModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    editingWorkerId = null;
}

async function updateWorker(workerId) {
    console.log('Update worker called for ID:', workerId);
    const modalName = document.getElementById('modal_name');
    const modalPhone = document.getElementById('modal_phone');
    const modalPosition = document.getElementById('modal_position');
    const modalType = document.getElementById('modal_worker_type');
    const modalSites = document.getElementById('modal_assigned_sites');

    const name = modalName ? modalName.value : document.getElementById(`edit_name_${workerId}`).value;
    const phone = modalPhone ? modalPhone.value : document.getElementById(`edit_phone_${workerId}`).value;
    
    // Validate phone is exactly 10 digits
    if (phone && !/^\d{10}$/.test(phone)) {
        alert('Phone number must be exactly 10 digits');
        return;
    }
    const position = modalPosition ? modalPosition.value : document.getElementById(`edit_position_${workerId}`).value;
    const worker_type = modalType ? modalType.value : document.getElementById(`edit_worker_type_${workerId}`).value;
    const assignedSitesSelect = modalSites || document.getElementById(`edit_assigned_sites_${workerId}`);
    const selectedOptions = Array.from(assignedSitesSelect.selectedOptions);
    // Filter out 'None' option and only keep actual site selections
    const assigned_sites = selectedOptions
        .filter(opt => opt.value !== 'None')
        .map(opt => opt.value)
        .join(',');
    
    console.log('Form values - Name:', name, 'Phone:', phone, 'Position:', position, 'Type:', worker_type, 'Sites:', assigned_sites);
    
    if (!name || !phone || !position || !worker_type) {
        alert('Please fill all required fields');
        return;
    }
    
    if (!/^\d{10}$/.test(phone)) {
        alert('Phone must be 10 digits');
        return;
    }
    
    const data = {
        workerId: workerId,
        workerName: name,
        workerPhone: phone,
        workerPosition: position,
        workerType: worker_type,
        assignedSites: assigned_sites
    };
    
    console.log('Sending update request with data:', data);
    
    try {
        const url = `${BASE_URL}?action=updateWorker`;
        console.log('Update URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response result:', result);
        
        if (result.status === 'success' || result.success) {
            alert('Worker updated successfully!');
            closeEditForm();
            await loadSites(); // Refresh sites data
            await loadWorkers(); // Then load workers with updated sites
        } else {
            alert('Error: ' + (result.message || 'Failed to update worker'));
            console.error('Update failed:', result);
        }
    } catch (error) {
        console.error('Error updating worker:', error);
        alert('Error updating worker: ' + error.message);
    }
}

async function deleteWorker(workerId, workerName) {
    const deletePrompt = (window.WorkToolBackup && window.WorkToolBackup.getDeletePrompt)
        ? window.WorkToolBackup.getDeletePrompt('worker', workerName)
        : `Are you sure you want to delete ${workerName}?`;
    if (!confirm(deletePrompt)) {
        return;
    }

    try {
        if (window.WorkToolBackup && typeof window.WorkToolBackup.createDeleteBackup === 'function') {
            await window.WorkToolBackup.createDeleteBackup('worker', { id: workerId, name: workerName });
        }
    } catch (backupError) {
        console.error('Pre-delete backup failed:', backupError);
        const backupContinueText = (window.WorkToolBackup && window.WorkToolBackup.getText)
            ? window.WorkToolBackup.getText('Backup failed before delete. Do you still want to continue delete?')
            : 'Backup failed before delete. Do you still want to continue delete?';
        if (!confirm(backupContinueText)) {
            return;
        }
    }
    
    try {
        const response = await fetch(`${BASE_URL}?action=deleteWorker`, {
            method: 'POST',
            body: JSON.stringify({ workerId: workerId })
        });
        const result = await response.json();
        
        if (result.status === 'success' || result.success) {
            const successText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteSuccess)
                ? window.WorkToolBackup.getDeleteSuccess('worker')
                : 'Worker deleted successfully!';
            alert(successText);
            loadWorkers();
        } else {
            const failText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteFail)
                ? window.WorkToolBackup.getDeleteFail('worker')
                : 'Failed to delete worker';
            alert('Error: ' + (result.message || failText));
        }
    } catch (error) {
        console.error('Error deleting worker:', error);
        const errorText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteError)
            ? window.WorkToolBackup.getDeleteError('worker')
            : 'Error deleting worker';
        alert(errorText);
    }
}

async function addWorker(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const position = document.getElementById('position').value;
    const worker_type = document.getElementById('worker_type').value;
    
    // Validate phone is exactly 10 digits
    if (phone && !/^\d{10}$/.test(phone)) {
        alert('Phone number must be exactly 10 digits');
        return;
    }
    const assignedSitesSelect = document.getElementById('assigned_sites');
    const selectedOptions = Array.from(assignedSitesSelect.selectedOptions);
    
    console.log('Selected options:', selectedOptions.map(o => ({value: o.value, text: o.text})));
    
    // Filter out 'None' option and only keep actual site selections
    const assigned_sites = selectedOptions
        .filter(opt => opt.value !== 'None')
        .map(opt => opt.value)
        .join(',');
    
    console.log('Assigned sites after filter:', assigned_sites);
    
    if (!name || !phone || !position || !worker_type) {
        alert('Please fill all required fields');
        return;
    }
    
    const data = {
        workerName: name,
        workerPhone: phone,
        workerPosition: position,
        workerType: worker_type,
        assignedSites: assigned_sites || 'None'
    };
    
    try {
        const response = await fetch(`${BASE_URL}?action=addWorker`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.status === 'success' || result.success) {
            document.getElementById('addWorkerForm').reset();
            await loadSites(); // Refresh sites data
            await loadWorkers(); // Then load workers with updated sites
            alert('Worker added successfully!');
        } else {
            alert('Error: ' + (result.message || 'Failed to add worker'));
        }
    } catch (error) {
        console.error('Error adding worker:', error);
        alert('Error adding worker');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing workers page...');
    await loadSites();
    console.log('Sites loaded, now loading workers...');
    await loadWorkers();
    console.log('Workers loaded');
    setupWorkerFilters();
    document.getElementById('addWorkerForm').addEventListener('submit', addWorker);
    
    // Event delegation for table buttons (Edit/Delete/Save/Cancel)
    const workersBody = document.getElementById('workersBody');
    console.log('Setting up event delegation on workersBody:', workersBody);
    
    workersBody.addEventListener('click', (e) => {
        console.log('Click detected on:', e.target);
        const button = e.target.closest('button');
        console.log('Button found:', button);
        
        if (!button) {
            console.log('No button clicked, ignoring');
            return;
        }
        
        const action = button.dataset.action;
        const workerId = button.dataset.workerId;
        const workerName = button.dataset.workerName;
        
        console.log('Button action:', action);
        console.log('Worker ID:', workerId);
        
        if (action === 'edit') {
            console.log('Calling editWorker function');
            editWorker(workerId);
        } else if (action === 'delete') {
            console.log('Calling deleteWorker function');
            deleteWorker(workerId, workerName);
        } else if (action === 'save') {
            console.log('Calling updateWorker function');
            updateWorker(workerId);
        } else if (action === 'cancel') {
            console.log('Calling closeEditForm function');
            closeEditForm();
        }
    });

    const closeModalBtn = document.getElementById('closeModalBtn');
    const editModalBackBtn = document.getElementById('editModalBackBtn');
    const editCancelBtn = document.getElementById('editCancelBtn');
    const editSaveBtn = document.getElementById('editSaveBtn');
    const editModalBackdrop = document.getElementById('editWorkerModalBackdrop');
    const editModalForm = document.getElementById('editModalForm');

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeEditForm);
    if (editModalBackBtn) editModalBackBtn.addEventListener('click', closeEditForm);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditForm);
    if (editModalBackdrop) editModalBackdrop.addEventListener('click', closeEditForm);

    if (editSaveBtn) {
        editSaveBtn.addEventListener('click', async () => {
            if (!editingWorkerId) return;
            await updateWorker(editingWorkerId);
        });
    }

    if (editModalForm) {
        editModalForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!editingWorkerId) return;
            await updateWorker(editingWorkerId);
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const modal = document.getElementById('editWorkerModal');
            if (modal && !modal.classList.contains('hidden')) {
                closeEditForm();
            }
        }
    });
});

// View worker profile
function viewWorkerProfile(workerId, workerName) {
    window.location.href = `worker-profile.html?id=${workerId}&name=${encodeURIComponent(workerName)}`;
}

// Expose functions to window object
window.editWorker = editWorker;
window.closeEditForm = closeEditForm;
window.updateWorker = updateWorker;
window.deleteWorker = deleteWorker;
window.viewWorkerProfile = viewWorkerProfile;
