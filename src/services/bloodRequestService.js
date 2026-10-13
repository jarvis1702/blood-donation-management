/**
 * Blood Request Service managing emergency requests and smart donor matching.
 */

// Helper to get requests from localStorage
function getRequestsDB() {
  const requests = localStorage.getItem('blood_requests_db');
  return requests ? JSON.parse(requests) : [];
}

import { cloudSync } from './cloudSync';
import { checkBloodCompatibility, validateBloodRequestUnits } from '../utils/validation';

// Helper to save requests to localStorage and push to cloud
function saveRequestsDB(db) {
  localStorage.setItem('blood_requests_db', JSON.stringify(db));
  cloudSync.notifyListeners();
}

// Helper to get users database (donors)
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

// Simulates API network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const bloodRequestService = {
  /**
   * Creates an emergency blood request
   * @param {Object} data - Patient details, blood group, hospital, units, contact, urgency
   */
  createRequest: async (data, userEmail) => {
    await delay(1000); // Simulate API network delay
    
    // Backend validations
    if (!data.patientName || !data.patientName.trim()) {
      throw new Error('Patient name is required.');
    }
    if (!data.bloodGroup) {
      throw new Error('Blood group is required.');
    }
    if (!data.hospital || !data.hospital.trim()) {
      throw new Error('Hospital name is required.');
    }
    const unitCheck = validateBloodRequestUnits(data.unitsRequired);
    if (!unitCheck.valid) {
      throw new Error(unitCheck.error || 'Units required must be a valid number.');
    }
    const units = unitCheck.units;
    if (!data.contactNumber || !data.contactNumber.trim()) {
      throw new Error('Contact number is required.');
    }
    if (!data.urgency) {
      throw new Error('Urgency level is required.');
    }

    const requests = getRequestsDB();
    
    const newRequest = {
      id: `REQ-${Date.now()}`,
      patientName: data.patientName.trim(),
      bloodGroup: data.bloodGroup,
      hospital: data.hospital.trim(),
      unitsRequired: units,
      contactNumber: data.contactNumber.trim(),
      urgency: data.urgency,
      status: 'Pending',
      createdBy: userEmail ? userEmail.toLowerCase().trim() : 'suresh@kct.ac.in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    saveRequestsDB(requests);

    // Live multi-device cloud sync
    try {
      cloudSync.syncRequest(newRequest);
    } catch (e) {
      console.warn('Cloud sync request warning:', e);
    }

    return {
      success: true,
      request: newRequest
    };
  },

  /**
   * Retrieves all emergency blood requests
   */
  getRequests: async () => {
    await delay(300);
    return getRequestsDB();
  },

  /**
   * Retrieves a single request by ID
   */
  getRequestById: async (id) => {
    await delay(200);
    const requests = getRequestsDB();
    return requests.find(r => r.id === id) || null;
  },

  /**
   * Smart Donor Matching: Filters users to find eligible and available matches
   * @param {string} requestedBloodGroup 
   */
  getMatchingDonors: async (requestedBloodGroup) => {
    await delay(800); // Simulate smart algorithm computational delay
    
    const users = getUsersDB();
    const donorList = Object.values(users);
    
    // Filter by:
    // 1. Blood group compatibility (exact match or clinically compatible Rh match)
    // 2. Availability == 'Available'
    // 3. Eligibility == 'Eligible'
    const matchingDonors = [];
    for (const donor of donorList) {
      if (!donor.bloodGroup) continue;
      const isAvailable = donor.availability === 'Available';
      const isEligible = donor.eligibility === 'Eligible';
      if (!isAvailable || !isEligible) continue;

      const isExact = donor.bloodGroup === requestedBloodGroup;
      const isCompatible = checkBloodCompatibility(donor.bloodGroup, requestedBloodGroup);

      if (isExact || isCompatible) {
        matchingDonors.push({
          ...donor,
          matchType: isExact ? 'Exact Match' : 'Compatible Match'
        });
      }
    }

    // Prioritize exact matches first
    const matches = matchingDonors.sort((a, b) => {
      if (a.matchType === 'Exact Match' && b.matchType !== 'Exact Match') return -1;
      if (a.matchType !== 'Exact Match' && b.matchType === 'Exact Match') return 1;
      return 0;
    });

    return {
      success: true,
      matches,
      totalChecked: donorList.length,
      matchCount: matches.length
    };
  },

  /**
   * Updates status of an emergency request (US-07)
   */
  updateRequestStatus: async (requestId, newStatus) => {
    await delay(300);
    const requests = getRequestsDB();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error('Request not found.');

    requests[index].status = newStatus;
    requests[index].updatedAt = new Date().toISOString();
    saveRequestsDB(requests);

    // Live multi-device cloud sync
    try {
      cloudSync.syncRequest(requests[index]);
    } catch (e) {
      console.warn('Cloud sync update request status warning:', e);
    }

    return {
      success: true,
      request: requests[index],
      message: `Request status updated to ${newStatus}.`
    };
  },

  /**
   * Responds/Accepts an emergency blood request by an eligible donor
   */
  respondToRequest: async (requestId, donorProfile) => {
    await delay(500);
    const requests = getRequestsDB();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error('Request not found.');

    const req = requests[index];
    const volunteered = req.volunteeredDonors || [];
    
    const alreadyResponded = volunteered.some(d => d.email.toLowerCase() === donorProfile.email.toLowerCase());
    if (alreadyResponded) {
      throw new Error('You have already volunteered for this emergency blood request.');
    }

    volunteered.push({
      name: donorProfile.name,
      email: donorProfile.email,
      phone: donorProfile.phone || '9876543210',
      bloodGroup: donorProfile.bloodGroup,
      respondedAt: new Date().toISOString()
    });

    req.volunteeredDonors = volunteered;
    req.status = 'Accepted';
    req.updatedAt = new Date().toISOString();

    requests[index] = req;
    saveRequestsDB(requests);

    // Live multi-device cloud sync
    try {
      cloudSync.syncRequest(req);
    } catch (e) {
      console.warn('Cloud sync respondToRequest warning:', e);
    }

    return {
      success: true,
      request: req,
      message: 'Thank you for accepting! Your response has been coordinated with the requester.'
    };
  }
};
