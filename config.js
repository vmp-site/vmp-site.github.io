// Central Configuration for Work Tool
// =====================================

// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://script.google.com/macros/s/AKfycbx5mIEQ9uJeq0WSFo8cMslMfC941wHh_Eriyo558s72UIuIXZn16JCyNCP_5tbETKbD/exec',
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3
};

// Global BASE_URL for backward compatibility
const BASE_URL = API_CONFIG.BASE_URL;

const SECURITY_CONFIG = {
    SESSION_TTL_MS: 12 * 60 * 60 * 1000,
    INACTIVITY_TIMEOUT_MS: 45 * 60 * 1000,
    ACTIVITY_WRITE_DEBOUNCE_MS: 30000
};

const AUTH_META_KEY = 'workToolAuthMeta';
let lastActivityWriteAt = 0;
const originalFetch = window.fetch.bind(window);

window.fetch = function(resource, init = {}) {
    try {
        const requestUrl = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
        const options = { ...(init || {}) };
        const method = String(options.method || 'GET').toUpperCase();
        const token = sessionStorage.getItem('workToolAuthToken') || '';
        const isApiRequest = requestUrl.includes(API_CONFIG.BASE_URL);

        if (isApiRequest && method !== 'GET' && token) {
            if (typeof options.body === 'string' && options.body.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(options.body);
                    if (!parsed.auth_token) {
                        parsed.auth_token = token;
                        options.body = JSON.stringify(parsed);
                    }
                } catch {
                    // Ignore parse failure and continue with original request body
                }
            } else if (!options.body) {
                options.body = JSON.stringify({ auth_token: token });
            }
        }

        return originalFetch(resource, options);
    } catch (error) {
        return originalFetch(resource, init);
    }
};

// UI Messages
const MESSAGES = {
    LOADING: {
        DEFAULT: '🔄 Loading...',
        SAVING: '💾 Saving data...',
        FETCHING: '📥 Getting data...',
        CALCULATING: '🧮 Calculating...'
    },
    SUCCESS: {
        WORKER_ADDED: '✅ Worker added successfully!',
        SITE_ADDED: '✅ Site added successfully!',
        ATTENDANCE_ADDED: '✅ Attendance recorded successfully!',
        PAYMENT_ADDED: '✅ Payment recorded successfully!',
        DATA_LOADED: '✅ Data loaded successfully!'
    },
    ERROR: {
        NETWORK: '❌ Network error. Please check your connection.',
        SERVER: '❌ Server error. Please try again.',
        INVALID_DATA: '❌ Invalid data. Please check your inputs.',
        TIMEOUT: '❌ Request timeout. Please try again.',
        UNKNOWN: '❌ Something went wrong. Please try again.'
    }
};

// =====================================
// SIMPLIFIED API FUNCTION
// =====================================

/**
 * CORS-Fixed API GET function for Google Apps Script
 * @param {string} action - API action (getWorkers, getSites, getAttendance, getPayments)
 * @returns {Promise} JSON response
 */
async function apiGet(action) {
    try {
        console.log(`🔄 API GET Request: ${action}`);
        
        const url = `${API_CONFIG.BASE_URL}?action=${action}`;
        console.log(`📡 Calling URL: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit',
            headers: {
                'Accept': 'application/json',
            },
            redirect: 'follow'
        });
        
        console.log(`📥 Response Status: ${response.status}`);
        console.log(`📥 Response Headers:`, response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log(`📋 Content Type: ${contentType}`);
        
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Sometimes Google Apps Script returns text that needs parsing
            const text = await response.text();
            console.log(`📝 Raw response text:`, text);
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                throw new Error(`Invalid JSON response: ${text}`);
            }
        }
        
        console.log(`✅ API Response for ${action}:`, data);
        
        // Handle both direct array responses and wrapped responses
        if (Array.isArray(data)) {
            return data;
        } else if (data && Array.isArray(data.data)) {
            return data.data;
        } else if (data && data.result && Array.isArray(data.result)) {
            return data.result;
        } else if (data && data.error) {
            throw new Error(`API Error: ${data.error}`);
        }
        
        return data || [];
        
    } catch (error) {
        console.error(`❌ API Error for ${action}:`, error);
        
        // Provide specific CORS error message
        if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
            throw new Error(`CORS Error: Make sure Google Apps Script is deployed correctly and allows public access`);
        }
        
        throw new Error(`Failed to fetch ${action}: ${error.message}`);
    }
}

// =====================================
// LEGACY API FUNCTIONS (KEEP FOR COMPATIBILITY)
// =====================================

/**
 * Common fetch function with error handling and retries
 * @param {string} action - API action
 * @param {Object} data - Data to send (optional)
 * @param {string} method - HTTP method (default: 'GET')
 * @returns {Promise} API response
 */
async function apiRequest(action, data = null, method = 'GET') {
    let lastError = null;
    
    for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
        try {
            console.log(`API Request [Attempt ${attempt}]:`, { action, method, data });
            
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: API_CONFIG.TIMEOUT
            };
            
            let url = API_CONFIG.BASE_URL;
            
            if (method === 'GET') {
                // For GET requests, add action as query parameter
                url += `?action=${action}`;
            } else {
                // For POST requests, send action and data in body
                requestOptions.body = JSON.stringify({
                    action: action,
                    data: data
                });
            }
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`API Response [Attempt ${attempt}]:`, result);
            
            return result;
            
        } catch (error) {
            lastError = error;
            console.error(`API Error [Attempt ${attempt}]:`, error);
            
            // If this was the last attempt, throw the error
            if (attempt === API_CONFIG.RETRY_ATTEMPTS) {
                throw lastError;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
    }
}

/**
 * Get data from API (Updated to use simplified apiGet)
 * @param {string} action - API action (getWorkers, getSites, etc.)
 * @returns {Promise} API response data
 */
async function getData(action) {
    return await apiGet(action);
}

/**
 * Save data to API
 * @param {string} action - API action (addWorker, addSite, etc.)
 * @param {Object} data - Data to save
 * @returns {Promise} API response
 */
async function saveData(action, data) {
    try {
        const result = await apiRequest(action, data, 'POST');
        return result;
    } catch (error) {
        console.error(`Failed to save ${action}:`, error);
        throw error;
    }
}

// =====================================
// COMMON UI FUNCTIONS
// =====================================

/**
 * Show loading state on button
 * @param {HTMLElement} button - Button element
 * @param {string} message - Loading message
 */
function showButtonLoading(button, message = MESSAGES.LOADING.SAVING) {
    if (!button) return;
    
    button.dataset.originalText = button.textContent;
    button.textContent = message;
    button.disabled = true;
    button.style.opacity = '0.7';
}

/**
 * Hide loading state on button
 * @param {HTMLElement} button - Button element
 */
function hideButtonLoading(button) {
    if (!button) return;
    
    button.textContent = button.dataset.originalText || 'Submit';
    button.disabled = false;
    button.style.opacity = '1';
}

// =====================================
// BACKUP / RESTORE (Auto backup before delete)
// =====================================

const BACKUP_SCHEMA_VERSION = '1.0.0';
const BACKUP_DATA_ACTIONS = [
    'getSites',
    'getWorkers',
    'getPositions',
    'getAttendance',
    'getPayments',
    'getReceived',
    'getMaterials'
];

let jspdfLoadPromise = null;

async function fetchBackupDataset(action) {
    try {
        const response = await fetch(`${BASE_URL}?action=${action}`);
        if (!response.ok) return [];
        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.result)) return data.result;
        return [];
    } catch (error) {
        console.warn(`Backup fetch failed for ${action}:`, error);
        return [];
    }
}

async function buildFullBackupSnapshot(trigger = 'manual', meta = {}) {
    const datasets = {};

    for (const action of BACKUP_DATA_ACTIONS) {
        datasets[action] = await fetchBackupDataset(action);
    }

    return {
        app: 'work-tool',
        schemaVersion: BACKUP_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        trigger,
        meta,
        counts: Object.fromEntries(BACKUP_DATA_ACTIONS.map((action) => [action, (datasets[action] || []).length])),
        datasets
    };
}

function sanitizeFileBaseName(value) {
    return String(value || 'backup')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
}

function downloadTextFile(content, fileName, mimeType = 'application/json;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function createBackupJsonFile(snapshot, baseName) {
    const fileName = `${baseName}.json`;
    downloadTextFile(JSON.stringify(snapshot, null, 2), fileName);
    return fileName;
}

function createBackupCountsCsv(snapshot, baseName) {
    const lines = ['dataset,count'];
    BACKUP_DATA_ACTIONS.forEach((action) => {
        const count = (snapshot.counts && snapshot.counts[action]) || 0;
        lines.push(`${escapeCsvCell(action)},${count}`);
    });
    const fileName = `${baseName}-counts.csv`;
    downloadTextFile(lines.join('\n'), fileName, 'text/csv;charset=utf-8');
    return fileName;
}

function getFirstVisibleTable() {
    const tables = Array.from(document.querySelectorAll('table'));
    for (const table of tables) {
        const rect = table.getBoundingClientRect();
        const style = window.getComputedStyle(table);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        if (isVisible) return table;
    }
    return null;
}

function escapeCsvCell(value) {
    const text = String(value == null ? '' : value).replace(/\r?\n|\r/g, ' ').trim();
    if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function extractTableData(table) {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => normalizeText(th.textContent));
    const rows = Array.from(table.querySelectorAll('tbody tr'))
        .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => normalizeText(cell.textContent)))
        .filter((cells) => cells.length > 0)
        .filter((cells) => {
            if (cells.length !== 1) return true;
            const text = (cells[0] || '').toLowerCase();
            if (!text) return false;
            return !(
                text.includes('loading') ||
                text.includes('no data') ||
                text.includes('no record') ||
                text.includes('no records') ||
                text.includes('no materials') ||
                text.includes('no workers') ||
                text.includes('error')
            );
        });

    if (!headers.length && rows.length) {
        const maxCols = Math.max(...rows.map((r) => r.length), 0);
        for (let index = 0; index < maxCols; index++) {
            headers.push(`Column ${index + 1}`);
        }
    }

    return { headers, rows };
}

function createTableCsv(headers, rows) {
    const lines = [];
    if (headers.length) lines.push(headers.map(escapeCsvCell).join(','));
    rows.forEach((row) => lines.push(row.map(escapeCsvCell).join(',')));
    return lines.join('\n');
}

function createTableJson(headers, rows) {
    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        headers,
        rows
    }, null, 2);
}

function createTablePdfFile(headers, rows, baseName, title = 'Filtered Table Export') {
    return ensureJsPdfLoaded().then((JsPDF) => {
        const doc = new JsPDF('p', 'mm', 'a4');
        const margin = 10;
        const maxWidth = 190;
        const lineHeight = 5;
        let y = 12;

        const drawLine = (text, bold = false) => {
            if (y > 285) {
                doc.addPage();
                y = 12;
            }
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setFontSize(bold ? 12 : 9);
            const lines = doc.splitTextToSize(String(text), maxWidth);
            doc.text(lines, margin, y);
            y += Math.max(lineHeight, lines.length * lineHeight);
        };

        drawLine(title, true);
        drawLine(`Created At: ${new Date().toLocaleString()}`);
        drawLine(`Rows: ${rows.length}`);
        drawLine('');

        if (headers.length) {
            drawLine(headers.join(' | '), true);
        }

        rows.forEach((row, rowIndex) => {
            drawLine(`${rowIndex + 1}. ${row.join(' | ')}`);
        });

        const fileName = `${baseName}.pdf`;
        doc.save(fileName);
        return fileName;
    });
}

async function exportVisibleTableNow() {
    const table = getFirstVisibleTable();
    if (!table) {
        showError(i18nText('No visible table found on this page.'));
        return;
    }

    const { headers, rows } = extractTableData(table);
    if (!rows.length) {
        showError(i18nText('No visible rows found in table.'));
        return;
    }

    const pageTag = sanitizeFileBaseName((document.title || 'table').slice(0, 32));
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `${pageTag}-filtered-table-${dateTag}`;

    try {
        await createTablePdfFile(headers, rows, baseName, i18nText('Filtered Table Export'));
        showSuccess(i18nText('Filtered table exported.'));
    } catch (error) {
        console.warn('Table PDF export failed:', error);
        showError(i18nText('Failed to export visible table.'));
    }
}

function ensureJsPdfLoaded() {
    if (window.jspdf && window.jspdf.jsPDF) {
        return Promise.resolve(window.jspdf.jsPDF);
    }

    if (jspdfLoadPromise) return jspdfLoadPromise;

    jspdfLoadPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById('worktool-jspdf-cdn');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.jspdf && window.jspdf.jsPDF));
            existing.addEventListener('error', () => reject(new Error('Failed to load jsPDF library')));
            return;
        }

        const script = document.createElement('script');
        script.id = 'worktool-jspdf-cdn';
        script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
        script.async = true;
        script.onload = () => {
            if (window.jspdf && window.jspdf.jsPDF) {
                resolve(window.jspdf.jsPDF);
            } else {
                reject(new Error('jsPDF loaded but unavailable on window.jspdf'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load jsPDF script'));
        document.head.appendChild(script);
    });

    return jspdfLoadPromise;
}

async function createBackupPdfFile(snapshot, baseName) {
    const JsPDF = await ensureJsPdfLoaded();
    const doc = new JsPDF('p', 'mm', 'a4');

    let y = 14;
    const lineHeight = 6;
    const margin = 12;
    const pageHeight = 287;

    const writeLine = (text, isHeading = false) => {
        if (y > pageHeight) {
            doc.addPage();
            y = 14;
        }
        doc.setFont('helvetica', isHeading ? 'bold' : 'normal');
        doc.setFontSize(isHeading ? 12 : 10);
        const lines = doc.splitTextToSize(String(text), 186);
        doc.text(lines, margin, y);
        y += lineHeight * lines.length;
    };

    writeLine('Work Tool - Full Backup Summary', true);
    writeLine(`Created At: ${snapshot.createdAt}`);
    writeLine(`Trigger: ${snapshot.trigger}`);
    writeLine(`Schema Version: ${snapshot.schemaVersion}`);
    writeLine('');
    writeLine('Dataset Counts', true);

    BACKUP_DATA_ACTIONS.forEach((action) => {
        const count = (snapshot.counts && snapshot.counts[action]) || 0;
        writeLine(`${action}: ${count}`);
    });

    writeLine('');
    writeLine('Backup includes full data in the JSON file generated together with this PDF.');

    const fileName = `${baseName}.pdf`;
    doc.save(fileName);
    return fileName;
}

async function createDeleteBackup(entityType, entityData = {}) {
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-');
    const entityTag = sanitizeFileBaseName(entityType || 'entity');
    const nameTag = sanitizeFileBaseName(entityData.name || entityData.id || 'record');
    const baseName = `backup-before-delete-${entityTag}-${nameTag}-${dateTag}`;

    const snapshot = await buildFullBackupSnapshot('before-delete', {
        entityType,
        entityData
    });

    createBackupJsonFile(snapshot, baseName);
    createBackupCountsCsv(snapshot, baseName);

    return snapshot;
}

function i18nText(key, vars = {}) {
    try {
        const lang = (typeof getSavedLanguage === 'function' ? getSavedLanguage() : 'en') || 'en';
        const map = (typeof UI_TRANSLATIONS !== 'undefined' && UI_TRANSLATIONS[lang]) ? UI_TRANSLATIONS[lang] : {};
        let text = map[key] || key;
        Object.keys(vars).forEach((k) => {
            text = text.replaceAll(`{${k}}`, String(vars[k]));
        });
        return text;
    } catch {
        return key;
    }
}

function getEntityLabel(entity) {
    const normalized = String(entity || '').toLowerCase();
    if (normalized === 'worker') return i18nText('Worker');
    if (normalized === 'site') return i18nText('Site');
    if (normalized === 'position') return i18nText('Position');
    if (normalized === 'material') return i18nText('Material');
    return i18nText('Record');
}

function getDeletePrompt(entity, name = '') {
    const entityLabel = getEntityLabel(entity);
    const cleanName = String(name || '').trim();
    if (cleanName) {
        return i18nText('Are you sure you want to delete {entity} "{name}"? This action cannot be undone.', {
            entity: entityLabel,
            name: cleanName
        });
    }

    return i18nText('Are you sure you want to delete this {entity}? This action cannot be undone.', {
        entity: entityLabel
    });
}

function getDeleteSuccess(entity) {
    return i18nText('{entity} deleted successfully!', { entity: getEntityLabel(entity) });
}

function getDeleteFail(entity) {
    return i18nText('Failed to delete {entity}', { entity: getEntityLabel(entity) });
}

function getDeleteError(entity) {
    return i18nText('Error deleting {entity}', { entity: getEntityLabel(entity) });
}

async function postBackupImportAction(action, payload) {
    try {
        const response = await fetch(`${BASE_URL}?action=${action}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        return Boolean(result && (result.status === 'success' || result.success));
    } catch (error) {
        console.warn(`Import action failed for ${action}:`, error);
        return false;
    }
}

function jsonpImportAction(action, params, timeoutMs = 30000) {
    return new Promise((resolve) => {
        const callbackName = `backup_import_${action}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const timeout = setTimeout(() => {
            try { delete window[callbackName]; } catch {}
            resolve(false);
        }, timeoutMs);

        window[callbackName] = (result) => {
            clearTimeout(timeout);
            try { delete window[callbackName]; } catch {}
            resolve(Boolean(result && (result.status === 'success' || result.success)));
        };

        const queryParams = new URLSearchParams({
            action,
            callback: callbackName,
            ...params
        });

        const script = document.createElement('script');
        script.src = `${BASE_URL}?${queryParams.toString()}`;
        script.onerror = () => {
            clearTimeout(timeout);
            try { delete window[callbackName]; } catch {}
            resolve(false);
        };
        script.onload = () => {
            setTimeout(() => {
                if (script.parentNode) script.parentNode.removeChild(script);
            }, 1000);
        };

        document.head.appendChild(script);
    });
}

function parseBackupFilePayload(rawData) {
    if (!rawData || typeof rawData !== 'object') return null;

    if (rawData.datasets && typeof rawData.datasets === 'object') {
        return rawData;
    }

    if (
        rawData.getSites || rawData.getWorkers || rawData.getPositions ||
        rawData.getAttendance || rawData.getPayments || rawData.getReceived || rawData.getMaterials
    ) {
        return {
            app: 'work-tool',
            schemaVersion: 'legacy',
            createdAt: new Date().toISOString(),
            trigger: 'legacy-import',
            counts: {},
            datasets: {
                getSites: rawData.getSites || [],
                getWorkers: rawData.getWorkers || [],
                getPositions: rawData.getPositions || [],
                getAttendance: rawData.getAttendance || [],
                getPayments: rawData.getPayments || [],
                getReceived: rawData.getReceived || [],
                getMaterials: rawData.getMaterials || []
            }
        };
    }

    return null;
}

async function importBackupSnapshot(rawData) {
    const backup = parseBackupFilePayload(rawData);
    if (!backup) {
        throw new Error('Invalid backup file format');
    }

    const datasets = backup.datasets || {};
    const stats = { success: 0, failed: 0 };

    const insertSites = Array.isArray(datasets.getSites) ? datasets.getSites : [];
    for (const row of insertSites) {
        const ok = await postBackupImportAction('addSite', {
            siteName: row.site_name || row.siteName || '',
            location: row.location || '',
            clientName: row.client_name || row.clientName || ''
        });
        ok ? stats.success++ : stats.failed++;
    }

    const insertWorkers = Array.isArray(datasets.getWorkers) ? datasets.getWorkers : [];
    for (const row of insertWorkers) {
        const ok = await postBackupImportAction('addWorker', {
            workerName: row.worker_name || row.workerName || '',
            workerPhone: row.worker_phone || row.workerPhone || '',
            workerPosition: row.worker_position || row.position || row.workerPosition || '',
            workerType: row.worker_type || row.workerType || 'New',
            assignedSites: row.assigned_sites || row.assignedSites || 'None'
        });
        ok ? stats.success++ : stats.failed++;
    }

    const insertPositions = Array.isArray(datasets.getPositions) ? datasets.getPositions : [];
    for (const row of insertPositions) {
        const ok = await postBackupImportAction('addPosition', {
            positionName: row.position_name || row.positionName || '',
            workerType: row.worker_type || row.workerType || 'New',
            fullRate: Number(row.full_rate || row.fullRate || 0),
            halfRate: Number(row.half_rate || row.halfRate || 0),
            otherRate: '',
            positionNote: row.note || row.position_note || ''
        });
        ok ? stats.success++ : stats.failed++;
    }

    const insertAttendance = Array.isArray(datasets.getAttendance) ? datasets.getAttendance : [];
    for (const row of insertAttendance) {
        const ok = await postBackupImportAction('addAttendance', {
            date: row.date || '',
            site_id: row.site_id || 'none',
            site_name: row.site_name || 'none',
            worker_id: row.worker_id || 'none',
            worker_name: row.worker_name || 'none',
            position: row.position || '',
            worker_type: row.worker_type || 'New',
            work_type: row.work_type || 'Full Day',
            work_amount: Number(row.work_amount || row.amount || 0),
            work_title: row.work_title || '',
            note: row.note || ''
        });
        ok ? stats.success++ : stats.failed++;
    }

    const insertPayments = Array.isArray(datasets.getPayments) ? datasets.getPayments : [];
    for (const row of insertPayments) {
        const ok = await postBackupImportAction('addPayment', {
            date: row.date || '',
            site_id: row.site_id || 'none',
            site_name: row.site_name || 'none',
            worker_id: row.worker_id || 'none',
            worker_name: row.worker_name || 'none',
            amount: Number(row.amount || 0),
            payment_mode: row.payment_mode || 'Cash',
            note: row.note || ''
        });
        ok ? stats.success++ : stats.failed++;
    }

    const insertReceived = Array.isArray(datasets.getReceived) ? datasets.getReceived : [];
    for (const row of insertReceived) {
        const ok = await jsonpImportAction('addReceived', {
            date: row.date || '',
            site_id: row.site_id || 'none',
            site_name: row.site_name || 'none',
            worker_id: row.worker_id || 'none',
            worker_name: row.worker_name || 'none',
            from_name: row.from_name || row.worker_name || '',
            from_type: row.from_type || 'worker',
            amount: Number(row.amount || 0),
            payment_mode: row.payment_mode || 'Cash',
            note: row.note || ''
        });
        ok ? stats.success++ : stats.failed++;
    }

    const insertMaterials = Array.isArray(datasets.getMaterials) ? datasets.getMaterials : [];
    for (const row of insertMaterials) {
        const ok = await jsonpImportAction('addMaterial', {
            site_id: row.site_id || 'none',
            category: row.category || 'Other',
            amount: Number(row.amount || 0),
            quantity: Number(row.quantity || 0),
            note: row.note || '',
            date_added: row.date_added || row.date || ''
        });
        ok ? stats.success++ : stats.failed++;
    }

    return stats;
}

function openBackupImportPicker() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const doImport = confirm(i18nText('Import backup will add records again. Continue?'));
        if (!doImport) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const stats = await importBackupSnapshot(parsed);
            alert(i18nText('Import complete. Success: {success}, Failed: {failed}', {
                success: stats.success,
                failed: stats.failed
            }));
        } catch (error) {
            console.error('Backup import failed:', error);
            alert(i18nText('Backup import failed: {error}', { error: error.message }));
        }
    });

    fileInput.click();
}

async function downloadFullBackupNow(downloadType = 'json') {
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `worktool-full-backup-${dateTag}`;
    const snapshot = await buildFullBackupSnapshot('manual-export', { source: 'menu' });

    const type = String(downloadType || 'json').toLowerCase();
    if (type === 'csv') {
        createBackupCountsCsv(snapshot, baseName);
        return;
    }

    createBackupJsonFile(snapshot, baseName);
}

window.WorkToolBackup = {
    createDeleteBackup,
    downloadFullBackupNow,
    openBackupImportPicker,
    importBackupSnapshot,
    exportVisibleTableNow,
    getText: i18nText,
    getDeletePrompt,
    getDeleteSuccess,
    getDeleteFail,
    getDeleteError
};

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
    // Create or update success toast
    let toast = document.getElementById('successToast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'successToast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    // Create or update error toast
    let toast = document.getElementById('errorToast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'errorToast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

/**
 * Check authentication
 */
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('workToolAuth') === 'true';
    if (!isAuthenticated) {
        window.location.href = 'login-new.html';
        return false;
    }

    const metaRaw = sessionStorage.getItem(AUTH_META_KEY);
    if (!metaRaw) {
        sessionStorage.removeItem('workToolAuth');
        sessionStorage.removeItem('workToolAuthToken');
        window.location.href = 'login-new.html';
        return false;
    }

    let meta;
    try {
        meta = JSON.parse(metaRaw);
    } catch {
        sessionStorage.removeItem('workToolAuth');
        sessionStorage.removeItem('workToolAuthToken');
        sessionStorage.removeItem(AUTH_META_KEY);
        window.location.href = 'login-new.html';
        return false;
    }

    const now = Date.now();
    const expiresAt = Number(meta.expiresAt || 0);
    const lastActiveAt = Number(meta.lastActiveAt || 0);

    const expired = !expiresAt || now > expiresAt;
    const inactiveTooLong = !lastActiveAt || (now - lastActiveAt) > SECURITY_CONFIG.INACTIVITY_TIMEOUT_MS;

    if (expired || inactiveTooLong) {
        logout();
        return false;
    }

    return true;
}

function setAuthSession(token = '') {
    const now = Date.now();
    const meta = {
        issuedAt: now,
        lastActiveAt: now,
        expiresAt: now + SECURITY_CONFIG.SESSION_TTL_MS
    };

    sessionStorage.setItem('workToolAuth', 'true');
    if (token) {
        sessionStorage.setItem('workToolAuthToken', token);
    } else {
        sessionStorage.removeItem('workToolAuthToken');
    }
    sessionStorage.setItem(AUTH_META_KEY, JSON.stringify(meta));
}

function touchAuthActivity(force = false) {
    const now = Date.now();
    if (!force && (now - lastActivityWriteAt) < SECURITY_CONFIG.ACTIVITY_WRITE_DEBOUNCE_MS) {
        return;
    }

    const metaRaw = sessionStorage.getItem(AUTH_META_KEY);
    if (!metaRaw) return;

    try {
        const meta = JSON.parse(metaRaw);
        meta.lastActiveAt = now;
        sessionStorage.setItem(AUTH_META_KEY, JSON.stringify(meta));
        lastActivityWriteAt = now;
    } catch {
        logout();
    }
}

function startAuthActivityTracking() {
    const events = ['click', 'keydown', 'touchstart', 'mousemove'];
    events.forEach((eventName) => {
        document.addEventListener(eventName, () => touchAuthActivity(false), { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            touchAuthActivity(true);
            checkAuth();
        }
    });

    setInterval(() => {
        checkAuth();
    }, 60 * 1000);
}

/**
 * Logout function
 */
function logout() {
    sessionStorage.removeItem('workToolAuth');
    sessionStorage.removeItem('workToolAuthToken');
    sessionStorage.removeItem(AUTH_META_KEY);
    window.location.href = 'login-new.html';
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
/**
 * Format amount as Indian Rupees (₹)
 * @param {number|string} amount - Amount to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted currency string with ₹ symbol
 */
function formatCurrency(amount, decimals = 0) {
    try {
        // Handle null, undefined, or non-numeric values
        if (amount === null || amount === undefined) return '₹0';
        
        // Convert to number if string
        let numAmount = parseFloat(amount);
        
        // Check if conversion resulted in NaN
        if (isNaN(numAmount)) {
            console.warn('Invalid amount:', amount);
            return '₹0';
        }
        
        // Ensure it's a valid number
        if (!isFinite(numAmount)) {
            return '₹0';
        }
        
        // Format with Indian locale
        return '₹' + numAmount.toLocaleString('en-IN', { 
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    } catch (err) {
        console.error('formatCurrency error:', err);
        return '₹0';
    }
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Validate required form fields
 * @param {HTMLFormElement} form - Form to validate
 * @returns {boolean} True if valid
 */
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.style.borderColor = '#ddd';
        }
    });
    
    if (!isValid) {
        showError(MESSAGES.ERROR.INVALID_DATA);
    }
    
    return isValid;
}

// =====================================
// LANGUAGE (Gujarati / Hindi / English)
// =====================================

const LANGUAGE_STORAGE_KEY = 'workToolLanguage';
const SUPPORTED_LANGUAGES = ['en', 'hi', 'gu'];
let i18nApplying = false;
let languageSystemInitialized = false;
let languageObserver = null;
const i18nTextNodeOriginal = new WeakMap();

const UI_TRANSLATIONS = {
    en: {},
    hi: {
        // Core Navigation & Modules
        'Work Manager': 'वर्क मैनेजर',
        'Manage sites, workers, attendance and payments': 'साइट, मजदूर, हाज़िरी और भुगतान प्रबंधित करें',
        'Use search and filter to quickly open modules': 'मॉड्यूल जल्दी खोलने के लिए खोज और फ़िल्टर का उपयोग करें',
        'Dashboard': 'डैशबोर्ड',
        'Sites': 'साइट्स',
        'Workers': 'मजदूर',
        'Attendance': 'हाज़िरी',
        'Payments': 'भुगतान',
        'Transactions': 'लेन-देन',
        'Positions': 'पद',
        'Received': 'प्राप्त',
        'Materials': 'सामग्री',
        'Profile': 'प्रोफ़ाइल',
        'Logout': 'लॉगआउट',
        'Home': 'होम',
        'All Modules': 'सभी मॉड्यूल',
        'Master Data': 'मास्टर डेटा',
        'Entry': 'एंट्री',
        'No module found for selected search/filter.': 'चुने गए खोज/फ़िल्टर के लिए कोई मॉड्यूल नहीं मिला।',
        
        // Authentication & Login
        'Secure Login': 'सुरक्षित लॉगिन',
        'Enter your PIN to continue': 'आगे बढ़ने के लिए पिन दर्ज करें',
        'Sign In': 'साइन इन',
        'Need help? Contact System Administrator': 'मदद चाहिए? सिस्टम एडमिन से संपर्क करें',
        'Clear PIN': 'पिन साफ करें',
        
        // Common Actions
        'Add': 'जोड़ें',
        'Save': 'सेव करें',
        'Cancel': 'रद्द करें',
        'Close': 'बंद करें',
        'Apply': 'लागू करें',
        'Reset': 'रीसेट',
        'Clear': 'साफ करें',
        'Search': 'खोज',
        'Filter': 'छंटनी',
        'Edit': 'संपादित करें',
        'Delete': 'हटाएँ',
        'Update': 'अपडेट करें',
        'Submit': 'सबमिट करें',
        'Confirm': 'पुष्टि करें',
        'View': 'देखें',
        'Print': 'प्रिंट करें',
        'Download': 'डाउनलोड करें',
        'Export': 'एक्सपोर्ट',
        'Open': 'खोलें',
        'Back': 'वापस',
        'Next': 'अगला',
        'Previous': 'पिछला',
        
        // Common Fields & Labels
        'Name': 'नाम',
        'Phone': 'फोन',
        'Position': 'पद',
        'Date': 'तारीख',
        'Status': 'स्थिति',
        'Amount': 'राशि',
        'Location': 'स्थान',
        'Description': 'विवरण',
        'Details': 'विस्तार',
        'Note': 'नोट',
        'Category': 'श्रेणी',
        'Type': 'प्रकार',
        'Mode': 'मोड',
        'Total': 'कुल',
        'Balance': 'बैलेंस',
        'Pending': 'बाकी',
        'Number': 'नंबर',
        'Code': 'कोड',
        'ID': 'आईडी',
        'Contact': 'संपर्क',
        'Email': 'ईमेल',
        'Address': 'पता',
        
        // Select Options
        'Select': 'चुनें',
        'Select Date': 'तारीख चुनें',
        'Select Site': 'साइट चुनें',
        'Select Worker': 'मजदूर चुनें',
        'Choose': 'चयन करें',
        'None': 'कोई नहीं',
        'Other': 'अन्य',
        'New': 'नया',
        'Old': 'पुराना',
        'Active': 'सक्रिय',
        'Inactive': 'निष्क्रिय',
        'All': 'सभी',
        
        // Site & Client
        'Site Name': 'साइट का नाम',
        'Client': 'क्लाइंट',
        'Client Name': 'क्लाइंट का नाम',
        'All Sites': 'सभी साइट्स',
        'Site': 'साइट',
        
        // Worker Related
        'All Workers': 'सभी मजदूर',
        'Worker': 'मजदूर',
        'Position': 'पद',
        'Material': 'सामग्री',
        'Record': 'रिकॉर्ड',
        'Edit Profile': 'प्रोफ़ाइल संपादित करें',
        
        // Date & Time
        'From': 'से',
        'To': 'तक',
        'Start Date': 'शुरुआती तारीख',
        'End Date': 'अंतिम तारीख',
        'Today': 'आज',
        'Yesterday': 'कल',
        'Daily': 'दैनिक',
        'Weekly': 'साप्ताहिक',
        'Monthly': 'मासिक',
        'Yearly': 'वार्षिक',
        'Range': 'रेंज',
        
        // Work & Tasks
        'Work Title': 'काम का नाम',
        'Work Type': 'काम का प्रकार',
        'Full Day': 'पूरा दिन',
        'Half Day': 'आधा दिन',
        
        // Data & Records
        'History': 'इतिहास',
        'Reports': 'रिपोर्ट्स',
        'Records': 'रिकॉर्ड',
        'Data': 'डेटा',
        'Table': 'टेबल',
        'List': 'सूची',
        'Summary': 'सारांश',
        'Count': 'गिनती',
        'Item': 'आइटम',
        
        // Status & Messages
        'Loading...': 'लोड हो रहा है...',
        'Done': 'पूर्ण',
        'Success': 'सफल',
        'Failed': 'असफल',
        'Error': 'त्रुटि',
        'Warning': 'चेतावनी',
        'Info': 'जानकारी',
        'Please': 'कृपया',
        'Enter': 'दर्ज करें',
        'Required': 'आवश्यक',
        'Optional': 'वैकल्पिक',
        
        // Display Options
        'Show': 'दिखाएँ',
        'Hide': 'छुपाएँ',
        'Expand': 'विस्तार करें',
        'Collapse': 'संक्षिप्त करें',
        
        // Payment & Finance
        'Paid': 'भुगतान किया',
        'Unpaid': 'लंबित',
        'CSV': 'सीएसवी',
        'Excel': 'एक्सेल',
        'PDF': 'पीडीएफ',
        'Report': 'रिपोर्ट',
        
        // Categories & Organization
        'All Categories': 'सभी श्रेणियाँ',
        
        // System & Settings
        'Language': 'भाषा',
        'Backup & Restore': 'बैकअप और रिस्टोर',
        'Download Full Backup': 'पूरा बैकअप डाउनलोड करें',
        'Import Backup File': 'बैकअप फ़ाइल इम्पोर्ट करें',
        'Export Visible Table (CSV+PDF)': 'दिख रही टेबल एक्सपोर्ट करें (CSV+PDF)',
        'Download Type': 'डाउनलोड प्रकार',
        'Download': 'डाउनलोड',
        'Download PDF': 'पीडीएफ डाउनलोड करें',
        'Downloading...': 'डाउनलोड हो रहा है...',
        'How many rows do you want to download? (default: all {count})': 'कितनी पंक्तियाँ डाउनलोड करनी हैं? (डिफ़ॉल्ट: सभी {count})',
        'Enter a valid number.': 'कृपया सही संख्या दर्ज करें।',
        'JSON (Full Import Backup)': 'JSON (पूरा इम्पोर्ट बैकअप)',
        'CSV (Counts Summary)': 'CSV (काउंट सारांश)',
        'Full backup downloaded.': 'पूरा बैकअप डाउनलोड हो गया।',
        'Full backup downloaded (JSON + CSV).': 'पूरा बैकअप डाउनलोड हो गया (JSON + CSV)।',
        'Failed to download full backup.': 'पूरा बैकअप डाउनलोड नहीं हो पाया।',
        'Import backup will add records again. Continue?': 'बैकअप इम्पोर्ट करने पर रिकॉर्ड फिर से जुड़ जाएंगे। क्या जारी रखें?',
        'Import complete. Success: {success}, Failed: {failed}': 'इम्पोर्ट पूरा हुआ। सफल: {success}, असफल: {failed}',
        'Backup import failed: {error}': 'बैकअप इम्पोर्ट असफल: {error}',
        'No visible table found on this page.': 'इस पेज पर कोई दिखाई देने वाली टेबल नहीं मिली।',
        'No visible rows found in table.': 'टेबल में कोई दिखाई देने वाली पंक्तियाँ नहीं मिलीं।',
        'Filtered table exported.': 'फ़िल्टर की गई टेबल एक्सपोर्ट हो गई।',
        'Failed to export visible table.': 'दिख रही टेबल एक्सपोर्ट नहीं हो पाई।',
        'Filtered Table Export': 'फ़िल्टर की गई टेबल एक्सपोर्ट',
        'Backup failed before delete. Do you still want to continue delete?': 'डिलीट से पहले बैकअप असफल रहा। क्या फिर भी डिलीट जारी रखना है?',
        'Are you sure you want to delete {entity} "{name}"? This action cannot be undone.': 'क्या आप "{name}" {entity} को हटाना चाहते हैं? यह कार्रवाई वापस नहीं होगी।',
        'Are you sure you want to delete this {entity}? This action cannot be undone.': 'क्या आप इस {entity} को हटाना चाहते हैं? यह कार्रवाई वापस नहीं होगी।',
        '{entity} deleted successfully!': '{entity} सफलतापूर्वक हटाया गया!',
        'Failed to delete {entity}': '{entity} हटाने में असफल',
        'Error deleting {entity}': '{entity} हटाते समय त्रुटि',
        'Install App': 'ऐप इंस्टॉल करें',
        'Reload Page': 'पेज रीफ्रेश करें',
        'Help': 'मदद',
        
        // Validation & Confirmation
        'Yes': 'हाँ',
        'No': 'नहीं',
        'OK': 'ठीक है',
        'And': 'और',
        'Or': 'या',
        'Not': 'नहीं',
        'Any': 'कोई भी',
        'Every': 'हर',
        'Each': 'प्रत्येक',
        'Between': 'बीच में',
        
        // Directions & Navigation
        'Up': 'ऊपर',
        'Down': 'नीचे',
        'Left': 'बाएं',
        'Right': 'दाएं',
        'First': 'पहला',
        'Last': 'आखिरी',
        'Top': 'शीर्ष',
        'Bottom': 'नीचे',
        'More': 'अधिक',
        'Less': 'कम',
        'Per': 'प्रति',
        
        // Pagination
        'Page': 'पेज',
        'of': 'का',
        
        // Location Fields
        'City': 'शहर',
        'State': 'राज्य',
        'Country': 'देश',
        'Pin': 'पिन',
        'Zip': 'ज़िप कोड',
        
        // Time References
        'Start': 'शुरुआत',
        'End': 'अंत',
        'Time': 'समय',
        
        // Chart & Visualization
        'Chart': 'चार्ट',
        'Graph': 'ग्राफ'
    },
    gu: {
        // Core Navigation & Modules
        'Work Manager': 'વર્ક મેનેજર',
        'Manage sites, workers, attendance and payments': 'સાઇટ, મજૂરો, હાજરી અને ચુકવણીઓ મેનેજ કરો',
        'Use search and filter to quickly open modules': 'મોડ્યુલ ઝડપથી ખોલવા માટે શોધ અને ફિલ્ટરનો ઉપયોગ કરો',
        'Dashboard': 'ડેશબોર્ડ',
        'Sites': 'સાઇટ્સ',
        'Workers': 'મજૂરો',
        'Attendance': 'હાજરી',
        'Payments': 'ચુકવણીઓ',
        'Transactions': 'લેવડદેવડ',
        'Positions': 'પદો',
        'Received': 'પ્રાપ્ત',
        'Materials': 'સામગ્રી',
        'Profile': 'પ્રોફાઇલ',
        'Logout': 'લોગઆઉટ',
        'Home': 'હોમ',
        'All Modules': 'બધા મોડ્યુલ',
        'Master Data': 'માસ્ટર ડેટા',
        'Entry': 'એન્ટ્રી',
        'No module found for selected search/filter.': 'પસંદ કરેલા શોધ/ફિલ્ટર માટે કોઈ મોડ્યુલ મળ્યું નથી.',
        
        // Authentication & Login
        'Secure Login': 'સુરક્ષિત લોગિન',
        'Enter your PIN to continue': 'આગળ વધવા માટે પિન દાખલ કરો',
        'Sign In': 'સાઇન ઇન',
        'Need help? Contact System Administrator': 'મદદ જોઈએ? સિસ્ટમ એડમિનનો સંપર્ક કરો',
        'Clear PIN': 'પિન સાફ કરો',
        
        // Common Actions
        'Add': 'ઉમેરો',
        'Save': 'સેવ કરો',
        'Cancel': 'રદ કરો',
        'Close': 'બંધ',
        'Apply': 'લાગુ કરો',
        'Reset': 'રીસેટ',
        'Clear': 'સાફ કરો',
        'Search': 'શોધ',
        'Filter': 'છાંટણી',
        'Edit': 'સંપાદિત કરો',
        'Delete': 'કાઢી નાખો',
        'Update': 'અપડેટ કરો',
        'Submit': 'સબમિટ કરો',
        'Confirm': 'પુષ્ટિ કરો',
        'View': 'જુઓ',
        'Print': 'પ્રિન્ટ કરો',
        'Download': 'ડાઉનલોડ કરો',
        'Export': 'એક્સપોર્ટ',
        'Open': 'ખોલો',
        'Back': 'પાછળ',
        'Next': 'આગળ',
        'Previous': 'પહેલાં',
        
        // Common Fields & Labels
        'Name': 'નામ',
        'Phone': 'ફોન',
        'Position': 'પદ',
        'Date': 'તારીખ',
        'Status': 'સ્થિતિ',
        'Amount': 'રકમ',
        'Location': 'સ્થાન',
        'Description': 'વર્ણન',
        'Details': 'વિગતો',
        'Note': 'નોંધ',
        'Category': 'કેટેગરી',
        'Type': 'પ્રકાર',
        'Mode': 'મોડ',
        'Total': 'કુલ',
        'Balance': 'બેલેન્સ',
        'Pending': 'બાકી',
        'Number': 'નંબર',
        'Code': 'કોડ',
        'ID': 'આઈડી',
        'Contact': 'સંપર્ક',
        'Email': 'ઈમેલ',
        'Address': 'સરનામું',
        
        // Select Options
        'Select': 'પસંદ કરો',
        'Select Date': 'તારીખ પસંદ કરો',
        'Select Site': 'સાઇટ પસંદ કરો',
        'Select Worker': 'મજૂર પસંદ કરો',
        'Choose': 'પસંદગી કરો',
        'None': 'કંઈ નહીં',
        'Other': 'અન્ય',
        'New': 'નવું',
        'Old': 'જૂનું',
        'Active': 'સક્રિય',
        'Inactive': 'નિષ્ક્રિય',
        'All': 'બધા',
        
        // Site & Client
        'Site Name': 'સાઇટનું નામ',
        'Client': 'ક્લાયન્ટ',
        'Client Name': 'ક્લાયન્ટનું નામ',
        'All Sites': 'બધી સાઇટ્સ',
        'Site': 'સાઇટ',
        
        // Worker Related
        'All Workers': 'બધા મજૂરો',
        'Worker': 'મજૂર',
        'Position': 'હોદ્દો',
        'Material': 'સામગ્રી',
        'Record': 'રેકોર્ડ',
        'Edit Profile': 'પ્રોફાઇલ સંપાદિત કરો',
        
        // Date & Time
        'From': 'થી',
        'To': 'સુધી',
        'Start Date': 'શરૂ તારીખ',
        'End Date': 'અંત તારીખ',
        'Today': 'આજે',
        'Yesterday': 'ગઈકાલે',
        'Daily': 'દૈનિક',
        'Weekly': 'સાપ્તાહિક',
        'Monthly': 'માસિક',
        'Yearly': 'વાર્ષિક',
        'Range': 'રેન્જ',
        
        // Work & Tasks
        'Work Title': 'કામનું શીર્ષક',
        'Work Type': 'કામનો પ્રકાર',
        'Full Day': 'પૂર્ણ દિવસ',
        'Half Day': 'અર્ધો દિવસ',
        
        // Data & Records
        'History': 'ઇતિહાસ',
        'Reports': 'રિપોર્ટ્સ',
        'Records': 'રેકોર્ડ્સ',
        'Data': 'ડેટા',
        'Table': 'ટેબલ',
        'List': 'યાદી',
        'Summary': 'સારાંશ',
        'Count': 'ગણતરી',
        'Item': 'આઇટમ',
        
        // Status & Messages
        'Loading...': 'લોડ થઈ રહ્યું છે...',
        'Done': 'પૂર્ણ',
        'Success': 'સફળ',
        'Failed': 'નિષ્ફળ',
        'Error': 'ભૂલ',
        'Warning': 'ચેતવણી',
        'Info': 'માહિતી',
        'Please': 'કૃપા કરીને',
        'Enter': 'દાખલ કરો',
        'Required': 'જરૂરી',
        'Optional': 'વૈકલ્પિક',
        
        // Display Options
        'Show': 'બતાવો',
        'Hide': 'છુપાવો',
        'Expand': 'વિસ્તૃત કરો',
        'Collapse': 'સંકુચિત કરો',
        
        // Payment & Finance
        'Paid': 'ચૂકવ્યું',
        'Unpaid': 'બાકી',
        'CSV': 'સીએસવી',
        'Excel': 'એક્સેલ',
        'PDF': 'પીડીએફ',
        'Report': 'રિપોર્ટ',
        
        // Categories & Organization
        'All Categories': 'બધી કેટેગરી',
        
        // System & Settings
        'Language': 'ભાષા',
        'Backup & Restore': 'બેકઅપ અને રિસ્ટોર',
        'Download Full Backup': 'સંપૂર્ણ બેકઅપ ડાઉનલોડ કરો',
        'Import Backup File': 'બેકઅપ ફાઇલ ઇમ્પોર્ટ કરો',
        'Export Visible Table (CSV+PDF)': 'દેખાતી ટેબલ એક્સપોર્ટ કરો (CSV+PDF)',
        'Download Type': 'ડાઉનલોડ પ્રકાર',
        'Download': 'ડાઉનલોડ',
        'Download PDF': 'પીડીએફ ડાઉનલોડ કરો',
        'Downloading...': 'ડાઉનલોડ થઈ રહ્યું છે...',
        'How many rows do you want to download? (default: all {count})': 'કેટલી પંક્તિઓ ડાઉનલોડ કરવી? (ડિફોલ્ટ: બધી {count})',
        'Enter a valid number.': 'કૃપા કરીને માન્ય સંખ્યા દાખલ કરો.',
        'JSON (Full Import Backup)': 'JSON (પૂર્ણ ઇમ્પોર્ટ બેકઅપ)',
        'CSV (Counts Summary)': 'CSV (ગણતરી સારાંશ)',
        'Full backup downloaded.': 'સંપૂર્ણ બેકઅપ ડાઉનલોડ થયું.',
        'Full backup downloaded (JSON + CSV).': 'સંપૂર્ણ બેકઅપ ડાઉનલોડ થયું (JSON + CSV).',
        'Failed to download full backup.': 'સંપૂર્ણ બેકઅપ ડાઉનલોડ ન થયું.',
        'Import backup will add records again. Continue?': 'બેકઅપ ઇમ્પોર્ટ કરવાથી રેકોર્ડ ફરી ઉમેરાશે. શું ચાલુ રાખવું?',
        'Import complete. Success: {success}, Failed: {failed}': 'ઇમ્પોર્ટ પૂર્ણ. સફળ: {success}, નિષ્ફળ: {failed}',
        'Backup import failed: {error}': 'બેકઅપ ઇમ્પોર્ટ નિષ્ફળ: {error}',
        'No visible table found on this page.': 'આ પેજ પર કોઈ દેખાતી ટેબલ મળી નથી.',
        'No visible rows found in table.': 'ટેબલમાં કોઈ દેખાતી પંક્તિ મળી નથી.',
        'Filtered table exported.': 'ફિલ્ટર કરેલી ટેબલ એક્સપોર્ટ થઈ ગઈ.',
        'Failed to export visible table.': 'દેખાતી ટેબલ એક્સપોર્ટ થઈ નથી.',
        'Filtered Table Export': 'ફિલ્ટર કરેલી ટેબલ એક્સપોર્ટ',
        'Backup failed before delete. Do you still want to continue delete?': 'ડિલીટ પહેલા બેકઅપ નિષ્ફળ રહ્યું. શું હજી પણ ડિલીટ ચાલુ રાખવું છે?',
        'Are you sure you want to delete {entity} "{name}"? This action cannot be undone.': 'શું તમે "{name}" {entity} કાઢી નાખવા માંગો છો? આ ક્રિયા પાછી ફરતી નથી.',
        'Are you sure you want to delete this {entity}? This action cannot be undone.': 'શું તમે આ {entity} કાઢી નાખવા માંગો છો? આ ક્રિયા પાછી ફરતી નથી.',
        '{entity} deleted successfully!': '{entity} સફળતાપૂર્વક કાઢી નાખાયું!',
        'Failed to delete {entity}': '{entity} કાઢવામાં નિષ્ફળ',
        'Error deleting {entity}': '{entity} કાઢતી વખતે ભૂલ',
        'Install App': 'એપ ઇન્સ્ટોલ કરો',
        'Reload Page': 'પેજ ફરી લોડ કરો',
        'Help': 'મદદ',
        
        // Validation & Confirmation
        'Yes': 'હા',
        'No': 'ના',
        'OK': 'બરાબર',
        'And': 'અને',
        'Or': 'અથવા',
        'Not': 'નહીં',
        'Any': 'કોઈપણ',
        'Every': 'દરેક',
        'Each': 'પ્રત્યેક',
        'Between': 'વચ્ચે',
        
        // Directions & Navigation
        'Up': 'ઉપર',
        'Down': 'નીચે',
        'Left': 'ડાબે',
        'Right': 'જમણે',
        'First': 'પ્રથમ',
        'Last': 'છેલ્લું',
        'Top': 'ટોચ',
        'Bottom': 'તળિયે',
        'More': 'વધુ',
        'Less': 'ઓછું',
        'Per': 'દીઠ',
        
        // Pagination
        'Page': 'પેજ',
        'of': 'નું',
        
        // Location Fields
        'City': 'શહેર',
        'State': 'રાજ્ય',
        'Country': 'દેશ',
        'Pin': 'પિન',
        'Zip': 'પોસ્ટ કોડ',
        
        // Time References
        'Start': 'શરૂઆત',
        'End': 'અંત',
        'Time': 'સમય',
        
        // Chart & Visualization
        'Chart': 'ચાર્ટ',
        'Graph': 'ગ્રાફ'
    }
};

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function translateValue(rawText, language) {
    const map = UI_TRANSLATIONS[language] || {};
    const normalized = normalizeText(rawText);
    if (map[normalized]) return map[normalized];

    if (language === 'en') return rawText;

    let translated = String(rawText || '');
    const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
    for (const [source, target] of entries) {
        if (!source || source.length < 2) continue;
        const pattern = new RegExp(escapeRegExp(source), 'g');
        translated = translated.replace(pattern, target);
    }
    return translated;
}

function getSavedLanguage() {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : 'en';
}

function saveLanguage(language) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

function applyLanguage(language) {
    if (i18nApplying) return;
    i18nApplying = true;

    const selectedLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';

    try {
        const allElements = document.querySelectorAll('body *:not(script):not(style):not(noscript):not([data-i18n-skip]):not([data-i18n-skip] *)');
        allElements.forEach((element) => {
            if (element.placeholder !== undefined && element.placeholder) {
                if (!element.dataset.i18nOriginalPlaceholder) {
                    element.dataset.i18nOriginalPlaceholder = element.placeholder;
                }
                const source = element.dataset.i18nOriginalPlaceholder;
                element.placeholder = selectedLanguage === 'en' ? source : translateValue(source, selectedLanguage);
            }

            if (element.title) {
                if (!element.dataset.i18nOriginalTitle) {
                    element.dataset.i18nOriginalTitle = element.title;
                }
                const source = element.dataset.i18nOriginalTitle;
                element.title = selectedLanguage === 'en' ? source : translateValue(source, selectedLanguage);
            }

            if (element.tagName === 'OPTION' && element.textContent) {
                if (!element.dataset.i18nOriginalText) {
                    element.dataset.i18nOriginalText = element.textContent;
                }
                const source = element.dataset.i18nOriginalText;
                element.textContent = selectedLanguage === 'en' ? source : translateValue(source, selectedLanguage);
            }
        });

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const text = normalizeText(node.nodeValue || '');
                if (!text) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.closest('[data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                if (tag === 'OPTION') return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        let currentNode;
        while ((currentNode = walker.nextNode())) {
            if (!i18nTextNodeOriginal.has(currentNode)) {
                i18nTextNodeOriginal.set(currentNode, currentNode.nodeValue || '');
            }

            const source = i18nTextNodeOriginal.get(currentNode) || '';
            currentNode.nodeValue = selectedLanguage === 'en' ? source : translateValue(source, selectedLanguage);
        }

        document.documentElement.lang = selectedLanguage;
        const select = document.getElementById('globalLanguageSelect');
        if (select) select.value = selectedLanguage;
    } finally {
        i18nApplying = false;
    }
}

function createLanguageSelectElement(selectId) {
    const select = document.createElement('select');
    select.id = selectId;
    select.setAttribute('data-i18n-skip', 'true');
    select.style.height = '30px';
    select.style.borderRadius = '8px';
    select.style.border = '1px solid #cbd5e1';
    select.style.padding = '0 8px';
    select.style.fontSize = '12px';
    select.style.width = '100%';
    select.innerHTML = `
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="gu">ગુજરાતી</option>
    `;

    select.value = getSavedLanguage();
    select.addEventListener('change', () => {
        const language = select.value;
        saveLanguage(language);
        applyLanguage(language);
        document.querySelectorAll('[id^="globalLanguageSelect"]').forEach((el) => {
            if (el !== select) el.value = language;
        });
    });

    return select;
}

function injectLanguageIntoMenus() {
    const menus = [];

    ['menuPanel', 'topMenu'].forEach((fixedId) => {
        const el = document.getElementById(fixedId);
        if (el) menus.push(el);
    });

    document.querySelectorAll('div[id]').forEach((el) => {
        const id = (el.id || '').toLowerCase();
        const looksLikeMenu = id.includes('menu') && (el.classList.contains('absolute') || id === 'menupanel' || id === 'topmenu');
        if (looksLikeMenu) menus.push(el);
    });

    const uniqueMenus = Array.from(new Set(menus));

    uniqueMenus.forEach((menu) => {
        const menuId = menu.id || 'menu';

        const existingLanguage = menu.querySelector('[data-language-menu-item="true"]');
        if (!existingLanguage) {
            const container = document.createElement('div');
            container.setAttribute('data-language-menu-item', 'true');
            container.setAttribute('data-i18n-skip', 'true');
            container.style.padding = '8px 10px';
            container.style.borderTop = '1px solid #e2e8f0';

            const label = document.createElement('div');
            label.textContent = 'Language';
            label.style.fontSize = '11px';
            label.style.fontWeight = '700';
            label.style.color = '#64748b';
            label.style.marginBottom = '6px';

            const select = createLanguageSelectElement(`globalLanguageSelect-${menuId}`);

            container.appendChild(label);
            container.appendChild(select);
            menu.appendChild(container);
        }

        const existingBackup = menu.querySelector('[data-backup-menu-item="true"]');
        if (!existingBackup) {
            const backupContainer = document.createElement('div');
            backupContainer.setAttribute('data-backup-menu-item', 'true');
            backupContainer.style.padding = '8px 10px';
            backupContainer.style.borderTop = '1px solid #e2e8f0';

            const backupTitle = document.createElement('div');
            backupTitle.textContent = i18nText('Backup & Restore');
            backupTitle.style.fontSize = '11px';
            backupTitle.style.fontWeight = '700';
            backupTitle.style.color = '#64748b';
            backupTitle.style.marginBottom = '6px';

            const backupTypeWrap = document.createElement('div');
            backupTypeWrap.className = 'mb-2';

            const backupTypeLabel = document.createElement('div');
            backupTypeLabel.textContent = i18nText('Download Type');
            backupTypeLabel.style.fontSize = '11px';
            backupTypeLabel.style.color = '#64748b';
            backupTypeLabel.style.marginBottom = '4px';

            const backupTypeSelect = document.createElement('select');
            backupTypeSelect.className = 'w-full h-9 rounded-md border border-slate-300 text-sm text-slate-700 px-2';
            backupTypeSelect.innerHTML = `
                <option value="json">${i18nText('JSON (Full Import Backup)')}</option>
                <option value="csv">${i18nText('CSV (Counts Summary)')}</option>
            `;

            backupTypeWrap.appendChild(backupTypeLabel);
            backupTypeWrap.appendChild(backupTypeSelect);

            const exportBtn = document.createElement('button');
            exportBtn.type = 'button';
            exportBtn.textContent = i18nText('Download Full Backup');
            exportBtn.className = 'w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md';
            exportBtn.addEventListener('click', async () => {
                try {
                    await window.WorkToolBackup.downloadFullBackupNow(backupTypeSelect.value);
                    showSuccess(i18nText('Full backup downloaded.'));
                } catch (error) {
                    console.error('Backup download failed:', error);
                    showError(i18nText('Failed to download full backup.'));
                }
            });

            const importBtn = document.createElement('button');
            importBtn.type = 'button';
            importBtn.textContent = i18nText('Import Backup File');
            importBtn.className = 'w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md';
            importBtn.addEventListener('click', () => {
                window.WorkToolBackup.openBackupImportPicker();
            });

            backupContainer.appendChild(backupTitle);
            backupContainer.appendChild(backupTypeWrap);
            backupContainer.appendChild(exportBtn);
            backupContainer.appendChild(importBtn);
            menu.appendChild(backupContainer);
        }
    });
}

function injectTableDownloadControls() {
    const table = getFirstVisibleTable();
    if (!table) return;

    if (document.querySelector('[data-table-download-controls="true"]')) return;

    const hasExistingExportUi = Boolean(
        document.querySelector(
            '#exportReportPDF, [onclick*="export" i], [id*="export" i], [class*="export" i], [aria-label*="export" i], [title*="export" i]'
        )
    );
    if (hasExistingExportUi) return;

    const filterHost =
        table.closest('section')?.querySelector('.search-controls, .filter-buttons, .grid, .p-4.border-b, [id*="filter" i], [class*="filter" i]') ||
        table.closest('section')?.querySelector('[id*="search" i], [class*="search" i]') ||
        null;

    const host = filterHost ||
        table.closest('section') ||
        table.closest('.report-table') ||
        table.closest('.table-scroll') ||
        table.parentElement;

    if (!host) return;

    const hostStyle = window.getComputedStyle(host);
    const useInlinePlacement = hostStyle.display.includes('flex') || hostStyle.display.includes('grid') || host.classList.contains('search-controls');
    if (!useInlinePlacement && hostStyle.position === 'static') {
        host.style.position = 'relative';
    }

    const wrap = document.createElement('div');
    wrap.setAttribute('data-table-download-controls', 'true');
    wrap.className = useInlinePlacement
        ? 'ml-auto'
        : 'absolute top-3 right-3 z-10';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = i18nText('Download PDF');
    button.setAttribute('aria-label', i18nText('Download PDF'));
    button.className = 'h-10 w-10 rounded-full border border-primary/20 bg-white/95 text-primary hover:bg-primary/5 shadow-sm grid place-items-center';
    button.innerHTML = '<span class="material-symbols-outlined text-[20px]">download</span>';
    button.addEventListener('click', async () => {
        const tableData = extractTableData(table);
        const totalRows = (tableData.rows || []).length;
        if (!totalRows) {
            showError(i18nText('No visible rows found in table.'));
            return;
        }

        button.disabled = true;
        const icon = button.innerHTML;
        button.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-pulse">hourglass_top</span>';
        try {
            await window.WorkToolBackup.exportVisibleTableNow();
        } finally {
            button.disabled = false;
            button.innerHTML = icon;
        }
    });

    wrap.appendChild(button);
    host.appendChild(wrap);
}

function initLanguageSystem() {
    if (languageSystemInitialized) {
        injectLanguageIntoMenus();
        injectTableDownloadControls();
        applyLanguage(getSavedLanguage());
        return;
    }

    injectLanguageIntoMenus();
    injectTableDownloadControls();
    const language = getSavedLanguage();
    applyLanguage(language);

    window.applyCurrentLanguage = function() {
        applyLanguage(getSavedLanguage());
    };

    let applyTimer = null;
    languageObserver = new MutationObserver(() => {
        if (i18nApplying) return;
        injectLanguageIntoMenus();
        injectTableDownloadControls();
        clearTimeout(applyTimer);
        applyTimer = setTimeout(() => {
            applyLanguage(getSavedLanguage());
        }, 150);
    });

    languageObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    window.addEventListener('pageshow', () => {
        injectLanguageIntoMenus();
        injectTableDownloadControls();
        applyLanguage(getSavedLanguage());
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            injectLanguageIntoMenus();
            injectTableDownloadControls();
            applyLanguage(getSavedLanguage());
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key === LANGUAGE_STORAGE_KEY) {
            injectLanguageIntoMenus();
            injectTableDownloadControls();
            applyLanguage(getSavedLanguage());
        }
    });

    languageSystemInitialized = true;
}

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.top !== window.self) {
        window.top.location = window.self.location.href;
        return;
    }

    initLanguageSystem();

    // Skip auth check for login page
    if (window.location.pathname.includes('login-new.html')) {
        return;
    }
    
    // Check authentication for all other pages
    if (checkAuth()) {
        startAuthActivityTracking();
        touchAuthActivity(true);
    }
});

console.log('✅ Work Tool Config Loaded');
console.log(`🔗 API Base URL: ${API_CONFIG.BASE_URL}`);
console.log('🔐 Authentication: Enabled');