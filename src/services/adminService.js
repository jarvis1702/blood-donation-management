/**
 * KCT LifeFlow - Institutional Administration & Governance Service (SCRUM-25)
 * Handles user role elevation, account suspension/activation, donor verification, 
 * and tamper-evident audit logging for institutional governance.
 */

import { cloudSync } from './cloudSync';

const AUDIT_STORAGE_KEY = 'kct_system_audit_logs_db';

const defaultAuditLogs = [
  {
    id: 'LOG-1001',
    timestamp: '2026-10-13T10:15:22.000Z',
    category: 'AUTH',
    event: 'Administrator Session Initialized',
    performedBy: 'admin@kct.ac.in',
    target: 'System',
    status: 'SUCCESS',
    ip: '172.16.24.102 (Campus LAN)'
  },
  {
    id: 'LOG-1002',
    timestamp: '2026-10-13T09:40:11.000Z',
    category: 'DONOR',
    event: 'Donor Medical Verification Cleared',
    performedBy: 'club@kct.ac.in',
    target: 'suresh@kct.ac.in',
    status: 'VERIFIED',
    ip: '172.16.24.115'
  },
  {
    id: 'LOG-1003',
    timestamp: '2026-10-12T16:22:45.000Z',
    category: 'SECURITY',
    event: 'Role Elevation to Club Member',
    performedBy: 'admin@kct.ac.in',
    target: 'ramesh@kct.ac.in',
    status: 'UPDATED',
    ip: '172.16.24.102'
  },
  {
    id: 'LOG-1004',
    timestamp: '2026-10-12T14:05:00.000Z',
    category: 'CAMP',
    event: 'Campus Mega Drive 2026 Scheduled',
    performedBy: 'club@kct.ac.in',
    target: 'CAMP-2026-01',
    status: 'CREATED',
    ip: '172.16.24.115'
  },
  {
    id: 'LOG-1005',
    timestamp: '2026-10-11T11:12:30.000Z',
    category: 'REQUEST',
    event: 'Emergency Blood Request REQ-101 Broadcast',
    performedBy: 'suresh@kct.ac.in',
    target: 'CMCH Hospital',
    status: 'BROADCAST',
    ip: '172.16.32.44'
  }
];

function getAuditLogsDB() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(defaultAuditLogs));
      return defaultAuditLogs;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error fetching audit DB:', e);
    return defaultAuditLogs;
  }
}

function saveAuditLogsDB(logs) {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving audit DB:', e);
  }
}

export const adminService = {
  /**
   * Retrieves all registered user accounts
   */
  getAllUsers: () => {
    try {
      const raw = localStorage.getItem('blood_donation_users_db');
      const db = raw ? JSON.parse(raw) : {};
      return Object.values(db).map(u => ({
        ...u,
        status: u.status || 'Active',
        role: u.role || 'Student',
        isVerifiedDonor: u.isVerifiedDonor !== undefined ? u.isVerifiedDonor : true
      }));
    } catch (e) {
      console.error('Error fetching all users:', e);
      return [];
    }
  },

  /**
   * Updates a user's organizational role
   */
  updateUserRole: async (email, newRole, adminEmail) => {
    if (!email) throw new Error('User email is required.');
    const emailKey = email.toLowerCase().trim();
    const db = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
    
    if (!db[emailKey]) throw new Error('User account not found.');

    const oldRole = db[emailKey].role || 'Student';
    db[emailKey].role = newRole;
    localStorage.setItem('blood_donation_users_db', JSON.stringify(db));

    // Sync to cloud
    try {
      cloudSync.syncUser(db[emailKey]);
    } catch (e) {
      console.warn('Cloud sync error on role change:', e);
    }

    // Append Audit Event
    adminService.logEvent({
      category: 'SECURITY',
      event: `User Role Changed: ${oldRole} -> ${newRole}`,
      performedBy: adminEmail || 'admin@kct.ac.in',
      target: emailKey,
      status: 'UPDATED'
    });

    return { success: true, user: db[emailKey] };
  },

  /**
   * Toggles an account between Active and Suspended
   */
  toggleAccountStatus: async (email, adminEmail) => {
    if (!email) throw new Error('User email is required.');
    const emailKey = email.toLowerCase().trim();
    const db = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
    
    if (!db[emailKey]) throw new Error('User account not found.');

    const currentStatus = db[emailKey].status || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    
    db[emailKey].status = newStatus;
    localStorage.setItem('blood_donation_users_db', JSON.stringify(db));

    // Sync to cloud
    try {
      cloudSync.syncUser(db[emailKey]);
    } catch (e) {
      console.warn('Cloud sync error on status toggle:', e);
    }

    // Append Audit Event
    adminService.logEvent({
      category: 'ADMIN',
      event: `Account Status Toggled to ${newStatus}`,
      performedBy: adminEmail || 'admin@kct.ac.in',
      target: emailKey,
      status: newStatus.toUpperCase()
    });

    return { success: true, status: newStatus, user: db[emailKey] };
  },

  /**
   * Toggles verified donor badge
   */
  toggleDonorVerification: async (email, adminEmail) => {
    if (!email) throw new Error('User email is required.');
    const emailKey = email.toLowerCase().trim();
    const db = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
    
    if (!db[emailKey]) throw new Error('User account not found.');

    const currentVerified = db[emailKey].isVerifiedDonor !== undefined ? db[emailKey].isVerifiedDonor : true;
    const newVerified = !currentVerified;
    
    db[emailKey].isVerifiedDonor = newVerified;
    localStorage.setItem('blood_donation_users_db', JSON.stringify(db));

    try {
      cloudSync.syncUser(db[emailKey]);
    } catch (e) {
      console.warn('Cloud sync error on verification toggle:', e);
    }

    adminService.logEvent({
      category: 'DONOR',
      event: newVerified ? 'Donor Credential Verified' : 'Donor Credential Revoked',
      performedBy: adminEmail || 'admin@kct.ac.in',
      target: emailKey,
      status: newVerified ? 'VERIFIED' : 'UNVERIFIED'
    });

    return { success: true, isVerifiedDonor: newVerified };
  },

  /**
   * Retrieves system audit logs
   */
  getAuditLogs: (category = 'ALL') => {
    const logs = getAuditLogsDB();
    if (category === 'ALL') return logs;
    return logs.filter(l => l.category === category);
  },

  /**
   * Logs a new administrative/system event
   */
  logEvent: (eventData) => {
    const logs = getAuditLogsDB();
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      category: eventData.category || 'SYSTEM',
      event: eventData.event,
      performedBy: eventData.performedBy || 'System',
      target: eventData.target || 'General',
      status: eventData.status || 'INFO',
      ip: eventData.ip || '172.16.24.102 (Campus LAN)'
    };
    logs.unshift(newLog);
    if (logs.length > 100) logs.pop(); // Keep last 100
    saveAuditLogsDB(logs);
    return newLog;
  }
};
