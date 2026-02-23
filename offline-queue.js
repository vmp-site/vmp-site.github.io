(function () {
    const STORAGE_KEY = 'worktool.offlineQueue.v1';
    const PROCESS_INTERVAL_MS = 30000;
    const MAX_QUEUE_ITEMS = 300;
    const MAX_RETRIES = 15;
    const MAX_ITEM_AGE_DAYS = 14;

    let state = {
        initialized: false,
        getBaseUrl: null,
        timerId: null,
        processing: false
    };

    function emitChange(extra = {}) {
        const stats = getStats();
        window.dispatchEvent(new CustomEvent('offline-queue-updated', {
            detail: {
                ...stats,
                ...extra,
                online: navigator.onLine
            }
        }));
    }

    function readQueue() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.error('OfflineQueue read error:', error);
            return [];
        }
    }

    function writeQueue(queue) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        emitChange();
    }

    function isStale(item) {
        if (!item || !item.createdAt) return false;
        const createdAt = new Date(item.createdAt).getTime();
        if (Number.isNaN(createdAt)) return false;
        const ageMs = Date.now() - createdAt;
        return ageMs > MAX_ITEM_AGE_DAYS * 24 * 60 * 60 * 1000;
    }

    function pruneQueue(queue) {
        const fresh = queue.filter((item) => !isStale(item) && (item.attempts || 0) <= MAX_RETRIES);
        if (fresh.length <= MAX_QUEUE_ITEMS) return fresh;
        return fresh.slice(fresh.length - MAX_QUEUE_ITEMS);
    }

    function isSuccessResponse(result) {
        return !!(result && (result.status === 'success' || result.success));
    }

    async function postToBackend(action, payload) {
        const baseUrl = state.getBaseUrl ? state.getBaseUrl() : '';
        if (!baseUrl) {
            return { ok: false, error: 'BASE_URL not available' };
        }

        try {
            const response = await fetch(`${baseUrl}?action=${action}`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return { ok: false, error: `HTTP ${response.status}` };
            }

            let result;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                try {
                    result = JSON.parse(text);
                } catch {
                    return { ok: false, error: 'Invalid JSON response' };
                }
            }

            if (isSuccessResponse(result)) {
                return { ok: true, result };
            }

            return { ok: false, error: (result && result.message) || 'Save failed', result };
        } catch (error) {
            return { ok: false, error: error.message || 'Network error' };
        }
    }

    function enqueue(type, action, payload) {
        const queue = pruneQueue(readQueue());
        queue.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type,
            action,
            payload,
            createdAt: new Date().toISOString(),
            attempts: 0
        });
        const finalQueue = pruneQueue(queue);
        writeQueue(finalQueue);
        return finalQueue.length;
    }

    async function submitOrQueue(type, action, payload) {
        if (!navigator.onLine) {
            const count = enqueue(type, action, payload);
            return { success: false, queued: true, queueCount: count, reason: 'offline' };
        }

        const onlineSave = await postToBackend(action, payload);
        if (onlineSave.ok) {
            return { success: true, queued: false, result: onlineSave.result };
        }

        const count = enqueue(type, action, payload);
        return {
            success: false,
            queued: true,
            queueCount: count,
            reason: onlineSave.error || 'save failed'
        };
    }

    async function processQueue() {
        if (state.processing) {
            return { synced: 0, remaining: readQueue().length, skipped: true };
        }

        if (!navigator.onLine) return { synced: 0, remaining: readQueue().length };

        const queue = pruneQueue(readQueue());
        if (queue.length !== readQueue().length) {
            writeQueue(queue);
        }
        if (!queue.length) return { synced: 0, remaining: 0 };

        state.processing = true;
        let synced = 0;
        const remaining = [];

        try {
            for (const item of queue) {
                const result = await postToBackend(item.action, item.payload);
                if (result.ok) {
                    synced++;
                } else {
                    item.attempts = (item.attempts || 0) + 1;
                    if (item.attempts <= MAX_RETRIES) {
                        remaining.push(item);
                    }

                    if ((result.error || '').toLowerCase().includes('network')) {
                        const currentIndex = queue.indexOf(item);
                        remaining.push(...queue.slice(currentIndex + 1));
                        break;
                    }
                }
            }

            const finalQueue = pruneQueue(remaining);
            writeQueue(finalQueue);
            emitChange({ syncedLastRun: synced });

            return { synced, remaining: finalQueue.length };
        } finally {
            state.processing = false;
        }
    }

    function getStats() {
        const queue = readQueue();
        const byType = queue.reduce((acc, item) => {
            const type = item.type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        return {
            total: queue.length,
            byType,
            max: MAX_QUEUE_ITEMS
        };
    }

    function init(options) {
        if (state.initialized) return;

        state.getBaseUrl = options && options.getBaseUrl ? options.getBaseUrl : () => (typeof BASE_URL !== 'undefined' ? BASE_URL : '');

        window.addEventListener('online', () => {
            emitChange();
            processQueue().then((res) => {
                if (res.synced > 0) {
                    console.log(`✅ Offline queue synced: ${res.synced}`);
                }
            });
        });

        window.addEventListener('offline', () => {
            emitChange();
        });

        state.timerId = setInterval(() => {
            processQueue().catch((error) => {
                console.warn('OfflineQueue process warning:', error);
            });
        }, PROCESS_INTERVAL_MS);

        emitChange();

        state.initialized = true;
    }

    window.OfflineQueue = {
        init,
        enqueue,
        submitOrQueue,
        process: processQueue,
        getStats
    };
})();
