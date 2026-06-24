/**
 * useWebRTC Hook
 * Manages WebRTC peer connections, media streams, and screen sharing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

// STUN servers for NAT traversal (Google's free STUN servers)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (roomCode, user) => {
  const { socket } = useSocket();

  // Local media stream ref
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // State
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // Map<socketId, { stream, user, pc }>
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  // Track peer connections
  const peerConnections = useRef({});

  // ─── Get local media ──────────────────────────────────────────────────────────
  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(null);
      return stream;
    } catch (err) {
      console.warn('Media access error:', err.name);
      setMediaError(err.name);
      // Create empty stream so we can still participate (audio/video only)
      const emptyStream = new MediaStream();
      localStreamRef.current = emptyStream;
      setLocalStream(emptyStream);
      return emptyStream;
    }
  }, []);

  // ─── Create RTCPeerConnection ─────────────────────────────────────────────────
  const createPeerConnection = useCallback((targetSocketId, targetUser) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE candidate handler
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('ice-candidate', { targetSocketId, candidate });
      }
    };

    // Remote track received
    pc.ontrack = ({ streams: [stream] }) => {
      setPeers(prev => ({
        ...prev,
        [targetSocketId]: { ...prev[targetSocketId], stream, user: targetUser },
      }));
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        removePeer(targetSocketId);
      }
    };

    peerConnections.current[targetSocketId] = pc;
    return pc;
  }, [socket]);

  // ─── Remove peer ──────────────────────────────────────────────────────────────
  const removePeer = useCallback((socketId) => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close();
      delete peerConnections.current[socketId];
    }
    setPeers(prev => {
      const updated = { ...prev };
      delete updated[socketId];
      return updated;
    });
  }, []);

  // ─── Socket event handlers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomCode) return;

    // New user joined — initiate offer
    const handleUserJoined = async ({ socketId, user: peerUser }) => {
      const pc = createPeerConnection(socketId, peerUser);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { targetSocketId: socketId, offer, roomCode });

      setPeers(prev => ({
        ...prev,
        [socketId]: { stream: null, user: peerUser, pc },
      }));
    };

    // Received offer — create answer
    const handleOffer = async ({ fromSocketId, fromUser, offer }) => {
      const pc = createPeerConnection(fromSocketId, fromUser);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { targetSocketId: fromSocketId, answer });

      setPeers(prev => ({
        ...prev,
        [fromSocketId]: { stream: null, user: fromUser, pc },
      }));
    };

    // Received answer
    const handleAnswer = async ({ fromSocketId, answer }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    // ICE candidate from peer
    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (e) { console.warn('ICE error:', e); }
      }
    };

    // User left
    const handleUserLeft = ({ socketId }) => removePeer(socketId);

    // Existing participants when joining
    const handleRoomParticipants = async ({ participants }) => {
      // Skip self
      const others = participants.filter(p => p.socketId !== socket.id);
      for (const { socketId, user: peerUser } of others) {
        const pc = createPeerConnection(socketId, peerUser);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { targetSocketId: socketId, offer, roomCode });
        setPeers(prev => ({
          ...prev,
          [socketId]: { stream: null, user: peerUser, pc },
        }));
      }
    };

    // Peer media state
    const handlePeerMediaState = ({ socketId, videoEnabled: v, audioEnabled: a }) => {
      setPeers(prev => ({
        ...prev,
        [socketId]: { ...prev[socketId], videoEnabled: v, audioEnabled: a },
      }));
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);
    socket.on('room-participants', handleRoomParticipants);
    socket.on('peer-media-state', handlePeerMediaState);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
      socket.off('room-participants', handleRoomParticipants);
      socket.off('peer-media-state', handlePeerMediaState);
    };
  }, [socket, roomCode, createPeerConnection, removePeer]);

  // ─── Toggle Video ──────────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoEnabled(prev => {
      const next = !prev;
      socket?.emit('media-state', { roomCode, videoEnabled: next, audioEnabled });
      return next;
    });
  }, [socket, roomCode, audioEnabled]);

  // ─── Toggle Audio ──────────────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setAudioEnabled(prev => {
      const next = !prev;
      socket?.emit('media-state', { roomCode, videoEnabled, audioEnabled: next });
      return next;
    });
  }, [socket, roomCode, videoEnabled]);

  // ─── Screen Sharing ────────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      screenStreamRef.current = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });

      // Update local display
      if (localStreamRef.current) {
        const localVideo = localStreamRef.current.getVideoTracks()[0];
        if (localVideo) localStreamRef.current.removeTrack(localVideo);
        localStreamRef.current.addTrack(videoTrack);
      }
      setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));

      socket?.emit('screen-share-started', { roomCode });
      setIsScreenSharing(true);

      // Auto-stop when browser UI is used to stop sharing
      videoTrack.onended = stopScreenShare;
    } catch (err) {
      if (err.name !== 'NotAllowedError') console.error('Screen share error:', err);
    }
  }, [socket, roomCode]);

  const stopScreenShare = useCallback(async () => {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    // Restore camera
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = cameraStream.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
      setLocalStream(cameraStream);
      localStreamRef.current = cameraStream;
    } catch (e) { /* camera may not be available */ }

    socket?.emit('screen-share-stopped', { roomCode });
    setIsScreenSharing(false);
  }, [socket, roomCode]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setPeers({});
  }, []);

  return {
    localStream,
    peers,
    videoEnabled,
    audioEnabled,
    isScreenSharing,
    mediaError,
    initLocalMedia,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    cleanup,
  };
};
