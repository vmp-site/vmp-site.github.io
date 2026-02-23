let ratesData = [];
let positionDataMap = {};

async function fetchRates() {
    console.log('Starting fetchRates...');
    try {
        console.log('Fetching from:', `${BASE_URL}?action=getPositions`);
        const response = await fetch(`${BASE_URL}?action=getPositions`);
        console.log('Response status:', response.status);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        ratesData = await response.json();
        console.log('Data received:', ratesData);
        renderRatesTable();
    } catch (error) {
        console.error('Error fetching positions:', error);
        const tbody = document.getElementById('ratesBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-red-500">Error: ' + error.message + '. Please check console and refresh.</td></tr>';
        }
    }
}

function renderRatesTable() {
    console.log('Rendering table with', ratesData.length, 'items');
    const tbody = document.getElementById('ratesBody');
    if (!tbody) {
        console.error('ratesBody element not found!');
        return;
    }
    
    tbody.innerHTML = '';
    if (!Array.isArray(ratesData) || ratesData.length === 0) {
        console.log('No data, showing empty state');
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-slate-500">No positions added yet</td></tr>';
        return;
    }
    
    positionDataMap = {};
    ratesData.forEach((rate, index) => {
        const row = tbody.insertRow();
        row.className = 'border-b border-slate-100 hover:bg-slate-50/60';
        const typeBadgeClass = rate.worker_type === 'New' ? 'type-badge type-new' : 'type-badge type-old';
        const posId = rate.position_id || `${rate.position_name}_${rate.worker_type}`;
        
        // Store position data in map
        positionDataMap[posId] = rate;
        
        row.innerHTML = `
            <td class="px-4 py-3 row-number">${index + 1}</td>
            <td class="px-4 py-3 row-title">${rate.position_name || ''}</td>
            <td class="px-4 py-3 table-cell-center"><span class="${typeBadgeClass}">${rate.worker_type || ''}</span></td>
            <td class="px-4 py-3 amount-cell">₹${rate.full_rate || 0}</td>
            <td class="px-4 py-3 amount-cell">₹${rate.half_rate || 0}</td>
            <td class="px-4 py-3 table-cell-center">
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="openEditModal('${posId}')" title="Edit Position" aria-label="Edit Position">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button class="btn-action btn-delete" onclick="deletePosition('${posId}', '${rate.position_name}')" title="Delete Position" aria-label="Delete Position">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </td>
        `;
    });
    console.log('Table rendered successfully');
}

async function handleRateFormSubmit(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    const data = {
        positionName: document.getElementById('positionName').value,
        workerType: document.getElementById('workerType').value,
        fullRate: document.getElementById('fullRate').value,
        halfRate: document.getElementById('halfRate').value,
        otherRate: '',
        positionNote: ''
    };
    
    try {
        const response = await fetch(`${BASE_URL}?action=addPosition`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.status === 'success' || result.success) {
            alert('Position saved successfully!');
            event.target.reset();
            fetchRates();
        } else {
            alert('Error: ' + (result.message || 'Failed to save position'));
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error saving position. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

let currentEditingPosition = null;

function openEditModal(posId) {
    const posData = positionDataMap[posId];
    if (!posData) {
        alert('Position data not found');
        return;
    }
    
    currentEditingPosition = { id: posId, data: posData };
    
    // Pre-fill the form with current values
    document.getElementById('editPositionName').value = posData.position_name || '';
    document.getElementById('editWorkerType').value = posData.worker_type || '';
    document.getElementById('editFullRate').value = posData.full_rate || '';
    document.getElementById('editHalfRate').value = posData.half_rate || '';
    
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingPosition = null;
}

window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}

async function deletePosition(posId, posName) {
    const deletePrompt = (window.WorkToolBackup && window.WorkToolBackup.getDeletePrompt)
        ? window.WorkToolBackup.getDeletePrompt('position', posName)
        : `Are you sure you want to delete the position \"${posName}\"? This action cannot be undone.`;
    if (!confirm(deletePrompt)) {
        return;
    }

    try {
        if (window.WorkToolBackup && typeof window.WorkToolBackup.createDeleteBackup === 'function') {
            await window.WorkToolBackup.createDeleteBackup('position', { id: posId, name: posName });
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
        const response = await fetch(`${BASE_URL}?action=deletePosition`, {
            method: 'POST',
            body: JSON.stringify({
                positionId: posId
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success' || result.success) {
            fetchRates();
            const successText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteSuccess)
                ? window.WorkToolBackup.getDeleteSuccess('position')
                : 'Position deleted successfully!';
            alert(successText);
        } else {
            const failText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteFail)
                ? window.WorkToolBackup.getDeleteFail('position')
                : 'Failed to delete position';
            alert(failText + ': ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting position:', error);
        const errorText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteError)
            ? window.WorkToolBackup.getDeleteError('position')
            : 'Error deleting position';
        alert(errorText);
    }
}

async function handleEditFormSubmit(event) {
    event.preventDefault();
    console.log('Edit form submitted');
    
    if (!currentEditingPosition) {
        console.error('No position selected for editing');
        alert('No position selected for editing');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
    
    const data = {
        action: 'updatePosition',
        positionId: currentEditingPosition.id,
        positionName: document.getElementById('editPositionName').value,
        workerType: document.getElementById('editWorkerType').value,
        fullRate: document.getElementById('editFullRate').value,
        halfRate: document.getElementById('editHalfRate').value
    };
    
    console.log('Sending update request with data:', data);
    
    try {
        const response = await fetch(`${BASE_URL}?action=updatePosition`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        console.log('Update response status:', response.status);
        const result = await response.json();
        console.log('Update result:', result);
        
        if (result.status === 'success' || result.success) {
            alert('Position updated successfully!');
            closeEditModal();
            fetchRates();
        } else {
            alert('Error: ' + (result.message || 'Failed to update position'));
        }
    } catch (error) {
        console.error('Error updating position:', error);
        alert('Error updating position. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing positions page');
    
    // Call fetchRates immediately
    fetchRates();
    
    const form = document.querySelector('#rateForm');
    if (form) {
        console.log('Found rateForm, attaching submit listener');
        form.addEventListener('submit', handleRateFormSubmit);
    } else {
        console.warn('rateForm not found');
    }
    
    const editForm = document.querySelector('#editForm');
    if (editForm) {
        console.log('Found editForm, attaching submit listener');
        editForm.addEventListener('submit', (e) => {
            console.log('Edit form submit clicked, triggering handleEditFormSubmit');
            handleEditFormSubmit(e);
        });
    } else {
        console.warn('editForm not found');
    }
    
    // Expose functions globally for debugging
    window.testEditForm = () => {
        console.log('Test: Opening first position for edit');
        const firstPosId = Object.keys(positionDataMap)[0];
        if (firstPosId) {
            openEditModal(firstPosId);
            console.log('Modal opened for position:', firstPosId);
        } else {
            console.error('No positions available to test');
        }
    };
});
