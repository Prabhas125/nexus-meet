/**
 * MeetingPage - The Video Conference Room
 * Orchestrates WebRTC, chat, whiteboard, files, and participants
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { meetingAPI } from '../services/api';
import VideoTile from '../components/meeting/VideoTile';
import ChatPanel from '../components/chat/ChatPanel';
import FilesPanel from '../components/meeting/FilesPanel';
import ParticipantsPanel from '../components/meeting/ParticipantsPanel';
import Whiteboard from '../components/whiteboard/Whiteboard';

const PANELS = ['chat', 'participants', 'files', 'whiteboard'];

const MeetingPage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState('chat');
  const [codeCopied, setCodeCopied] = useState(false);

  const {
    localStream, peers, videoEnabled, audioEnabled,
    isScreenSharing, mediaError, initLocalMedia,
    toggleVideo, toggleAudio, startScreenShare, stopScreenShare, cleanup,
  } = useWebRTC(roomCode, user);

  // ─── Load meeting data ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await meetingAPI.getByCode(roomCode);
        setMeeting(data.meeting);
      } catch (err) {
        setError('Meeting not found or you are not authorized.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [roomCode]);

  // ─── Join socket room and init media ─────────────────────────────────────────
  useEffect(() => {
    if (!socket || !meeting) return;

    // Initialize camera/mic
    initLocalMedia().then(() => {
      socket.emit('join-room', { roomCode });
    });

    return () => {
      socket.emit('leave-room', { roomCode });
      cleanup();
    };
  }, [socket, meeting, roomCode]);

  // ─── Leave meeting ────────────────────────────────────────────────────────────
  const leaveMeeting = useCallback(async () => {
    cleanup();
    socket?.emit('leave-room', { roomCode });
    try { await meetingAPI.leave(roomCode); } catch (e) {}
    navigate('/dashboard');
  }, [cleanup, socket, roomCode, navigate]);

  // ─── Copy room code ───────────────────────────────────────────────────────────
  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ─── Compute video grid class ─────────────────────────────────────────────────
  const totalVideos = 1 + Object.keys(peers).length; // local + remotes
  const gridClass =
    totalVideos === 1 ? 'grid-1' :
    totalVideos === 2 ? 'grid-2' :
    totalVideos <= 4 ? 'grid-4' :
    'grid-many';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Joining meeting...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 48 }}>⚠️</p>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="meeting-room">
      {/* Top Bar */}
      <div className="meeting-topbar">
        <div className="topbar-info">
          <span className="room-title">{meeting?.title || 'Meeting'}</span>
          <span
            className="room-code"
            onClick={copyCode}
            title={codeCopied ? 'Copied!' : 'Click to copy'}
          >
            {codeCopied ? '✅ Copied!' : roomCode}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {1 + Object.keys(peers).length} participant{Object.keys(peers).length !== 0 ? 's' : ''}
          </span>
        </div>

        <div className="topbar-actions">
          {PANELS.map(p => (
            <button
              key={p}
              className={`tab-btn ${activePanel === p ? 'active' : ''}`}
              onClick={() => setActivePanel(p)}
            >
              {p === 'chat' ? '💬 Chat' :
               p === 'participants' ? '👥 People' :
               p === 'files' ? '📎 Files' : '🎨 Board'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="meeting-body">
        {/* Video Grid or Whiteboard */}
        {activePanel !== 'whiteboard' ? (
          <div className="video-grid-container">
            <div className={`video-grid ${gridClass}`}>
              {/* Local Video */}
              <VideoTile
                stream={localStream}
                user={user}
                isLocal
                videoEnabled={videoEnabled}
                audioEnabled={audioEnabled}
                isScreenSharing={isScreenSharing}
              />
              {/* Remote Videos */}
              {Object.entries(peers).map(([socketId, peer]) => (
                <VideoTile
                  key={socketId}
                  stream={peer.stream}
                  user={peer.user}
                  isLocal={false}
                  videoEnabled={peer.videoEnabled}
                  audioEnabled={peer.audioEnabled}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="controls-bar">
              {/* Mic */}
              <button
                className={`btn-icon ${!audioEnabled ? 'danger' : ''}`}
                onClick={toggleAudio}
                title={audioEnabled ? 'Mute' : 'Unmute'}
              >
                {audioEnabled ? '🎙️' : '🔇'}
              </button>

              {/* Camera */}
              <button
                className={`btn-icon ${!videoEnabled ? 'danger' : ''}`}
                onClick={toggleVideo}
                title={videoEnabled ? 'Stop video' : 'Start video'}
              >
                {videoEnabled ? '📹' : '📷'}
              </button>

              {/* Screen share */}
              <button
                className={`btn-icon ${isScreenSharing ? 'active' : ''}`}
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                🖥️
              </button>

              {/* Whiteboard shortcut */}
              <button
                className="btn-icon"
                onClick={() => setActivePanel('whiteboard')}
                title="Open whiteboard"
              >
                🎨
              </button>

              {/* Chat shortcut */}
              <button
                className="btn-icon"
                onClick={() => setActivePanel('chat')}
                title="Open chat"
              >
                💬
              </button>

              {/* Leave */}
              <button
                className="btn-icon danger"
                onClick={leaveMeeting}
                title="Leave meeting"
                style={{ marginLeft: 16, background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }}
              >
                📞
              </button>
            </div>
          </div>
        ) : (
          /* Whiteboard full view */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setActivePanel('chat')} style={{ padding: '6px 12px', fontSize: 13 }}>
                ← Back to Video
              </button>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Collaborative Whiteboard</span>
            </div>
            <Whiteboard socket={socket} roomCode={roomCode} />
          </div>
        )}

        {/* Side Panel */}
        {activePanel !== 'whiteboard' && (
          <div className="side-panel">
            <div className="side-panel-header">
              <h3>
                {activePanel === 'chat' ? '💬 Chat' :
                 activePanel === 'participants' ? '👥 Participants' : '📎 Files'}
              </h3>
            </div>

            {activePanel === 'chat' && (
              <ChatPanel
                socket={socket}
                roomCode={roomCode}
                meetingId={meeting?.id}
                initialMessages={meeting?.messages || []}
              />
            )}

            {activePanel === 'participants' && (
              <ParticipantsPanel peers={peers} />
            )}

            {activePanel === 'files' && (
              <FilesPanel
                meetingId={meeting?.id}
                socket={socket}
                roomCode={roomCode}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingPage;
