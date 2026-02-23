let materialsData = [];
let sitesData = [];
let filteredMaterials = [];

// JSONP helper for material submissions
function jsonpRequest(action, params, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const callbackName = 'callback_' + action + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const timeout = setTimeout(() => {
            delete window[callbackName];
            reject(new Error(`Timeout after ${timeoutMs/1000}s`));
        }, timeoutMs);
        
        window[callbackName] = (data) => {
            clearTimeout(timeout);
            delete window[callbackName];
            resolve(data);
        };
        
        const queryParams = new URLSearchParams({ action, callback: callbackName, ...params });
        const script = document.createElement('script');
        script.src = `${BASE_URL}?${queryParams}`;
        script.onerror = () => {
            clearTimeout(timeout);
            delete window[callbackName];
            reject(new Error('JSONP script loading failed'));
        };
        document.head.appendChild(script);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📦 Material Entry page loaded');
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;
    document.getElementById('filterDateTo').value = today;
    
    // Load sites first, then materials
    await loadSites();
    await loadMaterials();
});

// Format date as DD/MM/YYYY
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

async function loadSites() {
    try {
        const response = await fetch(`${BASE_URL}?action=getSites`);
        if (!response.ok) throw new Error('Failed to fetch sites');
        sitesData = await response.json();
        
        // Populate site dropdowns
        const siteSelects = [document.getElementById('siteName'), document.getElementById('filterSite')];
        siteSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Site</option>';
            sitesData.forEach(site => {
                const option = document.createElement('option');
                option.value = site.site_id;
                option.text = site.site_name || site.site_id;
                select.appendChild(option);
            });
            select.value = currentValue;
        });
        
        console.log('✅ Loaded ' + sitesData.length + ' sites');
    } catch (error) {
        console.error('❌ Error loading sites:', error);
        showMessage('Error loading sites', 'error');
    }
}

async function loadMaterials() {
    try {
        const response = await fetch(`${BASE_URL}?action=getMaterials`);
        if (!response.ok) throw new Error('Failed to fetch materials');
        materialsData = await response.json();
        
        // Debug: Check date format from backend
        if (materialsData.length > 0) {
            console.log('Sample material data:', materialsData[0]);
            console.log('Sample date_added format:', materialsData[0].date_added);
        }
        
        console.log('✅ Loaded ' + materialsData.length + ' materials');
        filteredMaterials = [...materialsData];
        renderMaterialsTable();
    } catch (error) {
        console.error('❌ Error loading materials:', error);
        showMessage('Error loading materials', 'error');
        const tbody = document.getElementById('materialsBody');
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading materials. Please refresh.</td></tr>';
    }
}

function renderMaterialsTable() {
    const tbody = document.getElementById('materialsBody');
    tbody.innerHTML = '';
    
    if (!filteredMaterials || filteredMaterials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--gray-600);">No materials found</td></tr>';
        return;
    }
    
    filteredMaterials.forEach((material, index) => {
        const row = tbody.insertRow();
        
        // Get site name
        const site = sitesData.find(s => String(s.site_id) === String(material.site_id));
        const siteName = site ? site.site_name : material.site_id;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${material.date_added ? formatDate(material.date_added) : '-'}</td>
            <td>${siteName || '-'}</td>
            <td>${material.category || '-'}</td>
            <td><span class="amount-badge">₹${parseFloat(material.amount || 0).toFixed(2)}</span></td>
            <td>${parseFloat(material.quantity || 0).toFixed(2)}</td>
            <td>${(material.note || '-').substring(0, 20)}</td>
            <td style="text-align: center;">
                <button class="action-btn update-btn" onclick="openUpdateModal('${material.material_id}')" title="Update" aria-label="Update">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
            </td>
            <td style="text-align: center;">
                <button class="action-btn delete-btn" onclick="deleteMaterial('${material.material_id}', '${material.category}')" title="Delete" aria-label="Delete">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        `;
    });
}

async function addMaterial() {
    const entryDate = document.getElementById('entryDate').value;
    const siteId = document.getElementById('siteName').value;
    const category = document.getElementById('category').value;
    const amount = document.getElementById('amount').value;
    const quantity = document.getElementById('quantity').value;
    const note = document.getElementById('note').value;
    
    // Validation
    if (!entryDate || !siteId || !category || !amount || !quantity) {
        showMessage('❌ Please fill in all required fields (*)', 'error');
        return;
    }
    
    try {
        const result = await jsonpRequest('addMaterial', {
            site_id: siteId,
            category: category,
            amount: parseFloat(amount),
            quantity: parseFloat(quantity),
            note: note,
            date_added: entryDate
        });
        
        if (result.status === 'success') {
            console.log('✅ Material added successfully');
            showMessage('✅ Material added successfully!', 'success');
            clearForm();
            await loadMaterials();
        } else {
            showMessage('❌ ' + (result.message || 'Failed to add material'), 'error');
        }
    } catch (error) {
        console.error('❌ Error adding material:', error);
        showMessage('❌ Error adding material: ' + error.message, 'error');
    }
}

async function openUpdateModal(materialId) {
    const material = materialsData.find(m => String(m.material_id) === String(materialId));
    if (!material) {
        showMessage('Material not found', 'error');
        return;
    }
    
    // Clear any previous modal messages
    document.getElementById('modalMessage').className = 'message';
    document.getElementById('modalMessage').textContent = '';
    
    // Populate site dropdown first
    const updateSiteSelect = document.getElementById('updateSiteName');
    updateSiteSelect.innerHTML = '<option value="">Select Site</option>';
    sitesData.forEach(site => {
        const option = document.createElement('option');
        option.value = site.site_id;
        option.text = site.site_name || site.site_id;
        updateSiteSelect.appendChild(option);
    });
    
    // Populate form with material data
    document.getElementById('updateMaterialId').value = material.material_id;
    
    // Convert date to YYYY-MM-DD format for input[type=date]
    let dateValue = material.date_added || '';
    console.log('Original date_added:', dateValue); // Debug
    
    if (dateValue && dateValue.includes('/')) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parts = dateValue.split('/');
        if (parts.length === 3) {
            dateValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            console.log('Converted date (slash):', dateValue); // Debug
        }
    } else if (dateValue && dateValue.includes('-')) {
        // Handle DD-MM-YYYY (dash) to YYYY-MM-DD
        const parts = dateValue.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 2 && parts[2].length === 4) {
                // Looks like DD-MM-YYYY
                dateValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                console.log('Converted date (dash dd-mm-yyyy):', dateValue); // Debug
            } else if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
                // Already YYYY-MM-DD, keep as is
                console.log('Date already yyyy-mm-dd:', dateValue); // Debug
            }
        }
    } else if (dateValue && !dateValue.includes('-')) {
        // If it's not in any recognized format, try to parse it
        console.log('Date in unknown format:', dateValue);
    }
    
    // If still no date, use today
    if (!dateValue) {
        dateValue = new Date().toISOString().split('T')[0];
        console.log('No date found, using today:', dateValue);
    }
    
    console.log('Setting date input to:', dateValue); // Debug
    
    // Set all form values
    const dateInput = document.getElementById('updateEntryDate');
    dateInput.value = dateValue;
    
    // Verify it was set
    console.log('Date input actual value after setting:', dateInput.value);
    
    document.getElementById('updateSiteName').value = material.site_id || '';
    document.getElementById('updateCategory').value = material.category || '';
    document.getElementById('updateAmount').value = material.amount || '';
    document.getElementById('updateQuantity').value = material.quantity || '';
    document.getElementById('updateNote').value = material.note || '';
    
    // Show modal
    document.getElementById('updateModal').style.display = 'flex';
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeUpdateModal() {
    document.getElementById('updateModal').style.display = 'none';
    // Allow body scroll
    document.body.style.overflow = 'auto';
}

async function submitUpdate() {
    console.log('submitUpdate called'); // Debug log
    const materialId = document.getElementById('updateMaterialId').value;
    const entryDate = document.getElementById('updateEntryDate').value;
    const siteId = document.getElementById('updateSiteName').value;
    const category = document.getElementById('updateCategory').value;
    const amount = document.getElementById('updateAmount').value;
    const quantity = document.getElementById('updateQuantity').value;
    const note = document.getElementById('updateNote').value;
    
    console.log('Form values:', { materialId, entryDate, siteId, category, amount, quantity, note }); // Debug log
    
    if (!entryDate || !siteId || !category || !amount || !quantity) {
        console.log('Validation failed - missing required fields');
        showModalMessage('❌ Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const result = await jsonpRequest('updateMaterial', {
            material_id: materialId,
            site_id: siteId,
            category: category,
            amount: parseFloat(amount),
            quantity: parseFloat(quantity),
            note: note,
            date_added: entryDate
        });
        
        console.log('Backend response:', result); // Debug log
        
        if (result.status === 'success') {
            console.log('✅ Material updated successfully');
            showMessage('✅ Material updated successfully!', 'success');
            closeUpdateModal();
            await loadMaterials();
        } else {
            showModalMessage('❌ ' + (result.message || 'Failed to update material'), 'error');
        }
    } catch (error) {
        console.error('❌ Error updating material:', error);
        showModalMessage('❌ Error updating material: ' + error.message, 'error');
    }
}

async function deleteMaterial(materialId, category) {
    const deletePrompt = (window.WorkToolBackup && window.WorkToolBackup.getDeletePrompt)
        ? window.WorkToolBackup.getDeletePrompt('material', category)
        : `Are you sure you want to delete this ${category} material?`;
    if (!confirm(deletePrompt)) {
        return;
    }

    try {
        if (window.WorkToolBackup && typeof window.WorkToolBackup.createDeleteBackup === 'function') {
            await window.WorkToolBackup.createDeleteBackup('material', { id: materialId, name: category });
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
        const result = await jsonpRequest('deleteMaterial', {
            material_id: materialId
        });
        
        if (result.status === 'success') {
            console.log('✅ Material deleted successfully');
            const successText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteSuccess)
                ? window.WorkToolBackup.getDeleteSuccess('material')
                : 'Material deleted successfully!';
            showMessage('✅ ' + successText, 'success');
            await loadMaterials();
        } else {
            const failText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteFail)
                ? window.WorkToolBackup.getDeleteFail('material')
                : 'Failed to delete material';
            showMessage('❌ ' + (result.message || failText), 'error');
        }
    } catch (error) {
        console.error('❌ Error deleting material:', error);
        const errorText = (window.WorkToolBackup && window.WorkToolBackup.getDeleteError)
            ? window.WorkToolBackup.getDeleteError('material')
            : 'Error deleting material';
        showMessage('❌ ' + errorText + ': ' + error.message, 'error');
    }
}

function applyFilters() {
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const siteId = document.getElementById('filterSite').value;
    const category = document.getElementById('filterCategory').value;
    
    console.log('🔍 Applying filters - From:', dateFrom, 'To:', dateTo, 'Site:', siteId, 'Category:', category);
    
    filteredMaterials = materialsData.filter(material => {
        const materialDate = material.date_added;
        
        // Date range filter
        if (dateFrom && materialDate < dateFrom) return false;
        if (dateTo && materialDate > dateTo) return false;
        
        // Site filter
        if (siteId && String(material.site_id) !== String(siteId)) return false;
        
        // Category filter
        if (category && material.category !== category) return false;
        
        return true;
    });
    
    console.log('📊 Filtered to ' + filteredMaterials.length + ' materials');
    renderMaterialsTable();
    showMessage(`✅ Filtered: ${filteredMaterials.length} materials found`, 'success');
}

function clearFilters() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterSite').value = '';
    document.getElementById('filterCategory').value = '';
    
    filteredMaterials = [...materialsData];
    renderMaterialsTable();
    showMessage('✅ Filters cleared', 'success');
}

function clearForm() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;
    document.getElementById('siteName').value = '';
    document.getElementById('category').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('note').value = '';
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        messageEl.className = 'message';
    }, 3000);
}

function showModalMessage(text, type) {
    const messageEl = document.getElementById('modalMessage');
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageEl.className = 'message';
    }, 5000);
}

function exportPDF() {
    if (!filteredMaterials || filteredMaterials.length === 0) {
        showMessage('❌ No materials to export', 'error');
        return;
    }
    
    // Check if jsPDF is loaded
    if (typeof jsPDF === 'undefined') {
        showMessage('❌ PDF library not loaded', 'error');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const { autoTable } = window;
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Add header background
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        // Add title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('📦 MATERIAL REPORT', 14, 17);
        
        // Reset color and add metadata
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-IN');
        const timeStr = today.toLocaleTimeString('en-IN');
        
        doc.text(`Generated on: ${dateStr} at ${timeStr}`, 14, 35);
        
        // Add summary
        const totalAmount = filteredMaterials.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
        const totalQuantity = filteredMaterials.reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0);
        const totalRecords = filteredMaterials.length;
        
        doc.setFont(undefined, 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 42, pageWidth - 28, 10, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(9);
        doc.text(`Total Records: ${totalRecords}  |  Total Amount: ₹${totalAmount.toFixed(2)}  |  Total Quantity: ${totalQuantity.toFixed(2)}`, 14, 48);
        
        // Prepare table data
        const tableData = filteredMaterials.map((material, idx) => {
            const site = sitesData.find(s => String(s.site_id) === String(material.site_id));
            const siteName = site ? site.site_name : material.site_id;
            
            return [
                idx + 1,
                material.date_added || '-',
                siteName || '-',
                material.category || '-',
                '₹' + parseFloat(material.amount || 0).toFixed(2),
                material.quantity || '-',
                (material.note || '-').substring(0, 20)
            ];
        });
        
        // Add table with premium styling
        autoTable(doc, {
            head: [['#', 'Date', 'Site', 'Category', 'Amount', 'Qty', 'Note']],
            body: tableData,
            startY: 55,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left',
                cellPadding: 3
            },
            bodyStyles: {
                textColor: [50, 50, 50],
                fontSize: 8,
                cellPadding: 3
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'center', cellWidth: 20 },
                2: { cellWidth: 30 },
                3: { cellWidth: 25 },
                4: { halign: 'right', cellWidth: 20 },
                5: { halign: 'center', cellWidth: 15 },
                6: { cellWidth: 25 }
            },
            margin: { left: 14, right: 14 }
        });
        
        // Add footer summary
        const finalY = doc.lastAutoTable.finalY + 12;
        
        doc.setFont(undefined, 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, finalY - 2, pageWidth - 28, 12, 'F');
        
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(9);
        doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, finalY + 4);
        doc.text(`Total Quantity: ${totalQuantity.toFixed(2)} units`, 50, finalY + 4);
        doc.text(`Records: ${totalRecords}`, 100, finalY + 4);
        
        // Add footer
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('© Work Manager - Material Report', 14, pageHeight - 8);
        
        // Save
        doc.save(`Material_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showMessage('✅ PDF exported successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting PDF:', error);
        showMessage('❌ Error exporting PDF: ' + error.message, 'error');
    }
}
