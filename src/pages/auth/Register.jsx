import React from 'react';
import RegisterForm from '../../components/auth/RegisterForm';

const Register = () => {
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
            <h1>Start Saving Lives.</h1>
            <p>
              Your registration brings the KCT campus one step closer to safe, accessible blood resources. Create your secure account using your official college email.
            </p>
          </div>

          <div className="auth-stats-card">
            <div className="stat-item">
              <span className="stat-num">5 Min</span>
              <span className="stat-lbl">To Register</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-num">1 Donation</span>
              <span className="stat-lbl">Saves 3 Lives</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form Workspace */}
      <div className="auth-form-container">
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;
