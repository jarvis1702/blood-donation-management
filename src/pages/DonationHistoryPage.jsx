import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authService } from '../services/authService';
import { donationHistoryService } from '../services/donationHistoryService';
import { cloudSync } from '../services/cloudSync';

const DonationHistoryPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalUnits: 0,
    livesSaved: 0,
    lastDonationDate: null,
    daysSinceLastDonation: null,
    isEligible: true,
    daysRemaining: 0,
    nextEligibleDate: 'Immediate',
    cooldownProgressPercent: 100
  });

  // Modal states
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logFormData, setLogFormData] = useState({
    donationDate: new Date().toISOString().split('T')[0],
    venue: '',
    donationType: 'Campus Blood Drive',
    units: 1,
    bloodGroup: 'O+',
    hemoglobin: '13.5',
    bloodPressure: '120/80',
    remarks: ''
  });
  const [logError, setLogError] = useState('');
  const [logSuccess, setLogSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      const profile = authService.getCurrentUserProfile() || authService.getCurrentUser();
      setCurrentUser(profile);
      loadDonationData(profile.email, profile.bloodGroup);

      // Live multi-device cloud listener
      const unsubscribe = cloudSync.subscribe(() => {
        loadDonationData(profile.email, profile.bloodGroup);
      });
      return () => unsubscribe();
    }
  }, [navigate]);

  const loadDonationData = (email, bloodGroup) => {
    if (!email) return;
    const userDonations = donationHistoryService.getUserDonations(email);
    const userStats = donationHistoryService.getDonorStats(email);
    setDonations(userDonations);
    setStats(userStats);
    setLogFormData(prev => ({
      ...prev,
      bloodGroup: bloodGroup || 'O+'
    }));
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setLogError('');
    setLogSuccess('');

    if (!logFormData.venue.trim()) {
      setLogError('Please enter the donation venue or hospital name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await donationHistoryService.logDonation(currentUser.email, {
        ...logFormData,
        donorName: currentUser.name
      });
      if (res.success) {
        setLogSuccess('Donation record logged successfully!');
        loadDonationData(currentUser.email, currentUser.bloodGroup);
        setTimeout(() => {
          setIsLogModalOpen(false);
          setLogSuccess('');
          setLogFormData(prev => ({
            ...prev,
            venue: '',
            remarks: ''
          }));
        }, 1200);
      }
    } catch (err) {
      setLogError(err.message || 'Failed to record donation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar activePage="/history" />

      <main className="dashboard-main">
        {/* Page Header */}
        <div className="requests-heading-section page-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1>Personal Donation History & Impact</h1>
            <p>Verify your past blood donations, monitor your 90-day cooldown status, and download official YRC certificates.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={() => setIsLogModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>➕</span> Log Past Donation
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => navigate('/camps')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>🎪</span> View Upcoming Camps
            </button>
          </div>
        </div>

        {/* 4 Impact Summary KPI Cards */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Lifetime Donations</span>
              <span className="stat-icon" style={{ background: '#ffebee', color: '#c62828' }}>🩸</span>
            </div>
            <div className="stat-value">{stats.totalDonations}</div>
            <div className="stat-desc">Verified donation events</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Units Contributed</span>
              <span className="stat-icon" style={{ background: '#e3f2fd', color: '#1565c0' }}>🧪</span>
            </div>
            <div className="stat-value">{stats.totalUnits} <span style={{ fontSize: '1rem', fontWeight: 500 }}>Units</span></div>
            <div className="stat-desc">{currentUser?.bloodGroup || 'O+'} Blood Group</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Estimated Lives Saved</span>
              <span className="stat-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}>❤️</span>
            </div>
            <div className="stat-value" style={{ color: '#2e7d32' }}>{stats.livesSaved}</div>
            <div className="stat-desc">3 lives per blood unit</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Next Eligible Date</span>
              <span className="stat-icon" style={{ background: stats.isEligible ? '#e8f5e9' : '#fff3e0', color: stats.isEligible ? '#2e7d32' : '#e65100' }}>
                {stats.isEligible ? '✅' : '⏳'}
              </span>
            </div>
            <div className="stat-value" style={{ fontSize: stats.isEligible ? '1.5rem' : '1.35rem', color: stats.isEligible ? '#2e7d32' : '#e65100' }}>
              {stats.isEligible ? 'Eligible Now' : stats.nextEligibleDate}
            </div>
            <div className="stat-desc">
              {stats.isEligible 
                ? 'Cleared 90-day clinical cooldown' 
                : `${stats.daysRemaining} days remaining in cooldown`}
            </div>
          </div>
        </div>

        {/* Cooldown Progress Bar Widget */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', borderLeft: stats.isEligible ? '4px solid #2e7d32' : '4px solid #f57c00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <strong>90-Day Medical Cooldown Tracker</strong>
              <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '0.5rem' }}>
                (Mandatory rest period between whole blood donations to replenish iron & red cells)
              </span>
            </div>
            <span className={`badge ${stats.isEligible ? 'badge-success' : 'badge-warning'}`}>
              {stats.isEligible ? 'Ready to Donate' : `${stats.daysRemaining} Days Left`}
            </span>
          </div>

          <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${stats.cooldownProgressPercent}%`, 
                height: '100%', 
                background: stats.isEligible ? 'linear-gradient(90deg, #43a047, #2e7d32)' : 'linear-gradient(90deg, #ff9800, #f57c00)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#777', marginTop: '0.4rem' }}>
            <span>Last Donated: {stats.lastDonationDate || 'No past donations recorded'}</span>
            <span>{stats.daysSinceLastDonation !== null ? `${stats.daysSinceLastDonation} days elapsed` : 'Ready'}</span>
          </div>
        </div>

        {/* Donation Records Timeline & Certificates */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎖️</span> Donation Log & Digital Certificates
            </h2>
            <span className="badge badge-info">{donations.length} Records Found</span>
          </div>

          {donations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🩸</div>
              <h3>No Donation Records Yet</h3>
              <p style={{ maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
                When you donate blood at a campus drive or external hospital, your contribution will be logged here with an official certificate.
              </p>
              <button className="btn btn-primary" onClick={() => setIsLogModalOpen(true)}>
                Log My First Donation
              </button>
            </div>
          ) : (
            <div className="donations-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {donations.map((don) => (
                <div 
                  key={don.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    background: '#fafafa',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div 
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '8px',
                        background: '#ffebee',
                        color: '#c62828',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        flexShrink: 0
                      }}
                    >
                      {don.bloodGroup}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.05rem', color: '#212121' }}>{don.venue}</strong>
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>✓ Verified</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
                        <span>📅 {don.donationDate}</span> • <span>💉 {don.units} Unit ({don.donationType})</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>Hb: <strong>{don.hemoglobin}</strong></span>
                        <span>BP: <strong>{don.bloodPressure}</strong></span>
                        <span>Cert ID: <code style={{ color: '#0d47a1' }}>{don.certificateId}</code></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedCertificate(don)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#1976d2', color: '#1976d2' }}
                    >
                      <span>📜</span> View Certificate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Log Past Donation Modal */}
      {isLogModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLogModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>➕ Log Past Blood Donation</h2>
              <button className="modal-close-btn" onClick={() => setIsLogModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleLogSubmit} style={{ marginTop: '1rem' }}>
              {logError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{logError}</div>}
              {logSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{logSuccess}</div>}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Donation Date *</label>
                <input 
                  type="date"
                  className="form-control"
                  value={logFormData.donationDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setLogFormData({ ...logFormData, donationDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Hospital / Camp Venue *</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="e.g. CMCH Blood Bank, RAA Auditorium KCT"
                  value={logFormData.venue}
                  onChange={(e) => setLogFormData({ ...logFormData, venue: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select 
                    className="form-control"
                    value={logFormData.bloodGroup}
                    onChange={(e) => setLogFormData({ ...logFormData, bloodGroup: e.target.value })}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Units Donated</label>
                  <input 
                    type="number"
                    className="form-control"
                    min="1"
                    max="2"
                    value={logFormData.units}
                    onChange={(e) => setLogFormData({ ...logFormData, units: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Hemoglobin (g/dL)</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="e.g. 13.5"
                    value={logFormData.hemoglobin}
                    onChange={(e) => setLogFormData({ ...logFormData, hemoglobin: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Blood Pressure</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="e.g. 120/80"
                    value={logFormData.bloodPressure}
                    onChange={(e) => setLogFormData({ ...logFormData, bloodPressure: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Drive / Event Type</label>
                <select 
                  className="form-control"
                  value={logFormData.donationType}
                  onChange={(e) => setLogFormData({ ...logFormData, donationType: e.target.value })}
                >
                  <option value="Campus Blood Drive">Campus Blood Drive (YRC)</option>
                  <option value="Emergency Hospital Request">Emergency Hospital Request</option>
                  <option value="Voluntary Walk-in Blood Bank">Voluntary Walk-in Blood Bank</option>
                  <option value="Replacement Donation">Replacement Donation for Relative</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setIsLogModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Record Donation & Issue Cert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Certificate Modal */}
      {selectedCertificate && (
        <div className="modal-backdrop" onClick={() => setSelectedCertificate(null)}>
          <div 
            className="modal-content certificate-modal-wrap" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', padding: '0', overflow: 'hidden', border: '8px solid #c62828' }}
          >
            {/* Certificate Header Banner */}
            <div style={{ background: '#c62828', color: 'white', padding: '1.25rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.9 }}>
                Kumaraguru College of Technology, Coimbatore
              </div>
              <h2 style={{ margin: '0.25rem 0', fontSize: '1.5rem', color: '#fff', letterSpacing: '1px' }}>
                YOUTH RED CROSS & BLOOD DONORS CLUB
              </h2>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Affiliated to Anna University • Accredited by NAAC</div>
            </div>

            {/* Certificate Body */}
            <div style={{ padding: '2rem 2.5rem', background: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#b71c1c', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '1rem' }}>
                ✦ CERTIFICATE OF APPRECIATION ✦
              </div>

              <p style={{ fontSize: '1.05rem', color: '#555', margin: '0 0 1rem 0' }}>
                This is to certify and honour the humanitarian contribution of
              </p>

              <h1 style={{ fontSize: '2rem', color: '#b71c1c', margin: '0.5rem 0 1rem 0', fontFamily: 'Georgia, serif' }}>
                {selectedCertificate.donorName}
              </h1>

              <p style={{ fontSize: '1rem', color: '#444', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.5rem auto' }}>
                for voluntarily donating <strong>{selectedCertificate.units} Unit</strong> of{' '}
                <span style={{ color: '#c62828', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  [{selectedCertificate.bloodGroup}]
                </span>{' '}
                blood at <strong>{selectedCertificate.venue}</strong> on{' '}
                <strong>{selectedCertificate.donationDate}</strong>. Your generous gift of life empowers our community and supports critical trauma care.
              </p>

              {/* Certificate Meta Details */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '0.75rem', 
                background: '#f9f9f9', 
                padding: '0.85rem', 
                borderRadius: '6px',
                border: '1px dashed #ccc',
                marginBottom: '1.75rem',
                fontSize: '0.85rem'
              }}>
                <div>
                  <div style={{ color: '#777' }}>Certificate No.</div>
                  <strong style={{ color: '#0d47a1' }}>{selectedCertificate.certificateId}</strong>
                </div>
                <div>
                  <div style={{ color: '#777' }}>Verified Vitals</div>
                  <strong>Hb: {selectedCertificate.hemoglobin}</strong>
                </div>
                <div>
                  <div style={{ color: '#777' }}>Donation Type</div>
                  <strong>{selectedCertificate.donationType}</strong>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem', padding: '0 1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #777', width: '130px', margin: '0 auto 0.35rem auto' }}></div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>Dr. R. Arumugam</div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>Medical Officer, Blood Bank</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    width: '65px', 
                    height: '65px', 
                    border: '2px solid #c62828', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 0.25rem auto',
                    color: '#c62828',
                    fontWeight: 'bold',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    lineHeight: 1.1
                  }}>
                    KCT YRC<br/>SEAL
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #777', width: '130px', margin: '0 auto 0.35rem auto' }}></div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>Program Officer</div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>Youth Red Cross, KCT</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ background: '#f5f5f5', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e0e0e0' }}>
              <button className="btn btn-outline" onClick={() => setSelectedCertificate(null)}>
                Close
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handlePrintCertificate}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>🖨️</span> Print / Save Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationHistoryPage;
