/**
 * Chat Panel Component
 * Real-time messaging via Socket.io
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ChatPanel = ({ socket, roomCode, meetingId, initialMessages = [] }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chat-message', handler);
    return () => socket.off('chat-message', handler);
  }, [socket]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit('chat-message', { roomCode, meetingId, content: input.trim() });
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-panel">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">No messages yet. Say hello! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.sender?.id === user?.id;
          return (
            <div key={msg.id || i} className={`chat-message ${isOwn ? 'own' : ''}`}>
              <div className={`msg-header ${isOwn ? 'own' : ''}`}>
                <span className="msg-author">{isOwn ? 'You' : msg.sender?.name}</span>
                <span>{formatTime(msg.timestamp)}</span>
              </div>
              <div className="msg-body">{msg.content}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          rows={1}
          placeholder="Type a message... (Enter to send)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="send-btn" onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
};

export default ChatPanel;
