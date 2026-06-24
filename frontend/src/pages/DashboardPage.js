/**
 * Dashboard Page
 * Create or join meetings, view history
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { meetingAPI } from '../services/api';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    meetingAPI.list()
      .then(data => setMeetings(data.meetings))
      .catch(() => {});
  }, []);

  const createMeeting = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await meetingAPI.create({ title: meetingTitle || 'My Meeting' });
      navigate(`/meeting/${data.meeting.roomCode}`);
    } catch (err) {
      setError('Failed to create meeting.');
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      await meetingAPI.join(code);
      navigate(`/meeting/${code}`);
    } catch (err) {
      setError(err.error || 'Meeting not found or has ended.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-logo">
          <div className="logo-dot">📹</div>
          NexusMeet
        </div>
        <div className="header-user">
          <div 
            className="user-avatar" 
            onClick={() => navigate('/profile')} 
            style={{ cursor: 'pointer' }}
            title="View Profile"
          >
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span 
            onClick={() => navigate('/profile')} 
            style={{ fontSize: 14, cursor: 'pointer' }}
            title="View Profile"
          >
            {user?.name}
          </span>
          <button className="btn btn-secondary" onClick={logout} style={{ padding: '7px 14px', fontSize: 13 }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h1>Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Create a new meeting or join one with a room code.</p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

        <div className="dashboard-actions">
          {/* Create Meeting */}
          <div className="action-card">
            <h3>🎬 New Meeting</h3>
            <p>Start an instant video call. Share the room code to invite others.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Meeting title (optional)"
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createMeeting()}
              />
              <button className="btn btn-primary" onClick={createMeeting} disabled={loading} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                {loading ? '...' : 'Start'}
              </button>
            </div>
          </div>

          {/* Join Meeting */}
          <div className="action-card">
            <h3>🔗 Join Meeting</h3>
            <p>Enter a room code shared with you to join an existing meeting.</p>
            <div className="join-form">
              <input
                className="form-input"
                placeholder="e.g., ABC-123-XYZ"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinMeeting()}
                style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
              />
              <button className="btn btn-primary" onClick={joinMeeting} disabled={loading || !joinCode.trim()}>
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Meeting History */}
        <div>
          <p className="section-title">Recent Meetings</p>
          {meetings.length === 0 ? (
            <div className="empty-state">No meetings yet. Create one to get started!</div>
          ) : (
            <div className="meetings-list">
              {meetings.map(m => (
                <div className="meeting-item" key={m.id}>
                  <div className="meeting-info">
                    <h4>{m.title}</h4>
                    <p>
                      {m.host.name} • {formatDate(m.createdAt)} •{' '}
                      <span style={{ fontFamily: 'monospace' }}>{m.roomCode}</span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`meeting-badge ${m.isActive ? 'badge-active' : 'badge-ended'}`}>
                      {m.isActive ? 'Active' : 'Ended'}
                    </span>
                    {m.isActive && (
                      <button className="btn btn-secondary" onClick={() => navigate(`/meeting/${m.roomCode}`)} style={{ padding: '6px 12px', fontSize: 12 }}>
                        Rejoin
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
