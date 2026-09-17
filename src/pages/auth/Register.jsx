import React from 'react';
import RegisterForm from '../../components/auth/RegisterForm';

const Register = () => {
  return (
    <div className="auth-page-container">
      {/* Decorative Sidebar for Branding */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-overlay"></div>
        <div className="auth-sidebar-content">
          <div className="auth-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#ff4d4d" stroke="#d32f2f"/>
              <path d="M12 6V18" stroke="white" strokeWidth="3"/>
              <path d="M8 12H16" stroke="white" strokeWidth="3"/>
            </svg>
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
