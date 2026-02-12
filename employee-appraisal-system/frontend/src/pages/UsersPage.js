/**
 * Users Management Page - Admin only
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, departmentsAPI } from '../services/api';
import Layout from '../components/Layout';
import { Icons } from '../components/Icons';

function UsersPage() {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee',
    userType: 'office',
    departmentId: '',
    managerId: '',
    jobTitle: '',
    phone: '',
  });
  
  const [filter, setFilter] = useState({ userType: '', departmentId: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [usersRes, deptsRes] = await Promise.all([
        usersAPI.getAll(),
        departmentsAPI.getAll(),
      ]);
      
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setManagers(usersRes.data.filter(u => u.role === 'manager' || u.role === 'admin'));
      
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        role: user.role,
        userType: user.userType,
        departmentId: user.departmentId || '',
        managerId: user.managerId || '',
        jobTitle: user.jobTitle || '',
        phone: user.phone || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'employee',
        userType: 'office',
        departmentId: '',
        managerId: '',
        jobTitle: '',
        phone: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, formData);
        setSuccessMessage('User updated successfully');
      } else {
        await usersAPI.create(formData);
        setSuccessMessage('User created successfully');
      }
      
      handleCloseModal();
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await usersAPI.update(userId, { isActive: !isActive });
      loadData();
      setSuccessMessage(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter.userType && u.userType !== filter.userType) return false;
    if (filter.departmentId && u.departmentId !== parseInt(filter.departmentId)) return false;
    return true;
  });

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            Manage employees, their roles, and assignments
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Icons.Plus />
          Add User
        </button>
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

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <Icons.Users />
            </div>
            <div className="stat-content">
              <div className="stat-value">{users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
              <Icons.Office />
            </div>
            <div className="stat-content">
              <div className="stat-value">{users.filter(u => u.userType === 'office').length}</div>
              <div className="stat-label">Office Employees</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#cffafe', color: '#06b6d4' }}>
              <Icons.Field />
            </div>
            <div className="stat-content">
              <div className="stat-value">{users.filter(u => u.userType === 'field').length}</div>
              <div className="stat-label">Field Employees</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <Icons.Team />
            </div>
            <div className="stat-content">
              <div className="stat-value">{users.filter(u => u.role === 'manager').length}</div>
              <div className="stat-label">Managers</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-lg">
          <div className="card-body">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>Filter by:</span>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={filter.userType}
                onChange={(e) => setFilter(prev => ({ ...prev, userType: e.target.value }))}
              >
                <option value="">All Types</option>
                <option value="office">Office</option>
                <option value="field">Field</option>
              </select>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={filter.departmentId}
                onChange={(e) => setFilter(prev => ({ ...prev, departmentId: e.target.value }))}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {(filter.userType || filter.departmentId) && (
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilter({ userType: '', departmentId: '' })}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{user.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${user.userType}`}>
                        {user.userType === 'office' ? 'Office' : 'Field'}
                      </span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
                    </td>
                    <td>{user.departmentName || '-'}</td>
                    <td>{user.managerName || '-'}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenModal(user)}
                          title="Edit"
                        >
                          <Icons.Edit />
                        </button>
                        <button 
                          className={`btn btn-sm ${user.isActive ? 'btn-outline' : 'btn-success'}`}
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          disabled={user.id === currentUser.id}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <Icons.X />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-error mb-lg">
                    <Icons.AlertCircle />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      className="form-input"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      className="form-input"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={!!editingUser}
                  />
                </div>

                {!editingUser && (
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input
                      type="password"
                      name="password"
                      className="form-input"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingUser}
                      placeholder="Min 6 characters"
                    />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      name="role"
                      className="form-select"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">User Type</label>
                    <select
                      name="userType"
                      className="form-select"
                      value={formData.userType}
                      onChange={handleChange}
                    >
                      <option value="office">Office Employee</option>
                      <option value="field">Field Employee</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      name="departmentId"
                      className="form-select"
                      value={formData.departmentId}
                      onChange={handleChange}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manager</label>
                    <select
                      name="managerId"
                      className="form-select"
                      value={formData.managerId}
                      onChange={handleChange}
                    >
                      <option value="">Select Manager</option>
                      {managers.map(mgr => (
                        <option key={mgr.id} value={mgr.id}>{mgr.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input
                      type="text"
                      name="jobTitle"
                      className="form-input"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      placeholder="e.g., Software Engineer"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default UsersPage;
