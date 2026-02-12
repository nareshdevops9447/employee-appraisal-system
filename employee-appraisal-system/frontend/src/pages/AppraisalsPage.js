/**
 * Appraisals List Page - View all appraisals
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appraisalsAPI } from '../services/api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';

function AppraisalsPage() {
  const { user, canReview } = useAuth();
  const navigate = useNavigate();
  
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAppraisals();
  }, []);

  const loadAppraisals = async () => {
    try {
      setLoading(true);
      const response = await appraisalsAPI.getAll();
      setAppraisals(response.data);
    } catch (err) {
      setError('Failed to load appraisals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppraisal = async () => {
    try {
      const response = await appraisalsAPI.create();
      navigate(`/appraisals/${response.data.id}`);
    } catch (err) {
      if (err.response?.data?.appraisalId) {
        navigate(`/appraisals/${err.response.data.appraisalId}`);
      } else {
        setError(err.response?.data?.error || 'Failed to create appraisal');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: 'Draft', class: 'badge-draft' },
      submitted: { label: 'Submitted', class: 'badge-submitted' },
      under_review: { label: 'Under Review', class: 'badge-under-review' },
      approved: { label: 'Approved', class: 'badge-approved' },
      rejected: { label: 'Rejected', class: 'badge-rejected' },
      revision_requested: { label: 'Revision Needed', class: 'badge-revision-requested' },
    };
    const statusInfo = statusMap[status] || { label: status, class: 'badge-draft' };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredAppraisals = appraisals.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading appraisals...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Appraisals</h1>
          <p className="page-subtitle">
            View and manage your performance appraisals
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateAppraisal}>
          <Icons.Plus />
          New Appraisal
        </button>
      </div>

      <div className="page-content">
        {error && (
          <div className="alert alert-error mb-lg">
            <Icons.AlertCircle />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({appraisals.length})
          </button>
          <button 
            className={`tab ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            Draft ({appraisals.filter(a => a.status === 'draft').length})
          </button>
          <button 
            className={`tab ${filter === 'submitted' ? 'active' : ''}`}
            onClick={() => setFilter('submitted')}
          >
            Submitted ({appraisals.filter(a => a.status === 'submitted').length})
          </button>
          <button 
            className={`tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved ({appraisals.filter(a => a.status === 'approved').length})
          </button>
        </div>

        {/* Appraisals List */}
        <div className="card">
          {filteredAppraisals.length === 0 ? (
            <div className="empty-state">
              <Icons.Inbox />
              <h3 className="empty-state-title">No Appraisals Found</h3>
              <p className="empty-state-description">
                {filter === 'all' 
                  ? "You haven't created any appraisals yet."
                  : `No appraisals with status "${filter}".`}
              </p>
              {filter === 'all' && (
                <button className="btn btn-primary" onClick={handleCreateAppraisal}>
                  <Icons.Plus />
                  Start Your First Appraisal
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Self Rating</th>
                    <th>Manager Rating</th>
                    <th>Final Rating</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppraisals.map(appraisal => (
                    <tr key={appraisal.id}>
                      <td>
                        <strong>{appraisal.periodName}</strong>
                      </td>
                      <td>{getStatusBadge(appraisal.status)}</td>
                      <td>
                        {appraisal.selfRating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icons.Star />
                            {appraisal.selfRating.toFixed(1)}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {appraisal.managerRating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icons.Star />
                            {appraisal.managerRating.toFixed(1)}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {appraisal.finalRating ? (
                          <strong style={{ color: 'var(--primary)' }}>
                            {appraisal.finalRating.toFixed(1)}
                          </strong>
                        ) : '-'}
                      </td>
                      <td>{formatDate(appraisal.submittedAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Link 
                            to={`/appraisals/${appraisal.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            {appraisal.status === 'draft' || appraisal.status === 'revision_requested' 
                              ? 'Continue' 
                              : 'View'}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default AppraisalsPage;
