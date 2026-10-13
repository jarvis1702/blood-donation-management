import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authService } from '../services/authService';
import { bloodRequestService } from '../services/bloodRequestService';
import { campService } from '../services/campService';
import { donationHistoryService } from '../services/donationHistoryService';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Raw data from services
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [camps, setCamps] = useState([]);
  const [donations, setDonations] = useState([]);

  // Time filter
  const [timeFilter, setTimeFilter] = useState('ALL');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      const user = authService.getCurrentUserProfile() || authService.getCurrentUser();
      setCurrentUser(user);
      loadAllMetrics();
    }
  }, [navigate]);

  const loadAllMetrics = async () => {
    setLoading(true);
    try {
      // 1. Fetch Donors
      const db = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      const allUsers = Object.values(db);
      setDonors(allUsers);

      // 2. Fetch Blood Requests
      const reqList = await bloodRequestService.getRequests();
      setRequests(reqList || []);

      // 3. Fetch Camps
      const campList = campService.getCamps();
      setCamps(campList || []);

      // 4. Fetch Donations
      const donList = donationHistoryService.getAllDonations();
      setDonations(donList || []);
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Computations
  const totalDonors = donors.filter(d => d.isDonor || d.bloodGroup).length;
  const availableDonors = donors.filter(d => (d.isDonor || d.bloodGroup) && d.availability === 'Available').length;
  const eligibleDonors = donors.filter(d => (d.isDonor || d.bloodGroup) && d.eligibility === 'Eligible').length;

  const totalRequests = requests.length;
  const fulfilledRequests = requests.filter(r => r.status === 'Fulfilled').length;
  const pendingRequests = requests.filter(r => r.status === 'Open' || r.status === 'In Progress').length;
  const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 100;

  const totalCampTargets = camps.reduce((sum, c) => sum + (c.targetUnits || 0), 0);
  const totalCampBookings = camps.reduce((sum, c) => {
    const slotsBooked = (c.slots || []).reduce((s, slot) => s + (slot.booked || 0), 0);
    return sum + slotsBooked;
  }, 0);

  // Blood group breakdown
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodGroupStats = bloodGroups.map(bg => {
    const count = donors.filter(d => d.bloodGroup === bg).length;
    const available = donors.filter(d => d.bloodGroup === bg && d.availability === 'Available').length;
    const percent = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
    const isRare = bg.includes('-') || bg === 'AB-';
    return { bg, count, available, percent, isRare };
  });

  // Department distribution
  const departmentMapping = {
    'Computer Science and Engineering': 0,
    'Information Technology': 0,
    'Artificial Intelligence & Data Science': 0,
    'Electronics and Communication': 0,
    'Mechanical Engineering': 0,
    'Electrical and Electronics': 0,
    'Civil Engineering': 0,
    'Biotechnology': 0,
    'General Faculty & Staff': 0
  };

  donors.forEach(d => {
    const dept = d.department || '';
    if (dept.toLowerCase().includes('computer') || dept.toLowerCase().includes('cse')) {
      departmentMapping['Computer Science and Engineering']++;
    } else if (dept.toLowerCase().includes('info') || dept.toLowerCase().includes('it')) {
      departmentMapping['Information Technology']++;
    } else if (dept.toLowerCase().includes('ai') || dept.toLowerCase().includes('data')) {
      departmentMapping['Artificial Intelligence & Data Science']++;
    } else if (dept.toLowerCase().includes('electronic') || dept.toLowerCase().includes('ece')) {
      departmentMapping['Electronics and Communication']++;
    } else if (dept.toLowerCase().includes('mech')) {
      departmentMapping['Mechanical Engineering']++;
    } else if (dept.toLowerCase().includes('elec') || dept.toLowerCase().includes('eee')) {
      departmentMapping['Electrical and Electronics']++;
    } else if (dept.toLowerCase().includes('civil')) {
      departmentMapping['Civil Engineering']++;
    } else if (dept.toLowerCase().includes('bio')) {
      departmentMapping['Biotechnology']++;
    } else {
      departmentMapping['General Faculty & Staff']++;
    }
  });

  // CSV Export Generators
  const exportDonorsCSV = () => {
    const headers = ['Name,Email,Blood Group,Availability,Eligibility,Department,Role,Last Donation Date'];
    const rows = donors.map(d => 
      `"${d.name || ''}","${d.email || ''}","${d.bloodGroup || 'N/A'}","${d.availability || 'N/A'}","${d.eligibility || 'N/A'}","${d.department || 'N/A'}","${d.role || 'Student'}","${d.lastDonationDate || 'N/A'}"`
    );
    downloadCSV([headers, ...rows].join('\n'), 'KCT_LifeFlow_Donors_Registry.csv');
  };

  const exportRequestsCSV = () => {
    const headers = ['Request ID,Patient Name,Blood Group,Units,Hospital,Urgency,Status,Contact Phone,Created Date'];
    const rows = requests.map(r => 
      `"${r.id || ''}","${r.patientName || ''}","${r.bloodGroup || ''}","${r.units || ''}","${r.hospital || ''}","${r.urgency || ''}","${r.status || ''}","${r.contactPhone || ''}","${r.createdAt || ''}"`
    );
    downloadCSV([headers, ...rows].join('\n'), 'KCT_LifeFlow_Blood_Requests.csv');
  };

  const exportCampsCSV = () => {
    const headers = ['Camp ID,Camp Title,Organizer,Venue,Date,Target Units,Bookings,Partner Hospital,Status'];
    const rows = camps.map(c => {
      const booked = (c.slots || []).reduce((s, slot) => s + (slot.booked || 0), 0);
      return `"${c.id || ''}","${c.title || ''}","${c.organizerClub || ''}","${c.venue || ''}","${c.date || ''}","${c.targetUnits || 0}","${booked}","${c.partnerHospital || ''}","${c.status || ''}"`;
    });
    downloadCSV([headers, ...rows].join('\n'), 'KCT_LifeFlow_Camps_Summary.csv');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar activePage="/reports" />
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p>Compiling institutional reports & analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar activePage="/reports" />

      <main className="dashboard-main">
        {/* Reports Header & Actions */}
        <div className="requests-heading-section page-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1>Institutional Reports & Blood Analytics</h1>
            <p>Real-time donor pool metrics, blood supply distribution, camp mobilization efficiency, and official CSV exports.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={exportDonorsCSV} title="Download CSV">
              📥 Donors CSV
            </button>
            <button className="btn btn-outline" onClick={exportRequestsCSV} title="Download CSV">
              📥 Requests CSV
            </button>
            <button className="btn btn-outline" onClick={exportCampsCSV} title="Download CSV">
              📥 Camps CSV
            </button>
            <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>

        {/* 4 High-Level KPI Summary Cards */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Total Registered Donors</span>
              <span className="stat-icon" style={{ background: '#ffebee', color: '#c62828' }}>👥</span>
            </div>
            <div className="stat-value">{totalDonors}</div>
            <div className="stat-desc">
              <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{availableDonors} Available</span> • {eligibleDonors} Eligible
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Request Fulfillment Rate</span>
              <span className="stat-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}>🎯</span>
            </div>
            <div className="stat-value" style={{ color: '#2e7d32' }}>{fulfillmentRate}%</div>
            <div className="stat-desc">
              {fulfilledRequests} of {totalRequests} fulfilled ({pendingRequests} active)
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Camp Donor Mobilization</span>
              <span className="stat-icon" style={{ background: '#e3f2fd', color: '#1565c0' }}>🎪</span>
            </div>
            <div className="stat-value">{totalCampBookings} <span style={{ fontSize: '1rem' }}>Slots</span></div>
            <div className="stat-desc">
              Across {camps.length} campus drives (Target: {totalCampTargets})
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Lifetime Units Verified</span>
              <span className="stat-icon" style={{ background: '#f3e5f5', color: '#7b1fa2' }}>🩸</span>
            </div>
            <div className="stat-value">{donations.length} <span style={{ fontSize: '1rem' }}>Units</span></div>
            <div className="stat-desc">
              ~{donations.length * 3} lives directly sustained
            </div>
          </div>
        </div>

        {/* Section 1: Blood Group Inventory & Distribution */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🩸</span> Blood Group Distribution & Reserve Readiness
              </h2>
              <small style={{ color: '#666' }}>Active availability across all verified campus donors</small>
            </div>
            <span className="badge badge-primary">8 Blood Groups Cataloged</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {bloodGroupStats.map((item) => (
              <div 
                key={item.bg} 
                style={{ 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  background: item.isRare ? '#fffde7' : '#fafafa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span 
                      style={{ 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem', 
                        color: '#c62828',
                        background: '#ffebee',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    >
                      {item.bg}
                    </span>
                    {item.isRare && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Rare / Critical</span>}
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.count} Donors</span>
                </div>

                <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden', margin: '0.5rem 0' }}>
                  <div 
                    style={{ 
                      width: `${Math.max(item.percent, 8)}%`, 
                      height: '100%', 
                      background: item.isRare ? '#f57c00' : '#c62828'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
                  <span>{item.available} Currently Available</span>
                  <span><strong>{item.percent}%</strong> of total</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Department-wise Representation & Camp Performance Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Department Breakdown */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏛️</span> Department-Wise Donor Mobilization
            </h2>
            <div className="donors-table-wrapper">
              <table className="donors-table">
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left', background: '#f5f5f5' }}>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Donors</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(departmentMapping).map(([dept, count]) => {
                    const pct = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
                    return (
                      <tr key={dept} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500 }}>{dept}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <span className="badge badge-info">{count}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#555' }}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Camp Performance Overview */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎪</span> Campus Drives & Targets
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {camps.map((camp) => {
                const booked = (camp.slots || []).reduce((s, slot) => s + (slot.booked || 0), 0);
                const pct = camp.targetUnits > 0 ? Math.round((booked / camp.targetUnits) * 100) : 0;
                return (
                  <div 
                    key={camp.id}
                    style={{ 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: '1px solid #e0e0e0',
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{camp.title}</strong>
                      <span className={`badge ${camp.status === 'Completed' ? 'badge-success' : 'badge-primary'}`}>
                        {camp.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                      📅 {camp.date} • 📍 {camp.venue}
                    </div>

                    <div style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                      <div 
                        style={{ 
                          width: `${Math.min(pct, 100)}%`, 
                          height: '100%', 
                          background: pct >= 80 ? '#2e7d32' : '#1976d2' 
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#777' }}>
                      <span>Booked: <strong>{booked}</strong> / {camp.targetUnits} Units</span>
                      <span><strong>{pct}%</strong> Target Reached</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Hospital & Urgency Distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏥</span> Recent Blood Request Fulfillment Log
          </h2>

          <div className="donors-table-wrapper">
            <table className="donors-table">
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left', background: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem' }}>Request ID</th>
                  <th style={{ padding: '0.75rem' }}>Patient Name</th>
                  <th style={{ padding: '0.75rem' }}>Blood Group</th>
                  <th style={{ padding: '0.75rem' }}>Units</th>
                  <th style={{ padding: '0.75rem' }}>Hospital</th>
                  <th style={{ padding: '0.75rem' }}>Urgency</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 8).map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <code style={{ color: '#0d47a1' }}>{req.id}</code>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500 }}>{req.patientName}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className="badge badge-info">{req.bloodGroup}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{req.units}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{req.hospital}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className={`badge ${req.urgency === 'Critical' || req.urgency === 'Emergency' ? 'badge-danger' : 'badge-warning'}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className={`badge ${req.status === 'Fulfilled' ? 'badge-success' : 'badge-warning'}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
