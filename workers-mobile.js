let workersData = [];
let sitesData = [];

async function init() {
    await loadSites();
    await loadWorkers();
    displayWorkers();
}

async function loadSites() {
    try {
        sitesData = await getAllSites();
        const select = document.getElementById('assigned_sites');
        select.innerHTML = '<option value="None">None</option>';
        sitesData.forEach(site => {
            const option = document.createElement('option');
            option.value = site.site_name;
            option.textContent = site.site_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading sites:', error);
    }
}

async function loadWorkers() {
    try {
        workersData = await getAllWorkers();
    } catch (error) {
        console.error('Error loading workers:', error);
        workersData = [];
    }
}

function displayWorkers() {
    const list = document.getElementById('workersList');
    
    if (workersData.length === 0) {
        list.innerHTML = '<div class="empty-state">No workers found. Add your first worker!</div>';
        return;
    }
    
    list.innerHTML = workersData.map((worker, index) => `
        <div class="list-card">
            <div class="list-card-header">
                <div class="list-card-title" onclick="window.location.href='worker-profile.html?worker_id=${worker.worker_id}'">${worker.name}</div>
                <span class="list-card-badge badge-${worker.position.toLowerCase()}">${worker.position}</span>
            </div>
            <div class="list-card-body">
                <div class="list-card-row">
                    <span>Phone:</span>
                    <span>${worker.phone}</span>
                </div>
                <div class="list-card-row">
                    <span>Type:</span>
                    <span>${worker.worker_type}</span>
                </div>
                <div class="list-card-row">
                    <span>Sites:</span>
                    <span>${Array.isArray(worker.assigned_sites) ? worker.assigned_sites.join(', ') : worker.assigned_sites || 'None'}</span>
                </div>
            </div>
            <div class="list-card-actions">
                <button class="btn btn-sm btn-primary" onclick="viewWorker('${worker.worker_id}')">View</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWorker('${worker.worker_id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function viewWorker(workerId) {
    window.location.href = `worker-profile.html?worker_id=${workerId}`;
}

async function deleteWorker(workerId) {
    const deletePrompt = (window.WorkToolBackup && window.WorkToolBackup.getDeletePrompt)
        ? window.WorkToolBackup.getDeletePrompt('worker')
        : 'Are you sure you want to delete this worker?';
    if (!confirm(deletePrompt)) {
        return;
    }

    try {
        await deleteData('workers', workerId);
        const successText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteSuccess)
            ? window.WorkToolBackup.getDeleteSuccess('worker')
            : 'Worker deleted successfully!';
        alert(successText);
        await loadWorkers();
        displayWorkers();
    } catch (error) {
        console.error('Error deleting worker:', error);
        const errorText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteError)
            ? window.WorkToolBackup.getDeleteError('worker')
            : 'Error deleting worker';
        alert(errorText + ': ' + error.message);
    }
}

document.getElementById('addWorkerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const selectedOptions = Array.from(document.getElementById('assigned_sites').selectedOptions);
    const assignedSites = selectedOptions.map(opt => opt.value);
    
    const workerData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        position: document.getElementById('position').value,
        worker_type: document.getElementById('worker_type').value,
        assigned_sites: assignedSites
    };
    
    try {
        await addData('workers', workerData);
        alert('Worker added successfully!');
        this.reset();
        await loadWorkers();
        displayWorkers();
    } catch (error) {
        alert('Error adding worker: ' + error.message);
    }
});

init();
