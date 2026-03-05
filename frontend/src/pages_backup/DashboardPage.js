/**
 * Dashboard Page - Overview of appraisal status and statistics
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, appraisalsAPI, periodsAPI } from '../services/api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';

function DashboardPage() {
  const { user, canReview, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [recentAppraisals, setRecentAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsResponse = await dashboardAPI.getStats();
      setStats(statsResponse.data);
      
      // Load recent appraisals
      const appraisalsResponse = await appraisalsAPI.getAll();
      setRecentAppraisals(appraisalsResponse.data.slice(0, 5));
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAppraisal = async () => {
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

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user?.firstName}!</h1>
          <p className="page-subtitle">
            Here's an overview of your appraisal activities
          </p>
        </div>
        {!canReview() && (
          <button className="btn btn-primary" onClick={handleStartAppraisal}>
            <Icons.Plus />
            Start New Appraisal
          </button>
        )}
      </div>

      <div className="page-content">
        {error && (
          <div className="alert alert-error mb-lg">
            <Icons.AlertCircle />
            <span>{error}</span>
          </div>
        )}

        {/* Current Period Info */}
        {stats?.currentPeriod && (
          <div className="alert alert-info mb-lg">
            <Icons.Calendar />
            <div>
              <strong>Current Appraisal Period:</strong> {stats.currentPeriod.name}
              <br />
              <small>
                Submission Deadline: {formatDate(stats.currentPeriod.submissionDeadline)}
              </small>
            </div>
          </div>
        )}

        {/* Stats Grid - Different views based on role */}
        <div className="stats-grid">
          {/* Employee Stats */}
          {!canReview() && (
            <>
              <div className="stat-card">
                <div className="stat-icon primary">
                  <Icons.FileText />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.totalAppraisals || 0}</div>
                  <div className="stat-label">Total Appraisals</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon warning">
                  <Icons.Clock />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.pendingAppraisals || 0}</div>
                  <div className="stat-label">Pending Actions</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon success">
                  <Icons.CheckCircle />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.approvedAppraisals || 0}</div>
                  <div className="stat-label">Approved</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon primary">
                  <Icons.Star />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {stats?.averageRating ? stats.averageRating.toFixed(1) : '-'}
                  </div>
                  <div className="stat-label">Average Rating</div>
                </div>
              </div>
            </>
          )}

          {/* Manager Stats */}
          {canReview() && !isAdmin() && (
            <>
              <div className="stat-card">
                <div className="stat-icon primary">
                  <Icons.Team />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.teamSize || 0}</div>
                  <div className="stat-label">Team Members</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon warning">
                  <Icons.Clock />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.pendingReviews || 0}</div>
                  <div className="stat-label">Pending Reviews</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon success">
                  <Icons.CheckCircle />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.completedReviews || 0}</div>
                  <div className="stat-label">Completed Reviews</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon primary">
                  <Icons.TrendingUp />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {stats?.teamAverageRating ? stats.teamAverageRating.toFixed(1) : '-'}
                  </div>
                  <div className="stat-label">Team Avg. Rating</div>
                </div>
              </div>
            </>
          )}

          {/* Admin Stats */}
          {isAdmin() && (
            <>
              <div className="stat-card">
                <div className="stat-icon primary">
                  <Icons.Users />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.totalEmployees || 0}</div>
                  <div className="stat-label">Total Employees</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
                  <Icons.Office />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.officeEmployees || 0}</div>
                  <div className="stat-label">Office Employees</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#cffafe', color: '#06b6d4' }}>
                  <Icons.Field />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.fieldEmployees || 0}</div>
                  <div className="stat-label">Field Employees</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon warning">
                  <Icons.Clock />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats?.pendingReviews || 0}</div>
                  <div className="stat-label">Pending Reviews</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Appraisals */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              {canReview() ? 'Recent Team Appraisals' : 'My Appraisals'}
            </h2>
            <Link to={canReview() ? '/team' : '/appraisals'} className="btn btn-secondary btn-sm">
              View All
            </Link>
          </div>
          
          {recentAppraisals.length === 0 ? (
            <div className="empty-state">
              <Icons.Inbox />
              <h3 className="empty-state-title">No Appraisals Yet</h3>
              <p className="empty-state-description">
                {canReview() 
                  ? 'No team appraisals to review at this time.'
                  : 'Start your first appraisal to track your performance.'}
              </p>
              {!canReview() && (
                <button className="btn btn-primary" onClick={handleStartAppraisal}>
                  <Icons.Plus />
                  Start Appraisal
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {canReview() && <th>Employee</th>}
                    <th>Period</th>
                    <th>Status</th>
                    <th>Self Rating</th>
                    <th>Final Rating</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppraisals.map(appraisal => (
                    <tr key={appraisal.id}>
                      {canReview() && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                              {appraisal.employeeName?.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span>{appraisal.employeeName}</span>
                          </div>
                        </td>
                      )}
                      <td>{appraisal.periodName}</td>
                      <td>{getStatusBadge(appraisal.status)}</td>
                      <td>{appraisal.selfRating ? appraisal.selfRating.toFixed(1) : '-'}</td>
                      <td>{appraisal.finalRating ? appraisal.finalRating.toFixed(1) : '-'}</td>
                      <td>{formatDate(appraisal.submittedAt || appraisal.createdAt)}</td>
                      <td>
                        <Link 
                          to={`/appraisals/${appraisal.id}`} 
                          className="btn btn-ghost btn-sm"
                        >
                          <Icons.Eye />
                        </Link>
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

export default DashboardPage;
