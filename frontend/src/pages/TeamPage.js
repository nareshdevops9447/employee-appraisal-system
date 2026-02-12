/**
 * Team Reviews Page - For managers to review team appraisals
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appraisalsAPI, usersAPI } from '../services/api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';

function TeamPage() {
  const { user, isAdmin } = useAuth();
  
  const [appraisals, setAppraisals] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load team members
      const teamResponse = await usersAPI.getTeamMembers();
      setTeamMembers(teamResponse.data);
      
      // Load team appraisals
      const appraisalsResponse = await appraisalsAPI.getAll();
      // Filter to show only team appraisals (not own appraisals unless admin)
      const teamAppraisals = appraisalsResponse.data.filter(a => 
        isAdmin() || a.employeeId !== user.id
      );
      setAppraisals(teamAppraisals);
      
    } catch (err) {
      setError('Failed to load team data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: 'Draft', class: 'badge-draft' },
      submitted: { label: 'Awaiting Review', class: 'badge-submitted' },
      under_review: { label: 'Under Review', class: 'badge-under-review' },
      approved: { label: 'Approved', class: 'badge-approved' },
      rejected: { label: 'Rejected', class: 'badge-rejected' },
      revision_requested: { label: 'Revision Requested', class: 'badge-revision-requested' },
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

  const getFilteredAppraisals = () => {
    switch (filter) {
      case 'pending':
        return appraisals.filter(a => a.status === 'submitted');
      case 'in_progress':
        return appraisals.filter(a => a.status === 'under_review');
      case 'completed':
        return appraisals.filter(a => ['approved', 'rejected'].includes(a.status));
      default:
        return appraisals;
    }
  };

  const filteredAppraisals = getFilteredAppraisals();
  const pendingCount = appraisals.filter(a => a.status === 'submitted').length;
  const inProgressCount = appraisals.filter(a => a.status === 'under_review').length;
  const completedCount = appraisals.filter(a => ['approved', 'rejected'].includes(a.status)).length;

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading team data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Reviews</h1>
          <p className="page-subtitle">
            Review and manage your team's performance appraisals
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

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <Icons.Team />
            </div>
            <div className="stat-content">
              <div className="stat-value">{teamMembers.length}</div>
              <div className="stat-label">Team Members</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <Icons.Clock />
            </div>
            <div className="stat-content">
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">Pending Reviews</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon primary">
              <Icons.Edit />
            </div>
            <div className="stat-content">
              <div className="stat-value">{inProgressCount}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <Icons.CheckCircle />
            </div>
            <div className="stat-content">
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({appraisals.length})
          </button>
          <button 
            className={`tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending Review ({pendingCount})
          </button>
          <button 
            className={`tab ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            In Progress ({inProgressCount})
          </button>
          <button 
            className={`tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Appraisals Table */}
        <div className="card">
          {filteredAppraisals.length === 0 ? (
            <div className="empty-state">
              <Icons.Inbox />
              <h3 className="empty-state-title">No Appraisals Found</h3>
              <p className="empty-state-description">
                {filter === 'pending' 
                  ? "No appraisals waiting for your review."
                  : filter === 'in_progress'
                  ? "No appraisals currently under review."
                  : "No completed reviews yet."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Self Rating</th>
                    <th>Manager Rating</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppraisals.map(appraisal => (
                    <tr key={appraisal.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                            {appraisal.employeeName?.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{appraisal.employeeName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                              {appraisal.employeeEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {teamMembers.find(m => m.id === appraisal.employeeId)?.userType === 'office' ? (
                          <span className="badge badge-office">Office</span>
                        ) : (
                          <span className="badge badge-field">Field</span>
                        )}
                      </td>
                      <td>{appraisal.periodName}</td>
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
                      <td>{formatDate(appraisal.submittedAt)}</td>
                      <td>
                        <Link 
                          to={`/appraisals/${appraisal.id}`}
                          className={`btn btn-sm ${
                            appraisal.status === 'submitted' ? 'btn-primary' : 'btn-secondary'
                          }`}
                        >
                          {appraisal.status === 'submitted' 
                            ? 'Start Review' 
                            : appraisal.status === 'under_review'
                            ? 'Continue Review'
                            : 'View'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Team Members Overview */}
        <div className="card mt-xl">
          <div className="card-header">
            <h3 className="card-title">Team Members</h3>
          </div>
          <div className="card-body">
            {teamMembers.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', textAlign: 'center' }}>
                No team members assigned yet.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {teamMembers.map(member => {
                  const memberAppraisals = appraisals.filter(a => a.employeeId === member.id);
                  const latestAppraisal = memberAppraisals[0];
                  
                  return (
                    <div 
                      key={member.id} 
                      style={{
                        padding: '16px',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div className="user-avatar" style={{ width: 48, height: 48 }}>
                        {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{member.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {member.jobTitle || 'Employee'}
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <span className={`badge badge-${member.userType}`}>
                            {member.userType === 'office' ? 'Office' : 'Field'}
                          </span>
                        </div>
                      </div>
                      {latestAppraisal && (
                        <div style={{ textAlign: 'right' }}>
                          {getStatusBadge(latestAppraisal.status)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default TeamPage;
