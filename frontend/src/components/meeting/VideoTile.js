/**
 * VideoTile Component
 * Displays a single participant's video stream
 */

import React, { useRef, useEffect } from 'react';

const VideoTile = ({ stream, user, isLocal, videoEnabled, audioEnabled, isScreenSharing }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && videoEnabled !== false;

  return (
    <div className={`video-tile ${isLocal ? 'local' : ''}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local to avoid echo
        />
      ) : (
        <div className="video-avatar">
          <div className="avatar-circle">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="avatar-name">{isLocal ? 'You' : user?.name}</div>
        </div>
      )}

      {/* Name label */}
      <div className="tile-label">
        {isLocal ? `You (${user?.name})` : user?.name}
        {isScreenSharing && ' 🖥️'}
      </div>

      {/* Status indicators */}
      <div className="tile-indicators">
        {audioEnabled === false && (
          <div className="tile-indicator muted" title="Muted">🔇</div>
        )}
      </div>
    </div>
  );
};

export default VideoTile;
