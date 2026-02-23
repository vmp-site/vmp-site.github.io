// PDF Export Utility for Work Tool
// Uses html2pdf.js for client-side PDF generation

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Format currency (fallback if not available globally)
 */
if (typeof formatCurrency === 'undefined') {
    function formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
        return '₹' + parseFloat(amount).toLocaleString('en-IN', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        });
    }
}

/**
 * Sanitize filename for download
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

/**
 * Get current date string for filename
 */
function getCurrentDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Show PDF loading indicator
 */
function showPDFLoading(message = 'Generating PDF...') {
    // Create or show loading indicator
    let loader = document.getElementById('pdfLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'pdfLoader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        loader.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="font-size: 24px; margin-bottom: 15px;">📄</div>
                <div style="font-size: 18px; color: #333; margin-bottom: 10px;">${message}</div>
                <div style="font-size: 14px; color: #666;">Please wait...</div>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector('div div:nth-child(2)').textContent = message;
        loader.style.display = 'flex';
    }
}

/**
 * Hide PDF loading indicator
 */
function hidePDFLoading() {
    const loader = document.getElementById('pdfLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    console.log('✅ ' + message);
    // You can add a toast notification here if needed
}

/**
 * Show error message
 */
function showError(message) {
    console.error('❌ ' + message);
    alert(message); // Simple alert for now
}

/**
 * Get table rows from a table element
 */
function getTableRows(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return [];
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return [];
    
    const rows = tbody.querySelectorAll('tr');
    return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(cell => cell.textContent.trim()).join('</td><td>');
    }).map(row => `<tr><td>${row}</td></tr>`);
}

/**
 * Get date range label
 */
function getDateRangeLabel(filterType) {
    switch (filterType) {
        case 'today':
            return 'Today';
        case 'last7days':
            return 'Last 7 Days';
        case 'last30days':
            return 'Last 30 Days';
        case 'all':
        default:
            return 'All Time';
    }
}

// ================================
// PDF CONFIGURATION
// ================================

const PDF_CONFIG = {
    margin: 1,
    filename: 'work-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
};

// ================================
// GENERAL REPORT PDF EXPORT  
// ================================

/**
 * Export current filtered report as PDF
 * @param {string} filterType - Current filter type
 */
async function exportCurrentReportPDF() {
    try {
        console.log('Exporting current report as PDF...');
        
        // Show loading
        showPDFLoading('Generating PDF report...');
        
        // Get current filtered data (from global variables in report.js)
        const dateRange = getDateRange(currentFilter);
        const filteredAttendance = filterAttendanceByDate(currentFilter);
        const filteredPayments = filterPaymentsByDate(currentFilter);
        const totals = calculateFilteredTotals(filteredAttendance, filteredPayments);
        const combinedData = createCombinedTableData(filteredAttendance, filteredPayments);
        
        // Apply search filter if there's a search term
        let finalData = combinedData;
        if (currentSearchTerm && typeof filterTableDataBySearch === 'function') {
            finalData = filterTableDataBySearch(combinedData, currentSearchTerm);
        }
        
        // Create PDF content
        const pdfContent = createGeneralReportPDFContent(dateRange, totals, finalData, currentSearchTerm);
        
        // Generate filename
        const searchSuffix = currentSearchTerm ? `-search-${sanitizeFileName(currentSearchTerm)}` : '';
        const fileName = `general-report-${currentFilter}${searchSuffix}-${getCurrentDateString()}.pdf`;
        
        // Configure PDF options
        const options = {
            ...PDF_CONFIG,
            filename: fileName,
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } // Landscape for better table display
        };
        
        // Generate and download PDF
        await html2pdf().set(options).from(pdfContent).save();
        
        // Hide loading and show success
        hidePDFLoading();
        showSuccess(`✅ Report PDF downloaded: ${fileName}`);
        
        console.log('General report PDF exported successfully');
        
    } catch (error) {
        hidePDFLoading();
        console.error('Error exporting general report PDF:', error);
        showError('❌ Failed to generate PDF. Please try again.');
    }
}

/**
 * Create HTML content for general report PDF
 */
function createGeneralReportPDFContent(dateRange, totals, tableData, searchTerm = '') {
    const currentDate = new Date().toLocaleDateString('en-IN');
    const currentTime = new Date().toLocaleTimeString('en-IN');
    
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 15px; max-width: 100%; margin: 0 auto; font-size: 11px;">
            <!-- Header Section -->
            <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #3498db; padding-bottom: 15px;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold;">📊 BUSINESS ANALYTICS REPORT</h1>
                <h2 style="color: #3498db; margin: 8px 0; font-size: 18px;">${dateRange.label}</h2>
                ${searchTerm ? `<p style="color: #e74c3c; margin: 5px 0; font-size: 14px; font-weight: bold;">🔍 Search: "${searchTerm}"</p>` : ''}
                <div style="color: #7f8c8d; margin: 8px 0; font-size: 12px;">
                    <span>Generated on: ${currentDate} at ${currentTime}</span> | 
                    <span>Total Records: ${tableData.length}</span>
                </div>
            </div>
            
            <!-- Financial Summary Section -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; font-size: 16px; margin-bottom: 15px;">💰 Financial Summary</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <tr>
                        <td style="padding: 8px 12px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); font-weight: bold; border: 1px solid #dee2e6; width: 25%;">📋 Total Work Amount:</td>
                        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-weight: bold; color: #f39c12; font-size: 13px;">${formatCurrency(totals.totalWorkAmount)}</td>
                        <td style="padding: 8px 12px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); font-weight: bold; border: 1px solid #dee2e6; width: 25%;">💳 Total Paid:</td>
                        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-weight: bold; color: #27ae60; font-size: 13px;">${formatCurrency(totals.totalPaidAmount)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); font-weight: bold; border: 1px solid #dee2e6;">💰 Total Received:</td>
                        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-weight: bold; color: #27ae60; font-size: 13px;">${formatCurrency(totals.totalReceivedAmount)}</td>
                        <td style="padding: 8px 12px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); font-weight: bold; border: 1px solid #dee2e6;">⏰ Pending Balance:</td>
                        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-weight: bold; color: ${totals.pendingBalance >= 0 ? '#e74c3c' : '#27ae60'}; font-size: 13px;">${formatCurrency(totals.pendingBalance)}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Detailed Records Section -->
            ${tableData.length > 0 ? `
            <div>
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; font-size: 16px; margin-bottom: 15px;">📋 Detailed Records</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #3498db, #2980b9); color: white;">
                            <th style="padding: 8px 6px; border: 1px solid #fff; text-align: center; width: 8%;">#</th>
                            <th style="padding: 8px 6px; border: 1px solid #fff; text-align: left; width: 12%;">Date</th>
                            <th style="padding: 8px 6px; border: 1px solid #fff; text-align: left; width: 28%;">Name & Location</th>
                            <th style="padding: 8px 6px; border: 1px solid #fff; text-align: center; width: 12%;">Type</th>
                            <th style="padding: 8px 6px; border: 1px solid #fff; text-align: right; width: 12%;">Amount</th>
                            <th style="padding: 8px 6px; border: 1px solid #fff; text-align: left; width: 12%;">Mode</th>
                            <th style="padding: 8px 6px; border: 1px solid #fff; text-align: left; width: 16%;">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableData.map((row, index) => {
                            const isEven = index % 2 === 0;
                            const bgColor = isEven ? '#f8f9fa' : '#ffffff';
                            const amountColor = row.type === 'attendance' ? '#f39c12' : (row.paymentType === 'given' ? '#e74c3c' : '#27ae60');
                            const typeText = row.type === 'attendance' ? '🔨 Work' : (row.paymentType === 'given' ? '💸 Paid' : '💰 Received');
                            const typeColor = row.type === 'attendance' ? '#f39c12' : (row.paymentType === 'given' ? '#e74c3c' : '#27ae60');
                            
                            return `
                                <tr style="background-color: ${bgColor};">
                                    <td style="padding: 6px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #7f8c8d;">${index + 1}</td>
                                    <td style="padding: 6px; border: 1px solid #dee2e6; font-weight: bold; color: #2c3e50;">${row.date}</td>
                                    <td style="padding: 6px; border: 1px solid #dee2e6; color: #2c3e50; line-height: 1.2;">${row.name}</td>
                                    <td style="padding: 6px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: ${typeColor};">${typeText}</td>
                                    <td style="padding: 6px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: ${amountColor};">${formatCurrency(row.amount)}</td>
                                    <td style="padding: 6px; border: 1px solid #dee2e6; color: #34495e;">${row.mode}</td>
                                    <td style="padding: 6px; border: 1px solid #dee2e6; color: #7f8c8d; font-size: 9px; line-height: 1.2;">${row.note}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ` : `
            <div style="text-align: center; padding: 30px; color: #7f8c8d;">
                <h3>📭 No Records Found</h3>
                <p>No data available for the selected criteria.</p>
            </div>
            `}
            
            <!-- Footer Section -->
            <div style="margin-top: 25px; text-align: center; font-size: 10px; color: #95a5a6; border-top: 1px solid #ecf0f1; padding-top: 15px;">
                <div style="margin-bottom: 5px;">
                    <strong>Work Tool - Professional Analytics Dashboard</strong>
                </div>
                <div style="opacity: 0.8;">
                    Report generated automatically | Data accuracy verified | ${tableData.length} records processed
                </div>
                <div style="margin-top: 5px; font-size: 9px;">
                    © ${new Date().getFullYear()} - Confidential Business Report
                </div>
            </div>
        </div>
    `;
}

// ================================
// WORKER REPORT PDF EXPORT
// ================================

/**
 * Export worker profile as PDF
 * @param {string} workerId - Worker ID
 * @param {string} workerName - Worker name
 * @param {string} dateFilter - Current date filter
 */
async function exportWorkerPDF(workerId, workerName, dateFilter = 'all') {
    try {
        console.log(`Exporting PDF for worker: ${workerName}`);
        
        // Show loading
        showPDFLoading('Generating PDF...');
        
        // Create PDF content
        const pdfContent = createWorkerPDFContent(workerId, workerName, dateFilter);
        
        // Generate filename
        const fileName = `worker-report-${sanitizeFileName(workerName)}-${getCurrentDateString()}.pdf`;
        
        // Configure PDF options
        const options = {
            ...PDF_CONFIG,
            filename: fileName
        };
        
        // Generate and download PDF
        await html2pdf().set(options).from(pdfContent).save();
        
        // Hide loading and show success
        hidePDFLoading();
        showSuccess(`✅ PDF downloaded: ${fileName}`);
        
        console.log('Worker PDF exported successfully');
        
    } catch (error) {
        hidePDFLoading();
        console.error('Error exporting worker PDF:', error);
        showError('❌ Failed to generate PDF. Please try again.');
    }
}

/**
 * Create HTML content for worker PDF
 */
function createWorkerPDFContent(workerId, workerName, dateFilter) {
    // Get current data from page
    const totalWork = document.getElementById('totalWork')?.textContent || '₹0';
    const totalPaid = document.getElementById('totalPaid')?.textContent || '₹0';
    const pendingAmount = document.getElementById('pendingAmount')?.textContent || '₹0';
    
    // Get attendance table data
    const attendanceRows = getTableRows('attendanceTable');
    
    // Get payments table data
    const paymentsRows = getTableRows('paymentsTable');
    
    const dateRange = getDateRangeLabel(dateFilter);
    
    return `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3498db; padding-bottom: 20px;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Worker Report</h1>
                <h2 style="color: #3498db; margin: 10px 0; font-size: 22px;">${workerName}</h2>
                <p style="color: #666; margin: 5px 0; font-size: 16px;">Report Period: ${dateRange}</p>
                <p style="color: #888; margin: 5px 0; font-size: 14px;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Financial Summary</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Total Work Amount:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #f39c12;">${totalWork}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Total Paid:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #27ae60;">${totalPaid}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Pending Amount:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #e74c3c;">${pendingAmount}</td>
                    </tr>
                </table>
            </div>
            
            ${attendanceRows.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Attendance Records</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #3498db; color: white;">
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Date</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Site</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Work Type</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Work Title</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendanceRows}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${paymentsRows.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Payment Records</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #27ae60; color: white;">
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Date</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Site</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Amount</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Type</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Mode</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentsRows}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ecf0f1; padding-top: 20px;">
                <p>Generated by Work Tool • ${new Date().toLocaleString('en-IN')}</p>
            </div>
        </div>
    `;
}

// ================================
// SITE REPORT PDF EXPORT
// ================================

/**
 * Export site profile as PDF
 * @param {string} siteId - Site ID
 * @param {string} siteName - Site name
 * @param {string} dateFilter - Current date filter
 */
async function exportSitePDF(siteId, siteName, dateFilter = 'all') {
    try {
        console.log(`Exporting PDF for site: ${siteName}`);
        
        // Show loading
        showPDFLoading('Generating PDF...');
        
        // Create PDF content
        const pdfContent = createSitePDFContent(siteId, siteName, dateFilter);
        
        // Generate filename
        const fileName = `site-report-${sanitizeFileName(siteName)}-${getCurrentDateString()}.pdf`;
        
        // Configure PDF options
        const options = {
            ...PDF_CONFIG,
            filename: fileName
        };
        
        // Generate and download PDF
        await html2pdf().set(options).from(pdfContent).save();
        
        // Hide loading and show success
        hidePDFLoading();
        showSuccess(`✅ PDF downloaded: ${fileName}`);
        
        console.log('Site PDF exported successfully');
        
    } catch (error) {
        hidePDFLoading();
        console.error('Error exporting site PDF:', error);
        showError('❌ Failed to generate PDF. Please try again.');
    }
}

/**
 * Create HTML content for site PDF
 */
function createSitePDFContent(siteId, siteName, dateFilter) {
    // Get current data from page
    const totalReceived = document.getElementById('totalReceived')?.textContent || '₹0';
    const totalGiven = document.getElementById('totalGiven')?.textContent || '₹0';
    const balanceAmount = document.getElementById('balanceAmount')?.textContent || '₹0';
    
    // Get attendance table data
    const attendanceRows = getTableRows('attendanceTable');
    
    // Get payments table data
    const paymentsRows = getTableRows('paymentsTable');
    
    const dateRange = getDateRangeLabel(dateFilter);
    
    return `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #e74c3c; padding-bottom: 20px;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Site Report</h1>
                <h2 style="color: #e74c3c; margin: 10px 0; font-size: 22px;">${siteName}</h2>
                <p style="color: #666; margin: 5px 0; font-size: 16px;">Report Period: ${dateRange}</p>
                <p style="color: #888; margin: 5px 0; font-size: 14px;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Financial Summary</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Total Received:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #27ae60;">${totalReceived}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Total Given:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #e74c3c;">${totalGiven}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Balance:</td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #f39c12;">${balanceAmount}</td>
                    </tr>
                </table>
            </div>
            
            ${attendanceRows.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Attendance Records</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #f39c12; color: white;">
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Date</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Worker</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Work Type</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Work Title</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendanceRows}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${paymentsRows.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Payment Records</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #27ae60; color: white;">
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Date</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Worker</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Amount</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Type</th>
                            <th style="padding: 10px; border: 1px solid #dee2e6;">Mode</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentsRows}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ecf0f1; padding-top: 20px;">
                <p>Generated by Work Tool • ${new Date().toLocaleString('en-IN')}</p>
            </div>
        </div>
    `;
}

// ================================
// GENERAL REPORT PDF EXPORT
// ================================

/**
 * Export general report as PDF
 * @param {string} dateFilter - Current date filter
 */
async function exportGeneralReportPDF(dateFilter = 'all') {
    try {
        console.log(`Exporting general report PDF`);
        
        // Show loading
        showPDFLoading('Generating PDF...');
        
        // Get current totals
        const totalWork = document.getElementById('totalWorkAmount')?.textContent || '₹0';
        const totalPaid = document.getElementById('totalPaidAmount')?.textContent || '₹0';
        const totalReceived = document.getElementById('totalReceivedAmount')?.textContent || '₹0';
        const pending = document.getElementById('pendingBalance')?.textContent || '₹0';
        
        // Get report table data
        const reportRows = getTableRows('reportTable');
        
        const dateRange = getDateRangeLabel(dateFilter);
        const fileName = `work-report-${dateFilter}-${getCurrentDateString()}.pdf`;
        
        const pdfContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #9b59b6; padding-bottom: 20px;">
                    <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Work Tool Report</h1>
                    <p style="color: #666; margin: 10px 0; font-size: 16px;">Period: ${dateRange}</p>
                    <p style="color: #888; margin: 5px 0; font-size: 14px;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Financial Summary</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Total Work:</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #f39c12;">${totalWork}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Total Paid:</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #27ae60;">${totalPaid}</td>
                            </tr>
                        </table>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Total Received:</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #2ecc71;">${totalReceived}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; border: 1px solid #dee2e6;">Pending:</td>
                                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; color: #e74c3c;">${pending}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                ${reportRows.length > 0 ? `
                <div>
                    <h3 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Detailed Records</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px;">
                        <thead>
                            <tr style="background-color: #34495e; color: white;">
                                <th style="padding: 8px; border: 1px solid #dee2e6;">Date</th>
                                <th style="padding: 8px; border: 1px solid #dee2e6;">Name</th>
                                <th style="padding: 8px; border: 1px solid #dee2e6;">Type</th>
                                <th style="padding: 8px; border: 1px solid #dee2e6;">Amount</th>
                                <th style="padding: 8px; border: 1px solid #dee2e6;">Mode</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportRows}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ecf0f1; padding-top: 20px;">
                    <p>Generated by Work Tool • ${new Date().toLocaleString('en-IN')}</p>
                </div>
            </div>
        `;
        
        // Configure PDF options
        const options = {
            ...PDF_CONFIG,
            filename: fileName
        };
        
        // Generate and download PDF
        await html2pdf().set(options).from(pdfContent).save();
        
        // Hide loading and show success
        hidePDFLoading();
        showSuccess(`✅ PDF downloaded: ${fileName}`);
        
    } catch (error) {
        hidePDFLoading();
        console.error('Error exporting general report PDF:', error);
        showError('❌ Failed to generate PDF. Please try again.');
    }
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get table rows as HTML string
 */
function getTableRows(tableId) {
    const table = document.getElementById(tableId);
    if (!table || table.style.display === 'none') return '';
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return '';
    
    return Array.from(tbody.querySelectorAll('tr')).map(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(cell => {
            let content = cell.textContent.trim();
            // Clean up any special formatting
            content = content.replace(/\s+/g, ' ');
            return `<td style="padding: 8px; border: 1px solid #dee2e6;">${content}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
}

/**
 * Get date range label
 */
function getDateRangeLabel(filter) {
    const labels = {
        'today': 'Today',
        'last7days': 'Last 7 Days',
        'last30days': 'Last 30 Days',
        'all': 'All Time'
    };
    return labels[filter] || 'All Time';
}

/**
 * Sanitize filename
 */
function sanitizeFileName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Get current date string for filename
 */
function getCurrentDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Show PDF loading indicator
 */
function showPDFLoading(message = 'Generating PDF...') {
    let loader = document.getElementById('pdfLoader');
    
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'pdfLoader';
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(loader);
    }
    
    loader.innerHTML = `
        <div style="font-size: 18px; color: #2c3e50; margin-bottom: 15px;">
            📄 ${message}
        </div>
        <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #ecf0f1; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    loader.style.display = 'block';
}

/**
 * Hide PDF loading indicator
 */
function hidePDFLoading() {
    const loader = document.getElementById('pdfLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// ================================
// CREATE PDF BUTTONS
// ================================

/**
 * Create PDF download button HTML
 */
function createPDFButton(type = 'general', id = '', name = '') {
    const buttonId = `pdfBtn${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    return `
        <button 
            id="${buttonId}" 
            class="pdf-btn" 
            onclick="handlePDFExport('${type}', '${id}', '${name}')"
            style="
                background-color: #e74c3c;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                margin: 10px 0;
            "
            onmouseover="this.style.backgroundColor='#c0392b'; this.style.transform='translateY(-2px)'"
            onmouseout="this.style.backgroundColor='#e74c3c'; this.style.transform='translateY(0)'"
        >
            📄 Download PDF
        </button>
    `;
}

/**
 * Handle PDF export based on type
 */
function handlePDFExport(type, id = '', name = '') {
    const currentFilter = getCurrentFilter();
    
    switch (type) {
        case 'worker':
            exportWorkerPDF(id, name, currentFilter);
            break;
        case 'site':
            exportSitePDF(id, name, currentFilter);
            break;
        case 'general':
        default:
            exportGeneralReportPDF(currentFilter);
            break;
    }
}

/**
 * Get current filter from page
 */
function getCurrentFilter() {
    const activeFilter = document.querySelector('.filter-btn.active');
    return activeFilter ? activeFilter.dataset.filter : 'all';
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Sanitize filename for safe file saving
 * @param {string} fileName - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFileName(fileName) {
    return fileName
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')     // Replace spaces with dashes
        .toLowerCase();
}

/**
 * Get current date string for filename
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getCurrentDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get date range label based on filter type
 * @param {string} filterType - Filter type
 * @returns {string} Date range label
 */
function getDateRangeLabel(filterType) {
    switch (filterType) {
        case 'today':
            return 'Today';
        case 'last7days':
            return 'Last 7 Days';
        case 'last30days':
            return 'Last 30 Days';
        case 'all':
        default:
            return 'All Data';
    }
}

/**
 * Get table rows from a table element
 * @param {string} tableId - Table element ID
 * @returns {string} HTML string of table rows
 */
function getTableRows(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return '';
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return '';
    
    return tbody.innerHTML;
}

/**
 * Show PDF loading indicator
 * @param {string} message - Loading message
 */
function showPDFLoading(message = 'Generating PDF...') {
    // Create or update loading overlay
    let overlay = document.getElementById('pdf-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pdf-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-size: 18px;
            font-weight: 500;
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 10px; backdrop-filter: blur(10px);">
            <div style="font-size: 30px; margin-bottom: 15px;">📄</div>
            <div>${message}</div>
            <div style="margin-top: 10px; font-size: 14px; opacity: 0.8;">Please wait...</div>
        </div>
    `;
    overlay.style.display = 'flex';
}

/**
 * Hide PDF loading indicator
 */
function hidePDFLoading() {
    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
    console.log(message);
    
    // Create success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transform: translateX(400px);
        transition: all 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    console.error(message);
    
    // Create error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transform: translateX(400px);
        transition: all 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 5000);
}

// ================================
// FALLBACK UTILITY FUNCTIONS
// ================================

/**
 * Fallback currency formatter if not available from other modules
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
if (typeof formatCurrency === 'undefined') {
    window.formatCurrency = function(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '₹0';
        }
        
        const num = parseFloat(amount);
        if (num === 0) {
            return '₹0';
        }
        
        // Format with Indian number system (lakhs and crores)
        const absNum = Math.abs(num);
        let formatted = '';
        
        if (absNum >= 10000000) { // 1 crore
            formatted = (absNum / 10000000).toFixed(1) + 'Cr';
        } else if (absNum >= 100000) { // 1 lakh
            formatted = (absNum / 100000).toFixed(1) + 'L';
        } else if (absNum >= 1000) { // 1 thousand
            formatted = (absNum / 1000).toFixed(1) + 'K';
        } else {
            formatted = absNum.toFixed(0);
        }
        
        return (num < 0 ? '-₹' : '₹') + formatted;
    };
}

console.log('📄 PDF Export utility loaded');
console.log('🚀 Ready to generate professional PDF reports');