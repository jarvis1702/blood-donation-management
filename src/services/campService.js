/**
 * KCT LifeFlow - Donation Camp Service (SCRUM-20, SCRUM-21, SCRUM-22)
 * Manages campus blood donation camps, donor time-slot bookings, volunteer mobilization, and club governance.
 */

const CAMPS_STORAGE_KEY = 'kct_blood_camps_db';
const REGISTRATIONS_STORAGE_KEY = 'kct_camp_registrations_db';

// Initial pre-seeded campus blood drives for Kumaraguru College of Technology
const defaultCamps = [
  {
    id: 'CAMP-2026-01',
    title: 'KCT Mega Youth Blood Donation Drive 2026',
    organizerClub: 'Youth Red Cross (YRC) & NSS',
    venue: 'Ramanandha Adigalar Auditorium (RAA), KCT Campus',
    date: '2026-10-14',
    time: '09:00 AM - 04:30 PM',
    targetUnits: 350,
    collectedUnits: 0,
    partnerHospital: 'Coimbatore Medical College Hospital (CMCH) Blood Bank',
    status: 'Scheduled',
    description: 'Annual campus flagship blood drive mobilizing student and faculty donors. Complete medical checkup, blood grouping, donor certificates, and refreshments provided.',
    slots: [
      { time: '09:00 AM - 10:30 AM', capacity: 60, booked: 28 },
      { time: '10:30 AM - 12:00 PM', capacity: 80, booked: 45 },
      { time: '12:00 PM - 01:30 PM', capacity: 70, booked: 32 },
      { time: '02:00 PM - 03:30 PM', capacity: 80, booked: 25 },
      { time: '03:30 PM - 04:30 PM', capacity: 60, booked: 12 }
    ],
    volunteerNeeds: [
      { role: 'Registration & Token Desk', slotsNeeded: 10, filled: 8 },
      { role: 'Donor Refreshment & Vitals Counter', slotsNeeded: 8, filled: 6 },
      { role: 'Crowd Flow & Hall Guidance', slotsNeeded: 12, filled: 9 }
    ]
  },
  {
    id: 'CAMP-2026-02',
    title: 'Red Cross Emergency Reserve Drive',
    organizerClub: 'YRC Blood Wing',
    venue: 'KCT Health Centre & First Aid Clinic',
    date: '2026-10-28',
    time: '10:00 AM - 03:00 PM',
    targetUnits: 150,
    collectedUnits: 0,
    partnerHospital: 'Kovai Medical Center & Hospital (KMCH) Blood Bank',
    status: 'Scheduled',
    description: 'Targeted donation camp to build emergency rare blood group reserves for local trauma care facilities.',
    slots: [
      { time: '10:00 AM - 11:30 AM', capacity: 50, booked: 18 },
      { time: '11:30 AM - 01:00 PM', capacity: 50, booked: 22 },
      { time: '01:30 PM - 03:00 PM', capacity: 50, booked: 8 }
    ],
    volunteerNeeds: [
      { role: 'Donor Screening & Triage', slotsNeeded: 6, filled: 4 },
      { role: 'Certificate & Refreshment Desk', slotsNeeded: 6, filled: 5 }
    ]
  },
  {
    id: 'CAMP-2026-03',
    title: 'NCC Cadet & Student Blood Mobilization Drive',
    organizerClub: '2(TN) Composite Tech Coy NCC & YRC',
    venue: 'C-Block Seminar Hall, KCT',
    date: '2026-11-05',
    time: '09:30 AM - 02:30 PM',
    targetUnits: 120,
    collectedUnits: 0,
    partnerHospital: 'Sri Ramakrishna Hospital Blood Bank',
    status: 'Upcoming',
    description: 'Joint voluntary drive promoting youth civic participation in regular life-saving blood donation.',
    slots: [
      { time: '09:30 AM - 11:00 AM', capacity: 40, booked: 15 },
      { time: '11:00 AM - 12:30 PM', capacity: 40, booked: 12 },
      { time: '01:00 PM - 02:30 PM', capacity: 40, booked: 8 }
    ],
    volunteerNeeds: [
      { role: 'Registration Desk', slotsNeeded: 6, filled: 3 },
      { role: 'Donor Care Unit', slotsNeeded: 6, filled: 4 }
    ]
  }
];

function getCampsDB() {
  try {
    const raw = localStorage.getItem(CAMPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CAMPS_STORAGE_KEY, JSON.stringify(defaultCamps));
      return defaultCamps;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error fetching camps DB:', e);
    return defaultCamps;
  }
}

function saveCampsDB(camps) {
  try {
    localStorage.setItem(CAMPS_STORAGE_KEY, JSON.stringify(camps));
  } catch (e) {
    console.error('Error saving camps DB:', e);
  }
}

function getRegistrationsDB() {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveRegistrationsDB(regs) {
  localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(regs));
}

export const campService = {
  getCamps: () => {
    return getCampsDB();
  },

  getCampById: (id) => {
    const camps = getCampsDB();
    return camps.find(c => c.id === id) || null;
  },

  /**
   * Registers a user as a Camp Donor (with time slot) or Student Volunteer
   */
  registerForCamp: (campId, data) => {
    const camps = getCampsDB();
    const camp = camps.find(c => c.id === campId);
    if (!camp) throw new Error('Camp not found.');

    const registrations = getRegistrationsDB();
    const existing = registrations.find(
      r => r.campId === campId && r.userEmail.toLowerCase() === data.userEmail.toLowerCase() && r.type === data.type
    );
    if (existing) {
      throw new Error(`You have already registered as a ${data.type} for this camp.`);
    }

    const regId = `REG-${Date.now()}`;
    const newReg = {
      id: regId,
      campId,
      campTitle: camp.title,
      campDate: camp.date,
      venue: camp.venue,
      userEmail: data.userEmail.toLowerCase(),
      userName: data.userName,
      phone: data.phone || '',
      department: data.department || '',
      type: data.type, // 'donor' or 'volunteer'
      selectedSlot: data.selectedSlot || '',
      volunteerRole: data.volunteerRole || '',
      bloodGroup: data.bloodGroup || '',
      registeredAt: new Date().toISOString()
    };

    // Update camp count
    if (data.type === 'donor' && data.selectedSlot) {
      const slotObj = camp.slots?.find(s => s.time === data.selectedSlot);
      if (slotObj) slotObj.booked = (slotObj.booked || 0) + 1;
    } else if (data.type === 'volunteer' && data.volunteerRole) {
      const needObj = camp.volunteerNeeds?.find(v => v.role === data.volunteerRole);
      if (needObj) needObj.filled = (needObj.filled || 0) + 1;
    }

    registrations.push(newReg);
    saveRegistrationsDB(registrations);
    saveCampsDB(camps);

    return {
      success: true,
      registration: newReg
    };
  },

  getUserRegistrations: (userEmail) => {
    if (!userEmail) return [];
    const registrations = getRegistrationsDB();
    return registrations.filter(r => r.userEmail.toLowerCase() === userEmail.toLowerCase());
  },

  cancelRegistration: (regId) => {
    const registrations = getRegistrationsDB();
    const reg = registrations.find(r => r.id === regId);
    if (!reg) return false;

    // Decrement camp slot count
    const camps = getCampsDB();
    const camp = camps.find(c => c.id === reg.campId);
    if (camp) {
      if (reg.type === 'donor' && reg.selectedSlot) {
        const slot = camp.slots?.find(s => s.time === reg.selectedSlot);
        if (slot && slot.booked > 0) slot.booked -= 1;
      } else if (reg.type === 'volunteer' && reg.volunteerRole) {
        const need = camp.volunteerNeeds?.find(v => v.role === reg.volunteerRole);
        if (need && need.filled > 0) need.filled -= 1;
      }
      saveCampsDB(camps);
    }

    const filtered = registrations.filter(r => r.id !== regId);
    saveRegistrationsDB(filtered);
    return true;
  },

  /**
   * Club Management - Create a new blood donation camp (SCRUM-22)
   */
  createCamp: (campData, createdByEmail) => {
    if (!campData.title || !campData.title.trim()) throw new Error('Camp title is required');
    if (!campData.venue || !campData.venue.trim()) throw new Error('Venue is required');
    if (!campData.date) throw new Error('Camp date is required');

    const camps = getCampsDB();
    const newCamp = {
      id: `CAMP-${Date.now()}`,
      title: campData.title.trim(),
      organizerClub: campData.organizerClub || 'Youth Red Cross (YRC)',
      venue: campData.venue.trim(),
      date: campData.date,
      time: campData.time || '09:00 AM - 04:00 PM',
      targetUnits: parseInt(campData.targetUnits, 10) || 100,
      collectedUnits: 0,
      partnerHospital: campData.partnerHospital || 'Coimbatore Medical College Hospital (CMCH)',
      status: 'Scheduled',
      description: campData.description || 'Voluntary campus blood donation drive organized by YRC.',
      createdBy: createdByEmail || 'club@kct.ac.in',
      createdAt: new Date().toISOString(),
      slots: [
        { time: '09:00 AM - 10:30 AM', capacity: 50, booked: 0 },
        { time: '10:30 AM - 12:00 PM', capacity: 50, booked: 0 },
        { time: '12:00 PM - 01:30 PM', capacity: 50, booked: 0 },
        { time: '02:00 PM - 03:30 PM', capacity: 50, booked: 0 }
      ],
      volunteerNeeds: [
        { role: 'Registration & Token Desk', slotsNeeded: 8, filled: 0 },
        { role: 'Donor Refreshment & Vitals Counter', slotsNeeded: 6, filled: 0 },
        { role: 'Crowd Flow & Hall Guidance', slotsNeeded: 8, filled: 0 }
      ]
    };

    camps.unshift(newCamp);
    saveCampsDB(camps);

    return {
      success: true,
      camp: newCamp
    };
  },

  updateCampStatus: (campId, newStatus) => {
    const camps = getCampsDB();
    const index = camps.findIndex(c => c.id === campId);
    if (index === -1) throw new Error('Camp not found');
    camps[index].status = newStatus;
    saveCampsDB(camps);
    return camps[index];
  },

  getClubStats: () => {
    const camps = getCampsDB();
    const registrations = getRegistrationsDB();
    
    let totalTarget = 0;
    camps.forEach(c => totalTarget += (c.targetUnits || 0));

    const totalDonors = registrations.filter(r => r.type === 'donor').length;
    const totalVolunteers = registrations.filter(r => r.type === 'volunteer').length;

    return {
      totalCamps: camps.length,
      totalTargetUnits: totalTarget,
      totalRegisteredDonors: totalDonors,
      totalVolunteers: totalVolunteers,
      activeDrives: camps.filter(c => c.status === 'Scheduled' || c.status === 'Ongoing').length
    };
  },

  getCampRegistrationsForClub: (campId) => {
    const registrations = getRegistrationsDB();
    if (!campId || campId === 'ALL') return registrations;
    return registrations.filter(r => r.campId === campId);
  }
};
