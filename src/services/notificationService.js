/**
 * KCT LifeFlow - Notification Service (SCRUM-19)
 * Handles real-time in-app alerts, emergency broadcast notices, and camp announcements.
 */

const NOTIFICATIONS_STORAGE_KEY = 'kct_lifeflow_notifications';

// Initial pre-seeded campus notifications
const defaultNotifications = [
  {
    id: 'NOTIF-101',
    title: '🚨 Emergency Blood Demand Alert',
    message: 'Urgent O+ Blood required for a patient at Sri Ramakrishna Hospital (High Urgency, 2 Units).',
    type: 'emergency',
    link: '/requests',
    read: false,
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() // 25 mins ago
  },
  {
    id: 'NOTIF-102',
    title: '🩸 KCT Annual Mega Blood Drive',
    message: 'Youth Red Cross (YRC) has scheduled the Annual Blood Donation Drive on Oct 14 at Ramanandha Adigalar Auditorium.',
    type: 'camp',
    link: '/camps',
    read: false,
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString() // 3 hours ago
  },
  {
    id: 'NOTIF-103',
    title: '🛡️ YRC Club Volunteer Slots Open',
    message: 'Student volunteers can now register for duty slots in the upcoming campus emergency drive.',
    type: 'club',
    link: '/camps',
    read: false,
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() // 1 day ago
  },
  {
    id: 'NOTIF-104',
    title: '💚 Donor Availability Confirmed',
    message: 'Your donor profile is active in the KCT campus registry. Keep your status updated.',
    type: 'info',
    link: '/profile',
    read: true,
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString() // 2 days ago
  }
];

function getNotificationsFromStorage() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(defaultNotifications));
      return defaultNotifications;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading notifications:', e);
    return defaultNotifications;
  }
}

function saveNotificationsToStorage(notifications) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    notifySubscribers();
  } catch (e) {
    console.error('Error saving notifications:', e);
  }
}

let subscribers = [];
function notifySubscribers() {
  subscribers.forEach(cb => {
    try { cb(); } catch (err) { console.error('Notification subscriber error:', err); }
  });
}

export const notificationService = {
  getNotifications: () => {
    return getNotificationsFromStorage();
  },

  getUnreadCount: () => {
    const list = getNotificationsFromStorage();
    return list.filter(n => !n.read).length;
  },

  markAsRead: (id) => {
    const list = getNotificationsFromStorage();
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotificationsToStorage(updated);
    return updated;
  },

  markAllAsRead: () => {
    const list = getNotificationsFromStorage();
    const updated = list.map(n => ({ ...n, read: true }));
    saveNotificationsToStorage(updated);
    return updated;
  },

  addNotification: ({ title, message, type = 'info', link = '/dashboard' }) => {
    const list = getNotificationsFromStorage();
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      title,
      message,
      type,
      link,
      read: false,
      timestamp: new Date().toISOString()
    };
    list.unshift(newNotif);
    saveNotificationsToStorage(list);
    return newNotif;
  },

  clearAll: () => {
    saveNotificationsToStorage([]);
  },

  subscribe: (callback) => {
    subscribers.push(callback);
    return () => {
      subscribers = subscribers.filter(cb => cb !== callback);
    };
  }
};
