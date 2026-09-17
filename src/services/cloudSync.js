/**
 * Live Multi-Device Cloud Sync Service for KCT LifeFlow
 * Connects all devices & users via a shared REST API endpoint (crudcrud.com)
 */

const API_BASE = 'https://crudcrud.com/api/8d2e0e312d8d4308b0b7c74c4ae66c1b';

const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('kct_lifeflow_sync_channel')
  : null;

let isPulling = false;
let isPushing = false;
let syncListeners = [];

export const cloudSync = {
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
   * Pulls all users and requests from the cloud database
   */
  pullFromCloud: async () => {
    if (isPulling) return;
    isPulling = true;
    try {
      // 1. Fetch Cloud Users
      const usersRes = await fetch(`${API_BASE}/users`);
      let cloudUsers = [];
      if (usersRes.ok) {
        cloudUsers = await usersRes.json();
      }

      // 2. Fetch Cloud Requests
      const reqsRes = await fetch(`${API_BASE}/requests`);
      let cloudRequests = [];
      if (reqsRes.ok) {
        cloudRequests = await reqsRes.json();
      }

      // 3. Merge Users into LocalStorage
      let localUsers = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      let updatedLocal = false;

      cloudUsers.forEach(u => {
        if (u.email) {
          const emailKey = u.email.toLowerCase().trim();
          if (!localUsers[emailKey] || new Date(u.updatedAt || 0) > new Date(localUsers[emailKey].updatedAt || 0)) {
            const { _id, ...cleanUserData } = u;
            localUsers[emailKey] = { ...localUsers[emailKey], ...cleanUserData };
            updatedLocal = true;
          }
        }
      });

      // 4. Merge Requests into LocalStorage
      let localRequests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');
      const localReqMap = new Map();
      localRequests.forEach(r => localReqMap.set(r.id, r));

      cloudRequests.forEach(r => {
        if (r.id) {
          const existing = localReqMap.get(r.id);
          const { _id, ...cleanReqData } = r;
          if (!existing) {
            localReqMap.set(r.id, cleanReqData);
            updatedLocal = true;
          } else {
            // Update status / volunteers if changed
            if (existing.status !== cleanReqData.status || 
                (cleanReqData.volunteeredDonors && cleanReqData.volunteeredDonors.length !== (existing.volunteeredDonors || []).length)) {
              localReqMap.set(r.id, { ...existing, ...cleanReqData });
              updatedLocal = true;
            }
          }
        }
      });

      if (updatedLocal) {
        localStorage.setItem('blood_donation_users_db', JSON.stringify(localUsers));
        localStorage.setItem('blood_requests_db', JSON.stringify(Array.from(localReqMap.values())));
        cloudSync.notifyListeners();
      }
    } catch (err) {
      console.warn('Cloud sync pull warning:', err);
    } finally {
      isPulling = false;
    }
  },

  /**
   * Syncs a specific user to the cloud database
   */
  syncUser: async (userData) => {
    if (!userData || !userData.email) return;
    try {
      const emailKey = userData.email.toLowerCase().trim();
      const payload = {
        ...userData,
        email: emailKey,
        updatedAt: new Date().toISOString()
      };

      // POST user record to cloud
      await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Cloud user sync error:', err);
    }
  },

  /**
   * Syncs a blood request to the cloud database
   */
  syncRequest: async (requestData) => {
    if (!requestData || !requestData.id) return;
    try {
      const payload = {
        ...requestData,
        updatedAt: new Date().toISOString()
      };

      await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Cloud request sync error:', err);
    }
  },

  /**
   * Syncs all local users and requests to the cloud
   */
  pushToCloud: async () => {
    if (isPushing) return;
    isPushing = true;
    try {
      const users = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      const requests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');

      // Push users
      for (const u of Object.values(users)) {
        await cloudSync.syncUser(u);
      }

      // Push requests
      for (const r of requests) {
        await cloudSync.syncRequest(r);
      }
    } catch (err) {
      console.warn('Full push warning:', err);
    } finally {
      isPushing = false;
    }
  },

  init: () => {
    // Initial pull
    cloudSync.pullFromCloud();

    if (broadcast) {
      broadcast.onmessage = (event) => {
        if (event.data && event.data.type === 'DATA_SYNC') {
          syncListeners.forEach(cb => {
            try { cb(); } catch (e) { console.error('Broadcast listener error:', e); }
          });
        }
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => cloudSync.pullFromCloud());
      window.addEventListener('storage', () => cloudSync.notifyListeners());
    }

    // Auto-poll cloud database every 4 seconds for live admin & donor updates
    setInterval(() => {
      cloudSync.pullFromCloud();
    }, 4000);
  }
};
