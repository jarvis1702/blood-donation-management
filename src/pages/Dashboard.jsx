import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { bloodRequestService } from '../services/bloodRequestService';
import DonorRegistrationModal from '../components/profile/DonorRegistrationModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [recentRequests, setRecentRequests] = useState([]);
  const [allDonors, setAllDonors] = useState([]);
  const [donorFilterGroup, setDonorFilterGroup] = useState('ALL');
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      loadProfileData();
      fetchRequests();
      loadAllDonors();
      setLoading(false);
    }
  }, [navigate]);

  const loadProfileData = () => {
    const userProfile = authService.getCurrentUserProfile();
    setProfile(userProfile);
  };

  const loadAllDonors = () => {
    try {
      const res = bloodRequestService.getMatchingDonors ? authService.getUserProfile('suresh@kct.ac.in') : null;
      // Fetch all users from database
      const db = JSON.parse(localStorage.getItem('blood_donation_users_db') || '{}');
      const donors = Object.values(db).filter(u => u.isDonor || u.bloodGroup);
      setAllDonors(donors);
    } catch (err) {
      console.error('Error fetching donors:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await bloodRequestService.getRequests();
      setRecentRequests(res.slice(0, 3));
    } catch (err) {
      console.error('Error fetching dashboard requests:', err);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      alert('Failed to logout. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!profile || !profile.isDonor) return;
    setToggleLoading(true);
    try {
      const newStatus = profile.availability === 'Available' ? 'Unavailable' : 'Available';
      const res = await authService.toggleAvailability(profile.email, newStatus);
      if (res.success) {
        setProfile(res.user);
        loadAllDonors();
      }
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleToggleOtherDonorAvailability = async (email, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Available' ? 'Unavailable' : 'Available';
      const res = await authService.toggleAvailability(email, newStatus);
      if (res.success) {
        loadAllDonors();
      }
    } catch (err) {
      console.error('Failed to toggle donor status:', err);
    }
  };

  if (loading || !profile) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Verifying session security...</p>
      </div>
    );
  }

  const isAdminOrClub = profile.role === 'Admin' || profile.role === 'Club Member';
  const filteredDonors = donorFilterGroup === 'ALL' 
    ? allDonors 
    : allDonors.filter(d => d.bloodGroup === donorFilterGroup);

  return (
    <div className="dashboard-container">
      {/* Header / Navbar */}
      <header className="dashboard-header">
        <div className="dashboard-logo" onClick={() => navigate('/dashboard')} style={{cursor: 'pointer'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#ff4d4d" stroke="#d32f2f"/>
            <path d="M12 6V18" stroke="white" strokeWidth="3"/>
            <path d="M8 12H16" stroke="white" strokeWidth="3"/>
          </svg>
          <span className="logo-text">KCT LifeFlow</span>
        </div>
        
        <div className="user-profile-menu">
          {isAdminOrClub && (
            <span className="badge badge-danger" style={{marginRight: '0.5rem'}}>
              🛡️ {profile.role || 'Admin'} Access
            </span>
          )}
          <button onClick={() => navigate('/profile')} className="btn btn-outline btn-sm" style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
            <div className="user-avatar" style={{width: '24px', height: '24px', fontSize: '0.75rem'}}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <span>Profile & Settings</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="btn btn-outline btn-sm logout-btn"
            disabled={logoutLoading}
          >
            {logoutLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="welcome-banner">
          <div className="welcome-text">
            <h1>Welcome back, {profile.name}!</h1>
            <p>
              {isAdminOrClub 
                ? 'System Administrator / Club Member Portal Active. You have full access to manage requests, donors, and system tracking.'
                : 'Your donor portal is active. Manage emergency blood demands or update your donor availability.'}
            </p>
          </div>
          <div className="welcome-badge">
            <span className="badge-icon">{isAdminOrClub ? '🛡️' : profile.isDonor ? '❤️' : '👤'}</span>
            <span className="badge-text">{profile.role || 'Registered User'}</span>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Column 1: Donor Card & Availability Switch */}
          <div className="dashboard-card donor-id-card">
            <h3>KCT Blood Donor Card</h3>
            
            {profile.isDonor ? (
              <>
                <div className="card-media">
                  <div className="donor-card-header">
                    <div className="donor-card-brand">
                      <span>KCT LifeFlow</span>
                    </div>
                    <div className="blood-type-badge">{profile.bloodGroup || 'O+'}</div>
                  </div>
                  
                  <div className="donor-card-body">
                    <div className="info-row">
                      <span className="info-lbl">DONOR NAME</span>
                      <span className="info-val">{profile.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-lbl">KCT EMAIL</span>
                      <span className="info-val">{profile.email}</span>
                    </div>
                    <div className="info-row-group">
                      <div className="info-row">
                        <span className="info-lbl">AVAILABILITY (US-05)</span>
                        <span className={`info-val ${profile.availability === 'Available' ? 'text-success' : 'text-muted'}`}>
                          {profile.availability || 'Available'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-lbl">ELIGIBILITY</span>
                        <span className="info-val">{profile.eligibility || 'Eligible'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Availability Toggle (US-05) */}
                <div className="availability-toggle-box" style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'var(--color-bg-base)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}>
                  <div>
                    <span style={{fontSize: '0.85rem', fontWeight: '600', display: 'block', color: 'var(--color-text-main)'}}>
                      Donor Availability Toggle
                    </span>
                    <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>
                      {profile.availability === 'Available' ? 'You appear in Smart Matching queries.' : 'Excluded from matching queries.'}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleAvailability}
                    className={`btn btn-sm ${profile.availability === 'Available' ? 'btn-primary' : 'btn-outline'}`}
                    disabled={toggleLoading}
                  >
                    {toggleLoading ? 'Saving...' : profile.availability === 'Available' ? 'Set Unavailable' : 'Set Available'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{padding: '1.5rem', textAlign: 'center', background: 'var(--color-bg-base)', borderRadius: 'var(--radius-md)'}}>
                <span style={{fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem'}}>🩸</span>
                <h4 style={{fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem'}}>Not Registered as a Donor</h4>
                <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem'}}>
                  Register as a blood donor to help people during emergency demands across KCT.
                </p>
                <button onClick={() => setIsDonorModalOpen(true)} className="btn btn-primary btn-sm">
                  Register as Blood Donor (US-04)
                </button>
              </div>
            )}
          </div>

          {/* Column 2: Quick Links & Request Feed */}
          <div className="dashboard-card quick-actions-card">
            <h3>Emergency Portal Quick Links</h3>
            
            <ul className="resources-list">
              <li>
                <a href="/requests" onClick={(e) => { e.preventDefault(); navigate('/requests'); }}>
                  <span className="resource-icon">🚨</span>
                  <div>
                    <span className="resource-title">Emergency Blood Requests (US-06)</span>
                    <span className="resource-desc">Submit details of an emergency patient or coordinate matching.</span>
                  </div>
                </a>
              </li>
              <li>
                <a href="/requests" onClick={(e) => { e.preventDefault(); navigate('/requests'); }}>
                  <span className="resource-icon">🧬</span>
                  <div>
                    <span className="resource-title">Smart Donor Matching Tool (US-08)</span>
                    <span className="resource-desc">Run KCT algorithm matching group compatibility index.</span>
                  </div>
                </a>
              </li>
              <li>
                <a href="/profile" onClick={(e) => { e.preventDefault(); navigate('/profile'); }}>
                  <span className="resource-icon">👤</span>
                  <div>
                    <span className="resource-title">Profile Management (US-03)</span>
                    <span className="resource-desc">Update contact details, role, and donor preferences.</span>
                  </div>
                </a>
              </li>
            </ul>

            <div className="dashboard-recent-section" style={{marginTop: '2rem'}}>
              <h3>Active Emergency Request Feed</h3>
              {recentRequests.length === 0 ? (
                <p className="no-feed-text" style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic'}}>
                  No active emergency requests in the queue.
                </p>
              ) : (
                <div className="request-feed-list" style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem'}}>
                  {recentRequests.map(req => (
                    <div 
                      key={req.id} 
                      className="feed-item" 
                      onClick={() => navigate('/requests')}
                      style={{
                        padding: '0.75rem 1rem', 
                        border: '1px solid var(--color-border)', 
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: 'var(--color-bg-base)',
                        transition: 'background var(--transition-fast)'
                      }}
                    >
                      <div>
                        <span style={{fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-main)'}}>{req.patientName}</span>
                        <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block'}}>{req.hospital}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span className="table-blood-group-badge" style={{margin: 0}}>{req.bloodGroup}</span>
                        <span className={`urgency-pill ${req.urgency === 'High' ? 'badge-danger' : 'badge-warning'}`} style={{fontSize: '0.675rem', padding: '0.15rem 0.4rem'}}>
                          {req.urgency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ADMIN / CLUB MEMBER PANELS: Registered Donor Management Roster */}
        {isAdminOrClub && (
          <div className="dashboard-card" style={{marginTop: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem'}}>
              <div>
                <h3 style={{border: 'none', padding: 0, margin: 0}}>🛡️ Admin / Club Donor Management Roster</h3>
                <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem'}}>
                  View all registered blood donors in KCT and manage their availability status.
                </p>
              </div>

              {/* Blood Group Filter Dropdown */}
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <label htmlFor="donorGroupFilter" style={{fontSize: '0.8rem', fontWeight: '600'}}>Filter Group:</label>
                <select
                  id="donorGroupFilter"
                  value={donorFilterGroup}
                  onChange={(e) => setDonorFilterGroup(e.target.value)}
                  className="form-input"
                  style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: 'auto'}}
                >
                  <option value="ALL">All Blood Groups ({allDonors.length})</option>
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="donors-table-wrapper" style={{overflowX: 'auto'}}>
              <table className="donors-table">
                <thead>
                  <tr>
                    <th>Donor Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Blood Group</th>
                    <th>Availability</th>
                    <th>Eligibility</th>
                    <th>Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonors.map((donor) => (
                    <tr key={donor.email}>
                      <td className="font-semibold">{donor.name}</td>
                      <td style={{fontSize: '0.8rem', color: 'var(--color-text-muted)'}}>{donor.email}</td>
                      <td>
                        <span className="badge badge-neutral" style={{fontSize: '0.725rem'}}>
                          {donor.role || 'Student'}
                        </span>
                      </td>
                      <td>
                        <span className="table-blood-group-badge">{donor.bloodGroup || 'O+'}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${donor.availability === 'Available' ? 'status-available' : 'badge-neutral'}`}>
                          {donor.availability || 'Available'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${donor.eligibility === 'Eligible' ? 'status-eligible' : 'badge-danger'}`}>
                          {donor.eligibility || 'Eligible'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleOtherDonorAvailability(donor.email, donor.availability || 'Available')}
                          className={`btn btn-sm ${donor.availability === 'Available' ? 'btn-outline' : 'btn-primary'}`}
                          style={{fontSize: '0.725rem', padding: '0.2rem 0.5rem'}}
                        >
                          Toggle {donor.availability === 'Available' ? 'Unavailable' : 'Available'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal for Donor Registration */}
      <DonorRegistrationModal 
        isOpen={isDonorModalOpen}
        onClose={() => setIsDonorModalOpen(false)}
        userEmail={profile.email}
        onDonorRegistered={(updatedUser) => { setProfile(updatedUser); loadAllDonors(); }}
      />
    </div>
  );
};

export default Dashboard;
