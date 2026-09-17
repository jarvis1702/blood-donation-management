import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';

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
  },

  syncUser: async (userData) => {
    if (!userData || !userData.email) return;
    try {
      const emailKey = userData.email.toLowerCase().trim();
      const payload = {
        ...userData,
        email: emailKey,
        updatedAt: userData.updatedAt || new Date().toISOString()
      };
      await setDoc(doc(db, "users", emailKey), payload);
    } catch (err) {
      console.error('Firebase user sync error:', err);
    }
  },

  syncRequest: async (requestData) => {
    if (!requestData || !requestData.id) return;
    try {
      const payload = {
        ...requestData,
        updatedAt: requestData.updatedAt || new Date().toISOString()
      };
      await setDoc(doc(db, "requests", requestData.id), payload);
    } catch (err) {
      console.error('Firebase request sync error:', err);
    }
  },

  pushToCloud: async () => {
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
      console.error('Full push error:', err);
    }
  },

  init: async () => {
    // Check if cloud is empty, if so, seed it with our local mock data
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      if (usersSnap.empty) {
        console.log("Firebase is empty, seeding with local data...");
        await cloudSync.pushToCloud();
      }
    } catch (e) {
      console.error("Error checking firebase: ", e);
    }

    // Listen to users collection for realtime updates
    onSnapshot(collection(db, "users"), (snapshot) => {
      let localUsers = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      let updated = false;
      
      snapshot.forEach(doc => {
        const u = doc.data();
        const emailKey = u.email.toLowerCase().trim();
        localUsers[emailKey] = { ...localUsers[emailKey], ...u };
        updated = true;
      });
      
      if (updated) {
        localStorage.setItem('blood_donation_users_db', JSON.stringify(localUsers));
        cloudSync.notifyListeners();
      }
    });

    // Listen to requests collection for realtime updates
    onSnapshot(collection(db, "requests"), (snapshot) => {
      let localRequests = JSON.parse(localStorage.getItem('blood_requests_db') || '[]');
      const localReqMap = new Map();
      localRequests.forEach(r => localReqMap.set(r.id, r));
      let updated = false;

      snapshot.forEach(doc => {
        const r = doc.data();
        localReqMap.set(r.id, { ...localReqMap.get(r.id), ...r });
        updated = true;
      });

      if (updated) {
        // Sort by date descending
        const sorted = Array.from(localReqMap.values()).sort((a,b) => {
           return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        localStorage.setItem('blood_requests_db', JSON.stringify(sorted));
        cloudSync.notifyListeners();
      }
    });
  }
};
