import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';

const ProfileForm = ({ userProfile, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    gender: '',
    role: 'Student'
  });

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        department: userProfile.department || '',
        gender: userProfile.gender || 'Not Specified',
        role: userProfile.role || 'Student'
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const response = await authService.updateProfile(userProfile.email, formData);
      if (response.success) {
        setSubmitSuccess('Profile information updated successfully!');
        if (onProfileUpdated) {
          onProfileUpdated(response.user);
        }
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-form-card">
      <div className="card-header">
        <h3>Personal Details</h3>
        <p>Update your personal information, contact details, and role permissions.</p>
      </div>

      {submitError && (
        <div className="alert alert-error" role="alert">
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="alert alert-success" role="alert">
          <span>{submitSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email - Read-only */}
        <div className="form-group">
          <label htmlFor="email">KCT Email Address</label>
          <input
            type="email"
            id="email"
            value={userProfile?.email || ''}
            className="form-input"
            disabled
            readOnly
          />
          <span className="field-hint">KCT Email domain cannot be changed.</span>
        </div>

        {/* Full Name */}
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            placeholder="John Doe"
            required
            disabled={loading}
          />
        </div>

        <div className="form-row-2">
          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone">Contact Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g. 9876543210"
              disabled={loading}
            />
          </div>

          {/* Gender */}
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="Not Specified">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* System Role */}
        <div className="form-group">
          <label htmlFor="role">User Role / Authorization</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-input"
            disabled={loading}
          >
            <option value="Student">Student / Regular Requester</option>
            <option value="Club Member">Youth Red Cross / Blood Club Member</option>
            <option value="Admin">System Administrator</option>
          </select>
          <span className="field-hint">
            Note: Requester owners, Club Members, and Admins can edit request tracking status (US-07).
          </span>
        </div>

        {/* Department / Role details */}
        <div className="form-group">
          <label htmlFor="department">KCT Department / Class</label>
          <input
            type="text"
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. B.Tech Computer Science (3rd Year)"
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};

export default ProfileForm;
