import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { cloudSync } from '../services/cloudSync';

const AdminPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'audit'

  // User table search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [auditCategory, setAuditCategory] = useState('ALL');

  // Messages
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      const user = authService.getCurrentUserProfile() || authService.getCurrentUser();
      setCurrentUser(user);
      refreshData();
    }
  }, [navigate]);

  const refreshData = () => {
    const allUsers = adminService.getAllUsers();
    const logs = adminService.getAuditLogs(auditCategory);
    setUsers(allUsers);
    setAuditLogs(logs);
  };

  const showToast = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 4000);
  };

  // Role change handler
  const handleRoleChange = async (email, newRole) => {
    try {
      await adminService.updateUserRole(email, newRole, currentUser?.email);
      showToast(`Role for ${email} updated to ${newRole}`);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'danger');
    }
  };

  // Account status toggle
  const handleStatusToggle = async (email) => {
    try {
      const res = await adminService.toggleAccountStatus(email, currentUser?.email);
      showToast(`Account status for ${email} set to ${res.status}`);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle account status', 'danger');
    }
  };

  // Donor verification toggle
  const handleVerificationToggle = async (email) => {
    try {
      const res = await adminService.toggleDonorVerification(email, currentUser?.email);
      showToast(`Donor verification for ${email}: ${res.isVerifiedDonor ? 'Verified' : 'Unverified'}`);
      refreshData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle verification', 'danger');
    }
  };

  // Export audit log as CSV
  const handleExportAuditCSV = () => {
    const headers = ['Log ID,Timestamp,Category,Event,Performed By,Target,Status,IP Source'];
    const rows = auditLogs.map(l => 
      `"${l.id}","${l.timestamp}","${l.category}","${l.event}","${l.performedBy}","${l.target}","${l.status}","${l.ip}"`
    );
    const content = [headers, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'KCT_LifeFlow_Audit_Log.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || (u.status || 'Active') === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const isAdminOrClub = currentUser?.role === 'Admin' || currentUser?.role === 'Club Member';

  if (!isAdminOrClub) {
    return (
      <div className="dashboard-container">
        <Navbar activePage="/admin" />
        <main className="dashboard-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Institutional Admin Access Restricted</h2>
          <p style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto', color: '#666' }}>
            This portal is restricted to KCT System Administrators and YRC Club Officers. 
            Your current role is <strong>{currentUser?.role || 'Student'}</strong>.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar activePage="/admin" />

      <main className="dashboard-main">
        {/* Header */}
        <div className="requests-heading-section page-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1>Institutional Administration & Governance</h1>
            <p>Manage student & faculty user permissions, oversee donor verification badges, and inspect security audit logs.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-outline" 
              onClick={() => {
                cloudSync.pushToCloud();
                showToast('Triggered multi-device cloud synchronisation');
              }}
            >
              🔄 Sync Cloud
            </button>
            <button className="btn btn-outline" onClick={handleExportAuditCSV}>
              📥 Export Audit CSV
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {actionMessage.text && (
          <div className={`alert alert-${actionMessage.type}`} style={{ marginBottom: '1.5rem' }}>
            {actionMessage.text}
          </div>
        )}

        {/* 4 Governance KPI Cards */}
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Registered Accounts</span>
              <span className="stat-icon" style={{ background: '#e3f2fd', color: '#1565c0' }}>👤</span>
            </div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-desc">
              {users.filter(u => u.status !== 'Suspended').length} Active • {users.filter(u => u.status === 'Suspended').length} Suspended
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Verified Donors</span>
              <span className="stat-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}>🩸</span>
            </div>
            <div className="stat-value" style={{ color: '#2e7d32' }}>
              {users.filter(u => u.isDonor || u.bloodGroup).length}
            </div>
            <div className="stat-desc">Clearing medical onboarding</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Club & Admin Staff</span>
              <span className="stat-icon" style={{ background: '#fff3e0', color: '#e65100' }}>🛡️</span>
            </div>
            <div className="stat-value">
              {users.filter(u => u.role === 'Admin' || u.role === 'Club Member').length}
            </div>
            <div className="stat-desc">Elevated system access</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Security Governance</span>
              <span className="stat-icon" style={{ background: '#f3e5f5', color: '#7b1fa2' }}>🔒</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.35rem', color: '#2e7d32' }}>SHA-256 Auth</div>
            <div className="stat-desc">Session Token & Domain Guard Active</div>
          </div>
        </div>

        {/* Tab Controls: User Management vs Audit Logs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('users')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>👥</span> User Accounts & Roles ({filteredUsers.length})
          </button>
          <button 
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('audit')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>📋</span> System Audit Log ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: User Accounts & Roles */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '220px' }}>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="🔍 Search name, email, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select 
                  className="form-control" 
                  style={{ width: 'auto' }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Club Member">Club Member</option>
                  <option value="Admin">Admin</option>
                </select>

                <select 
                  className="form-control" 
                  style={{ width: 'auto' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="donors-table-wrapper">
              <table className="donors-table">
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left', background: '#f5f5f5' }}>
                    <th style={{ padding: '0.75rem' }}>User / Email</th>
                    <th style={{ padding: '0.75rem' }}>Blood Group</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>System Role</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#777' }}>
                        No user accounts match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSuspended = u.status === 'Suspended';
                      return (
                        <tr key={u.email} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#212121' }}>{u.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#777' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            {u.bloodGroup ? (
                              <span className="badge badge-info">{u.bloodGroup}</span>
                            ) : (
                              <span style={{ color: '#999', fontSize: '0.8rem' }}>Unregistered</span>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem', color: '#555' }}>
                            {u.department || 'Not specified'}
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            <select 
                              className="form-control"
                              style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
                              value={u.role || 'Student'}
                              onChange={(e) => handleRoleChange(u.email, e.target.value)}
                            >
                              <option value="Student">Student</option>
                              <option value="Faculty">Faculty</option>
                              <option value="Club Member">Club Member</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            <span className={`badge ${isSuspended ? 'badge-danger' : 'badge-success'}`}>
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </td>

                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              <button 
                                className={`btn btn-sm ${isSuspended ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => handleStatusToggle(u.email)}
                                title={isSuspended ? 'Restore Account' : 'Suspend Account'}
                              >
                                {isSuspended ? 'Activate' : 'Suspend'}
                              </button>
                              <button 
                                className="btn btn-sm btn-outline"
                                onClick={() => handleVerificationToggle(u.email)}
                                title="Toggle Medical Verification"
                              >
                                {u.isVerifiedDonor !== false ? '✓ Verified' : 'Verify'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Institutional Audit Log */}
        {activeTab === 'audit' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📋</span> System Security & Operation Audit Trail
                </h2>
                <small style={{ color: '#666' }}>Append-only security log for institutional accreditation and tracking</small>
              </div>

              <select 
                className="form-control" 
                style={{ width: 'auto' }}
                value={auditCategory}
                onChange={(e) => {
                  setAuditCategory(e.target.value);
                  setAuditLogs(adminService.getAuditLogs(e.target.value));
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="AUTH">AUTH</option>
                <option value="SECURITY">SECURITY</option>
                <option value="DONOR">DONOR</option>
                <option value="CAMP">CAMP</option>
                <option value="REQUEST">REQUEST</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="donors-table-wrapper">
              <table className="donors-table">
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left', background: '#f5f5f5' }}>
                    <th style={{ padding: '0.65rem' }}>Log ID</th>
                    <th style={{ padding: '0.65rem' }}>Timestamp</th>
                    <th style={{ padding: '0.65rem' }}>Category</th>
                    <th style={{ padding: '0.65rem' }}>Event Action</th>
                    <th style={{ padding: '0.65rem' }}>Performed By</th>
                    <th style={{ padding: '0.65rem' }}>Target</th>
                    <th style={{ padding: '0.65rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.65rem' }}>
                        <code>{log.id}</code>
                      </td>
                      <td style={{ padding: '0.65rem', color: '#666' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className="badge badge-info">{log.category}</span>
                      </td>
                      <td style={{ padding: '0.65rem', fontWeight: 500 }}>
                        {log.event}
                      </td>
                      <td style={{ padding: '0.65rem', color: '#444' }}>
                        {log.performedBy}
                      </td>
                      <td style={{ padding: '0.65rem', color: '#666' }}>
                        {log.target}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
