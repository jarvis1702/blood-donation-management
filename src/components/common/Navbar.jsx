import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import NotificationBell from './NotificationBell';

const Navbar = ({ activePage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const currentUser = authService.getCurrentUserProfile() || authService.getCurrentUser() || { name: 'User', role: 'Student' };
  const isAdminOrClub = currentUser.role === 'Admin' || currentUser.role === 'Club Member';

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Blood Requests', path: '/requests', icon: '🩸' },
    { label: 'Donation Camps', path: '/camps', icon: '🎪' },
    { label: 'YRC Club Portal', path: '/club', icon: '🛡️', badge: isAdminOrClub ? 'Admin' : null }
  ];

  return (
    <header className="dashboard-header modern-navbar">
      <div className="navbar-brand-section">
        <div 
          className="dashboard-logo" 
          onClick={() => navigate('/dashboard')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
        >
          <img 
            src="/kct-logo.png" 
            alt="KCT Logo" 
            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'contain' }} 
          />
          <span className="logo-text">KCT LifeFlow</span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav-links">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || activePage === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`nav-tab-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-tab-icon">{link.icon}</span>
                <span>{link.label}</span>
                {link.badge && <span className="nav-tab-badge">{link.badge}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Action Icons: Notification Bell, Profile, Logout */}
      <div className="navbar-actions-section">
        {/* SCRUM-19 Notification Bell */}
        <NotificationBell />

        {/* Profile Avatar / Settings */}
        <button 
          onClick={() => navigate('/profile')} 
          className="btn btn-outline btn-sm user-nav-btn"
          title="Profile & Settings"
        >
          <div className="user-avatar" style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}>
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="user-name-label">{currentUser.name?.split(' ')[0] || 'Profile'}</span>
        </button>

        {/* Logout Button */}
        <button 
          onClick={handleLogout} 
          className="btn btn-outline btn-sm logout-btn desktop-only"
          disabled={logoutLoading}
        >
          {logoutLoading ? '...' : 'Logout'}
        </button>

        {/* Mobile Hamburger Button */}
        <button 
          className="mobile-hamburger-btn mobile-only"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-user-info">
            <div className="user-avatar" style={{ width: '36px', height: '36px' }}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.email}</small>
            </div>
          </div>
          <div className="mobile-nav-list">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => { navigate(link.path); setMobileMenuOpen(false); }}
                className={`mobile-nav-item ${location.pathname === link.path ? 'active' : ''}`}
              >
                <span>{link.icon} {link.label}</span>
                {link.badge && <span className="badge badge-info">{link.badge}</span>}
              </button>
            ))}
            <button
              onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
              className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
            >
              <span>👤 My Profile & Donor Status</span>
            </button>
            <button
              onClick={handleLogout}
              className="mobile-nav-item logout-item"
            >
              <span>🚪 Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
