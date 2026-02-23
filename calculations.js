// Calculation Functions for Contractor Management System

// ================================
// SIMPLIFIED ROBUST CALCULATIONS
// ================================

/**
 * Calculate worker pending amount (CLEAN VERSION)
 * @param {string} workerId - Worker ID
 * @param {Array} attendanceData - All attendance records
 * @param {Array} paymentData - All payment records
 * @returns {Object} Worker calculation breakdown
 */
function calculateWorkerPending(workerId, attendanceData, paymentData) {
    console.log(`🧮 Calculating worker pending for: ${workerId}`);
    console.log(`📊 Data: ${attendanceData.length} attendance, ${paymentData.length} payments`);
    
    // Handle empty data
    if (!attendanceData) attendanceData = [];
    if (!paymentData) paymentData = [];
    if (!workerId) return { totalWork: 0, totalPaid: 0, pendingAmount: 0 };
    
    // Calculate Total Work Amount
    const totalWork = attendanceData
        .filter(record => record.worker_id === workerId)
        .reduce((sum, record) => {
            const rate = parseFloat(record.rate) || 0;
            console.log(`Adding work rate: ${rate}`);
            return sum + rate;
        }, 0);
    
    // Calculate Total Paid (where type = "given")
    const totalPaid = paymentData
        .filter(record => record.worker_id === workerId && record.type === 'given')
        .reduce((sum, record) => {
            const amount = parseFloat(record.amount) || 0;
            console.log(`Adding payment: ${amount}`);
            return sum + amount;
        }, 0);
    
    // Calculate Pending Amount
    const pendingAmount = totalWork - totalPaid;
    
    const result = {
        totalWork: totalWork,
        totalPaid: totalPaid,
        pendingAmount: pendingAmount
    };
    
    console.log(`✅ Worker ${workerId} result:`, result);
    return result;
}

/**
 * Calculate site balance (CLEAN VERSION)
 * @param {string} siteId - Site ID
 * @param {Array} paymentData - All payment records
 * @returns {Object} Site calculation breakdown
 */
function calculateSiteBalance(siteId, paymentData) {
    console.log(`🧮 Calculating site balance for: ${siteId}`);
    console.log(`📊 Data: ${paymentData.length} payments`);
    
    // Handle empty data
    if (!paymentData) paymentData = [];
    if (!siteId) return { totalReceived: 0, totalGiven: 0, balance: 0 };
    
    // Calculate Total Received (where type = "received")
    const totalReceived = paymentData
        .filter(record => record.site_id === siteId && record.type === 'received')
        .reduce((sum, record) => {
            const amount = parseFloat(record.amount) || 0;
            console.log(`Adding received: ${amount}`);
            return sum + amount;
        }, 0);
    
    // Calculate Total Given (where type = "given")
    const totalGiven = paymentData
        .filter(record => record.site_id === siteId && record.type === 'given')
        .reduce((sum, record) => {
            const amount = parseFloat(record.amount) || 0;
            console.log(`Adding given: ${amount}`);
            return sum + amount;
        }, 0);
    
    // Calculate Balance
    const balance = totalReceived - totalGiven;
    
    const result = {
        totalReceived: totalReceived,
        totalGiven: totalGiven,
        balance: balance
    };
    
    console.log(`✅ Site ${siteId} result:`, result);
    return result;
}

// ================================\n// LEGACY FUNCTIONS (KEEP FOR COMPATIBILITY)\n// ================================

/**
 * Calculate total work amount for a worker
 * @param {Array} attendanceData - All attendance records
 * @param {string} workerId - Worker ID to filter by
 * @returns {number} Total work amount
 */
function calculateWorkerTotalWork(attendanceData, workerId) {
    return attendanceData
        .filter(record => record.worker_id === workerId)
        .reduce((total, record) => {
            const rate = parseFloat(record.rate) || 0;
            return total + rate;
        }, 0);
}

/**
 * Calculate total paid amount for a worker (FIXED)
 * @param {Array} paymentsData - All payment records
 * @param {string} workerId - Worker ID to filter by
 * @returns {number} Total paid amount
 */
function calculateWorkerTotalPaid(paymentsData, workerId) {
    console.log(`🧮 Calculating total paid for worker: ${workerId}`);
    console.log(`📊 Payment records:`, paymentsData);
    
    const workerPayments = paymentsData.filter(record => {
        const matches = record.worker_id === workerId && record.type === 'given';
        console.log(`Payment record:`, record, `Matches: ${matches}`);
        return matches;
    });
    
    const total = workerPayments.reduce((sum, record) => {
        const amount = parseFloat(record.amount) || 0;
        console.log(`Adding amount: ${amount}`);
        return sum + amount;
    }, 0);
    
    console.log(`💰 Total paid for ${workerId}: ₹${total}`);
    return total;
}

/**
 * Calculate pending amount for a worker (FIXED)
 * @param {Array} attendanceData - All attendance records
 * @param {Array} paymentsData - All payment records
 * @param {string} workerId - Worker ID to calculate for
 * @returns {Object} Calculation breakdown
 */
function calculateWorkerSummary(attendanceData, paymentsData, workerId) {
    console.log(`📊 Calculating summary for worker: ${workerId}`);
    
    const totalWork = calculateWorkerTotalWork(attendanceData, workerId);
    const totalPaid = calculateWorkerTotalPaid(paymentsData, workerId);
    const pendingAmount = totalWork - totalPaid;
    
    const summary = {
        totalWork: totalWork,
        totalPaid: totalPaid,
        pendingAmount: pendingAmount
    };
    
    console.log(`✅ Worker ${workerId} summary:`, summary);
    return summary;
}

// ================================
// SITE CALCULATIONS
// ================================

/**
 * Calculate total received amount for a site (FIXED)
 * @param {Array} paymentsData - All payment records
 * @param {string} siteId - Site ID to filter by
 * @returns {number} Total received amount
 */
function calculateSiteTotalReceived(paymentsData, siteId) {
    console.log(`🧮 Calculating total received for site: ${siteId}`);
    console.log(`📊 Payment records:`, paymentsData);
    
    const siteReceivedPayments = paymentsData.filter(record => {
        const matches = record.site_id === siteId && record.type === 'received';
        console.log(`Payment record:`, record, `Matches: ${matches}`);
        return matches;
    });
    
    const total = siteReceivedPayments.reduce((sum, record) => {
        const amount = parseFloat(record.amount) || 0;
        console.log(`Adding received amount: ${amount}`);
        return sum + amount;
    }, 0);
    
    console.log(`💰 Total received for ${siteId}: ₹${total}`);
    return total;
}

/**
 * Calculate total given amount for a site (FIXED)
 * @param {Array} paymentsData - All payment records
 * @param {string} siteId - Site ID to filter by
 * @returns {number} Total given amount
 */
function calculateSiteTotalGiven(paymentsData, siteId) {
    console.log(`🧮 Calculating total given for site: ${siteId}`);
    
    const siteGivenPayments = paymentsData.filter(record => {
        const matches = record.site_id === siteId && record.type === 'given';
        console.log(`Payment record:`, record, `Matches: ${matches}`);
        return matches;
    });
    
    const total = siteGivenPayments.reduce((sum, record) => {
        const amount = parseFloat(record.amount) || 0;
        console.log(`Adding given amount: ${amount}`);
        return sum + amount;
    }, 0);
    
    console.log(`💸 Total given for ${siteId}: ₹${total}`);
    return total;
}

/**
 * Calculate balance for a site (FIXED)
 * @param {Array} paymentsData - All payment records
 * @param {string} siteId - Site ID to calculate for
 * @returns {Object} Calculation breakdown
 */
function calculateSiteSummary(paymentsData, siteId) {
    console.log(`📊 Calculating summary for site: ${siteId}`);
    
    const totalReceived = calculateSiteTotalReceived(paymentsData, siteId);
    const totalGiven = calculateSiteTotalGiven(paymentsData, siteId);
    const balance = totalReceived - totalGiven;
    
    const summary = {
        totalReceived: totalReceived,
        totalGiven: totalGiven,
        balance: balance
    };
    
    console.log(`✅ Site ${siteId} summary:`, summary);
    return summary;
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Format amount as Indian Rupees
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount (uses formatCurrency from config.js)
 */

/**
 * Filter attendance records by worker ID
 * @param {Array} attendanceData - All attendance records
 * @param {string} workerId - Worker ID to filter by
 * @returns {Array} Filtered attendance records
 */
function filterAttendanceByWorker(attendanceData, workerId) {
    return attendanceData.filter(record => record.worker_id === workerId);
}

/**
 * Filter attendance records by site ID
 * @param {Array} attendanceData - All attendance records
 * @param {string} siteId - Site ID to filter by
 * @returns {Array} Filtered attendance records
 */
function filterAttendanceBySite(attendanceData, siteId) {
    return attendanceData.filter(record => record.site_id === siteId);
}

/**
 * Filter payment records by worker ID
 * @param {Array} paymentsData - All payment records
 * @param {string} workerId - Worker ID to filter by
 * @returns {Array} Filtered payment records
 */
function filterPaymentsByWorker(paymentsData, workerId) {
    return paymentsData.filter(record => record.worker_id === workerId);
}

/**
 * Filter payment records by site ID
 * @param {Array} paymentsData - All payment records
 * @param {string} siteId - Site ID to filter by
 * @returns {Array} Filtered payment records
 */
function filterPaymentsBySite(paymentsData, siteId) {
    return paymentsData.filter(record => record.site_id === siteId);
}