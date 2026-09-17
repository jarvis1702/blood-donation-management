import React, { useState } from 'react';
import { authService } from '../../services/authService';

const DonorRegistrationModal = ({ isOpen, onClose, userEmail, onDonorRegistered }) => {
  const [formData, setFormData] = useState({
    bloodGroup: 'O+',
    weight: '',
    lastDonationDate: '',
    declarationConfirmed: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.declarationConfirmed) {
      setError('Please confirm the health declaration checkbox to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.registerAsDonor(userEmail, formData);
      if (response.success) {
        if (onDonorRegistered) {
          onDonorRegistered(response.user);
        }
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to register as blood donor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <div className="modal-header">
          <h2>Register as KCT Blood Donor</h2>
          <button className="btn-close-panel" onClick={onClose}>×</button>
        </div>

        <p className="modal-subtitle">
          Join the KCT life-saving donor registry to be notified during local emergency blood requests.
        </p>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row-2">
            {/* Blood Group */}
            <div className="form-group">
              <label htmlFor="bloodGroup">Blood Group</label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            {/* Weight */}
            <div className="form-group">
              <label htmlFor="weight">Weight (in kg)</label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 62"
                min="45"
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Last Donation Date */}
          <div className="form-group">
            <label htmlFor="lastDonationDate">Last Donation Date (if any)</label>
            <input
              type="date"
              id="lastDonationDate"
              name="lastDonationDate"
              value={formData.lastDonationDate}
              onChange={handleChange}
              className="form-input"
            />
            <span className="field-hint">
              Note: Donors who donated less than 90 days ago will be placed on temporary cooldown status.
            </span>
          </div>

          {/* Health Declaration Checkbox */}
          <div className="form-group checkbox-group" style={{marginTop: '1rem'}}>
            <label className="checkbox-label" style={{display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer'}}>
              <input
                type="checkbox"
                name="declarationConfirmed"
                checked={formData.declarationConfirmed}
                onChange={handleChange}
                style={{marginTop: '3px'}}
                required
              />
              <span style={{fontSize: '0.85rem', color: 'var(--color-text-main)'}}>
                I confirm that I weigh over 45 kg, am in good health, and agree to be listed in the KCT Blood Donation Database.
              </span>
            </label>
          </div>

          <div className="modal-actions" style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem'}}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Confirm Donor Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonorRegistrationModal;
