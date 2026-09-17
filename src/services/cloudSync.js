/**
 * Real-time Cloud Sync Service for KCT LifeFlow
 * Connects local storage to a central Cloud API (restful-api.dev)
 * to ensure all users, admins, and devices share live updates instantaneously.
 */

const CLOUD_OBJECT_ID = 'ff808181a09d98f701a0adf88beb2349';
const CLOUD_API_URL = `https://api.restful-api.dev/objects/${CLOUD_OBJECT_ID}`;

// BroadcastChannel for instant cross-tab sync on the same device
const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('kct_lifeflow_sync_channel')
  : null;

let isSyncing = false;
let syncListeners = [];

export const cloudSync = {
  /**
   * Register listener for cloud sync updates
   */
  subscribe: (callback) => {
    syncListeners.push(callback);
    return () => {
      syncListeners = syncListeners.filter(cb => cb !== callback);
    };
  },

  notifyListeners: () => {
    syncListeners.forEach(cb => {
      try { cb(); } catch (e) { console.error('Sync listener error:', e); }
    });
    if (broadcast) {
      broadcast.postMessage({ type: 'DATA_SYNC' });
    }
  },

  /**
   * Pulls latest database state from Cloud API into LocalStorage
   */
  pullFromCloud: async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const response = await fetch(CLOUD_API_URL);
      if (response.ok) {
        const json = await response.json();
        if (json && json.data) {
          const cloudData = json.data;
          
          let localUsers = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
          let localRequests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');

          // Merge Users (Cloud wins if updated, but keep local additions)
          const mergedUsers = { ...localUsers, ...(cloudData.users || {}) };
          
          // Merge Requests (Cloud requests merged with local)
          const requestMap = new Map();
          (cloudData.requests || []).forEach(r => requestMap.set(r.id, r));
          localRequests.forEach(r => {
            if (!requestMap.has(r.id)) {
              requestMap.set(r.id, r);
            } else {
              // Update status/volunteers if local has changes
              const cloudReq = requestMap.get(r.id);
              if (r.status !== cloudReq.status || (r.volunteeredDonors && r.volunteeredDonors.length !== (cloudReq.volunteeredDonors || []).length)) {
                requestMap.set(r.id, { ...cloudReq, ...r });
              }
            }
          });
          const mergedRequests = Array.from(requestMap.values());

          // Save to LocalStorage
          localStorage.setItem('blood_donation_users_db', JSON.stringify(mergedUsers));
          localStorage.setItem('blood_requests_db', JSON.stringify(mergedRequests));

          // If current logged-in user profile updated in cloud, refresh session
          const sessionUser = JSON.parse(localStorage.getItem('blood_donation_session_user') || 'null');
          if (sessionUser && sessionUser.email && mergedUsers[sessionUser.email]) {
            const updatedProfile = mergedUsers[sessionUser.email];
            if (sessionUser.name !== updatedProfile.name) {
              localStorage.setItem('blood_donation_session_user', JSON.stringify({
                name: updatedProfile.name,
                email: updatedProfile.email
              }));
            }
          }

          cloudSync.notifyListeners();
        }
      }
    } catch (err) {
      console.warn('Cloud sync pull warning (using local cache):', err);
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Pushes current LocalStorage state up to the Cloud API
   */
  pushToCloud: async () => {
    try {
      const users = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      const requests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');

      await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'KCT_BLOOD_DONATION_DB',
          data: {
            users,
            requests,
            lastUpdated: new Date().toISOString()
          }
        })
      });

      cloudSync.notifyListeners();
    } catch (err) {
      console.warn('Cloud sync push warning (saved to local cache):', err);
    }
  },

  /**
   * Initialize background sync polling & cross-tab messaging
   */
  init: () => {
    // Initial pull from cloud
    cloudSync.pullFromCloud();

    // Listen to BroadcastChannel messages from other tabs
    if (broadcast) {
      broadcast.onmessage = (event) => {
        if (event.data && event.data.type === 'DATA_SYNC') {
          syncListeners.forEach(cb => {
            try { cb(); } catch (e) { console.error('Broadcast listener error:', e); }
          });
        }
      };
    }

    // Window focus sync
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        cloudSync.pullFromCloud();
      });
      window.addEventListener('storage', () => {
        cloudSync.notifyListeners();
      });
    }

    // Auto-poll every 6 seconds for live multi-device admin updates
    setInterval(() => {
      cloudSync.pullFromCloud();
    }, 6000);
  }
};
