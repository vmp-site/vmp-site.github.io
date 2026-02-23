/**
 * Google Apps Script Backend for Work Tool
 * Copy this code to your Google Apps Script project
 * Make sure to create a Google Sheet with the following tabs:
 * - Workers (columns: worker_id, name, phone, address)
 * - Sites (columns: site_id, name, location, manager) 
 * - Attendance (columns: id, date, worker_id, site_id, work_type, work_title, rate)
 * - Payments (columns: id, date, worker_id, site_id, amount, type, mode)
 */

// Replace this with your Google Sheet ID
const SHEET_ID = '1ge0vFpJqw55cqe_RiqUD2fLMhtwaHgq06BaA9JGMMCw';

/**
 * Main function to handle HTTP requests (CORS FIXED)
 */
    function doGet(e) {
    try {
        const action = e.parameter.action;
        
        console.log('Received GET request:', action);
        
        switch (action) {
            case 'getWorkers':
                return createCORSResponse(getWorkers());
            case 'getSites':
                return createCORSResponse(getSites());
            case 'getAttendance':
                return createCORSResponse(getAttendance());
            case 'getPayments':
                return createCORSResponse(getPayments());
            default:
                return createCORSResponse({ message: 'API is running', timestamp: new Date().toISOString() });
        }
    } catch (error) {
        console.error('Error in doGet:', error);
        return createCORSErrorResponse(error.message);
    }
}

/**
 * Handle OPTIONS preflight requests for CORS
 */
function doOptions(e) {
    return HtmlService.createTextOutput()
        .setMimeType(HtmlService.MimeType.JSON)
        .setContent('{"status":"ok"}');

/**
 * Handle POST requests for adding data (CORS FIXED)
 */
function doPost(e) {
    try {
        const requestData = JSON.parse(e.postData.contents);
        const action = requestData.action;
        const data = requestData.data;
        
        console.log('Received POST request:', action, data);
        
        switch (action) {
            case 'addWorker':
                return createCORSResponse(addWorker(data));
            case 'addSite':
                return createCORSResponse(addSite(data));
            case 'addAttendance':
                return createCORSResponse(addAttendance(data));
            case 'addPayment':
                return createCORSResponse(addPayment(data));
            default:
                return createCORSErrorResponse('Unknown action: ' + action);
        }
    } catch (error) {
        console.error('Error in doPost:', error);
        return createCORSErrorResponse(error.message);
    }
}

// ================================
// WORKER FUNCTIONS
// ================================

function getWorkers() {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Workers');
        if (!sheet) {
            return [];
        }
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const workers = [];
        
        for (let i = 1; i < data.length; i++) {
            const worker = {};
            headers.forEach((header, index) => {
                worker[header] = data[i][index];
            });
            if (worker.worker_id) { // Only include rows with worker_id
                workers.push(worker);
            }
        }
        
        console.log('Retrieved workers:', workers.length);
        return workers;
    } catch (error) {
        console.error('Error getting workers:', error);
        throw error;
    }
}

function addWorker(workerData) {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Workers');
        
        // Generate worker ID if not provided
        if (!workerData.worker_id) {
            workerData.worker_id = 'W' + Date.now();
        }
        
        const newRow = [
            workerData.worker_id,
            workerData.name,
            workerData.phone,
            workerData.address
        ];
        
        sheet.appendRow(newRow);
        
        console.log('Added worker:', workerData.worker_id);
        return { success: true, worker_id: workerData.worker_id };
    } catch (error) {
        console.error('Error adding worker:', error);
        throw error;
    }
}

// ================================
// SITE FUNCTIONS
// ================================

function getSites() {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Sites');
        if (!sheet) {
            return [];
        }
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const sites = [];
        
        for (let i = 1; i < data.length; i++) {
            const site = {};
            headers.forEach((header, index) => {
                site[header] = data[i][index];
            });
            if (site.site_id) { // Only include rows with site_id
                sites.push(site);
            }
        }
        
        console.log('Retrieved sites:', sites.length);
        return sites;
    } catch (error) {
        console.error('Error getting sites:', error);
        throw error;
    }
}

function addSite(siteData) {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Sites');
        
        // Generate site ID if not provided
        if (!siteData.site_id) {
            siteData.site_id = 'S' + Date.now();
        }
        
        const newRow = [
            siteData.site_id,
            siteData.name,
            siteData.location,
            siteData.manager
        ];
        
        sheet.appendRow(newRow);
        
        console.log('Added site:', siteData.site_id);
        return { success: true, site_id: siteData.site_id };
    } catch (error) {
        console.error('Error adding site:', error);
        throw error;
    }
}

// ================================
// ATTENDANCE FUNCTIONS
// ================================

function getAttendance() {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Attendance');
        if (!sheet) {
            return [];
        }
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const attendance = [];
        
        for (let i = 1; i < data.length; i++) {
            const record = {};
            headers.forEach((header, index) => {
                record[header] = data[i][index];
            });
            if (record.id) { // Only include rows with id
                attendance.push(record);
            }
        }
        
        console.log('Retrieved attendance records:', attendance.length);
        return attendance;
    } catch (error) {
        console.error('Error getting attendance:', error);
        throw error;
    }
}

function addAttendance(attendanceData) {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Attendance');
        
        // Generate ID if not provided
        if (!attendanceData.id) {
            attendanceData.id = 'A' + Date.now();
        }
        
        const newRow = [
            attendanceData.id,
            attendanceData.date,
            attendanceData.worker_id,
            attendanceData.site_id,
            attendanceData.work_type,
            attendanceData.work_title,
            attendanceData.rate
        ];
        
        sheet.appendRow(newRow);
        
        console.log('Added attendance:', attendanceData.id);
        return { success: true, id: attendanceData.id };
    } catch (error) {
        console.error('Error adding attendance:', error);
        throw error;
    }
}

// ================================
// PAYMENT FUNCTIONS
// ================================

function getPayments() {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Payments');
        if (!sheet) {
            return [];
        }
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const payments = [];
        
        for (let i = 1; i < data.length; i++) {
            const payment = {};
            headers.forEach((header, index) => {
                payment[header] = data[i][index];
            });
            if (payment.id) { // Only include rows with id
                payments.push(payment);
            }
        }
        
        console.log('Retrieved payment records:', payments.length);
        return payments;
    } catch (error) {
        console.error('Error getting payments:', error);
        throw error;
    }
}

function addPayment(paymentData) {
    try {
        const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Payments');
        
        // Generate ID if not provided
        if (!paymentData.id) {
            paymentData.id = 'P' + Date.now();
        }
        
        const newRow = [
            paymentData.id,
            paymentData.date,
            paymentData.worker_id,
            paymentData.site_id,
            paymentData.amount,
            paymentData.type,
            paymentData.mode
        ];
        
        sheet.appendRow(newRow);
        
        console.log('Added payment:', paymentData.id);
        return { success: true, id: paymentData.id };
    } catch (error) {
        console.error('Error adding payment:', error);
        throw error;
    }
}

// ================================
// CORS-ENABLED UTILITY FUNCTIONS
// ================================

function createCORSResponse(data) {
    const jsonData = JSON.stringify(data);
    
    return HtmlService.createTextOutput(jsonData)
        .setMimeType(HtmlService.MimeType.JSON);
}

function createCORSErrorResponse(message) {
    const errorData = JSON.stringify({ error: message });
    
    return HtmlService.createTextOutput(errorData)
        .setMimeType(HtmlService.MimeType.JSON);
}

// Test function to verify setup
function testSetup() {
    console.log('Testing Google Apps Script setup...');
    
    try {
        const workers = getWorkers();
        console.log('Workers test:', workers.length, 'records');
        
        const sites = getSites();
        console.log('Sites test:', sites.length, 'records');
        
        const attendance = getAttendance();
        console.log('Attendance test:', attendance.length, 'records');
        
        const payments = getPayments();
        console.log('Payments test:', payments.length, 'records');
        
        console.log('✅ Setup test completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Setup test failed:', error);
        return false;
    }
}}