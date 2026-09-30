import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authService } from '../services/authService';
import { campService } from '../services/campService';
import { bloodRequestService } from '../services/bloodRequestService';
import { notificationService } from '../services/notificationService';

const ClubPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [camps, setCamps] = useState([]);
  const [clubStats, setClubStats] = useState({ totalCamps: 0, totalTargetUnits: 0, totalRegisteredDonors: 0, totalVolunteers: 0, activeDrives: 0 });
  const [rosterRegistrations, setRosterRegistrations] = useState([]);
  const [selectedCampFilter, setSelectedCampFilter] = useState('ALL');
  const [activeRequests, setActiveRequests] = useState([]);

  // Create Camp Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCamp, setNewCamp] = useState({
    title: '',
    organizerClub: 'Youth Red Cross (YRC)',
    venue: '',
    date: '',
    time: '09:00 AM - 04:00 PM',
    targetUnits: 150,
    partnerHospital: 'Coimbatore Medical College Hospital (CMCH)',
    description: ''
  });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      const profile = authService.getCurrentUserProfile();
      setCurrentUser(profile);
      refreshData();
    }
  }, [navigate]);

  const refreshData = () => {
    const allCamps = campService.getCamps();
    setCamps(allCamps);
    setClubStats(campService.getClubStats());
    setRosterRegistrations(campService.getCampRegistrationsForClub('ALL'));

    bloodRequestService.getRequests().then(reqs => {
      setActiveRequests(reqs.filter(r => r.status !== 'Fulfilled' && r.status !== 'Cancelled'));
    });
  };

  const handleFilterRoster = (campId) => {
    setSelectedCampFilter(campId);
    setRosterRegistrations(campService.getCampRegistrationsForClub(campId));
  };

  const handleStatusChange = (campId, newStatus) => {
    campService.updateCampStatus(campId, newStatus);
    refreshData();
  };

  const handleCreateCampSubmit = (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    try {
      const res = campService.createCamp(newCamp, currentUser?.email);
      if (res.success) {
        setCreateSuccess('Campus Blood Donation Drive created successfully!');
        
        // Broadcast notification (SCRUM-19)
        notificationService.addNotification({
          title: `🩸 New Campus Drive: ${newCamp.title}`,
          message: `Scheduled at ${newCamp.venue} on ${newCamp.date}. Volunteer & donor slots are now open!`,
          type: 'camp',
          link: '/camps'
        });

        refreshData();
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setNewCamp({
            title: '',
            organizerClub: 'Youth Red Cross (YRC)',
            venue: '',
            date: '',
            time: '09:00 AM - 04:00 PM',
            targetUnits: 150,
            partnerHospital: 'Coimbatore Medical College Hospital (CMCH)',
            description: ''
          });
          setCreateSuccess('');
        }, 1200);
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create camp.');
    }
  };

  const isClubOrAdmin = currentUser?.role === 'Club Member' || currentUser?.role === 'Admin';

  return (
    <div className="dashboard-container">
      <Navbar activePage="/club" />

      <main className="dashboard-main layout-with-sidebar-panel">
        <div className="main-requests-content">
          
          {/* Hero Banner */}
          <div className="camps-hero-banner" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-danger">YRC Blood Wing Governance</span>
                <span className="badge badge-info">{currentUser?.role || 'User'}</span>
              </div>
              <h1>🛡️ Youth Red Cross (YRC) Club Command Center (SCRUM-22)</h1>
              <p>Campus blood donation camp scheduling, volunteer mobilization roster, and hospital emergency coordination desk.</p>
            </div>
            
            {isClubOrAdmin && (
              <button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              >
                <span>➕</span> Schedule New Camp
              </button>
            )}
          </div>

          {/* Club KPI Metric Cards */}
          <div className="club-stats-grid">
            <div className="stat-metric-card">
              <span className="metric-icon">🎪</span>
              <div className="metric-info">
                <h3>{clubStats.totalCamps}</h3>
                <p>Campus Drives Scheduled</p>
              </div>
            </div>

            <div className="stat-metric-card">
              <span className="metric-icon">🎯</span>
              <div className="metric-info">
                <h3>{clubStats.totalTargetUnits} Pints</h3>
                <p>Total Collection Target</p>
              </div>
            </div>

            <div className="stat-metric-card">
              <span className="metric-icon">🩸</span>
              <div className="metric-info">
                <h3>{clubStats.totalRegisteredDonors}</h3>
                <p>Donors Pre-Registered</p>
              </div>
            </div>

            <div className="stat-metric-card">
              <span className="metric-icon">🤝</span>
              <div className="metric-info">
                <h3>{clubStats.totalVolunteers}</h3>
                <p>Active Student Volunteers</p>
              </div>
            </div>
          </div>

          {/* Non-Admin Notice if applicable */}
          {!isClubOrAdmin && (
            <div className="alert-box alert-info" style={{ marginTop: '1.5rem' }}>
              <strong>ℹ️ Campus Student View:</strong> You are viewing the public YRC Blood Club Portal. Administrative controls like creating camps or updating statuses are restricted to YRC Club Members and System Administrators (`admin@kct.ac.in` / `club@kct.ac.in`).
            </div>
          )}

          {/* Section 1: Manage Scheduled Drives */}
          <div className="club-section-card" style={{ marginTop: '2rem' }}>
            <div className="section-card-header">
              <h3>📅 Campus Blood Drives Management ({camps.length})</h3>
              <button onClick={() => navigate('/camps')} className="btn btn-outline btn-sm">
                View Public Camp View
              </button>
            </div>

            <div className="table-responsive-container">
              <table className="requests-log-table">
                <thead>
                  <tr>
                    <th>Camp ID</th>
                    <th>Camp Title</th>
                    <th>Venue</th>
                    <th>Date & Time</th>
                    <th>Target Goal</th>
                    <th>Status</th>
                    {isClubOrAdmin && <th>Status Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {camps.map(camp => (
                    <tr key={camp.id}>
                      <td><span className="req-id-badge">{camp.id}</span></td>
                      <td className="font-semibold">{camp.title}</td>
                      <td>{camp.venue}</td>
                      <td>{camp.date}</td>
                      <td>{camp.targetUnits} Pints</td>
                      <td>
                        <span className={`status-badge ${camp.status === 'Completed' ? 'badge-neutral' : 'status-available'}`}>
                          {camp.status}
                        </span>
                      </td>
                      {isClubOrAdmin && (
                        <td>
                          <select 
                            value={camp.status} 
                            onChange={(e) => handleStatusChange(camp.id, e.target.value)}
                            className="form-control"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Ongoing">Ongoing (Live)</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Registered Donors & Volunteer Roster */}
          <div className="club-section-card" style={{ marginTop: '2rem' }}>
            <div className="section-card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3>👥 Registered Donors & Volunteers Roster ({rosterRegistrations.length})</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Filter by drive to view participant lists, booked time slots, and volunteer task duties.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Filter Camp:</label>
                <select 
                  value={selectedCampFilter} 
                  onChange={(e) => handleFilterRoster(e.target.value)}
                  className="form-control"
                  style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Camps</option>
                  {camps.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-responsive-container">
              {rosterRegistrations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <p>No participant registrations recorded for this camp yet.</p>
                </div>
              ) : (
                <table className="requests-log-table">
                  <thead>
                    <tr>
                      <th>Reg ID</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Contact Phone</th>
                      <th>Participation Type</th>
                      <th>Details (Slot / Task)</th>
                      <th>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterRegistrations.map(reg => (
                      <tr key={reg.id}>
                        <td><span className="req-id-badge">{reg.id}</span></td>
                        <td className="font-semibold">{reg.userName}</td>
                        <td>{reg.userEmail}</td>
                        <td>{reg.phone || '9876543210'}</td>
                        <td>
                          <span className={`status-badge ${reg.type === 'donor' ? 'status-available' : 'badge-info'}`}>
                            {reg.type === 'donor' ? '🩸 Donor' : '🤝 Volunteer'}
                          </span>
                        </td>
                        <td>
                          {reg.type === 'donor' ? (
                            <span>Slot: <strong>{reg.selectedSlot}</strong> ({reg.bloodGroup})</span>
                          ) : (
                            <span>Task: <strong>{reg.volunteerRole}</strong></span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {new Date(reg.registeredAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Section 3: Emergency Requests Coordination */}
          <div className="club-section-card" style={{ marginTop: '2rem' }}>
            <div className="section-card-header">
              <h3>🚨 Active Hospital Emergency Demands ({activeRequests.length})</h3>
              <button onClick={() => navigate('/requests')} className="btn btn-outline btn-sm">
                Open Full Request Log
              </button>
            </div>

            <div className="table-responsive-container">
              {activeRequests.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <p>✅ All emergency requests are currently fulfilled!</p>
                </div>
              ) : (
                <table className="requests-log-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Patient Name</th>
                      <th>Blood Group</th>
                      <th>Units</th>
                      <th>Hospital</th>
                      <th>Urgency</th>
                      <th>Tracking Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRequests.map(req => (
                      <tr key={req.id}>
                        <td><span className="req-id-badge">{req.id}</span></td>
                        <td className="font-semibold">{req.patientName}</td>
                        <td><span className="table-blood-group-badge">{req.bloodGroup}</span></td>
                        <td>{req.unitsRequired} Units</td>
                        <td>{req.hospital}</td>
                        <td><span className="urgency-pill badge-danger">{req.urgency}</span></td>
                        <td><span className="status-badge badge-info">{req.status}</span></td>
                        <td>
                          <button onClick={() => navigate('/requests')} className="btn btn-sm btn-primary">
                            Coordinate Donors
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Modal: Schedule New Blood Donation Camp */}
        {isCreateModalOpen && (
          <div className="drawer-overlay-backdrop" onClick={() => setIsCreateModalOpen(false)}>
            <div className="camp-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🎪 Schedule New Campus Blood Drive (SCRUM-22)</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="btn-close-modal">✕</button>
              </div>

              <form onSubmit={handleCreateCampSubmit} className="camp-booking-form">
                {createError && <div className="alert-box alert-error">{createError}</div>}
                {createSuccess && <div className="alert-box alert-success">{createSuccess}</div>}

                <div className="form-group">
                  <label>Camp Drive Title *</label>
                  <input 
                    type="text" 
                    value={newCamp.title} 
                    onChange={(e) => setNewCamp({ ...newCamp, title: e.target.value })} 
                    required 
                    placeholder="e.g. KCT Youth Blood Donation Mega Camp" 
                    className="form-control" 
                  />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Organizing Club</label>
                    <select 
                      value={newCamp.organizerClub} 
                      onChange={(e) => setNewCamp({ ...newCamp, organizerClub: e.target.value })} 
                      className="form-control"
                    >
                      <option value="Youth Red Cross (YRC)">Youth Red Cross (YRC)</option>
                      <option value="YRC & NSS">YRC & NSS Joint Drive</option>
                      <option value="NCC Blood Wing">NCC Blood Wing</option>
                      <option value="Rotaract Club of KCT">Rotaract Club of KCT</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Campus Venue *</label>
                    <input 
                      type="text" 
                      value={newCamp.venue} 
                      onChange={(e) => setNewCamp({ ...newCamp, venue: e.target.value })} 
                      required 
                      placeholder="e.g. Ramanandha Adigalar Auditorium (RAA)" 
                      className="form-control" 
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Drive Date *</label>
                    <input 
                      type="date" 
                      value={newCamp.date} 
                      onChange={(e) => setNewCamp({ ...newCamp, date: e.target.value })} 
                      required 
                      className="form-control" 
                    />
                  </div>

                  <div className="form-group">
                    <label>Time Window</label>
                    <input 
                      type="text" 
                      value={newCamp.time} 
                      onChange={(e) => setNewCamp({ ...newCamp, time: e.target.value })} 
                      placeholder="09:00 AM - 04:00 PM" 
                      className="form-control" 
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Target Blood Units (Pints) *</label>
                    <input 
                      type="number" 
                      value={newCamp.targetUnits} 
                      onChange={(e) => setNewCamp({ ...newCamp, targetUnits: e.target.value })} 
                      required 
                      min="20" 
                      max="1000" 
                      className="form-control" 
                    />
                  </div>

                  <div className="form-group">
                    <label>Partner Hospital Blood Bank</label>
                    <input 
                      type="text" 
                      value={newCamp.partnerHospital} 
                      onChange={(e) => setNewCamp({ ...newCamp, partnerHospital: e.target.value })} 
                      placeholder="e.g. Coimbatore Medical College Hospital" 
                      className="form-control" 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Camp Description & Guidelines</label>
                  <textarea 
                    value={newCamp.description} 
                    onChange={(e) => setNewCamp({ ...newCamp, description: e.target.value })} 
                    rows="3" 
                    placeholder="Provide instructions, donor eligibility requirements, and refreshment info..."
                    className="form-control" 
                  />
                </div>

                <div className="modal-actions-footer">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Publish Campus Drive
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ClubPage;
