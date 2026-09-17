import React, { useState, useEffect } from 'react';
import { bloodRequestService } from '../../services/bloodRequestService';
import { authService } from '../../services/authService';

const DonorMatchingList = ({ request, onClose, onRequestUpdated }) => {
  const [matchingData, setMatchingData] = useState({
    matches: [],
    totalChecked: 0,
    matchCount: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [notifiedDonors, setNotifiedDonors] = useState({});
  const [notifySuccess, setNotifySuccess] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);

  const currentUserProfile = authService.getCurrentUserProfile();

  useEffect(() => {
    let isMounted = true;
    
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await bloodRequestService.getMatchingDonors(request.bloodGroup);
        if (isMounted && res.success) {
          setMatchingData(res);
        }
      } catch (err) {
        console.error('Error matching donors:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (request && request.bloodGroup) {
      fetchMatches();
    }

    return () => {
      isMounted = false;
    };
  }, [request]);

  const handleNotifyDonor = (email, name) => {
    setNotifiedDonors((prev) => ({ ...prev, [email]: true }));
    setNotifySuccess(`Notification alert successfully sent to eligible donor: ${name}`);
    
    setTimeout(() => {
      setNotifySuccess('');
    }, 3500);
  };

  const handleAcceptRequest = async () => {
    if (!currentUserProfile) return;
    setAcceptLoading(true);
    setNotifySuccess('');

    try {
      const res = await bloodRequestService.respondToRequest(request.id, currentUserProfile);
      if (res.success) {
        setNotifySuccess('🎉 Thank you for accepting! You are registered as a volunteered donor for this request.');
        if (onRequestUpdated) {
          onRequestUpdated(res.request);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to accept request.');
    } finally {
      setAcceptLoading(false);
    }
  };

  const getUrgencyClass = (urgency) => {
    switch (urgency) {
      case 'High': return 'urgency-high';
      case 'Medium': return 'urgency-medium';
      case 'Low': return 'urgency-low';
      default: return '';
    }
  };

  // Eligibility check for logged-in user to accept
  const isUserMatch = currentUserProfile && 
    currentUserProfile.isDonor &&
    currentUserProfile.bloodGroup === request.bloodGroup &&
    currentUserProfile.availability === 'Available' &&
    currentUserProfile.eligibility === 'Eligible';

  const hasUserAlreadyAccepted = request.volunteeredDonors && 
    request.volunteeredDonors.some(d => d.email.toLowerCase() === (currentUserProfile?.email || '').toLowerCase());

  return (
    <div className="matching-panel-card">
      <div className="matching-panel-header">
        <div className="title-wrapper">
          <span className="badge badge-outline">{request.id}</span>
          <h2>Smart Donor Matcher</h2>
        </div>
        <button onClick={onClose} className="btn-close-panel" aria-label="Close panel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Request details summary */}
      <div className="matching-request-details">
        <h3>Request Specifications</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-lbl">Patient Name</span>
            <span className="detail-val">{request.patientName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-lbl">Blood Group Required</span>
            <span className="detail-val text-blood-type">{request.bloodGroup}</span>
          </div>
          <div className="detail-item">
            <span className="detail-lbl">Urgency</span>
            <span className={`detail-val urgency-badge ${getUrgencyClass(request.urgency)}`}>
              {request.urgency}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-lbl">Units Required</span>
            <span className="detail-val">{request.unitsRequired} Pint(s)</span>
          </div>
          <div className="detail-item full-width">
            <span className="detail-lbl">Hospital / Destination</span>
            <span className="detail-val">{request.hospital}</span>
          </div>
        </div>
      </div>

      {/* Donor Action Box: Accept / Donate */}
      {isUserMatch && (
        <div style={{
          backgroundColor: 'var(--color-primary-light)',
          border: '1px solid rgba(211, 47, 47, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-primary)', display: 'block'}}>
              ❤️ You are Eligible to Donate for this Request!
            </span>
            <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>
              Your blood group ({currentUserProfile.bloodGroup}) matches this emergency demand.
            </span>
          </div>

          <button
            onClick={handleAcceptRequest}
            className={`btn btn-sm ${hasUserAlreadyAccepted ? 'btn-outline' : 'btn-primary'}`}
            disabled={acceptLoading || hasUserAlreadyAccepted}
          >
            {hasUserAlreadyAccepted ? '✓ Accepted / Volunteered' : acceptLoading ? 'Accepting...' : 'Accept Request & Donate'}
          </button>
        </div>
      )}

      {/* Volunteered Donors List (if any accepted) */}
      {request.volunteeredDonors && request.volunteeredDonors.length > 0 && (
        <div style={{
          backgroundColor: '#e8f5e9',
          border: '1px solid rgba(46, 125, 50, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{fontSize: '0.85rem', fontWeight: '700', color: '#2e7d32', marginBottom: '0.5rem'}}>
            🤝 Accepted / Volunteered Donors ({request.volunteeredDonors.length})
          </h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {request.volunteeredDonors.map(donor => (
              <div key={donor.email} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem'}}>
                <div>
                  <span style={{fontWeight: '600'}}>{donor.name}</span> ({donor.email})
                </div>
                <span className="status-badge status-available" style={{fontSize: '0.7rem'}}>
                  ✓ Contact: {donor.phone || '9876543210'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notifySuccess && (
        <div className="alert alert-success animate-fade-in" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{notifySuccess}</span>
        </div>
      )}

      {/* Match Results */}
      <div className="matching-results-section">
        <div className="results-header">
          <h3>Eligible Matching Donors</h3>
          {!loading && (
            <span className="match-stats-label">
              Found <strong>{matchingData.matchCount}</strong> match(es) from <strong>{matchingData.totalChecked}</strong> registered users
            </span>
          )}
        </div>

        {loading ? (
          <div className="matching-loading">
            <div className="spinner"></div>
            <p>Running smart matching filter...</p>
            <span className="filter-detail-note">Checking blood groups, availability indexes, and donor eligibility cooldowns...</span>
          </div>
        ) : (
          <div className="matching-donors-list">
            {matchingData.matches.length === 0 ? (
              <div className="no-matches-fallback">
                <span className="fallback-icon">🔍</span>
                <h4>No Matching Donors Found</h4>
                <p>
                  No donors match the blood group <strong>{request.bloodGroup}</strong> who are currently marked as both <strong>Available</strong> and <strong>Eligible</strong> (non-recent donation).
                </p>
              </div>
            ) : (
              <div className="donors-table-wrapper">
                <table className="donors-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Blood Group</th>
                      <th>Availability</th>
                      <th>Eligibility Status</th>
                      <th>Coordinate Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingData.matches.map((donor) => (
                      <tr key={donor.email}>
                        <td>
                          <div className="donor-info-cell">
                            <span className="donor-name-text">{donor.name}</span>
                            <span className="donor-email-text">{donor.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className="table-blood-group-badge">{donor.bloodGroup}</span>
                        </td>
                        <td>
                          <span className="status-badge status-available">
                            {donor.availability}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge status-eligible">
                            {donor.eligibility}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleNotifyDonor(donor.email, donor.name)}
                            className={`btn btn-sm ${notifiedDonors[donor.email] ? 'btn-outline' : 'btn-primary'}`}
                            disabled={notifiedDonors[donor.email]}
                          >
                            {notifiedDonors[donor.email] ? (
                              <span className="notified-text">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight: '4px'}}>
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Coordinated
                              </span>
                            ) : (
                              'Coordinate Match'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorMatchingList;
