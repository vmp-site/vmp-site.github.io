// API functions for Work Tool - Google Apps Script Backend
// Base URL is imported from config.js

// Function to add a new site
async function addSite(data) {
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addSite',
                data: data
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Site added successfully:', data);
            return { success: true, message: result.message || 'Site added successfully!' };
        } else {
            throw new Error(result.error || 'Failed to add site');
        }
    } catch (error) {
        console.error('Error adding site:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}

// Function to add a new worker
async function addWorker(data) {
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addWorker',
                data: data
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Worker added successfully:', data);
            return { success: true, message: result.message || 'Worker added successfully!' };
        } else {
            throw new Error(result.error || 'Failed to add worker');
        }
    } catch (error) {
        console.error('Error adding worker:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}

// Function to add attendance record
async function addAttendance(data) {
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addAttendance',
                data: data
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Attendance added successfully:', data);
            return { success: true, message: result.message || 'Attendance recorded successfully!' };
        } else {
            throw new Error(result.error || 'Failed to add attendance');
        }
    } catch (error) {
        console.error('Error adding attendance:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}

// Function to add payment record
async function addPayment(data) {
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addPayment',
                data: data
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Payment added successfully:', data);
            return { success: true, message: result.message || 'Payment recorded successfully!' };
        } else {
            throw new Error(result.error || 'Failed to add payment');
        }
    } catch (error) {
        console.error('Error adding payment:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}