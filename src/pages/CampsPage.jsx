import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authService } from '../services/authService';
import { campService } from '../services/campService';
import { notificationService } from '../services/notificationService';

const CampsPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [camps, setCamps] = useState([]);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [activeCampForBooking, setActiveCampForBooking] = useState(null);
  const [bookingType, setBookingType] = useState('donor'); // 'donor' or 'volunteer'
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedVolunteerRole, setSelectedVolunteerRole] = useState('');
  const [phone, setPhone] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      const profile = authService.getCurrentUserProfile();
      setCurrentUser(profile);
      setPhone(profile?.phone || '');
      loadCampsData(profile?.email);
    }
  }, [navigate]);

  const loadCampsData = (email) => {
    const allCamps = campService.getCamps();
    setCamps(allCamps);
    if (email) {
      const regs = campService.getUserRegistrations(email);
      setUserRegistrations(regs);
    }
  };

  const handleOpenBooking = (camp, type) => {
    setActiveCampForBooking(camp);
    setBookingType(type);
    setSelectedSlot(camp.slots?.[0]?.time || '');
    setSelectedVolunteerRole(camp.volunteerNeeds?.[0]?.role || '');
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleCloseModal = () => {
    setActiveCampForBooking(null);
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleConfirmRegistration = (e) => {
    e.preventDefault();
    if (!activeCampForBooking || !currentUser) return;
    setSubmitError('');
    setIsSubmitting(true);

    try {
      if (bookingType === 'donor' && !selectedSlot) {
        throw new Error('Please select a preferred donation time slot');
      }
      if (bookingType === 'volunteer' && !selectedVolunteerRole) {
        throw new Error('Please select a volunteer task role');
      }

      const res = campService.registerForCamp(activeCampForBooking.id, {
        userEmail: currentUser.email,
        userName: currentUser.name,
        phone: phone || currentUser.phone || '9876543210',
        department: currentUser.department || 'Student',
        bloodGroup: currentUser.bloodGroup || 'Not Specified',
        type: bookingType,
        selectedSlot: bookingType === 'donor' ? selectedSlot : null,
        volunteerRole: bookingType === 'volunteer' ? selectedVolunteerRole : null
      });

      if (res.success) {
        setSubmitSuccess(`Registration confirmed! You have successfully registered as a ${bookingType}.`);
        
        // Trigger notification
        notificationService.addNotification({
          title: `🎟️ Camp ${bookingType === 'donor' ? 'Slot Booked' : 'Volunteer Enrolled'}!`,
          message: `Your spot for ${activeCampForBooking.title} on ${activeCampForBooking.date} is confirmed.`,
          type: 'camp',
          link: '/camps'
        });

        loadCampsData(currentUser.email);
        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRegistration = (regId) => {
    if (window.confirm('Are you sure you want to cancel this camp booking?')) {
      campService.cancelRegistration(regId);
      loadCampsData(currentUser.email);
    }
  };

  // Filter camps
  const filteredCamps = camps.filter(camp => {
    const matchesStatus = filterStatus === 'ALL' || camp.status === filterStatus;
    const matchesSearch = 
      camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.organizerClub.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      <Navbar activePage="/camps" />

      <main className="dashboard-main layout-with-sidebar-panel">
        <div className="main-requests-content">
          
          {/* Section Header */}
          <div className="camps-hero-banner">
            <div>
              <h1>🎪 Campus Blood Donation Drives & Camps (SCRUM-20, 21)</h1>
              <p>Explore upcoming donation camps organized by YRC, NSS, and campus blood clubs. Book a donation slot or sign up as a student volunteer.</p>
            </div>
            {authService.getCurrentUserProfile()?.role === 'Club Member' || authService.getCurrentUserProfile()?.role === 'Admin' ? (
              <button 
                onClick={() => navigate('/club')} 
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                🛡️ Open Club Management Portal
              </button>
            ) : null}
          </div>

          {/* User's Active Registrations / Digital Passes Section */}
          {userRegistrations.length > 0 && (
            <div className="my-registrations-card">
              <div className="my-regs-header">
                <h3>🎟️ My Camp Passes & Confirmed Registrations ({userRegistrations.length})</h3>
                <span className="badge badge-info">Active Slots</span>
              </div>
              <div className="passes-grid">
                {userRegistrations.map((reg) => (
                  <div key={reg.id} className="digital-camp-pass">
                    <div className="pass-top">
                      <span className="pass-type-pill">
                        {reg.type === 'donor' ? '🩸 Camp Donor Pass' : '🤝 Volunteer Pass'}
                      </span>
                      <span className="pass-id">{reg.id}</span>
                    </div>
                    <h4 className="pass-title">{reg.campTitle}</h4>
                    <div className="pass-meta">
                      <p><strong>📅 Date:</strong> {reg.campDate}</p>
                      <p><strong>📍 Venue:</strong> {reg.venue}</p>
                      {reg.type === 'donor' ? (
                        <p><strong>⏰ Confirmed Slot:</strong> <span className="slot-highlight">{reg.selectedSlot}</span></p>
                      ) : (
                        <p><strong>💼 Volunteer Duty:</strong> <span className="slot-highlight">{reg.volunteerRole}</span></p>
                      )}
                    </div>
                    <div className="pass-footer">
                      <span className="pass-verified-text">✓ Verified by KCT LifeFlow</span>
                      <button 
                        onClick={() => handleCancelRegistration(reg.id)} 
                        className="btn-cancel-pass"
                      >
                        Cancel Slot
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="camps-filter-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search camp by name, venue, or organizing club..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="status-pills-filter">
              {['ALL', 'Scheduled', 'Upcoming', 'Completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`filter-pill-btn ${filterStatus === status ? 'active' : ''}`}
                >
                  {status === 'ALL' ? 'All Camps' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Camps Cards Grid */}
          <div className="camps-cards-grid">
            {filteredCamps.length === 0 ? (
              <div className="no-requests-fallback" style={{ gridColumn: '1 / -1' }}>
                <span className="fallback-icon">⛺</span>
                <h3>No Camps Found</h3>
                <p>No donation camps match your current search criteria.</p>
              </div>
            ) : (
              filteredCamps.map((camp) => {
                const isRegistered = userRegistrations.some(r => r.campId === camp.id);
                return (
                  <div key={camp.id} className="camp-card">
                    <div className="camp-card-header">
                      <span className="camp-club-badge">{camp.organizerClub}</span>
                      <span className={`status-badge ${camp.status === 'Completed' ? 'badge-neutral' : 'status-available'}`}>
                        {camp.status}
                      </span>
                    </div>

                    <h3 className="camp-title">{camp.title}</h3>
                    <p className="camp-description">{camp.description}</p>

                    <div className="camp-details-list">
                      <div className="camp-detail-item">
                        <span className="icon">📅</span>
                        <span><strong>Date:</strong> {camp.date} ({camp.time})</span>
                      </div>
                      <div className="camp-detail-item">
                        <span className="icon">📍</span>
                        <span><strong>Venue:</strong> {camp.venue}</span>
                      </div>
                      <div className="camp-detail-item">
                        <span className="icon">🏥</span>
                        <span><strong>Blood Bank:</strong> {camp.partnerHospital}</span>
                      </div>
                      <div className="camp-detail-item">
                        <span className="icon">🎯</span>
                        <span><strong>Target Goal:</strong> {camp.targetUnits} Blood Units</span>
                      </div>
                    </div>

                    {/* Available Time Slots Preview */}
                    <div className="slots-preview-section">
                      <strong>🕒 Available Time Slots:</strong>
                      <div className="slots-pill-group">
                        {camp.slots?.map((s, idx) => (
                          <span key={idx} className="slot-mini-badge" title={`${s.booked}/${s.capacity} slots booked`}>
                            {s.time}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="camp-card-actions">
                      <button 
                        onClick={() => handleOpenBooking(camp, 'donor')}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        🩸 Book Donor Slot
                      </button>
                      <button 
                        onClick={() => handleOpenBooking(camp, 'volunteer')}
                        className="btn btn-outline btn-sm flex-1"
                      >
                        🤝 Volunteer for Camp
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal for Slot Booking & Volunteer Registration */}
        {activeCampForBooking && (
          <div className="drawer-overlay-backdrop" onClick={handleCloseModal}>
            <div className="camp-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {bookingType === 'donor' ? '🩸 Book Camp Donation Slot (SCRUM-21)' : '🤝 Register as Student Volunteer (SCRUM-21)'}
                </h3>
                <button onClick={handleCloseModal} className="btn-close-modal">✕</button>
              </div>

              <form onSubmit={handleConfirmRegistration} className="camp-booking-form">
                <div className="modal-camp-summary">
                  <h4>{activeCampForBooking.title}</h4>
                  <p>📍 {activeCampForBooking.venue} | 📅 {activeCampForBooking.date}</p>
                </div>

                {submitError && <div className="alert-box alert-error">{submitError}</div>}
                {submitSuccess && <div className="alert-box alert-success">{submitSuccess}</div>}

                {/* User info confirmation */}
                <div className="form-group">
                  <label>Participant Name</label>
                  <input type="text" value={currentUser?.name || ''} readOnly className="form-control read-only" />
                </div>

                <div className="form-group">
                  <label>KCT Institutional Email</label>
                  <input type="text" value={currentUser?.email || ''} readOnly className="form-control read-only" />
                </div>

                <div className="form-group">
                  <label>Contact Phone Number *</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    required 
                    placeholder="Enter 10-digit mobile number"
                    className="form-control" 
                  />
                </div>

                {bookingType === 'donor' ? (
                  <>
                    <div className="form-group">
                      <label>Blood Group</label>
                      <input 
                        type="text" 
                        value={currentUser?.bloodGroup || 'O+'} 
                        readOnly 
                        className="form-control read-only" 
                      />
                    </div>

                    <div className="form-group">
                      <label>Select Preferred Time Slot *</label>
                      <select 
                        value={selectedSlot} 
                        onChange={(e) => setSelectedSlot(e.target.value)} 
                        className="form-control"
                        required
                      >
                        {activeCampForBooking.slots?.map((s, idx) => (
                          <option key={idx} value={s.time}>
                            {s.time} ({s.capacity - (s.booked || 0)} slots available)
                          </option>
                        ))}
                      </select>
                      <small className="form-helper">Booking a slot prevents long waiting queues during campus drive hours.</small>
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label>Select Volunteer Role *</label>
                    <select 
                      value={selectedVolunteerRole} 
                      onChange={(e) => setSelectedVolunteerRole(e.target.value)} 
                      className="form-control"
                      required
                    >
                      {activeCampForBooking.volunteerNeeds?.map((v, idx) => (
                        <option key={idx} value={v.role}>
                          {v.role} ({v.slotsNeeded - (v.filled || 0)} volunteers needed)
                        </option>
                      ))}
                    </select>
                    <small className="form-helper">Volunteers receive institutional NSS/YRC duty certificate and service credits.</small>
                  </div>
                )}

                <div className="modal-actions-footer">
                  <button type="button" onClick={handleCloseModal} className="btn btn-outline">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                    {isSubmitting ? 'Confirming...' : 'Confirm Registration'}
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

export default CampsPage;
