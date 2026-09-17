import React from 'react';
import LoginForm from '../../components/auth/LoginForm';

const Login = () => {
  return (
    <div className="auth-page-container">
      {/* Decorative Sidebar for Branding */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-overlay"></div>
        <div className="auth-sidebar-content">
          <div className="auth-logo" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <img 
              src="/kct-logo.png" 
              alt="KCT Logo" 
              style={{width: '46px', height: '46px', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'}} 
            />
            <span className="logo-text">KCT LifeFlow</span>
          </div>
          
          <div className="auth-marketing-text">
            <h1>Every Drop Counts.</h1>
            <p>
              Join the Kumaraguru College of Technology blood donation management network. Register as a donor or request blood support for campus and local communities.
            </p>
          </div>

          <div className="auth-stats-card">
            <div className="stat-item">
              <span className="stat-num">500+</span>
              <span className="stat-lbl">Active KCT Donors</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-num">1,200+</span>
              <span className="stat-lbl">Lives Impacted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form Workspace */}
      <div className="auth-form-container">
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
