import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { bloodRequestService } from '../services/bloodRequestService';
import BloodRequestForm from '../components/requests/BloodRequestForm';
import DonorMatchingList from '../components/requests/DonorMatchingList';

const RequestPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Auth Protection Check
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      const profile = authService.getCurrentUserProfile();
      setCurrentUserProfile(profile);
      fetchRequests();
    }
  }, [navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await bloodRequestService.getRequests();
      setRequests(res);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCreated = (newRequest) => {
    fetchRequests();
    setSelectedRequest(newRequest);
    setActiveTab('list');
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const res = await bloodRequestService.updateRequestStatus(requestId, newStatus);
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
        );
        if (selectedRequest && selectedRequest.id === requestId) {
          setSelectedRequest((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const canEditRequestStatus = (req) => {
    if (!currentUserProfile) return false;
    const userEmail = currentUserProfile.email ? currentUserProfile.email.toLowerCase() : '';
    const creatorEmail = req.createdBy ? req.createdBy.toLowerCase() : '';
    const isOwner = userEmail && creatorEmail && userEmail === creatorEmail;
    const isAdminOrClub = currentUserProfile.role === 'Admin' || currentUserProfile.role === 'Club Member';
    return isOwner || isAdminOrClub;
  };

  const getUrgencyBadgeClass = (urgency) => {
    switch (urgency) {
      case 'High': return 'badge-danger';
      case 'Medium': return 'badge-warning';
      case 'Low': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Accepted': return 'status-available';
      case 'Fulfilled': return 'status-available';
      case 'Matching': return 'badge-info';
      case 'Coordinated': return 'badge-warning';
      case 'Cancelled': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
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
          <button onClick={() => navigate('/profile')} className="btn btn-outline btn-sm">
            Profile ({currentUserProfile?.role || 'User'})
          </button>
        </div>
      </header>

      {/* Main Request Workspace */}
      <main className="dashboard-main layout-with-sidebar-panel">
        <div className="main-requests-content">
          {/* Section Heading */}
          <div className="requests-heading-section">
            <h1>Emergency Blood Request Management</h1>
            <p>Monitor real-time blood needs, track request status (US-07), or post a new demand.</p>
          </div>

          {/* Navigation Tabs */}
          <div className="requests-tabs">
            <button
              onClick={() => setActiveTab('list')}
              className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            >
              Active Request Log ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            >
              Post Emergency Request (US-06)
            </button>
          </div>

          {/* Tab Workspaces */}
          <div className="requests-tab-workspace">
            {activeTab === 'new' ? (
              <div className="form-centered-container">
                <BloodRequestForm onRequestCreated={handleRequestCreated} />
              </div>
            ) : (
              <div className="requests-list-panel">
                {loading ? (
                  <div className="dashboard-loading" style={{minHeight: '200px'}}>
                    <div className="spinner"></div>
                    <p>Loading emergency requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="no-requests-fallback">
                    <span className="fallback-icon">📋</span>
                    <h3>No Active Blood Requests</h3>
                    <p>There are no emergency blood requests recorded currently. If you need blood support, post a request.</p>
                    <button onClick={() => setActiveTab('new')} className="btn btn-primary" style={{marginTop: '1rem'}}>
                      Post Request
                    </button>
                  </div>
                ) : (
                  <div className="requests-table-card">
                    <table className="requests-log-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Patient Name</th>
                          <th>Group</th>
                          <th>Units</th>
                          <th>Location</th>
                          <th>Urgency</th>
                          <th>Tracking Status (US-07)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req) => {
                          const canEdit = canEditRequestStatus(req);
                          return (
                            <tr 
                              key={req.id}
                              className={selectedRequest && selectedRequest.id === req.id ? 'active-row' : ''}
                            >
                              <td>
                                <span className="req-id-badge">{req.id}</span>
                              </td>
                              <td className="font-semibold">{req.patientName}</td>
                              <td>
                                <span className="table-blood-group-badge">{req.bloodGroup}</span>
                              </td>
                              <td>{req.unitsRequired} Pint(s)</td>
                              <td className="location-cell" title={req.hospital}>{req.hospital}</td>
                              <td>
                                <span className={`urgency-pill ${getUrgencyBadgeClass(req.urgency)}`}>
                                  {req.urgency}
                                </span>
                              </td>
                              {/* US-07 Request Status Tracker - Permission Protected */}
                              <td>
                                {canEdit ? (
                                  <select
                                    value={req.status || 'Pending'}
                                    onChange={(e) => handleStatusChange(req.id, e.target.value)}
                                    className={`status-select ${getStatusBadgeClass(req.status || 'Pending')}`}
                                    style={{
                                      padding: '0.2rem 0.5rem',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--color-border)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Accepted">Accepted</option>
                                    <option value="Matching">Matching</option>
                                    <option value="Coordinated">Coordinated</option>
                                    <option value="Fulfilled">Fulfilled</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                ) : (
                                  <span 
                                    className={`status-badge ${getStatusBadgeClass(req.status || 'Pending')}`}
                                    title="Only the request author, Club Members, or Admins can edit tracking status."
                                  >
                                    {req.status || 'Pending'}
                                  </span>
                                )}
                              </td>
                              <td>
                                <button
                                  onClick={() => setSelectedRequest(req)}
                                  className={`btn btn-sm ${selectedRequest && selectedRequest.id === req.id ? 'btn-primary' : 'btn-outline'}`}
                                >
                                  Smart Match (US-08)
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Smart Matching Drawer Sidebar Panel */}
        {selectedRequest && (
          <aside className="sidebar-drawer-matching active">
            <DonorMatchingList 
              request={selectedRequest} 
              onClose={() => setSelectedRequest(null)}
              onRequestUpdated={(updatedReq) => {
                setSelectedRequest(updatedReq);
                fetchRequests();
              }}
            />
          </aside>
        )}
      </main>
    </div>
  );
};

export default RequestPage;
