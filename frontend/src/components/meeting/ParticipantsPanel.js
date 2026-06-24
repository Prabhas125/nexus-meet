/**
 * Participants Panel
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ParticipantsPanel = ({ peers }) => {
  const { user } = useAuth();
  const others = Object.values(peers);

  return (
    <div className="participants-list">
      {/* Local user (always first) */}
      <div className="participant-item">
        <div className="participant-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <div className="participant-name">{user?.name}</div>
          <div className="participant-you">You</div>
        </div>
      </div>

      {/* Remote peers */}
      {others.map(({ user: peerUser, socketId }, i) => (
        <div className="participant-item" key={socketId || i}>
          <div className="participant-avatar" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            {peerUser?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="participant-name">{peerUser?.name || 'Guest'}</div>
          </div>
        </div>
      ))}

      {others.length === 0 && (
        <div className="empty-state" style={{ marginTop: 8 }}>
          No other participants yet.<br />Share the room code to invite!
        </div>
      )}
    </div>
  );
};

export default ParticipantsPanel;
