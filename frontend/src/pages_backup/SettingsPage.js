/**
 * Settings Page - Admin settings and configuration
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { periodsAPI, departmentsAPI } from '../services/api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';

function SettingsPage() {
  const { user } = useAuth();
  
  const [periods, setPeriods] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  
  const [periodForm, setPeriodForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    submissionDeadline: '',
    reviewDeadline: '',
    isActive: false,
  });
  
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [periodsRes, deptsRes] = await Promise.all([
        periodsAPI.getAll(),
        departmentsAPI.getAll(),
      ]);
      
      setPeriods(periodsRes.data);
      setDepartments(deptsRes.data);
      
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await periodsAPI.create(periodForm);
      setSuccessMessage('Appraisal period created successfully');
      setShowPeriodModal(false);
      setPeriodForm({
        name: '',
        startDate: '',
        endDate: '',
        submissionDeadline: '',
        reviewDeadline: '',
        isActive: false,
      });
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create period');
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await departmentsAPI.create(deptForm);
      setSuccessMessage('Department created successfully');
      setShowDeptModal(false);
      setDeptForm({ name: '', description: '' });
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create department');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Configure appraisal periods and system settings
          </p>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div className="alert alert-error mb-lg">
            <Icons.AlertCircle />
            <span>{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="alert alert-success mb-lg">
            <Icons.CheckCircle />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Appraisal Periods */}
        <div className="card mb-xl">
          <div className="card-header">
            <h3 className="card-title">Appraisal Periods</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPeriodModal(true)}>
              <Icons.Plus />
              New Period
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Period</th>
                  <th>Submission Deadline</th>
                  <th>Review Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                      No appraisal periods configured
                    </td>
                  </tr>
                ) : (
                  periods.map(period => (
                    <tr key={period.id}>
                      <td><strong>{period.name}</strong></td>
                      <td>{formatDate(period.startDate)} - {formatDate(period.endDate)}</td>
                      <td>{formatDate(period.submissionDeadline)}</td>
                      <td>{formatDate(period.reviewDeadline)}</td>
                      <td>
                        <span className={`badge ${period.isActive ? 'badge-approved' : 'badge-draft'}`}>
                          {period.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Departments */}
        <div className="card mb-xl">
          <div className="card-header">
            <h3 className="card-title">Departments</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowDeptModal(true)}>
              <Icons.Plus />
              New Department
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                      No departments configured
                    </td>
                  </tr>
                ) : (
                  departments.map(dept => (
                    <tr key={dept.id}>
                      <td><strong>{dept.name}</strong></td>
                      <td>{dept.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Information</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>
                  Application Version
                </div>
                <div style={{ fontWeight: 600 }}>1.0.0</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>
                  Current User
                </div>
                <div style={{ fontWeight: 600 }}>{user?.fullName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>
                  Role
                </div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>
                  Total Departments
                </div>
                <div style={{ fontWeight: 600 }}>{departments.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Period Modal */}
      {showPeriodModal && (
        <div className="modal-overlay" onClick={() => setShowPeriodModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Appraisal Period</h3>
              <button className="modal-close" onClick={() => setShowPeriodModal(false)}>
                <Icons.X />
              </button>
            </div>
            
            <form onSubmit={handleCreatePeriod}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Period Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Q1 2025 Appraisal"
                    value={periodForm.name}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={periodForm.startDate}
                      onChange={(e) => setPeriodForm(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={periodForm.endDate}
                      onChange={(e) => setPeriodForm(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Submission Deadline *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={periodForm.submissionDeadline}
                      onChange={(e) => setPeriodForm(prev => ({ ...prev, submissionDeadline: e.target.value }))}
                      required
                    />
                    <span className="form-hint">When employees must submit self-appraisals</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Review Deadline *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={periodForm.reviewDeadline}
                      onChange={(e) => setPeriodForm(prev => ({ ...prev, reviewDeadline: e.target.value }))}
                      required
                    />
                    <span className="form-hint">When managers must complete reviews</span>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={periodForm.isActive}
                      onChange={(e) => setPeriodForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span className="form-label" style={{ margin: 0 }}>
                      Set as Active Period
                    </span>
                  </label>
                  <span className="form-hint">Only one period can be active at a time</span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPeriodModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Department Modal */}
      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Department</h3>
              <button className="modal-close" onClick={() => setShowDeptModal(false)}>
                <Icons.X />
              </button>
            </div>
            
            <form onSubmit={handleCreateDept}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Department Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Engineering"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Brief description of the department"
                    value={deptForm.description}
                    onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeptModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default SettingsPage;
