/**
 * Layout Component - Main application layout with sidebar navigation
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons';

function Layout({ children }) {
  const { user, logout, canReview, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Format role for display
  const formatRole = (role) => {
    return role?.charAt(0).toUpperCase() + role?.slice(1) || 'Employee';
  };

  return (
    <div className="app-container">
      {/* Mobile menu button */}
      <button 
        className="btn btn-ghost mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ 
          position: 'fixed', 
          top: '16px', 
          left: '16px', 
          zIndex: 101,
          display: 'none'
        }}
      >
        <Icons.Menu />
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Icons.Logo />
            <span>AppraisalPro</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Main Navigation */}
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icons.Dashboard />
              <span>Dashboard</span>
            </NavLink>

            <NavLink 
              to="/appraisals" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icons.Appraisal />
              <span>My Appraisals</span>
            </NavLink>
          </div>

          {/* Manager/Admin Navigation */}
          {canReview() && (
            <div className="nav-section">
              <div className="nav-section-title">Management</div>
              
              <NavLink 
                to="/team" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icons.Team />
                <span>Team Reviews</span>
              </NavLink>
            </div>
          )}

          {/* Admin Navigation */}
          {isAdmin() && (
            <div className="nav-section">
              <div className="nav-section-title">Administration</div>
              
              <NavLink 
                to="/users" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icons.Users />
                <span>Manage Users</span>
              </NavLink>

              <NavLink 
                to="/settings" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icons.Settings />
                <span>Settings</span>
              </NavLink>
            </div>
          )}
          {/* Profile Link - For All Users */}
          <div className="nav-section">
            <div className="nav-section-title">Account</div>
            
            <NavLink 
              to="/profile" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icons.Users />
              <span>My Profile</span>
            </NavLink>
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.fullName}</div>
              <div className="user-role">
                {formatRole(user?.role)} • {user?.userType === 'office' ? 'Office' : 'Field'}
              </div>
            </div>
          </div>
          
          <button className="nav-item mt-sm" onClick={handleLogout}>
            <Icons.Logout />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'none'
          }}
        />
      )}

      <style>{`
        @media (max-width: 1024px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          .sidebar-overlay {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Layout;
