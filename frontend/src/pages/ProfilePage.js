/**
 * Profile Page
 * Displays user account details
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-container">
      {/* Header (Matching Dashboard Header for consistency) */}
      <header className="dashboard-header">
        <div className="header-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-dot">📹</div>
          NexusMeet
        </div>
        <div className="header-user">
          <button className="btn btn-secondary" onClick={handleSignOut} style={{ padding: '7px 14px', fontSize: 13 }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Main Profile Card */}
      <main className="profile-main">
        <div className="profile-card">
          <div className="profile-avatar-large">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <h2 className="profile-name-title">{user?.name}</h2>
          <span className="profile-role-badge">Member</span>

          <div className="profile-details-group">
            <div className="profile-detail-row">
              <span className="profile-detail-label">Full Name</span>
              <span className="profile-detail-value">{user?.name}</span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">Email Address</span>
              <span className="profile-detail-value">{user?.email}</span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">Account ID</span>
              <span className="profile-detail-value mono">{user?.id}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ width: 'auto' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
