/**
 * KCT LifeFlow - Donation History Service (SCRUM-23)
 * Tracks past donor contributions, calculates lifesaving impact, 
 * issues official YRC Certificates of Appreciation, and maintains 90-day cooldown status.
 */

import { authService } from './authService';
import { notificationService } from './notificationService';
import { cloudSync } from './cloudSync';

const HISTORY_STORAGE_KEY = 'kct_donation_history_db';

const defaultDonations = [
  {
    id: 'DON-2026-001',
    donorEmail: 'suresh@kct.ac.in',
    donorName: 'Suresh Kumar',
    bloodGroup: 'O+',
    units: 1,
    donationDate: '2026-08-14',
    venue: 'Coimbatore Medical College Hospital (CMCH) Blood Bank',
    donationType: 'Emergency Patient Request (REQ-101)',
    certificateId: 'KCT-YRC-CERT-2026-8812',
    hemoglobin: '13.5 g/dL',
    bloodPressure: '120/80 mmHg',
    verified: true,
    verifiedBy: 'Dr. R. Arumugam, CMCH Medical Officer',
    remarks: 'Successful whole blood donation for emergency surgery.'
  },
  {
    id: 'DON-2026-002',
    donorEmail: 'suresh@kct.ac.in',
    donorName: 'Suresh Kumar',
    bloodGroup: 'O+',
    units: 1,
    donationDate: '2026-05-06',
    venue: 'Ramanandha Adigalar Auditorium (RAA), KCT Campus',
    donationType: 'Annual Campus Mega Blood Drive',
    certificateId: 'KCT-YRC-CERT-2026-4521',
    hemoglobin: '13.8 g/dL',
    bloodPressure: '118/78 mmHg',
    verified: true,
    verifiedBy: 'YRC Blood Camp Co-ordinator, KCT',
    remarks: 'Voluntary student donation at campus drive.'
  },
  {
    id: 'DON-2026-003',
    donorEmail: 'ramesh@kct.ac.in',
    donorName: 'Ramesh Raja',
    bloodGroup: 'A+',
    units: 1,
    donationDate: '2026-07-05',
    venue: 'Kovai Medical Center & Hospital (KMCH) Trauma Unit',
    donationType: 'Hospital Direct Replacement',
    certificateId: 'KCT-YRC-CERT-2026-6701',
    hemoglobin: '14.1 g/dL',
    bloodPressure: '122/80 mmHg',
    verified: true,
    verifiedBy: 'KMCH Blood Bank Registrar',
    remarks: 'Standard whole blood donation.'
  },
  {
    id: 'DON-2026-004',
    donorEmail: 'admin@kct.ac.in',
    donorName: 'KCT System Administrator',
    bloodGroup: 'O+',
    units: 1,
    donationDate: '2026-06-15',
    venue: 'KCT Health Centre Blood Drive',
    donationType: 'Faculty & Staff Voluntary Drive',
    certificateId: 'KCT-YRC-CERT-2026-3110',
    hemoglobin: '13.9 g/dL',
    bloodPressure: '120/82 mmHg',
    verified: true,
    verifiedBy: 'KCT Health Officer',
    remarks: 'Institutional staff donation.'
  },
  {
    id: 'DON-2026-005',
    donorEmail: 'admin@kct.ac.in',
    donorName: 'KCT System Administrator',
    bloodGroup: 'O+',
    units: 1,
    donationDate: '2026-02-10',
    venue: 'Sri Ramakrishna Hospital Blood Bank',
    donationType: 'Emergency Pediatric Request',
    certificateId: 'KCT-YRC-CERT-2026-1049',
    hemoglobin: '14.0 g/dL',
    bloodPressure: '118/80 mmHg',
    verified: true,
    verifiedBy: 'Ramakrishna Hospital Blood Officer',
    remarks: 'Emergency blood mobilization.'
  }
];

function getDonationsDB() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(defaultDonations));
      return defaultDonations;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading donation history DB:', err);
    return defaultDonations;
  }
}

function saveDonationsDB(records) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving donation history DB:', err);
  }
}

export const donationHistoryService = {
  /**
   * Retrieves all donation history for a specific donor
   */
  getUserDonations: (email) => {
    if (!email) return [];
    const normalized = email.toLowerCase().trim();
    const all = getDonationsDB();
    return all
      .filter(d => d.donorEmail.toLowerCase() === normalized)
      .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
  },

  /**
   * Retrieves all donations across the institution (for club and admin audits)
   */
  getAllDonations: () => {
    const all = getDonationsDB();
    return all.sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
  },

  /**
   * Calculates lifetime impact statistics and cooldown eligibility for a donor
   */
  getDonorStats: (email) => {
    const donations = donationHistoryService.getUserDonations(email);
    const totalDonations = donations.length;
    const totalUnits = donations.reduce((sum, d) => sum + (Number(d.units) || 1), 0);
    const livesSaved = totalUnits * 3; // Standard clinical impact factor

    let lastDonationDate = null;
    let daysSinceLast = null;
    let isEligible = true;
    let daysRemaining = 0;
    let nextEligibleDate = 'Immediate';

    if (totalDonations > 0) {
      lastDonationDate = donations[0].donationDate;
      const lastDateObj = new Date(lastDonationDate);
      const today = new Date();
      const diffTime = today - lastDateObj;
      daysSinceLast = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysSinceLast < 90) {
        isEligible = false;
        daysRemaining = 90 - daysSinceLast;
        const nextDate = new Date(lastDateObj);
        nextDate.setDate(nextDate.getDate() + 90);
        nextEligibleDate = nextDate.toISOString().split('T')[0];
      }
    }

    const cooldownProgressPercent = daysSinceLast === null ? 100 : Math.min(100, Math.round((daysSinceLast / 90) * 100));

    return {
      totalDonations,
      totalUnits,
      livesSaved,
      lastDonationDate,
      daysSinceLastDonation: daysSinceLast,
      isEligible,
      daysRemaining,
      nextEligibleDate,
      cooldownProgressPercent
    };
  },

  /**
   * Logs a new verified blood donation record
   */
  logDonation: async (donorEmail, data) => {
    if (!donorEmail) throw new Error('Donor email is required.');
    if (!data.donationDate) throw new Error('Donation date is required.');
    if (!data.venue) throw new Error('Donation venue or hospital is required.');

    const normalized = donorEmail.toLowerCase().trim();
    const all = getDonationsDB();
    const certSerial = Math.floor(1000 + Math.random() * 9000);
    const year = new Date(data.donationDate).getFullYear() || 2026;

    const newRecord = {
      id: `DON-${year}-${Date.now().toString().slice(-4)}`,
      donorEmail: normalized,
      donorName: data.donorName || 'KCT Blood Donor',
      bloodGroup: data.bloodGroup || 'O+',
      units: Number(data.units) || 1,
      donationDate: data.donationDate,
      venue: data.venue.trim(),
      donationType: data.donationType || 'Campus Blood Drive',
      certificateId: `KCT-YRC-CERT-${year}-${certSerial}`,
      hemoglobin: data.hemoglobin ? `${data.hemoglobin} g/dL` : '13.2 g/dL',
      bloodPressure: data.bloodPressure || '120/80 mmHg',
      verified: true,
      verifiedBy: data.verifiedBy || 'Youth Red Cross (YRC) Verification Desk',
      remarks: data.remarks || 'Voluntary donation recorded successfully.',
      updatedAt: new Date().toISOString()
    };

    all.unshift(newRecord);
    saveDonationsDB(all);

    // Live multi-device cloud sync
    try {
      cloudSync.syncDonation(newRecord);
    } catch (e) {
      console.warn('Cloud sync donation warning:', e);
    }

    // Update donor profile's lastDonationDate and eligibility in users DB
    try {
      const user = authService.getUserProfile(normalized);
      if (user) {
        await authService.registerAsDonor(normalized, {
          bloodGroup: newRecord.bloodGroup,
          weight: user.weight || 60,
          lastDonationDate: newRecord.donationDate
        });
      }
    } catch (e) {
      console.warn('Could not auto-sync lastDonationDate to profile:', e);
    }

    // Broadcast positive notification
    try {
      notificationService.addNotification({
        title: '🎖️ Donation Certificate Issued!',
        message: `Your donation of ${newRecord.units} unit at ${newRecord.venue} has been recorded. Certificate #${newRecord.certificateId} is available.`,
        type: 'general',
        link: '/history'
      });
    } catch (e) {
      console.warn('Notification send failed:', e);
    }

    return {
      success: true,
      donation: newRecord,
      message: 'Donation successfully recorded and certificate issued.'
    };
  },

  /**
   * Retrieves certificate details by certificate ID or donation ID
   */
  getCertificate: (certOrDonationId) => {
    const all = getDonationsDB();
    return all.find(d => d.certificateId === certOrDonationId || d.id === certOrDonationId) || null;
  }
};
