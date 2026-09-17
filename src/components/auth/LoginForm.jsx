import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { validateEmail } from '../../utils/validation';
import { authService } from '../../services/authService';

const LoginForm = () => {
  const navigate = useNavigate();

  // Form input fields
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Touch states
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });

  // Field validation errors
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Validate fields in real-time
  useEffect(() => {
    const emailErr = validateEmail(formData.email) || '';
    const passwordErr = formData.password ? '' : 'Password is required';

    setErrors({
      email: emailErr,
      password: passwordErr
    });

    const isFormFilled = formData.email && formData.password;
    setIsValid(!emailErr && !passwordErr && isFormFilled);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };


  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert('For security verification, password reset instructions will be sent to your KCT email address if the account exists.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const response = await authService.login(
        formData.email,
        formData.password
      );

      if (response.success) {
        setSubmitSuccess('Login successful! Redirecting to dashboard...');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    } catch (err) {
      setSubmitError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-card">
      <div className="auth-form-header">
        <h2>Login</h2>
        <p>Access your KCT Blood Donor portal</p>
      </div>



      {submitError && (
        <div className="alert alert-error" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="alert alert-success" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{submitSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">KCT Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => handleBlur('email')}
            className={`form-input ${touched.email && errors.email ? 'input-error' : ''}`}
            placeholder="username@kct.ac.in"
            disabled={loading}
            required
            aria-invalid={touched.email && !!errors.email}
          />
          {touched.email && errors.email && (
            <span className="error-message" id="email-error">{errors.email}</span>
          )}
        </div>

        {/* Password */}
        <div className="form-group">
          <div className="label-wrapper">
            <label htmlFor="password">Password</label>
            <a href="#" className="forgot-password-link" onClick={handleForgotPassword} tabIndex="0">
              Forgot Password?
            </a>
          </div>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              className={`form-input ${touched.password && errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              disabled={loading}
              required
              aria-invalid={touched.password && !!errors.password}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={toggleShowPassword}
              tabIndex="-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          {touched.password && errors.password && (
            <span className="error-message" id="password-error">{errors.password}</span>
          )}
        </div>

        {/* Login Button */}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!isValid || loading}
        >
          {loading ? (
            <span className="loading-spinner-wrapper">
              <span className="spinner"></span>
              Logging in...
            </span>
          ) : (
            'Login'
          )}
        </button>
      </form>

      <div className="auth-form-footer">
        <p>Don't have an account? <Link to="/register" className="auth-link">Register here</Link></p>
      </div>
    </div>
  );
};

export default LoginForm;
