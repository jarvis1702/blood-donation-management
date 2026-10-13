/**
 * Live Multi-Device Cloud Sync Service for KCT LifeFlow
 * Backed by Firebase Firestore REST API (project: blood-donation-app-ff480)
 * Synchronizes Users, Blood Requests, Camps, Registrations, and Donation Records across all devices.
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
        if ('integerValue' in v) return parseInt(v.integerValue, 10);
        if ('doubleValue' in v) return parseFloat(v.doubleValue);
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
            if (typeof item === 'number') {
              return Number.isInteger(item) ? { integerValue: item.toString() } : { doubleValue: item };
            }
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
   * Pulls all collections from Firestore: users, requests, camps, registrations, donations
   */
  pullFromCloud: async () => {
    if (isPulling) return;
    isPulling = true;
    try {
      let stateChanged = false;

      // 1. Fetch Firestore Users
      try {
        const usersRes = await fetch(`${FIRESTORE_BASE}/users?pageSize=300`);
        if (usersRes.ok) {
          const data = await usersRes.json();
          if (data.documents && Array.isArray(data.documents)) {
            const cloudUsers = data.documents.map(d => decodeFirestoreFields(d.fields));
            let localUsers = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');

            cloudUsers.forEach(u => {
              if (u.email) {
                const emailKey = u.email.toLowerCase().trim();
                const existing = localUsers[emailKey];
                if (!existing) {
                  localUsers[emailKey] = u;
                  stateChanged = true;
                } else {
                  const cloudTime = new Date(u.updatedAt || 0).getTime();
                  const localTime = new Date(existing.updatedAt || 0).getTime();
                  if (cloudTime > localTime) {
                    localUsers[emailKey] = { ...existing, ...u };
                    stateChanged = true;
                  }
                }
              }
            });

            if (stateChanged) {
              localStorage.setItem('blood_donation_users_db', JSON.stringify(localUsers));
            }
          }
        }
      } catch (err) {
        console.warn('Sync users error:', err);
      }

      // 2. Fetch Firestore Requests
      try {
        const reqsRes = await fetch(`${FIRESTORE_BASE}/requests?pageSize=300`);
        if (reqsRes.ok) {
          const data = await reqsRes.json();
          if (data.documents && Array.isArray(data.documents)) {
            const cloudRequests = data.documents.map(d => decodeFirestoreFields(d.fields));
            let localRequests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');
            const localReqMap = new Map();
            localRequests.forEach(r => localReqMap.set(r.id, r));

            cloudRequests.forEach(r => {
              if (r.id) {
                const existing = localReqMap.get(r.id);
                if (!existing) {
                  localReqMap.set(r.id, r);
                  stateChanged = true;
                } else {
                  const cloudTime = new Date(r.updatedAt || 0).getTime();
                  const localTime = new Date(existing.updatedAt || 0).getTime();
                  if (cloudTime > localTime) {
                    localReqMap.set(r.id, { ...existing, ...r });
                    stateChanged = true;
                  }
                }
              }
            });

            if (stateChanged) {
              const sorted = Array.from(localReqMap.values()).sort((a, b) => {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
              });
              localStorage.setItem('blood_requests_db', JSON.stringify(sorted));
            }
          }
        }
      } catch (err) {
        console.warn('Sync requests error:', err);
      }

      // 3. Fetch Firestore Camps (SCRUM-20, SCRUM-21, SCRUM-22)
      try {
        const campsRes = await fetch(`${FIRESTORE_BASE}/camps?pageSize=300`);
        if (campsRes.ok) {
          const data = await campsRes.json();
          if (data.documents && Array.isArray(data.documents)) {
            const cloudCamps = data.documents.map(d => decodeFirestoreFields(d.fields));
            let localCamps = JSON.parse(localStorage.getItem('kct_blood_camps_db') || '[]');
            const campMap = new Map();
            localCamps.forEach(c => campMap.set(c.id, c));

            cloudCamps.forEach(c => {
              if (c.id) {
                const existing = campMap.get(c.id);
                if (!existing) {
                  campMap.set(c.id, c);
                  stateChanged = true;
                } else {
                  const cloudTime = new Date(c.updatedAt || 0).getTime();
                  const localTime = new Date(existing.updatedAt || 0).getTime();
                  if (cloudTime > localTime) {
                    campMap.set(c.id, { ...existing, ...c });
                    stateChanged = true;
                  }
                }
              }
            });

            if (stateChanged) {
              const sortedCamps = Array.from(campMap.values()).sort((a, b) => {
                return new Date(b.date || 0) - new Date(a.date || 0);
              });
              localStorage.setItem('kct_blood_camps_db', JSON.stringify(sortedCamps));
            }
          }
        }
      } catch (err) {
        console.warn('Sync camps error:', err);
      }

      // 4. Fetch Firestore Registrations (Camp Bookings & Volunteers)
      try {
        const regsRes = await fetch(`${FIRESTORE_BASE}/registrations?pageSize=300`);
        if (regsRes.ok) {
          const data = await regsRes.json();
          if (data.documents && Array.isArray(data.documents)) {
            const cloudRegs = data.documents.map(d => decodeFirestoreFields(d.fields));
            let localRegs = JSON.parse(localStorage.getItem('kct_camp_registrations_db') || '[]');
            const regMap = new Map();
            localRegs.forEach(r => regMap.set(r.id, r));

            cloudRegs.forEach(r => {
              if (r.id) {
                const existing = regMap.get(r.id);
                if (!existing) {
                  regMap.set(r.id, r);
                  stateChanged = true;
                } else {
                  const cloudTime = new Date(r.updatedAt || 0).getTime();
                  const localTime = new Date(existing.updatedAt || 0).getTime();
                  if (cloudTime > localTime) {
                    regMap.set(r.id, { ...existing, ...r });
                    stateChanged = true;
                  }
                }
              }
            });

            if (stateChanged) {
              localStorage.setItem('kct_camp_registrations_db', JSON.stringify(Array.from(regMap.values())));
            }
          }
        }
      } catch (err) {
        console.warn('Sync registrations error:', err);
      }

      // 5. Fetch Firestore Donations (SCRUM-23)
      try {
        const donRes = await fetch(`${FIRESTORE_BASE}/donations?pageSize=300`);
        if (donRes.ok) {
          const data = await donRes.json();
          if (data.documents && Array.isArray(data.documents)) {
            const cloudDons = data.documents.map(d => decodeFirestoreFields(d.fields));
            let localDons = JSON.parse(localStorage.getItem('kct_donation_history_db') || '[]');
            const donMap = new Map();
            localDons.forEach(d => donMap.set(d.id, d));

            cloudDons.forEach(d => {
              if (d.id) {
                const existing = donMap.get(d.id);
                if (!existing) {
                  donMap.set(d.id, d);
                  stateChanged = true;
                }
              }
            });

            if (stateChanged) {
              const sortedDons = Array.from(donMap.values()).sort((a, b) => {
                return new Date(b.donationDate || 0) - new Date(a.donationDate || 0);
              });
              localStorage.setItem('kct_donation_history_db', JSON.stringify(sortedDons));
            }
          }
        }
      } catch (err) {
        console.warn('Sync donations error:', err);
      }

      if (stateChanged) {
        cloudSync.notifyListeners();
      }
    } catch (err) {
      console.warn('Firestore general sync pull warning:', err);
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
        updatedAt: new Date().toISOString()
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
        updatedAt: new Date().toISOString()
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
   * Syncs a blood camp to Firestore (SCRUM-20, SCRUM-22)
   */
  syncCamp: async (campData) => {
    if (!campData || !campData.id) return;
    try {
      const payload = {
        ...campData,
        updatedAt: new Date().toISOString()
      };

      await fetch(`${FIRESTORE_BASE}/camps/${encodeURIComponent(campData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: encodeFirestoreFields(payload) })
      });

      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Firestore camp sync error:', err);
    }
  },

  /**
   * Syncs a camp registration / booking to Firestore (SCRUM-21)
   */
  syncRegistration: async (regData) => {
    if (!regData || !regData.id) return;
    try {
      const payload = {
        ...regData,
        updatedAt: new Date().toISOString()
      };

      await fetch(`${FIRESTORE_BASE}/registrations/${encodeURIComponent(regData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: encodeFirestoreFields(payload) })
      });

      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Firestore registration sync error:', err);
    }
  },

  /**
   * Deletes a camp registration from Firestore upon cancellation
   */
  deleteRegistration: async (regId) => {
    if (!regId) return;
    try {
      await fetch(`${FIRESTORE_BASE}/registrations/${encodeURIComponent(regId)}`, {
        method: 'DELETE'
      });
      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Firestore delete registration error:', err);
    }
  },

  /**
   * Syncs a donation history record to Firestore (SCRUM-23)
   */
  syncDonation: async (donData) => {
    if (!donData || !donData.id) return;
    try {
      const payload = {
        ...donData,
        updatedAt: new Date().toISOString()
      };

      await fetch(`${FIRESTORE_BASE}/donations/${encodeURIComponent(donData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: encodeFirestoreFields(payload) })
      });

      cloudSync.pullFromCloud();
    } catch (err) {
      console.warn('Firestore donation sync error:', err);
    }
  },

  /**
   * Pushes all local databases to Firestore to ensure complete multi-device baseline
   */
  pushToCloud: async () => {
    if (isPushing) return;
    isPushing = true;
    try {
      const users = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      const requests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');
      const camps = JSON.parse(localStorage.getItem('kct_blood_camps_db') || '[]');
      const registrations = JSON.parse(localStorage.getItem('kct_camp_registrations_db') || '[]');
      const donations = JSON.parse(localStorage.getItem('kct_donation_history_db') || '[]');

      for (const u of Object.values(users)) {
        await cloudSync.syncUser(u);
      }
      for (const r of requests) {
        await cloudSync.syncRequest(r);
      }
      for (const c of camps) {
        await cloudSync.syncCamp(c);
      }
      for (const reg of registrations) {
        await cloudSync.syncRegistration(reg);
      }
      for (const don of donations) {
        await cloudSync.syncDonation(don);
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

    // Check if initial camps need to be pushed to Firestore
    setTimeout(async () => {
      try {
        const res = await fetch(`${FIRESTORE_BASE}/camps?pageSize=5`);
        if (res.ok) {
          const data = await res.json();
          if (!data.documents || data.documents.length === 0) {
            // Firestore camps empty, seed with initial camps
            const localCamps = JSON.parse(localStorage.getItem('kct_blood_camps_db') || '[]');
            for (const c of localCamps) {
              await cloudSync.syncCamp(c);
            }
          }
        }
      } catch (e) {
        console.warn('Camp seed check warning:', e);
      }
    }, 1500);

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

    // Auto-poll Firestore every 3 seconds when tab is active for instant real-time multi-device sync
    setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      cloudSync.pullFromCloud();
    }, 3000);
  }
};
