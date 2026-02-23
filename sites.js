let sitesData = [];
let siteSearchTerm = '';
let siteStatusFilter = 'all';

async function loadSites() {
    try {
        const response = await fetch(`${BASE_URL}?action=getSites`);
        if (!response.ok) throw new Error('Failed to fetch sites');
        sitesData = await response.json();
        renderSitesTable();
    } catch (error) {
        console.error('Error loading sites:', error);
        const tbody = document.getElementById('sitesBody');
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-10 text-center text-red-600 font-medium">Error loading sites. Please refresh.</td></tr>';
    }
}

function renderSitesTable() {
    const tbody = document.getElementById('sitesBody');
    tbody.innerHTML = '';

    const filteredSites = (sitesData || []).filter(site => {
        const isActive = site.status === undefined || site.status === 'active' || site.status === true;
        const statusMatch = siteStatusFilter === 'all' || (siteStatusFilter === 'active' && isActive) || (siteStatusFilter === 'inactive' && !isActive);
        const haystack = `${site.site_name || ''} ${site.location || ''} ${site.client_name || ''}`.toLowerCase();
        const searchMatch = !siteSearchTerm || haystack.includes(siteSearchTerm);
        return statusMatch && searchMatch;
    });
    
    if (!filteredSites || filteredSites.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-10 text-center text-slate-500 font-medium">No sites found. Add your first site above!</td></tr>';
        return;
    }
    
    filteredSites.forEach((site, index) => {
        const row = tbody.insertRow();
        const isActive = site.status === undefined || site.status === 'active' || site.status === true;
        const toggleClass = isActive ? 'active' : '';
        const toggleLabel = isActive ? 'ON' : 'OFF';
        const safeSiteName = (site.site_name || '').replace(/'/g, "\\'");
        const siteName = site.site_name || '-';
        const location = site.location || '-';
        const client = site.client_name || '-';
        const siteId = site.site_id || '';
        
        row.innerHTML = `
            <td class="px-4 py-3 text-center text-sm text-slate-600 font-semibold border-b border-slate-100">${index + 1}</td>
            <td class="px-4 py-3 text-center text-sm border-b border-slate-100">
                <a href="site-profile.html?id=${siteId}" class="text-primary font-semibold hover:underline">
                    ${siteName}
                </a>
            </td>
            <td class="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">${location}</td>
            <td class="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">${client}</td>
            <td class="px-4 py-3 text-center border-b border-slate-100">
                <button class="inline-flex items-center justify-center h-8 min-w-[58px] px-2 rounded-full text-[11px] font-bold tracking-wide ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}" onclick="toggleStatus('${siteId}', this)" data-active="${isActive ? 'true' : 'false'}" title="Toggle site status">
                    ${toggleLabel}
                </button>
            </td>
            <td class="px-4 py-3 text-center border-b border-slate-100">
                <div class="flex items-center justify-center gap-2">
                    <button class="h-8 w-8 grid place-items-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" onclick="deleteSite('${siteId}', '${safeSiteName}')" title="Delete site" aria-label="Delete site">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </td>
        `;
    });
}

function setupSiteFilters() {
    const searchInput = document.getElementById('siteSearch');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            siteSearchTerm = event.target.value.trim().toLowerCase();
            renderSitesTable();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (event) => {
            siteStatusFilter = event.target.value;
            renderSitesTable();
        });
    }
}

async function toggleStatus(siteId, element) {
    const isActive = element.dataset.active === 'true' || element.classList.contains('active');
    const newStatus = isActive ? 'inactive' : 'active';
    
    try {
        const response = await fetch(`${BASE_URL}?action=updateSiteStatus`, {
            method: 'POST',
            body: JSON.stringify({
                siteId: siteId,
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success' || result.success) {
            loadSites();
        } else {
            alert('Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
    }
}

async function deleteSite(siteId, siteName) {
    const deletePrompt = (window.WorkToolBackup && window.WorkToolBackup.getDeletePrompt)
        ? window.WorkToolBackup.getDeletePrompt('site', siteName)
        : `Are you sure you want to delete the site "${siteName}"? This action cannot be undone.`;
    if (!confirm(deletePrompt)) {
        return;
    }

    try {
        if (window.WorkToolBackup && typeof window.WorkToolBackup.createDeleteBackup === 'function') {
            await window.WorkToolBackup.createDeleteBackup('site', { id: siteId, name: siteName });
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
        const response = await fetch(`${BASE_URL}?action=deleteSite`, {
            method: 'POST',
            body: JSON.stringify({
                siteId: siteId
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success' || result.success) {
            loadSites();
            const successText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteSuccess)
                ? window.WorkToolBackup.getDeleteSuccess('site')
                : 'Site deleted successfully!';
            alert(successText);
        } else {
            const failText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteFail)
                ? window.WorkToolBackup.getDeleteFail('site')
                : 'Failed to delete site';
            alert(failText + ': ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting site:', error);
        const errorText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteError)
            ? window.WorkToolBackup.getDeleteError('site')
            : 'Error deleting site';
        alert(errorText);
    }
}

async function addSite(e) {
    e.preventDefault();
    
    const site_name = document.getElementById('site_name').value;
    const location = document.getElementById('location').value;
    const client_name = document.getElementById('client_name').value;
    
    if (!site_name || !location || !client_name) {
        alert('Please fill all required fields');
        return;
    }
    
    const data = {
        siteName: site_name,
        location: location,
        clientName: client_name
    };
    
    try {
        const response = await fetch(`${BASE_URL}?action=addSite`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.status === 'success' || result.success) {
            document.getElementById('addSiteForm').reset();
            loadSites();
            alert('Site added successfully!');
        } else {
            alert('Error: ' + (result.message || 'Failed to add site'));
        }
    } catch (error) {
        console.error('Error adding site:', error);
        alert('Error adding site');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSites();
    setupSiteFilters();
    document.getElementById('addSiteForm').addEventListener('submit', addSite);
});