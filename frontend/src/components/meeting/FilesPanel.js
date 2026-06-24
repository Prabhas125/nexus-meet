/**
 * Files Panel Component
 * Upload and download files within a meeting room
 */

import React, { useState, useEffect, useRef } from 'react';
import { fileAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FILE_ICONS = {
  'application/pdf': '📄',
  'image/': '🖼️',
  'video/': '🎥',
  'audio/': '🎵',
  'application/zip': '📦',
  'text/': '📝',
  default: '📎',
};

const getIcon = (mimeType) => {
  const entry = Object.entries(FILE_ICONS).find(([k]) => mimeType?.startsWith(k));
  return entry ? entry[1] : FILE_ICONS.default;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const FilesPanel = ({ meetingId, socket, roomCode }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  // Load existing files
  useEffect(() => {
    if (!meetingId) return;
    fileAPI.getFiles(meetingId)
      .then(data => setFiles(data.files))
      .catch(() => {});
  }, [meetingId]);

  // Listen for new files from other participants
  useEffect(() => {
    if (!socket) return;
    const handler = ({ file }) => {
      setFiles(prev => [file, ...prev]);
    };
    socket.on('file-shared', handler);
    return () => socket.off('file-shared', handler);
  }, [socket]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !meetingId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await fileAPI.upload(meetingId, formData);
      setFiles(prev => [data.file, ...prev]);
      // Notify other participants
      socket?.emit('file-shared', { roomCode, file: data.file });
    } catch (err) {
      alert('Upload failed: ' + (err.error || 'Unknown error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const downloadFile = (file) => {
    const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${file.fileUrl}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    a.click();
  };

  return (
    <div className="files-panel">
      {/* Upload Area */}
      <div className="upload-area" onClick={() => inputRef.current?.click()}>
        <p style={{ fontSize: 24, marginBottom: 6 }}>📤</p>
        <p>{uploading ? 'Uploading...' : 'Click to upload a file'}</p>
        <p style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>Max 10MB</p>
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {/* Files list */}
      <div className="files-list">
        {files.length === 0 && (
          <div className="empty-state">No files shared yet.</div>
        )}
        {files.map(f => (
          <div className="file-item" key={f.id}>
            <div className="file-icon">{getIcon(f.mimeType)}</div>
            <div className="file-info">
              <div className="file-name">{f.fileName}</div>
              <div className="file-meta">
                {f.uploader?.name} • {formatSize(f.fileSize)}
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => downloadFile(f)}
              style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0 }}
              title="Download"
            >
              ⬇️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilesPanel;
