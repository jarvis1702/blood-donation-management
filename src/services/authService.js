/**
 * Mock Authentication Service using Web Crypto API and LocalStorage
 */

// Helper to hash password using SHA-256
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Helper to get users database from localStorage
function getUsersDB() {
  const users = localStorage.getItem('blood_donation_users_db');
  const db = users ? JSON.parse(users) : {};
  
  // Seed mock donors if they don't exist
  const mockDonors = {
    'suresh@kct.ac.in': {
      name: 'Suresh Kumar',
      email: 'suresh@kct.ac.in',
      passwordHash: '008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601',
      bloodGroup: 'O+',
      availability: 'Available',
      eligibility: 'Eligible',
      createdAt: new Date().toISOString()
    },
    'ramesh@kct.ac.in': {
      name: 'Ramesh Raja',
      email: 'ramesh@kct.ac.in',
      passwordHash: '008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601',
      bloodGroup: 'A+',
      availability: 'Available',
      eligibility: 'Eligible',
      createdAt: new Date().toISOString()
    },
    'dinesh@kct.ac.in': {
      name: 'Dinesh Karthik',
      email: 'dinesh@kct.ac.in',
      passwordHash: '008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601',
      bloodGroup: 'O+',
      availability: 'Unavailable',
      eligibility: 'Eligible',
      createdAt: new Date().toISOString()
    },
    'priya@kct.ac.in': {
      name: 'Priya Sharma',
      email: 'priya@kct.ac.in',
      passwordHash: '008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601',
      bloodGroup: 'O+',
      availability: 'Available',
      eligibility: 'Ineligible',
      role: 'Student',
      createdAt: new Date().toISOString()
    },
    'admin@kct.ac.in': {
      name: 'KCT System Administrator',
      email: 'admin@kct.ac.in',
      passwordHash: '008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601',
      bloodGroup: 'O+',
      availability: 'Available',
      eligibility: 'Eligible',
      role: 'Admin',
      department: 'KCT Admin Cell',
      isDonor: true,
      createdAt: new Date().toISOString()
    },
    'club@kct.ac.in': {
      name: 'Youth Red Cross Club Admin',
      email: 'club@kct.ac.in',
      passwordHash: '008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601',
      bloodGroup: 'AB+',
      availability: 'Available',
      eligibility: 'Eligible',
      role: 'Club Member',
      department: 'YRC Blood Club',
      isDonor: true,
      createdAt: new Date().toISOString()
    }
  };

  let updated = false;
  for (const [email, data] of Object.entries(mockDonors)) {
    if (!db[email] || !db[email].bloodGroup) {
      db[email] = data;
      updated = true;
    }
  }

  if (updated) {
    localStorage.setItem('blood_donation_users_db', JSON.stringify(db));
  }
  
  return db;
}

import { cloudSync } from './cloudSync';

// Helper to save users database to localStorage and sync to cloud
function saveUsersDB(db) {
  localStorage.setItem('blood_donation_users_db', JSON.stringify(db));
  cloudSync.pushToCloud();
}

// Simulates API network delay (e.g. 1 second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  /**
   * Registers a new student/staff user
   * @param {string} name 
   * @param {string} email 
   * @param {string} password 
   */
  register: async (name, email, password) => {
    await delay(1000); // Simulate API latency
    
    // Backend validation (Security best practice)
    if (!name || !name.trim()) {
      throw new Error('Registration failed: Full Name is required.');
    }
    
    if (!email || !email.toLowerCase().endsWith('@kct.ac.in')) {
      throw new Error('Registration failed: Only @kct.ac.in emails are allowed.');
    }
    
    if (!password || password.length < 8) {
      throw new Error('Registration failed: Password must be at least 8 characters.');
    }

    const emailKey = email.toLowerCase().trim();
    const db = getUsersDB();
    
    // Prevent duplicate registration
    if (db[emailKey]) {
      throw new Error('Registration failed: An account with this email already exists.');
    }
    
    // Secure password hashing
    const passwordHash = await hashPassword(password);
    
    // Store user securely
    db[emailKey] = {
      name: name.trim(),
      email: emailKey,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    
    saveUsersDB(db);
    
    return {
      success: true,
      message: 'Account registered successfully.'
    };
  },

  /**
   * Logins an existing user
   * @param {string} email 
   * @param {string} password 
   */
  login: async (email, password) => {
    await delay(1000); // Simulate API latency
    
    if (!email || !password) {
      throw new Error('Login failed: Email and password are required.');
    }

    const emailKey = email.toLowerCase().trim();
    const db = getUsersDB();
    const user = db[emailKey];
    
    if (!user) {
      throw new Error('Login failed: Invalid email or password.');
    }
    
    // Secure verification of hashed password
    const loginPasswordHash = await hashPassword(password);
    if (user.passwordHash !== loginPasswordHash) {
      throw new Error('Login failed: Invalid email or password.');
    }
    
    // Generate a mock JWT token and store session
    const mockToken = `mock-jwt-session-${btoa(emailKey)}-${Date.now()}`;
    localStorage.setItem('blood_donation_session_token', mockToken);
    localStorage.setItem('blood_donation_session_user', JSON.stringify({
      name: user.name,
      email: user.email
    }));
    
    return {
      success: true,
      token: mockToken,
      user: {
        name: user.name,
        email: user.email
      }
    };
  },

  /**
   * Logs out the current user
   */
  logout: async () => {
    await delay(500); // Simulate logout delay
    localStorage.removeItem('blood_donation_session_token');
    localStorage.removeItem('blood_donation_session_user');
    return { success: true };
  },

  /**
   * Gets currently authenticated user
   */
  getCurrentUser: () => {
    const user = localStorage.getItem('blood_donation_session_user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Checks if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('blood_donation_session_token');
  },

  /**
   * Gets full profile details of a user by email
   */
  getUserProfile: (email) => {
    if (!email) return null;
    const emailKey = email.toLowerCase().trim();
    const db = getUsersDB();
    return db[emailKey] || null;
  },

  /**
   * Gets full profile of the currently logged-in user
   */
  getCurrentUserProfile: () => {
    const sessionUser = authService.getCurrentUser();
    if (!sessionUser || !sessionUser.email) return null;
    return authService.getUserProfile(sessionUser.email);
  },

  /**
   * Updates user profile (US-03)
   */
  updateProfile: async (email, profileData) => {
    await delay(600);
    if (!email) throw new Error('User email is required.');
    
    const emailKey = email.toLowerCase().trim();
    const db = getUsersDB();
    const user = db[emailKey];
    
    if (!user) throw new Error('User account not found.');

    db[emailKey] = {
      ...user,
      name: profileData.name ? profileData.name.trim() : user.name,
      phone: profileData.phone ? profileData.phone.trim() : (user.phone || ''),
      department: profileData.department ? profileData.department.trim() : (user.department || ''),
      gender: profileData.gender || user.gender || '',
      role: profileData.role || user.role || 'Student'
    };

    saveUsersDB(db);

    // Update active session user name if updated
    localStorage.setItem('blood_donation_session_user', JSON.stringify({
      name: db[emailKey].name,
      email: db[emailKey].email
    }));

    return {
      success: true,
      user: db[emailKey],
      message: 'Profile updated successfully.'
    };
  },

  /**
   * Registers a user as a blood donor (US-04)
   */
  registerAsDonor: async (email, donorData) => {
    await delay(700);
    if (!email) throw new Error('User email is required.');
    if (!donorData.bloodGroup) throw new Error('Blood group is required.');
    
    const emailKey = email.toLowerCase().trim();
    const db = getUsersDB();
    const user = db[emailKey];

    if (!user) throw new Error('User account not found.');

    // Calculate 90-day eligibility cooldown automatically
    let eligibility = 'Eligible';
    if (donorData.lastDonationDate) {
      const lastDonated = new Date(donorData.lastDonationDate);
      const now = new Date();
      const diffTime = Math.abs(now - lastDonated);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 90) {
        eligibility = 'Ineligible';
      }
    }

    db[emailKey] = {
      ...user,
      isDonor: true,
      bloodGroup: donorData.bloodGroup,
      weight: donorData.weight || '',
      lastDonationDate: donorData.lastDonationDate || '',
      availability: user.availability || 'Available',
      eligibility: eligibility
    };

    saveUsersDB(db);

    return {
      success: true,
      user: db[emailKey],
      message: 'Successfully registered as a KCT Blood Donor!'
    };
  },

  /**
   * Toggles donor availability status between Available and Unavailable (US-05)
   */
  toggleAvailability: async (email, newStatus) => {
    await delay(300);
    if (!email) throw new Error('User email is required.');
    
    const emailKey = email.toLowerCase().trim();
    const db = getUsersDB();
    const user = db[emailKey];

    if (!user) throw new Error('User account not found.');

    const status = newStatus || (user.availability === 'Available' ? 'Unavailable' : 'Available');

    db[emailKey] = {
      ...user,
      availability: status
    };

    saveUsersDB(db);

    return {
      success: true,
      availability: status,
      user: db[emailKey],
      message: `Availability status updated to ${status}.`
    };
  }
};
