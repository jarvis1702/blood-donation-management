import React, { useState, useEffect } from 'react';
import { bloodRequestService } from '../../services/bloodRequestService';
import { authService } from '../../services/authService';

const BloodRequestForm = ({ onRequestCreated }) => {
  const currentUser = authService.getCurrentUser();
  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: '',
    hospital: '',
    unitsRequired: '',
    contactNumber: '',
    urgency: 'Medium'
  });

  const [touched, setTouched] = useState({
    patientName: false,
    bloodGroup: false,
    hospital: false,
    unitsRequired: false,
    contactNumber: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Validate form in real-time
  useEffect(() => {
    const errs = {};
    
    if (!formData.patientName || formData.patientName.trim() === '') {
      errs.patientName = 'Patient Name is required';
    }
    
    if (!formData.bloodGroup) {
      errs.bloodGroup = 'Please select a blood group';
    }
    
    if (!formData.hospital || formData.hospital.trim() === '') {
      errs.hospital = 'Hospital Name is required';
    }
    
    const units = parseInt(formData.unitsRequired, 10);
    if (!formData.unitsRequired) {
      errs.unitsRequired = 'Units required is required';
    } else if (isNaN(units) || units <= 0) {
      errs.unitsRequired = 'Must be a number greater than 0';
    }
    
    if (!formData.contactNumber || formData.contactNumber.trim() === '') {
      errs.contactNumber = 'Contact Number is required';
    } else {
      // Basic phone regex (minimum 10 digits)
      const phoneRegex = /^[0-9+\s-]{10,15}$/;
      if (!phoneRegex.test(formData.contactNumber.trim())) {
        errs.contactNumber = 'Enter a valid 10-digit contact number';
      }
    }

    setErrors(errs);
    
    // Check if form is valid (no errors and fields are set)
    const isFormFilled = formData.patientName && formData.bloodGroup && formData.hospital && formData.unitsRequired && formData.contactNumber;
    setIsValid(Object.keys(errs).length === 0 && isFormFilled);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const response = await bloodRequestService.createRequest(formData, currentUser?.email);
      if (response.success) {
        setSubmitSuccess('Emergency blood request submitted successfully!');
        setFormData({
          patientName: '',
          bloodGroup: '',
          hospital: '',
          unitsRequired: '',
          contactNumber: '',
          urgency: 'Medium'
        });
        setTouched({
          patientName: false,
          bloodGroup: false,
          hospital: false,
          unitsRequired: false,
          contactNumber: false
        });
        
        // Notify parent after a short delay
        if (onRequestCreated) {
          setTimeout(() => {
            onRequestCreated(response.request);
          }, 1000);
        }
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit blood request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="request-form-card">
      <div className="request-form-header">
        <h2>Submit Emergency Blood Request</h2>
        <p>Provide patient details to search matching KCT donors.</p>
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
        {/* Patient Name */}
        <div className="form-group">
          <label htmlFor="patientName">Patient Name</label>
          <input
            type="text"
            id="patientName"
            name="patientName"
            value={formData.patientName}
            onChange={handleChange}
            onBlur={() => handleBlur('patientName')}
            className={`form-input ${touched.patientName && errors.patientName ? 'input-error' : ''}`}
            placeholder="e.g. Arun Kumar"
            disabled={loading}
            required
          />
          {touched.patientName && errors.patientName && (
            <span className="error-message">{errors.patientName}</span>
          )}
        </div>

        <div className="form-row-2">
          {/* Blood Group */}
          <div className="form-group">
            <label htmlFor="bloodGroup">Blood Group Required</label>
            <select
              id="bloodGroup"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              onBlur={() => handleBlur('bloodGroup')}
              className={`form-input ${touched.bloodGroup && errors.bloodGroup ? 'input-error' : ''}`}
              disabled={loading}
              required
            >
              <option value="">Select Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
            {touched.bloodGroup && errors.bloodGroup && (
              <span className="error-message">{errors.bloodGroup}</span>
            )}
          </div>

          {/* Units Required */}
          <div className="form-group">
            <label htmlFor="unitsRequired">Units Required (Pints)</label>
            <input
              type="number"
              id="unitsRequired"
              name="unitsRequired"
              value={formData.unitsRequired}
              onChange={handleChange}
              onBlur={() => handleBlur('unitsRequired')}
              className={`form-input ${touched.unitsRequired && errors.unitsRequired ? 'input-error' : ''}`}
              placeholder="e.g. 2"
              min="1"
              disabled={loading}
              required
            />
            {touched.unitsRequired && errors.unitsRequired && (
              <span className="error-message">{errors.unitsRequired}</span>
            )}
          </div>
        </div>

        {/* Hospital */}
        <div className="form-group">
          <label htmlFor="hospital">Hospital Name & Location</label>
          <input
            type="text"
            id="hospital"
            name="hospital"
            value={formData.hospital}
            onChange={handleChange}
            onBlur={() => handleBlur('hospital')}
            className={`form-input ${touched.hospital && errors.hospital ? 'input-error' : ''}`}
            placeholder="e.g. KCT Hospital, Coimbatore"
            disabled={loading}
            required
          />
          {touched.hospital && errors.hospital && (
            <span className="error-message">{errors.hospital}</span>
          )}
        </div>

        <div className="form-row-2">
          {/* Contact Number */}
          <div className="form-group">
            <label htmlFor="contactNumber">Contact Phone Number</label>
            <input
              type="text"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              onBlur={() => handleBlur('contactNumber')}
              className={`form-input ${touched.contactNumber && errors.contactNumber ? 'input-error' : ''}`}
              placeholder="e.g. 9876543210"
              disabled={loading}
              required
            />
            {touched.contactNumber && errors.contactNumber && (
              <span className="error-message">{errors.contactNumber}</span>
            )}
          </div>

          {/* Urgency */}
          <div className="form-group">
            <label htmlFor="urgency">Urgency Level</label>
            <select
              id="urgency"
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!isValid || loading}
        >
          {loading ? (
            <span className="loading-spinner-wrapper">
              <span className="spinner"></span>
              Submitting Request...
            </span>
          ) : (
            'Submit Emergency Request'
          )}
        </button>
      </form>
    </div>
  );
};

export default BloodRequestForm;
