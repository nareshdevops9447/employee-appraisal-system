/**
 * Appraisal Detail Page - View and edit individual appraisal
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appraisalsAPI, criteriaAPI } from '../services/api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';

function AppraisalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canReview } = useAuth();
  
  const [appraisal, setAppraisal] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({
    employeeComments: '',
    goalsAchieved: '',
    areasOfImprovement: '',
    trainingNeeds: '',
    managerComments: '',
  });
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isOwner = appraisal?.employeeId === user?.id;
  const isReviewer = appraisal?.reviewerId === user?.id || user?.role === 'admin';
  const canEdit = isOwner && ['draft', 'revision_requested'].includes(appraisal?.status);
  const canManagerEdit = isReviewer && ['submitted', 'under_review'].includes(appraisal?.status);

  useEffect(() => {
    loadAppraisalData();
  }, [id]);

  const loadAppraisalData = async () => {
    try {
      setLoading(true);
      
      // Load appraisal details
      const appraisalResponse = await appraisalsAPI.getById(id);
      const appraisalData = appraisalResponse.data;
      setAppraisal(appraisalData);
      
      // Set comments
      setComments({
        employeeComments: appraisalData.employeeComments || '',
        goalsAchieved: appraisalData.goalsAchieved || '',
        areasOfImprovement: appraisalData.areasOfImprovement || '',
        trainingNeeds: appraisalData.trainingNeeds || '',
        managerComments: appraisalData.managerComments || '',
      });
      
      // Load criteria based on employee type
      const criteriaResponse = await criteriaAPI.getAll();
      setCriteria(criteriaResponse.data);
      
      // Initialize ratings from existing data
      const existingRatings = {};
      if (appraisalData.ratings) {
        appraisalData.ratings.forEach(r => {
          existingRatings[r.criteriaId] = {
            selfScore: r.selfScore,
            managerScore: r.managerScore,
            selfComment: r.selfComment || '',
            managerComment: r.managerComment || '',
          };
        });
      }
      setRatings(existingRatings);
      
    } catch (err) {
      setError('Failed to load appraisal');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (criteriaId, field, value) => {
    setRatings(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Save comments
      await appraisalsAPI.update(id, comments);
      
      // Save ratings
      const ratingsToSave = Object.entries(ratings).map(([criteriaId, data]) => ({
        criteriaId: parseInt(criteriaId),
        ...data
      }));
      
      const response = await appraisalsAPI.saveRatings(id, ratingsToSave);
      setAppraisal(response.data);
      
      setSuccessMessage('Changes saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit this appraisal for review? You won\'t be able to edit it after submission.')) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Save first
      await handleSave();
      
      // Then submit
      const response = await appraisalsAPI.submit(id);
      setAppraisal(response.data);
      setSuccessMessage('Appraisal submitted successfully!');
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit appraisal');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAction = async (action) => {
    const messages = {
      start_review: 'Start reviewing this appraisal?',
      approve: 'Approve this appraisal?',
      reject: 'Reject this appraisal?',
      request_revision: 'Request revision for this appraisal?',
    };
    
    if (!window.confirm(messages[action])) return;
    
    try {
      setSaving(true);
      
      // Save manager ratings first if applicable
      if (action === 'approve') {
        await handleSave();
      }
      
      const response = await appraisalsAPI.review(id, action, comments.managerComments);
      setAppraisal(response.data);
      setSuccessMessage(`Appraisal ${action.replace('_', ' ')} successfully!`);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to perform action');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await appraisalsAPI.addComment(id, newComment);
      setNewComment('');
      loadAppraisalData(); // Reload to get new comment
    } catch (err) {
      setError('Failed to add comment');
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

  // Group criteria by category
  const groupedCriteria = criteria.reduce((acc, c) => {
    const cat = c.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading appraisal...</p>
        </div>
      </Layout>
    );
  }

  if (!appraisal) {
    return (
      <Layout>
        <div className="empty-state">
          <Icons.AlertCircle />
          <h3 className="empty-state-title">Appraisal Not Found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/appraisals')}>
            Back to Appraisals
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">{appraisal.periodName}</h1>
          <p className="page-subtitle">
            {isOwner ? 'Your self-appraisal' : `Appraisal for ${appraisal.employeeName}`}
          </p>
        </div>
        <div className="appraisal-actions">
          {canEdit && (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={saving}
              >
                Submit for Review
              </button>
            </>
          )}
          
          {canManagerEdit && appraisal.status === 'submitted' && (
            <button 
              className="btn btn-primary" 
              onClick={() => handleReviewAction('start_review')}
              disabled={saving}
            >
              Start Review
            </button>
          )}
          
          {canManagerEdit && appraisal.status === 'under_review' && (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={handleSave}
                disabled={saving}
              >
                Save Review
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => handleReviewAction('request_revision')}
                disabled={saving}
              >
                Request Revision
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => handleReviewAction('approve')}
                disabled={saving}
              >
                Approve
              </button>
            </>
          )}
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

        {/* Appraisal Info */}
        <div className="appraisal-header">
          <div className="appraisal-info">
            <div className="appraisal-employee">
              <div className="appraisal-employee-avatar">
                {appraisal.employeeName?.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="appraisal-employee-name">{appraisal.employeeName}</div>
                <div className="appraisal-employee-title">{appraisal.employeeEmail}</div>
              </div>
            </div>
            <div className="appraisal-meta">
              <div className="appraisal-meta-item">
                {getStatusBadge(appraisal.status)}
              </div>
              <div className="appraisal-meta-item">
                <Icons.Calendar />
                Created: {formatDate(appraisal.createdAt)}
              </div>
              {appraisal.submittedAt && (
                <div className="appraisal-meta-item">
                  <Icons.Send />
                  Submitted: {formatDate(appraisal.submittedAt)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rating Summary */}
        <div className="rating-summary">
          <div className="rating-summary-card">
            <div className="rating-summary-value">
              {appraisal.selfRating ? appraisal.selfRating.toFixed(1) : '-'}
            </div>
            <div className="rating-summary-label">Self Rating</div>
          </div>
          <div className="rating-summary-card">
            <div className="rating-summary-value">
              {appraisal.managerRating ? appraisal.managerRating.toFixed(1) : '-'}
            </div>
            <div className="rating-summary-label">Manager Rating</div>
          </div>
          <div className="rating-summary-card" style={{ background: 'var(--primary)', color: 'white' }}>
            <div className="rating-summary-value">
              {appraisal.finalRating ? appraisal.finalRating.toFixed(1) : '-'}
            </div>
            <div className="rating-summary-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Final Rating</div>
          </div>
        </div>

        {/* Rating Scale Legend */}
        <div className="card mb-lg">
          <div className="card-body">
            <strong>Rating Scale:</strong>
            <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span>1 = Needs Improvement</span>
              <span>2 = Below Expectations</span>
              <span>3 = Meets Expectations</span>
              <span>4 = Exceeds Expectations</span>
              <span>5 = Outstanding</span>
            </div>
          </div>
        </div>

        {/* Criteria Ratings */}
        {Object.entries(groupedCriteria).map(([category, items]) => (
          <div key={category} className="card mb-lg">
            <div className="card-header">
              <h3 className="card-title">{category}</h3>
            </div>
            <div className="card-body">
              {items.map(criterion => (
                <div key={criterion.id} className="rating-item">
                  <div className="rating-item-header">
                    <div className="rating-item-title">{criterion.name}</div>
                    <span className="rating-item-category">{criterion.category}</span>
                  </div>
                  <div className="rating-item-description">{criterion.description}</div>
                  
                  <div className="rating-scores">
                    {/* Self Rating */}
                    <div className="rating-score-section">
                      <div className="rating-score-label">SELF ASSESSMENT</div>
                      <div className="rating-scale">
                        {[1, 2, 3, 4, 5].map(score => (
                          <button
                            key={score}
                            className={`rating-btn ${ratings[criterion.id]?.selfScore === score ? 'selected' : ''}`}
                            onClick={() => canEdit && handleRatingChange(criterion.id, 'selfScore', score)}
                            disabled={!canEdit}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      {canEdit && (
                        <textarea
                          className="form-textarea mt-sm"
                          placeholder="Add comments about your rating..."
                          value={ratings[criterion.id]?.selfComment || ''}
                          onChange={(e) => handleRatingChange(criterion.id, 'selfComment', e.target.value)}
                          rows={2}
                        />
                      )}
                      {!canEdit && ratings[criterion.id]?.selfComment && (
                        <p className="mt-sm" style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                          {ratings[criterion.id].selfComment}
                        </p>
                      )}
                    </div>

                    {/* Manager Rating */}
                    <div className="rating-score-section">
                      <div className="rating-score-label">MANAGER ASSESSMENT</div>
                      <div className="rating-scale">
                        {[1, 2, 3, 4, 5].map(score => (
                          <button
                            key={score}
                            className={`rating-btn ${ratings[criterion.id]?.managerScore === score ? 'selected' : ''}`}
                            onClick={() => canManagerEdit && handleRatingChange(criterion.id, 'managerScore', score)}
                            disabled={!canManagerEdit}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      {canManagerEdit && (
                        <textarea
                          className="form-textarea mt-sm"
                          placeholder="Add manager feedback..."
                          value={ratings[criterion.id]?.managerComment || ''}
                          onChange={(e) => handleRatingChange(criterion.id, 'managerComment', e.target.value)}
                          rows={2}
                        />
                      )}
                      {!canManagerEdit && ratings[criterion.id]?.managerComment && (
                        <p className="mt-sm" style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                          {ratings[criterion.id].managerComment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Comments Section */}
        <div className="card mb-lg">
          <div className="card-header">
            <h3 className="card-title">Additional Information</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Goals Achieved</label>
              <textarea
                className="form-textarea"
                placeholder="List the goals you achieved during this period..."
                value={comments.goalsAchieved}
                onChange={(e) => setComments(prev => ({ ...prev, goalsAchieved: e.target.value }))}
                disabled={!canEdit}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Areas of Improvement</label>
              <textarea
                className="form-textarea"
                placeholder="What areas would you like to improve?"
                value={comments.areasOfImprovement}
                onChange={(e) => setComments(prev => ({ ...prev, areasOfImprovement: e.target.value }))}
                disabled={!canEdit}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Training Needs</label>
              <textarea
                className="form-textarea"
                placeholder="What training would help you perform better?"
                value={comments.trainingNeeds}
                onChange={(e) => setComments(prev => ({ ...prev, trainingNeeds: e.target.value }))}
                disabled={!canEdit}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Employee Comments</label>
              <textarea
                className="form-textarea"
                placeholder="Any additional comments..."
                value={comments.employeeComments}
                onChange={(e) => setComments(prev => ({ ...prev, employeeComments: e.target.value }))}
                disabled={!canEdit}
                rows={3}
              />
            </div>

            {(canManagerEdit || appraisal.managerComments) && (
              <div className="form-group">
                <label className="form-label">Manager Comments</label>
                <textarea
                  className="form-textarea"
                  placeholder="Manager feedback and recommendations..."
                  value={comments.managerComments}
                  onChange={(e) => setComments(prev => ({ ...prev, managerComments: e.target.value }))}
                  disabled={!canManagerEdit}
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Discussion Thread */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Discussion</h3>
          </div>
          <div className="card-body">
            <div className="comment-list">
              {appraisal.commentThread?.length === 0 ? (
                <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '24px' }}>
                  No comments yet. Start a discussion below.
                </p>
              ) : (
                appraisal.commentThread?.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.userName?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">{comment.userName}</span>
                        <span className="comment-time">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="comment-form">
              <input
                type="text"
                className="form-input"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button className="btn btn-primary" onClick={handleAddComment}>
                <Icons.Send />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AppraisalDetailPage;
