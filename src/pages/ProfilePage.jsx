import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ProfileForm from '../components/profile/ProfileForm';
import DonorRegistrationModal from '../components/profile/DonorRegistrationModal';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      loadProfile();
    }
  }, [navigate]);

  const loadProfile = () => {
    setLoading(true);
    const data = authService.getCurrentUserProfile();
    setProfile(data);
    setLoading(false);
  };

  const handleProfileUpdated = (updatedUser) => {
    setProfile(updatedUser);
  };

  const handleDonorRegistered = (updatedUser) => {
    setProfile(updatedUser);
  };

  const handleToggleAvailability = async () => {
    if (!profile || !profile.isDonor) return;
    setToggleLoading(true);
    try {
      const newStatus = profile.availability === 'Available' ? 'Unavailable' : 'Available';
      const res = await authService.toggleAvailability(profile.email, newStatus);
      if (res.success) {
        setProfile(res.user);
      }
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Profile Details...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <header className="dashboard-header">
        <div className="dashboard-logo" onClick={() => navigate('/dashboard')} style={{cursor: 'pointer'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#ff4d4d" stroke="#d32f2f"/>
            <path d="M12 6V18" stroke="white" strokeWidth="3"/>
            <path d="M8 12H16" stroke="white" strokeWidth="3"/>
          </svg>
          <span className="logo-text">KCT LifeFlow</span>
        </div>

        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-outline btn-sm">
            Dashboard
          </button>
          <button onClick={() => navigate('/requests')} className="btn btn-outline btn-sm">
            Blood Requests
          </button>
        </div>
      </header>

      {/* Profile Main Body */}
      <main className="dashboard-main">
        <div className="requests-heading-section">
          <h1>Account & Donor Profile</h1>
          <p>Manage your personal details, donor status, and availability settings.</p>
        </div>

        <div className="dashboard-grid">
          {/* Column 1: Donor Status & ID Card */}
          <div className="dashboard-card" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <div className="profile-user-summary" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div className="user-avatar" style={{width: '60px', height: '60px', fontSize: '1.5rem'}}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{fontSize: '1.35rem', fontWeight: '700'}}>{profile.name}</h2>
                <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)'}}>{profile.email}</p>
                <span className="badge badge-neutral" style={{marginTop: '0.25rem'}}>
                  {profile.department || 'KCT Student/Staff'}
                </span>
              </div>
            </div>

            {/* US-05: Real-time Availability Toggle */}
            {profile.isDonor ? (
              <div className="availability-card" style={{
                backgroundColor: profile.availability === 'Available' ? 'var(--color-success-light)' : 'var(--color-bg-base)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span className="detail-lbl">DONOR AVAILABILITY STATUS (US-05)</span>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem'}}>
                    <span className={`status-badge ${profile.availability === 'Available' ? 'status-available' : 'badge-neutral'}`} style={{fontSize: '0.9rem'}}>
                      {profile.availability === 'Available' ? '● Available for Emergency Requests' : '○ Currently Unavailable'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleToggleAvailability}
                  className={`btn btn-sm ${profile.availability === 'Available' ? 'btn-outline' : 'btn-primary'}`}
                  disabled={toggleLoading}
                >
                  {toggleLoading ? 'Updating...' : profile.availability === 'Available' ? 'Set Unavailable' : 'Set Available'}
                </button>
              </div>
            ) : (
              <div className="alert alert-error" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem'}}>
                <strong>Not Registered as Blood Donor</strong>
                <p style={{fontSize: '0.85rem'}}>Registering as a donor allows emergency requesters to match with your blood type.</p>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="btn btn-primary btn-sm"
                  style={{marginTop: '0.5rem'}}
                >
                  Register as Donor (US-04)
                </button>
              </div>
            )}

            {/* Digital ID Card */}
            {profile.isDonor && (
              <div className="donor-id-card">
                <h3>KCT Donor Digital Card</h3>
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
                    <div className="info-row-group">
                      <div className="info-row">
                        <span className="info-lbl">ELIGIBILITY</span>
                        <span className={`info-val ${profile.eligibility === 'Eligible' ? 'text-success' : 'text-muted'}`}>
                          {profile.eligibility || 'Eligible'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-lbl">WEIGHT</span>
                        <span className="info-val">{profile.weight ? `${profile.weight} kg` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Edit Profile Form */}
          <div className="dashboard-card">
            <ProfileForm 
              userProfile={profile} 
              onProfileUpdated={handleProfileUpdated} 
            />
          </div>
        </div>
      </main>

      {/* Modal for Donor Registration */}
      <DonorRegistrationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userEmail={profile.email}
        onDonorRegistered={handleDonorRegistered}
      />
    </div>
  );
};

export default ProfilePage;
