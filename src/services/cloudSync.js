/**
 * Live Multi-Device Cloud Sync Service for KCT LifeFlow
 * Backed by Firebase Firestore REST API (project: blood-donation-app-ff480)
 * Works universally across all browsers, mobile devices, and environments with 0 npm build dependencies.
 */

const PROJECT_ID = 'blood-donation-app-ff480';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function decodeFirestoreFields(fields) {
  if (!fields) return {};
  const obj = {};
  for (const [key, val] of Object.entries(fields)) {
    if ('stringValue' in val) {
      obj[key] = val.stringValue;
    } else if ('booleanValue' in val) {
      obj[key] = val.booleanValue;
    } else if ('integerValue' in val) {
      obj[key] = parseInt(val.integerValue, 10);
    } else if ('doubleValue' in val) {
      obj[key] = parseFloat(val.doubleValue);
    } else if ('arrayValue' in val) {
      obj[key] = (val.arrayValue.values || []).map(v => {
        if ('mapValue' in v) return decodeFirestoreFields(v.mapValue.fields);
        if ('stringValue' in v) return v.stringValue;
        if ('booleanValue' in v) return v.booleanValue;
        return v;
      });
    } else if ('mapValue' in val) {
      obj[key] = decodeFirestoreFields(val.mapValue.fields);
    }
  }
  return obj;
}

function encodeFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(item => {
            if (typeof item === 'object' && item !== null) {
              return { mapValue: { fields: encodeFirestoreFields(item) } };
            }
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: encodeFirestoreFields(val) } };
    }
  }
  return fields;
}

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
   * Pulls all users and requests directly from Google Cloud Firestore
   */
  pullFromCloud: async () => {
    if (isPulling) return;
    isPulling = true;
    try {
      // 1. Fetch Firestore Users
      const usersRes = await fetch(`${FIRESTORE_BASE}/users?pageSize=300`);
      let cloudUsers = [];
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.documents && Array.isArray(data.documents)) {
          cloudUsers = data.documents.map(d => decodeFirestoreFields(d.fields));
        }
      }

      // 2. Fetch Firestore Requests
      const reqsRes = await fetch(`${FIRESTORE_BASE}/requests?pageSize=300`);
      let cloudRequests = [];
      if (reqsRes.ok) {
        const data = await reqsRes.json();
        if (data.documents && Array.isArray(data.documents)) {
          cloudRequests = data.documents.map(d => decodeFirestoreFields(d.fields));
        }
      }

      // 3. Merge Users into LocalStorage
      let localUsers = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      let usersChanged = false;

      cloudUsers.forEach(u => {
        if (u.email) {
          const emailKey = u.email.toLowerCase().trim();
          const existing = localUsers[emailKey];
          if (!existing) {
            localUsers[emailKey] = u;
            usersChanged = true;
          } else {
            const cloudTime = new Date(u.updatedAt || 0).getTime();
            const localTime = new Date(existing.updatedAt || 0).getTime();
            if (cloudTime > localTime) {
              localUsers[emailKey] = { ...existing, ...u };
              usersChanged = true;
            } else if (cloudTime === localTime) {
              const merged = { ...existing, ...u };
              if (JSON.stringify(existing) !== JSON.stringify(merged)) {
                localUsers[emailKey] = merged;
                usersChanged = true;
              }
            }
          }
        }
      });

      // 4. Merge Requests into LocalStorage
      let localRequests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');
      const localReqMap = new Map();
      localRequests.forEach(r => localReqMap.set(r.id, r));
      let requestsChanged = false;

      cloudRequests.forEach(r => {
        if (r.id) {
          const existing = localReqMap.get(r.id);
          if (!existing) {
            localReqMap.set(r.id, r);
            requestsChanged = true;
          } else {
            const cloudTime = new Date(r.updatedAt || 0).getTime();
            const localTime = new Date(existing.updatedAt || 0).getTime();
            if (cloudTime > localTime) {
              localReqMap.set(r.id, { ...existing, ...r });
              requestsChanged = true;
            } else if (cloudTime === localTime) {
              const merged = { ...existing, ...r };
              if (JSON.stringify(existing) !== JSON.stringify(merged)) {
                localReqMap.set(r.id, merged);
                requestsChanged = true;
              }
            }
          }
        }
      });

      if (usersChanged) {
        localStorage.setItem('blood_donation_users_db', JSON.stringify(localUsers));
      }

      if (requestsChanged) {
        const sorted = Array.from(localReqMap.values()).sort((a, b) => {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        localStorage.setItem('blood_requests_db', JSON.stringify(sorted));
      }

      if (usersChanged || requestsChanged) {
        cloudSync.notifyListeners();
      }
    } catch (err) {
      console.warn('Firestore sync pull warning:', err);
    } finally {
      isPulling = false;
    }
  },

  /**
   * Syncs a specific user to Firestore
   */
  syncUser: async (userData) => {
    if (!userData || !userData.email) return;
    try {
      const emailKey = userData.email.toLowerCase().trim();
      const payload = {
        ...userData,
        email: emailKey,
        updatedAt: userData.updatedAt || new Date().toISOString()
      };

      await fetch(`${FIRESTORE_BASE}/users/${encodeURIComponent(emailKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: encodeFirestoreFields(payload) })
      });

      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Firestore user sync error:', err);
    }
  },

  /**
   * Syncs a blood request to Firestore
   */
  syncRequest: async (requestData) => {
    if (!requestData || !requestData.id) return;
    try {
      const payload = {
        ...requestData,
        updatedAt: requestData.updatedAt || new Date().toISOString()
      };

      await fetch(`${FIRESTORE_BASE}/requests/${encodeURIComponent(requestData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: encodeFirestoreFields(payload) })
      });

      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Firestore request sync error:', err);
    }
  },

  /**
   * Seeds/Pushes all local users and requests to Firestore
   */
  pushToCloud: async () => {
    if (isPushing) return;
    isPushing = true;
    try {
      const users = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      const requests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');

      for (const u of Object.values(users)) {
        await cloudSync.syncUser(u);
      }
      for (const r of requests) {
        await cloudSync.syncRequest(r);
      }
    } catch (err) {
      console.warn('Firestore push warning:', err);
    } finally {
      isPushing = false;
    }
  },

  init: () => {
    // Initial fetch from Firestore
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
      window.addEventListener('visibilitychange', () => {
        if (!document.hidden) cloudSync.pullFromCloud();
      });
      window.addEventListener('storage', () => cloudSync.notifyListeners());
    }

    // Auto-poll Firestore every 4 seconds when tab is active for instant real-time multi-device sync
    setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      cloudSync.pullFromCloud();
    }, 4000);
  }
};
