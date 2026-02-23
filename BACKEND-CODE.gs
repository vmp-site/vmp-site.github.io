function doGet(e) {
  const action = e.parameter.action;
  
  try {
    let result;
    
    switch(action) {
      case 'getSites':
        result = getSites();
        break;
      case 'getWorkers':
        result = getWorkers();
        break;
      case 'getPositions':
        result = getPositions();
        break;
      case 'getRates':
        result = getRates();
        break;
      case 'getAttendance':
        result = getAttendance();
        break;
      case 'getPayments':
        result = getPayments();
        break;
      case 'getReceived':
        result = getReceived();
        break;
      case 'getProfile':
        result = getProfile();
        break;
      case 'getMaterials':
        result = getMaterials();
        break;
      case 'validatePin':
        result = validatePin(e.parameter);
        break;
      case 'addReceived':
        if (!isAuthenticatedRequest(e.parameter)) {
          result = { status: 'error', message: 'Unauthorized request' };
          break;
        }
        result = addReceived(e.parameter);
        break;
      case 'addMaterial':
        if (!isAuthenticatedRequest(e.parameter)) {
          result = { status: 'error', message: 'Unauthorized request' };
          break;
        }
        result = addMaterial(e.parameter);
        break;
      case 'updateMaterial':
        if (!isAuthenticatedRequest(e.parameter)) {
          result = { status: 'error', message: 'Unauthorized request' };
          break;
        }
        result = updateMaterial(e.parameter);
        break;
      case 'deleteMaterial':
        if (!isAuthenticatedRequest(e.parameter)) {
          result = { status: 'error', message: 'Unauthorized request' };
          break;
        }
        result = deleteMaterial(e.parameter);
        break;
      default:
        result = { status: 'error', message: 'Unknown action' };
    }
    
    // JSONP support when callback parameter is provided
    if (e.parameter && e.parameter.callback) {
      const callbackName = e.parameter.callback;
      const payload = `${callbackName}(${JSON.stringify(result)})`;
      return ContentService
        .createTextOutput(payload)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // JSONP error response if callback provided
    if (e && e.parameter && e.parameter.callback) {
      const callbackName = e.parameter.callback;
      const payload = `${callbackName}(${JSON.stringify({ status: 'error', message: error.toString() })})`;
      return ContentService
        .createTextOutput(payload)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = e.parameter.action || body.action;
    const data = body.data || body;
    
    // Debug logging
    Logger.log('doPost called with action: ' + action);
    Logger.log('e.parameter.action: ' + e.parameter.action);
    Logger.log('body.action: ' + body.action);
    Logger.log('Received data: ' + JSON.stringify(data));
    
    let result;

    if (isProtectedAction(action) && !isAuthenticatedRequest(data)) {
      result = { status: 'error', message: 'Unauthorized request' };
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    switch(action) {
      case 'validatePin':
        result = validatePin(data);
        break;
      case 'addSite':
        result = addSite(data);
        break;
      case 'addWorker':
        result = addWorker(data);
        break;
      case 'addAttendance':
        result = addAttendance(data);
        break;
      case 'addPayment':
        result = addPayment(data);
        break;
      case 'addReceived':
        result = addReceived(data);
        break;
      case 'addPosition':
        result = addPosition(data);
        break;
      case 'addRate':
        result = addRate(data);
        break;
      case 'updateSiteStatus':
        result = updateSiteStatus(data);
        break;
      case 'deleteSite':
        result = deleteSite(data);
        break;
      case 'updateWorker':
        result = updateWorker(data);
        break;
      case 'deleteWorker':
        result = deleteWorker(data);
        break;
      case 'deletePosition':
        result = deletePosition(data);
        break;
      case 'updatePosition':
        result = updatePosition(data);
        break;
      case 'addMaterial':
        result = addMaterial(data);
        break;
      case 'updateMaterial':
        result = updateMaterial(data);
        break;
      case 'deleteMaterial':
        result = deleteMaterial(data);
        break;
      default:
        result = { status: 'error', message: 'Unknown action: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function isProtectedAction(action) {
  const protectedActions = [
    'addSite',
    'addWorker',
    'addAttendance',
    'addPayment',
    'addReceived',
    'addPosition',
    'addRate',
    'updateSiteStatus',
    'deleteSite',
    'updateWorker',
    'deleteWorker',
    'deletePosition',
    'updatePosition',
    'addMaterial',
    'updateMaterial',
    'deleteMaterial'
  ];

  return protectedActions.indexOf(String(action || '')) !== -1;
}

function getTokenExpiryMs() {
  return 12 * 60 * 60 * 1000;
}

function buildSessionPropertyKey(token) {
  return 'SESSION_' + token;
}

function storeSessionToken(token) {
  const props = PropertiesService.getScriptProperties();
  const expiresAt = Date.now() + getTokenExpiryMs();
  props.setProperty(buildSessionPropertyKey(token), String(expiresAt));
}

function isTokenValid(token) {
  if (!token) return false;

  const props = PropertiesService.getScriptProperties();
  const key = buildSessionPropertyKey(token);
  const rawExpiry = props.getProperty(key);
  if (!rawExpiry) return false;

  const expiresAt = Number(rawExpiry);
  if (!expiresAt || Date.now() > expiresAt) {
    props.deleteProperty(key);
    return false;
  }

  return true;
}

function isAuthenticatedRequest(data) {
  const token = String((data && data.auth_token) || '').trim();
  return isTokenValid(token);
}

/**
 * Validate admin PIN - Backend PIN validation for security
 * @param {Object} data - Contains pin field with the user-provided PIN
 * @returns {Object} Result with status and auth token or error
 */
function validatePin(data) {
  try {
    // IMPORTANT: Store the actual PIN in Apps Script Properties, not here
    // For immediate deployment, this reference PIN is used but MUST be moved to:
    // 1. Apps Script Properties: PropertiesService.getUserProperties().setProperty('ADMIN_PIN', 'xxxx');
    // 2. Or a secure sheet that's not visible in API responses
    // 3. Or environment variables in your GCP project
    // Current reference PIN for testing only:
    const ADMIN_PIN = '122333';
    
    const providedPin = String(data.pin || '').trim();
    
    // Simple PIN validation
    if (providedPin === ADMIN_PIN) {
      Logger.log('PIN validated successfully');
      const token = Utilities.getUuid();
      storeSessionToken(token);
      return {
        status: 'success',
        message: 'PIN validated',
        token: token,
        authenticated: true
      };
    } else {
      Logger.log('PIN validation failed - incorrect PIN');
      return {
        status: 'error',
        message: 'Invalid PIN',
        authenticated: false
      };
    }
  } catch (error) {
    Logger.log('validatePin error: ' + error);
    return {
      status: 'error',
      message: 'PIN validation failed: ' + error.toString(),
      authenticated: false
    };
  }
}

function getSites() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Sites');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const sites = rows.map((row, idx) => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    
    if (!obj.site_id) {
      obj.site_id = String(row[0]);
    } else {
      obj.site_id = String(obj.site_id); // Ensure site_id is always a string
    }
    
    return obj;
  });
  
  Logger.log('getSites returned ' + sites.length + ' sites: ' + sites.map(s => s.site_id + ':' + s.site_name).join(', '));
  return sites;
}

function getWorkers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Workers');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const workers = rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    
    // Ensure worker_id is a string
    if (obj.worker_id) {
      obj.worker_id = String(obj.worker_id);
    }
    
    // Log assigned_sites value for debugging
    if (obj.assigned_sites) {
      Logger.log('Worker ' + obj.name + ' has assigned_sites: "' + obj.assigned_sites + '"');
    }
    
    return obj;
  });
  
  Logger.log('getWorkers returned ' + workers.length + ' workers');
  return workers;
}

function getAttendance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Attendance');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
    return rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        let value = row[index];
        // Convert dates to YYYY-MM-DD format
        if (header === 'date' && value instanceof Date) {
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          value = `${year}-${month}-${day}`;
        } else if (header === 'date' && typeof value === 'string' && value.includes('T')) {
          // If it's already a timestamp string, extract just the date
          value = value.split('T')[0];
        }
        obj[header] = value;
      });
      return obj;
    });
}

function getPayments() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Payments');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function addSite(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Sites');
  const timestamp = new Date().getTime();
  
  sheet.appendRow([
    timestamp,                      // site_id
    data.siteName || '',            // site_name
    data.location || '',            // location
    data.clientName || '',          // client_name
    data.totalContract || '',       // total_contract
    data.note || ''                 // note
  ]);
  
  return { status: 'success', message: 'Site added successfully' };
}

function addWorker(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Workers');
  const timestamp = new Date().getTime();
  
  const assignedSites = data.assignedSites || 'None';
  Logger.log('addWorker - Assigned sites value: "' + assignedSites + '"');
  Logger.log('addWorker - Full data received: ' + JSON.stringify(data));
  
  sheet.appendRow([
    timestamp,
    data.workerName || '',
    data.workerPhone || '',
    data.workerPosition || '',
    data.workerType || '',
    assignedSites,
    ''
  ]);
  
  Logger.log('addWorker - Row appended successfully with sites: ' + assignedSites);
  return { status: 'success', message: 'Worker added successfully' };
}

function addAttendance(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Attendance');
  
  sheet.appendRow([
    data.date || '',
    data.site_name || '',
    data.worker_name || '',
    data.site_id || '',
    data.worker_id || '',
    data.position || '',
    data.work_type || '',
    data.work_title || '',
    data.work_amount || '',
    data.note || ''
  ]);
  
  return { status: 'success', message: 'Attendance added successfully' };
}

function addPayment(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Payments');
  
  Logger.log('addPayment - Data received: ' + JSON.stringify(data));
  
  sheet.appendRow([
    data.date || '',
    data.site_id || '',
    data.site_name || '',
    data.worker_id || '',
    data.worker_name || '',
    data.amount || '',
    data.type || '',
    data.payment_mode || '',
    data.note || ''
  ]);
  
  Logger.log('addPayment - Payment saved with worker_name: ' + data.worker_name);
  return { status: 'success', message: 'Payment added successfully' };
}

function addReceived(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Received');
  
  // Create sheet if it doesn't exist with updated columns
  if (!sheet) {
    sheet = ss.insertSheet('Received');
    sheet.appendRow(['date', 'site_id', 'site_name', 'worker_id', 'worker_name', 'from_name', 'from_type', 'amount', 'payment_mode', 'note']);
  }
  
  Logger.log('addReceived - Data received: ' + JSON.stringify(data));
  
  sheet.appendRow([
    data.date || '',
    data.site_id || 'none',
    data.site_name || 'none',
    data.worker_id || 'none',
    data.worker_name || 'none',
    data.from_name || '',
    data.from_type || 'other',
    data.amount || '',
    data.payment_mode || '',
    data.note || ''
  ]);
  
  Logger.log('addReceived - Received payment saved from: ' + data.from_name);
  return { status: 'success', message: 'Received payment added successfully' };
}

function getReceived() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Received');
  
  // Return empty array if sheet doesn't exist
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function getProfile() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Profile');
  
  // Create sheet with default data if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Profile');
    sheet.appendRow(['name', 'mobile', 'email', 'address', 'business_name']);
    sheet.appendRow(['Your Name', '1234567890', 'email@example.com', 'Your Address', 'Business Name']);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Return first row as profile object
  if (rows.length > 0) {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = rows[0][index];
    });
    return [obj]; // Return as array for consistency
  }
  
  return [];
}

function getPositions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Positions');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function getRates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet;
  try {
    sheet = ss.getSheetByName('rate_master');
  } catch (e) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  }).filter(row => row.position && row.worker_type);
}

function addPosition(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Positions');
  const timestamp = new Date().getTime();
  
  sheet.appendRow([
    timestamp,
    data.positionName || '',
    data.workerType || '',
    data.fullRate || '',
    data.halfRate || '',
    data.otherRate || '',
    data.positionNote || ''
  ]);
  
  return { status: 'success', message: 'Position added successfully' };
}

function addRate(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet;
  try {
    sheet = ss.getSheetByName('rate_master');
  } catch (e) {
    return { status: 'error', message: 'rate_master sheet not found' };
  }
  
  const timestamp = new Date().getTime();
  
  sheet.appendRow([
    timestamp,
    data.position || '',
    data.worker_type || '',
    data.full_rate || '',
    data.half_rate || '',
    data.note || ''
  ]);
  
  return { status: 'success', message: 'Rate added successfully' };
}

function updateSiteStatus(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Sites');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  let siteIdIndex = -1;
  let statusIndex = -1;
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('site') && h.includes('id')) {
      siteIdIndex = i;
    }
    if (h === 'status') {
      statusIndex = i;
    }
  }
  
  if (siteIdIndex === -1) {
    siteIdIndex = 0;
  }
  
  if (statusIndex === -1) {
    const lastCol = sheet.getLastColumn();
    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue('status');
    statusIndex = lastCol; // 0-based index for new 'status' column
  }
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][siteIdIndex]).includes(data.siteId) || allData[i][siteIdIndex] == data.siteId) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(data.status);
      return { status: 'success', message: 'Site status updated' };
    }
  }
  
  return { status: 'error', message: 'Site not found' };
}

function updateWorker(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Workers');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  let workerIdIndex = -1;
  let nameIndex = -1;
  let phoneIndex = -1;
  let positionIndex = -1;
  let workerTypeIndex = -1;
  let assignedSitesIndex = -1;
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('worker') && h.includes('id')) {
      workerIdIndex = i;
    }
    if (h === 'name') {
      nameIndex = i;
    }
    if (h === 'phone') {
      phoneIndex = i;
    }
    if (h === 'position') {
      positionIndex = i;
    }
    if (h === 'worker_type') {
      workerTypeIndex = i;
    }
    if (h === 'assigned_sites') {
      assignedSitesIndex = i;
    }
  }
  
  if (workerIdIndex === -1) workerIdIndex = 0;
  if (nameIndex === -1) nameIndex = 1;
  if (phoneIndex === -1) phoneIndex = 2;
  if (positionIndex === -1) positionIndex = 3;
  if (workerTypeIndex === -1) workerTypeIndex = 4;
  if (assignedSitesIndex === -1) assignedSitesIndex = 5;
  
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][workerIdIndex]) == String(data.workerId)) {
      if (nameIndex >= 0) sheet.getRange(i + 1, nameIndex + 1).setValue(data.workerName);
      if (phoneIndex >= 0) sheet.getRange(i + 1, phoneIndex + 1).setValue(data.workerPhone);
      if (positionIndex >= 0) sheet.getRange(i + 1, positionIndex + 1).setValue(data.workerPosition);
      if (workerTypeIndex >= 0) sheet.getRange(i + 1, workerTypeIndex + 1).setValue(data.workerType);
      if (assignedSitesIndex >= 0 && data.assignedSites) sheet.getRange(i + 1, assignedSitesIndex + 1).setValue(data.assignedSites);
      
      return { status: 'success', message: 'Worker updated successfully' };
    }
  }
  
  return { status: 'error', message: 'Worker not found' };
}

function deleteWorker(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Workers');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  // Find worker_id column
  let workerIdIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('worker') && h.includes('id')) {
      workerIdIndex = i;
      break;
    }
  }
  
  if (workerIdIndex === -1) workerIdIndex = 0;
  
  // Find and delete the worker row
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][workerIdIndex]) == String(data.workerId)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Worker deleted successfully' };
    }
  }
  
  return { status: 'error', message: 'Worker not found' };
}

function deleteSite(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Sites');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  // Find site_id column
  let siteIdIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('site') && h.includes('id')) {
      siteIdIndex = i;
      break;
    }
  }
  
  if (siteIdIndex === -1) siteIdIndex = 0;
  
  // Find and delete the site row
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][siteIdIndex]) == String(data.siteId)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Site deleted successfully' };
    }
  }
  
  return { status: 'error', message: 'Site not found' };
}

function deletePosition(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Positions');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  // Find position_id column
  let positionIdIndex = -1;
  let positionNameIndex = -1;
  let workerTypeIndex = -1;
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('position') && h.includes('id')) {
      positionIdIndex = i;
    }
    if (h.includes('position') && h.includes('name')) {
      positionNameIndex = i;
    }
    if (h.includes('worker') && h.includes('type')) {
      workerTypeIndex = i;
    }
  }
  
  if (positionIdIndex === -1) positionIdIndex = 0;
  
  // Find and delete the position row
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][positionIdIndex]) == String(data.positionId)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Position deleted successfully' };
    }
  }
  
  return { status: 'error', message: 'Position not found' };
}

function updatePosition(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Positions');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  // Find columns
  let positionIdIndex = -1;
  let positionNameIndex = -1;
  let workerTypeIndex = -1;
  let fullRateIndex = -1;
  let halfRateIndex = -1;
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('position') && h.includes('id')) {
      positionIdIndex = i;
    }
    if (h.includes('position') && h.includes('name')) {
      positionNameIndex = i;
    }
    if (h.includes('worker') && h.includes('type')) {
      workerTypeIndex = i;
    }
    if (h.includes('full') && h.includes('rate')) {
      fullRateIndex = i;
    }
    if (h.includes('half') && h.includes('rate')) {
      halfRateIndex = i;
    }
  }
  
  // Default indexes
  if (positionIdIndex === -1) positionIdIndex = 0;
  if (positionNameIndex === -1) positionNameIndex = 1;
  if (workerTypeIndex === -1) workerTypeIndex = 2;
  if (fullRateIndex === -1) fullRateIndex = 3;
  if (halfRateIndex === -1) halfRateIndex = 4;
  
  // Find and update the position row
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][positionIdIndex]) == String(data.positionId)) {
      sheet.getRange(i + 1, positionNameIndex + 1).setValue(data.positionName);
      sheet.getRange(i + 1, workerTypeIndex + 1).setValue(data.workerType);
      sheet.getRange(i + 1, fullRateIndex + 1).setValue(data.fullRate);
      sheet.getRange(i + 1, halfRateIndex + 1).setValue(data.halfRate);
      return { status: 'success', message: 'Position updated successfully' };
    }
  }
  
  return { status: 'error', message: 'Position not found' };
}

function getMaterials() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Materials');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const materials = rows.map((row, idx) => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    
    if (!obj.material_id) {
      obj.material_id = String(idx + 1);
    } else {
      obj.material_id = String(obj.material_id);
    }
    
    // Normalize date_added to yyyy-mm-dd for UI compatibility
    if (obj.date_added) {
      const val = obj.date_added;
      if (val instanceof Date) {
        obj.date_added = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else if (typeof val === 'string') {
        if (val.includes('/')) {
          const parts = val.split('/'); // expects dd/mm/yyyy
          if (parts.length === 3) {
            obj.date_added = `${parts[2]}-${('0' + parts[1]).slice(-2)}-${('0' + parts[0]).slice(-2)}`;
          }
        } else if (val.includes('-')) {
          const parts = val.split('-');
          if (parts.length === 3) {
            // dd-mm-yyyy -> yyyy-mm-dd
            if (parts[0].length === 2 && parts[2].length === 4) {
              obj.date_added = `${parts[2]}-${('0' + parts[1]).slice(-2)}-${('0' + parts[0]).slice(-2)}`;
            }
          }
        }
      }
    }
    return obj;
  });
  
  Logger.log('getMaterials returned ' + materials.length + ' materials');
  return materials;
}

function addMaterial(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Materials');
  
  try {
    // Get the next material_id
    const allData = sheet.getDataRange().getValues();
    let nextId = allData.length;
    
    // Get headers
    const headers = allData[0];
    const materialIdIndex = headers.indexOf('material_id');
    const siteIdIndex = headers.indexOf('site_id');
    const categoryIndex = headers.indexOf('category');
    const amountIndex = headers.indexOf('amount');
    const quantityIndex = headers.indexOf('quantity');
    const noteIndex = headers.indexOf('note');
    const dateIndex = headers.indexOf('date_added');
    
    // Prepare new row
    const newRow = new Array(headers.length).fill('');
    newRow[materialIdIndex] = nextId;
    newRow[siteIdIndex] = data.site_id || '';
    newRow[categoryIndex] = data.category || '';
    newRow[amountIndex] = data.amount || 0;
    newRow[quantityIndex] = data.quantity || 0;
    newRow[noteIndex] = data.note || '';
    newRow[dateIndex] = data.date_added || new Date().toISOString().split('T')[0];
    
    // Append the new row
    sheet.appendRow(newRow);
    
    Logger.log('Material added successfully: ' + JSON.stringify(data));
    return { status: 'success', message: 'Material added successfully', material_id: nextId };
    
  } catch (error) {
    Logger.log('Error adding material: ' + error.toString());
    return { status: 'error', message: 'Failed to add material: ' + error.toString() };
  }
}

function updateMaterial(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Materials');
  
  try {
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const materialIdIndex = headers.indexOf('material_id');
    
    // Find the row to update
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][materialIdIndex]) === String(data.material_id)) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: 'error', message: 'Material not found' };
    }
    
    const siteIdIndex = headers.indexOf('site_id');
    const categoryIndex = headers.indexOf('category');
    const amountIndex = headers.indexOf('amount');
    const quantityIndex = headers.indexOf('quantity');
    const noteIndex = headers.indexOf('note');
    const dateIndex = headers.indexOf('date_added');
    
    // Update row data
    const updateData = new Array(headers.length).fill('');
    updateData[materialIdIndex] = data.material_id;
    updateData[siteIdIndex] = data.site_id || '';
    updateData[categoryIndex] = data.category || '';
    updateData[amountIndex] = data.amount || 0;
    updateData[quantityIndex] = data.quantity || 0;
    updateData[noteIndex] = data.note || '';
    updateData[dateIndex] = data.date_added || new Date().toISOString().split('T')[0];
    
    // Update the sheet row (rowIndex + 1 because sheet rows are 1-indexed)
    for (let i = 0; i < headers.length; i++) {
      sheet.getRange(rowIndex + 1, i + 1).setValue(updateData[i]);
    }
    
    Logger.log('Material updated successfully: ' + JSON.stringify(data));
    return { status: 'success', message: 'Material updated successfully' };
    
  } catch (error) {
    Logger.log('Error updating material: ' + error.toString());
    return { status: 'error', message: 'Failed to update material: ' + error.toString() };
  }
}

function deleteMaterial(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Materials');
  
  try {
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const materialIdIndex = headers.indexOf('material_id');
    
    // Find the row to delete
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][materialIdIndex]) === String(data.material_id)) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: 'error', message: 'Material not found' };
    }
    
    // Delete the row (rowIndex + 1 because sheet rows are 1-indexed)
    sheet.deleteRow(rowIndex + 1);
    
    Logger.log('Material deleted successfully: material_id = ' + data.material_id);
    return { status: 'success', message: 'Material deleted successfully' };
    
  } catch (error) {
    Logger.log('Error deleting material: ' + error.toString());
    return { status: 'error', message: 'Failed to delete material: ' + error.toString() };
  }
}
